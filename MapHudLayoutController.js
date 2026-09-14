(function(global){
  'use strict';

  const MIN_MAP_HEIGHT=320;
  let raf=0;

  function viewportHeight(){
    const vv=global.visualViewport;
    const h=Number(vv?.height)||Number(global.innerHeight)||720;
    return Number.isFinite(h)&&h>0?h:720;
  }

  function syncMapViewportHeight(){
    const mapViewport=document.getElementById('mapViewport');
    if(!mapViewport)return false;

    // One layout read per resize/orientation batch only. Camera zoom/pan rAF does
    // not call this function, so there is no per-frame reflow loop.
    const rect=mapViewport.getBoundingClientRect();
    const screenH=viewportHeight();
    const top=Math.max(0,Number.isFinite(rect.top)?rect.top:0);
    const available=Math.max(MIN_MAP_HEIGHT,Math.min(screenH,screenH-top));
    document.documentElement.style.setProperty('--samguk-map-fill-height',`${Math.round(available)}px`);

    // Camera caches viewport metrics. Invalidate only after actual layout changes.
    global.SAMGUK_GPU_MAP_CAMERA?.invalidateLayout?.();
    global.SAMGUK_GPU_MAP_CAMERA?.refreshLayout?.();
    return true;
  }

  function schedule(){
    if(raf)return;
    raf=global.requestAnimationFrame(()=>{raf=0;syncMapViewportHeight();});
  }

  function removeLegacyStatus(){
    // HTML v49 no longer includes it. This handles hot reload / cached DOM safely.
    document.getElementById('mapStatus')?.remove();
  }

  function init(){
    removeLegacyStatus();
    schedule();
    global.addEventListener('resize',schedule,{passive:true});
    global.addEventListener('orientationchange',schedule,{passive:true});
    global.visualViewport?.addEventListener?.('resize',schedule,{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();

  global.SAMGUK_MAP_HUD_LAYOUT={sync:syncMapViewportHeight,schedule};
})(window);
