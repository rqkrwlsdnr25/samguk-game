(function(global){
  'use strict';

  const DATA=global.SAMGUK_JAPAN_MAP_DATA_V132;
  if(!DATA||!DATA.mask)return;

  const state={canvas:null,ctx:null,land:null,sea:null,texture:null,ready:false,raf:0,dpr:1,offscreen:null,offCtx:null,seaCanvas:null,landAlpha:null,seaAlpha:null};
  const SEA_COLOR='#9ecbd0';
  const TEXTURE_ALPHA=.34;

  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.decoding='async';
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error(`failed to load ${src}`));
      img.src=src;
    });
  }

  function ensureCanvas(){
    const viewport=document.getElementById('mapViewport');
    if(!viewport)return null;
    let canvas=document.getElementById('japanTerrainMaskCanvas');
    if(!canvas){
      canvas=document.createElement('canvas');
      canvas.id='japanTerrainMaskCanvas';
      canvas.className='japan-terrain-mask-canvas';
      canvas.setAttribute('aria-hidden','true');
      viewport.appendChild(canvas);
    }
    state.canvas=canvas;
    state.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    resize();
    return canvas;
  }

  function resize(){
    const viewport=document.getElementById('mapViewport'),canvas=state.canvas;
    if(!viewport||!canvas)return;
    const dpr=Math.max(1,Math.min(2,Number(global.devicePixelRatio)||1));
    const w=Math.max(1,viewport.clientWidth||1),h=Math.max(1,viewport.clientHeight||1);
    const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
    if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
    canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
    state.dpr=dpr;
  }

  function buildPrecomposedLand(){
    const w=DATA.mask.pixelWidth,h=DATA.mask.pixelHeight;
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const ctx=c.getContext('2d',{alpha:true});
    const tile=Math.max(96,Math.round(w*.18));
    for(let y=0;y<h;y+=tile){
      for(let x=0;x<w;x+=tile){
        ctx.drawImage(state.texture,x,y,tile,tile);
      }
    }
    ctx.globalCompositeOperation='destination-in';
    ctx.drawImage(state.land,0,0,w,h);
    ctx.globalCompositeOperation='source-over';
    state.offscreen=c;state.offCtx=ctx;

    const seaCanvas=document.createElement('canvas');seaCanvas.width=w;seaCanvas.height=h;
    const seaCtx=seaCanvas.getContext('2d',{alpha:true,willReadFrequently:true});
    seaCtx.fillStyle=SEA_COLOR;seaCtx.fillRect(0,0,w,h);
    seaCtx.globalCompositeOperation='destination-in';seaCtx.drawImage(state.sea,0,0,w,h);
    seaCtx.globalCompositeOperation='source-over';state.seaCanvas=seaCanvas;

    const alphaCanvas=document.createElement('canvas');alphaCanvas.width=w;alphaCanvas.height=h;
    const alphaCtx=alphaCanvas.getContext('2d',{willReadFrequently:true});
    alphaCtx.drawImage(state.land,0,0,w,h);state.landAlpha=alphaCtx.getImageData(0,0,w,h).data;
    alphaCtx.clearRect(0,0,w,h);alphaCtx.drawImage(state.sea,0,0,w,h);state.seaAlpha=alphaCtx.getImageData(0,0,w,h).data;
  }

  function worldToMaskPixel(x,y){
    const b=DATA.mask.worldBounds;
    return [
      (Number(x)-b.x)/b.width*DATA.mask.pixelWidth,
      (Number(y)-b.y)/b.height*DATA.mask.pixelHeight
    ];
  }

  function classAtWorld(x,y){
    if(!state.ready)return 'unknown';
    const [px,py]=worldToMaskPixel(x,y);
    if(px<0||py<0||px>=DATA.mask.pixelWidth||py>=DATA.mask.pixelHeight)return 'outside';
    const ix=Math.max(0,Math.min(DATA.mask.pixelWidth-1,Math.floor(px)));
    const iy=Math.max(0,Math.min(DATA.mask.pixelHeight-1,Math.floor(py)));
    const offset=(iy*DATA.mask.pixelWidth+ix)*4+3;
    if(state.landAlpha&&state.landAlpha[offset]>32)return 'land';
    if(state.seaAlpha&&state.seaAlpha[offset]>32)return 'sea';
    return 'outside';
  }

  function scheduleDraw(){
    if(state.raf)return;
    state.raf=requestAnimationFrame(()=>{state.raf=0;draw();});
  }

  function draw(){
    if(!state.ready||!state.ctx||!state.canvas)return;
    resize();
    const view=global.SAMGUK_MAP_CAMERA_API?.getView?.();
    const viewport=document.getElementById('mapViewport');
    if(!Array.isArray(view)||view.length!==4||!viewport)return;
    const dpr=state.dpr,cw=state.canvas.width,ch=state.canvas.height;
    const [vx,vy,vw,vh]=view,b=DATA.mask.worldBounds;
    const sx=(b.x-vx)/vw*cw,sy=(b.y-vy)/vh*ch,sw=b.width/vw*cw,sh=b.height/vh*ch;
    const ctx=state.ctx;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cw,ch);
    ctx.save();
    ctx.beginPath();ctx.rect(Math.max(0,sx),Math.max(0,sy),Math.max(0,Math.min(cw,sx+sw)-Math.max(0,sx)),Math.max(0,Math.min(ch,sy+sh)-Math.max(0,sy)));ctx.clip();

    // Red mask: accelerated terrain texture overlay. The heavy coastline is already rasterized once.
    ctx.globalAlpha=TEXTURE_ALPHA;ctx.globalCompositeOperation='multiply';
    ctx.drawImage(state.offscreen,sx,sy,sw,sh);

    // Blue mask: hard sea restoration. This intentionally covers any SVG polygon that may remain below.
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    ctx.drawImage(state.seaCanvas,sx,sy,sw,sh);
    ctx.restore();
  }

  function bindBlueSeaHitGuard(){
    const viewport=document.getElementById('mapViewport');
    if(!viewport)return;
    viewport.addEventListener('click',event=>{
      if(!state.ready)return;
      const p=global.SAMGUK_MAP_CAMERA_API?.clientToWorld?.(event.clientX,event.clientY);
      if(!Array.isArray(p))return;
      if(classAtWorld(p[0],p[1])==='sea'){
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },true);
  }

  async function init(){
    if(!ensureCanvas())return;
    try{
      [state.land,state.sea,state.texture]=await Promise.all([
        loadImage(DATA.mask.landAlpha),loadImage(DATA.mask.seaAlpha),loadImage('mountain_terrain_texture.png')
      ]);
      buildPrecomposedLand();state.ready=true;bindBlueSeaHitGuard();scheduleDraw();
      document.dispatchEvent(new CustomEvent('samguk:japan-mask-ready'));
    }catch(error){console.error('[삼국쟁패][v132] Japan terrain mask init failed',error);}
  }

  document.addEventListener('DOMContentLoaded',init,{once:true});
  document.addEventListener('samguk:map-view-changed',scheduleDraw,{passive:true});
  document.addEventListener('samguk:map-rendered',scheduleDraw,{passive:true});
  global.addEventListener('resize',scheduleDraw,{passive:true});

  global.SAMGUK_JAPAN_MASK_CANVAS=Object.freeze({
    version:132,enabled:true,worldToMaskPixel,classAtWorld,scheduleDraw,draw,
    maskSource:DATA.mask.source,landMask:DATA.mask.landAlpha,seaMask:DATA.mask.seaAlpha
  });
})(window);
