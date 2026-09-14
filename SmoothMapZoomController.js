(function(global){
  'use strict';

  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
  const lerp=(a,b,t)=>a+(b-a)*clamp(t,0,1);
  const expFactor=(speed,dt)=>1-Math.exp(-Math.max(0,speed)*Math.max(0,dt));
  const validView=v=>Array.isArray(v)&&v.length===4&&v.every(Number.isFinite)&&v[2]>0&&v[3]>0;

  class SmoothMapZoomController{
    constructor(options={}){
      const cfg=global.SAMGUK_MAP_ZOOM_CONFIG||{};
      this.minZoom=Math.max(.01,finite(options.minZoom,finite(cfg.minZoom,.5)));
      this.maxZoom=Math.max(this.minZoom,finite(options.maxZoom,finite(cfg.maxZoom,15.0)));
      this.defaultZoom=clamp(finite(options.defaultZoom,finite(cfg.defaultZoom,1)),this.minZoom,this.maxZoom);
      this.smoothingSpeed=Math.max(.01,finite(options.smoothingSpeed,finite(cfg.cameraSmoothingSpeed,11)));
      this.deadzone=Math.max(1e-6,finite(options.deadzone,finite(cfg.cameraDeadzone,.001)));
      this.maxDeltaTime=clamp(finite(options.maxDeltaTime,finite(cfg.maxDeltaTime,.05)),1/240,.25);
      this.targetZoom=this.defaultZoom;
      this._targetView=null;
      this._raf=0;
      this._lastTime=0;
      this._active=false;
      this._bound=false;
    }

    _api(){return global.SAMGUK_MAP_CAMERA_API||null}

    _view(){
      const view=this._api()?.getView?.();
      return validView(view)?view.map(Number):null;
    }

    _zoomOf(view){
      const api=this._api();
      const z=api?.getZoomLevel?.(view);
      return Number.isFinite(Number(z))?Number(z):global.SAMGUK_WORLD_MAP_BOUNDS?.zoomLevel?.(view);
    }

    _isClose(current,target){
      if(!validView(current)||!validView(target))return true;
      const currentZoom=finite(this._zoomOf(current),this.defaultZoom);
      const targetZoom=finite(this.targetZoom,finite(this._zoomOf(target),this.defaultZoom));
      if(Math.abs(currentZoom-targetZoom)>=this.deadzone)return false;
      for(let i=0;i<4;i++){
        const scale=Math.max(1,Math.abs(target[i]));
        if(Math.abs(current[i]-target[i])/scale>=this.deadzone)return false;
      }
      return true;
    }

    _requestZoomFromBase(base,factor,anchor){
      const api=this._api();
      if(!api?.computeZoomView||!validView(base))return false;
      const safeFactor=finite(factor,NaN);
      if(!Number.isFinite(safeFactor)||safeFactor<=0){
        this.failSafeReset('invalid-request-factor');
        return false;
      }
      const next=api.computeZoomView(base,safeFactor,anchor);
      if(!validView(next)){this.failSafeReset('invalid-target-view');return false}
      const z=finite(this._zoomOf(next),NaN);
      if(!Number.isFinite(z)){
        this.failSafeReset('invalid-target-zoom');
        return false;
      }
      this.targetZoom=clamp(z,this.minZoom,this.maxZoom);
      this._targetView=[...next];
      this._active=true;
      this._start();
      document.dispatchEvent(new CustomEvent('samguk:map-zoom-target-changed',{detail:{view:[...next],zoom:this.targetZoom}}));
      return true;
    }

    requestZoom(factor,anchor){
      const base=validView(this._targetView)?this._targetView:this._view();
      if(!base){this.failSafeReset('missing-current-view');return false}
      return this._requestZoomFromBase(base,factor,anchor);
    }

    /**
     * Re-project the mouse against the SAME logical base view that receives the
     * next wheel step. This prevents pivot drift while several wheel events are
     * queued ahead of the currently interpolated camera frame.
     */
    requestZoomAtClient(factor,clientX,clientY){
      const base=validView(this._targetView)?this._targetView:this._view();
      if(!base){this.failSafeReset('missing-current-view');return false}
      const anchor=global.SAMGUK_GPU_MAP_CAMERA?.clientToWorld?.(clientX,clientY,base);
      if(!Array.isArray(anchor)||!anchor.every(Number.isFinite)){
        return this._requestZoomFromBase(base,factor,null);
      }
      return this._requestZoomFromBase(base,factor,anchor);
    }

    syncTargetToCurrent(){
      const view=this._view();
      if(view){
        this._targetView=[...view];
        this.targetZoom=clamp(finite(this._zoomOf(view),this.defaultZoom),this.minZoom,this.maxZoom);
      }
      return view;
    }

    cancel({commitCurrent=false}={}){
      if(this._raf){global.cancelAnimationFrame?.(this._raf);this._raf=0;}
      this._active=false;
      this._lastTime=0;
      const view=this._view();
      this._targetView=view?[...view]:null;
      this.targetZoom=view?clamp(finite(this._zoomOf(view),this.defaultZoom),this.minZoom,this.maxZoom):this.defaultZoom;
      if(commitCurrent&&view)this._api()?.commitView?.(view);
    }

    failSafeReset(reason='invalid-zoom-state'){
      if(this._raf){global.cancelAnimationFrame?.(this._raf);this._raf=0;}
      this._active=false;this._lastTime=0;this.targetZoom=this.defaultZoom;
      const api=this._api();
      let safe=api?.viewForZoom?.(this.defaultZoom);
      if(!validView(safe))safe=global.SAMGUK_WORLD_MAP_BOUNDS?.viewForZoom?.(this.defaultZoom);
      if(validView(safe)){
        this._targetView=[...safe];
        api?.commitView?.([...safe]);
      }else{
        this._targetView=null;
        api?.centerMap?.();
      }
      document.dispatchEvent(new CustomEvent('samguk:map-zoom-failsafe',{detail:{reason,zoom:this.defaultZoom}}));
      return false;
    }

    _start(){
      if(this._raf)return;
      this._raf=global.requestAnimationFrame(t=>this._update(t));
    }

    _update(now){
      this._raf=0;
      if(!this._active)return;
      const api=this._api(),current=this._view(),target=this._targetView;

      // Hard fail-safe: a single NaN/Infinity must never poison future frames.
      if(!api||!validView(current)||!validView(target)||!Number.isFinite(this.targetZoom)){
        this.failSafeReset('non-finite-raf-state');
        return;
      }

      const rawDt=this._lastTime?Math.max(0,(finite(now,0)-this._lastTime)/1000):1/60;
      const dt=clamp(finite(rawDt,1/60),1/240,this.maxDeltaTime);
      this._lastTime=finite(now,global.performance?.now?.()||0);

      if(this._isClose(current,target)){
        api.commitView?.([...target]);
        this._active=false;
        this._lastTime=0;
        this._targetView=[...target];
        this.targetZoom=clamp(finite(this._zoomOf(target),this.defaultZoom),this.minZoom,this.maxZoom);
        document.dispatchEvent(new CustomEvent('samguk:map-zoom-settled',{detail:{view:[...target],zoom:this.targetZoom}}));
        return;
      }

      const alpha=expFactor(this.smoothingSpeed,dt);
      const next=current.map((v,i)=>lerp(v,target[i],alpha));
      if(!validView(next)){
        this.failSafeReset('non-finite-lerp-result');
        return;
      }
      api.applyInterpolatedView?.(next);
      this._start();
    }

    bind(){
      if(this._bound)return;
      const viewport=document.getElementById('mapViewport');
      if(!viewport){global.requestAnimationFrame(()=>this.bind());return}
      this._bound=true;
      viewport.addEventListener('pointerdown',()=>this.cancel(),{passive:true,capture:true});
      document.addEventListener('visibilitychange',()=>{
        if(document.hidden)this.cancel();
        else this.syncTargetToCurrent();
      });
      this.syncTargetToCurrent();
    }
  }

  global.SmoothMapZoomController=SmoothMapZoomController;
  global.SAMGUK_SMOOTH_MAP_ZOOM=new SmoothMapZoomController();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>global.SAMGUK_SMOOTH_MAP_ZOOM.bind(),{once:true});
  else global.SAMGUK_SMOOTH_MAP_ZOOM.bind();
})(window);
