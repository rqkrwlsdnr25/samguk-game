(function(global){
  'use strict';

  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;

  /**
   * Compute 1 -> 0 opacity while zoom moves from fadeStart -> fadeEnd.
   * The result is deterministic and allocation-free so the GPU camera can call it
   * every interpolated frame without forcing a map redraw or DOM measurement.
   */
  function alphaForZoom(currentZoom,fadeStart,fadeEnd){
    const z=finite(currentZoom,1);
    const start=finite(fadeStart,1.25);
    const end=Math.max(start+.001,finite(fadeEnd,2.40));
    return clamp(1-(z-start)/(end-start),0,1);
  }

  /**
   * Canvas reference implementation requested by the patch specification.
   * The production 삼국쟁패 map is SVG, so it uses the same alpha through a CSS
   * variable on #atlas-labels instead of repainting text on a Canvas every frame.
   *
   * countryList item example:
   * { name:'백제', x:520, y:895, font:'700 26px sans-serif', color:'#fff9e7' }
   */
  function drawLargeCountryNames(ctx,countryList,currentZoom,options={}){
    if(!ctx||!Array.isArray(countryList))return 0;
    const cfg=global.SAMGUK_MAP_ZOOM_CONFIG||{};
    const fadeStart=finite(options.fadeStartZoom,finite(cfg.largeCountryNameFadeStart,1.25));
    const fadeEnd=finite(options.fadeEndZoom,finite(cfg.largeCountryNameFadeEnd,2.40));
    const alpha=alphaForZoom(currentZoom,fadeStart,fadeEnd);
    if(alpha<=0)return 0;

    ctx.save();
    try{
      // save()/restore() contains alpha strictly to the large-country-name pass.
      ctx.globalAlpha=alpha;
      ctx.textAlign='center';
      ctx.textBaseline='middle';

      for(const country of countryList){
        if(!country)continue;
        const x=finite(country.x,NaN),y=finite(country.y,NaN);
        if(!Number.isFinite(x)||!Number.isFinite(y))continue;
        const name=String(country.name??'');
        if(!name)continue;

        ctx.font=country.font||options.font||'700 26px sans-serif';
        ctx.fillStyle=country.color||options.color||'#fff9e7';
        if(country.strokeStyle||options.strokeStyle){
          ctx.strokeStyle=country.strokeStyle||options.strokeStyle;
          ctx.lineWidth=Math.max(.1,finite(country.lineWidth,finite(options.lineWidth,2.8)));
          ctx.strokeText(name,x,y);
        }
        ctx.fillText(name,x,y);
      }
    }finally{
      // restore() returns globalAlpha and all text state to the caller, ensuring
      // castles, territory labels and troop UI remain fully opaque.
      ctx.restore();
    }
    return alpha;
  }

  global.SAMGUK_LARGE_COUNTRY_NAME_FADE=Object.freeze({alphaForZoom,drawLargeCountryNames});
  global.drawLargeCountryNames=drawLargeCountryNames;
})(window);
