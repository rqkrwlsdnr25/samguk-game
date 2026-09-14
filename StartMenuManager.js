'use strict';
(function startMenuCinematicBootstrap(global){
  const SVG_NS='http://www.w3.org/2000/svg';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const easeOutCubic=t=>1-Math.pow(1-t,3);
  const rgba=(hex,a=1)=>{
    const m=String(hex||'#dfbd78').replace('#','');
    const s=m.length===3?m.split('').map(c=>c+c).join(''):m.padEnd(6,'0').slice(0,6);
    const n=parseInt(s,16)||0xdfbd78;
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  };

  class StartMenuManager{
    constructor(options={}){
      this.dialog=document.getElementById(options.dialogId||'start');
      this.viewport=document.getElementById(options.viewportId||'mapViewport');
      this.worldSvg=document.getElementById('map');
      this.uiSvg=document.getElementById('mapUiOverlay');
      this.active=false;
      this.selectedNation=2;
      this.raf=0;
      this.cameraRaf=0;
      this.cameraToken=0;
      this.lastTime=0;
      this.maskDirty=true;
      this.layoutDirty=true;
      this._viewListener=()=>{this.maskDirty=true;};
      this._renderListener=()=>{if(this.active){this.applySelectionClasses();this.prepareBorderSources();this.maskDirty=true;}};
      this._resizeListener=()=>{this.layoutDirty=true;this.maskDirty=true;};
      this._reducedMotion=global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
      this.flowCount=this._reducedMotion?10:30;
      this.sparkCount=this._reducedMotion?12:42;
      this.flowOffsets=new Float32Array(this.flowCount);
      this.flowSpeeds=new Float32Array(this.flowCount);
      for(let i=0;i<this.flowCount;i++){
        this.flowOffsets[i]=i/this.flowCount;
        this.flowSpeeds[i]=0.000055+(i%7)*0.000006;
      }
      this.sparks=Array.from({length:this.sparkCount},()=>({x:0,y:0,vx:0,vy:0,life:0,maxLife:1,size:1}));
      this.borderSources=[];
      this.totalBorderLength=0;
      // v71: cache the true union outer ring (land borders + coastline) per selected nation.
      this._outerRingCache=new Map();
      this.glowingBorderPath=[];
      this.selectedIds=[];
      this.path2d=[];
      this.currentPortrait=null;
      this.cameraSavedView=null;
      this.lastViewSignature='';
      this._buildDom();
      this._bind();
      if(this.dialog?.open)this.enter();
    }

    _buildDom(){
      if(!this.dialog||!this.viewport)return;
      this.canvas=document.createElement('canvas');
      this.canvas.id='startSelectionVfxCanvas';
      this.canvas.setAttribute('aria-hidden','true');
      this.ctx=this.canvas.getContext('2d',{alpha:true,desynchronized:true});
      this.dialog.prepend(this.canvas);

      this.rulerStage=document.createElement('section');
      this.rulerStage.id='startRulerStage';
      this.rulerStage.setAttribute('aria-live','polite');
      this.rulerStage.innerHTML=`<div class="start-ruler-kicker">SELECT YOUR SOVEREIGN</div><div class="start-ruler-portrait-stack"></div><div class="start-ruler-meta"><span class="start-ruler-era">동아시아 패권의 서막</span><h3>군주</h3><p>세력을 선택하면 군주와 영토가 드러납니다.</p></div>`;
      this.dialog.appendChild(this.rulerStage);
      this.portraitStack=this.rulerStage.querySelector('.start-ruler-portrait-stack');
      this.rulerMeta=this.rulerStage.querySelector('.start-ruler-meta');

      this.mapCaption=document.createElement('div');
      this.mapCaption.id='startSelectionMapCaption';
      this.mapCaption.innerHTML='<small>SELECTION MODE</small><b>세력을 선택하십시오</b><span>영토 경계에 천명의 기운이 흐릅니다.</span>';
      this.dialog.appendChild(this.mapCaption);

      this.measureSvg=document.createElementNS(SVG_NS,'svg');
      this.measureSvg.setAttribute('aria-hidden','true');
      this.measureSvg.setAttribute('width','1');
      this.measureSvg.setAttribute('height','1');
      this.measureSvg.classList.add('start-vfx-measure');
      this.dialog.appendChild(this.measureSvg);

      this.maskCanvas=document.createElement('canvas');
      this.auraCanvas=document.createElement('canvas');
      this.maskCtx=this.maskCanvas.getContext('2d',{alpha:true});
      this.auraCtx=this.auraCanvas.getContext('2d',{alpha:true});
    }

    _bind(){
      if(!this.dialog)return;
      const choices=document.getElementById('choices');
      choices?.addEventListener('click',e=>{
        const card=e.target.closest('[data-choice]');
        if(!card)return;
        const nation=Number(card.dataset.choice);
        if(Number.isInteger(nation))queueMicrotask(()=>this.selectNation(nation,{focus:true}));
      });
      document.getElementById('begin')?.addEventListener('click',()=>this.exit({restoreCamera:false}));
      this.dialog.addEventListener('close',()=>this.exit({restoreCamera:false}));
      this.observer=new MutationObserver(()=>{
        if(this.dialog.open&&!this.active)this.enter();
        else if(!this.dialog.open&&this.active)this.exit({restoreCamera:false});
      });
      this.observer.observe(this.dialog,{attributes:true,attributeFilter:['open']});
      document.addEventListener('samguk:map-view-changed',this._viewListener);
      document.addEventListener('samguk:map-rendered',this._renderListener);
      global.addEventListener('resize',this._resizeListener,{passive:true});
    }

    enter(){
      if(this.active||!this.dialog?.open)return;
      this.active=true;
      document.body.classList.add('start-selection-mode');
      this.cameraSavedView=global.SAMGUK_MAP_CAMERA_API?.getView?.()||null;
      const active=document.querySelector('#choices .choice.active[data-choice]');
      const nation=Number(active?.dataset.choice);
      this.selectNation(Number.isInteger(nation)?nation:2,{focus:true,immediatePortrait:true});
      this.lastTime=performance.now();
      this.startLoop();
    }

    exit({restoreCamera=false}={}){
      if(!this.active)return;
      this.active=false;
      document.body.classList.remove('start-selection-mode');
      this.clearSelectionClasses();
      cancelAnimationFrame(this.raf);this.raf=0;
      cancelAnimationFrame(this.cameraRaf);this.cameraRaf=0;this.cameraToken++;
      if(this.ctx)this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      if(restoreCamera&&this.cameraSavedView)global.SAMGUK_MAP_CAMERA_API?.commitView?.(this.cameraSavedView);
      global.SAMGUK_START_MENU_STATE={mode:'GameMap',active:false,selectedNation:this.selectedNation};
    }

    selectNation(nation,{focus=true,immediatePortrait=false}={}){
      if(!Number.isInteger(nation)||!global.K?.[nation]&&!this._faction(nation))return;
      this.selectedNation=nation;
      this.selectedIds=this._territoryIdsForNation(nation);
      this.path2d=[];
      if(typeof Path2D!=='undefined'){
        for(const id of this.selectedIds){
          const d=this._world()?.territories?.[id]?.path;
          if(d){try{this.path2d.push(new Path2D(d));}catch(_e){}}
        }
      }
      this.applySelectionClasses();
      this.prepareBorderSources();
      this.maskDirty=true;
      this.updateRuler(nation,immediatePortrait);
      this.updateCaption(nation);
      this._resetSparks();
      global.SAMGUK_START_MENU_STATE={mode:'SelectionMode',active:true,selectedNation:nation};
      if(focus)this.autoFitNation(nation);
    }

    _faction(nation){try{return K?.[nation]||null}catch(_e){return null}}
    _regions(){try{return regions||[]}catch(_e){return[]}}
    _world(){try{return global.SAMGUK_WORLD||WORLD||null}catch(_e){return global.SAMGUK_WORLD||null}}
    _territoryIdsForNation(nation){
      const out=[];
      const list=this._world()?.territories||[];
      for(let i=0;i<list.length;i++)if(!list[i]?.inactive&&Number(list[i]?.home)===Number(nation))out.push(i);
      return out;
    }

    clearSelectionClasses(){
      document.querySelectorAll('.start-selected-territory').forEach(el=>el.classList.remove('start-selected-territory'));
      document.querySelectorAll('.start-selected-ui').forEach(el=>el.classList.remove('start-selected-ui'));
      this.worldSvg?.style.removeProperty('--start-selection-color');
    }

    applySelectionClasses(){
      this.clearSelectionClasses();
      const faction=this._faction(this.selectedNation);
      this.worldSvg?.style.setProperty('--start-selection-color',faction?.color||'#dfbd78');
      const selected=new Set(this.selectedIds);
      document.querySelectorAll('#map .territory-shape[data-id]').forEach(el=>{
        if(selected.has(Number(el.dataset.id)))el.classList.add('start-selected-territory');
      });
      document.querySelectorAll('#mapUiOverlay [data-id]').forEach(el=>{
        if(selected.has(Number(el.dataset.id)))el.classList.add('start-selected-ui');
      });
    }

    _rulerForNation(nation){
      const roster=global.SAMGUK_OFFICERS?.roster||[];
      return roster.find(o=>Number(o.nationId)===Number(nation)&&(o.office==='king'||o.characterClass==='ruler'||o.role==='군주'))||null;
    }

    _portraitMarkup(nation){
      const faction=this._faction(nation)||{};
      const custom=global.SAMGUK_RULER_PORTRAITS?.[nation]||global.SAMGUK_RULER_PORTRAITS?.[faction.name];
      if(custom)return `<img class="start-ruler-img" src="${custom}" alt="${faction.name||''} 군주 일러스트">`;
      const ruler=this._rulerForNation(nation);
      try{
        if(ruler&&typeof officerPortraitSvg==='function')return `<div class="start-ruler-svg">${officerPortraitSvg(ruler,310)}</div>`;
      }catch(_e){}
      return `<div class="start-ruler-fallback" style="--ruler-color:${faction.color||'#dfbd78'}"><span>${faction.symbol||faction.name?.[0]||'王'}</span></div>`;
    }

    updateRuler(nation,immediate=false){
      if(!this.portraitStack)return;
      const faction=this._faction(nation)||{};
      const ruler=this._rulerForNation(nation);
      const layer=document.createElement('div');
      layer.className='start-ruler-layer';
      layer.style.setProperty('--ruler-color',faction.color||'#dfbd78');
      layer.innerHTML=this._portraitMarkup(nation);
      this.portraitStack.appendChild(layer);
      const old=this.currentPortrait;
      this.currentPortrait=layer;
      if(immediate)layer.classList.add('is-visible');
      else requestAnimationFrame(()=>layer.classList.add('is-visible'));
      if(old){old.classList.remove('is-visible');old.classList.add('is-leaving');setTimeout(()=>old.remove(),520)}
      const lands=this.selectedIds.length;
      const title=ruler?.name||`${faction.name||''} 군주`;
      this.rulerMeta.innerHTML=`<span class="start-ruler-era">${faction.desc||'동아시아의 세력'}</span><h3>${title}</h3><p><b style="color:${faction.color||'#dfbd78'}">${faction.name||''}</b> · ${lands}개 영토<br>${faction.perk||''}</p>`;
    }

    updateCaption(nation){
      if(!this.mapCaption)return;
      const f=this._faction(nation)||{};
      this.mapCaption.style.setProperty('--selection-color',f.color||'#dfbd78');
      this.mapCaption.innerHTML=`<small>SELECTION MODE · ${this.selectedIds.length} TERRITORIES</small><b>${f.name||''}</b><span>${f.desc||''} · 국경에 천명의 기운이 흐릅니다.</span>`;
    }

    _boundsForNation(nation){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      const ids=this._territoryIdsForNation(nation);
      for(const id of ids){
        const t=this._world()?.territories?.[id];if(!t?.path)continue;
        let b=null;
        try{if(typeof territoryPathBounds==='function')b=territoryPathBounds(t.path)}catch(_e){}
        if(b){minX=Math.min(minX,b.minX);minY=Math.min(minY,b.minY);maxX=Math.max(maxX,b.maxX);maxY=Math.max(maxY,b.maxY)}
        else if(Number.isFinite(t.x)&&Number.isFinite(t.y)){minX=Math.min(minX,t.x);minY=Math.min(minY,t.y);maxX=Math.max(maxX,t.x);maxY=Math.max(maxY,t.y)}
      }
      if(!Number.isFinite(minX))return null;
      return {minX,minY,maxX,maxY,w:Math.max(12,maxX-minX),h:Math.max(12,maxY-minY),cx:(minX+maxX)/2,cy:(minY+maxY)/2};
    }

    autoFitNation(nation){
      const api=global.SAMGUK_MAP_CAMERA_API,b=this._boundsForNation(nation),vp=this.viewport;
      if(!api||!b||!vp)return;
      const rect=vp.getBoundingClientRect();
      if(rect.width<10||rect.height<10)return;
      const aspect=rect.width/rect.height;
      let w=Math.max(b.w*1.48,b.h*aspect*1.48);
      const worldW=Math.max(1,Number(this._world()?.width)||1150);
      const maxSelectionZoom=4.35,minSelectionZoom=.70;
      w=Math.max(w,worldW/maxSelectionZoom);
      w=Math.min(w,worldW/minSelectionZoom);
      let h=w/aspect;
      if(h<b.h*1.48){h=b.h*1.48;w=h*aspect;}
      // v70: the chooser is fixed on the right, while the ruler remains on the left.
      // Keep the selected nation near the open center-left map window instead of pushing it under the chooser.
      const biasX=-.04;
      const cx=b.cx-w*biasX;
      const cy=b.cy;
      const target=api.clampView?.([cx-w/2,cy-h/2,w,h])||[cx-w/2,cy-h/2,w,h];
      this.animateCameraTo(target,760);
    }

    animateCameraTo(target,duration=760){
      const api=global.SAMGUK_MAP_CAMERA_API;if(!api)return;
      cancelAnimationFrame(this.cameraRaf);
      const token=++this.cameraToken;
      const from=api.getView?.()||target.slice();
      const start=performance.now();
      const step=now=>{
        if(token!==this.cameraToken||!this.active)return;
        const p=clamp((now-start)/duration,0,1),e=easeOutCubic(p);
        const v=[lerp(from[0],target[0],e),lerp(from[1],target[1],e),lerp(from[2],target[2],e),lerp(from[3],target[3],e)];
        api.applyInterpolatedView?.(v);
        this.maskDirty=true;
        if(p<1)this.cameraRaf=requestAnimationFrame(step);
        else{api.commitView?.(target);this.cameraRaf=0;this.maskDirty=true;}
      };
      this.cameraRaf=requestAnimationFrame(step);
    }

    _parsePolygonRings(pathData){
      // Territory geometry in WORLD uses only absolute M/L/Z commands.
      // Parse once when the faction selection changes; never do this in the 60fps VFX loop.
      const tokens=String(pathData||'').match(/[MLZ]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)||[];
      const rings=[];let ring=[],cmd='',i=0;
      while(i<tokens.length){
        const t=tokens[i];
        if(t==='M'||t==='L'||t==='Z'){
          cmd=t;i++;
          if(cmd==='Z'){if(ring.length>2)rings.push(ring);ring=[];cmd='';}
          continue;
        }
        if(cmd==='M'||cmd==='L'){
          const x=Number(tokens[i++]),y=Number(tokens[i++]);
          if(Number.isFinite(x)&&Number.isFinite(y))ring.push({x,y});
          continue;
        }
        i++;
      }
      if(ring.length>2)rings.push(ring);
      return rings;
    }

    _pointKey(p){
      // WORLD vertices are half/integer pixel coordinates. 3 decimals keeps exact shared edges
      // while remaining stable against harmless floating-point serialization noise.
      const x=Math.abs(p.x)<.0005?0:p.x,y=Math.abs(p.y)<.0005?0:p.y;
      return `${x.toFixed(3)},${y.toFixed(3)}`;
    }

    _buildOuterRingPaths(){
      const territories=this._world()?.territories||[];
      const signature=this.selectedIds.map(id=>`${id}:${territories[id]?.path?.length||0}`).join('|');
      const cacheKey=`${this.selectedNation}|${signature}`;
      const cached=this._outerRingCache.get(cacheKey);
      if(cached)return cached;

      // 1) Collect every polygon edge from every territory in the selected faction.
      // 2) Shared edges occur twice (once from each adjacent selected territory) and cancel out.
      // 3) Edges occurring once are the TRUE union boundary: foreign land border + sea coastline.
      const edgeMap=new Map();
      for(const id of this.selectedIds){
        const d=territories[id]?.path;if(!d)continue;
        for(const ring of this._parsePolygonRings(d)){
          const n=ring.length;
          for(let i=0;i<n;i++){
            const a=ring[i],b=ring[(i+1)%n],ak=this._pointKey(a),bk=this._pointKey(b);
            if(ak===bk)continue;
            const key=ak<bk?`${ak}|${bk}`:`${bk}|${ak}`;
            const prev=edgeMap.get(key);
            if(prev)prev.count++;
            else edgeMap.set(key,{count:1,a:{x:a.x,y:a.y,key:ak},b:{x:b.x,y:b.y,key:bk}});
          }
        }
      }

      const edges=[];
      for(const edge of edgeMap.values())if((edge.count&1)===1)edges.push(edge);
      if(!edges.length){this._outerRingCache.set(cacheKey,[]);return[];}

      // Build an undirected boundary graph. Union-boundary vertices have even degree;
      // Hierholzer therefore gives continuous closed trails even where two coast loops touch
      // at a single map vertex. No artificial bridge across the sea is introduced.
      const adjacency=new Map(),pointByKey=new Map();
      const add=(key,index)=>{let list=adjacency.get(key);if(!list)adjacency.set(key,list=[]);list.push(index);};
      for(let i=0;i<edges.length;i++){
        const e=edges[i];pointByKey.set(e.a.key,e.a);pointByKey.set(e.b.key,e.b);add(e.a.key,i);add(e.b.key,i);
      }
      const used=new Uint8Array(edges.length),cursor=new Map(),paths=[];
      const takeNext=key=>{
        const list=adjacency.get(key)||[];let c=cursor.get(key)||0;
        while(c<list.length&&used[list[c]])c++;
        cursor.set(key,c+1);
        return c<list.length?list[c]:-1;
      };
      for(let seed=0;seed<edges.length;seed++){
        if(used[seed])continue;
        const stack=[edges[seed].a.key],circuit=[];
        while(stack.length){
          const key=stack[stack.length-1],edgeIndex=takeNext(key);
          if(edgeIndex<0){circuit.push(stack.pop());continue;}
          used[edgeIndex]=1;
          const e=edges[edgeIndex],next=e.a.key===key?e.b.key:e.a.key;
          stack.push(next);
        }
        circuit.reverse();
        if(circuit.length<2)continue;
        const first=pointByKey.get(circuit[0]);if(!first)continue;
        let d=`M${first.x},${first.y}`;
        for(let i=1;i<circuit.length;i++){const p=pointByKey.get(circuit[i]);if(p)d+=`L${p.x},${p.y}`;}
        if(circuit[0]===circuit[circuit.length-1])d+='Z';
        paths.push(d);
      }

      this._outerRingCache.set(cacheKey,paths);
      return paths;
    }

    prepareBorderSources(){
      if(!this.measureSvg)return;
      this.measureSvg.replaceChildren();
      this.borderSources=[];this.totalBorderLength=0;

      // v71: glowingBorderPath now represents the full selected-faction outer ring,
      // not only borders shared with another country. This includes every coastline.
      const paths=this._buildOuterRingPaths();
      this.glowingBorderPath=paths;
      for(const d of paths){
        const p=document.createElementNS(SVG_NS,'path');
        p.setAttribute('d',d);p.setAttribute('fill','none');this.measureSvg.appendChild(p);
        let len=0;try{len=p.getTotalLength()}catch(_e){}
        if(len<=1)continue;
        let path2d=null;try{if(typeof Path2D!=='undefined')path2d=new Path2D(d);}catch(_e){}
        this.totalBorderLength+=len;
        this.borderSources.push({node:p,start:this.totalBorderLength-len,end:this.totalBorderLength,length:len,path2d});
      }
    }

    _layoutCanvas(){
      if(!this.canvas||!this.viewport)return;
      const r=this.viewport.getBoundingClientRect();
      if(r.width<2||r.height<2)return;
      this.canvas.style.left=`${r.left}px`;this.canvas.style.top=`${r.top}px`;this.canvas.style.width=`${r.width}px`;this.canvas.style.height=`${r.height}px`;
      const device=Math.max(1,global.devicePixelRatio||1);
      const capByPixels=Math.sqrt(2200000/Math.max(1,r.width*r.height));
      const dpr=clamp(Math.min(device,1.5,capByPixels),.75,1.5);
      const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(this.canvas.width!==w||this.canvas.height!==h){
        this.canvas.width=w;this.canvas.height=h;
        this.maskCanvas.width=w;this.maskCanvas.height=h;
        this.auraCanvas.width=w;this.auraCanvas.height=h;
        this.maskDirty=true;
      }
      this.cssW=r.width;this.cssH=r.height;this.dpr=dpr;this.layoutDirty=false;
      if(this.mapCaption){
        const chooser=this.dialog?.querySelector('.dialog-inner')?.getBoundingClientRect?.();
        const desired=chooser?chooser.left-312:r.right-320;
        const minLeft=Math.max(12,r.left+12);
        const maxLeft=Math.max(minLeft,r.right-312);
        this.mapCaption.style.left=`${clamp(desired,minLeft,maxLeft)}px`;
        this.mapCaption.style.top=`${Math.max(12,r.top+18)}px`;
      }
    }

    _worldTransform(){
      const view=global.SAMGUK_MAP_CAMERA_API?.getView?.();
      if(!view||!this.cssW||!this.cssH)return null;
      const [vx,vy,vw,vh]=view;
      const s=Math.min(this.cssW/vw,this.cssH/vh);
      const ox=(this.cssW-vw*s)/2-vx*s;
      const oy=(this.cssH-vh*s)/2-vy*s;
      return {view,s,ox,oy,signature:view.map(v=>v.toFixed(3)).join('|')};
    }

    _applyWorldTransform(ctx,tr){ctx.setTransform(this.dpr*tr.s,0,0,this.dpr*tr.s,this.dpr*tr.ox,this.dpr*tr.oy)}
    _worldToScreen(x,y,tr){return [x*tr.s+tr.ox,y*tr.s+tr.oy]}

    _rebuildMask(tr){
      const m=this.maskCtx,a=this.auraCtx;if(!m||!a)return;
      const W=this.maskCanvas.width,H=this.maskCanvas.height;
      m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,W,H);
      this._applyWorldTransform(m,tr);m.fillStyle='#fff';
      for(const p of this.path2d)m.fill(p);
      a.setTransform(1,0,0,1,0,0);a.clearRect(0,0,W,H);
      const f=this._faction(this.selectedNation)||{},color=f.color||'#dfbd78';
      a.globalCompositeOperation='source-over';
      const passes=[[34,.24],[20,.34],[10,.48]];
      for(const [blur,alpha] of passes){
        a.save();a.globalAlpha=alpha;a.shadowColor=color;a.shadowBlur=blur*this.dpr;a.drawImage(this.maskCanvas,0,0);a.restore();
      }
      a.globalCompositeOperation='destination-out';a.globalAlpha=1;a.drawImage(this.maskCanvas,0,0);
      a.globalCompositeOperation='source-over';a.globalAlpha=1;
      this.maskDirty=false;this.lastViewSignature=tr.signature;
    }

    _pointOnBorder(distance){
      if(!this.totalBorderLength||!this.borderSources.length)return null;
      let d=((distance%this.totalBorderLength)+this.totalBorderLength)%this.totalBorderLength;
      let src=this.borderSources[this.borderSources.length-1];
      // The list is small; a linear scan avoids allocation and is faster than building temporary arrays.
      for(let i=0;i<this.borderSources.length;i++){if(d<this.borderSources[i].end){src=this.borderSources[i];break;}}
      try{return src.node.getPointAtLength(clamp(d-src.start,0,src.length))}catch(_e){return null}
    }

    _resetSparks(){for(const s of this.sparks)s.life=0;}
    _spawnSpark(s,tr,tick){
      if(!this.totalBorderLength)return;
      const p=this._pointOnBorder(Math.random()*this.totalBorderLength);if(!p)return;
      const qx=p.x*tr.s+tr.ox,qy=p.y*tr.s+tr.oy,angle=Math.random()*Math.PI*2,speed=10+Math.random()*24;
      s.x=qx;s.y=qy;s.vx=Math.cos(angle)*speed*.45;s.vy=-12-Math.random()*28+Math.sin(angle)*speed*.18;s.maxLife=.55+Math.random()*.85;s.life=s.maxLife;s.size=.8+Math.random()*1.8;s.phase=tick+Math.random()*10;
    }

    _drawBorderStrokes(ctx,tr,pulse,color){
      if(!this.borderSources.length)return;
      ctx.save();this._applyWorldTransform(ctx,tr);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
      const s=tr.s;
      ctx.lineWidth=8.5/s;ctx.globalAlpha=.08+.05*pulse;ctx.strokeStyle=rgba(color,.85);for(const src of this.borderSources)if(src.path2d)ctx.stroke(src.path2d);
      ctx.lineWidth=4.2/s;ctx.globalAlpha=.16+.08*pulse;ctx.strokeStyle=rgba(color,.95);for(const src of this.borderSources)if(src.path2d)ctx.stroke(src.path2d);
      ctx.lineWidth=1.35/s;ctx.globalAlpha=.72+.20*pulse;ctx.strokeStyle='rgba(255,244,197,.96)';for(const src of this.borderSources)if(src.path2d)ctx.stroke(src.path2d);
      ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    }

    _drawFlowParticles(ctx,tr,tick,pulse,color){
      if(!this.totalBorderLength)return;
      ctx.save();ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.globalCompositeOperation='lighter';
      const particleColor=rgba(color,.92);
      for(let i=0;i<this.flowCount;i++){
        const d=(this.flowOffsets[i]*this.totalBorderLength+tick*this.flowSpeeds[i]*this.totalBorderLength*1000)%this.totalBorderLength;
        const p=this._pointOnBorder(d);if(!p)continue;
        const qx=p.x*tr.s+tr.ox,qy=p.y*tr.s+tr.oy,r=(i%5===0?2.7:1.45)*(1+.18*pulse);
        ctx.beginPath();ctx.arc(qx,qy,r,0,Math.PI*2);ctx.fillStyle=i%4===0?'rgba(255,252,222,.98)':particleColor;ctx.shadowColor=color;ctx.shadowBlur=(i%5===0?14:7);ctx.globalAlpha=.66+(i%3)*.11;ctx.fill();
      }
      ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    }

    _drawSparks(ctx,tr,tick,dt,color){
      ctx.save();ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.globalCompositeOperation='lighter';
      const sparkColor=rgba(color,.95),sparkGold='rgba(255,239,177,.95)';
      for(const s of this.sparks){
        if(s.life<=0){if(Math.random()<.22)this._spawnSpark(s,tr,tick);continue;}
        s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy-=2*dt;
        const a=clamp(s.life/s.maxLife,0,1);if(a<=0)continue;
        ctx.globalAlpha=a*.68;ctx.fillStyle=Math.sin((s.phase||0)+tick*.004)>0?sparkColor:sparkGold;ctx.beginPath();ctx.arc(s.x,s.y,s.size*(.65+.35*a),0,Math.PI*2);ctx.fill();
      }
      ctx.restore();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    }

    drawFrame(now){
      if(!this.active||!this.ctx)return;
      if(this.layoutDirty)this._layoutCanvas();
      const tr=this._worldTransform();if(!tr)return;
      if(tr.signature!==this.lastViewSignature)this.maskDirty=true;
      if(this.maskDirty)this._rebuildMask(tr);
      const ctx=this.ctx,W=this.canvas.width,H=this.canvas.height,dt=Math.min(.05,Math.max(0,(now-this.lastTime)/1000));this.lastTime=now;
      const pulse=.5+.5*Math.sin(now*.0062),color=this._faction(this.selectedNation)?.color||'#dfbd78';
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);

      // Base silhouette map mode: other factions and the sea are darkened, selected territory is cut back open.
      ctx.fillStyle='rgba(15,23,42,.76)';ctx.fillRect(0,0,W,H);
      ctx.save();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.86;ctx.drawImage(this.maskCanvas,0,0);ctx.restore();

      // Radial aura / god-ray style additive halo generated from the union territory mask.
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.58+.24*pulse;ctx.drawImage(this.auraCanvas,0,0);ctx.restore();
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      this._drawBorderStrokes(ctx,tr,pulse,color);
      this._drawFlowParticles(ctx,tr,now,pulse,color);
      this._drawSparks(ctx,tr,now,dt,color);
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.shadowBlur=0;
    }

    startLoop(){
      if(this.raf)return;
      const loop=now=>{
        this.raf=0;if(!this.active)return;this.drawFrame(now);this.raf=requestAnimationFrame(loop);
      };
      this.raf=requestAnimationFrame(loop);
    }
  }

  global.StartMenuManager=StartMenuManager;
  const boot=()=>{
    if(global.SAMGUK_START_MENU_MANAGER)return;
    const manager=new StartMenuManager();
    global.SAMGUK_START_MENU_MANAGER=manager;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
