/* 삼국쟁패 v53 - 하단 외교 / Canvas 관계 화살표 / 상호 거래 / RAF 수명주기 최적화 */
(function(){
 'use strict';
 const DEAL={open:false,give:[],request:[],serial:1};
 const RESOURCE_TRADE_TYPES=(window.SAMGUK_RESOURCE_SYSTEM?.tradeableKeys||[]).map(key=>{const d=RESOURCE_TYPES?.[key]||{};return {key,label:`${d.emoji||'◆'} ${d.name||key} 1개`,score:Number(d.tradeScore)||15}});
 const GIVE_ITEMS=[
  {id:'gold10',label:'금 10 지급',type:'gold',amount:10,score:10},
  {id:'gold50',label:'금 50 지급',type:'gold',amount:50,score:42},
  {id:'food20',label:'병량 20 지급',type:'food',amount:20,score:24},
  {id:'troops10',label:'병력 10 지원',type:'troops',amount:10,score:24},
  {id:'tribute',label:'공물 제공 (금 30)',type:'gold',amount:30,score:34},
  ...RESOURCE_TRADE_TYPES.map(r=>({id:`resource_${r.key}`,label:`${r.label} 지급`,type:'resource',resourceKey:r.key,amount:1,score:r.score}))
 ];
 const REQUEST_ITEMS=[
  {id:'nonaggression',label:'불가침 조약',type:'treaty',treaty:'nonaggression',score:24},
  {id:'trade',label:'교역 협정',type:'treaty',treaty:'trade',score:18},
  {id:'alliance',label:'군사 동맹',type:'treaty',treaty:'alliance',score:46},
  {id:'gold30',label:'금 30 공물 요구',type:'targetGold',amount:30,score:34},
  {id:'territory',label:'영토 1곳 양도',type:'territory',score:85},
  {id:'vassal',label:'종속국화 요구',type:'treaty',treaty:'vassal',score:120},
  ...RESOURCE_TRADE_TYPES.map(r=>({id:`target_resource_${r.key}`,label:`${r.label} 요구`,type:'targetResource',resourceKey:r.key,amount:1,score:r.score}))
 ];
 function q(id){return document.getElementById(id)}
 function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
 function key(a,b){return [Number(a),Number(b)].sort((x,y)=>x-y).join(':')}
 function treatyState(a,b){
  const k=key(a,b);TW_DIPLOMACY_UI_STATE.treatiesFallback[k]=TW_DIPLOMACY_UI_STATE.treatiesFallback[k]||{};return TW_DIPLOMACY_UI_STATE.treatiesFallback[k];
 }
 function dipStatus(a,b){
  try{if(typeof wars!=='undefined'&&wars?.[a]?.[b])return {id:'war',label:'전쟁',color:'#FF0000'}}catch(_e){}
  const t=treatyState(a,b);if(t.alliance)return {id:'alliance',label:'동맹',color:'#0000FF'};
  return {id:'neutral',label:'중립',color:'#FFFFFF'};
 }
 function relation(a,b){try{return twDipRelation(a,b)}catch(_e){return 0}}
 function availableTroops(k){return regions.reduce((n,r,i)=>n+(isActiveTerritory(i)&&r.owner===k?Math.max(0,(Number(r.troops)||0)-1):0),0)}
 function targetWeakTerritory(k){return regions.map((r,i)=>({r,i})).filter(x=>isActiveTerritory(x.i)&&x.r.owner===k).sort((a,b)=>(a.r.troops||0)-(b.r.troops||0))[0]?.i??null}
 function countryFoodSafe(k){try{if(typeof countryFood==='function')return countryFood(k)}catch(_e){}return Math.max(0,Number(K[k]?.food)||0)}
 function setFoodSafe(k,v){try{if(typeof setCountryFood==='function')return setCountryFood(k,v)}catch(_e){}K[k].food=Math.max(0,Math.floor(v));return K[k].food}
 function countryGoldSafe(k){try{if(typeof countryGold==='function')return countryGold(k)}catch(_e){}return k===player?gold:Number(K[k]?.gold)||0}
 function setGoldSafe(k,v){try{if(typeof setCountryGold==='function')return setCountryGold(k,v)}catch(_e){}if(k===player)gold=Math.max(0,v);K[k].gold=Math.max(0,v);return K[k].gold}
 function inventoryAmountSafe(k,key){try{return window.SAMGUK_RESOURCE_SYSTEM?.amount?.(k,key)||0}catch(_e){return 0}}
 function transferInventorySafe(from,to,key,amount=1){amount=Math.max(0,Math.floor(Number(amount)||0));if(inventoryAmountSafe(from,key)<amount)return false;window.SAMGUK_RESOURCE_SYSTEM?.consume?.(from,key,amount);window.SAMGUK_RESOURCE_SYSTEM?.add?.(to,key,amount);return true}
 function ensureLayout(){
  const root=q('twDiplomacyOverlay'),shell=root?.querySelector('.tw-dip-shell');if(!root||!shell)return;
  // v62 인물 중심 좌측 패널은 이미 자체 레이아웃을 가진다. 구형 하단 tray로 재배치하지 않는다.
  if(root.dataset.layout==='strategic-left'){ensureCanvas();return;}
  if(!shell.querySelector('.tw-dip-bottom-tray')){
   const p=q('twDipPlayerSide'),c=root.querySelector('.tw-dip-center'),t=q('twDipTargetSide');
   const tray=document.createElement('div');tray.className='tw-dip-bottom-tray';
   if(p)tray.appendChild(p);if(c)tray.appendChild(c);if(t)tray.appendChild(t);
   const note=root.querySelector('.tw-dip-mapnote');shell.insertBefore(tray,note||null);
  }
  ensureCanvas();
 }
 function ensureCanvas(){
  let c=q('twDiplomacyArrowCanvas');
  if(c)return c;
  c=document.createElement('canvas');c.id='twDiplomacyArrowCanvas';c.setAttribute('aria-hidden','true');document.body.appendChild(c);return c;
 }
 function capitalTerritory(k){
  try{const c=CAPITALS.find(i=>regions?.[i]?.owner===k&&isActiveTerritory(i));if(Number.isInteger(c))return c}catch(_e){}
  return regions.findIndex((r,i)=>isActiveTerritory(i)&&r.owner===k);
 }
 function screenPointForFaction(k){
  const id=capitalTerritory(k);if(id<0)return null;
  const el=document.querySelector(`#map [data-id="${id}"]`);if(!el)return null;
  const r=el.getBoundingClientRect();if(!r.width&&!r.height)return null;return {x:r.left+r.width/2,y:r.top+r.height/2};
 }
 const PERF=window.__perfDebug=window.__perfDebug||{fullMapDraws:0,diplomacyFrames:0,activeRaf:0};
 const ARROW_FRAME_MS=1000/30;
 let raf=0,arrowRunning=false,geometryDirty=true,cachedA=null,cachedB=null,lastTarget=null,lastFrame=0;
 function resizeArrowCanvas(){
  const c=ensureCanvas(),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,innerWidth),h=Math.max(1,innerHeight),pw=Math.round(w*dpr),ph=Math.round(h*dpr);
  if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;c.style.width=w+'px';c.style.height=h+'px'}
  return {c,ctx:c.getContext('2d'),dpr,w,h};
 }
 function clearArrowCanvas(){
  const c=q('twDiplomacyArrowCanvas');if(!c)return;const ctx=c.getContext('2d');if(ctx)ctx.clearRect(0,0,c.width,c.height);
 }
 function markArrowGeometryDirty(){geometryDirty=true}
 function refreshArrowGeometry(){
  geometryDirty=false;const t=TW_DIPLOMACY_UI_STATE?.targetFaction;lastTarget=t;
  if(!TW_DIPLOMACY_UI_STATE?.open||!Number.isInteger(t)||t<0){cachedA=cachedB=null;return false}
  cachedA=screenPointForFaction(player);cachedB=screenPointForFaction(t);return !!(cachedA&&cachedB);
 }
 function drawArrow(ctx,a,b,color,time){
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<10)return;
  const nx=-dy/len,ny=dx/len,bend=Math.min(90,Math.max(24,len*.10));
  const cx=(a.x+b.x)/2+nx*bend,cy=(a.y+b.y)/2+ny*bend;
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=3;ctx.shadowColor=color;ctx.shadowBlur=3;ctx.setLineDash([14,10]);ctx.lineDashOffset=-(time*.035)%24;
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx,cy,b.x,b.y);ctx.stroke();ctx.setLineDash([]);
  const t=.985,mt=1-t,x=(mt*mt*a.x)+(2*mt*t*cx)+(t*t*b.x),y=(mt*mt*a.y)+(2*mt*t*cy)+(t*t*b.y);const tx=2*mt*(cx-a.x)+2*t*(b.x-cx),ty=2*mt*(cy-a.y)+2*t*(b.y-cy),ang=Math.atan2(ty,tx),size=12;
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-size*Math.cos(ang-.55),y-size*Math.sin(ang-.55));ctx.lineTo(x-size*Math.cos(ang+.55),y-size*Math.sin(ang+.55));ctx.closePath();ctx.fill();ctx.restore();
 }
 function stopArrowLoop(){
  if(raf){cancelAnimationFrame(raf);raf=0}
  if(arrowRunning){arrowRunning=false;PERF.activeRaf=Math.max(0,(PERF.activeRaf||0)-1)}
  lastFrame=0;cachedA=cachedB=null;geometryDirty=true;const c=q('twDiplomacyArrowCanvas');if(c)c.classList.remove('active');clearArrowCanvas();
 }
 function arrowLoop(time){
  raf=0;
  if(!arrowRunning||!TW_DIPLOMACY_UI_STATE?.open){stopArrowLoop();return}
  if(time-lastFrame>=ARROW_FRAME_MS){
   lastFrame=time;const t=TW_DIPLOMACY_UI_STATE?.targetFaction;if(t!==lastTarget)geometryDirty=true;
   const {c,ctx,dpr,w,h}=resizeArrowCanvas();c.classList.add('active');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   if(geometryDirty)refreshArrowGeometry();
   if(cachedA&&cachedB&&Number.isInteger(t)&&t>=0){
    // v62: 화살표는 우측 외교 지도 viewport 안에서만 보인다.
    const clip=window.SAMGUK_DIPLOMACY_MANAGER?.getMapViewportRect?.();
    ctx.save();
    if(clip&&clip.width>0&&clip.height>0){ctx.beginPath();ctx.rect(clip.left,clip.top,clip.width,clip.height);ctx.clip()}
    drawArrow(ctx,cachedA,cachedB,dipStatus(player,t).color,time);
    ctx.restore();
   }
   PERF.diplomacyFrames=(PERF.diplomacyFrames||0)+1;
  }
  if(arrowRunning)raf=requestAnimationFrame(arrowLoop);
 }
 function startArrowLoop(){
  if(!TW_DIPLOMACY_UI_STATE?.open)return false;ensureCanvas();markArrowGeometryDirty();
  if(arrowRunning)return true;arrowRunning=true;PERF.activeRaf=(PERF.activeRaf||0)+1;raf=requestAnimationFrame(arrowLoop);return true;
 }
 function optionsHtml(items){return items.map(i=>`<option value="${i.id}">${i.label}</option>`).join('')}
 function hasPortTradeCity(k){return regions?.some?.((r,i)=>(typeof isActiveTerritory!=='function'||isActiveTerritory(i))&&r?.owner===Number(k)&&r?.cityType==='port')||false}
 function specialtyTradeValueMultiplier(k){if(!hasPortTradeCity(k))return 1;return Number(window.SAMGUK_PROFESSIONAL_CITY_RULES?.rules?.port?.specialtyTradeValueMultiplier)||1.5}
 function dealItemValue(item,owner){const base=Number(item?.score)||0,isResource=item?.type==='resource'||item?.type==='targetResource';return base*(isResource?specialtyTradeValueMultiplier(owner):1)}
 function itemMarkup(item,side){const owner=side==='give'?player:TW_DIPLOMACY_UI_STATE.targetFaction,portBonus=(item?.type==='resource'||item?.type==='targetResource')&&specialtyTradeValueMultiplier(owner)>1;return `<div class="tw-deal-item"><span>${item.label}${portBonus?' <small>⚓ 교역가치 +50%</small>':''}</span><button type="button" data-deal-remove="${item.uid}" data-deal-side="${side}" title="삭제">×</button></div>`}
 function dealScore(){const t=TW_DIPLOMACY_UI_STATE.targetFaction,give=DEAL.give.reduce((n,x)=>n+dealItemValue(x,player),0),ask=DEAL.request.reduce((n,x)=>n+dealItemValue(x,t),0),rel=relation(player,t),power=Math.max(-25,Math.min(25,(twDipFactionPower(player)-twDipFactionPower(t))/20)),authorityDemand=DEAL.request.some(x=>x.id==='vassal'||x.id==='gold30')?(window.SAMGUK_AUTHORITY?.diplomacyDemandBonus?.(player)||0):0;return Math.round(give-ask+rel*.28+power+authorityDemand)}
 function chanceLabel(s){return s>=20?'매우 높음':s>=5?'높음':s>=-10?'보통':s>=-30?'낮음':'매우 낮음'}
 function canAffordDeal(){for(const i of DEAL.give){if(i.type==='gold'&&countryGoldSafe(player)<i.amount)return false;if(i.type==='food'&&countryFoodSafe(player)<i.amount)return false;if(i.type==='troops'&&availableTroops(player)<i.amount)return false;if(i.type==='resource'&&inventoryAmountSafe(player,i.resourceKey)<i.amount)return false}return true}
 function canTargetAffordRequest(){const t=TW_DIPLOMACY_UI_STATE.targetFaction;for(const i of DEAL.request)if(i.type==='targetResource'&&inventoryAmountSafe(t,i.resourceKey)<i.amount)return false;return true}
 function renderDeal(){
  const p=q('twDipOptionsPanel'),t=TW_DIPLOMACY_UI_STATE.targetFaction;if(!p||!Number.isInteger(t))return;const s=dealScore(),ok=canAffordDeal()&&canTargetAffordRequest();
  p.innerHTML=`<div class="tw-deal-wrap"><div class="tw-deal-head"><div><strong>${K[player].name} ↔ ${K[t].name} 상호 거래</strong><small> · 양측 조건을 추가한 뒤 제안을 보냅니다.</small></div><button type="button" class="tw-deal-back" data-deal-back>← 외교 메뉴</button></div><div class="tw-deal-grid"><section class="tw-deal-side"><h4>내가 상대에게 주는 것</h4><div class="tw-deal-picker"><select id="twDealGiveSelect">${optionsHtml(GIVE_ITEMS)}</select><button class="tw-deal-add" data-deal-add="give">추가</button></div><div class="tw-deal-list">${DEAL.give.length?DEAL.give.map(i=>itemMarkup(i,'give')).join(''):'<div class="tw-deal-empty">지급 조건 없음</div>'}</div></section><section class="tw-deal-center"><h4>거래 조건표</h4><div class="tw-deal-table"><div><div class="tw-deal-col-title">우리 측 양보</div>${DEAL.give.map(i=>itemMarkup(i,'give')).join('')||'<div class="tw-deal-empty">없음</div>'}</div><div class="tw-deal-arrow">⇄</div><div><div class="tw-deal-col-title">상대에게 요구</div>${DEAL.request.map(i=>itemMarkup(i,'request')).join('')||'<div class="tw-deal-empty">없음</div>'}</div></div></section><section class="tw-deal-side"><h4>내가 상대에게 요구하는 것</h4><div class="tw-deal-picker"><select id="twDealRequestSelect">${optionsHtml(REQUEST_ITEMS)}</select><button class="tw-deal-add" data-deal-add="request">추가</button></div><div class="tw-deal-list">${DEAL.request.length?DEAL.request.map(i=>itemMarkup(i,'request')).join(''):'<div class="tw-deal-empty">요구 조건 없음</div>'}</div></section></div><div class="tw-deal-footer"><div class="tw-deal-score">제안 균형 <b>${s>=0?'+':''}${s}</b> · 성사 가능성 ${chanceLabel(s)}${ok?'':' · 거래 자원 부족'}${hasPortTradeCity(player)||hasPortTradeCity(t)?' · ⚓ 해상도시 보유국 특산품 교역가치 +50%':''}</div><button type="button" class="tw-deal-submit" data-deal-submit ${!ok||(!DEAL.give.length&&!DEAL.request.length)?'disabled':''}>제안 보내기</button></div></div>`;
 }
 function addItem(side){const select=q(side==='give'?'twDealGiveSelect':'twDealRequestSelect'),list=side==='give'?GIVE_ITEMS:REQUEST_ITEMS,base=list.find(x=>x.id===select?.value);if(!base)return;(side==='give'?DEAL.give:DEAL.request).push({...base,uid:DEAL.serial++});renderDeal()}
 function removeItem(side,uid){const arr=side==='give'?DEAL.give:DEAL.request;const idx=arr.findIndex(x=>x.uid===Number(uid));if(idx>=0)arr.splice(idx,1);renderDeal()}
 function openDeal(){DEAL.open=true;DEAL.give=[];DEAL.request=[];renderDeal()}
 function payTroops(from,to,amount){try{if(typeof transferSupport==='function')return transferSupport(from,to,amount)}catch(_e){}let left=amount;for(const r of regions){if(r.owner!==from||left<=0)continue;const take=Math.min(left,Math.max(0,(r.troops||0)-1));r.troops-=take;left-=take}const ti=targetWeakTerritory(to);if(ti!==null)regions[ti].troops=(regions[ti].troops||0)+(amount-left);return left===0}
 function applyDeal(){
  const t=TW_DIPLOMACY_UI_STATE.targetFaction,s=dealScore();if(!canAffordDeal()||!canTargetAffordRequest())return notify('거래에 필요한 특산품/자원이 부족합니다.');
  const accepted=s>=-8;if(!accepted){TW_DIPLOMACY_UI_STATE.relationFallback[key(player,t)]=clamp(relation(player,t)-4,-100,100);notify(`${K[t].name}이(가) 제안을 거절했습니다.`);DEAL.open=false;renderTotalWarDiplomacy();return}
  for(const i of DEAL.give){if(i.type==='gold'){setGoldSafe(player,countryGoldSafe(player)-i.amount);setGoldSafe(t,countryGoldSafe(t)+i.amount)}else if(i.type==='food'){setFoodSafe(player,countryFoodSafe(player)-i.amount);setFoodSafe(t,countryFoodSafe(t)+i.amount)}else if(i.type==='troops')payTroops(player,t,i.amount);else if(i.type==='resource')transferInventorySafe(player,t,i.resourceKey,i.amount)}
  const ts=treatyState(player,t);for(const i of DEAL.request){if(i.type==='treaty')ts[i.treaty]=true;else if(i.type==='targetGold'){const paid=Math.min(i.amount,countryGoldSafe(t));setGoldSafe(t,countryGoldSafe(t)-paid);setGoldSafe(player,countryGoldSafe(player)+paid)}else if(i.type==='targetResource')transferInventorySafe(t,player,i.resourceKey,i.amount);else if(i.type==='territory'){const rid=targetWeakTerritory(t);if(rid!==null){regions[rid].owner=player;regions[rid].troops=Math.max(1,Math.floor((regions[rid].troops||1)*.55));log(`🤝 외교 거래로 ${regions[rid].name} 영토를 양도받았습니다.`)}}}
  TW_DIPLOMACY_UI_STATE.relationFallback[key(player,t)]=clamp(relation(player,t)+Math.max(3,Math.round(s/5)), -100,100);if(typeof ap!=='undefined')ap=Math.max(0,ap-1);log(`🤝 ${K[t].name}과(와) 상호 거래가 성사되었습니다.`);notify(`${K[t].name}: 거래 성사`);DEAL.open=false;try{render()}catch(_e){}renderTotalWarDiplomacy();
 }
 const baseRender=window.renderTotalWarDiplomacy;
 window.renderTotalWarDiplomacy=function(){ensureLayout();baseRender();const t=TW_DIPLOMACY_UI_STATE.targetFaction;if(Number.isInteger(t)&&t>=0){const status=dipStatus(player,t),rel=q('twDipOptionsPanel')?.querySelector('.tw-dip-relation strong');if(rel)rel.insertAdjacentHTML('afterend',`<span class="tw-dip-status-chip" style="--status-color:${status.color}"><i class="tw-dip-status-dot"></i>${status.label}</span>`)}if(DEAL.open)renderDeal();markArrowGeometryDirty();if(TW_DIPLOMACY_UI_STATE?.open)startArrowLoop()};
 const baseOpen=window.openTotalWarDiplomacy;
 window.openTotalWarDiplomacy=function(){const result=baseOpen();markArrowGeometryDirty();startArrowLoop();return result};
 const baseSelect=window.selectTotalWarDiplomacyFaction;
 window.selectTotalWarDiplomacyFaction=function(k){DEAL.open=false;const result=baseSelect(k);markArrowGeometryDirty();return result};
 const baseClose=window.closeTotalWarDiplomacy;
 window.closeTotalWarDiplomacy=function(){DEAL.open=false;const result=baseClose();stopArrowLoop();return result};
 const baseExec=window.executeTotalWarDiplomacyAction;
 window.executeTotalWarDiplomacyAction=function(id){if(id==='demand'){openDeal();return}return baseExec(id)};
 const demand=TW_DIPLOMACY_ACTIONS.find(x=>x.id==='demand');if(demand){demand.name='요구 제안';demand.desc='금·병량·병력·특산품 재고와 조약·영토·종속 조건을 조합해 상호 거래를 제안합니다.';demand.icon='議'}
 document.addEventListener('click',e=>{if(!TW_DIPLOMACY_UI_STATE?.open)return;const add=e.target.closest('[data-deal-add]');if(add){addItem(add.dataset.dealAdd);return}const rem=e.target.closest('[data-deal-remove]');if(rem){removeItem(rem.dataset.dealSide,rem.dataset.dealRemove);return}if(e.target.closest('[data-deal-back]')){DEAL.open=false;renderTotalWarDiplomacy();return}if(e.target.closest('[data-deal-submit]'))applyDeal()});
 window.addEventListener('resize',()=>{if(arrowRunning){resizeArrowCanvas();markArrowGeometryDirty()}},{passive:true});
 document.addEventListener('samguk:map-view-changed',()=>{if(arrowRunning)markArrowGeometryDirty()});
 document.addEventListener('samguk:map-rendered',()=>{if(arrowRunning)markArrowGeometryDirty()});
 document.addEventListener('samguk:map-state-updated',()=>{if(arrowRunning)markArrowGeometryDirty()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopArrowLoop();else if(TW_DIPLOMACY_UI_STATE?.open)startArrowLoop()});
 ensureLayout();stopArrowLoop();
 window.SAMGUK_DIPLOMACY_TRADE={version:53,state:DEAL,status:dipStatus,openDeal,renderDeal,startArrowLoop,stopArrowLoop,markArrowGeometryDirty,isArrowRunning:()=>arrowRunning};
})();

/* ============================================================================
 * 삼국쟁패 v100 — 제후국 / 복속 / 신임도 / 종주국 빗금 패치
 * - 기존 DiplomacyTradeSystem.js 위에 추가되는 호환 레이어
 * - 별도 gameState를 만들지 않고 현재 런타임의 K / regions / TW_DIPLOMACY_UI_STATE 재사용
 * - 저장 호환: K[target].overlordId / tributeFavor + regions[].overlordId는 기존 세이브 스냅샷에 자동 포함
 * ========================================================================== */
(function(global){
 'use strict';

 const FAVOR_MAX=100;
 const TRIBUTE_FAVOR_COST=25;
 const TRIBUTE_GOLD=30;
 const POWER_RATIO_REQUIRED=8;
 const RELATION_REQUIRED=90;
 const STYLE_ID='samgukVassalAnnexStyle';

 const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
 const isFaction=id=>Number.isInteger(Number(id))&&Number(id)>=0&&Array.isArray(K)&&Number(id)<K.length&&!!K[Number(id)];
 const factionCount=id=>{try{return count(Number(id))}catch(_e){return regions.filter((r,i)=>r&&r.owner===Number(id)&&(typeof isActiveTerritory!=='function'||isActiveTerritory(i))).length}};
 const pairKey=(a,b)=>{try{return twDipPairKey(a,b)}catch(_e){return [Number(a),Number(b)].sort((x,y)=>x-y).join(':')}};
 const diplomacyState=()=>{try{return TW_DIPLOMACY_UI_STATE}catch(_e){return global.SAMGUK_DIPLOMACY_UI?.state||null}};

 function relationValue(a,b){
  try{if(typeof twDipRelation==='function')return clamp(twDipRelation(a,b),-100,100)}catch(_e){}
  try{if(typeof relations!=='undefined')return clamp(relations?.[Number(a)]?.[Number(b)]||0,-100,100)}catch(_e){}
  return 0;
 }

 function activeTerritories(factionId){
  const k=Number(factionId),out=[];
  for(let i=0;i<regions.length;i++){
   if(typeof isActiveTerritory==='function'&&!isActiveTerritory(i))continue;
   if(regions[i]?.owner===k)out.push(i);
  }
  return out;
 }

 // 사용자 지정 국력식: 영토 수*100 + 총 병력 + 턴당 수입/10
 function calculateNationalPower(factionId){
  const k=Number(factionId);if(!isFaction(k))return 0;
  const lands=activeTerritories(k);
  const territoryPower=lands.length*100;
  const troopPower=lands.reduce((sum,id)=>sum+Math.max(0,Number(regions[id]?.troops)||0),0);
  let income=0;
  for(const id of lands){
   try{if(typeof territoryIncome==='function'){income+=Math.max(0,Number(territoryIncome(id))||0);continue}}catch(_e){}
   income+=Math.max(0,Number(regions[id]?.income)||0);
  }
  if(income<=0)income=Math.max(0,Number(K[k]?.goldIncome)||0);
  return Math.round(territoryPower+troopPower+Math.floor(income/10));
 }

 function vassalOverlord(targetId){
  const t=Number(targetId);if(!isFaction(t))return null;

  // HOTFIX v102:
  // null / undefined / '' 를 Number()에 바로 넣으면 0으로 변환된다.
  // 그 결과 독립국(overlordId=null)이 0번 세력의 제후국으로 오판정되는 치명적 버그가 발생한다.
  const rawOverlord=K[t]?.overlordId;
  if(rawOverlord===null||rawOverlord===undefined||rawOverlord==='')return null;

  const o=Number(rawOverlord);
  return Number.isInteger(o)&&o>=0&&o<K.length&&o!==t?o:null;
 }

 function getTreaty(a,b,create=true){
  const state=diplomacyState();if(!state)return null;
  state.treatiesFallback=state.treatiesFallback||{};
  const key=pairKey(a,b);
  if(create)state.treatiesFallback[key]=state.treatiesFallback[key]||{};
  return state.treatiesFallback[key]||null;
 }

 function setTreatyVassal(overlordId,targetId,favor){
  const treaty=getTreaty(overlordId,targetId,true);if(!treaty)return;
  treaty.vassal=true;treaty.overlordId=Number(overlordId);treaty.vassalId=Number(targetId);treaty.tributeFavor=clamp(favor,0,FAVOR_MAX);
 }

 function clearTreatyVassal(overlordId,targetId){
  const treaty=getTreaty(overlordId,targetId,false);if(!treaty)return;
  delete treaty.vassal;delete treaty.overlordId;delete treaty.vassalId;delete treaty.tributeFavor;
 }

 function setVassalState(overlordId,targetId,favor=FAVOR_MAX){
  const o=Number(overlordId),t=Number(targetId);
  if(!isFaction(o)||!isFaction(t)||o===t||factionCount(t)<=0)return false;
  const previous=vassalOverlord(t);if(previous!==null&&previous!==o)clearTreatyVassal(previous,t);
  K[t].isVassal=true;K[t].overlordId=o;K[t].tributeFavor=clamp(favor,0,FAVOR_MAX);
  setTreatyVassal(o,t,K[t].tributeFavor);
  syncVassalTerritoryFlags();
  scheduleVassalMapStyling();
  return true;
 }

 function clearVassalState(targetId){
  const t=Number(targetId);if(!isFaction(t))return false;
  const old=vassalOverlord(t);if(old!==null)clearTreatyVassal(old,t);
  K[t].isVassal=false;K[t].overlordId=null;K[t].tributeFavor=0;
  for(const r of regions)if(r?.owner===t)r.overlordId=null;
  return true;
 }

 function clearAllVassalState(){
  if(Array.isArray(K))for(let i=0;i<K.length;i++){
   if(!K[i])continue;K[i].isVassal=false;K[i].overlordId=null;K[i].tributeFavor=0;
  }
  if(Array.isArray(regions))for(const r of regions)if(r)r.overlordId=null;
  const state=diplomacyState();if(state?.treatiesFallback){
   for(const treaty of Object.values(state.treatiesFallback))if(treaty){delete treaty.vassal;delete treaty.overlordId;delete treaty.vassalId;delete treaty.tributeFavor}
  }
 }

 function syncVassalTerritoryFlags(){
  if(!Array.isArray(K)||!Array.isArray(regions))return;
  for(let i=0;i<K.length;i++){
   const f=K[i];if(!f)continue;
   const o=vassalOverlord(i);
   if(o===null)continue;
   if(factionCount(i)<=0||factionCount(o)<=0){clearVassalState(i);continue}
   f.isVassal=true;f.tributeFavor=clamp(f.tributeFavor??FAVOR_MAX,0,FAVOR_MAX);setTreatyVassal(o,i,f.tributeFavor);
  }
  for(let i=0;i<regions.length;i++){
   const r=regions[i];if(!r)continue;
   const o=vassalOverlord(r.owner);
   r.overlordId=o===null?null:o;
  }
 }

 // 기존 v53 거래에서 treaty.vassal=true만 기록된 경우 방향성을 현재 플레이어→선택 국가로 보완한다.
 function hydrateAcceptedVassalTreaty(){
  const state=diplomacyState();if(!state?.treatiesFallback)return false;
  const currentTarget=Number(state.targetFaction);
  let changed=false;
  for(const [key,treaty] of Object.entries(state.treatiesFallback)){
   if(!treaty?.vassal)continue;
   if(isFaction(treaty.overlordId)&&isFaction(treaty.vassalId)){
    const t=Number(treaty.vassalId),o=Number(treaty.overlordId);
    if(vassalOverlord(t)!==o){K[t].isVassal=true;K[t].overlordId=o;K[t].tributeFavor=clamp(treaty.tributeFavor??FAVOR_MAX,0,FAVOR_MAX);changed=true}
    continue;
   }
   const ids=key.split(':').map(Number).filter(Number.isInteger);
   if(ids.length!==2)continue;
   let o=null,t=null;
   if(ids.includes(Number(player))&&ids.includes(currentTarget)&&currentTarget!==Number(player)){o=Number(player);t=currentTarget}
   else{
    const marked=ids.find(id=>vassalOverlord(id)!==null);
    if(marked!==undefined){t=marked;o=vassalOverlord(marked)}
   }
   if(isFaction(o)&&isFaction(t)&&o!==t){K[t].isVassal=true;K[t].overlordId=o;K[t].tributeFavor=clamp(treaty.tributeFavor??FAVOR_MAX,0,FAVOR_MAX);setTreatyVassal(o,t,K[t].tributeFavor);changed=true}
  }
  if(changed)syncVassalTerritoryFlags();
  return changed;
 }

 function canAnnexFaction(attackerId,targetId){
  const a=Number(attackerId),t=Number(targetId),attackerPower=calculateNationalPower(a),targetPower=calculateNationalPower(t);
  const relation=relationValue(a,t),powerRatio=attackerPower/Math.max(targetPower,1);
  const isFriendly=relation>=RELATION_REQUIRED;
  const isPowerDominant=powerRatio>=POWER_RATIO_REQUIRED;
  return {canAnnex:isFaction(a)&&isFaction(t)&&a!==t&&factionCount(t)>0&&isFriendly&&isPowerDominant,powerRatio:powerRatio.toFixed(1),relation,isFriendly,isPowerDominant,attackerPower,targetPower};
 }

 function countryGoldRead(k){
  try{if(typeof countryGold==='function')return Math.max(0,Number(countryGold(Number(k)))||0)}catch(_e){}
  try{if(Number(k)===Number(player))return Math.max(0,Number(gold)||0)}catch(_e){}
  return Math.max(0,Number(K?.[Number(k)]?.gold)||0);
 }
 function countryGoldWrite(k,value){
  const id=Number(k),v=Math.max(0,Number(value)||0);
  try{if(typeof setCountryGold==='function'){setCountryGold(id,v);return v}}catch(_e){}
  try{if(id===Number(player))gold=v}catch(_e){}
  if(K?.[id])K[id].gold=v;return v;
 }

 function absorbTargetOfficers(overlordId,targetId,targetTerritoryIds){
  try{
   if(typeof OFFICERS==='undefined'||!Array.isArray(OFFICERS))return 0;
   const lands=new Set(targetTerritoryIds||[]),rows=OFFICERS.filter(o=>{
    if(!o||o.status==='dead'||o.status==='captured')return false;
    if(Number(o.nationId)===Number(targetId))return true;
    return lands.has(Number(o.territoryId));
   });
   for(const o of rows){
    o.nationId=Number(overlordId);
    if(o.office==='king'||o.isRuler===true||o.role==='군주'){
     o.office='general';o.characterClass='general';o.isRuler=false;o.role='장수';o.title='귀순 장수';o.salary=10;
    }
    o.loyalty=Math.max(40,Math.min(100,Number(o.loyalty)||55));
   }
   try{if(typeof rebuildOfficerTerritoryIndex==='function')rebuildOfficerTerritoryIndex()}catch(_e){}
   try{if(typeof rebuildOfficerTerritoryState==='function')rebuildOfficerTerritoryState()}catch(_e){}
   return rows.length;
  }catch(_e){return 0}
 }

 function executeAnnexation(overlordId,targetId){
  const o=Number(overlordId),t=Number(targetId),check=canAnnexFaction(o,t);
  if(!check.canAnnex)return false;
  const targetName=K[t]?.name||'상대국',lands=activeTerritories(t),targetGold=countryGoldRead(t),targetVassals=[];
  for(let i=0;i<K.length;i++)if(vassalOverlord(i)===t&&i!==o)targetVassals.push(i);
  const officerCount=absorbTargetOfficers(o,t,lands);

  for(const id of lands){regions[id].owner=o;regions[id].overlordId=null}
  countryGoldWrite(t,0);countryGoldWrite(o,countryGoldRead(o)+targetGold);
  clearVassalState(t);
  for(const child of targetVassals)setVassalState(o,child,K[child]?.tributeFavor??FAVOR_MAX);

  try{if(typeof wars!=='undefined')for(let i=0;i<K.length;i++){if(wars[t])wars[t][i]=false;if(wars[i])wars[i][t]=false}}catch(_e){}
  try{if(typeof cleanWars==='function')cleanWars()}catch(_e){}
  try{if(typeof log==='function')log(`👑 ${targetName} 복속 완료 · 영토 ${lands.length}곳 · 국고 ${Math.floor(targetGold)}금 · 장수 ${officerCount}명 흡수`)}catch(_e){}
  try{if(typeof notify==='function')notify(`${targetName}이(가) 완전히 복속되었습니다.`)}catch(_e){}

  const state=diplomacyState();if(state&&Number(state.targetFaction)===t){
   state.targetFaction=K.findIndex((_,i)=>i!==Number(player)&&factionCount(i)>0&&(typeof isDiplomaticFaction!=='function'||isDiplomaticFaction(i)));
  }
  try{if(typeof render==='function')render()}catch(_e){}
  try{global.SAMGUK_VISIBILITY?.refreshAll?.({forceOverlay:true})}catch(_e){}
  try{if(typeof checkEnd==='function')checkEnd()}catch(_e){}
  try{if(typeof global.renderTotalWarDiplomacy==='function'&&state?.open)global.renderTotalWarDiplomacy()}catch(_e){}
  scheduleVassalMapStyling();
  return true;
 }

 function demandVassalTribute(targetId){
  const t=Number(targetId),o=Number(player);
  if(!isFaction(t)||vassalOverlord(t)!==o){try{notify('자국 제후국에게만 자원을 요구할 수 있습니다.')}catch(_e){}return false}
  const favor=clamp(K[t].tributeFavor??0,0,FAVOR_MAX);
  if(favor<TRIBUTE_FAVOR_COST){try{notify(`종주국 신임도가 부족합니다. (${TRIBUTE_FAVOR_COST} 필요)`)}catch(_e){}return false}
  const available=countryGoldRead(t);if(available<=0){try{notify(`${K[t].name}의 국고가 비어 있습니다.`)}catch(_e){}return false}
  const paid=Math.min(TRIBUTE_GOLD,available);
  countryGoldWrite(t,available-paid);countryGoldWrite(o,countryGoldRead(o)+paid);
  K[t].tributeFavor=clamp(favor-TRIBUTE_FAVOR_COST,0,FAVOR_MAX);setTreatyVassal(o,t,K[t].tributeFavor);
  try{if(typeof log==='function')log(`貢 ${K[t].name} 제후국에 공물 요구 · ${paid}금 확보 · 신임도 -${TRIBUTE_FAVOR_COST}`)}catch(_e){}
  try{if(typeof notify==='function')notify(`${K[t].name}에서 ${paid}금을 공물로 받았습니다.`)}catch(_e){}
  try{if(typeof render==='function')render()}catch(_e){}
  try{if(typeof global.renderTotalWarDiplomacy==='function')global.renderTotalWarDiplomacy()}catch(_e){}
  return true;
 }

 function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
  #map:not(.terrain-mode) .territory-shape.samguk-vassal-territory>path,
  body.tw-diplomacy-strategic-open #map .territory-shape.samguk-vassal-territory>path{
   fill:var(--samguk-vassal-fill)!important;
   stroke:var(--samguk-vassal-stroke,#e8d08b)!important;
   stroke-width:2.2!important;
  }
  .samguk-vassal-actions{margin-top:10px;padding:10px;border:1px solid #6f6241;background:linear-gradient(180deg,#211d16e8,#111612e8);box-shadow:inset 0 0 18px #0005}
  .samguk-vassal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}.samguk-vassal-head b{color:#efd590}.samguk-vassal-head small{color:#9ba9a1;text-align:right;line-height:1.4}
  .samguk-favor-row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin:8px 0;color:#c9d3cd;font-size:11px}.samguk-favor-bar{height:7px;background:#28302c;overflow:hidden;border:1px solid #454d45}.samguk-favor-bar i{display:block;height:100%;background:linear-gradient(90deg,#8e4f45,#d2aa4b,#66b88a)}
  .samguk-vassal-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px}.samguk-vassal-buttons button{min-height:48px;border:1px solid #6c6042;background:#1a1d18;color:#eadbad;padding:8px;font-size:11px;text-align:left}.samguk-vassal-buttons button:hover:not(:disabled){border-color:#d5b35f;background:#2a2418}.samguk-vassal-buttons button:disabled{opacity:.42;cursor:not-allowed}.samguk-vassal-buttons button strong{display:block;font-size:12px;color:#f0dda8;margin-bottom:3px}.samguk-vassal-note{margin:7px 0 0;color:#83948b;font-size:10px;line-height:1.45}
  @media(max-width:980px){.samguk-vassal-buttons{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
 }

 function ensureVassalPattern(svg,ownerId,overlordId){
  if(!svg||!isFaction(ownerId)||!isFaction(overlordId))return null;
  let defs=svg.querySelector(':scope > defs');if(!defs){defs=document.createElementNS('http://www.w3.org/2000/svg','defs');svg.insertBefore(defs,svg.firstChild)}
  const id=`samguk-vassal-pattern-${ownerId}-${overlordId}`;let pattern=document.getElementById(id);if(pattern)return id;
  pattern=document.createElementNS('http://www.w3.org/2000/svg','pattern');pattern.setAttribute('id',id);pattern.setAttribute('width','18');pattern.setAttribute('height','18');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('patternTransform','rotate(45)');
  const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x','0');rect.setAttribute('y','0');rect.setAttribute('width','18');rect.setAttribute('height','18');rect.setAttribute('fill',K[ownerId]?.color||'#777');rect.setAttribute('fill-opacity','.78');
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1','0');line.setAttribute('y1','0');line.setAttribute('x2','0');line.setAttribute('y2','18');line.setAttribute('stroke',K[overlordId]?.color||'#f0d27a');line.setAttribute('stroke-width','7');line.setAttribute('stroke-opacity','.76');
  const line2=line.cloneNode();line2.setAttribute('x1','18');line2.setAttribute('x2','18');
  pattern.append(rect,line,line2);defs.appendChild(pattern);return id;
 }

 function applyVassalMapStyling(){
  ensureStyle();hydrateAcceptedVassalTreaty();syncVassalTerritoryFlags();
  const svg=document.getElementById('map');if(!svg)return false;
  document.querySelectorAll('#map .territory-shape[data-id]').forEach(group=>{
   const id=Number(group.dataset.id),r=regions?.[id],owner=Number(r?.owner),rawOverlord=r?.overlordId,pass=group.classList.contains('pass-territory');

   // HOTFIX: null/undefined/빈 값은 Number(...)로 변환하지 않는다.
   // Number(null) === 0 때문에 독립 영토가 0번 세력의 제후국처럼 판정되는 현상을 방지한다.
   const hasExplicitOverlord=rawOverlord!==null&&rawOverlord!==undefined&&rawOverlord!=='';
   const overlord=hasExplicitOverlord?Number(rawOverlord):null;
   const valid=!pass&&
    isFaction(owner)&&
    hasExplicitOverlord&&
    Number.isInteger(overlord)&&
    isFaction(overlord)&&
    overlord!==owner&&
    vassalOverlord(owner)===overlord;

   if(!valid){
    group.classList.remove('samguk-vassal-territory');
    group.style.removeProperty('--samguk-vassal-fill');
    group.style.removeProperty('--samguk-vassal-stroke');
    return;
   }

   const patternId=ensureVassalPattern(svg,owner,overlord);if(!patternId)return;
   group.classList.add('samguk-vassal-territory');
   group.style.setProperty('--samguk-vassal-fill',`url(#${patternId})`);
   group.style.setProperty('--samguk-vassal-stroke',K[overlord]?.color||'#e8d08b');
  });
  return true;
 }

 let styleRaf=0;
 function scheduleVassalMapStyling(){if(styleRaf)return;styleRaf=requestAnimationFrame(()=>{styleRaf=0;applyVassalMapStyling()})}

 function renderVassalControls(){
  const panel=document.getElementById('twDipOptionsPanel'),state=diplomacyState();if(!panel||!state||panel.querySelector('.tw-deal-wrap'))return;
  panel.querySelector('.samguk-vassal-actions')?.remove();
  const t=Number(state.targetFaction),o=Number(player);if(!isFaction(t)||t===o||factionCount(t)<=0)return;
  const check=canAnnexFaction(o,t),isSubject=vassalOverlord(t)===o,favor=clamp(K[t]?.tributeFavor??0,0,FAVOR_MAX),foreignOverlord=vassalOverlord(t);
  const card=document.createElement('section');card.className='samguk-vassal-actions';
  const annexReason=check.canAnnex?'조건 충족 · 즉시 완전 복속 가능':`국력 ${check.powerRatio}배 / ${POWER_RATIO_REQUIRED.toFixed(1)}배 필요 · 우호도 ${Math.round(check.relation)} / ${RELATION_REQUIRED} 필요`;
  const blockedByForeign=foreignOverlord!==null&&foreignOverlord!==o;
  card.innerHTML=`<div class="samguk-vassal-head"><b>${isSubject?'제후국 통제':'복속 조건'}</b><small>자국 ${check.attackerPower.toLocaleString()} / 상대 ${check.targetPower.toLocaleString()}</small></div>${isSubject?`<div class="samguk-favor-row"><span>종주국 신임도</span><div class="samguk-favor-bar"><i style="width:${favor}%"></i></div><b>${favor} / ${FAVOR_MAX}</b></div>`:''}<div class="samguk-vassal-buttons"><button type="button" data-samguk-annex="${t}" ${!check.canAnnex||blockedByForeign?'disabled':''}><strong>👑 복속 요청</strong>${blockedByForeign?'다른 종주국에 종속됨':annexReason}</button>${isSubject?`<button type="button" data-samguk-vassal-tribute="${t}" ${favor<TRIBUTE_FAVOR_COST||countryGoldRead(t)<=0?'disabled':''}><strong>貢 제후국 자원 요구</strong>금 ${TRIBUTE_GOLD} 요구 · 신임도 -${TRIBUTE_FAVOR_COST}</button>`:'<button type="button" disabled><strong>臣 제후국 관리</strong>거래의 ‘종속국화 요구’ 성공 시 활성화</button>'}</div><p class="samguk-vassal-note">완전 복속 조건: 국력 8배 이상 + 우호도 90 이상. 제후국은 본래 국색 위에 종주국 색 빗금으로 표시됩니다.</p>`;
  panel.appendChild(card);
 }

 function refreshVassalStatusChip(){
  const state=diplomacyState(),t=Number(state?.targetFaction);if(!isFaction(t))return;
  const subjectOf=vassalOverlord(t);if(subjectOf===null)return;
  const chip=document.querySelector('#twDipOptionsPanel .tw-dip-status-chip');
  if(chip&&subjectOf===Number(player)){chip.style.setProperty('--status-color',K[player]?.color||'#d4af37');chip.innerHTML='<i class="tw-dip-status-dot"></i>제후국'}
 }

 // 현재 외교 렌더 함수 가장 바깥에 연결: 기존 거래 UI를 보존하면서 제후국 UI만 후첨한다.
 const previousDiplomacyRender=global.renderTotalWarDiplomacy;
 if(typeof previousDiplomacyRender==='function')global.renderTotalWarDiplomacy=function(){
  const result=previousDiplomacyRender.apply(this,arguments);
  hydrateAcceptedVassalTreaty();renderVassalControls();refreshVassalStatusChip();scheduleVassalMapStyling();return result;
 };

 // 새 게임/초기화 시 모든 국가는 반드시 독립 상태에서 시작한다.
 // resetDiplomacy() 내부가 외교 데이터를 다시 만들 수 있으므로, 기존 초기화가 끝난 '뒤'에
 // 제후국 플래그·종주국 ID·신임도·영토 overlordId·treaty.vassal을 한 번 더 제거한다.
 const previousResetDiplomacy=global.resetDiplomacy;
 if(typeof previousResetDiplomacy==='function')global.resetDiplomacy=function(){
  const result=previousResetDiplomacy.apply(this,arguments);
  clearAllVassalState();
  scheduleVassalMapStyling();
  return result;
 };

 document.addEventListener('click',event=>{
  const annex=event.target.closest?.('[data-samguk-annex]');if(annex){event.preventDefault();event.stopPropagation();const t=Number(annex.dataset.samgukAnnex),check=canAnnexFaction(Number(player),t);if(!check.canAnnex){try{notify(`복속 조건 미충족 · 국력 ${check.powerRatio}배 / 우호도 ${Math.round(check.relation)}`)}catch(_e){}return}executeAnnexation(Number(player),t);return}
  const tribute=event.target.closest?.('[data-samguk-vassal-tribute]');if(tribute){event.preventDefault();event.stopPropagation();demandVassalTribute(Number(tribute.dataset.samgukVassalTribute));return}
 },true);

 document.addEventListener('samguk:map-rendered',scheduleVassalMapStyling,{passive:true});
 document.addEventListener('samguk:map-state-updated',scheduleVassalMapStyling,{passive:true});
 document.addEventListener('samguk:diplomacy-target-changed',()=>{renderVassalControls();refreshVassalStatusChip();scheduleVassalMapStyling()},{passive:true});

 // 외부 디버깅/향후 패치 연동용 API
 global.calculateNationalPower=calculateNationalPower;
 global.canAnnexFaction=canAnnexFaction;
 global.executeAnnexation=executeAnnexation;
 global.demandVassalTribute=demandVassalTribute;
 global.SAMGUK_VASSAL_ANNEX={version:102,calculateNationalPower,canAnnexFaction,setVassalState,clearVassalState,executeAnnexation,demandVassalTribute,applyVassalMapStyling,syncVassalTerritoryFlags};

 // 스크립트 최초 로드 시(국가 선택/새 게임 시작 전)에도 하드코딩·이전 런타임 값 때문에
 // 임의의 국가가 제후국으로 판정되지 않도록 전 국가를 독립 상태로 정규화한다.
 // 저장 불러오기는 resetDiplomacy()를 호출하지 않으므로 저장된 K/regions의 제후국 정보는 복원 가능하다.
 ensureStyle();
 try{
  if(typeof playing==='undefined'||!playing)clearAllVassalState();
  else{hydrateAcceptedVassalTreaty();syncVassalTerritoryFlags()}
 }catch(_e){clearAllVassalState()}
 scheduleVassalMapStyling();
})(window);
