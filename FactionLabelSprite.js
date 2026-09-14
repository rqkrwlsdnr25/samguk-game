(function(global){
  'use strict';

  /**
   * v58 — Single-image faction troop HUD sprite renderer
   * ---------------------------------------------------
   * - Loads one sprite sheet exactly once.
   * - Territory troop HUDs for the 11 supplied faction badges are painted on a
   *   single screen-space canvas with 9-argument ctx.drawImage slicing.
   * - The SVG world/label layers remain responsible for territory names, cities
   *   and resources, so those systems are not affected.
   * - Unsupported factions automatically keep the existing lightweight SVG HUD.
   */

  const SHEET_SRC='assets/images/ui/faction_labels_sheet.png';

  // The source artwork is laid out as two columns.  The rows are visually
  // uniform, but the final source row sits slightly lower, so rowY is explicit.
  // Width/height stay shared variables so a replacement sheet can be tuned in
  // one place without rewriting every mapping entry.
  const LAYOUT=Object.freeze({
    leftX:162,
    rightX:836,
    spriteWidth:544,
    // Row bands are cut between neighboring alpha bounds so one sprite never
    // samples pixels from the next row.  They can be retuned for a new sheet.
    rowBands:Object.freeze([
      Object.freeze({sy:26,sh:171}),
      Object.freeze({sy:197,sh:169}),
      Object.freeze({sy:366,sh:170}),
      Object.freeze({sy:536,sh:166}),
      Object.freeze({sy:702,sh:161}),
      Object.freeze({sy:863,sh:161})
    ]),
    drawAspect:160/530,
    shieldEndRatio:.34,
    barStartRatio:.225,
    countXRatio:.635,
    countYRatio:.49,
    baseDrawWidth:86,
    compactPositionScale:.72,
    normalPositionScale:.92
  });

  const rect=(column,row)=>{
    const band=LAYOUT.rowBands[row];
    return Object.freeze({
      sx:column===0?LAYOUT.leftX:LAYOUT.rightX,
      sy:band.sy,
      sw:LAYOUT.spriteWidth,
      sh:band.sh
    });
  };

  // Source-sheet keys.  Image artwork uses 신/북.  The user-facing aliases
  // 선/복 are accepted as compatibility spellings and resolve to the same cell.
  const SPRITES=Object.freeze({
    '고':rect(0,0),
    '유':rect(0,1),
    '신':rect(0,2),
    '탐':rect(0,3),
    '우':rect(0,4),
    '읍':rect(0,5),
    '북':rect(1,0),
    '남':rect(1,1),
    '가':rect(1,2),
    '왜':rect(1,3),
    '부':rect(1,4),
    '구':rect(1,5)
  });

  const ALIASES=Object.freeze({
    '선':'신',
    '복':'북'
  });

  const FACTION_NAME_TO_KEY=Object.freeze({
    '고구려':'고',
    '유연':'유',
    '신라':'신',
    '탐라':'탐',
    '우산':'우',
    '읍루':'읍',
    '북연':'북',
    '남연':'남',
    '가야':'가',
    '왜':'왜',
    '왜구':'구',
    '부여':'부'
  });

  const runtime={
    getTerritories:()=>[],
    getFaction:()=>null,
    isActiveTerritory:()=>true,
    getCenter:()=>null,
    getHudOffset:()=>0,
    getSelected:()=>null
  };

  const state={
    image:null,
    imageReady:false,
    imageFailed:false,
    loadPromise:null,
    canvas:null,
    ctx:null,
    raf:0,
    resizeObserver:null,
    bound:false,
    dpr:1,
    cssWidth:0,
    cssHeight:0,
    lastDrawCount:0,
    loadCount:0
  };

  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;

  function canonicalKey(key){
    const raw=String(key??'').trim();
    return ALIASES[raw]||raw;
  }

  function factionKey(factionOrKey){
    if(typeof factionOrKey==='string'){
      const name=String(factionOrKey).trim();
      if(SPRITES[canonicalKey(name)])return canonicalKey(name);
      return canonicalKey(FACTION_NAME_TO_KEY[name]||name.slice(0,1));
    }
    const faction=factionOrKey||{};
    const name=String(faction.name||'').trim();
    return canonicalKey(FACTION_NAME_TO_KEY[name]||String(faction.spriteKey||'')||name.slice(0,1));
  }

  function spriteFor(factionOrKey){
    return SPRITES[factionKey(factionOrKey)]||null;
  }

  function hasFaction(factionOrKey){
    return !!spriteFor(factionOrKey);
  }

  function preload(){
    if(state.loadPromise)return state.loadPromise;
    state.loadPromise=new Promise((resolve,reject)=>{
      const img=new Image();
      state.image=img;
      state.loadCount+=1;
      img.decoding='async';
      img.onload=async()=>{
        try{if(typeof img.decode==='function')await img.decode()}catch(_e){}
        state.imageReady=true;
        state.imageFailed=false;
        scheduleDraw('sheet-ready');
        document.dispatchEvent(new CustomEvent('samguk:faction-label-sprite-ready'));
        resolve(img);
      };
      img.onerror=err=>{
        state.imageReady=false;
        state.imageFailed=true;
        document.dispatchEvent(new CustomEvent('samguk:faction-label-sprite-error'));
        global.SAMGUK_MAP_UI_OVERLAY?.refresh?.({force:true});
        reject(err||new Error('faction label sprite sheet load failed'));
      };
      // Exactly one src assignment / one Image instance for this asset.
      img.src=SHEET_SRC;
    });
    return state.loadPromise;
  }

  function configureRuntime(api={}){
    for(const key of Object.keys(runtime))if(typeof api[key]==='function')runtime[key]=api[key];
    ensureCanvas();
    scheduleDraw('runtime-configured');
    return controller;
  }

  function ensureCanvas(){
    const viewport=document.getElementById('mapViewport');
    if(!viewport)return null;
    let canvas=document.getElementById('factionLabelCanvas');
    if(!canvas){
      canvas=document.createElement('canvas');
      canvas.id='factionLabelCanvas';
      canvas.className='faction-label-sprite-layer';
      canvas.setAttribute('aria-hidden','true');
      viewport.appendChild(canvas);
    }
    state.canvas=canvas;
    state.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    if(!state.bound)bindEvents(viewport);
    resizeCanvas();
    return canvas;
  }

  function bindEvents(viewport){
    state.bound=true;
    document.addEventListener('samguk:map-view-changed',()=>scheduleDraw('view'),{passive:true});
    document.addEventListener('samguk:map-rendered',()=>scheduleDraw('map-rendered'),{passive:true});
    document.addEventListener('samguk:map-state-updated',()=>scheduleDraw('map-state'),{passive:true});
    document.addEventListener('samguk:faction-label-sprite-error',()=>scheduleDraw('sheet-error'),{passive:true});
    global.addEventListener('resize',()=>{resizeCanvas();scheduleDraw('resize')},{passive:true});
    if(typeof ResizeObserver==='function'){
      state.resizeObserver=new ResizeObserver(()=>{resizeCanvas();scheduleDraw('resize-observer')});
      state.resizeObserver.observe(viewport);
    }
  }

  function resizeCanvas(){
    const canvas=state.canvas,viewport=document.getElementById('mapViewport');
    if(!canvas||!viewport)return false;
    const width=Math.max(1,viewport.clientWidth||1),height=Math.max(1,viewport.clientHeight||1);
    const dpr=clamp(finite(global.devicePixelRatio,1),1,2);
    const pixelW=Math.max(1,Math.round(width*dpr)),pixelH=Math.max(1,Math.round(height*dpr));
    if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH}
    state.cssWidth=width;state.cssHeight=height;state.dpr=dpr;
    canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
    return true;
  }

  function readHudState(){
    const viewport=document.getElementById('mapViewport');
    if(!viewport)return {compact:false,barAlpha:1,visualScale:.92};
    const compact=viewport.classList.contains('faction-hud-compact');
    const hidden=viewport.classList.contains('faction-hud-badge-hidden');
    const alphaRaw=finite(viewport.style.getPropertyValue('--troop-badge-opacity'),hidden?0:1);
    const visualScale=clamp(finite(viewport.style.getPropertyValue('--faction-hud-scale'),.92),.5,2.5);
    return {compact,barAlpha:hidden?0:clamp(alphaRaw,0,1),visualScale};
  }

  function destinationSize(sprite,{compact=false,visualScale=.92,scale=1}={}){
    const positionScale=compact?LAYOUT.compactPositionScale:LAYOUT.normalPositionScale;
    const width=LAYOUT.baseDrawWidth*positionScale*finite(visualScale,.92)*finite(scale,1);
    return {width,height:width*LAYOUT.drawAspect};
  }

  /**
   * Core 9-argument drawImage renderer requested by the patch.
   * mapX/mapY are destination-canvas pixel coordinates for the badge center.
   */
  function drawFactionLabelFromSheet(ctx,mapX,mapY,factionKeyOrObject,count,options={}){
    if(!ctx||!state.imageReady||!state.image)return false;
    const sprite=spriteFor(factionKeyOrObject);if(!sprite)return false;
    const {compact=false,visualScale=.92,scale=1,barAlpha=1,backgroundAlpha=.5}=options;
    const size=destinationSize(sprite,{compact,visualScale,scale});
    const dw=size.width,dh=size.height,dx=finite(mapX)-dw/2,dy=finite(mapY)-dh/2;
    const barStart=Math.round(sprite.sw*LAYOUT.barStartRatio);
    const shieldEnd=Math.round(sprite.sw*LAYOUT.shieldEndRatio);
    // barAlpha is the existing HUD visibility/fade value. Keep text visibility
    // behavior intact, but render ONLY the black PNG bar at 50% opacity.
    // This lets terrain/rivers show through without dimming the troop number.
    const safeContentAlpha=clamp(finite(barAlpha,1),0,1);
    const safeBackgroundAlpha=clamp(finite(backgroundAlpha,.5),0,1)*safeContentAlpha;

    ctx.save();
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';

    // Draw only the black troop bar at 50% alpha. The source sprite remains
    // untouched on disk; transparency is applied by Canvas at render time.
    if(safeContentAlpha>.001){
      ctx.globalAlpha=safeBackgroundAlpha;
      ctx.drawImage(
        state.image,
        sprite.sx+barStart,sprite.sy,sprite.sw-barStart,sprite.sh,
        dx+dw*(barStart/sprite.sw),dy,dw*((sprite.sw-barStart)/sprite.sw),dh
      );
    }

    // Shield stays fully opaque. It is not part of the black background fade.
    ctx.globalAlpha=1;
    ctx.drawImage(
      state.image,
      sprite.sx,sprite.sy,shieldEnd,sprite.sh,
      dx,dy,dw*(shieldEnd/sprite.sw),dh
    );

    if(safeContentAlpha>.001){
      // Number text remains 100% opaque at normal zoom. If the existing HUD
      // controller intentionally fades/hides labels, preserve that visibility.
      ctx.globalAlpha=safeContentAlpha;
      const fontPx=clamp(dh*.48,9,20);
      ctx.font=`800 ${fontPx.toFixed(1)}px "Noto Sans KR","Malgun Gothic",sans-serif`;
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.lineJoin='round';
      ctx.lineWidth=Math.max(2,fontPx*.18);
      ctx.strokeStyle='rgba(0,0,0,.92)';
      ctx.fillStyle='#ffffff';
      const countX=dx+dw*LAYOUT.countXRatio;
      const countY=dy+dh*LAYOUT.countYRatio;
      const text=String(Math.max(0,Math.round(finite(count,0))));
      ctx.strokeText(text,countX,countY);
      ctx.fillText(text,countX,countY);
    }
    ctx.restore();
    return true;
  }

  /**
   * Lightweight Canvas fallback for code-drawn troop labels.
   * Background only: 50% alpha. Text: full alpha. No shadowBlur.
   * This helper is exported for non-sprite/future Canvas HUD call sites.
   */
  function drawTransparentTroopLabel(ctx,x,y,count,options={}){
    if(!ctx)return false;
    const width=Math.max(28,finite(options.width,58));
    const height=Math.max(14,finite(options.height,22));
    const radius=Math.min(height*.5,Math.max(3,finite(options.radius,height*.5)));
    const bgAlpha=clamp(finite(options.backgroundAlpha,.5),0,1);
    const left=finite(x)-width/2,top=finite(y)-height/2,right=left+width,bottom=top+height;

    ctx.save();
    ctx.shadowBlur=0;
    ctx.shadowColor='transparent';
    ctx.globalAlpha=1;
    ctx.fillStyle=`rgba(26,26,26,${bgAlpha})`;
    ctx.beginPath();
    ctx.moveTo(left+radius,top);
    ctx.lineTo(right-radius,top);
    ctx.arcTo(right,top,right,bottom,radius);
    ctx.arcTo(right,bottom,left,bottom,radius);
    ctx.arcTo(left,bottom,left,top,radius);
    ctx.arcTo(left,top,right,top,radius);
    ctx.closePath();
    ctx.fill();

    // Restore full opacity before drawing count text.
    ctx.globalAlpha=1;
    ctx.font=options.font||'800 12px "Noto Sans KR","Malgun Gothic",sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.lineJoin='round';
    ctx.lineWidth=2;
    ctx.strokeStyle='rgba(0,0,0,.92)';
    ctx.fillStyle=options.textColor||'#fff';
    const text=String(Math.max(0,Math.round(finite(count,0))));
    ctx.strokeText(text,finite(x),finite(y));
    ctx.fillText(text,finite(x),finite(y));
    ctx.restore();
    return true;
  }

  function draw(){
    state.raf=0;
    const canvas=ensureCanvas(),ctx=state.ctx;
    if(!canvas||!ctx)return false;
    resizeCanvas();
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
    ctx.clearRect(0,0,state.cssWidth,state.cssHeight);
    state.lastDrawCount=0;
    if(global.SAMGUK_SPECIALTY_MAP_MODE?.isActive?.())return true;
    if(!state.imageReady||state.imageFailed)return false;

    const snap=global.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.();
    if(!snap||!Array.isArray(snap.view))return false;
    const territories=runtime.getTerritories()||[];
    const [vx,vy]=snap.view;
    const ppu=finite(snap.pixelsPerWorldUnit,0);
    const offsetX=finite(snap.contentOffsetX,0),offsetY=finite(snap.contentOffsetY,0);
    if(!(ppu>0))return false;
    const hudState=readHudState();
    const margin=120;
    // v59: the troop sprite canvas lives outside the SVG label tree, so it does
    // not inherit the CSS translate used by SVG fallback HUDs. Reproduce the
    // same city-growth offset once per frame from the camera snapshot.
    const labelMetrics=global.SAMGUK_TERRITORY_HUD_LAYOUT?.getMetrics?.()||null;
    const zoomCfg=global.SAMGUK_MAP_ZOOM_CONFIG||{};
    const cityBasePx=clamp(finite(zoomCfg.cityIconBaseSize,40),20,96);
    const cityMinScale=clamp(finite(zoomCfg.cityIconMinScale,.55),.25,1);
    const cityMaxScale=Math.max(1,finite(zoomCfg.cityIconMaxScale,2.20));
    const cityScale=clamp(finite(snap.zoomRatio,1),cityMinScale,cityMaxScale);
    const cityExtraY=cityBasePx*(cityScale-1);
    const compositeLiftY=global.SAMGUK_REGION_COMPOSITE_UI?.liftForZoom
      ? global.SAMGUK_REGION_COMPOSITE_UI.liftForZoom(finite(snap.zoomRatio,1),{cityBasePx,cityScale,hasCity:true})
      : 0;
    const cityUi=global.SAMGUK_CITY_SPRITES;

    for(let i=0;i<territories.length;i++){
      const region=territories[i];
      if(!region||!runtime.isActiveTerritory(i))continue;
      // v88: 지도는 전부 보이되 병력 라벨만 자국/동맹 또는 접경 2칸 이내에서 그린다.
      const canSeeTroops=global.SAMGUK_VISIBILITY?.canSeeTroopLabel?.(i)??true;
      if(!canSeeTroops)continue;
      const faction=runtime.getFaction(Number(region.owner));
      if(!faction||!hasFaction(faction))continue;
      const center=runtime.getCenter(i,region);
      if(!center||!Number.isFinite(Number(center.x))||!Number.isFinite(Number(center.y)))continue;
      let x=offsetX+(Number(center.x)-vx)*ppu;
      let hudOffset=finite(runtime.getHudOffset(i,region),0);
      if(cityUi?.visibleFor?.(i,labelMetrics)){
        // Mirror the SVG composite lift on the separate sprite canvas.
        // Compact/full-map mode keeps its legacy placement; detailed zoom mode
        // gets city growth minus the shared upward lift.
        hudOffset+=labelMetrics?.compact?cityExtraY*.5:(cityExtraY-compositeLiftY);
      }
      let y=offsetY+(Number(center.y)-vy)*ppu+hudOffset;
      if(x<-margin||x>state.cssWidth+margin||y<-margin||y>state.cssHeight+margin)continue;
      if(drawFactionLabelFromSheet(ctx,x,y,faction,region.troops,hudState))state.lastDrawCount+=1;
    }
    return true;
  }

  function scheduleDraw(_reason='update'){
    if(state.raf)return state.raf;
    state.raf=requestAnimationFrame(draw);
    return state.raf;
  }

  function invalidateTerritory(_id){
    scheduleDraw('territory-dirty');
    return true;
  }

  function getDebugState(){
    return Object.freeze({
      imageReady:state.imageReady,
      imageFailed:state.imageFailed,
      loadCount:state.loadCount,
      lastDrawCount:state.lastDrawCount,
      source:SHEET_SRC,
      canvasSize:[state.cssWidth,state.cssHeight],
      dpr:state.dpr
    });
  }

  const controller=Object.freeze({
    version:2,
    source:SHEET_SRC,
    layout:LAYOUT,
    sprites:SPRITES,
    aliases:ALIASES,
    preload,
    configureRuntime,
    hasFaction,
    factionKey,
    spriteFor,
    drawFactionLabelFromSheet,
    drawTransparentTroopLabel,
    scheduleDraw,
    invalidateTerritory,
    isReady:()=>state.imageReady,
    isFailed:()=>state.imageFailed,
    getDebugState
  });

  global.SAMGUK_FACTION_LABEL_SPRITE=controller;
  global.drawFactionLabelFromSheet=drawFactionLabelFromSheet;

  // Start the single pre-load immediately; errors are handled by SVG fallback.
  preload().catch(()=>{});
  const boot=()=>{ensureCanvas();scheduleDraw('boot')};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})(window);
