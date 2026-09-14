(function(global){
  'use strict';

  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const PATH_NUMBER_RE=/-?\d+(?:\.\d+)?/g;

  // v126: expanded physical world bounds + original-atlas camera reference.
  // This separation prevents new east/south polygons from shrinking the whole
  // Korean/Manchurian atlas at startup.
  class WorldMapBoundsController{
    constructor(){this._cached=null;this._referenceCached=null;this._cssSynced=false}

    _cfg(){
      const cfg=global.SAMGUK_MAP_ZOOM_CONFIG||{};
      let minZoom=finite(cfg.minZoom,.5),maxZoom=finite(cfg.maxZoom,15.0);
      if(minZoom<=0)minZoom=.5;if(maxZoom<=0)maxZoom=15.0;if(minZoom>maxZoom)[minZoom,maxZoom]=[maxZoom,minZoom];
      return {minZoom,maxZoom,defaultZoom:clamp(finite(cfg.defaultZoom,1),minZoom,maxZoom)};
    }

    _includePath(path,box){
      if(typeof path!=='string'||!path)return;
      const nums=(path.match(PATH_NUMBER_RE)||[]).map(Number);
      for(let i=0;i+1<nums.length;i+=2){
        const x=nums[i],y=nums[i+1];if(!Number.isFinite(x)||!Number.isFinite(y))continue;
        box.minX=Math.min(box.minX,x);box.maxX=Math.max(box.maxX,x);box.minY=Math.min(box.minY,y);box.maxY=Math.max(box.maxY,y);
      }
    }

    _boxToBounds(box,fallbackWorld){
      if(!Number.isFinite(box.minX)||!Number.isFinite(box.maxX)||box.maxX<=box.minX){
        const x=finite(fallbackWorld?.minX,0),y=finite(fallbackWorld?.minY,0);
        const w=Math.max(1,finite(fallbackWorld?.width,1150)),h=Math.max(1,finite(fallbackWorld?.height,1146));
        return {x,y,w,h,right:x+w,bottom:y+h};
      }
      const strokePad=.75,x=box.minX-strokePad,y=box.minY-strokePad,right=box.maxX+strokePad,bottom=box.maxY+strokePad;
      return {x,y,w:right-x,h:bottom-y,right,bottom};
    }

    _geometryBounds(){
      const box={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity},world=global.SAMGUK_WORLD||{};
      this._includePath(world.landPath,box);
      for(const t of world.territories||[])this._includePath(t?.path,box);
      return this._boxToBounds(box,world);
    }

    _referenceGeometryBounds(){
      const box={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity},world=global.SAMGUK_WORLD||{};
      // Only the pre-expansion atlas contributes to default camera scale.
      for(const t of world.territories||[]){
        if(t?.mapExpansion==='v125'||t?.mapExpansion==='v126')continue;
        this._includePath(t?.path,box);
      }
      // Fallback to the known base silhouette if available.
      if(!Number.isFinite(box.minX))this._includePath(world.baseLandPath,box);
      return this._boxToBounds(box,{minX:-180.5,minY:-.5,width:1150.75,height:1146.75});
    }

    bounds({refresh=false}={}){if(refresh||!this._cached)this._cached=Object.freeze(this._geometryBounds());this._syncCssAspect();return this._cached}
    referenceBounds({refresh=false}={}){if(refresh||!this._referenceCached)this._referenceCached=Object.freeze(this._referenceGeometryBounds());return this._referenceCached}
    invalidate(){this._cached=null;this._referenceCached=null;this._cssSynced=false;this.bounds({refresh:true});return this.referenceBounds({refresh:true})}

    _syncCssAspect(){
      if(this._cssSynced||!global.document?.documentElement)return;
      const r=this.referenceBounds(),b=this._cached||this.bounds();
      // UI viewport keeps the legacy atlas aspect; physical clip/pan still uses b.
      global.document.documentElement.style.setProperty('--samguk-world-aspect',String(r.w/Math.max(1e-6,r.h)));
      global.document.documentElement.style.setProperty('--samguk-world-width',String(b.w));
      global.document.documentElement.style.setProperty('--samguk-world-height',String(b.h));
      this._cssSynced=true;
    }

    fullView(){const r=this.referenceBounds();return [r.x,r.y,r.w,r.h]}

    zoomLevel(view){
      const r=this.referenceBounds();
      if(!Array.isArray(view)||view.length!==4)return this._cfg().defaultZoom;
      const w=finite(view[2],NaN),h=finite(view[3],NaN);if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)return this._cfg().defaultZoom;
      return Math.min(r.w/w,r.h/h);
    }

    clampZoom(zoom){const {minZoom,maxZoom,defaultZoom}=this._cfg();return clamp(finite(zoom,defaultZoom),minZoom,maxZoom)}

    _panCfg(){
      const c=global.SAMGUK_MAP_PAN_CONFIG||{};
      return {westRatio:Math.max(0,finite(c.westPaddingRatio,.08)),eastRatio:Math.max(0,finite(c.eastPaddingRatio,.08)),northRatio:Math.max(0,finite(c.northPaddingRatio,.08)),southRatio:Math.max(0,finite(c.southPaddingRatio,.30)),minH:Math.max(0,finite(c.minHorizontalPaddingWorld,36)),maxH:Math.max(0,finite(c.maxHorizontalPaddingWorld,120)),minN:Math.max(0,finite(c.minNorthPaddingWorld,32)),maxN:Math.max(0,finite(c.maxNorthPaddingWorld,96)),minS:Math.max(0,finite(c.minSouthPaddingWorld,88)),maxS:Math.max(0,finite(c.maxSouthPaddingWorld,220)),centerWhenContained:c.centerWhenViewContainsWorld!==false};
    }
    _pad(size,ratio,min,max){const raw=Math.max(min,size*ratio);return Math.min(Math.max(min,max),raw)}

    panLimits(view){
      const b=this.bounds(),safe=Array.isArray(view)&&view.length===4?view.map(Number):this.fullView();
      const w=Math.max(1e-6,finite(safe[2],b.w)),h=Math.max(1e-6,finite(safe[3],b.h)),c=this._panCfg();
      const west=this._pad(w,c.westRatio,c.minH,c.maxH),east=this._pad(w,c.eastRatio,c.minH,c.maxH),north=this._pad(h,c.northRatio,c.minN,c.maxN),south=this._pad(h,c.southRatio,c.minS,c.maxS);
      return Object.freeze({minX:b.x-west,maxX:b.right-w+east,minY:b.y-north,maxY:b.bottom-h+south,west,east,north,south,world:b,viewWidth:w,viewHeight:h});
    }

    _clampAxisPadded(start,size,min,sizeOfWorld,before,after,centerWhenContained=true){
      if(size>=sizeOfWorld-1e-6&&centerWhenContained)return min+(sizeOfWorld-size)/2;
      let lo=min-before,hi=min+sizeOfWorld-size+after;if(hi<lo){const center=min+(sizeOfWorld-size)/2;lo=hi=center}return clamp(start,lo,hi);
    }

    clampView(view){
      const b=this.bounds();if(!Array.isArray(view)||view.length!==4)return this.viewForZoom(this._cfg().defaultZoom);
      let [x,y,w,h]=view.map(Number);if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)return this.viewForZoom(this._cfg().defaultZoom);
      const centerX=x+w/2,centerY=y+h/2;let zoom=this.zoomLevel([x,y,w,h]),safeZoom=this.clampZoom(zoom);
      if(!Number.isFinite(zoom)||zoom<=0)return this.viewForZoom(this._cfg().defaultZoom);
      if(Math.abs(safeZoom-zoom)>1e-12){const scale=zoom/safeZoom;w*=scale;h*=scale;x=centerX-w/2;y=centerY-h/2;zoom=safeZoom}
      const pc=this._panCfg(),limits=this.panLimits([x,y,w,h]);
      x=this._clampAxisPadded(x,w,b.x,b.w,limits.west,limits.east,pc.centerWhenContained);
      y=this._clampAxisPadded(y,h,b.y,b.h,limits.north,limits.south,pc.centerWhenContained);
      return [x,y,w,h];
    }

    viewForZoom(zoom,center=null){
      const r=this.referenceBounds(),z=this.clampZoom(zoom),cx=Number.isFinite(center?.[0])?Number(center[0]):r.x+r.w/2,cy=Number.isFinite(center?.[1])?Number(center[1]):r.y+r.h/2;
      const w=r.w/z,h=r.h/z;return this.clampView([cx-w/2,cy-h/2,w,h]);
    }

    zoomViewByFactor(view,factor,anchor=null){
      const safe=this.clampView(view),safeFactor=finite(factor,1);if(!Number.isFinite(safeFactor)||safeFactor<=0)return safe;
      const currentZoom=this.zoomLevel(safe),targetZoom=this.clampZoom(currentZoom/safeFactor);if(!Number.isFinite(targetZoom)||targetZoom<=0)return this.viewForZoom(this._cfg().defaultZoom);
      const actualScale=currentZoom/targetZoom,[x,y,w,h]=safe,p=(Array.isArray(anchor)&&Number.isFinite(anchor[0])&&Number.isFinite(anchor[1]))?[Number(anchor[0]),Number(anchor[1])]:[x+w/2,y+h/2],nw=w*actualScale,nh=h*actualScale;
      return this.clampView([p[0]-(p[0]-x)*actualScale,p[1]-(p[1]-y)*actualScale,nw,nh]);
    }

    centerView(width,height){
      const r=this.referenceBounds();
      if(Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0)return this.clampView([r.x+(r.w-width)/2,r.y+(r.h-height)/2,width,height]);
      return this.viewForZoom(this._cfg().defaultZoom);
    }

    centerMap(){
      const view=this.viewForZoom(this._cfg().defaultZoom);
      if(global.SAMGUK_MAP_CAMERA_API?.commitView)global.SAMGUK_MAP_CAMERA_API.commitView(view);
      else if(global.SAMGUK_GPU_MAP_CAMERA?.setView)global.SAMGUK_GPU_MAP_CAMERA.setView(view,{immediate:true});
      return view;
    }
  }

  global.WorldMapBoundsController=WorldMapBoundsController;
  global.SAMGUK_WORLD_MAP_BOUNDS=new WorldMapBoundsController();
  let initialCenterDone=false;
  document.addEventListener('samguk:map-rendered',()=>{if(initialCenterDone)return;initialCenterDone=true;requestAnimationFrame(()=>requestAnimationFrame(()=>global.SAMGUK_WORLD_MAP_BOUNDS.centerMap()))});
})(window);
