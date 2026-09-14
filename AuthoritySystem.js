/* 삼국쟁패 v77 - 4단계 왕권 / 권위(Authority) 시스템 · 왕권 UI 렌더 오류 복구 */
(function(global){
  'use strict';

  const RANKS=Object.freeze([
    Object.freeze({id:'PROVINCIAL_KING',label:'지방왕',han:'地方王',threshold:0,description:'초기 작위 · 기본 행동력과 국력 유지'}),
    Object.freeze({id:'KING',label:'왕',han:'王',threshold:100,description:'전역 모집량·경제 수입 +30% · 대장군/재상 임명권 해금'}),
    Object.freeze({id:'GREAT_KING',label:'대왕',han:'大王',threshold:300,description:'최대 행동력 +2 · 속국/공물 요구 외교 가중치'}),
    Object.freeze({id:'EMPEROR',label:'황제',han:'皇帝',threshold:600,description:'최대 행동력 +3 추가 · 천하통일 챌린지 활성화'})
  ]);
  const BY_ID=Object.freeze(Object.fromEntries(RANKS.map((r,i)=>[r.id,Object.freeze({...r,index:i})])));
  const MAX_AUTHORITY=RANKS[RANKS.length-1].threshold;
  const PLAYER_RELATION_DECAY=-2;
  let runtime=null;
  let vfxTimer=0;
  let audioCtx=null;

  function clamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||0))}
  function rankIndex(id){return BY_ID[id]?.index??0}
  function normalizeFaction(faction){
    if(!faction)return null;
    if(!BY_ID[faction.factionRank])faction.factionRank='PROVINCIAL_KING';
    faction.authorityScore=Math.max(0,Math.floor(Number(faction.authorityScore)||0));
    return faction;
  }
  function resetFaction(faction){
    if(!faction)return null;
    faction.factionRank='PROVINCIAL_KING';
    faction.authorityScore=0;
    faction.emperorChallenge=false;
    return faction;
  }
  function resetAll(factions){for(const f of factions||[])resetFaction(f);return factions}
  function getFaction(id){return normalizeFaction(runtime?.getFactions?.()?.[Number(id)]||null)}
  function rankForScore(score){
    score=Math.max(0,Number(score)||0);let row=RANKS[0];
    for(const r of RANKS)if(score>=r.threshold)row=r;
    return row;
  }
  function getRank(id){const f=getFaction(id);return f?BY_ID[f.factionRank]:BY_ID.PROVINCIAL_KING}
  function recruitmentMultiplier(id){return rankIndex(getFaction(id)?.factionRank)>=1?1.30:1}
  function incomeMultiplier(id){return rankIndex(getFaction(id)?.factionRank)>=1?1.30:1}
  function actionBonus(id){const idx=rankIndex(getFaction(id)?.factionRank);return idx>=3?5:idx>=2?2:0}
  function diplomacyDemandBonus(id){const idx=rankIndex(getFaction(id)?.factionRank);return idx>=3?25:idx>=2?15:0}
  function canAppointHighestOffices(id){return rankIndex(getFaction(id)?.factionRank)>=1}
  function emperorChallengeActive(id){return rankIndex(getFaction(id)?.factionRank)>=3}

  function ensureVfxDom(){
    let el=document.getElementById('authorityRankUpVfx');
    if(el)return el;
    el=document.createElement('div');el.id='authorityRankUpVfx';el.className='authority-rankup-vfx';el.setAttribute('aria-live','assertive');el.innerHTML='<div class="authority-rankup-rays"></div><div class="authority-rankup-inner"><small>王權 昇格</small><strong id="authorityRankUpTitle"></strong><p id="authorityRankUpUnlock"></p></div>';
    document.body.appendChild(el);return el;
  }
  function playDrum(){
    try{
      audioCtx=audioCtx||new (global.AudioContext||global.webkitAudioContext)();
      if(audioCtx.state==='suspended')audioCtx.resume();
      const now=audioCtx.currentTime;
      [0,.19,.43].forEach((delay,idx)=>{
        const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
        osc.type='sine';osc.frequency.setValueAtTime(idx===2?62:72,now+delay);osc.frequency.exponentialRampToValueAtTime(38,now+delay+.34);
        filter.type='lowpass';filter.frequency.value=180;
        gain.gain.setValueAtTime(.0001,now+delay);gain.gain.exponentialRampToValueAtTime(idx===2?.24:.18,now+delay+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+.42);
        osc.connect(filter);filter.connect(gain);gain.connect(audioCtx.destination);osc.start(now+delay);osc.stop(now+delay+.45);
      });
    }catch(_e){}
  }
  function rankUnlockText(rank){
    if(rank.id==='KING')return '모집량·경제 수입 +30% · 대장군/재상 임명권 해금';
    if(rank.id==='GREAT_KING')return '최대 행동력 +2 · 속국/공물 요구 외교 가중치 해금';
    if(rank.id==='EMPEROR')return '최대 행동력 +3 추가 · 천하통일 챌린지 개시';
    return '왕권의 기틀을 세웠습니다.';
  }
  function showRankUpVfx(factionId,rank){
    if(Number(factionId)!==Number(runtime?.getPlayer?.()))return;
    const el=ensureVfxDom(),title=el.querySelector('#authorityRankUpTitle'),unlock=el.querySelector('#authorityRankUpUnlock');
    if(title)title.textContent=`${rank.han} · ${rank.label}`;if(unlock)unlock.textContent=rankUnlockText(rank);
    el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(vfxTimer);vfxTimer=setTimeout(()=>el.classList.remove('show'),2700);playDrum();
  }
  function applyRankState(factionId,nextRank,previousRank){
    const f=getFaction(factionId);if(!f)return;
    f.factionRank=nextRank.id;f.emperorChallenge=nextRank.id==='EMPEROR';
    const detail={factionId:Number(factionId),previousRank:previousRank?.id||null,rank:nextRank.id,label:nextRank.label,authority:f.authorityScore,unlocks:rankUnlockText(nextRank)};
    try{document.dispatchEvent(new CustomEvent('samguk:authority-rank-up',{detail}))}catch(_e){}
    runtime?.log?.(`👑 ${runtime?.getFactionName?.(factionId)||'세력'} 왕권 승격 · ${nextRank.label} · ${rankUnlockText(nextRank)}`);
    if(Number(factionId)===Number(runtime?.getPlayer?.()))runtime?.notify?.(`${nextRank.label} 승격! ${rankUnlockText(nextRank)}`);
    showRankUpVfx(factionId,nextRank);
  }
  function updateFactionRank(factionId){
    const f=getFaction(factionId);if(!f)return null;
    const prev=BY_ID[f.factionRank]||BY_ID.PROVINCIAL_KING,next=rankForScore(f.authorityScore);
    if(next.threshold>prev.threshold)applyRankState(factionId,next,prev);else{f.factionRank=next.id;f.emperorChallenge=next.id==='EMPEROR'}
    return next;
  }
  function addAuthority(factionId,amount,reason='활동'){
    const f=getFaction(factionId),n=Math.max(0,Math.floor(Number(amount)||0));if(!f||!n)return 0;
    const before=f.authorityScore;f.authorityScore=Math.max(0,before+n);const oldRank=f.factionRank;const next=updateFactionRank(factionId);
    runtime?.log?.(`♛ ${runtime?.getFactionName?.(factionId)||'세력'} 권위 +${n} · ${reason} · ${f.authorityScore}`);
    try{document.dispatchEvent(new CustomEvent('samguk:authority-changed',{detail:{factionId:Number(factionId),amount:n,reason,score:f.authorityScore,rank:f.factionRank,rankChanged:oldRank!==f.factionRank}}))}catch(_e){}
    return f.authorityScore;
  }
  function onBattleVictory(factionId,meta){return addAuthority(factionId,20,meta?.reason||'전투 승리')}
  function onBuildingCompleted(factionId,meta){return addAuthority(factionId,10,meta?.reason||'건설 완료')}
  function onCapitalUpgraded(factionId,meta){return addAuthority(factionId,50,meta?.reason||'수도 증축 완료')}

  function applyEmperorChallengeTurn(factionId){
    const id=Number(factionId);if(!emperorChallengeActive(id)||!runtime)return 0;
    let changed=0;
    const factions=runtime.getFactions?.()||[];
    for(let other=0;other<factions.length;other++){
      if(other===id||!runtime.isAlive?.(other))continue;
      const current=Number(runtime.getRelation?.(id,other));if(!Number.isFinite(current))continue;
      const next=clamp(current+PLAYER_RELATION_DECAY,-100,100);if(next===current)continue;
      runtime.setRelation?.(id,other,next);changed++;
    }
    if(changed)runtime.log?.(`👑 황제의 천하통일 칙령 · 생존 세력 ${changed}곳과 우호도 ${PLAYER_RELATION_DECAY}`);
    return changed;
  }

  function rankMeta(rank){
    if(!rank)return null;
    if(Number.isInteger(rank.index))return rank;
    return BY_ID[rank.id]||null;
  }
  function progressFor(rank,score,currentIdx){
    const meta=rankMeta(rank);
    if(!meta)return 0;
    const idx=meta.index;
    if(idx<currentIdx)return 100;
    if(idx>currentIdx)return 0;
    if(idx>=RANKS.length-1)return 100;
    const next=RANKS[idx+1];
    if(!next||!Number.isFinite(Number(next.threshold))||!Number.isFinite(Number(meta.threshold)))return 100;
    const span=Number(next.threshold)-Number(meta.threshold);
    if(span<=0)return 100;
    return clamp(((Number(score)-Number(meta.threshold))/span)*100,0,100);
  }
  function renderAuthorityPanel(factionId){
    const f=getFaction(factionId);if(!f)return '<p class="subtext">왕권 데이터를 불러올 수 없습니다.</p>';
    const current=BY_ID[f.factionRank]||BY_ID.PROVINCIAL_KING,idx=current.index,score=f.authorityScore,next=RANKS[idx+1]||null;
    const rows=[...RANKS].reverse().map(rank=>{
      const meta=rankMeta(rank)||current;
      const active=meta.index<=idx,currentClass=meta.index===idx?' current':'',progress=progressFor(meta,score,idx);
      return `<article class="authority-rank-card ${active?'active':'locked'}${currentClass}" data-authority-rank="${meta.id}"><div class="authority-seal">${meta.han}</div><div class="authority-rank-copy"><div class="authority-rank-title"><strong>${meta.label}</strong><span>${active?(meta.index<idx?'달성':meta.index===idx?'현재 작위':''):'🔒 잠금'}</span></div><p>${meta.description}</p><div class="authority-progress"><i style="width:${progress.toFixed(1)}%"></i></div><small>${meta.index===idx&&next?`권위 ${score} / ${next.threshold}`:meta.index<idx?`임계 ${meta.threshold} 달성`:meta.index===idx?'최고 작위 달성':`권위 ${meta.threshold} 필요`}</small></div></article>`;
    }).join('');
    return `<section class="authority-panel"><header><div><span>王權 · PRESTIGE</span><h3>왕권</h3></div><div class="authority-total"><small>누적 권위</small><b>${score}</b></div></header><div class="authority-ink-divider"></div><div class="authority-rank-ladder">${rows}</div><div class="authority-source-grid"><span>⚔ 전투 승리 <b>+20</b></span><span>🏗 건설 완료 <b>+10</b></span><span>🏯 수도 증축 <b>+50</b></span></div>${next?`<p class="authority-next">다음 작위 <b>${next.label}</b>까지 권위 <strong>${Math.max(0,next.threshold-score)}</strong></p>`:`<p class="authority-next emperor">皇帝 · 천하통일 챌린지 활성화 · 생존 세력 우호도 매 턴 ${PLAYER_RELATION_DECAY}</p>`}</section>`;
  }

  function mountAuthorityPanel(host,factionId){
    if(!host)return false;
    const html=renderAuthorityPanel(factionId);
    host.insertAdjacentHTML('beforeend',html);
    host.dataset.authorityMounted='1';
    const panel=host.querySelector('.authority-panel:last-of-type');
    if(panel){
      panel.setAttribute('tabindex','-1');
      try{panel.focus({preventScroll:true})}catch(_e){}
    }
    return !!panel;
  }
  function refreshMountedAuthorityPanel(host,factionId){
    if(!host)return false;
    const old=host.querySelector('.authority-panel');
    if(!old)return mountAuthorityPanel(host,factionId);
    const wrap=document.createElement('div');wrap.innerHTML=renderAuthorityPanel(factionId);
    const next=wrap.firstElementChild;if(!next)return false;
    old.replaceWith(next);host.dataset.authorityMounted='1';return true;
  }


  // v76: standalone authority modal. The action sidebar can be re-rendered at any time,
  // so the rank UI lives under <body> and cannot be erased by #orders.innerHTML.
  function ensureAuthorityModal(){
    let modal=document.getElementById('kingdomRankModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='kingdomRankModal';
    modal.className='authority-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`<div class="authority-modal-backdrop" data-authority-close="1"></div><section class="authority-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="kingdomRankModalTitle"><button type="button" class="authority-modal-close" data-authority-close="1" aria-label="왕권 창 닫기">×</button><div class="authority-modal-heading"><span>內政 · 王權</span><h2 id="kingdomRankModalTitle">왕권</h2></div><div id="kingdomRankModalBody" class="authority-modal-body"></div></section>`;
    modal.addEventListener('click',e=>{if(e.target.closest?.('[data-authority-close]'))closeAuthorityModal()});
    document.body.appendChild(modal);
    return modal;
  }
  function closeAuthorityModal(){
    const modal=document.getElementById('kingdomRankModal');
    if(!modal)return false;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden','true');
    return true;
  }
  function authoritySnapshot(factionId){
    const f=getFaction(factionId);
    return f?{factionId:Number(factionId),authorityScore:f.authorityScore,factionRank:f.factionRank}:null;
  }
  function syncAuthoritySnapshot(factionId,data){
    if(!data||typeof data!=='object')return false;
    const f=getFaction(factionId);if(!f)return false;
    if(Number.isFinite(Number(data.authorityScore)))f.authorityScore=Math.max(0,Math.floor(Number(data.authorityScore)));
    if(BY_ID[data.factionRank])f.factionRank=data.factionRank;
    normalizeFaction(f);
    return true;
  }
  async function fetchAuthoritySnapshot(factionId){
    // Optional Java backend endpoint. Static/offline builds simply use the in-memory faction object.
    const configured=global.SAMGUK_AUTHORITY_API_URL;
    if(!configured||typeof fetch!=='function')return authoritySnapshot(factionId);
    const base=String(configured);
    const url=base.includes('{factionId}')?base.replace('{factionId}',encodeURIComponent(factionId)):base.replace(/\/$/,'')+'/'+encodeURIComponent(factionId);
    try{
      const response=await fetch(url,{method:'GET',headers:{Accept:'application/json'},credentials:'same-origin'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=await response.json();
      syncAuthoritySnapshot(factionId,data);
      return authoritySnapshot(factionId);
    }catch(_e){
      return authoritySnapshot(factionId);
    }
  }
  function paintAuthorityModal(factionId){
    const modal=ensureAuthorityModal(),body=modal.querySelector('#kingdomRankModalBody');
    if(!body)return false;
    body.innerHTML=renderAuthorityPanel(factionId);
    return true;
  }
  async function openAuthorityModal(factionId){
    const modal=ensureAuthorityModal();
    // Show synchronously first so a network request can never make the click look broken.
    paintAuthorityModal(factionId);
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('active');
    const close=modal.querySelector('.authority-modal-close');
    try{close?.focus({preventScroll:true})}catch(_e){}
    const snapshot=await fetchAuthoritySnapshot(factionId);
    if(snapshot&&modal.classList.contains('active'))paintAuthorityModal(factionId);
    return true;
  }

  function configureRuntime(api){runtime={...api};for(const f of runtime.getFactions?.()||[])normalizeFaction(f);return publicApi}
  const publicApi={version:77,RANKS,THRESHOLDS:Object.freeze(RANKS.map(r=>r.threshold)),configureRuntime,resetFaction,resetAll,getFaction,getRank,addAuthority,updateFactionRank,onBattleVictory,onBuildingCompleted,onCapitalUpgraded,recruitmentMultiplier,incomeMultiplier,actionBonus,diplomacyDemandBonus,canAppointHighestOffices,emperorChallengeActive,applyEmperorChallengeTurn,renderAuthorityPanel,mountAuthorityPanel,refreshMountedAuthorityPanel,ensureAuthorityModal,openAuthorityModal,closeAuthorityModal,fetchAuthoritySnapshot,showRankUpVfx};
  global.SAMGUK_AUTHORITY=publicApi;
})(window);
