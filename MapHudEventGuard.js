(function(global){
  'use strict';

  function init(){
    const controls=document.querySelector('.map-controls');
    if(!controls||controls.dataset.eventGuard==='1')return;
    controls.dataset.eventGuard='1';

    // Controls are fixed above the map. Stop map gesture handlers defensively so
    // button clicks, drags and wheel input never leak into world-map navigation.
    const stop=e=>e.stopPropagation();
    ['pointerdown','pointerup','pointermove','click','dblclick','contextmenu','touchstart','touchmove','touchend']
      .forEach(type=>controls.addEventListener(type,stop,{passive:true}));

    controls.addEventListener('wheel',e=>{
      e.preventDefault();
      e.stopPropagation();
    },{passive:false});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  global.SAMGUK_MAP_HUD_EVENT_GUARD={init};
})(window);
