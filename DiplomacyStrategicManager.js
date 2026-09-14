/* 삼국쟁패 v62 — 인물 중심 외교 / 외교 판도 지도 / 우측 60% 독립 viewport */
(function(global){
  'use strict';

  const PANEL_RATIO=.40;
  const COLORS=Object.freeze({hostile:'#c62828',neutral:'#d1d5db',friendly:'#22c55e',selected:'#31d46f'});
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const factions=()=>{try{return K}catch(_e){return global.K||[]}};
  const regionList=()=>{try{return regions}catch(_e){return global.regions||[]}};
  const playerId=()=>{try{return player}catch(_e){return Number(global.player)||0}};
  const isBusy=()=>{try{return !!busy}catch(_e){return !!global.busy}};
  const isPlaying=()=>{try{return !!playing}catch(_e){return !!global.playing}};
  const nationCount=k=>{try{return count(k)}catch(_e){return regionList().filter(r=>r?.owner===k).length}};
  const diplomatic=k=>{try{return isDiplomaticFaction(k)}catch(_e){return true}};
  const currentGold=()=>{try{return gold}catch(_e){return Number(global.gold)||0}};
  const currentAp=()=>{try{return ap}catch(_e){return Number(global.ap)||0}};
  const officers=()=>{try{return OFFICERS}catch(_e){return global.OFFICERS||[]}};
  const dipState=()=>{try{return TW_DIPLOMACY_UI_STATE}catch(_e){return global.TW_DIPLOMACY_UI_STATE||{open:false,targetFaction:null,relationFallback:{},treatiesFallback:{}}}};
  const dipActions=()=>{try{return TW_DIPLOMACY_ACTIONS}catch(_e){return global.TW_DIPLOMACY_ACTIONS||[]}};
  const hexToRgb=hex=>{const s=String(hex||'').replace('#','');const h=s.length===3?s.split('').map(x=>x+x).join(''):s;return {r:parseInt(h.slice(0,2),16)||0,g:parseInt(h.slice(2,4),16)||0,b:parseInt(h.slice(4,6),16)||0}};
  const rgbToHex=({r,g,b})=>'#'+[r,g,b].map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,t)=>{const A=hexToRgb(a),B=hexToRgb(b),u=clamp(t,0,1);return rgbToHex({r:A.r+(B.r-A.r)*u,g:A.g+(B.g-A.g)*u,b:A.b+(B.b-A.b)*u})};

  class DiplomacyManager{
    constructor(){
      this.version=62;
      this.opened=false;
      this._captureBound=false;
      this._mapRenderBound=false;
      this._pendingApply=0;
      this._previous={ensure:global.ensureTotalWarDiplomacyDOM,render:global.renderTotalWarDiplomacy,open:global.openTotalWarDiplomacy,close:global.closeTotalWarDiplomacy,select:global.selectTotalWarDiplomacyFaction};
      this._installOverrides();
      this.ensureDOM(true);
      this._bindMapSelection();
      this._bindMapRefresh();
    }

    state(){return dipState()}
    relation(a,b){try{return clamp(twDipRelation?.(a,b),-100,100)}catch(_e){return 0}}
    status(a,b){
      try{if(wars?.[a]?.[b])return 'war'}catch(_e){}
      try{const t=this.state().treatiesFallback?.[twDipPairKey?.(a,b)];if(t?.alliance)return 'alliance'}catch(_e){}
      return 'neutral';
    }
    relationColor(a,b){
      if(a===b)return COLORS.selected;
      const status=this.status(a,b);if(status==='war')return '#e32626';if(status==='alliance')return '#20c862';
      const r=this.relation(a,b);return r<0?mix(COLORS.neutral,COLORS.hostile,Math.abs(r)/100):mix(COLORS.neutral,COLORS.friendly,r/100);
    }
    getMapViewportRect(){
      const vp=document.getElementById('mapViewport');
      if(vp&&this.opened){const r=vp.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}
      return {left:innerWidth*PANEL_RATIO,top:0,width:innerWidth*(1-PANEL_RATIO),height:innerHeight,right:innerWidth,bottom:innerHeight};
    }
    _ruler(k){
      try{return officers().find(o=>Number(o.nationId)===Number(k)&&(o.office==='king'||o.characterClass==='ruler'))||null}catch(_e){return null}
    }
    _rulerPortrait(k){
      const o=this._ruler(k);if(o&&typeof officerPortraitSvg==='function')return officerPortraitSvg(o,210);
      const symbol=factions()?.[k]?.symbol||factions()?.[k]?.name?.[0]||'王';return `<div class="tw-dip-ruler-fallback">${symbol}</div>`;
    }
    _rulerMarkup(k){
      const nation=factions()?.[k];if(!nation)return '<div id="twDipTargetSide" class="tw-dip-ruler-column"><h3>외교 상대 없음</h3></div>';
      const o=this._ruler(k),lands=typeof twDipTargetTerritories==='function'?twDipTargetTerritories(k):[],power=typeof twDipFactionPower==='function'?twDipFactionPower(k):0;
      const stats=o?.stats||{};
      return `<div id="twDipTargetSide" class="tw-dip-ruler-column" style="--faction-glow:${nation.color||'#d4af37'}"><div class="tw-dip-ruler-portrait">${this._rulerPortrait(k)}</div><h3>${o?.name||nation.name+' 군주'}</h3><p>${nation.name} · ${lands.length}개 영토<br>군사력 지표 ${Number(power).toLocaleString()}</p><div class="tw-dip-ruler-stats"><span>통솔<b>${stats.leadership??'—'}</b></span><span>무력<b>${stats.war??'—'}</b></span><span>지력<b>${stats.intelligence??'—'}</b></span><span>매력<b>${stats.charisma??'—'}</b></span></div></div>`;
    }
    ensureDOM(force=false){
      let root=document.getElementById('twDiplomacyOverlay');
      /* game.js가 먼저 만든 구형 overlay에는 addEventListener가 이미 붙어 있다.
         최초 v62 전환 때 노드를 교체해 중복 외교 액션을 원천 차단한다. */
      if(root&&force&&root.dataset.layout!=='strategic-left'){
        const fresh=document.createElement('section');fresh.id='twDiplomacyOverlay';root.replaceWith(fresh);root=fresh;
      }
      if(!root){root=document.createElement('section');root.id='twDiplomacyOverlay';document.body.appendChild(root)}
      if(!force&&root.dataset.layout==='strategic-left')return root;
      root.className='tw-dip-strategic';root.dataset.layout='strategic-left';root.setAttribute('aria-hidden','true');
      root.innerHTML=`<div class="tw-dip-shell"><section class="tw-dip-left-panel"><header class="tw-dip-strategic-head"><div class="tw-dip-title"><span style="font-size:21px;color:#d4af37">◆</span><div><b>천하 외교</b><small>인물 협상 · 외교 관계 판도</small></div></div><button type="button" class="tw-dip-close" data-tw-dip-close>닫기 ×</button></header><div class="tw-dip-strategic-body"><div id="twDipTargetSide" class="tw-dip-ruler-column"></div><div class="tw-dip-negotiation-column"><div class="tw-dip-faction-strip" id="twDipFactionStrip"></div><div class="tw-dip-panel" id="twDipOptionsPanel"></div></div></div><div id="twDipPlayerSide" class="tw-dip-player-compact"></div></section><div class="tw-dip-map-legend"><span class="hostile"><i></i>적대</span><span class="neutral"><i></i>중립</span><span class="friendly"><i></i>우호</span></div><div class="tw-dip-map-hint">우측 지도에서 국가를 클릭 · 드래그 이동 · 휠 확대/축소</div></div>`;
      root.onclick=e=>{if(e.target.closest('[data-tw-dip-close]')){global.closeTotalWarDiplomacy?.();return}const f=e.target.closest('[data-tw-dip-faction]');if(f){global.selectTotalWarDiplomacyFaction?.(Number(f.dataset.twDipFaction));return}const a=e.target.closest('[data-tw-dip-action]');if(a)global.executeTotalWarDiplomacyAction?.(a.dataset.twDipAction)};
      return root;
    }
    render(){
      const root=this.ensureDOM();const S=this.state();let t=S.targetFaction;
      if(!Number.isInteger(t)||t===playerId()||nationCount(t)<=0)t=factions().findIndex((_,i)=>i!==playerId()&&nationCount(i)>0&&diplomatic(i));
      S.targetFaction=t;
      const target=document.getElementById('twDipTargetSide');if(target)target.outerHTML=this._rulerMarkup(t);
      const strip=document.getElementById('twDipFactionStrip');if(strip)strip.innerHTML=(factions()).map((k,i)=>i!==playerId()&&nationCount(i)>0&&diplomatic(i)?`<button type="button" class="tw-dip-faction ${i===t?'active':''}" data-tw-dip-faction="${i}"><strong style="color:${i===t?'#ffe9a0':k.color}">${k.symbol} ${k.name}</strong><small>${nationCount(i)}개 영토 · ${(typeof twDipRelationLabel==='function'?twDipRelationLabel(this.relation(playerId(),i)):'중립')||'중립'}</small></button>`:'').join('');
      const playerBox=document.getElementById('twDipPlayerSide');if(playerBox){const p=factions()?.[playerId()];playerBox.innerHTML=`나의 조정 · <b>${p?.symbol||''} ${p?.name||''}</b> · 국고 ${Number(currentGold()).toFixed(1)} · 행동 ${currentAp()}`}
      const panel=document.getElementById('twDipOptionsPanel');
      if(panel){if(t<0){panel.innerHTML='<p>외교 가능한 국가가 없습니다.</p>'}else{const rel=this.relation(playerId(),t),pct=clamp((rel+100)/2,0,100);panel.innerHTML=`<div class="tw-dip-relation"><div><strong>${factions()[playerId()].name} ↔ ${factions()[t].name}</strong><div class="tw-dip-relbar"><i style="width:${pct}%"></i></div></div><b>${rel>0?'+':''}${rel} · ${(typeof twDipRelationLabel==='function'?twDipRelationLabel(rel):'중립')||'중립'}</b></div><div class="tw-dip-options">${(dipActions()).map(a=>`<button type="button" class="tw-dip-option ${a.tone==='negative'?'negative':''}" data-tw-dip-action="${a.id}"><span class="ico">${a.icon}</span><strong>${a.name}</strong><small>${a.desc}${a.goldCost?` · ${a.goldCost}금`:''}</small></button>`).join('')}</div>`}}
      this.applyMapMode();
      return root;
    }
    selectNation(k){
      if(k===playerId()||nationCount(k)<=0||!diplomatic(k))return false;
      this.state().targetFaction=k;this.render();document.dispatchEvent(new CustomEvent('samguk:diplomacy-target-changed',{detail:{faction:k}}));return true;
    }
    open(){
      if(isBusy()||!isPlaying())return false;
      this.ensureDOM();const legacy=document.getElementById('diplomacyDialog');if(legacy?.open)legacy.close();
      const S=this.state();S.open=true;this.opened=true;document.body.classList.add('tw-diplomacy-strategic-open','tw-diplomacy-map-focus');
      const root=document.getElementById('twDiplomacyOverlay');root?.classList.add('open');root?.setAttribute('aria-hidden','false');
      requestAnimationFrame(()=>{global.SAMGUK_GPU_MAP_CAMERA?._cacheViewportRect?.();this.render();document.dispatchEvent(new CustomEvent('samguk:diplomacy-layout-changed',{detail:{open:true,ratio:PANEL_RATIO}}))});
      return true;
    }
    close(){
      const S=this.state();S.open=false;this.opened=false;const root=document.getElementById('twDiplomacyOverlay');root?.classList.remove('open');root?.setAttribute('aria-hidden','true');
      document.body.classList.remove('tw-diplomacy-strategic-open','tw-diplomacy-map-focus');this.clearMapMode();
      requestAnimationFrame(()=>{global.SAMGUK_GPU_MAP_CAMERA?._cacheViewportRect?.();document.dispatchEvent(new CustomEvent('samguk:diplomacy-layout-changed',{detail:{open:false,ratio:PANEL_RATIO}}))});
      return true;
    }
    applyMapMode(){
      if(!this.opened&&!this.state().open)return false;const perspective=this.state().targetFaction;if(!Number.isInteger(perspective))return false;
      document.querySelectorAll('#map .territory-shape[data-id]').forEach(g=>{const id=Number(g.dataset.id),owner=regionList()?.[id]?.owner,path=g.querySelector(':scope > path');if(!path||!Number.isInteger(owner))return;const color=this.relationColor(perspective,owner);g.style.setProperty('--tw-dip-fill',color);g.classList.toggle('tw-dip-perspective',owner===perspective);g.classList.toggle('tw-dip-player-perspective',owner===playerId()&&owner!==perspective)});
      return true;
    }
    clearMapMode(){
      document.querySelectorAll('#map .territory-shape[data-id]').forEach(g=>{g.style.removeProperty('--tw-dip-fill');g.classList.remove('tw-dip-perspective','tw-dip-player-perspective')});
    }
    _bindMapSelection(){
      if(this._captureBound)return;this._captureBound=true;
      const bind=()=>{const vp=document.getElementById('mapViewport');if(!vp||vp.dataset.twDipMapSelectBound)return;vp.dataset.twDipMapSelectBound='1';vp.addEventListener('click',e=>{if(!this.opened&&!this.state().open)return;const g=e.target.closest?.('#map .territory-shape[data-id]');if(!g)return;const id=Number(g.dataset.id),owner=regionList()?.[id]?.owner;if(!Number.isInteger(owner)||owner===playerId()||!diplomatic(owner))return;e.preventDefault();e.stopImmediatePropagation();global.selectTotalWarDiplomacyFaction?.(owner)},true)};
      bind();document.addEventListener('samguk:map-rendered',bind);
    }
    _bindMapRefresh(){
      if(this._mapRenderBound)return;this._mapRenderBound=true;
      const refresh=()=>{if(!this.opened&&!this.state().open)return;if(this._pendingApply)return;this._pendingApply=requestAnimationFrame(()=>{this._pendingApply=0;this.applyMapMode()})};
      document.addEventListener('samguk:map-rendered',refresh);document.addEventListener('samguk:map-state-updated',refresh);
    }
    _installOverrides(){
      const self=this;
      global.ensureTotalWarDiplomacyDOM=()=>self.ensureDOM();
      global.renderTotalWarDiplomacy=()=>self.render();
      global.openTotalWarDiplomacy=()=>self.open();
      global.closeTotalWarDiplomacy=()=>self.close();
      global.selectTotalWarDiplomacyFaction=k=>self.selectNation(Number(k));
    }
  }

  /* Canvas/Astra 호환용 최종 렌더 함수. 실제 삼국쟁패 런타임은 SVG 맵을 사용하므로
     위 DiplomacyManager가 같은 색상 규칙을 SVG path에 적용한다. */
  function renderDiplomacyMapWithArrows(ctx,regions,selectedNation,currentZoom){
    if(!ctx||!ctx.canvas||!Array.isArray(regions))return false;
    const manager=global.SAMGUK_DIPLOMACY_MANAGER;const canvas=ctx.canvas,dpr=Math.max(1,global.devicePixelRatio||1);const cssW=canvas.clientWidth||canvas.width/dpr,cssH=canvas.clientHeight||canvas.height/dpr;
    const clipX=cssW*PANEL_RATIO,clipW=cssW-clipX;ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.beginPath();ctx.rect(clipX,0,clipW,cssH);ctx.clip();
    const zoom=Math.max(.01,Number(currentZoom)||1);const camera=global.SAMGUK_DIPLOMACY_CANVAS_CAMERA||{x:0,y:0};ctx.translate(clipX+clipW/2,cssH/2);ctx.scale(zoom,zoom);ctx.translate(-(camera.x||0),-(camera.y||0));
    for(const r of regions){const pts=r?.points||r?.vertices;if(!Array.isArray(pts)||pts.length<3)continue;const owner=Number(r.owner);ctx.beginPath();ctx.moveTo(Number(pts[0].x??pts[0][0]),Number(pts[0].y??pts[0][1]));for(let i=1;i<pts.length;i++)ctx.lineTo(Number(pts[i].x??pts[i][0]),Number(pts[i].y??pts[i][1]));ctx.closePath();ctx.fillStyle=manager?.relationColor?.(selectedNation,owner)||COLORS.neutral;ctx.fill();ctx.lineWidth=1/zoom;ctx.strokeStyle='#354249';ctx.stroke()}
    /* 도시/라벨을 사용하는 Canvas 파이프라인이 있다면 이 훅이 판도 바로 위에 그린다. */
    try{global.SAMGUK_DIPLOMACY_CANVAS_DRAW_UI?.(ctx,regions,selectedNation,currentZoom)}catch(_e){}
    /* 마지막 단계 화살표 */
    try{const a=global.SAMGUK_DIPLOMACY_CANVAS_CAPITAL_POINT?.(playerId()),b=global.SAMGUK_DIPLOMACY_CANVAS_CAPITAL_POINT?.(selectedNation);if(a&&b){ctx.save();ctx.setLineDash([12/zoom,8/zoom]);ctx.lineWidth=3/zoom;const status=manager?.status?.(playerId(),selectedNation)||'neutral';ctx.strokeStyle=status==='alliance'?'#0000FF':status==='war'?'#FF0000':'#FFFFFF';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}}catch(_e){}
    ctx.restore();return true;
  }

  const manager=new DiplomacyManager();
  global.DiplomacyManager=DiplomacyManager;
  global.SAMGUK_DIPLOMACY_MANAGER=manager;
  global.renderDiplomacyMapWithArrows=renderDiplomacyMapWithArrows;
})(window);
