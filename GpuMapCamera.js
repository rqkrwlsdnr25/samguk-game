(function(global){
  'use strict';

  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;

  /**
   * v51 Hybrid Sharp GPU Map Camera
   * --------------------------------
   * 원인:
   * - 계속 유지되는 matrix3d + will-change:transform 조합은 Chrome이 SVG 전체를
   *   하나의 래스터 합성 텍스처로 캐시하게 만들 수 있다.
   * - 확대 후에도 그 저해상도 텍스처가 재사용되면 벡터 경계/텍스트/PNG가 함께 흐려진다.
   * - territory :hover의 filter/fill 변경은 paint invalidation을 일으켜 잠깐 다시
   *   래스터화하므로 "마우스를 올리면 잠깐 선명해짐" 현상이 발생한다.
   *
   * 해결:
   * 1) 카메라가 움직이는 동안만 GPU matrix3d compositor를 사용한다.
   * 2) 줌/드래그가 멈추면 현재 view를 SVG viewBox에 직접 commit한다.
   * 3) commit 후 CSS transform을 제거하여 브라우저가 최종 배율에서 SVG를 다시 그린다.
   * 4) 다음 이동 시작 시 full-world viewBox + matrix3d 모드로 원자적으로 복귀한다.
   */
  class GpuMapCamera{
    constructor(options={}){
      this.viewportId=options.viewportId||'mapViewport';
      this.worldId=options.worldId||'map';
      this.uiId=options.uiId||'mapUiOverlay';
      this._base=null;
      this._baseKey='';
      this._view=null;
      this._snapshot=null;
      this._viewport=null;
      this._world=null;
      this._ui=null;
      this._width=1;
      this._height=1;
      this._rectLeft=0;
      this._rectTop=0;
      this._pending=null;
      this._raf=0;
      this._bound=false;
      this._resizeObserver=null;
      this._lastMatrix='';
      this._sharpCommitted=false;
      this._resizeHandler=()=>this._cacheViewportRect();
    }

    _resolve(){
      this._viewport=document.getElementById(this.viewportId);
      this._world=document.getElementById(this.worldId);
      this._ui=document.getElementById(this.uiId);
      return !!(this._viewport&&this._world&&this._ui);
    }

    _worldBounds(){
      const bounds=global.SAMGUK_WORLD_MAP_BOUNDS?.bounds?.();
      if(bounds)return [bounds.x,bounds.y,bounds.w,bounds.h];
      const world=global.SAMGUK_WORLD||{};
      const w=Math.max(1e-6,finite(world.width,1150));
      const h=Math.max(1e-6,finite(world.height,1146));
      return [finite(world.minX,0),finite(world.minY,0),w,h];
    }

    _safeView(view){
      const clamped=global.SAMGUK_WORLD_MAP_BOUNDS?.clampView?.(view);
      return Array.isArray(clamped)?clamped:view;
    }

    _mappingForView(view){
      const v=this._safeView(view);
      if(!Array.isArray(v)||v.length!==4)return null;
      const [x,y,w,h]=v.map(Number);
      if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)return null;
      const ppu=Math.max(1e-6,Math.min(this._width/w,this._height/h));
      const offsetX=(this._width-w*ppu)/2;
      const offsetY=(this._height-h*ppu)/2;
      return {view:[x,y,w,h],ppu,offsetX,offsetY};
    }

    _baseMetrics(){
      const [bx,by,bw,bh]=this._base||this._worldBounds();
      const basePpu=Math.max(1e-6,Math.min(this._width/bw,this._height/bh));
      const baseContentW=bw*basePpu,baseContentH=bh*basePpu;
      return {
        bx,by,bw,bh,basePpu,
        baseOffsetX:(this._width-baseContentW)/2,
        baseOffsetY:(this._height-baseContentH)/2
      };
    }

    _setLayerMode(mode){
      if(!this._viewport)return;
      const moving=mode==='composite';
      this._viewport.classList.toggle('is-camera-compositing',moving);
      this._viewport.classList.toggle('is-camera-sharp',!moving);
      this._viewport.dataset.cameraRenderMode=moving?'composite':'sharp';
    }

    _restoreCompositeBase(){
      if(!this._world||!this._ui)return;
      const base=this._base||this._worldBounds();
      const vb=base.join(' ');
      if(this._world.getAttribute('viewBox')!==vb)this._world.setAttribute('viewBox',vb);
      if(this._ui.getAttribute('viewBox')!==vb)this._ui.setAttribute('viewBox',vb);
      this._sharpCommitted=false;
      this._setLayerMode('composite');
    }

    _updateUiAndSnapshot(view,{scale,tx,ty,matrix,dispatch=true}={}){
      const targetMapping=this._mappingForView(view);
      if(!targetMapping)return false;
      const {bx,by,bw,bh,basePpu,baseOffsetX,baseOffsetY}=this._baseMetrics();
      const targetPpu=targetMapping.ppu;
      const logicalScale=targetPpu/basePpu;
      const zoomRatio=finite(
        global.SAMGUK_WORLD_MAP_BOUNDS?.zoomLevel?.(view),
        bw/Math.max(1e-6,view[2])
      );

      const finalScale=Number.isFinite(Number(scale))?Number(scale):logicalScale;
      const finalTx=Number.isFinite(Number(tx))?Number(tx):0;
      const finalTy=Number.isFinite(Number(ty))?Number(ty):0;

      this._snapshot=Object.freeze({
        view:[...view],
        base:[bx,by,bw,bh],
        scaleX:finalScale,
        scaleY:finalScale,
        translateX:finalTx,
        translateY:finalTy,
        width:this._width,
        height:this._height,
        basePixelsPerWorldUnit:basePpu,
        baseContentOffsetX:baseOffsetX,
        baseContentOffsetY:baseOffsetY,
        contentOffsetX:targetMapping.offsetX,
        contentOffsetY:targetMapping.offsetY,
        pixelsPerWorldUnit:targetPpu,
        worldUnitsPerPixel:1/targetPpu,
        zoomRatio,
        matrix:matrix||'none',
        renderMode:this._sharpCommitted?'sharp':'composite'
      });

      const zoomCfg=global.SAMGUK_MAP_ZOOM_CONFIG||{};
      const hudStart=Math.max(1,finite(zoomCfg.highZoomHudStart,1.45));
      const hudMax=Math.max(.92,finite(zoomCfg.highZoomHudMaxScale,1.42));
      const labelMax=Math.max(1,finite(zoomCfg.highZoomLabelMaxScale,1.28));
      // v57: extending MAX_ZOOM must not weaken the existing HUD/detail scale curve.
      // Keep that curve saturated at the old high-detail range while camera zoom can
      // continue much deeper independently.
      const detailEnd=Math.max(hudStart+.001,finite(zoomCfg.highZoomDetailEnd,6.0));
      const detailT=clamp((zoomRatio-hudStart)/(detailEnd-hudStart),0,1);
      const detailEase=1-Math.pow(1-detailT,1.35);
      const factionHudScale=clamp(.92+(hudMax-.92)*detailEase,.86,hudMax);
      const labelZoomScale=clamp(1+(labelMax-1)*detailEase,1,labelMax);

      // Large atlas/faction names only.  This alpha is inherited by #atlas-labels;
      // territory names, troop HUDs, capitals and city sprites live outside that group.
      const fadeStart=finite(zoomCfg.largeCountryNameFadeStart,1.25);
      const fadeEnd=Math.max(fadeStart+.001,finite(zoomCfg.largeCountryNameFadeEnd,2.40));
      const largeCountryNameAlpha=global.SAMGUK_LARGE_COUNTRY_NAME_FADE?.alphaForZoom
        ? global.SAMGUK_LARGE_COUNTRY_NAME_FADE.alphaForZoom(zoomRatio,fadeStart,fadeEnd)
        : clamp(1-(zoomRatio-fadeStart)/(fadeEnd-fadeStart),0,1);

      // v59 — all city art shares one base box, then follows camera zoom through
      // one CSS scalar. No per-city width/height writes happen during wheel RAF.
      const cityBasePx=clamp(finite(zoomCfg.cityIconBaseSize,40),20,96);
      const cityMinScale=clamp(finite(zoomCfg.cityIconMinScale,.55),.25,1);
      const cityMaxScale=Math.max(1,finite(zoomCfg.cityIconMaxScale,2.20));
      const cityIconScale=clamp(zoomRatio,cityMinScale,cityMaxScale);
      const cityIconExtraY=cityBasePx*(cityIconScale-1);
      // v68 — island capitals/cities (Tamra, Usan, Tsushima) use a 50% base box.
      // Their visual-growth offsets must also use that smaller box; otherwise the
      // icon shrinks but resource/troop labels keep drifting down as if it were 40px.
      const islandCityBasePx=cityBasePx*.5;
      const islandCityExtraY=islandCityBasePx*(cityIconScale-1);
      const islandRegionCompositeLiftY=global.SAMGUK_REGION_COMPOSITE_UI?.liftForZoom
        ? global.SAMGUK_REGION_COMPOSITE_UI.liftForZoom(zoomRatio,{cityBasePx:islandCityBasePx,cityScale:cityIconScale,hasCity:true})
        : clamp(islandCityExtraY,0,48);
      // v63: advanced capital sprites have their own rectangular base boxes.  Their
      // zoom growth is exposed as CSS variables so child resource/troop HUDs can
      // stay attached to the bottom edge without per-territory DOM writes.
      const capitalLv3Box=global.SAMGUK_CAPITAL_UPGRADE?.baseDimensionsForLevel?.(3)||{width:58,height:58};
      const capitalLv5Box=global.SAMGUK_CAPITAL_UPGRADE?.baseDimensionsForLevel?.(5)||{width:84,height:48};
      const capitalLv3ExtraY=Math.max(0,(Number(capitalLv3Box.height)||58)*(cityIconScale-1));
      const capitalLv5ExtraY=Math.max(0,(Number(capitalLv5Box.height)||48)*(cityIconScale-1));
      const islandCapitalLv3ExtraY=capitalLv3ExtraY*.5;
      const islandCapitalLv5ExtraY=capitalLv5ExtraY*.5;
      // v61: keep the whole [name -> city -> resource -> troop] composite centered
      // around the territory anchor as city art grows.  This is one global screen-
      // pixel scalar written per camera frame; no per-territory DOM writes occur.
      const regionCompositeLiftY=global.SAMGUK_REGION_COMPOSITE_UI?.liftForZoom
        ? global.SAMGUK_REGION_COMPOSITE_UI.liftForZoom(zoomRatio,{cityBasePx,cityScale:cityIconScale,hasCity:true})
        : clamp(cityIconExtraY,0,72);

      // Logical camera scale stays available to HUD systems even when the final
      // sharp mode uses viewBox instead of a CSS transform.
      this._viewport.style.setProperty('--map-camera-scale',String(logicalScale));
      this._viewport.style.setProperty('--faction-hud-scale',String(factionHudScale));
      this._ui.style.setProperty('--faction-hud-scale',String(factionHudScale));
      this._viewport.style.setProperty('--territory-label-zoom-scale',String(labelZoomScale));
      this._ui.style.setProperty('--territory-label-zoom-scale',String(labelZoomScale));
      this._viewport.style.setProperty('--large-country-name-opacity',String(largeCountryNameAlpha));
      this._viewport.style.setProperty('--city-icon-zoom-scale',String(cityIconScale));
      this._ui.style.setProperty('--city-icon-zoom-scale',String(cityIconScale));
      this._viewport.style.setProperty('--city-icon-extra-y',`${cityIconExtraY}px`);
      this._ui.style.setProperty('--city-icon-extra-y',`${cityIconExtraY}px`);
      this._viewport.style.setProperty('--city-icon-extra-half-y',`${cityIconExtraY*.5}px`);
      this._ui.style.setProperty('--city-icon-extra-half-y',`${cityIconExtraY*.5}px`);
      this._viewport.style.setProperty('--island-city-icon-extra-y',`${islandCityExtraY}px`);
      this._ui.style.setProperty('--island-city-icon-extra-y',`${islandCityExtraY}px`);
      this._viewport.style.setProperty('--island-city-icon-extra-half-y',`${islandCityExtraY*.5}px`);
      this._ui.style.setProperty('--island-city-icon-extra-half-y',`${islandCityExtraY*.5}px`);
      this._viewport.style.setProperty('--capital-lv3-extra-y',`${capitalLv3ExtraY}px`);
      this._ui.style.setProperty('--capital-lv3-extra-y',`${capitalLv3ExtraY}px`);
      this._viewport.style.setProperty('--capital-lv3-extra-half-y',`${capitalLv3ExtraY*.5}px`);
      this._ui.style.setProperty('--capital-lv3-extra-half-y',`${capitalLv3ExtraY*.5}px`);
      this._viewport.style.setProperty('--capital-lv5-extra-y',`${capitalLv5ExtraY}px`);
      this._ui.style.setProperty('--capital-lv5-extra-y',`${capitalLv5ExtraY}px`);
      this._viewport.style.setProperty('--capital-lv5-extra-half-y',`${capitalLv5ExtraY*.5}px`);
      this._ui.style.setProperty('--capital-lv5-extra-half-y',`${capitalLv5ExtraY*.5}px`);
      this._viewport.style.setProperty('--island-capital-lv3-extra-y',`${islandCapitalLv3ExtraY}px`);
      this._ui.style.setProperty('--island-capital-lv3-extra-y',`${islandCapitalLv3ExtraY}px`);
      this._viewport.style.setProperty('--island-capital-lv3-extra-half-y',`${islandCapitalLv3ExtraY*.5}px`);
      this._ui.style.setProperty('--island-capital-lv3-extra-half-y',`${islandCapitalLv3ExtraY*.5}px`);
      this._viewport.style.setProperty('--island-capital-lv5-extra-y',`${islandCapitalLv5ExtraY}px`);
      this._ui.style.setProperty('--island-capital-lv5-extra-y',`${islandCapitalLv5ExtraY}px`);
      this._viewport.style.setProperty('--island-capital-lv5-extra-half-y',`${islandCapitalLv5ExtraY*.5}px`);
      this._ui.style.setProperty('--island-capital-lv5-extra-half-y',`${islandCapitalLv5ExtraY*.5}px`);
      this._viewport.style.setProperty('--island-region-composite-offset-y',`${-islandRegionCompositeLiftY}px`);
      this._ui.style.setProperty('--island-region-composite-offset-y',`${-islandRegionCompositeLiftY}px`);
      this._viewport.style.setProperty('--region-composite-lift-y',`${regionCompositeLiftY}px`);
      this._ui.style.setProperty('--region-composite-lift-y',`${regionCompositeLiftY}px`);
      this._viewport.style.setProperty('--region-composite-offset-y',`${-regionCompositeLiftY}px`);
      this._ui.style.setProperty('--region-composite-offset-y',`${-regionCompositeLiftY}px`);
      this._viewport.style.setProperty('--map-ui-world-unit',String(1/targetPpu));
      this._ui.style.setProperty('--map-ui-world-unit',String(1/targetPpu));
      this._viewport.style.setProperty('--map-camera-tx',`${finalTx}px`);
      this._viewport.style.setProperty('--map-camera-ty',`${finalTy}px`);

      if(dispatch){
        document.dispatchEvent(new CustomEvent('samguk:map-view-changed',{
          detail:{view:[...view],camera:this._snapshot}
        }));
      }
      return true;
    }

    _cacheViewportRect(){
      if(!this._viewport)return;
      const r=this._viewport.getBoundingClientRect();
      this._width=Math.max(1,finite(r.width,this._viewport.clientWidth||1));
      this._height=Math.max(1,finite(r.height,this._viewport.clientHeight||1));
      this._rectLeft=finite(r.left,0);
      this._rectTop=finite(r.top,0);

      const latest=this._worldBounds(),key=latest.join('|');
      if(key!==this._baseKey){
        this._base=latest;
        this._baseKey=key;
      }

      if(this._view){
        if(this._sharpCommitted)this.commitSharp(this._view,{fromResize:true});
        else this._apply(this._view,true);
      }
    }

    init(){
      if(this._bound)return true;
      if(!this._resolve())return false;
      this._bound=true;
      this._base=this._worldBounds();
      this._baseKey=this._base.join('|');
      const vb=this._base.join(' ');
      this._world.setAttribute('viewBox',vb);
      this._ui.setAttribute('viewBox',vb);
      this._world.setAttribute('preserveAspectRatio','xMidYMid meet');
      this._ui.setAttribute('preserveAspectRatio','xMidYMid meet');
      this._setLayerMode('sharp');
      this._cacheViewportRect();

      if(typeof ResizeObserver==='function'){
        this._resizeObserver=new ResizeObserver(()=>this._cacheViewportRect());
        this._resizeObserver.observe(this._viewport);
      }
      global.addEventListener('resize',this._resizeHandler,{passive:true});
      return true;
    }

    destroy(){
      this._resizeObserver?.disconnect?.();
      global.removeEventListener?.('resize',this._resizeHandler);
      if(this._raf)cancelAnimationFrame(this._raf);
      this._raf=0;
      this._bound=false;
    }

    setView(view,{immediate=false,sharp=false}={}){
      if(!this._bound&&!this.init())return false;
      if(!Array.isArray(view)||view.length!==4)return false;
      const safe=this._safeView(view.map(Number));
      if(!Array.isArray(safe)||safe.some(v=>!Number.isFinite(v))||safe[2]<=0||safe[3]<=0)return false;

      this._pending=[...safe];

      if(immediate){
        this._pending=null;
        return sharp?this.commitSharp(safe):this._apply(safe,false);
      }

      if(!this._raf){
        this._raf=requestAnimationFrame(()=>{
          this._raf=0;
          const next=this._pending;
          this._pending=null;
          if(next)this._apply(next,false);
        });
      }
      return true;
    }

    _apply(rawView,fromResize){
      const view=this._safeView(rawView);
      if(!Array.isArray(view)||view.length!==4)return false;
      this._view=[...view];

      // Before the first transform of a new interaction, restore the full atlas
      // viewBox. Both roots are changed in the same JS task, before paint.
      this._restoreCompositeBase();

      const {bx,by,basePpu,baseOffsetX,baseOffsetY}=this._baseMetrics();
      const [x,y]=view;
      const targetMapping=this._mappingForView(view);
      if(!targetMapping)return false;

      const scale=clamp(targetMapping.ppu/basePpu,0.001,512);
      const baseViewLeft=baseOffsetX+(x-bx)*basePpu;
      const baseViewTop=baseOffsetY+(y-by)*basePpu;
      const tx=targetMapping.offsetX-baseViewLeft*scale;
      const ty=targetMapping.offsetY-baseViewTop*scale;
      const matrix=`matrix3d(${scale},0,0,0,0,${scale},0,0,0,0,1,0,${tx},${ty},0,1)`;

      if(matrix!==this._lastMatrix){
        this._world.style.transform=matrix;
        this._ui.style.transform=matrix;
        this._lastMatrix=matrix;
      }

      this._sharpCommitted=false;
      this._updateUiAndSnapshot(view,{scale,tx,ty,matrix,dispatch:!fromResize});
      return true;
    }

    commitSharp(rawView,{fromResize=false}={}){
      if(!this._bound&&!this.init())return false;
      const view=this._safeView(rawView);
      if(!Array.isArray(view)||view.length!==4||view.some(v=>!Number.isFinite(v))||view[2]<=0||view[3]<=0)return false;

      this._pending=null;
      this._view=[...view];
      this._sharpCommitted=true;

      // The key anti-blur step:
      // Render the final camera directly through SVG viewBox, not by magnifying a
      // compositor texture that was rasterized at an earlier zoom level.
      const vb=view.join(' ');
      this._world.setAttribute('viewBox',vb);
      this._ui.setAttribute('viewBox',vb);
      this._world.style.transform='none';
      this._ui.style.transform='none';
      this._lastMatrix='';
      this._setLayerMode('sharp');

      this._updateUiAndSnapshot(view,{
        scale:this._mappingForView(view)?.ppu/this._baseMetrics().basePpu,
        tx:0,
        ty:0,
        matrix:'none',
        dispatch:!fromResize
      });

      // One extra paint hint after the transform is removed. No forced layout.
      this._viewport.style.setProperty('--map-sharp-commit',String((performance?.now?.()||Date.now()).toFixed(2)));
      return true;
    }

    getSnapshot(){return this._snapshot}
    getView(){return this._view?[...this._view]:null}
    isSharpCommitted(){return !!this._sharpCommitted}

    centerMap(){
      const full=global.SAMGUK_WORLD_MAP_BOUNDS?.fullView?.()||this._worldBounds();
      this._pending=null;
      return this.commitSharp(full);
    }

    clientToWorld(clientX,clientY,viewOverride=null){
      const mapping=this._mappingForView(viewOverride||this._view||this._pending);
      if(!mapping)return null;
      const [x,y]=mapping.view,ppu=mapping.ppu;
      return [
        x+(finite(clientX,0)-this._rectLeft-mapping.offsetX)/ppu,
        y+(finite(clientY,0)-this._rectTop-mapping.offsetY)/ppu
      ];
    }

    screenDeltaToWorld(dx,dy,viewOverride=null){
      const mapping=this._mappingForView(viewOverride||this._view);
      if(!mapping)return [0,0];
      return [finite(dx,0)/mapping.ppu,finite(dy,0)/mapping.ppu];
    }
  }

  global.GpuMapCamera=GpuMapCamera;
  global.SAMGUK_GPU_MAP_CAMERA=new GpuMapCamera();

  const init=()=>global.SAMGUK_GPU_MAP_CAMERA.init();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})(window);
