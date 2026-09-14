(function(global){
  'use strict';

  // Hysteresis prevents a wheel gesture around the threshold from repeatedly
  // spawning GSAP tweens. FULL_MAP is zoomRatio ~= 1.0, close zoom is > 1.0.
  const CFG=Object.freeze({
    compactEnterZoomRatio:1.25,
    compactExitZoomRatio:1.45
  });

  class FactionHudZoomModeController{
    constructor(){
      this.isCompactMode=null;
      this._bound=false;
      this._lastZoomRatio=1;
      this._onView=this._onView.bind(this);
    }

    init(){
      if(this._bound)return true;
      this._bound=true;
      document.addEventListener('samguk:map-view-changed',this._onView,{passive:true});
      const snap=global.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.();
      if(snap)this.update(Number(snap.zoomRatio),{immediate:true});
      return true;
    }

    destroy(){
      if(!this._bound)return;
      document.removeEventListener('samguk:map-view-changed',this._onView);
      global.SAMGUK_FACTION_HUD_TRANSITIONS?.kill?.();
      this._bound=false;
    }

    _onView(event){
      const ratio=Number(event?.detail?.camera?.zoomRatio);
      if(Number.isFinite(ratio))this.update(ratio);
    }

    update(zoomRatio,{immediate=false}={}){
      const z=Number(zoomRatio);
      if(!Number.isFinite(z)||z<=0)return false;
      this._lastZoomRatio=z;

      let next=this.isCompactMode;
      if(next===null)next=z<=CFG.compactEnterZoomRatio;
      else if(!next&&z<=CFG.compactEnterZoomRatio)next=true;
      else if(next&&z>=CFG.compactExitZoomRatio)next=false;
      else return false; // State unchanged: no GSAP call, no DOM churn.

      if(next===this.isCompactMode)return false;
      this.isCompactMode=next;
      if(next)global.SAMGUK_FACTION_HUD_TRANSITIONS?.hide?.({immediate});
      else global.SAMGUK_FACTION_HUD_TRANSITIONS?.show?.({immediate});
      return true;
    }

    getState(){return Object.freeze({isCompactMode:this.isCompactMode,zoomRatio:this._lastZoomRatio,...CFG})}
  }

  const controller=new FactionHudZoomModeController();
  global.FactionHudZoomModeController=FactionHudZoomModeController;
  global.SAMGUK_FACTION_HUD_ZOOM=controller;
  const boot=()=>controller.init();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window);
