(function(global){
  'use strict';

  /**
   * v73 — Occupation / siege smoke VFX
   * ------------------------------------------------------------
   * Performance rules:
   * - Fixed particle + emitter pools: no new particle objects during play.
   * - No Array.filter/splice/map in the animation loop.
   * - Dedicated overlay canvas: no per-particle save/restore.
   * - Five alpha buckets: at most five fillStyle changes per frame.
   * - No gradients, blur filters, shadows or offscreen compositing.
   * - Frustum culling happens before simulation/render work.
   * - rAF exists only while visible smoke is alive.
   */

  const MAX_PARTICLES=420;
  const MAX_EMITTERS=24;
  const MAX_DPR=1.5;
  const CULL_MARGIN=56;
  const SMOKE_STYLES=[
    'rgba(72,74,76,0.10)',
    'rgba(76,78,80,0.16)',
    'rgba(82,84,86,0.22)',
    'rgba(88,90,92,0.28)',
    'rgba(94,96,98,0.34)'
  ];

  const clamp=(v,min,max)=>v<min?min:(v>max?max:v);
  const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;

  class SmokeManager{
    constructor(options={}){
      this.maxParticles=Math.max(64,Math.min(800,finite(options.maxParticles,MAX_PARTICLES)|0));
      this.maxEmitters=Math.max(4,Math.min(64,finite(options.maxEmitters,MAX_EMITTERS)|0));
      this.particlePool=new Array(this.maxParticles);
      this.emitterPool=new Array(this.maxEmitters);
      this._particleCursor=0;
      this._emitterCursor=0;
      this._activeParticles=0;
      this._activeEmitters=0;
      this._raf=0;
      this._lastTime=0;
      this._canvas=null;
      this._ctx=null;
      this._viewport=null;
      this._cssW=0;
      this._cssH=0;
      this._dpr=1;
      this._rng=0x6d2b79f5;
      this._hidden=!!document.hidden;
      this._boundFrame=t=>this._frame(t);
      this._initPools();
      this._initDom();
      document.addEventListener('visibilitychange',()=>{
        this._hidden=!!document.hidden;
        if(this._hidden){
          if(this._raf){cancelAnimationFrame(this._raf);this._raf=0;}
          this._lastTime=0;
        }else if(this._activeParticles||this._activeEmitters){
          this._schedule();
        }
      },{passive:true});
    }

    _initPools(){
      for(let i=0;i<this.maxParticles;i++){
        this.particlePool[i]={
          x:0,y:0,vx:0,vy:0,size:0,sizeGrow:0,
          alpha:0,life:0,maxLife:0,isActive:false,
          sx:0,sy:0,radius:0,bucket:0
        };
      }
      for(let i=0;i<this.maxEmitters;i++){
        this.emitterPool[i]={
          x:0,y:0,active:false,endAt:0,rate:0,carry:0,
          spread:0,reason:'capture'
        };
      }
    }

    _initDom(){
      const setup=()=>{
        this._viewport=document.getElementById('mapViewport');
        if(!this._viewport)return false;
        let canvas=document.getElementById('occupationSmokeCanvas');
        if(!canvas){
          canvas=document.createElement('canvas');
          canvas.id='occupationSmokeCanvas';
          canvas.setAttribute('aria-hidden','true');
          canvas.style.position='absolute';
          canvas.style.inset='0';
          canvas.style.width='100%';
          canvas.style.height='100%';
          canvas.style.zIndex='2';
          canvas.style.pointerEvents='none';
          canvas.style.contain='strict';
          this._viewport.appendChild(canvas);
        }
        this._canvas=canvas;
        this._ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
        this._syncCanvasSize(true);
        return !!this._ctx;
      };
      if(!setup()&&document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',setup,{once:true});
      }
    }

    _random(){
      // xorshift32; avoids callback/object churn from helper RNG wrappers.
      let x=this._rng|0;
      x^=x<<13;x^=x>>>17;x^=x<<5;
      this._rng=x|0;
      return (x>>>0)/4294967296;
    }

    _syncCanvasSize(force=false){
      if(!this._viewport||!this._canvas||!this._ctx)return false;
      const w=Math.max(1,this._viewport.clientWidth|0);
      const h=Math.max(1,this._viewport.clientHeight|0);
      const dpr=Math.min(MAX_DPR,Math.max(1,finite(global.devicePixelRatio,1)));
      if(force||w!==this._cssW||h!==this._cssH||dpr!==this._dpr){
        this._cssW=w;this._cssH=h;this._dpr=dpr;
        this._canvas.width=Math.max(1,Math.round(w*dpr));
        this._canvas.height=Math.max(1,Math.round(h*dpr));
        this._ctx.setTransform(dpr,0,0,dpr,0,0);
        this._ctx.imageSmoothingEnabled=true;
      }
      return true;
    }

    _camera(){
      const snap=global.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.();
      if(snap&&Array.isArray(snap.view)&&snap.view.length===4)return snap;
      const view=global.SAMGUK_MAP_CAMERA_API?.getView?.();
      if(!Array.isArray(view)||view.length!==4||!this._cssW||!this._cssH)return null;
      const ppu=Math.max(1e-6,Math.min(this._cssW/view[2],this._cssH/view[3]));
      return {
        view,
        pixelsPerWorldUnit:ppu,
        contentOffsetX:(this._cssW-view[2]*ppu)*.5,
        contentOffsetY:(this._cssH-view[3]*ppu)*.5,
        width:this._cssW,height:this._cssH,
        zoomRatio:global.SAMGUK_MAP_CAMERA_API?.getZoomLevel?.(view)||1
      };
    }

    _resolveRegionCenter(regionOrId){
      let r=regionOrId;
      if(typeof regionOrId==='number'||typeof regionOrId==='string'){
        const idx=Number(regionOrId);
        if(Number.isFinite(idx)&&global.regions?.[idx])r=global.regions[idx];
        else if(Number.isFinite(idx)&&typeof regions!=='undefined'&&regions?.[idx])r=regions[idx];
      }
      if(!r)return null;
      const x=finite(r.centerX,finite(r.center?.x,NaN));
      const y=finite(r.centerY,finite(r.center?.y,NaN));
      if(Number.isFinite(x)&&Number.isFinite(y))return [x,y];
      return null;
    }

    _screenPoint(worldX,worldY,camera){
      const view=camera.view,ppu=camera.pixelsPerWorldUnit;
      return [
        camera.contentOffsetX+(worldX-view[0])*ppu,
        camera.contentOffsetY+(worldY-view[1])*ppu
      ];
    }

    _anchorVisible(worldX,worldY,camera){
      if(!camera)return false;
      const view=camera.view,ppu=camera.pixelsPerWorldUnit;
      const sx=camera.contentOffsetX+(worldX-view[0])*ppu;
      const sy=camera.contentOffsetY+(worldY-view[1])*ppu;
      return sx>=-CULL_MARGIN&&sy>=-CULL_MARGIN&&sx<=this._cssW+CULL_MARGIN&&sy<=this._cssH+CULL_MARGIN;
    }

    _allocEmitter(){
      for(let n=0;n<this.maxEmitters;n++){
        const i=(this._emitterCursor+n)%this.maxEmitters;
        const e=this.emitterPool[i];
        if(!e.active){this._emitterCursor=(i+1)%this.maxEmitters;return e;}
      }
      // Fixed pool full: recycle the emitter that ends first without allocating.
      let best=this.emitterPool[0];
      for(let i=1;i<this.maxEmitters;i++)if(this.emitterPool[i].endAt<best.endAt)best=this.emitterPool[i];
      return best;
    }

    _allocParticle(){
      for(let n=0;n<this.maxParticles;n++){
        const i=(this._particleCursor+n)%this.maxParticles;
        const p=this.particlePool[i];
        if(!p.isActive){this._particleCursor=(i+1)%this.maxParticles;return p;}
      }
      return null;
    }

    _activateParticle(x,y,spread,burstScale=1){
      const p=this._allocParticle();
      if(!p)return false;
      const angle=this._random()*Math.PI*2;
      const radius=this._random()*spread;
      p.x=x+Math.cos(angle)*radius;
      p.y=y+Math.sin(angle)*radius*.42;
      p.vx=(this._random()-.5)*5.0;
      p.vy=-(8.5+this._random()*9.5);
      p.size=(4.5+this._random()*5.5)*burstScale;
      p.sizeGrow=2.0+this._random()*3.3;
      p.alpha=.55+this._random()*.28;
      p.maxLife=2.3+this._random()*2.4;
      p.life=p.maxLife;
      p.isActive=true;
      p.sx=p.sy=p.radius=0;
      p.bucket=4;
      this._activeParticles++;
      return true;
    }

    triggerAt(x,y,options={}){
      if(!this._syncCanvasSize())return false;
      const camera=this._camera();
      x=finite(x,NaN);y=finite(y,NaN);
      if(!Number.isFinite(x)||!Number.isFinite(y)||!this._anchorVisible(x,y,camera))return false;
      const e=this._allocEmitter();
      if(!e.active)this._activeEmitters++;
      const now=performance.now();
      e.x=x;e.y=y;e.active=true;
      e.endAt=now+clamp(finite(options.duration,5200),1200,9000);
      e.rate=clamp(finite(options.rate,22),4,60);
      e.carry=0;
      e.spread=clamp(finite(options.spread,10),3,24);
      e.reason=String(options.reason||'capture');
      const burst=clamp(finite(options.burst,24)|0,4,64);
      for(let i=0;i<burst;i++)this._activateParticle(x,y,e.spread,1.0+this._random()*.25);
      this._schedule();
      return true;
    }

    triggerRegion(regionOrId,options={}){
      const c=this._resolveRegionCenter(regionOrId);
      return c?this.triggerAt(c[0],c[1],options):false;
    }

    _schedule(){
      if(this._hidden||this._raf)return;
      this._raf=requestAnimationFrame(this._boundFrame);
    }

    _frame(now){
      this._raf=0;
      if(this._hidden)return;
      if(!this._syncCanvasSize())return;
      const camera=this._camera();
      if(!camera){if(this._activeParticles||this._activeEmitters)this._schedule();return;}
      const dt=this._lastTime?clamp((now-this._lastTime)/1000,0,.034):1/60;
      this._lastTime=now;
      this._updateEmitters(now,dt,camera);
      this._updateParticles(dt,camera);
      this._render(this._ctx);
      if(this._activeParticles||this._activeEmitters)this._schedule();
      else{
        this._lastTime=0;
        this._ctx.clearRect(0,0,this._cssW,this._cssH);
      }
    }

    _updateEmitters(now,dt,camera){
      for(let i=0;i<this.maxEmitters;i++){
        const e=this.emitterPool[i];
        if(!e.active)continue;
        if(now>=e.endAt){e.active=false;this._activeEmitters--;continue;}
        if(!this._anchorVisible(e.x,e.y,camera))continue;
        e.carry+=e.rate*dt;
        let spawn=e.carry|0;
        if(spawn>0)e.carry-=spawn;
        if(spawn>5)spawn=5; // protects against frame stalls without burst allocations.
        for(let n=0;n<spawn;n++)this._activateParticle(e.x,e.y,e.spread,1);
      }
    }

    _updateParticles(dt,camera){
      const view=camera.view,ppu=camera.pixelsPerWorldUnit;
      const offX=camera.contentOffsetX,offY=camera.contentOffsetY;
      const maxX=this._cssW+CULL_MARGIN,maxY=this._cssH+CULL_MARGIN,min=-CULL_MARGIN;
      for(let i=0;i<this.maxParticles;i++){
        const p=this.particlePool[i];
        if(!p.isActive)continue;
        // Frustum culling first. Off-screen smoke is discarded instead of consuming
        // update/render budget until its nominal lifetime expires.
        let sx=offX+(p.x-view[0])*ppu;
        let sy=offY+(p.y-view[1])*ppu;
        if(sx<min||sy<min||sx>maxX||sy>maxY){p.isActive=false;this._activeParticles--;continue;}

        p.life-=dt;
        if(p.life<=0){p.isActive=false;this._activeParticles--;continue;}
        p.x+=p.vx*dt;
        p.y+=p.vy*dt;
        p.vx*=.992;
        p.vy-=.5*dt; // gentle upward acceleration in world coordinates
        p.size+=p.sizeGrow*dt;
        p.alpha=clamp(p.life/p.maxLife,0,1)*.72;

        sx=offX+(p.x-view[0])*ppu;
        sy=offY+(p.y-view[1])*ppu;
        p.sx=sx;p.sy=sy;
        p.radius=clamp(p.size*ppu,1.4,34);
        p.bucket=p.alpha>.56?4:(p.alpha>.42?3:(p.alpha>.28?2:(p.alpha>.14?1:0)));
      }
    }

    _render(ctx){
      ctx.clearRect(0,0,this._cssW,this._cssH);
      if(!this._activeParticles)return;
      ctx.globalCompositeOperation='source-over';
      // Batch by opacity. One beginPath/fillStyle/fill per bucket rather than per particle.
      for(let bucket=0;bucket<5;bucket++){
        ctx.fillStyle=SMOKE_STYLES[bucket];
        ctx.beginPath();
        let any=false;
        for(let i=0;i<this.maxParticles;i++){
          const p=this.particlePool[i];
          if(!p.isActive||p.bucket!==bucket)continue;
          ctx.moveTo(p.sx+p.radius,p.sy);
          ctx.arc(p.sx,p.sy,p.radius,0,Math.PI*2);
          any=true;
        }
        if(any)ctx.fill();
      }
    }

    /**
     * API requested by the project prompt. In the integrated game, capture events
     * call triggerRegion() once, which is cheaper than scanning occupiedRegions every frame.
     * This method still accepts the requested signature for external/main-loop use.
     */
    updateAndRenderSmoke(ctx,occupiedRegions,currentZoom,viewport){
      // currentZoom / viewport are accepted for API compatibility; the live manager
      // uses the authoritative GPU camera snapshot so pan/zoom stays pixel-perfect.
      void occupiedRegions;void currentZoom;void viewport;
      if(ctx&&ctx!==this._ctx){
        // Render cached screen-space particle geometry without simulation or allocation.
        const previous=ctx.globalCompositeOperation;
        ctx.globalCompositeOperation='source-over';
        for(let bucket=0;bucket<5;bucket++){
          ctx.fillStyle=SMOKE_STYLES[bucket];ctx.beginPath();let any=false;
          for(let i=0;i<this.maxParticles;i++){
            const p=this.particlePool[i];if(!p.isActive||p.bucket!==bucket)continue;
            ctx.moveTo(p.sx+p.radius,p.sy);ctx.arc(p.sx,p.sy,p.radius,0,Math.PI*2);any=true;
          }
          if(any)ctx.fill();
        }
        ctx.globalCompositeOperation=previous||'source-over';
      }
      return this._activeParticles;
    }

    clear(){
      for(let i=0;i<this.maxParticles;i++)this.particlePool[i].isActive=false;
      for(let i=0;i<this.maxEmitters;i++)this.emitterPool[i].active=false;
      this._activeParticles=0;this._activeEmitters=0;this._lastTime=0;
      if(this._raf){cancelAnimationFrame(this._raf);this._raf=0;}
      if(this._ctx)this._ctx.clearRect(0,0,this._cssW,this._cssH);
    }

    stats(){return {activeParticles:this._activeParticles,activeEmitters:this._activeEmitters,maxParticles:this.maxParticles,rafActive:!!this._raf};}
  }

  const manager=new SmokeManager();
  global.SmokeManager=SmokeManager;
  global.SAMGUK_OCCUPATION_SMOKE=manager;
  global.updateAndRenderSmoke=(ctx,occupiedRegions,currentZoom,viewport)=>manager.updateAndRenderSmoke(ctx,occupiedRegions,currentZoom,viewport);
})(window);
