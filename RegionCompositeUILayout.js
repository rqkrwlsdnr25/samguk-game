(function(global){
  'use strict';

  /**
   * v61 — High-zoom region composite UI compaction
   * ------------------------------------------------------------
   * The world marker itself stays on the polygon centroid.  The visible UI stack
   * (region name -> city/castle -> resource emoji -> troop HUD) is shifted upward
   * in SCREEN PIXELS as zoom increases, instead of multiplying every gap by zoom.
   *
   * This keeps the composite centered around the territory centroid at high zoom
   * (3.74x and above) without changing territory geometry or camera math.
   */
  const ZOOM_CFG=global.SAMGUK_MAP_ZOOM_CONFIG||{};
  const numberOr=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
  const CFG=Object.freeze({
    compactStartZoom:numberOr(ZOOM_CFG.regionCompositeCompactStart,1.25),
    compactTargetZoom:numberOr(ZOOM_CFG.regionCompositeCompactTarget,3.74),
    maxAdditionalLiftPx:numberOr(ZOOM_CFG.regionCompositeExtraLiftPx,18),
    maxCompositeLiftPx:numberOr(ZOOM_CFG.regionCompositeMaxLiftPx,72),
    nameToCityGapPx:3,
    cityToResourceGapPx:3,
    resourceToTroopGapPx:7,
    cityToTroopGapPx:10,
    canvasLabelLiftBasePx:0,
    canvasLabelFontPx:13,
    canvasResourceFontPx:18,
    canvasTroopGapPx:8
  });

  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const smoothstep=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};

  function zoomT(currentZoom){
    const z=Math.max(.01,finite(currentZoom,1));
    const span=Math.max(.001,CFG.compactTargetZoom-CFG.compactStartZoom);
    return smoothstep((z-CFG.compactStartZoom)/span);
  }

  /**
   * Returns the upward screen-pixel shift for city-bearing territory UI.
   * cityExtraY is the extra visual height created by the city icon's controlled
   * zoom curve.  We cancel that downward growth first, then add only a small,
   * eased high-zoom lift.  No full `gap * currentZoom` multiplication is used.
   */
  function liftForZoom(currentZoom,{cityBasePx=40,cityScale=null,hasCity=true}={}){
    if(!hasCity)return 0;
    const z=Math.max(.01,finite(currentZoom,1));
    const scale=cityScale==null?clamp(z,.55,2.20):Math.max(.01,finite(cityScale,1));
    const base=clamp(finite(cityBasePx,40),20,96);
    const cityExtraY=Math.max(0,base*(scale-1));
    const highZoomLift=CFG.maxAdditionalLiftPx*zoomT(z);
    return clamp(cityExtraY+highZoomLift,0,CFG.maxCompositeLiftPx);
  }

  function gapsForZoom(currentZoom){
    const t=zoomT(currentZoom);
    // At normal zoom retain a little breathing room.  At high zoom, compress gaps
    // by only a few pixels; icon growth is handled by `liftForZoom`, not by gaps.
    return Object.freeze({
      nameToCity:Math.round(5+(CFG.nameToCityGapPx-5)*t),
      cityToResource:Math.round(6+(CFG.cityToResourceGapPx-6)*t),
      resourceToTroop:Math.round(11+(CFG.resourceToTroopGapPx-11)*t),
      cityToTroop:Math.round(14+(CFG.cityToTroopGapPx-14)*t)
    });
  }

  /**
   * Canvas reference renderer requested by the patch specification.
   * It is intentionally standalone; the shipping map uses an SVG + screen-space
   * Canvas hybrid, but both paths share the exact same compact-lift formula.
   */
  function drawRegionCompositeUI(ctx,region,currentZoom){
    if(!ctx||!region)return false;
    const center=region.center||{x:region.x,y:region.y};
    const cx=finite(center?.x,NaN),cy=finite(center?.y,NaN);
    if(!Number.isFinite(cx)||!Number.isFinite(cy))return false;

    const z=Math.max(.01,finite(currentZoom,1));
    const cityBase=clamp(finite(region.cityBaseSize,40),20,96);
    const cityScale=clamp(z,.55,2.20);
    const citySize=cityBase*cityScale;
    const hasCity=!!(region.cityImg||region.cityImage||region.castleImg);
    const lift=liftForZoom(z,{cityBasePx:cityBase,cityScale,hasCity});
    const gaps=gapsForZoom(z);

    const labelFont=Math.max(9,finite(region.labelFontPx,CFG.canvasLabelFontPx));
    const resourceFont=Math.max(10,finite(region.resourceFontPx,CFG.canvasResourceFontPx));
    const textY=cy-lift;
    const cityTop=textY+labelFont*.68+gaps.nameToCity;
    const cityCenterY=cityTop+citySize/2;
    const cityBottom=cityTop+citySize;
    const resources=Array.isArray(region.resources)?region.resources:[];
    const resourceY=cityBottom+(resources.length?gaps.cityToResource+resourceFont*.5:0);
    const troopY=resources.length
      ? resourceY+resourceFont*.5+Math.max(12,resourceFont*.55+gaps.resourceToTroop)
      : cityBottom+gaps.cityToTroop+10;

    ctx.save();
    ctx.textAlign='center';
    ctx.textBaseline='middle';

    if(region.name){
      ctx.font=region.nameFont||`700 ${labelFont}px sans-serif`;
      ctx.fillStyle=region.nameColor||'#f3e8c7';
      ctx.fillText(String(region.name),cx,textY);
    }

    const cityImg=region.cityImg||region.cityImage||region.castleImg;
    if(cityImg&&cityImg.complete!==false){
      ctx.drawImage(cityImg,cx-citySize/2,cityCenterY-citySize/2,citySize,citySize);
    }

    if(resources.length){
      ctx.font=region.resourceFont||`${resourceFont}px sans-serif`;
      ctx.fillStyle=region.resourceColor||'#fff';
      ctx.fillText(resources.join(' '),cx,resourceY);
    }

    const territoryId=Number(region.territoryId??region.id);
    const showTroopLabel=Number.isInteger(territoryId)?(global.SAMGUK_VISIBILITY?.canSeeTroopLabel?.(territoryId)??true):true;
    if(showTroopLabel&&region.troops!==undefined&&region.troops!==null){
      const sprite=global.SAMGUK_FACTION_LABEL_SPRITE;
      if(sprite?.drawFactionLabelFromSheet&&region.factionKey){
        sprite.drawFactionLabelFromSheet(ctx,cx,troopY,region.factionKey,region.troops,{scale:1});
      }else{
        ctx.font=region.troopFont||'800 12px sans-serif';
        ctx.fillStyle=region.troopColor||'#fff';
        ctx.fillText(String(region.troops),cx,troopY);
      }
    }

    ctx.restore();
    return true;
  }

  const api=Object.freeze({
    version:1,
    config:CFG,
    zoomT,
    gapsForZoom,
    liftForZoom,
    drawRegionCompositeUI
  });

  global.SAMGUK_REGION_COMPOSITE_UI=api;
  global.drawRegionCompositeUI=drawRegionCompositeUI;
})(window);
