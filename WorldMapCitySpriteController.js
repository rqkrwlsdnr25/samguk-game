(function(global){
  'use strict';

  const ZOOM_CFG=global.SAMGUK_MAP_ZOOM_CONFIG||{};
  const CFG=Object.freeze({
    // v59: 수도/전문도시는 하나의 기준 크기를 공유한다.
    // 실제 화면 확대/축소는 GpuMapCamera의 전역 CSS 변수로 처리한다.
    standardSizePx:Math.max(20,Number(ZOOM_CFG.cityIconBaseSize)||40),
    capitalScale:1,
    specializedScale:1,
    minPx:20,
    maxPx:96,
    nameGapPx:3,
    contentGapPx:3,
    spawnDurationMs:760,
    islandScale:Math.max(.25,Math.min(1,Number(ZOOM_CFG.islandCityIconScale)||.5))
  });

  const runtime={
    getRegions:()=>[],
    getView:()=>[0,0,1200,900],
    getWorld:()=>({width:1200}),
    getSvg:()=>document.getElementById('map')
  };
  const spawnStartedAt=new Map();
  // v68: 탐라(48), 우산(49), 대마도(100)는 지도 스케일감을 위해 도시/수도 아이콘만 50%로 렌더링한다.
  // stable territory id + 이름 이중 판정으로 저장/리팩토링 시에도 안전하게 동작한다.
  const ISLAND_OVERRIDE_IDS=new Set([48,49,100]);
  const ISLAND_OVERRIDE_NAMES=new Set(['탐라','우산','대마도']);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const now=()=>typeof performance!=='undefined'?performance.now():Date.now();

  function configureRuntime(api={}){
    for(const key of Object.keys(runtime))if(typeof api[key]==='function')runtime[key]=api[key];
    return controller;
  }

  function markSpawn(id,detail={}){
    const territoryId=Number(id);
    if(!Number.isInteger(territoryId))return;
    spawnStartedAt.set(territoryId,now());
  }

  function stateFor(id){return global.SAMGUK_CITY_TECH_TREE?.getTerritoryState?.(Number(id))||null}

  function isIslandOverride(input){
    if(input&&typeof input==='object'){
      const id=Number(input.territoryId??input.id);
      const name=String(input.name||input.regionName||'').trim();
      return (Number.isInteger(id)&&ISLAND_OVERRIDE_IDS.has(id))||ISLAND_OVERRIDE_NAMES.has(name);
    }
    const id=Number(input);
    if(Number.isInteger(id)&&ISLAND_OVERRIDE_IDS.has(id))return true;
    const region=runtime.getRegions?.()?.[id];
    return ISLAND_OVERRIDE_NAMES.has(String(region?.name||'').trim());
  }

  function islandScaleFor(input){return isIslandOverride(input)?CFG.islandScale:1}

  function visibleFor(id,metrics){
    const state=stateFor(id);
    // 수도 이미지가 보이는 기존 줌 기준을 그대로 공유한다.
    return !!(state?.assetKey&&state?.asset?.src&&metrics?.showCapital);
  }

  function dimensionsFor(id,metrics){
    const state=stateFor(id);if(!state?.assetKey)return {width:0,height:0,ratio:1,islandScale:1};
    const islandScale=islandScaleFor(id);
    if(state.capital){
      const d=global.SAMGUK_CAPITAL_UPGRADE?.baseDimensionsForLevel?.(state.capitalLevel)||{width:CFG.standardSizePx,height:CFG.standardSizePx};
      // 먼저 원래 수도 단계별 박스를 확정한 뒤 섬 배율을 곱한다.
      // 따라서 lv1 40px -> 20px, lv3 58px -> 29px, lv5 84x48 -> 42x24px가 된다.
      const baseW=clamp(Number(d.width)||CFG.standardSizePx,CFG.minPx,120);
      const baseH=clamp(Number(d.height)||CFG.standardSizePx,CFG.minPx,100);
      return {width:baseW*islandScale,height:baseH*islandScale,ratio:baseH/CFG.standardSizePx,islandScale};
    }
    const size=clamp(CFG.standardSizePx,CFG.minPx,CFG.maxPx)*islandScale;
    return {width:size,height:size,ratio:1,islandScale};
  }
  function sizeFor(id,metrics){const d=dimensionsFor(id,metrics);return Math.max(d.width,d.height)}

  function spawnInfo(id){
    const started=spawnStartedAt.get(Number(id));
    if(started==null)return {className:'',style:''};
    const elapsed=Math.max(0,now()-started);
    if(elapsed>CFG.spawnDurationMs+80){spawnStartedAt.delete(Number(id));return {className:'',style:''}}
    return {className:' is-spawn',style:` style="--city-spawn-delay:-${Math.min(elapsed,CFG.spawnDurationMs).toFixed(0)}ms"`};
  }

  function layoutFor(id,metrics,{compact=false}={}){
    const state=stateFor(id);
    if(!state?.assetKey||!state.asset?.src||!metrics?.showCapital)return {visible:false,height:0,top:0,size:0};
    const dims=dimensionsFor(id,metrics),size=Math.max(dims.width,dims.height);
    const zoom=Number(global.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.()?.zoomRatio)||1;
    const tunedGap=global.SAMGUK_REGION_COMPOSITE_UI?.gapsForZoom?.(zoom)?.nameToCity;
    const rawNameGap=Number.isFinite(Number(tunedGap))?Number(tunedGap):CFG.nameGapPx;
    // 작은 섬 아이콘은 주변 텍스트/병력 HUD 간격도 비례해 압축해 공중에 뜨지 않게 한다.
    const nameGap=isIslandOverride(id)?Math.max(1,rawNameGap*.6):rawNameGap;
    const top=compact?-dims.height/2:(Number(metrics.label)||12)+nameGap;
    return {visible:true,size,width:dims.width,height:dims.height,ratio:dims.ratio,islandScale:dims.islandScale||1,top,bottom:top+dims.height,state};
  }

  function inlineImageMarkup(id,metrics,{compact=false}={}){
    const layout=layoutFor(id,metrics,{compact});
    if(!layout.visible)return '';
    const {state,size,width,height,top}=layout;
    const spawn=spawnInfo(id),src=state.asset.src,fallback=state.fallbackAsset?.src||'';
    const title=state.asset.label||state.assetKey,capitalTier=state.capital?(global.SAMGUK_CAPITAL_UPGRADE?.tierForLevel?.(state.capitalLevel)||'lv1'):'';
    const tierClass=state.capital?` capital-tier-${capitalTier}`:'';
    const islandClass=isIslandOverride(id)?' is-island-city-art':'';
    return `<g class="city-image-slot city-kind-${state.assetKey}${tierClass}${state.assetKey!=='capital'?' is-specialized':''}${islandClass}${compact?' is-compact':''}${spawn.className}" data-city-image-slot="${Number(id)}" data-city-kind="${state.assetKey}" data-capital-level="${state.capitalLevel||0}" data-city-base-size="${size.toFixed(2)}"${spawn.style} pointer-events="none" aria-hidden="true"><rect class="city-image-fallback-frame" x="${(-width/2).toFixed(2)}" y="${top.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="5"/><text class="city-image-fallback-glyph" x="0" y="${(top+height*.58).toFixed(2)}">城</text><title>${title}</title><image class="capital-image territory-city-image" data-city-asset="1" data-city-fallback="${fallback}" href="${src}" x="${(-width/2).toFixed(2)}" y="${top.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" preserveAspectRatio="xMidYMid meet" decoding="async"/></g>`;
  }

  function bindImageFallbacks(){
    const svg=runtime.getSvg?.();if(!svg)return;
    for(const image of svg.querySelectorAll('image[data-city-asset="1"]')){
      if(image.dataset.cityErrorBound==='1')continue;
      image.dataset.cityErrorBound='1';
      image.addEventListener('error',()=>{
        const slot=image.closest('.city-image-slot');
        const fallback=image.getAttribute('data-city-fallback')||'';
        if(fallback&&image.getAttribute('href')!==fallback){
          console.warn('[삼국쟁패][CityAsset] specialized asset failed, capital fallback:',image.getAttribute('href'));
          image.setAttribute('href',fallback);
          return;
        }
        slot?.classList.add('asset-error');
        image.setAttribute('visibility','hidden');
        console.warn('[삼국쟁패][CityAsset] image hidden after load failure:',image.getAttribute('href'));
      },{once:false});
    }
  }

  document.addEventListener('samguk:city-upgraded',e=>{
    const d=e.detail||{};
    markSpawn(d.territoryId,d);
    const state=stateFor(d.territoryId);
    if(state?.asset?.src)global.SAMGUK_CITY_TECH_TREE?.preload?.(state.asset.src);
  });
  document.addEventListener('samguk:capital-upgraded',e=>{
    const d=e.detail||{};markSpawn(d.territoryId,d);
    const state=stateFor(d.territoryId);if(state?.asset?.src)global.SAMGUK_CAPITAL_UPGRADE?.preload?.(state.asset.src);
  });
  document.addEventListener('samguk:map-rendered',()=>{
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(bindImageFallbacks);else setTimeout(bindImageFallbacks,0);
  });

  function drawMapCitiesWithIslandCheck(ctx,cityList,currentZoom){
    if(!ctx||!Array.isArray(cityList))return;
    const zoomCfg=global.SAMGUK_MAP_ZOOM_CONFIG||{};
    const base=Math.max(20,Number(zoomCfg.cityIconBaseSize)||CFG.standardSizePx);
    const minScale=Math.max(.25,Number(zoomCfg.cityIconMinScale)||.55);
    const maxScale=Math.max(1,Number(zoomCfg.cityIconMaxScale)||2.20);
    const zoom=clamp(Number(currentZoom)||1,minScale,maxScale);

    ctx.save();
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    for(const city of cityList){
      const x=Number(city?.x),y=Number(city?.y);
      if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      const island=isIslandOverride(city);
      const currentBaseSize=base*(island?CFG.islandScale:1);
      const renderSize=currentBaseSize*zoom;
      const nameGap=island?3:5;
      const troopGap=island?6:10;
      const name=String(city?.name||'');
      if(name){
        ctx.font=city.nameFont||'600 13px sans-serif';
        ctx.fillStyle=city.nameColor||'#f3e8c7';
        ctx.fillText(name,x,y);
      }
      const img=city?.img||city?.image;
      const iconTop=y+(name?13:0)+nameGap;
      const iconCenterY=iconTop+renderSize/2;
      if(img&&img.complete!==false){
        // 중심 X를 기준으로 절반씩 나눠 축소하므로 50%가 되어도 타일 중심에서 벗어나지 않는다.
        ctx.drawImage(img,x-renderSize/2,iconCenterY-renderSize/2,renderSize,renderSize);
      }
      if(city?.count!==undefined&&city?.count!==null){
        const troopY=iconCenterY+renderSize/2+troopGap;
        ctx.font=city.troopFont||'700 12px sans-serif';
        ctx.fillStyle=city.troopColor||'#fff';
        ctx.fillText(String(city.count),x,troopY);
      }
    }
    ctx.restore();
  }

  // Backward-compatible entry point. Shipping SVG path and Canvas reference path share the same island rule.
  function drawMapCities(ctx,cityList,currentZoom){
    return drawMapCitiesWithIslandCheck(ctx,cityList,currentZoom);
  }


  const controller={
    version:3,
    config:CFG,
    configureRuntime,
    stateFor,
    isIslandOverride,
    islandScaleFor,
    visibleFor,
    dimensionsFor,
    sizeFor,
    layoutFor,
    inlineImageMarkup,
    markSpawn,
    bindImageFallbacks,
    drawMapCities,
    drawMapCitiesWithIslandCheck
  };
  global.SAMGUK_CITY_SPRITES=controller;
  global.drawMapCities=global.drawMapCities||drawMapCities;
  global.drawMapCitiesWithIslandCheck=global.drawMapCitiesWithIslandCheck||drawMapCitiesWithIslandCheck;
})(window);
