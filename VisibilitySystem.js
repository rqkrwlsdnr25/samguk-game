'use strict';
/*
 * 삼국쟁패 v88 - 지도 전체 표시 / 병력 라벨 접경 2칸 시야
 * -------------------------------------------------------
 * - 영토/도시/자원/지명은 항상 표시한다. (전쟁 안개로 지도 자체를 어둡게 하지 않음)
 * - 병력 라벨만 제한한다.
 *   · 자국 영토: 항상 표시
 *   · 동맹 영토: 항상 표시
 *   · 타국 영토: 자국 영토에서 인접 그래프 기준 2칸 이내만 표시
 * - 기존 정찰/동맹/턴 API는 호환성을 위해 유지한다.
 */
(function(global){
  const VERSION=88;
  if(global.SAMGUK_VISIBILITY?.version>=VERSION)return;

  const STATE=Object.freeze({VISIBLE:'VISIBLE',SCOUTED:'SCOUTED',HIDDEN:'HIDDEN'});
  const CONFIG=Object.freeze({
    lodZoomThreshold:2.5,
    troopVisionDepth:2,
    defaultScoutTurns:2
  });
  const forcedAlliancePairs=new Set();
  let refreshRaf=0;
  let troopVisionCache={viewer:null,visible:new Set(),distance:new Map()};

  const regionList=()=>{try{return Array.isArray(regions)?regions:[]}catch(_e){return Array.isArray(global.regions)?global.regions:[]}};
  const neighborList=()=>{try{return Array.isArray(neighbors)?neighbors:[]}catch(_e){return Array.isArray(global.neighbors)?global.neighbors:[]}};
  const viewerFaction=()=>{try{return Number.isInteger(player)?player:Number(global.player)||0}catch(_e){return Number(global.player)||0}};
  const gameTurn=()=>{try{return Number(turn)||1}catch(_e){return Number(global.turn)||1}};
  const active=id=>{try{return typeof isActiveTerritory==='function'?!!isActiveTerritory(id):!!regionList()[id]}catch(_e){return !!regionList()[id]}};
  const pairKey=(a,b)=>[Number(a),Number(b)].sort((x,y)=>x-y).join(':');

  function currentZoom(){
    try{
      const z=global.SAMGUK_MAP_CAMERA_API?.getZoomLevel?.();
      if(Number.isFinite(Number(z)))return Number(z);
    }catch(_e){}
    try{
      const snap=global.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.();
      if(Number.isFinite(Number(snap?.zoomRatio)))return Number(snap.zoomRatio);
    }catch(_e){}
    return 1;
  }

  function isLowDetail(zoom=currentZoom()){
    return Number(zoom)<CONFIG.lodZoomThreshold;
  }

  function allianceTreaty(a,b){
    a=Number(a);b=Number(b);
    if(a===b)return true;
    if(forcedAlliancePairs.has(pairKey(a,b)))return true;
    try{if(global.SAMGUK_DIPLOMACY_MANAGER?.status?.(a,b)==='alliance')return true}catch(_e){}
    try{
      const key=typeof twDipPairKey==='function'?twDipPairKey(a,b):pairKey(a,b);
      if(TW_DIPLOMACY_UI_STATE?.treatiesFallback?.[key]?.alliance)return true;
    }catch(_e){}
    return false;
  }

  function normalizeTerritorySchema(id){
    const r=regionList()[id];if(!r)return null;
    r.factionId=Number(r.owner);
    // v88에서 지도 자체는 항상 보이므로 공개 시야 상태는 VISIBLE로 고정한다.
    r.visibility=STATE.VISIBLE;
    if(!Number.isFinite(Number(r.scoutRemainingTurns)))r.scoutRemainingTurns=0;
    if(!Number.isFinite(Number(r.scoutExpiresTurn)))r.scoutExpiresTurn=0;
    if(!Number.isInteger(Number(r.scoutedBy)))r.scoutedBy=null;
    if(!Object.values(STATE).includes(r.scoutVisibility))r.scoutVisibility=STATE.SCOUTED;

    const s=r.strategyState;
    if(s&&Number(s.scoutUntil)>gameTurn()&&Number.isInteger(Number(s.scoutBy))){
      if(Number(r.scoutExpiresTurn)<Number(s.scoutUntil)){
        r.scoutExpiresTurn=Number(s.scoutUntil);
        r.scoutedBy=Number(s.scoutBy);
        r.scoutVisibility=STATE.SCOUTED;
      }
    }
    r.scoutRemainingTurns=Math.max(0,Math.ceil(Number(r.scoutExpiresTurn)-gameTurn()));
    return r;
  }

  // 지도 표시 판정은 항상 VISIBLE. 병력 정보 판정은 canSeeTroopLabel()에서 별도 처리한다.
  function resolveVisibility(id,_viewer=viewerFaction()){
    id=Number(id);
    const r=normalizeTerritorySchema(id);
    return r&&active(id)?STATE.VISIBLE:STATE.HIDDEN;
  }

  function getVisibility(id,viewer=viewerFaction()){
    return resolveVisibility(Number(id),Number(viewer));
  }

  function rebuildTroopVision(viewer=viewerFaction()){
    viewer=Number(viewer);
    const rs=regionList(),ns=neighborList();
    const visible=new Set(),distance=new Map(),queue=[];

    // 자국 영토는 모두 병력 라벨 표시 + BFS 시작점.
    for(let id=0;id<rs.length;id++){
      if(!active(id))continue;
      if(Number(rs[id]?.owner)===viewer){
        visible.add(id);distance.set(id,0);queue.push(id);
      }
    }

    // 인접 그래프 기준 자국으로부터 2칸까지 확장한다.
    for(let qi=0;qi<queue.length;qi++){
      const id=queue[qi],d=Number(distance.get(id))||0;
      if(d>=CONFIG.troopVisionDepth)continue;
      const list=Array.isArray(ns[id])?ns[id]:[];
      for(const raw of list){
        const n=Number(raw);
        if(!Number.isInteger(n)||!active(n)||distance.has(n))continue;
        const nd=d+1;
        distance.set(n,nd);
        if(nd<=CONFIG.troopVisionDepth){visible.add(n);queue.push(n);}
      }
    }

    // 동맹은 정보 공유 상태이므로 동맹 영토의 병력 라벨은 전부 표시한다.
    for(let id=0;id<rs.length;id++){
      if(!active(id))continue;
      const owner=Number(rs[id]?.owner);
      if(owner!==viewer&&allianceTreaty(viewer,owner))visible.add(id);
    }

    troopVisionCache={viewer,visible,distance};
    return troopVisionCache;
  }

  function ensureTroopVision(viewer=viewerFaction()){
    viewer=Number(viewer);
    if(troopVisionCache.viewer!==viewer||!(troopVisionCache.visible instanceof Set))return rebuildTroopVision(viewer);
    return troopVisionCache;
  }

  function troopDistance(id,viewer=viewerFaction()){
    id=Number(id);viewer=Number(viewer);
    const rs=regionList();
    if(!active(id)||!rs[id])return Infinity;
    if(Number(rs[id].owner)===viewer)return 0;
    if(allianceTreaty(viewer,Number(rs[id].owner)))return 0;
    const cache=ensureTroopVision(viewer);
    return cache.distance.has(id)?Number(cache.distance.get(id)):Infinity;
  }

  function canSeeTroopLabel(id,viewer=viewerFaction()){
    id=Number(id);viewer=Number(viewer);
    const rs=regionList();
    if(!Number.isInteger(id)||!active(id)||!rs[id])return false;
    if(Number(rs[id].owner)===viewer)return true;
    if(allianceTreaty(viewer,Number(rs[id].owner)))return true;
    return ensureTroopVision(viewer).visible.has(id);
  }

  function getRenderableTerritories(options={}){
    const viewer=Number.isInteger(Number(options.viewerFactionId))?Number(options.viewerFactionId):viewerFaction();
    const rs=regionList(),out=[];
    for(let id=0;id<rs.length;id++){
      if(!active(id))continue;
      out.push({
        id,
        territory:rs[id],
        visibility:STATE.VISIBLE,
        troopLabelVisible:canSeeTroopLabel(id,viewer),
        troopDistance:troopDistance(id,viewer),
        lod:isLowDetail()?'LOW':'FULL'
      });
    }
    return out;
  }

  function applyMapClasses(){
    const rs=regionList(),viewer=viewerFaction();
    ensureTroopVision(viewer);
    document.querySelectorAll('#map .territory-shape[data-id]').forEach(node=>{
      const id=Number(node.dataset.id);if(!Number.isInteger(id)||!rs[id])return;
      node.classList.add('vision-visible');
      node.classList.remove('vision-scouted','vision-hidden');
      const troopVisible=canSeeTroopLabel(id,viewer);
      node.classList.toggle('troop-intel-visible',troopVisible);
      node.classList.toggle('troop-intel-hidden',!troopVisible);
      node.dataset.visibility=STATE.VISIBLE;
      node.dataset.troopIntel=troopVisible?'visible':'hidden';
    });
  }

  function renderMapUI({force=true}={}){
    if(refreshRaf)return;
    refreshRaf=requestAnimationFrame(()=>{
      refreshRaf=0;
      applyMapClasses();
      global.SAMGUK_MAP_UI_OVERLAY?.refresh?.({force});
      global.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('troop-vision-refresh');
    });
  }

  function refreshAll({forceOverlay=true}={}){
    const rs=regionList();
    for(let id=0;id<rs.length;id++)if(active(id))normalizeTerritorySchema(id);
    rebuildTroopVision(viewerFaction());
    if(forceOverlay)renderMapUI({force:true});
    document.dispatchEvent(new CustomEvent('samguk:visibility-changed',{detail:{viewerFactionId:viewerFaction(),changed:true,mode:'troop-label-radius',depth:CONFIG.troopVisionDepth}}));
    return true;
  }

  // 기존 정찰 API 호환 유지. 지도는 이미 전부 보이며, 정찰 보고 데이터만 정상 유지한다.
  function scoutTerritory(territoryId,durationTurns=CONFIG.defaultScoutTurns,options={}){
    const id=Number(territoryId),r=normalizeTerritorySchema(id);if(!r||!active(id))return false;
    const viewer=Number.isInteger(Number(options.viewerFactionId))?Number(options.viewerFactionId):viewerFaction();
    const turns=Math.max(1,Math.floor(Number(durationTurns)||CONFIG.defaultScoutTurns));
    r.scoutedBy=viewer;
    r.scoutVisibility=STATE.SCOUTED;
    r.scoutExpiresTurn=Math.max(Number(r.scoutExpiresTurn)||0,gameTurn()+turns);
    r.scoutRemainingTurns=Math.max(0,r.scoutExpiresTurn-gameTurn());
    if(r.strategyState&&viewer===Number(r.strategyState.scoutBy))r.strategyState.scoutUntil=Math.max(Number(r.strategyState.scoutUntil)||0,r.scoutExpiresTurn);
    document.dispatchEvent(new CustomEvent('samguk:territory-scouted',{detail:{territoryId:id,viewerFactionId:viewer,durationTurns:turns,visibility:STATE.VISIBLE}}));
    return true;
  }

  function updateAllianceVision(myFactionId,allyFactionId,enabled=true){
    const key=pairKey(myFactionId,allyFactionId);
    if(enabled)forcedAlliancePairs.add(key);else forcedAlliancePairs.delete(key);
    refreshAll({forceOverlay:true});
    return enabled;
  }

  function updateTurnVisibility(nextTurn=gameTurn()){
    const rs=regionList();
    for(let id=0;id<rs.length;id++){
      const r=normalizeTerritorySchema(id);if(!r||!active(id))continue;
      const expires=Number(r.scoutExpiresTurn)||0;
      r.scoutRemainingTurns=Math.max(0,Math.ceil(expires-Number(nextTurn)));
      if(expires>0&&expires<=Number(nextTurn)){
        r.scoutExpiresTurn=0;r.scoutRemainingTurns=0;r.scoutedBy=null;r.scoutVisibility=STATE.SCOUTED;
      }
      r.visibility=STATE.VISIBLE;
    }
    rebuildTroopVision(viewerFaction());
    renderMapUI({force:true});
    return true;
  }

  // 범용 Canvas 경로: 지도 요소는 모두 그린다. 병력 정보만 drawers.drawTroops가 있으면 2칸 규칙을 적용한다.
  function renderCanvasTerritories(ctx,territoryRows,currentZoomValue,drawers={}){
    if(!ctx||!Array.isArray(territoryRows))return 0;
    const low=Number(currentZoomValue)<CONFIG.lodZoomThreshold;
    const viewer=viewerFaction();
    let rendered=0;
    for(const row of territoryRows){
      const id=Number(row?.id??row?.territoryId);if(!Number.isInteger(id)||!active(id))continue;
      const territory=regionList()[id]||row;
      drawers.drawBase?.(ctx,territory,id,STATE.VISIBLE);
      drawers.drawCore?.(ctx,territory,id);
      if(!low)drawers.drawDetails?.(ctx,territory,id);
      if(canSeeTroopLabel(id,viewer))drawers.drawTroops?.(ctx,territory,id);
      rendered++;
    }
    return rendered;
  }

  function init(){
    const rs=regionList();
    for(let i=0;i<rs.length;i++)if(active(i))normalizeTerritorySchema(i);
    refreshAll({forceOverlay:true});
  }

  global.SAMGUK_VISIBILITY=Object.freeze({
    version:VERSION,STATE,config:CONFIG,currentZoom,isLowDetail,getVisibility,resolveVisibility,
    canSeeTroopLabel,troopDistance,rebuildTroopVision,
    getRenderableTerritories,renderMapUI,renderCanvasTerritories,
    scoutTerritory,updateAllianceVision,updateTurnVisibility,refreshAll,applyMapClasses
  });
  global.scoutTerritory=scoutTerritory;
  global.updateAllianceVision=updateAllianceVision;
  global.updateTurnVisibility=updateTurnVisibility;
  global.getRenderableTerritories=getRenderableTerritories;
  global.renderMapUI=renderMapUI;

  document.addEventListener('samguk:map-rendered',()=>requestAnimationFrame(applyMapClasses));
  document.addEventListener('samguk:map-state-updated',()=>{
    rebuildTroopVision(viewerFaction());
    requestAnimationFrame(applyMapClasses);
  });
  document.addEventListener('samguk:diplomacy-layout-changed',()=>refreshAll({forceOverlay:true}));
  document.addEventListener('samguk:diplomacy-target-changed',()=>refreshAll({forceOverlay:false}));
  document.addEventListener('click',e=>{if(e.target?.closest?.('#begin'))setTimeout(()=>refreshAll({forceOverlay:true}),0)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
