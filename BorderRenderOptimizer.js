(function(global){
  'use strict';

  /**
   * v56 — border/river render optimizer
   *
   * The live game uses SVG, not a per-frame Canvas border renderer. SVG
   * vector-effect="non-scaling-stroke" is therefore the cheapest equivalent
   * of Canvas `lineWidth = screenPx / zoom`: the browser keeps the visible
   * stroke width stable when the final viewBox is committed.
   *
   * During smooth zoom the existing GPU camera intentionally composites a
   * cached SVG layer with CSS transforms. We do NOT mutate every stroke each
   * animation frame because that would invalidate the compositor cache and
   * bring the zoom hitch back. LOD geometry is swapped only after a sharp
   * camera commit (or a full map redraw).
   */

  const CFG=Object.freeze({
    // Zoom ratio: 1 = whole atlas. Lower values are farther zoomed out.
    ultraMax:.70,
    lowMax:1.25,
    mediumMax:2.25,

    // Douglas-Peucker tolerances in world units.
    ultraTolerance:3.0,
    lowTolerance:1.5,
    mediumTolerance:.75,

    // Final on-screen widths. `non-scaling-stroke` keeps these stable for
    // viewBox zoom without per-frame JavaScript work.
    nationalOuterPx:2.0,
    nationalInnerPx:.72,
    provincePx:.58,
    selectionPx:2.0,
    riverPx:.72,
    greatWallOuterPx:2.2,
    greatWallInnerPx:1.15
  });

  const cache=new Map();
  let currentZoom=1;
  let currentBucket='low';
  let prepared=false;
  let scheduled=0;

  const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));

  function zoomBucket(zoom){
    const z=Math.max(.01,finite(zoom,1));
    if(z<=CFG.ultraMax)return 'ultra';
    if(z<=CFG.lowMax)return 'low';
    if(z<=CFG.mediumMax)return 'medium';
    return 'full';
  }

  function bucketTolerance(bucket){
    if(bucket==='ultra')return CFG.ultraTolerance;
    if(bucket==='low')return CFG.lowTolerance;
    if(bucket==='medium')return CFG.mediumTolerance;
    return 0;
  }

  function parseMlPath(path){
    if(typeof path!=='string'||!path)return [];
    const tokens=path.match(/[ML]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g)||[];
    const groups=[];
    let i=0,group=null;
    while(i<tokens.length){
      const token=tokens[i++];
      if(token==='M'||token==='L'){
        const x=Number(tokens[i++]),y=Number(tokens[i++]);
        if(!Number.isFinite(x)||!Number.isFinite(y))continue;
        if(token==='M'||!group){
          group=[];
          groups.push(group);
        }
        group.push([x,y]);
      }
    }
    return groups.filter(g=>g.length);
  }

  function distanceToSegment(p,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1];
    if(dx===0&&dy===0)return Math.hypot(p[0]-a[0],p[1]-a[1]);
    const t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy),0,1);
    const x=a[0]+t*dx,y=a[1]+t*dy;
    return Math.hypot(p[0]-x,p[1]-y);
  }

  function simplifyDouglasPeucker(points,epsilon){
    const n=points?.length||0;
    if(n<=2||epsilon<=0)return points?points.slice():[];
    const first=points[0],last=points[n-1];
    let index=-1,maxDistance=-1;
    for(let i=1;i<n-1;i++){
      const d=distanceToSegment(points[i],first,last);
      if(d>maxDistance){maxDistance=d;index=i;}
    }
    if(maxDistance>epsilon&&index>0){
      const left=simplifyDouglasPeucker(points.slice(0,index+1),epsilon);
      const right=simplifyDouglasPeucker(points.slice(index),epsilon);
      return left.slice(0,-1).concat(right);
    }
    return [first,last];
  }

  function numberString(value){
    const n=Math.round(Number(value)*100)/100;
    return Number.isInteger(n)?String(n):String(n);
  }

  function groupsToPath(groups){
    return groups.map(group=>{
      if(!group.length)return '';
      let out=`M${numberString(group[0][0])},${numberString(group[0][1])}`;
      for(let i=1;i<group.length;i++)out+=`L${numberString(group[i][0])},${numberString(group[i][1])}`;
      return out;
    }).join('');
  }

  function buildEntry(index,source){
    const groups=parseMlPath(source);
    const make=eps=>eps<=0?source:groupsToPath(groups.map(g=>simplifyDouglasPeucker(g,eps)));
    const entry={
      source,
      full:source,
      medium:make(CFG.mediumTolerance),
      low:make(CFG.lowTolerance),
      ultra:make(CFG.ultraTolerance)
    };
    cache.set(index,entry);
    return entry;
  }

  function prepare(){
    if(prepared)return true;
    const borders=global.SAMGUK_WORLD?.borders||global.WORLD?.borders||[];
    for(let i=0;i<borders.length;i++)buildEntry(i,borders[i]?.path||'');
    prepared=true;
    return true;
  }

  function pathForBorder(index,source,zoom=currentZoom){
    prepare();
    const key=Number(index);
    let entry=cache.get(key);
    if(!entry||entry.source!==source)entry=buildEntry(key,source||'');
    const bucket=zoomBucket(zoom);
    return entry?.[bucket]||source||'';
  }

  function currentCameraZoom(){
    const snap=global.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.();
    if(Number.isFinite(Number(snap?.zoomRatio)))return Number(snap.zoomRatio);
    const api=global.SAMGUK_MAP_CAMERA_API;
    const z=api?.getZoomLevel?.(api?.getView?.());
    return Number.isFinite(Number(z))?Number(z):1;
  }

  function styleRootForBucket(bucket){
    const map=document.getElementById('map');
    if(!map)return false;
    map.dataset.borderLod=bucket;
    map.classList.toggle('border-lod-ultra',bucket==='ultra');
    map.classList.toggle('border-lod-low',bucket==='low');
    map.classList.toggle('border-lod-medium',bucket==='medium');
    map.classList.toggle('border-lod-full',bucket==='full');
    map.style.setProperty('--national-border-outer',String(CFG.nationalOuterPx));
    map.style.setProperty('--national-border-inner',String(CFG.nationalInnerPx));
    map.style.setProperty('--province-border-width',String(CFG.provincePx));
    map.style.setProperty('--selection-border-width',String(CFG.selectionPx));
    map.style.setProperty('--river-border-width',String(CFG.riverPx));
    map.style.setProperty('--great-wall-outer-width',String(CFG.greatWallOuterPx));
    map.style.setProperty('--great-wall-inner-width',String(CFG.greatWallInnerPx));
    return true;
  }

  function applyLod(zoom,{force=false}={}){
    prepare();
    const z=Math.max(.01,finite(zoom,currentCameraZoom()));
    const bucket=zoomBucket(z);
    currentZoom=z;
    const bucketChanged=bucket!==currentBucket;
    currentBucket=bucket;
    styleRootForBucket(bucket);
    if(!force&&!bucketChanged)return false;

    const borders=global.SAMGUK_WORLD?.borders||global.WORLD?.borders||[];
    // One DOM pass only when a LOD threshold changes. Never per animation frame.
    document.querySelectorAll('#boundary-layer [data-border-index], #great-wall-defense-line [data-border-index]').forEach(path=>{
      const index=Number(path.dataset.borderIndex);
      const border=borders[index];
      if(!Number.isInteger(index)||!border?.path)return;
      const d=pathForBorder(index,border.path,z);
      if(path.getAttribute('d')!==d)path.setAttribute('d',d);
    });

    const perf=global.__perfDebug=global.__perfDebug||{};
    perf.borderLodUpdates=(perf.borderLodUpdates||0)+1;
    perf.borderLodBucket=bucket;
    perf.borderZoom=z;
    return true;
  }

  function scheduleLod(zoom,force=false){
    if(scheduled)cancelAnimationFrame(scheduled);
    scheduled=requestAnimationFrame(()=>{
      scheduled=0;
      applyLod(zoom,{force});
    });
  }

  function onViewChanged(event){
    const camera=event?.detail?.camera;
    const z=finite(camera?.zoomRatio,currentCameraZoom());
    currentZoom=z;
    // Existing GPU camera uses CSS transform while the gesture is active.
    // Mutating path data at that point would invalidate the cached texture and
    // cause the exact zoom lag this patch is meant to remove. Wait for sharp.
    if(camera&&camera.renderMode&&camera.renderMode!=='sharp')return;
    scheduleLod(z,false);
  }

  function onMapRendered(){
    scheduleLod(currentCameraZoom(),true);
  }

  function onMapStateUpdated(event){
    if(event?.detail?.ownerChanged||event?.detail?.selectionChanged) scheduleLod(currentCameraZoom(),true);
  }

  document.addEventListener('samguk:map-view-changed',onViewChanged,{passive:true});
  document.addEventListener('samguk:map-rendered',onMapRendered,{passive:true});
  document.addEventListener('samguk:map-state-updated',onMapStateUpdated,{passive:true});

  // Precompute all 224 shared borders once. This avoids a first-zoom hitch.
  prepare();

  // -----------------------------------------------------------------------
  // Canvas reference API requested by the patch specification.
  // The current game does not call this path because its world map is SVG.
  // -----------------------------------------------------------------------

  function screenConstantLineWidth(screenPx,currentZoomValue){
    return Math.max(.05,finite(screenPx,2)/Math.max(.0001,finite(currentZoomValue,1)));
  }

  function regionPoints(region){
    if(Array.isArray(region?.points))return region.points;
    if(Array.isArray(region?.vertices))return region.vertices;
    return [];
  }

  function canvasTracePolygon(ctx,points){
    if(!ctx||!points?.length)return false;
    const p0=points[0];
    ctx.moveTo(Number(p0.x??p0[0]),Number(p0.y??p0[1]));
    for(let i=1;i<points.length;i++){
      const p=points[i];
      ctx.lineTo(Number(p.x??p[0]),Number(p.y??p[1]));
    }
    ctx.closePath();
    return true;
  }

  /**
   * Canvas version: with ctx.scale(currentZoom,currentZoom) already active,
   * use inverse zoom to hold a constant 2px screen-space outline.
   */
  function drawCountryBorders(ctx,regions,currentZoomValue,{screenPx=2,strokeStyle='#142936'}={}){
    if(!ctx||!Array.isArray(regions))return;
    const z=Math.max(.0001,finite(currentZoomValue,1));
    const far=z<.72,epsilon=far?3:z<1.25?1.5:z<2.25?.75:0;
    ctx.save();
    ctx.lineWidth=screenConstantLineWidth(screenPx,z);
    ctx.strokeStyle=strokeStyle;
    ctx.lineJoin='round';
    ctx.lineCap='round';
    for(const region of regions){
      let points=regionPoints(region);
      if(points.length<2)continue;
      if(epsilon>0){
        const normalized=points.map(p=>[Number(p.x??p[0]),Number(p.y??p[1])]);
        points=simplifyDouglasPeucker(normalized,epsilon);
      }
      ctx.beginPath();
      canvasTracePolygon(ctx,points);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Optional Canvas offscreen cache example. Use only for a Canvas renderer.
   * SVG game path intentionally relies on browser/GPU compositing instead.
   */
  class CanvasBorderCache{
    constructor(){this.canvas=null;this.ctx=null;this.key='';}
    _ensure(width,height){
      const w=Math.max(1,Math.ceil(width)),h=Math.max(1,Math.ceil(height));
      if(!this.canvas){
        this.canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');
        this.ctx=this.canvas.getContext('2d');
      }
      if(this.canvas.width!==w)this.canvas.width=w;
      if(this.canvas.height!==h)this.canvas.height=h;
      return this.ctx;
    }
    rebuild({width,height,regions,zoom,version=0,screenPx=2}={}){
      const bucket=zoomBucket(zoom);
      const key=[Math.ceil(width),Math.ceil(height),bucket,version,screenPx].join(':');
      if(key===this.key&&this.canvas)return this.canvas;
      const ctx=this._ensure(width,height);
      if(!ctx)return null;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      ctx.save();
      ctx.scale(zoom,zoom);
      drawCountryBorders(ctx,regions,zoom,{screenPx});
      ctx.restore();
      this.key=key;
      return this.canvas;
    }
    drawTo(ctx,dx=0,dy=0){if(ctx&&this.canvas)ctx.drawImage(this.canvas,dx,dy);}
    invalidate(){this.key='';}
  }

  global.SAMGUK_BORDER_OPTIMIZER={
    version:56,
    config:CFG,
    prepare,
    zoomBucket,
    pathForBorder,
    applyLod,
    getZoom:()=>currentZoom,
    getBucket:()=>currentBucket,
    simplifyDouglasPeucker,
    screenConstantLineWidth,
    drawCountryBorders,
    CanvasBorderCache
  };

  // Generic name requested in the prompt, exposed without changing game logic.
  if(typeof global.drawCountryBorders!=='function')global.drawCountryBorders=drawCountryBorders;
})(window);
