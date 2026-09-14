(function(global){
  'use strict';

  class MapUiOverlayManager{
    constructor(options={}){
      this.overlayId=options.overlayId||'mapUiOverlay';
      this._raf=0;
      this._lastSignature='';
    }

    _overlay(){return document.getElementById(this.overlayId)}

    scheduleRefresh(){
      if(this._raf)return;
      this._raf=requestAnimationFrame(()=>{this._raf=0;this.refresh()});
    }

    refresh({force=false}={}){
      const overlay=this._overlay();
      if(!overlay||typeof global.territoryLabels!=='function')return false;
      let labels='';
      try{labels=global.territoryLabels()}
      catch(err){console.error('[삼국쟁패][MapUIOverlay] territory label render failed',err);return false}
      // Signature avoids replacing the UI SVG if game data did not change.
      const signature=`${labels.length}:${labels.slice(0,96)}:${labels.slice(-96)}`;
      if(!force&&signature===this._lastSignature&&overlay.querySelector('#territory-labels'))return true;
      this._lastSignature=signature;
      overlay.innerHTML=`<g id="territory-labels">${labels}</g>`;
      global.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('overlay-refresh');
      // v43: officer map icons are intentionally absent. The overlay contains
      // only territory labels / city sprite data / faction-troop HUD markup.
      // No per-officer DOM creation or zoom work is performed here.
      return true;
    }
  }

  global.MapUiOverlayManager=MapUiOverlayManager;
  global.SAMGUK_MAP_UI_OVERLAY=new MapUiOverlayManager();
})(window);
