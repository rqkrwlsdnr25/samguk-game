(function(global){
  'use strict';

  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;

  class MapWheelRafController{
    constructor(options={}){
      const cfg=global.SAMGUK_MAP_ZOOM_CONFIG||{};
      this.sensitivity=finite(options.sensitivity,finite(cfg.wheelSensitivity,.00135));
      this.deltaClamp=Math.max(40,finite(options.deltaClamp,finite(cfg.wheelDeltaClamp,480)));
      this._delta=0;
      this._clientX=0;
      this._clientY=0;
      this._raf=0;
      this._element=null;
      this._handler=e=>this._onWheel(e);
    }

    _normalizeDelta(e){
      let d=finite(e?.deltaY,0);
      if(e?.deltaMode===1)d*=16; // DOM_DELTA_LINE
      else if(e?.deltaMode===2)d*=Math.max(240,finite(this._element?.clientHeight,800)); // PAGE
      return clamp(d,-this.deltaClamp,this.deltaClamp);
    }

    bind(element){
      if(!element?.addEventListener)return false;
      if(this._element===element)return true;
      this.destroy();
      this._element=element;
      // passive:false is required because wheel zoom owns the gesture and must
      // suppress page scrolling. We intentionally DO NOT stopPropagation().
      element.addEventListener('wheel',this._handler,{passive:false,capture:false});
      return true;
    }

    destroy(){
      if(this._element)this._element.removeEventListener('wheel',this._handler,{capture:false});
      this._element=null;
      if(this._raf)global.cancelAnimationFrame?.(this._raf);
      this._raf=0;this._delta=0;
    }

    _onWheel(e){
      if(!e)return;
      e.preventDefault?.();
      const d=this._normalizeDelta(e);
      if(Math.abs(d)<.01)return;
      this.queue(d,e.clientX,e.clientY);
    }

    queue(deltaY,clientX,clientY){
      const d=finite(deltaY,NaN);
      if(!Number.isFinite(d))return false;
      this._delta=clamp(this._delta+d,-this.deltaClamp,this.deltaClamp);
      this._clientX=finite(clientX,0);
      this._clientY=finite(clientY,0);
      if(!this._raf)this._raf=global.requestAnimationFrame(()=>this._flush());
      return true;
    }

    _flush(){
      this._raf=0;
      const delta=clamp(finite(this._delta,0),-this.deltaClamp,this.deltaClamp);
      this._delta=0;
      if(Math.abs(delta)<.01)return;

      let factor=Math.exp(delta*this.sensitivity);
      if(!Number.isFinite(factor)||factor<=0){
        factor=1;
        global.SAMGUK_SMOOTH_MAP_ZOOM?.failSafeReset?.('invalid-wheel-factor');
      }
      if(Math.abs(factor-1)<1e-6)return;

      const smooth=global.SAMGUK_SMOOTH_MAP_ZOOM;
      let ok=false;
      if(typeof smooth?.requestZoomAtClient==='function'){
        // Keep the *screen* pivot stable even when wheel events arrive faster
        // than the smoothed camera can visually settle.
        ok=smooth.requestZoomAtClient(factor,this._clientX,this._clientY)!==false;
      }else{
        const anchor=global.SAMGUK_GPU_MAP_CAMERA?.clientToWorld?.(this._clientX,this._clientY);
        ok=typeof global.zoomMap==='function'&&global.zoomMap(factor,anchor||undefined)!==false;
      }
      if(!ok)smooth?.failSafeReset?.('wheel-zoom-rejected');
    }
  }

  global.MapWheelRafController=MapWheelRafController;
  global.SAMGUK_WHEEL_ZOOM=new MapWheelRafController();
})(window);
