'use strict';
const K=[{"name":"고구려","color":"#b75c63","symbol":"高","desc":"만주와 한반도의 강국"},{"name":"백제","color":"#c99b3e","symbol":"百","desc":"서남부의 왕국"},{"name":"신라","color":"#407fa8","symbol":"新","desc":"한반도 동남부의 왕국"},{"name":"가야","color":"#43816b","symbol":"伽","desc":"남쪽의 연맹"},{"name":"유연","color":"#bd8246","symbol":"柔","desc":"북서쪽의 초원 세력"},{"name":"거란","color":"#9666a6","symbol":"契","desc":"대륙의 동북 변경"},{"name":"부여","color":"#72a056","symbol":"扶","desc":"북방의 옛 왕국"},{"name":"읍루","color":"#399f98","symbol":"挹","desc":"동북쪽의 세력"},{"name":"북연","color":"#b8778d","symbol":"北","desc":"요서의 세력"},{"name":"남연","color":"#b49745","symbol":"南","desc":"서해 건너의 세력"},{"name":"동진","color":"#6676b0","symbol":"晉","desc":"대륙 남쪽의 세력"},{"name":"왜","color":"#c26948","symbol":"倭","desc":"바다 건너 열도 세력"},{"name":"탐라","color":"#4388a2","symbol":"耽","desc":"남쪽 바다의 섬"},{"name":"우산","color":"#8360b0","symbol":"于","desc":"동쪽 바다의 섬"}];
const WAKO_CONFIG=window.SAMGUK_WAKO_CONFIG||{name:'왜구',symbol:'구',spriteKey:'구',color:'#8a6246',desc:'해상 약탈 독립 세력',baseTerritoryId:100,seaAttackMultiplier:1.5,lootGold:50,growthMultiplier:1.3,diplomatic:false,selectable:false};
const WAKO_ID=K.length;window.SAMGUK_WAKO_ID=WAKO_ID;K.push({name:WAKO_CONFIG.name,color:WAKO_CONFIG.color,symbol:WAKO_CONFIG.symbol,spriteKey:WAKO_CONFIG.spriteKey||WAKO_CONFIG.symbol||'구',desc:WAKO_CONFIG.desc,specialFaction:'wako',diplomatic:false,selectable:false});
if(WORLD.territories?.[WAKO_CONFIG.baseTerritoryId])WORLD.territories[WAKO_CONFIG.baseTerritoryId].home=WAKO_ID;
function isWakoFaction(k){return Number(k)===WAKO_ID}
function isDiplomaticFaction(k){return !isWakoFaction(k)}
const seeds=WORLD.territories.map(r=>[r.name,r.x,r.y,r.home]);
const neighbors=WORLD.neighbors;
// Manual land adjacency correction: 웅진 서부 (9) ↔ 삼년산성 (65).
// This reuses WORLD.neighbors so attack/support/siege/AI/supply all see the same connection.
const TERRITORY_WOONGJIN_WEST=9;
const TERRITORY_SAMNYEONSANSEONG=65;
const MANUAL_ADJACENCY=[[TERRITORY_WOONGJIN_WEST,TERRITORY_SAMNYEONSANSEONG]];
for(const [a,b] of MANUAL_ADJACENCY){
 if(Array.isArray(neighbors[a])&&Array.isArray(neighbors[b])){
  if(!neighbors[a].includes(b))neighbors[a].push(b);
  if(!neighbors[b].includes(a))neighbors[b].push(a);
 }
}
// Stable-ID water conversion: keep the old territory slot as a non-playable sea mask.
const INACTIVE_TERRITORIES=new Set(WORLD.territories.map((t,i)=>t?.inactive?i:-1).filter(i=>i>=0));
function isActiveTerritory(i){return Number.isInteger(i)&&i>=0&&i<WORLD.territories.length&&!INACTIVE_TERRITORIES.has(i)}
function isPassTerritory(i){return !!(WORLD.territories?.[Number(i)]?.isPass||window.SAMGUK_SHANHAIGUAN?.isPassTerritory?.(Number(i)))}
for(const dead of INACTIVE_TERRITORIES){
 if(Array.isArray(neighbors[dead]))neighbors[dead].length=0;
 for(const list of neighbors)if(Array.isArray(list)){const at=list.indexOf(dead);if(at>=0)list.splice(at,1)}
}
const TOTAL=seeds.reduce((n,_,i)=>n+(isActiveTerritory(i)?1:0),0);
const seaRoutes=new Set(WORLD.seaRoutes.map(p=>p.join('-')));
// v64: 중간 정박 상태는 제거하되, 모든 기존 해상 연결은 일반 인접 경로처럼 직접 통과 가능해야 한다.
// WORLD.neighbors에 누락된 해상 연결도 런타임 인접 그래프에 보강하여 바다 이동 기능 자체는 보존한다.
for(const [a,b] of WORLD.seaRoutes){
 if(isActiveTerritory(a)&&isActiveTerritory(b)&&Array.isArray(neighbors[a])&&Array.isArray(neighbors[b])){
  if(!neighbors[a].includes(b))neighbors[a].push(b);
  if(!neighbors[b].includes(a))neighbors[b].push(a);
 }
}
function isSeaRoute(i,j){return seaRoutes.has([i,j].sort((a,b)=>a-b).join('-'))}
function canMoveSeaRoute(i,j){
 const a=Number(i),b=Number(j);
 if(!Number.isInteger(a)||!Number.isInteger(b)||a===b)return false;
 if(!isActiveTerritory(a)||!isActiveTerritory(b))return false;
 return isSeaRoute(a,b)&&Array.isArray(neighbors[a])&&neighbors[a].includes(b);
}
window.canMoveSeaRoute=canMoveSeaRoute;
window.SAMGUK_SEA_ROUTE_GRAPH=Object.freeze({canMoveSeaRoute,isSeaRoute,neighborsOf:i=>Array.isArray(neighbors?.[Number(i)])?neighbors[Number(i)].slice():[]});
K.forEach((k,i)=>{k.color=['#de4052', '#e7ac20', '#2187d6', '#258653', '#e57c2f', '#874acf', '#89af32', '#21a6a1', '#e86f9f', '#b39742', '#5968c9', '#c45125', '#17657f', '#b148af'][i]||k.color||'#6b2b2b';k.symbol=k.specialFaction==='wako'?(WAKO_CONFIG.symbol||'賊'):k.name[0];k.spriteKey=k.specialFaction==='wako'?(WAKO_CONFIG.spriteKey||WAKO_CONFIG.symbol||'구'):(k.spriteKey||k.symbol);k.traits=[...(NATION_TAGS[k.name]||[])];k.palaceLevel=0;k.palaceTurn=0;k.capitalLevel=1;k.initial=seeds.filter((s,j)=>isActiveTerritory(j)&&s[3]===i).length;k.gold=Math.max(60,220-k.initial*20);k.initialGold=k.gold;k.perk=k.initial+'개 영토 · 금 '+k.gold;k.troops=k.initial===1?58:k.initial<3?40:k.initial<5?34:28;k.baekduRitualUsed=false;k.baekduBeaconCooldown=0;k.baekduBeaconTurns=0;k.baekduOracleCooldown=0;k.geumgangRitualUsed=false;k.geumgangHerbCooldown=0;k.geumgangExpeditionCooldown=0;k.taesanRitualUsed=false;k.taesanHerbCooldown=0;k.taesanExpeditionCooldown=0;k.mountainLastVisitedYear={};k.inventory=typeof emptyFactionInventory==='function'?emptyFactionInventory():{};k.resources={};k.initialFood=72+k.initial*8;k.food=k.initialFood;k.policyPoints=0;k.nextAttackBonus=null});
// Fixed game capitals: one original capital territory for each faction.
const GOGURYEO_CAPITAL_ID=Number(window.SAMGUK_JOLBON_SPLIT?.guknaeId??0);
const CAPITALS=[GOGURYEO_CAPITAL_ID,8,18,23,24,null,31,35,37,39,42,45,48,49,WAKO_CONFIG.baseTerritoryId];
function isCapital(i){return CAPITALS.includes(i)}
function capitalHomeFaction(i){const k=CAPITALS.indexOf(Number(i));return k>=0?k:null}
function capitalLevelOf(i){const r=regions?.[Number(i)];return isCapital(Number(i))?Math.max(1,Math.min(5,Math.floor(Number(r?.capitalLevel)||1))):0}
function capitalLevelForFaction(k){const n=K?.[Number(k)];return Math.max(1,Math.min(5,Math.floor(Number(n?.capitalLevel)||1)))}
function capitalGrowthMultiplier(k){const lv=capitalLevelForFaction(k);return window.SAMGUK_CAPITAL_UPGRADE?.multiplierForLevel?.(lv)||Math.pow(1.3,Math.max(0,lv-1))}
function capitalActionBonus(k){const lv=capitalLevelForFaction(k);return window.SAMGUK_CAPITAL_UPGRADE?.actionBonusForLevel?.(lv)??Math.max(0,lv-1)}
function isUpgradeableCapitalFor(i,k){return Number(CAPITALS?.[Number(k)])===Number(i)&&regions?.[Number(i)]?.owner===Number(k)}
function buildingCost(i,type){return type==='temple'?BUILDINGS[type].cost:BUILDINGS[type].cost*(isCapital(i)?.5:1)}
function initialRegions(){const list=seeds.map((s,i)=>{const c=window.SAMGUK_REGION_GEOMETRY?.territoryCenter?.(i)||{x:s[1],y:s[2]};return{name:s[0],territoryId:WORLD.territories?.[i]?.id||null,terrainType:WORLD.territories?.[i]?.terrainType||null,center:{x:c.x,y:c.y},owner:isActiveTerritory(i)?s[3]:-1,inactive:!isActiveTerritory(i),resources:isActiveTerritory(i)?[...(WORLD.territories[i].resources||[])]:[],troops:isActiveTerritory(i)?K[s[3]].troops:0,cavalry:isActiveTerritory(i)?(nationHas(s[3],'nomad')?0:Math.floor(K[s[3]].troops*.2)):0,nomadCavalry:isActiveTerritory(i)&&nationHas(s[3],'nomad')?Math.floor(K[s[3]].troops*.2):0,hwarang:0,armoredCavalry:0,ironInfantry:0,pirates:0,archers:0,marines:0,draftCarry:0,devastatedTurns:0,templeUseCount:0,cityType:'normal',cityLevel:0,capitalLevel:isCapital(i)?1:0,buildings:(window.SAMGUK_BUILDING_DATA?.createInitialState?.()||{barracks:false,wall:false,market:false,university:0,village:0,temple:false,tradePort:false,forge:false,jiangnanFort:false,watchtower:false})}});return typeof bindSteppeTerrainData==='function'?bindSteppeTerrainData(list):list}
let regions=[],player=2,choice=2,selected=null,target=null,actionMode='inspect',attackType=null,turn=1,ap=3,gold=0,logs=[],playing=false,busy=false,ongoingBattles={};
window.SAMGUK_FACTION_TROOP_HUD?.configureRuntime?.({
 getTerritory:id=>regions?.[Number(id)]||null,
 getFaction:id=>K?.[Number(id)]||null
});
window.SAMGUK_FACTION_LABEL_SPRITE?.configureRuntime?.({
 getTerritories:()=>regions||[],
 getFaction:id=>K?.[Number(id)]||null,
 isActiveTerritory:id=>isActiveTerritory(Number(id)),
 getCenter:id=>window.SAMGUK_TERRITORY_HUD_LAYOUT?.getCenter?.(Number(id))||regions?.[Number(id)]?.center||null,
 getHudOffset:id=>window.SAMGUK_TERRITORY_HUD_LAYOUT?.getOffsetY?.(Number(id))||0,
 getSelected:()=>selected
});

// v104 국가 특산품 창고. 금/소금/철/약초/비단/각궁/귤 7종만 스택된다.
const STRATEGIC_RESOURCE_TYPES=Object.fromEntries((window.SAMGUK_RESOURCE_SYSTEM?.stackableKeys||[]).map(k=>[k,k]));
function ensureStrategicResources(k){return window.SAMGUK_RESOURCE_SYSTEM?.ensureInventory?.(k)||(typeof emptyFactionInventory==='function'?emptyFactionInventory():{})}
function strategicResourceProduction(k){return window.SAMGUK_RESOURCE_SYSTEM?.production?.(k)||(typeof emptyFactionInventory==='function'?emptyFactionInventory():{})}
function produceStrategicResources(k){return window.SAMGUK_RESOURCE_SYSTEM?.produce?.(k)||(typeof emptyFactionInventory==='function'?emptyFactionInventory():{})}
function produceAllStrategicResources(){return window.SAMGUK_RESOURCE_SYSTEM?.produceAll?.()||K.map(()=>typeof emptyFactionInventory==='function'?emptyFactionInventory():{})}
function strategicResourceGainText(gain){return (window.SAMGUK_RESOURCE_SYSTEM?.stackableKeys||[]).map(key=>`${RESOURCE_ICONS[key]||'◆'} +${Number(gain?.[key])||0}`).join(' · ')}
function strategicResourceIcon(tag,fallback){return (typeof RESOURCE_ICONS!=='undefined'&&RESOURCE_ICONS&&RESOURCE_ICONS[tag])||fallback}
function strategicStockpileMarkup(stock){return `<span class="strategic-stockpile"><span class="sr-sep">|</span>${(window.SAMGUK_RESOURCE_SYSTEM?.stackableKeys||[]).map(key=>`<span class="sr-item" title="${RESOURCE_NAMES[key]||key}: ${Number(stock?.[key])||0}"><span class="sr-icon">${RESOURCE_ICONS[key]||'◆'}</span><span class="sr-value">${Number(stock?.[key])||0}</span></span>`).join('')}</span>`}
function ensureStrategicResourceUIStyle(){
 if(document.getElementById('strategicResourceStyle'))return;
 const style=document.createElement('style');style.id='strategicResourceStyle';
 style.textContent='.strategic-stockpile{display:inline-flex;align-items:center;gap:8px;margin-left:10px;white-space:nowrap;font-size:.92em;font-weight:800;color:#efe7ca;vertical-align:baseline}.strategic-stockpile .sr-sep{opacity:.48;margin:0 -3px;font-size:.72em}.strategic-stockpile .sr-item{display:inline-flex;align-items:center;gap:2px;line-height:1}.strategic-stockpile .sr-icon{font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;font-size:.9em}.strategic-stockpile .sr-value{font-weight:800;font-variant-numeric:tabular-nums}@media(max-width:1200px){.strategic-stockpile{gap:5px;font-size:.82em}}';
 document.head.appendChild(style);
}
const $=id=>document.getElementById(id),count=k=>regions.filter((r,i)=>isActiveTerritory(i)&&r.owner===k).length;
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.remove('show'),2700)}
function log(msg){logs.unshift(msg);logs=logs.slice(0,18)}
// -----------------------------------------------------------------------------
// Officer / territory information system (presentation + data layer only).
// This is intentionally isolated from combat rules so existing balance is not changed.
// Add hand-authored officers to OFFICER_PRESETS[territoryId] later; otherwise each
// active territory receives deterministic local officers as a useful fallback roster.
// -----------------------------------------------------------------------------
const OFFICER_STAT_KEYS=['war','leadership','intelligence','charisma'];
const OFFICER_STAT_LABELS={war:'무력',leadership:'통솔',intelligence:'지력',charisma:'매력',authority:'권위'};
const OFFICER_APTITUDE_LABELS={spear:'창병',cavalry:'기병',archery:'궁병'};
const OFFICER_GRADE_SCORE={S:1.18,A:1.10,B:1.03,C:.96};
// v35: legacy per-territory presets are deliberately cleared. The roster is now
// generated only from the national 3-core + local guard rules.
const OFFICER_PRESETS={};
function ensureOfficerStatCompatibility(officer){
 if(!officer)return officer;
 const M=window.SAMGUK_CHARACTER_MODEL;
 const canonical=M?.normalizeStats?M.normalizeStats(officer.stats||{}):{war:Number(officer.stats?.war)||50,leadership:Number(officer.stats?.leadership)||50,intelligence:Number(officer.stats?.intelligence)||50,charisma:Number(officer.stats?.charisma)||50,authority:Number(officer.stats?.authority)||Math.round(((Number(officer.stats?.leadership)||50)+(Number(officer.stats?.charisma)||50))/2)};
 officer.stats=M?.attachLegacyAdminAlias?M.attachLegacyAdminAlias(canonical):canonical;
 return officer;
}
function officerAdministration(officer){return officer?Math.round(((Number(officer.stats?.intelligence)||0)+(Number(officer.stats?.charisma)||0))/2):0}
const OFFICER_STATUS=Object.freeze({ACTIVE:'active',WOUNDED:'wounded',CAPTURED:'captured',DEAD:'dead'});
const OFFICER_DEFEAT_CONFIG=Object.freeze({woundedTurns:8,escapeBase:.30,escapeWarRate:.005,escapeMax:.80,failedWoundRate:.50,failedCaptureRate:.35,failedDeathRate:.15});
function normalizeOfficerStatus(value){const s=String(value??'active').toLowerCase();if(s==='active'||s==='정상'||s==='귀순')return OFFICER_STATUS.ACTIVE;if(s==='wounded'||s.includes('부상'))return OFFICER_STATUS.WOUNDED;if(s==='captured'||s.includes('포로'))return OFFICER_STATUS.CAPTURED;if(s==='dead'||s.includes('전사')||s.includes('사망'))return OFFICER_STATUS.DEAD;return OFFICER_STATUS.ACTIVE}
function officerStatusLabel(officer){const s=normalizeOfficerStatus(officer?.status);if(s===OFFICER_STATUS.WOUNDED)return `부상${Number(officer?.woundedTurnsLeft)>0?` · ${officer.woundedTurnsLeft}턴`:''}`;if(s===OFFICER_STATUS.CAPTURED)return '포로';if(s===OFFICER_STATUS.DEAD)return '전사';return '정상'}
function officerCanCommand(officer){return !!officer&&normalizeOfficerStatus(officer.status)===OFFICER_STATUS.ACTIVE}
// [3] 녹봉 규칙: 군주/왕은 0금, 그 외 생존 일반 인물은 턴당 10금.
function officerIsRuler(officer){return !!officer&&(officer.isRuler===true||officer.office==='king'||String(officer.role||'').toLowerCase()==='king'||officer.role==='군주'||officer.title==='군주')}
function normalizeOfficerSalary(officer){if(!officer)return 0;officer.isRuler=officerIsRuler(officer);officer.salary=officer.isRuler?0:10;return officer.salary}
function normalizeAllOfficerSalaries(){for(const officer of OFFICERS)normalizeOfficerSalary(officer);return OFFICERS.length}
function deriveOfficerTemperament(data={}){if(data.temperament)return String(data.temperament);const s=data.stats||{};if((Number(s.war)||0)>=(Number(s.intelligence)||0)+15)return 'unyielding';if((Number(s.charisma)||0)>=(Number(s.war)||0)+15)return 'flexible';return 'balanced'}
class Officer{
 constructor(data){
  this.id=String(data.id);this.name=data.name||'무명 장수';this.role=data.role||'장수';this.office=data.office||null;this.isRuler=!!data.isRuler||this.office==='king'||this.role==='군주';this.characterClass=data.characterClass||this.office||null;this.nationId=Number.isInteger(Number(data.nationId))?Number(data.nationId):null;
  this.territoryId=Number(data.territoryId);this.initialTerritoryId=this.territoryId;this.loyalty=Math.max(0,Math.min(100,Number(data.loyalty??80)));
  this.status=normalizeOfficerStatus(data.status);this.woundedTurnsLeft=Math.max(0,Number(data.woundedTurnsLeft)||0);this.woundedUntilTurn=Number.isFinite(Number(data.woundedUntilTurn))?Number(data.woundedUntilTurn):null;this.capturedBy=Number.isInteger(Number(data.capturedBy))?Number(data.capturedBy):null;this.originalFactionId=Number.isInteger(Number(data.originalFactionId))?Number(data.originalFactionId):null;this.previousTerritoryId=Number.isInteger(Number(data.previousTerritoryId))?Number(data.previousTerritoryId):null;this.captureTurn=Number.isFinite(Number(data.captureTurn))?Number(data.captureTurn):null;this.preWoundStats=data.preWoundStats?{...data.preWoundStats}:null;
  this.stats=window.SAMGUK_CHARACTER_MODEL?.normalizeStats?.(data.stats||{})||{war:50,leadership:50,intelligence:50,charisma:50,authority:50};ensureOfficerStatCompatibility(this);
  const officeTitle={king:'군주',general:'대장군',chancellor:'재상',guard:'수비장'}[this.office]||this.role;const idHash=[...this.id].reduce((h,ch)=>((h*31)+ch.charCodeAt(0))>>>0,0);
  const hasAge=data.age!==null&&data.age!==undefined&&data.age!==''&&Number.isFinite(Number(data.age));this.title=String(data.title||officeTitle||'장수');this.age=hasAge?Math.max(16,Math.min(80,Math.round(Number(data.age)))):24+(idHash%27);this.salary=this.isRuler?0:10;
  this.traits=Array.isArray(data.traits)?data.traits.map(x=>typeof x==='string'?{name:x}:x).filter(Boolean):[];this.portraitUrl=data.portraitUrl?String(data.portraitUrl):null;
  this.aptitude={spear:data.aptitude?.spear||'C',cavalry:data.aptitude?.cavalry||'C',archery:data.aptitude?.archery||'C'};
  this.skills=Array.isArray(data.skills)?[...data.skills]:[];this.portraitVariant=Number(data.portraitVariant)||0;this.temperament=deriveOfficerTemperament(data);this.friendIds=Array.isArray(data.friendIds)?data.friendIds.map(String):[];this.familyIds=Array.isArray(data.familyIds)?data.familyIds.map(String):[];
  this.turnState={maxActionPoints:1,actionPoints:1,maxStamina:100,stamina:100,acted:false};
 }
 average(){return Math.round(OFFICER_STAT_KEYS.reduce((s,k)=>s+this.stats[k],0)/OFFICER_STAT_KEYS.length)}
 commandAttack(troops=100,aptitude='spear'){const t=Math.max(1,Number(troops)||1),lead=.68+this.stats.leadership/210,war=.72+this.stats.war/260,grade=OFFICER_GRADE_SCORE[this.aptitude[aptitude]]||1;return Math.round(t*lead*war*grade)}
 commandDefense(troops=100,aptitude='spear'){const t=Math.max(1,Number(troops)||1),lead=.72+this.stats.leadership/220,intel=.78+this.stats.intelligence/300,grade=OFFICER_GRADE_SCORE[this.aptitude[aptitude]]||1;return Math.round(t*lead*intel*grade)}
 domesticScore(){const admin=officerAdministration(this);return Math.round(this.stats.intelligence*.45+admin*.35+this.stats.charisma*.20)}
}
const OFFICERS=[];
const OFFICER_BY_ID=new Map();
const OFFICERS_BY_TERRITORY=new Map();
let OFFICER_INIT_DIAGNOSTICS={missingNationIds:[],validation:{ok:true,errors:[]}};
function buildOfficerRoster(){
 const G=window.SAMGUK_STARTING_ROSTER;
 if(!G?.generate){console.error('[삼국쟁패][인물] 스타팅 인물 생성기를 찾을 수 없습니다.');return []}
 const ownerOf=i=>regions?.[i]&&Number.isInteger(regions[i].owner)?regions[i].owner:Number(WORLD.territories?.[i]?.home);
 const result=G.generate({factions:K,world:WORLD,capitals:CAPITALS,isActive:isActiveTerritory,ownerOf});
 const validation=G.validate?.(result,{factions:K,world:WORLD,capitals:CAPITALS,isActive:isActiveTerritory,ownerOf})||{ok:true,errors:[]};
 OFFICER_INIT_DIAGNOSTICS={missingNationIds:[...(result.missingNationIds||[])],validation};
 if(!validation.ok)console.error('[삼국쟁패][인물] 스타팅 배치 검증 실패',validation.errors);
 if(result.missingNationIds?.length)console.warn('[삼국쟁패][인물] 초기 영지가 없어 인물 생성을 건너뛴 국가',result.missingNationIds.map(i=>K[i]?.name||i));
 return (result.roster||[]).map((data,n)=>new Officer({...data,portraitVariant:data.portraitVariant??(n%6)}));
}
function replaceOfficerRoster(next){
 OFFICERS.length=0;OFFICER_BY_ID.clear();OFFICERS_BY_TERRITORY.clear();
 for(const officer of next||[]){ensureOfficerStatCompatibility(officer);officer.status=normalizeOfficerStatus(officer.status);OFFICERS.push(officer);OFFICER_BY_ID.set(officer.id,officer);if(officer.status!==OFFICER_STATUS.CAPTURED&&officer.status!==OFFICER_STATUS.DEAD&&Number.isInteger(Number(officer.territoryId))&&Number(officer.territoryId)>=0){if(!OFFICERS_BY_TERRITORY.has(officer.territoryId))OFFICERS_BY_TERRITORY.set(officer.territoryId,[]);OFFICERS_BY_TERRITORY.get(officer.territoryId).push(officer)}}
}
function initializeOfficerRoster(){replaceOfficerRoster(buildOfficerRoster());window.SAMGUK_HISTORICAL_NAMES?.patchExistingOfficers?.(OFFICERS,K);return OFFICERS}
initializeOfficerRoster();
// Territory/officer integration state. This is runtime-only and intentionally does not alter combat/save formats.
const OFFICER_TERRITORY_STATE=new Map();
const OFFICER_SYNERGY_PRESETS=[
 // Add explicit historical/special relationships here later.
 // {id:'sworn-001',name:'의형제',icon:'義',members:['officer-a','officer-b'],description:'특수 상성'}
];
function rebuildOfficerTerritoryIndex(){OFFICERS_BY_TERRITORY.clear();for(const officer of OFFICERS){officer.status=normalizeOfficerStatus(officer.status);if(officer.status===OFFICER_STATUS.CAPTURED||officer.status===OFFICER_STATUS.DEAD||!Number.isInteger(Number(officer.territoryId))||Number(officer.territoryId)<0)continue;if(!OFFICERS_BY_TERRITORY.has(officer.territoryId))OFFICERS_BY_TERRITORY.set(officer.territoryId,[]);OFFICERS_BY_TERRITORY.get(officer.territoryId).push(officer)}}
function governorScore(o){if(!o)return -1;return o.stats.leadership*.27+Math.max(o.stats.war,o.stats.intelligence)*.23+o.stats.politics*.22+o.stats.charisma*.13+o.loyalty*.15}
function autoGovernorId(territoryId){const list=OFFICERS_BY_TERRITORY.get(Number(territoryId))||[];return [...list].sort((a,b)=>governorScore(b)-governorScore(a)||b.stats.leadership-a.stats.leadership)[0]?.id||null}
function rebuildOfficerTerritoryState(){OFFICER_TERRITORY_STATE.clear();for(let i=0;i<WORLD.territories.length;i++){if(!isActiveTerritory(i))continue;const officerIds=(OFFICERS_BY_TERRITORY.get(i)||[]).map(o=>o.id);OFFICER_TERRITORY_STATE.set(i,{territoryId:i,name:WORLD.territories[i].name,governorId:autoGovernorId(i),officerIds})}}
function territoryOfficerState(territoryId){const i=Number(territoryId);if(!OFFICER_TERRITORY_STATE.has(i))OFFICER_TERRITORY_STATE.set(i,{territoryId:i,name:WORLD.territories[i]?.name||'',governorId:autoGovernorId(i),officerIds:(OFFICERS_BY_TERRITORY.get(i)||[]).map(o=>o.id)});return OFFICER_TERRITORY_STATE.get(i)}
function governorForTerritory(territoryId){const state=territoryOfficerState(territoryId);return state?.governorId?OFFICER_BY_ID.get(state.governorId)||null:null}
function governorEffect(officer){if(!officer)return {type:'none',label:'태수 없음',icon:'·',combatBonus:0,domesticBonus:0};const s=officer.stats;if(s.war>=s.intelligence+8)return {type:'martial',label:'무단형 태수',icon:'武',combatBonus:Math.max(1,Math.round((s.leadership+s.war)/22)),domesticBonus:Math.max(0,Math.round(s.politics/30))};if(s.intelligence>=s.war+8)return {type:'civil',label:'문치형 태수',icon:'文',combatBonus:Math.max(0,Math.round(s.leadership/32)),domesticBonus:Math.max(1,Math.round((s.intelligence+s.politics)/22))};return {type:'balanced',label:'균형형 태수',icon:'均',combatBonus:Math.max(1,Math.round((s.leadership+s.war)/30)),domesticBonus:Math.max(1,Math.round((s.intelligence+s.politics)/30))}}
function officerSynergiesForTerritory(territoryId){const list=OFFICERS_BY_TERRITORY.get(Number(territoryId))||[],ids=new Set(list.map(o=>o.id)),out=[];for(const preset of OFFICER_SYNERGY_PRESETS){if((preset.members||[]).every(id=>ids.has(String(id))))out.push({...preset,source:'preset'})}if(list.length>=2){let martial=list.filter(o=>o.stats.war>=82||o.stats.leadership>=86).sort((a,b)=>(b.stats.war+b.stats.leadership)-(a.stats.war+a.stats.leadership))[0],brain=list.filter(o=>o.stats.intelligence>=82||o.stats.politics>=84).sort((a,b)=>(b.stats.intelligence+b.stats.politics)-(a.stats.intelligence+a.stats.politics))[0];if(martial&&brain&&martial.id!==brain.id)out.push({id:'auto-civil-martial',name:'문무상보',icon:'文武',members:[martial.id,brain.id],description:'무장과 군사가 서로의 약점을 보완',source:'auto'});const loyal=[...list].sort((a,b)=>(b.loyalty+b.stats.leadership)-(a.loyalty+a.stats.leadership)).slice(0,2);if(loyal.length===2&&loyal.every(o=>o.loyalty>=90)&&loyal.reduce((n,o)=>n+o.stats.leadership,0)>=164)out.push({id:'auto-unity',name:'동심협력',icon:'同',members:loyal.map(o=>o.id),description:'높은 충성도와 통솔의 협력',source:'auto'})}return out.slice(0,3)}
function officerSynergiesForOfficer(officer){return officerSynergiesForTerritory(officer.territoryId).filter(s=>(s.members||[]).includes(officer.id))}
function territoryOfficerData(territoryId){const i=Number(territoryId),state=territoryOfficerState(i);return {territoryId:i,name:regions?.[i]?.name||WORLD.territories[i]?.name||'',governorId:state.governorId,officerIds:[...state.officerIds],governor:governorForTerritory(i),officers:[...(OFFICERS_BY_TERRITORY.get(i)||[])],synergies:officerSynergiesForTerritory(i)}}
function setTerritoryGovernor(territoryId,officerId){const i=Number(territoryId),o=OFFICER_BY_ID.get(String(officerId)),state=territoryOfficerState(i);if(!o||o.territoryId!==i)return false;state.governorId=o.id;return true}
function moveOfficerToTerritory(officerId,targetId){const o=OFFICER_BY_ID.get(String(officerId)),to=Number(targetId);if(!o||!isActiveTerritory(to)||o.territoryId===to)return false;const from=o.territoryId,fromState=territoryOfficerState(from),toState=territoryOfficerState(to);o.territoryId=to;rebuildOfficerTerritoryIndex();fromState.officerIds=(OFFICERS_BY_TERRITORY.get(from)||[]).map(x=>x.id);toState.officerIds=(OFFICERS_BY_TERRITORY.get(to)||[]).map(x=>x.id);if(fromState.governorId===o.id||!OFFICER_BY_ID.get(fromState.governorId)||OFFICER_BY_ID.get(fromState.governorId)?.territoryId!==from)fromState.governorId=autoGovernorId(from);if(!toState.governorId||!OFFICER_BY_ID.get(toState.governorId)||OFFICER_BY_ID.get(toState.governorId)?.territoryId!==to)toState.governorId=autoGovernorId(to);return true}
function resetOfficerAssignments(){initializeOfficerRoster();rebuildOfficerTerritoryIndex();rebuildOfficerTerritoryState()}
function resetOfficerTurnState(){activeExpeditionOfficerId=null;for(const o of OFFICERS){if(!o.turnState)o.turnState={maxActionPoints:1,maxStamina:100};o.turnState.maxActionPoints=Math.max(1,Number(o.turnState.maxActionPoints)||1);o.turnState.actionPoints=o.turnState.maxActionPoints;o.turnState.maxStamina=Math.max(1,Number(o.turnState.maxStamina)||100);o.turnState.stamina=o.turnState.maxStamina;o.turnState.acted=false;if(o.morale===undefined)o.morale=100}}
function officerCombinedPower(officer,troops=100,aptitude='spear'){if(!officer)return 0;const attack=officer.commandAttack(troops,aptitude),defense=officer.commandDefense(troops,aptitude);return Math.round(attack*.58+defense*.42)}
// -----------------------------------------------------------------------------
// Officer 5-stat gameplay integration.
// Balance constants are centralized here so the formulas can be tuned without
// touching the combat, economy or UI code paths again.
// -----------------------------------------------------------------------------
const GAME_BALANCE={
 officer:{
  leadership:{baseTroops:12,perPoint:.75},
  power:{attackPerPoint:.003},
  intellect:{baseChance:.30,perPoint:.0045,resistPerPoint:.0015,min:.20,max:.85},
  politics:{incomePerPoint:.002,recruitPerPoint:.0008,buildDiscountPerPoint:.0015,maxBuildDiscount:.22},
  charisma:{baseChance:.10,perPoint:.006,loyaltyPenalty:.0035,moraleBonus:.0015,recruitPerPoint:.0015,min:.08,max:.82},
  scheme:{globalActionCost:1,officerActionCost:1,staminaCost:20}
 },
 city:{specializeCost:80,level2Cost:140,level3Cost:220,maxLevel:3,agricultureRecruitBonus:[0,.50,.65,.80],commerceIncomeBonus:[0,.50,.65,.80],militaryDefenseBonus:[0,.50,.65,.80]},
 espionage:{baseChance:.25,intelligenceRate:.005,defenseRate:.0025,watchtowerPenalty:.18,counterIntelPenalty:.20,min:.08,max:.88,globalActionCost:1,officerActionCost:1,staminaCost:18,aiCooldown:3},
 ai:{citySpecializationInterval:2,espionageCooldown:3}
};
const OFFICER_GAMEPLAY_CONFIG=GAME_BALANCE.officer;
const OFFICER_SCHEMES={
 fire:{name:'화계',icon:'🔥',stat:'intelligence',description:'성공 시 즉시 피해 + 2턴간 화재 피해와 사기 저하'},
 confusion:{name:'혼란',icon:'🌀',stat:'intelligence',description:'성공 시 적 부대를 1~2턴간 행동 불능'},
 falseReport:{name:'위서',icon:'📜',stat:'intelligence',description:'성공 시 일부 병력을 인접 영토로 강제 퇴각시키고 지휘를 교란'},
 recruit:{name:'등용/유혹',icon:'🤝',stat:'charisma',description:'적 장수 포섭 시도. 실패해도 대상 충성·사기가 소폭 하락'}
};
let activeExpeditionOfficerId=null,officerSchemeDraft=null;
function clampNumber(v,min,max){return Math.max(min,Math.min(max,Number(v)||0))}
function territoryCommander(territoryId){const i=Number(territoryId),active=activeExpeditionOfficerId?OFFICER_BY_ID.get(String(activeExpeditionOfficerId)):null;if(active&&active.territoryId===i)return active;return governorForTerritory(i)||officersInTerritory(i).sort((a,b)=>b.stats.leadership-a.stats.leadership)[0]||null}
function officerMaxTroops(officer){if(!officer)return Infinity;const c=OFFICER_GAMEPLAY_CONFIG.leadership;return Math.max(1,Math.floor(c.baseTroops+officer.stats.leadership*c.perPoint))}
function territoryMaxTroops(i){return officerMaxTroops(territoryCommander(i))}
function officerPowerMultiplier(i){const o=territoryCommander(i);return o?1+o.stats.war*OFFICER_GAMEPLAY_CONFIG.power.attackPerPoint:1}
function governorPolitics(i){return governorForTerritory(i)?.stats.politics||0}
function politicsIncomeMultiplier(i){return 1+governorPolitics(i)*OFFICER_GAMEPLAY_CONFIG.politics.incomePerPoint}
function politicsRecruitMultiplier(i){return 1+governorPolitics(i)*OFFICER_GAMEPLAY_CONFIG.politics.recruitPerPoint}
function ensureTerritoryOfficerEffects(i){const r=regions?.[Number(i)];if(!r)return null;if(!r.officerEffects)r.officerEffects={morale:100,fireTurns:0,confusionTurns:0,falseReportTurns:0};r.officerEffects.morale=clampNumber(r.officerEffects.morale??100,0,100);r.officerEffects.fireTurns=Math.max(0,Math.floor(Number(r.officerEffects.fireTurns)||0));r.officerEffects.confusionTurns=Math.max(0,Math.floor(Number(r.officerEffects.confusionTurns)||0));r.officerEffects.falseReportTurns=Math.max(0,Math.floor(Number(r.officerEffects.falseReportTurns)||0));return r.officerEffects}
function territoryMorale(i){return ensureTerritoryOfficerEffects(i)?.morale??100}
function moralePowerMultiplier(i){return .8+territoryMorale(i)*.002}
function falseReportPowerMultiplier(i){return (ensureTerritoryOfficerEffects(i)?.falseReportTurns||0)>0?.82:1}
function territoryCannotAct(i){return (ensureTerritoryOfficerEffects(i)?.confusionTurns||0)>0}
function territoryEffectLabels(i){const fx=ensureTerritoryOfficerEffects(i);if(!fx)return[];const out=[];if(fx.fireTurns>0)out.push(`🔥 화재 ${fx.fireTurns}턴`);if(fx.confusionTurns>0)out.push(`🌀 혼란 ${fx.confusionTurns}턴`);if(fx.falseReportTurns>0)out.push(`📜 위서 교란 ${fx.falseReportTurns}턴`);if(fx.morale<100)out.push(`士 사기 ${Math.round(fx.morale)}`);return out}
function reduceTerritoryTroops(i,loss){const r=regions?.[i];if(!r||r.troops<=0)return 0;const actual=Math.max(0,Math.min(r.troops,Math.round(loss)));if(!actual)return 0;const remain=Math.max(0,r.troops-actual);try{const current=unitCounts(r);replaceUnits(r,unitPortion(current,remain))}catch{r.troops=remain}return actual}
function shiftTerritoryTroops(from,to,amount){const a=regions?.[from],b=regions?.[to];if(!a||!b||amount<=0)return 0;const n=Math.min(Math.max(0,a.troops-1),Math.round(amount));if(n<=0)return 0;try{const current=unitCounts(a),portion=unitPortion(current,n);changeUnits(a,portion,-1);changeUnits(b,portion)}catch{a.troops-=n;b.troops+=n}return n}
function schemeTargetGovernor(i){return governorForTerritory(i)||officersInTerritory(i).sort((a,b)=>b.stats.intelligence-a.stats.intelligence)[0]||null}
function intellectSchemeChance(officer,targetId,type='fire'){const c=OFFICER_GAMEPLAY_CONFIG.intellect,target=schemeTargetGovernor(targetId),resist=(target?.stats.intelligence||50)*c.resistPerPoint,mod=type==='confusion'?-.03:type==='falseReport'?.02:0;return clampNumber(c.baseChance+officer.stats.intelligence*c.perPoint-resist+mod,c.min,c.max)}
function recruitSchemeChance(officer,targetOfficer){const c=OFFICER_GAMEPLAY_CONFIG.charisma,morale=clampNumber(targetOfficer?.morale??100,0,100),loyalty=clampNumber(targetOfficer?.loyalty??80,0,100);return clampNumber(c.baseChance+officer.stats.charisma*c.perPoint-loyalty*c.loyaltyPenalty+(100-morale)*c.moraleBonus,c.min,c.max)}
function officerCanUseScheme(officer){if(!playing||busy||!officer||regions?.[officer.territoryId]?.owner!==player)return false;if(normalizeOfficerStatus(officer.status)!==OFFICER_STATUS.ACTIVE)return false;if(territoryCannotAct(officer.territoryId))return false;const t=officer.turnState||{};return ap>=OFFICER_GAMEPLAY_CONFIG.scheme.globalActionCost&&(t.actionPoints??0)>=OFFICER_GAMEPLAY_CONFIG.scheme.officerActionCost&&(t.stamina??0)>=OFFICER_GAMEPLAY_CONFIG.scheme.staminaCost}
function spendOfficerSchemeCost(officer){const c=OFFICER_GAMEPLAY_CONFIG.scheme;ap=Math.max(0,ap-c.globalActionCost);officer.turnState.actionPoints=Math.max(0,(officer.turnState.actionPoints||0)-c.officerActionCost);officer.turnState.stamina=Math.max(0,(officer.turnState.stamina||0)-c.staminaCost);officer.turnState.acted=true}
function adjacentHostileTerritories(officer){const from=officer?.territoryId;if(!Number.isInteger(from)||!Array.isArray(neighbors?.[from]))return[];return neighbors[from].filter(i=>isActiveTerritory(i)&&regions[i]?.owner!==player&&canAttack(player,regions[i]?.owner))}
function applyFireScheme(officer,targetId){const fx=ensureTerritoryOfficerEffects(targetId),r=regions[targetId],loss=reduceTerritoryTroops(targetId,Math.max(1,Math.round(r.troops*(.05+officer.stats.intelligence/2000))));fx.fireTurns=Math.max(fx.fireTurns,2);fx.morale=clampNumber(fx.morale-15,0,100);return `즉시 ${loss}명 피해 · 2턴 화재 · 사기 -15`}
function applyConfusionScheme(officer,targetId){const fx=ensureTerritoryOfficerEffects(targetId),turns=1+(Math.random()<officer.stats.intelligence/140?1:0);fx.confusionTurns=Math.max(fx.confusionTurns,turns);fx.morale=clampNumber(fx.morale-8,0,100);return `${turns}턴 행동 불능 · 사기 -8`}
function applyFalseReportScheme(officer,targetId){const fx=ensureTerritoryOfficerEffects(targetId),r=regions[targetId],retreats=(neighbors[targetId]||[]).filter(i=>regions[i]?.owner===r.owner&&!largeBattleAt(i)).sort((a,b)=>regions[a].troops-regions[b].troops),amount=Math.max(1,Math.round(r.troops*(.18+officer.stats.intelligence*.0015)));let moved=0,dest=null;if(retreats.length){dest=retreats[0];moved=shiftTerritoryTroops(targetId,dest,amount)}fx.falseReportTurns=Math.max(fx.falseReportTurns,1);fx.morale=clampNumber(fx.morale-10,0,100);return moved>0?`${moved}명 → ${regions[dest].name} 강제 퇴각 · 1턴 지휘 교란`:`퇴각로 없음 · 1턴 지휘 교란 · 사기 -10`}
function applyRecruitScheme(officer,targetOfficer){if(!targetOfficer)return '대상 장수가 없습니다.';targetOfficer.morale=clampNumber(targetOfficer.morale??100,0,100);const destination=officer.territoryId,oldTerritory=targetOfficer.territoryId;targetOfficer.loyalty=clampNumber(52+officer.stats.charisma*.28,45,85);targetOfficer.morale=70;targetOfficer.status=OFFICER_STATUS.ACTIVE;targetOfficer.capturedBy=null;targetOfficer.originalFactionId=null;moveOfficerToTerritory(targetOfficer.id,destination);return `${targetOfficer.name} 등용 성공 · ${regions[oldTerritory]?.name||'적 영토'} → ${regions[destination].name}`}
function executeOfficerScheme(officerId,type,targetId,targetOfficerId=null){const officer=OFFICER_BY_ID.get(String(officerId)),scheme=OFFICER_SCHEMES[type];if(!officer||!scheme||!officerCanUseScheme(officer)){notify('현재 이 장수는 계략을 사용할 수 없습니다.');return false}const hostile=adjacentHostileTerritories(officer);if(!hostile.includes(Number(targetId))){notify('인접한 공격 가능 적 영토만 계략 대상으로 선택할 수 있습니다.');return false}let chance,targetOfficer=null;if(type==='recruit'){targetOfficer=OFFICER_BY_ID.get(String(targetOfficerId));if(!targetOfficer||targetOfficer.territoryId!==Number(targetId)){notify('등용 대상 장수를 찾을 수 없습니다.');return false}chance=recruitSchemeChance(officer,targetOfficer)}else chance=intellectSchemeChance(officer,Number(targetId),type);spendOfficerSchemeCost(officer);try{beginWar(player,regions[targetId].owner)}catch{}const success=Math.random()<chance;let result='';if(success){if(type==='fire')result=applyFireScheme(officer,Number(targetId));else if(type==='confusion')result=applyConfusionScheme(officer,Number(targetId));else if(type==='falseReport')result=applyFalseReportScheme(officer,Number(targetId));else if(type==='recruit')result=applyRecruitScheme(officer,targetOfficer)}else if(type==='recruit'&&targetOfficer){targetOfficer.loyalty=clampNumber(targetOfficer.loyalty-4,0,100);targetOfficer.morale=clampNumber((targetOfficer.morale??100)-12,0,100);result=`${targetOfficer.name} 거절 · 충성 -4 · 사기 -12`}else result='계략이 간파되었습니다.';const pct=Math.round(chance*100);log(`${scheme.icon} ${officer.name} · ${scheme.name} ${success?'성공':'실패'} (${pct}%) · ${regions[targetId].name}${result?' · '+result:''}`);notify(`${scheme.name} ${success?'성공':'실패'} · ${result}`);officerSchemeDraft=null;const d=document.getElementById('officerSchemeModal');if(d?.open)d.close();render();openOfficerPanel(officer.territoryId);return success}
function tickOfficerGameplayEffects(){for(let i=0;i<regions.length;i++){if(!isActiveTerritory(i))continue;const fx=ensureTerritoryOfficerEffects(i);if(fx.fireTurns>0){const loss=reduceTerritoryTroops(i,Math.max(1,Math.round(regions[i].troops*.05)));fx.morale=clampNumber(fx.morale-5,0,100);fx.fireTurns--;if(loss>0)log(`🔥 ${regions[i].name} 화재 지속 피해 ${loss}명`)}if(fx.confusionTurns>0)fx.confusionTurns--;if(fx.falseReportTurns>0)fx.falseReportTurns--;if(fx.fireTurns===0&&fx.confusionTurns===0&&fx.falseReportTurns===0)fx.morale=Math.min(100,fx.morale+5)}}
function officerGameplaySummary(officer){if(!officer)return null;return {maxTroops:officerMaxTroops(officer),attackBonusPct:Math.round((officerPowerMultiplier(officer.territoryId)-1)*100),fireChancePct:Math.round(intellectSchemeChance(officer,adjacentHostileTerritories(officer)[0]??officer.territoryId,'fire')*100),politicsIncomePct:Math.round(officerAdministration(officer)*OFFICER_GAMEPLAY_CONFIG.politics.incomePerPoint*100),charismaBasePct:Math.round(clampNumber(OFFICER_GAMEPLAY_CONFIG.charisma.baseChance+officer.stats.charisma*OFFICER_GAMEPLAY_CONFIG.charisma.perPoint,0,1)*100)}}
rebuildOfficerTerritoryState();
function officersInTerritory(territoryId){return OFFICERS_BY_TERRITORY.get(Number(territoryId))||[]}
function officerOwner(officer){if(!officer)return null;const status=normalizeOfficerStatus(officer.status);if(status===OFFICER_STATUS.CAPTURED||status===OFFICER_STATUS.DEAD)return null;return regions?.[officer.territoryId]?.owner??WORLD.territories?.[officer.territoryId]?.home??(Number.isInteger(Number(officer.nationId))?Number(officer.nationId):null)}
function officerOwnedTerritories(factionId){const k=Number(factionId);return regions.map((r,i)=>isActiveTerritory(i)&&r.owner===k?i:-1).filter(i=>i>=0)}
function nearestOfficerRetreatTerritory(factionId,fromId,preferredId=null){const own=officerOwnedTerritories(factionId);if(!own.length)return null;if(Number.isInteger(Number(preferredId))&&own.includes(Number(preferredId)))return Number(preferredId);const start=Number(fromId);if(!Number.isInteger(start)||!isActiveTerritory(start))return own[0];const q=[start],seen=new Set([start]);while(q.length){const i=q.shift();if(own.includes(i))return i;for(const n of neighbors?.[i]||[])if(!seen.has(n)){seen.add(n);q.push(n)}}return own[0]}
function rebuildOfficerIndexesPreserveGovernors(){const prev=new Map([...OFFICER_TERRITORY_STATE.entries()].map(([i,state])=>[Number(i),state?.governorId||null]));rebuildOfficerTerritoryIndex();for(let i=0;i<WORLD.territories.length;i++){if(!isActiveTerritory(i))continue;const state=territoryOfficerState(i),ids=(OFFICERS_BY_TERRITORY.get(i)||[]).map(o=>o.id),oldGov=prev.get(i),gov=oldGov?OFFICER_BY_ID.get(String(oldGov)):null;state.officerIds=ids;state.governorId=gov&&gov.territoryId===i&&normalizeOfficerStatus(gov.status)!==OFFICER_STATUS.CAPTURED&&normalizeOfficerStatus(gov.status)!==OFFICER_STATUS.DEAD?gov.id:autoGovernorId(i)}}
function placeOfficerDirect(officer,territoryId){if(!officer)return false;officer.territoryId=Number(territoryId);rebuildOfficerIndexesPreserveGovernors();return true}
function clearOfficerWound(officer,restore=true){if(!officer)return;if(restore&&officer.preWoundStats){officer.stats=window.SAMGUK_CHARACTER_MODEL?.normalizeStats?.(officer.preWoundStats)||{...officer.preWoundStats};ensureOfficerStatCompatibility(officer)}officer.preWoundStats=null;officer.woundedTurnsLeft=0;officer.woundedUntilTurn=null}
function woundOfficer(officer){if(!officer)return false;if(!officer.preWoundStats)officer.preWoundStats={war:Number(officer.stats.war)||0,leadership:Number(officer.stats.leadership)||0,intelligence:Number(officer.stats.intelligence)||0,charisma:Number(officer.stats.charisma)||0,authority:Number(officer.stats.authority)||0};const base=officer.preWoundStats;officer.stats=window.SAMGUK_CHARACTER_MODEL?.normalizeStats?.({war:Math.max(1,Math.round(base.war*.5)),leadership:Math.max(1,Math.round(base.leadership*.5)),intelligence:Math.max(1,Math.round(base.intelligence*.5)),charisma:Math.max(1,Math.round(base.charisma*.5)),authority:Math.max(1,Math.round((base.authority??officer.stats.authority??50)*.5))})||{war:Math.max(1,Math.round(base.war*.5)),leadership:Math.max(1,Math.round(base.leadership*.5)),intelligence:Math.max(1,Math.round(base.intelligence*.5)),charisma:Math.max(1,Math.round(base.charisma*.5)),authority:Math.max(1,Math.round((base.authority??officer.stats.authority??50)*.5))};ensureOfficerStatCompatibility(officer);officer.status=OFFICER_STATUS.WOUNDED;officer.woundedTurnsLeft=OFFICER_DEFEAT_CONFIG.woundedTurns;officer.woundedUntilTurn=turn+OFFICER_DEFEAT_CONFIG.woundedTurns;return true}
function officerDefeatEventVisible(loserFaction,winnerFaction){return Number(loserFaction)===player||Number(winnerFaction)===player}
function ensureOfficerDefeatToastUI(){if(document.getElementById('officerDefeatToastStack'))return;const style=document.createElement('style');style.id='officerDefeatToastStyle';style.textContent=`#officerDefeatToastStack{position:fixed;right:18px;top:82px;z-index:14050;width:min(390px,calc(100vw - 30px));display:grid;gap:9px;pointer-events:none}.officer-defeat-toast{pointer-events:auto;padding:12px 14px;border:1px solid #806f50;border-left:4px solid #d4b264;border-radius:7px;background:linear-gradient(135deg,#121b1fef,#1c1712f2);color:#eee7d6;box-shadow:0 12px 35px #000a;animation:officerDefeatIn .2s ease}.officer-defeat-toast strong{display:block;color:#f2d391;font-size:14px}.officer-defeat-toast small{display:block;margin-top:4px;color:#aeb9b4;line-height:1.45}.officer-defeat-toast.wounded{border-left-color:#d66d61}.officer-defeat-toast.captured{border-left-color:#b58ad8}.officer-defeat-toast.dead{border-left-color:#9b2f35}.officer-defeat-toast.retreat{border-left-color:#6fb79a}@keyframes officerDefeatIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}`;document.head.appendChild(style);const stack=document.createElement('div');stack.id='officerDefeatToastStack';stack.setAttribute('aria-live','assertive');document.body.appendChild(stack)}
function showOfficerDefeatNotification(officer,outcome,message,visible=true){if(!visible)return;if(typeof notify==='function')notify(message);ensureOfficerDefeatToastUI();const stack=document.getElementById('officerDefeatToastStack');if(!stack)return;const item=document.createElement('div');item.className=`officer-defeat-toast ${outcome}`;const label={retreat:'퇴각 성공',wounded:'장수 부상',captured:'포로 발생',dead:'장수 전사'}[outcome]||'전투 결과';item.innerHTML=`<strong>${label} · ${officer?.name||'장수'}</strong><small>${message}</small>`;stack.appendChild(item);while(stack.children.length>4)stack.firstElementChild?.remove();setTimeout(()=>item.remove(),6500)}
function handleOfficerDefeat(officer,winnerFaction,context={}){if(!officer||normalizeOfficerStatus(officer.status)!==OFFICER_STATUS.ACTIVE)return null;const loserFaction=Number.isInteger(Number(context.loserFaction))?Number(context.loserFaction):officerOwner(officer),winner=Number(winnerFaction);if(!Number.isInteger(loserFaction)||!Number.isInteger(winner)||loserFaction===winner)return null;const war=Math.max(0,Math.min(100,Number(officer.stats?.war)||0)),escapeChance=Math.min(OFFICER_DEFEAT_CONFIG.escapeMax,OFFICER_DEFEAT_CONFIG.escapeBase+war*OFFICER_DEFEAT_CONFIG.escapeWarRate);let outcome;if(Math.random()<escapeChance)outcome='retreat';else{const roll=Math.random();outcome=roll<OFFICER_DEFEAT_CONFIG.failedWoundRate?'wounded':roll<OFFICER_DEFEAT_CONFIG.failedWoundRate+OFFICER_DEFEAT_CONFIG.failedCaptureRate?'captured':'dead'}const retreatId=nearestOfficerRetreatTerritory(loserFaction,context.battleTerritoryId??officer.territoryId,context.retreatTerritoryId);if((outcome==='retreat'||outcome==='wounded')&&retreatId===null)outcome='captured';officer.previousTerritoryId=Number.isInteger(Number(officer.territoryId))?Number(officer.territoryId):officer.previousTerritoryId;let message='';if(outcome==='retreat'){placeOfficerDirect(officer,retreatId);officer.status=OFFICER_STATUS.ACTIVE;message=`${officer.name}이(가) 전장을 빠져나와 ${regions[retreatId]?.name||'후방'}으로 퇴각했습니다.`}else if(outcome==='wounded'){placeOfficerDirect(officer,retreatId);woundOfficer(officer);message=`${officer.name}이(가) 중상을 입었습니다. ${OFFICER_DEFEAT_CONFIG.woundedTurns}턴 동안 주요 능력치가 50% 감소합니다.`}else if(outcome==='captured'){clearOfficerWound(officer,true);officer.originalFactionId=loserFaction;officer.capturedBy=winner;officer.captureTurn=turn;officer.status=OFFICER_STATUS.CAPTURED;officer.nationId=null;officer.territoryId=-1;rebuildOfficerIndexesPreserveGovernors();message=`${officer.name}이(가) ${K[winner]?.name||'승전국'}의 포로가 되었습니다.`}else{clearOfficerWound(officer,true);officer.originalFactionId=loserFaction;officer.capturedBy=null;officer.status=OFFICER_STATUS.DEAD;officer.nationId=null;officer.territoryId=-1;rebuildOfficerIndexesPreserveGovernors();message=`${officer.name}이(가) 전투 중 전사했습니다.`}log(`⚔ 장수 패배 · ${message}`);showOfficerDefeatNotification(officer,outcome,message,officerDefeatEventVisible(loserFaction,winner));return {outcome,escapeChance,officerId:officer.id,loserFaction,winnerFaction:winner,message}}
function updateOfficerStatusOnTurn(){for(const officer of OFFICERS){if(normalizeOfficerStatus(officer.status)!==OFFICER_STATUS.WOUNDED)continue;const until=Number(officer.woundedUntilTurn);officer.woundedTurnsLeft=Number.isFinite(until)?Math.max(0,Math.ceil(until-turn)):Math.max(0,(Number(officer.woundedTurnsLeft)||0)-1);if(officer.woundedTurnsLeft<=0){clearOfficerWound(officer,true);officer.status=OFFICER_STATUS.ACTIVE;const owner=officerOwner(officer),message=`${officer.name}이(가) 부상에서 회복했습니다.`;log(`✚ ${message}`);if(owner===player)showOfficerDefeatNotification(officer,'retreat',message,true)}}}
function captivesHeldBy(factionId){return OFFICERS.filter(o=>normalizeOfficerStatus(o.status)===OFFICER_STATUS.CAPTURED&&Number(o.capturedBy)===Number(factionId))}
function factionRulerOfficer(factionId){const rows=OFFICERS.filter(o=>officerOwner(o)===Number(factionId)&&normalizeOfficerStatus(o.status)!==OFFICER_STATUS.DEAD&&normalizeOfficerStatus(o.status)!==OFFICER_STATUS.CAPTURED);return rows.find(o=>o.office==='king')||[...rows].sort((a,b)=>(b.stats.charisma+b.stats.intelligence)-(a.stats.charisma+a.stats.intelligence))[0]||null}
function captivePersuadeChance(officer,captorFaction){const ruler=factionRulerOfficer(captorFaction),temperament={unyielding:-.12,balanced:0,flexible:.08}[officer?.temperament]||0,attemptPenalty=Math.min(.18,(Number(officer?.persuadeAttempts)||0)*.03);if(!ruler)return .08;return clampNumber(.18+ruler.stats.charisma*.003+ruler.stats.intelligence*.0015-(Number(officer.loyalty)||0)*.0025+temperament-attemptPenalty,.05,.85)}
function captiveRansomValue(officer){return Math.max(30,Math.round(25+(Number(officer?.average?.())||50)*.75+(Number(officer?.loyalty)||0)*.15))}
function prisonerReturnTerritory(officer,factionId){const original=Number(factionId);const preferred=Number(officer?.previousTerritoryId);return nearestOfficerRetreatTerritory(original,preferred,preferred)}
function releaseCaptiveOfficer(officer){const original=Number(officer.originalFactionId),destination=prisonerReturnTerritory(officer,original);if(!Number.isInteger(original)||destination===null)return false;officer.status=OFFICER_STATUS.ACTIVE;officer.capturedBy=null;officer.captureTurn=null;officer.nationId=original;officer.loyalty=Math.max(35,Number(officer.loyalty)||50);placeOfficerDirect(officer,destination);return true}
function relationPenalty(a,b,amount){a=Number(a);b=Number(b);if(a===b||!Number.isInteger(a)||!Number.isInteger(b)||typeof relations==='undefined'||!relations?.[a]||!Number.isFinite(Number(relations[a][b])))return false;const next=Math.max(-100,Math.min(100,Number(relations[a][b])-Math.abs(Number(amount)||0)));relations[a][b]=next;relations[b][a]=next;return true}
function executeRelationshipPenalties(officer,captor){const penalties=new Map();const original=Number(officer.originalFactionId);if(Number.isInteger(original)&&original!==captor)penalties.set(original,40);for(const other of OFFICERS){if(!other||other.id===officer.id||normalizeOfficerStatus(other.status)===OFFICER_STATUS.DEAD)continue;const owner=officerOwner(other);if(!Number.isInteger(owner)||owner===captor)continue;let amount=0;if((officer.familyIds||[]).includes(other.id)||(other.familyIds||[]).includes(officer.id))amount=55;else if((officer.friendIds||[]).includes(other.id)||(other.friendIds||[]).includes(officer.id))amount=35;else if(OFFICER_SYNERGY_PRESETS.some(x=>(x.members||[]).includes(officer.id)&&(x.members||[]).includes(other.id)))amount=30;if(amount)penalties.set(owner,Math.max(penalties.get(owner)||0,amount))}for(const [faction,amount] of penalties)relationPenalty(captor,faction,amount);return [...penalties.entries()]}
function captivePreview(officer,captorFaction=player){return {persuadeChance:Math.round(captivePersuadeChance(officer,captorFaction)*100),ransom:captiveRansomValue(officer),originalFactionId:officer?.originalFactionId,originalFactionName:K?.[Number(officer?.originalFactionId)]?.name||'무소속',temperament:officer?.temperament||'balanced'}}
function handleCaptiveAction(officerId,action,captorFaction=player){const officer=OFFICER_BY_ID.get(String(officerId)),captor=Number(captorFaction);if(!officer||normalizeOfficerStatus(officer.status)!==OFFICER_STATUS.CAPTURED||Number(officer.capturedBy)!==captor)return {ok:false,message:'처리할 수 없는 포로입니다.'};const original=Number(officer.originalFactionId);if(action==='persuade'){const chance=captivePersuadeChance(officer,captor);officer.persuadeAttempts=(Number(officer.persuadeAttempts)||0)+1;if(Math.random()>=chance){const message=`${officer.name} 등용 설득 실패 · 성공률 ${Math.round(chance*100)}%`;log(message);return {ok:false,message,chance}}const destination=officerOwnedTerritories(captor)[0];if(destination===undefined)return {ok:false,message:'등용할 자국 영토가 없습니다.'};officer.status=OFFICER_STATUS.ACTIVE;officer.capturedBy=null;officer.captureTurn=null;officer.nationId=captor;officer.originalFactionId=original;officer.loyalty=Math.max(45,Math.min(75,Math.round(48+(factionRulerOfficer(captor)?.stats.charisma||50)*.25)));officer.persuadeAttempts=0;placeOfficerDirect(officer,destination);const message=`${officer.name} 등용 성공 · ${K[captor]?.name||'자국'}에 합류했습니다.`;log(message);if(captor===player)notify(message);render();return {ok:true,message,chance}}if(action==='ransom'){const price=captiveRansomValue(officer);if(!Number.isInteger(original)||count(original)<=0)return {ok:false,message:'원소속 세력이 멸망해 몸값을 요구할 수 없습니다.'};if(countryGold(original)<price)return {ok:false,message:`${K[original]?.name||'원소속 세력'}의 국고가 부족합니다. (${price}금 필요)`};setCountryGold(original,countryGold(original)-price);setCountryGold(captor,countryGold(captor)+price);if(!releaseCaptiveOfficer(officer)){setCountryGold(original,countryGold(original)+price);setCountryGold(captor,countryGold(captor)-price);return {ok:false,message:'석방할 원소속 영토가 없습니다.'}}const message=`${officer.name} 몸값 ${price}금 수령 · ${K[original]?.name||'원소속 세력'}으로 송환`;log(message);if(captor===player)notify(message);render();return {ok:true,message,price}}if(action==='release'){if(!releaseCaptiveOfficer(officer))return {ok:false,message:'돌아갈 원소속 영토가 없어 석방할 수 없습니다.'};const message=`${officer.name}을(를) 조건 없이 석방했습니다.`;log(message);if(captor===player)notify(message);render();return {ok:true,message}}if(action==='execute'){const penalties=executeRelationshipPenalties(officer,captor);officer.status=OFFICER_STATUS.DEAD;officer.capturedBy=null;officer.nationId=null;officer.territoryId=-1;rebuildOfficerIndexesPreserveGovernors();const message=`${officer.name}을(를) 처형했습니다.${penalties.length?' 관련 세력 우호도 급락.':''}`;log(message);if(captor===player)notify(message);render();return {ok:true,message,penalties}}return {ok:false,message:'알 수 없는 포로 처리 명령입니다.'}}
window.SAMGUK_OFFICER_DEFEAT={version:1,config:OFFICER_DEFEAT_CONFIG,status:OFFICER_STATUS,handleOfficerDefeat,updateOfficerStatusOnTurn,getCaptives:captivesHeldBy,previewCaptive:captivePreview,handleCaptiveAction};
function officerPortraitSvg(officer,size=74){const owner=officerOwner(officer),color=K[owner]?.color||'#8b6a42',v=officer.portraitVariant%6,helm=v%3===0?'<path d="M17 36Q40 11 63 36L58 43H22Z" fill="#242c30"/><path d="M39 12h4v16h-4z" fill="#d0a45c"/>':v%3===1?'<path d="M22 31Q40 17 58 31L55 39H25Z" fill="#342c27"/>':'<path d="M25 30Q40 15 55 30L52 38H28Z" fill="#1d292c"/><path d="M29 22Q40 10 51 22" fill="none" stroke="#d0a45c" stroke-width="3"/>';
 return `<svg class="officer-svg" width="${size}" height="${Math.round(size*1.16)}" viewBox="0 0 80 96" aria-hidden="true"><defs><linearGradient id="opg${officer.id.replace(/[^a-z0-9]/gi,'')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#182228"/></linearGradient></defs><rect width="80" height="96" rx="6" fill="url(#opg${officer.id.replace(/[^a-z0-9]/gi,'')})"/><circle cx="40" cy="43" r="17" fill="#d9b48b"/>${helm}<path d="M26 50Q40 62 54 50Q52 69 40 72Q28 69 26 50" fill="#8c5c46" opacity=".34"/><path d="M12 96Q17 69 40 69Q63 69 68 96" fill="#26343a"/><path d="M22 96Q27 77 40 76Q53 77 58 96" fill="${color}" opacity=".84"/><circle cx="34" cy="43" r="1.5" fill="#2a2522"/><circle cx="46" cy="43" r="1.5" fill="#2a2522"/><path d="M35 53Q40 56 45 53" fill="none" stroke="#6e4938" stroke-width="1.3"/><rect x="4" y="75" width="22" height="17" rx="3" fill="#10191d" opacity=".78"/><text x="15" y="87" fill="#f5e3b6" font-size="10" font-weight="700" text-anchor="middle">${(K[owner]?.symbol||'將').slice(0,1)}</text></svg>`}
function officerStatBar(key,value,compact=false){const tip=(typeof OFFICER_STAT_TOOLTIPS!=='undefined'&&OFFICER_STAT_TOOLTIPS[key])||OFFICER_STAT_LABELS[key];return `<div class="officer-stat-row ${compact?'compact':''}" title="${tip}"><span>${OFFICER_STAT_LABELS[key]}</span><div class="officer-stat-track"><i style="width:${value}%"></i></div><b>${value}</b></div>`}
const OFFICER_CARD_STAT_KEYS=['leadership','war','intelligence','charisma'];
function officerCardBaseStats(officer){return officer?.preWoundStats||officer?.stats||{}}
function officerCardRank(officer){const stats=officerCardBaseStats(officer),values=OFFICER_CARD_STAT_KEYS.map(k=>Math.max(0,Number(stats?.[k])||0)),max=Math.max(0,...values),total=values.reduce((sum,v)=>sum+v,0);if(max>=95||total>=350)return{id:'S',label:'명장',max,total};if(max>=90||total>=320)return{id:'A',label:'상급',max,total};if(max>=80||total>=280)return{id:'B',label:'중견',max,total};return{id:'C',label:'일반',max,total}}
function officerCardStatGrid(officer){const stats=officer?.stats||{};return `<div class="officer-card-stat-grid">${OFFICER_CARD_STAT_KEYS.map(k=>`<span class="officer-card-stat" title="${OFFICER_STAT_LABELS[k]} ${Number(stats[k])||0}"><em>${OFFICER_STAT_LABELS[k]}</em><b>${Number(stats[k])||0}</b></span>`).join('')}</div>`}
function officerCard(officer){const owner=officerOwner(officer),normalized=normalizeOfficerStatus(officer.status),statusClass=normalized===OFFICER_STATUS.ACTIVE?'normal':normalized===OFFICER_STATUS.WOUNDED?'injured':'busy',state=territoryOfficerState(officer.territoryId),isGov=state.governorId===officer.id,synergies=officerSynergiesForOfficer(officer),movable=!!(playing&&!busy&&regions?.[officer.territoryId]?.owner===player&&normalized!==OFFICER_STATUS.DEAD&&normalized!==OFFICER_STATUS.CAPTURED),rank=officerCardRank(officer),legendary=rank.max>=95;return `<button class="officer-card rank-${rank.id.toLowerCase()} ${legendary?'legendary':''} ${isGov?'is-governor':''}" data-officer-rank="${rank.id}" data-officer-id="${officer.id}" data-officer-origin="${officer.territoryId}" draggable="${movable?'true':'false'}" type="button"><div class="officer-card-portrait">${officerPortraitSvg(officer,62)}</div><div class="officer-card-main"><div class="officer-card-head"><div class="officer-name-rank"><strong class="officer-rank-name rank-name-${rank.id.toLowerCase()}">${officer.name}</strong><span class="officer-rank-badge rank-badge-${rank.id.toLowerCase()}" title="${rank.id}급 · ${rank.label} · 최고 ${rank.max} / 총합 ${rank.total}">${rank.id}</span></div><span class="officer-status ${statusClass}">${officerStatusLabel(officer)}</span></div><small>${isGov?'<b class="governor-chip">태수</b> · ':''}${officer.role} · ${officerAssignmentLabel(officer.assignment)} · 충성 ${officer.loyalty} · ${K[owner]?.name||''}</small>${synergies.length?`<div class="officer-synergy-mini">${synergies.map(x=>`<span>✦ ${x.name}</span>`).join('')}</div>`:''}${officerCardStatGrid(officer)}</div></button>`}
function ensureOfficerUI(){if(document.getElementById('officerSystemStyles'))return;const style=document.createElement('style');style.id='officerSystemStyles';style.textContent=`
#officerTerritoryPanel{position:fixed;z-index:30;top:76px;left:14px;bottom:18px;width:min(390px,calc(100vw - 28px));display:flex;flex-direction:column;background:linear-gradient(180deg,#17242af7,#0d171cf5);border:1px solid #8f774f;border-radius:8px;box-shadow:0 18px 55px #000a,inset 0 0 0 1px #ffffff0b;transform:translateX(calc(-100% - 34px));opacity:0;visibility:hidden;transition:transform .24s ease,opacity .2s ease,visibility .2s;overflow:hidden;color:#ece5d3}
#officerTerritoryPanel.open{transform:translateX(0);opacity:1;visibility:visible}.officer-panel-top{padding:14px 15px 12px;border-bottom:1px solid #725f42;background:linear-gradient(90deg,#2b241caa,#111d22)}.officer-panel-topline{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.officer-panel-eyebrow{font-size:10px;letter-spacing:.12em;color:#d6bd84;font-weight:800}.officer-panel-top h2{margin:3px 0 4px;font-size:22px;color:#f7e6b8}.officer-panel-owner{font-size:12px;font-weight:700}.officer-panel-close{border:1px solid #77684e!important;background:#172126!important;color:#d9d2c2!important;border-radius:4px!important;padding:5px 8px!important;min-width:auto!important}.officer-region-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}.officer-region-summary span{display:grid;gap:2px;padding:7px 8px;background:#ffffff08;border:1px solid #ffffff0d;border-radius:4px;font-size:10px;color:#9fa9a6}.officer-region-summary b{font-size:12px;color:#f2ead6}.officer-panel-body{padding:11px;overflow:auto}.officer-panel-section{display:flex;justify-content:space-between;align-items:center;margin:0 2px 8px}.officer-panel-section strong{font-size:13px;color:#e8d19a}.officer-panel-section small{color:#8fa09d}.officer-list{display:grid;gap:8px}.officer-card{width:100%;display:flex!important;align-items:flex-start!important;gap:10px!important;text-align:left!important;padding:9px!important;border:1px solid #49555a!important;border-radius:6px!important;background:linear-gradient(90deg,#1a272c,#152126)!important;color:#eee8db!important;transition:transform .12s ease,border-color .12s ease,background .12s ease}.officer-card:hover{transform:translateX(-2px);border-color:#b89b64!important;background:linear-gradient(90deg,#213239,#19282e)!important}.officer-card-portrait{flex:0 0 62px;line-height:0}.officer-svg{display:block;border:1px solid #7c694d;border-radius:5px;box-shadow:0 3px 10px #0006}.officer-card-main{min-width:0;flex:1}.officer-card-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.officer-card-head strong{font-size:14px;color:#f6e4b5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.officer-card-main>small{display:block;margin:3px 0 7px;font-size:10px;color:#aeb6b2}.officer-status{font-size:9px;padding:2px 5px;border-radius:10px;border:1px solid #62706b;color:#cdd6d0;white-space:nowrap}.officer-status.normal{border-color:#4f866c;color:#8fd2ad}.officer-status.injured{border-color:#9c5454;color:#e89b9b}.officer-status.busy{border-color:#8b7846;color:#d9c47a}.officer-mini-stats{display:grid;gap:2px}.officer-stat-row{display:grid;grid-template-columns:34px 1fr 28px;gap:7px;align-items:center;font-size:11px}.officer-stat-row.compact{grid-template-columns:24px 1fr 24px;gap:5px;font-size:9px}.officer-stat-row span{color:#b9c0bc}.officer-stat-row b{text-align:right;color:#f0d593;font-variant-numeric:tabular-nums}.officer-stat-track{height:5px;background:#0d1316;border:1px solid #364247;border-radius:4px;overflow:hidden}.officer-stat-track i{display:block;height:100%;background:linear-gradient(90deg,#80683f,#e0b85f)}

/* v91 classic officer cards: compact numeric stats + rank treatment */
.officer-card{position:relative!important;overflow:hidden!important;isolation:isolate;padding:10px!important;border-radius:7px!important;background:linear-gradient(110deg,#19262a 0%,#131d21 54%,#1b211e 100%)!important;box-shadow:inset 0 0 0 1px #ffffff08,0 4px 12px #0005!important}
.officer-card>*{position:relative;z-index:1}.officer-card:hover{transform:translateX(-2px);filter:brightness(1.04)}
.officer-name-rank{display:flex;align-items:center;gap:6px;min-width:0}.officer-rank-name{font-family:"Noto Serif KR","Malgun Gothic",serif;font-weight:900;letter-spacing:.01em}.officer-rank-badge{display:inline-grid;place-items:center;flex:0 0 auto;min-width:22px;height:18px;padding:0 5px;border-radius:4px;font-size:10px;font-weight:900;line-height:1;letter-spacing:.04em;background:#222a2d;border:1px solid #667078;color:#d3d7d7;box-shadow:inset 0 0 0 1px #ffffff0a}
.officer-card.rank-s .rank-name-s{color:#ffe27a!important;text-shadow:0 0 7px #ffd2477a,0 1px #4b2e00}.officer-rank-badge.rank-badge-s{color:#fff0a7;border-color:#e7bd43;background:linear-gradient(180deg,#6b4b12,#2f210c);box-shadow:0 0 8px #ffd54d70,inset 0 0 0 1px #fff1a533}
.officer-card.rank-a .rank-name-a{color:#e8e5ee!important;text-shadow:0 0 6px #a020f055}.officer-rank-badge.rank-badge-a{color:#f0e9f6;border-color:#a887bc;background:linear-gradient(180deg,#4b365b,#28212e);box-shadow:0 0 6px #a020f044,inset 0 0 0 1px #ffffff1c}
.officer-card.rank-b .rank-name-b{color:#f0dfbd!important}.officer-rank-badge.rank-badge-b{color:#eadfc5;border-color:#806f56;background:#2a2925}.officer-card.rank-c .rank-name-c{color:#d7d5ca!important}.officer-rank-badge.rank-badge-c{color:#c7cbc8;border-color:#59625f;background:#202727}
.officer-card-stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:7px}.officer-card-stat{display:grid;grid-template-columns:1fr;justify-items:center;gap:1px;min-width:0;padding:5px 2px 4px;border:1px solid #ffffff12;border-radius:4px;background:linear-gradient(180deg,#0710148a,#11191dbf);font-variant-numeric:tabular-nums}.officer-card-stat em{font-style:normal;font-size:8px;color:#9eaaa6;letter-spacing:.02em}.officer-card-stat b{font-size:13px;line-height:1;color:#e8d09a}.officer-card.rank-s .officer-card-stat b{color:#f3d780}.officer-card.rank-a .officer-card-stat b{color:#d9d2e3}
.officer-card.legendary{border-color:#d6a33d!important;background:radial-gradient(circle at 86% 10%,#9a321f45 0 20%,transparent 42%),linear-gradient(115deg,#351712 0%,#241512 40%,#17191a 100%)!important;box-shadow:inset 0 0 0 1px #f3cc6d52,inset 0 0 22px #7f211c45,0 0 13px #e0a43e42,0 6px 18px #0008!important}
.officer-card.legendary::before{content:"";position:absolute;z-index:0;inset:3px;pointer-events:none;border:1px solid #dcb35e82;border-radius:5px;background:radial-gradient(circle at 0 0,transparent 0 7px,#d6a54a55 8px 9px,transparent 10px 15px,#a5322850 16px 17px,transparent 18px),radial-gradient(circle at 100% 100%,transparent 0 7px,#d6a54a55 8px 9px,transparent 10px 15px,#a5322850 16px 17px,transparent 18px);opacity:.95}.officer-card.legendary::after{content:"◆";position:absolute;z-index:0;right:8px;bottom:5px;color:#e7bd5860;font-size:15px;line-height:1;transform:rotate(45deg);text-shadow:0 0 6px #e3b84f88;pointer-events:none}.officer-card.legendary .officer-svg{border-color:#d8aa4c;box-shadow:0 0 0 1px #6f281d,0 4px 12px #0009,0 0 9px #d9a43c4a}.officer-card.legendary .officer-card-stat{border-color:#d2a14b33;background:linear-gradient(180deg,#351813c7,#160f0ecf)}.officer-card.legendary .officer-card-stat em{color:#cfb88f}.officer-card.legendary .officer-card-stat b{color:#ffe08a;text-shadow:0 0 5px #d79c3c55}
.officer-card.legendary.is-governor{border-color:#f0c45b!important;box-shadow:inset 3px 0 0 #f0c45b,inset 0 0 0 1px #f3cc6d52,inset 0 0 22px #7f211c45,0 0 13px #e0a43e42,0 6px 18px #0008!important}
@media(max-width:430px){.officer-card-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.officer-card-stat{grid-template-columns:auto auto;justify-content:center;gap:5px}.officer-card-stat em{font-size:9px}.officer-card-stat b{font-size:12px}}
#officerDetailModal{width:min(650px,calc(100vw - 30px));max-width:650px;border:1px solid #a58b5b;border-radius:8px;background:#111d22;color:#eee8dc;padding:0;box-shadow:0 24px 80px #000c}#officerDetailModal::backdrop{background:#071014b8;backdrop-filter:blur(2px)}.officer-modal-wrap{padding:18px}.officer-modal-head{display:grid;grid-template-columns:100px 1fr auto;gap:14px;align-items:start;border-bottom:1px solid #63563e;padding-bottom:14px}.officer-modal-head h2{margin:0;color:#f5dfaa;font-size:24px}.officer-modal-head p{margin:5px 0;color:#aeb6b2;font-size:12px}.officer-modal-close{border:1px solid #70664e!important;background:#1c292e!important;color:#ddd4c0!important;border-radius:4px!important;padding:6px 9px!important}.officer-modal-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:18px;margin-top:16px}.officer-detail-stats{display:grid;gap:8px}.officer-detail-stats .officer-stat-row{grid-template-columns:40px 1fr 32px;font-size:12px}.officer-detail-stats .officer-stat-track{height:8px}.officer-info-box{border:1px solid #465258;background:#ffffff08;border-radius:6px;padding:11px;margin-bottom:10px}.officer-info-box h3{margin:0 0 9px;font-size:12px;color:#d9bf85}.officer-aptitudes{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.officer-aptitudes span{display:grid;place-items:center;gap:3px;padding:8px 5px;background:#10181c;border:1px solid #3f4a4f;border-radius:4px;font-size:10px;color:#aeb7b3}.officer-aptitudes b{font-size:20px;color:#f1cf74}.officer-skills{display:flex;gap:6px;flex-wrap:wrap}.officer-skills span{padding:5px 8px;background:#2c2518;border:1px solid #7c6842;border-radius:3px;color:#e8ce91;font-size:11px}.officer-calc{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.officer-calc div{padding:8px;background:#0d171b;border:1px solid #3d4a4f;border-radius:4px;text-align:center}.officer-calc small{display:block;color:#8f9a97;font-size:9px}.officer-calc b{display:block;margin-top:2px;color:#f0dcaa;font-size:15px}.officer-calc-note{margin:7px 0 0;font-size:9px;color:#87918e}.officer-empty{padding:16px;text-align:center;color:#98a4a0;border:1px dashed #46545a;border-radius:5px}@media(max-width:760px){#officerTerritoryPanel{top:auto;right:8px;left:8px;bottom:8px;width:auto;max-height:68vh;transform:translateY(calc(100% + 24px))}#officerTerritoryPanel.open{transform:translateY(0)}.officer-modal-grid{grid-template-columns:1fr}.officer-modal-head{grid-template-columns:82px 1fr auto}}

/* v92 Total War inspired officer detail modal */
#officerDetailModal{width:min(980px,calc(100vw - 24px))!important;max-width:980px!important;max-height:min(92vh,900px)!important;border:1px solid #8f7447!important;border-radius:4px!important;background:#06090b!important;color:#ece6d8!important;box-shadow:0 32px 110px #000f,0 0 0 1px #d6b05b22!important;overflow:hidden!important}
#officerDetailModal::backdrop{background:radial-gradient(circle at 48% 35%,#15202a99,#020405e8 72%)!important;backdrop-filter:blur(3px) saturate(.75)!important}
#officerDetailModal #officerModalContent{max-height:min(92vh,900px);overflow:auto;scrollbar-color:#78633e #0b1012}
.tw-officer-detail{position:relative;display:grid;grid-template-columns:minmax(280px,36%) minmax(0,64%);min-height:650px;background:radial-gradient(circle at 18% 16%,color-mix(in srgb,var(--officer-faction) 28%,transparent),transparent 34%),linear-gradient(100deg,#0c1115 0 35%,#090d10 36% 100%);isolation:isolate;overflow:hidden}
.tw-officer-detail:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(90deg,transparent 0 34%,#c4a45d22 34.1%,transparent 34.6%),repeating-linear-gradient(135deg,#ffffff03 0 1px,transparent 1px 10px);opacity:.8}
.tw-officer-close{position:absolute;z-index:9;right:16px;top:14px;border:1px solid #6d624b!important;background:#10171bde!important;color:#d9cfb8!important;border-radius:2px!important;padding:7px 10px!important;font-size:11px!important;letter-spacing:.05em!important}.tw-officer-close:hover{border-color:#c6a45b!important;color:#fff1c8!important;background:#1a2022!important}
.tw-officer-hero{position:relative;min-height:650px;overflow:hidden;border-right:1px solid #76633f;background:linear-gradient(180deg,#101922,#080d11 62%,#050709)}
.tw-officer-hero-bg{position:absolute;inset:0;background:radial-gradient(circle at 46% 22%,color-mix(in srgb,var(--officer-faction) 48%,#1d3640),transparent 37%),linear-gradient(155deg,#12202a,#070b0e 62%);filter:saturate(.82)}
.tw-officer-hero-bg:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 32%,#05070877 61%,#030405 92%),radial-gradient(ellipse at 48% 42%,transparent 0 38%,#0008 80%)}
.tw-officer-portrait-wrap{position:absolute;inset:54px 12px 54px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;filter:drop-shadow(0 20px 20px #000c)}
.tw-officer-portrait-wrap .officer-svg{width:min(100%,360px)!important;height:auto!important;max-height:540px!important;border:0!important;border-radius:0!important;box-shadow:none!important;transform:scale(1.34);transform-origin:50% 70%}
.tw-officer-portrait-image{width:100%;height:100%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 18px 18px #000b)}
.tw-officer-rank-seal{position:absolute;z-index:3;left:18px;top:18px;width:58px;height:58px;border:1px solid #a8874a;border-radius:50%;display:grid;place-content:center;text-align:center;background:#0a0e10dd;box-shadow:0 0 0 4px #05070899,0 0 18px #0009}.tw-officer-rank-seal strong{font:900 25px/1 Georgia,serif;color:#f2d58b}.tw-officer-rank-seal span{margin-top:2px;font-size:8px;color:#b7a47c}.tw-officer-rank-seal.rank-s{border-color:#edc95b;box-shadow:0 0 0 4px #05070899,0 0 22px #d6a63c55}.tw-officer-rank-seal.rank-s strong{color:#ffe37a;text-shadow:0 0 8px #d8a431}
.tw-officer-hero-caption{position:absolute;z-index:3;left:18px;right:18px;bottom:18px;padding:12px 13px;border-top:1px solid #b08c4f88;border-bottom:1px solid #433923;background:linear-gradient(90deg,#080b0ddc,#0e1112a8);text-shadow:0 1px 2px #000}.tw-officer-hero-caption span{display:block;color:#a9b3b0;font-size:10px;letter-spacing:.08em}.tw-officer-hero-caption b{display:block;margin-top:3px;color:#e8d3a1;font:800 18px/1.2 "Noto Serif KR","Malgun Gothic",serif}
.tw-officer-info{padding:26px 28px 24px 30px;min-width:0;background:linear-gradient(110deg,#0b1013f6,#070a0cfa)}
.tw-officer-head{padding:7px 70px 17px 0;border-bottom:1px solid #64583e}.tw-officer-kicker{font-size:10px;font-weight:800;letter-spacing:.14em;color:#d1b56f}.tw-officer-head h2{margin:3px 0 0;color:#f2d87f;font:900 34px/1.12 "Noto Serif KR","Malgun Gothic",serif;letter-spacing:.02em;text-shadow:0 2px 8px #000}.tw-officer-subtitle{margin-top:6px;color:#e8e3d8;font-size:14px}.tw-officer-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.tw-officer-meta>span{display:inline-flex;align-items:center;gap:4px;padding:5px 7px;border:1px solid #343e42;background:#0d1418;color:#9facaa;font-size:9px}.tw-officer-meta b{color:#e8d6aa;font-size:10px}.tw-officer-meta .status-wounded{border-color:#78413f;color:#e5968f}.tw-officer-meta .status-captured{border-color:#6f567b;color:#d2addd}.tw-officer-meta .status-dead{border-color:#6f3034;color:#d98589}.tw-officer-synergy{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.tw-officer-synergy span{padding:3px 7px;border:1px solid #51436e;background:#201c2d;color:#cab9e5;font-size:9px}
.tw-officer-info h3{margin:0;color:#d6bd7b;font:800 12px/1.2 "Noto Serif KR","Malgun Gothic",serif;letter-spacing:.07em}.tw-officer-stats{padding:17px 0 13px;border-bottom:1px solid #363a35}.tw-officer-stats h3{margin-bottom:10px}.tw-officer-stat{display:grid;grid-template-columns:31px 39px 1fr 34px;gap:8px;align-items:center;min-height:34px}.tw-officer-stat-emblem{display:grid;place-items:center;width:27px;height:27px;border:1px solid currentColor;border-radius:50%;font:900 13px/1 "Noto Serif KR",serif;box-shadow:inset 0 0 10px #0008}.tw-officer-stat-name{font-size:10px;color:#c5ccc7}.tw-officer-stat-track{position:relative;height:5px;background:#1c2223;border-bottom:1px solid #68706c;overflow:hidden}.tw-officer-stat-track i{display:block;height:100%;box-shadow:0 0 7px currentColor}.tw-officer-stat>b{text-align:right;font:900 14px/1 Georgia,serif;color:#eadcb7;font-variant-numeric:tabular-nums}.tw-officer-stat.command{color:#c8c7d4}.tw-officer-stat.command i{background:#bfbfd1}.tw-officer-stat.strength{color:#d65b44}.tw-officer-stat.strength i{background:#b73b2b}.tw-officer-stat.intelligence{color:#5fa2cd}.tw-officer-stat.intelligence i{background:#4388b6}.tw-officer-stat.charm{color:#8bb772}.tw-officer-stat.charm i{background:#66974d}.tw-officer-stat.authority{color:#d3ae3e}.tw-officer-stat.authority i{background:#b88d16}
.tw-officer-aptitude{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid #363a35}.tw-officer-aptitude>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.tw-officer-aptitude span{display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border:1px solid #303b3e;background:#0b1215}.tw-officer-aptitude em{font-style:normal;color:#8e9b98;font-size:9px}.tw-officer-aptitude b{color:#e6cd8e;font:900 14px/1 Georgia,serif}
.tw-officer-traits{padding:15px 0 5px}.tw-officer-section-title{display:flex;align-items:end;justify-content:space-between;margin-bottom:8px}.tw-officer-section-title small{color:#687773;font-size:8px}.tw-officer-trait-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.tw-officer-trait-list article{display:grid;grid-template-columns:38px 1fr;gap:8px;align-items:center;min-height:60px;padding:8px;border:1px solid #353e3c;background:linear-gradient(100deg,#0e1719,#101313)}.tw-officer-trait-icon{display:grid;place-items:center;width:35px;height:35px;border:1px solid #806b3f;border-radius:50%;background:radial-gradient(circle,#3b3220,#0c1112 72%);color:#e0c174;font:900 14px/1 serif;box-shadow:inset 0 0 0 2px #0006}.tw-officer-trait-list b{display:block;color:#e7d8ad;font-size:11px}.tw-officer-trait-list p{margin:3px 0 0;color:#94a09c;font-size:9px;line-height:1.45}.tw-officer-empty-trait{grid-column:1/-1;margin:0;padding:12px;border:1px dashed #3a4442;color:#84908d;text-align:center;font-size:10px}
.tw-officer-command{margin-top:12px;padding-top:12px;border-top:1px solid #4b4030}.tw-officer-command .strategy-assignment-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.tw-officer-command .strategy-assignment-grid button{min-width:0;padding:6px 3px!important;background:#0c1417!important;border-color:#344044!important}.tw-officer-command .strategy-assignment-grid button[aria-pressed="true"]{border-color:#b38c45!important;background:#241e13!important;box-shadow:inset 0 0 0 1px #d0a24b33}.tw-officer-command .strategy-assignment-grid small{display:none}.tw-officer-command .strategy-assignment-grid b{font-size:13px}.tw-officer-command .strategy-assignment-grid span{font-size:8px}.tw-officer-scheme-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:7px}.tw-officer-scheme-row button{display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;padding:7px 5px!important;border:1px solid #4b4030!important;background:#17140e!important;color:#d9c79d!important;font-size:9px!important}.tw-officer-scheme-row button:hover:not(:disabled){border-color:#b38c45!important;background:#241e13!important}.tw-officer-scheme-row b{font-size:13px}
@media(max-width:820px){#officerDetailModal{width:min(720px,calc(100vw - 14px))!important}.tw-officer-detail{grid-template-columns:230px minmax(0,1fr);min-height:620px}.tw-officer-hero{min-height:620px}.tw-officer-info{padding:20px 18px}.tw-officer-head h2{font-size:28px}.tw-officer-trait-list{grid-template-columns:1fr}.tw-officer-command .strategy-assignment-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:600px){#officerDetailModal{width:calc(100vw - 8px)!important;max-height:96vh!important}.tw-officer-detail{display:block;min-height:0}.tw-officer-hero{min-height:250px;border-right:0;border-bottom:1px solid #76633f}.tw-officer-portrait-wrap{inset:18px 80px 14px}.tw-officer-portrait-wrap .officer-svg{max-height:250px!important;transform:scale(1.08)}.tw-officer-hero-caption{left:10px;right:10px;bottom:8px;padding:7px 9px}.tw-officer-rank-seal{left:10px;top:10px;width:46px;height:46px}.tw-officer-rank-seal strong{font-size:20px}.tw-officer-info{padding:15px 13px 18px}.tw-officer-head{padding-right:52px}.tw-officer-head h2{font-size:26px}.tw-officer-stat{grid-template-columns:28px 36px 1fr 31px;gap:6px}.tw-officer-trait-list{grid-template-columns:1fr}.tw-officer-command .strategy-assignment-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tw-officer-scheme-row{grid-template-columns:repeat(2,minmax(0,1fr))}}

.officer-card[draggable="true"]{cursor:grab}.officer-card[draggable="true"]:active{cursor:grabbing}.officer-card.dragging{opacity:.45;transform:scale(.985)}.officer-card.is-governor{border-color:#9d7b3f!important;box-shadow:inset 3px 0 0 #cba85f}.governor-chip{display:inline-block;color:#f2cf78;border:1px solid #8e7443;border-radius:3px;padding:0 3px;font-size:9px}.officer-synergy-mini{display:flex;gap:4px;flex-wrap:wrap;margin:-2px 0 6px}.officer-synergy-mini span,.officer-synergy-tags span{font-size:9px;color:#d9c8ff;background:#2c2440;border:1px solid #625282;border-radius:10px;padding:2px 6px}.officer-governor-box{margin:0 0 10px;padding:9px 10px;border:1px solid #6d5c3f;border-radius:5px;background:#211c14}.officer-governor-box strong{color:#f0cf83}.officer-governor-box small{display:block;margin-top:3px;color:#aeb7b3}.officer-synergy-strip{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 10px}.officer-synergy-strip span{font-size:10px;padding:4px 7px;border-radius:4px;color:#dcd1ff;border:1px solid #625382;background:#28203a}.territory-shape.officer-drop-target path,.minimal-label.officer-drop-target>*{filter:drop-shadow(0 0 5px #ffd778);stroke:#ffd778!important;stroke-width:2.2!important}.officer-transfer-wrap{padding:17px}.officer-transfer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid #69583d;padding-bottom:11px}.officer-transfer-head h2{margin:2px 0 0;color:#f2d89a}.officer-transfer-route{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;margin:15px 0}.officer-transfer-place{padding:10px;border:1px solid #465258;border-radius:5px;background:#0e181c}.officer-transfer-place small{display:block;color:#899693}.officer-transfer-place b{display:block;margin-top:3px;color:#f0e5ce}.officer-transfer-arrow{color:#d4b265;font-size:22px}.officer-transfer-officer{display:flex;gap:10px;align-items:center;padding:10px;background:#ffffff08;border:1px solid #465258;border-radius:5px}.officer-transfer-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.officer-transfer-actions button{padding:8px 12px!important}.officer-transfer-note{margin:10px 0 0;font-size:10px;color:#94a09c}#officerTransferModal{width:min(540px,calc(100vw - 28px));border:1px solid #9b8153;border-radius:8px;background:#111d22;color:#eee8dc;padding:0;box-shadow:0 24px 80px #000c}#officerTransferModal::backdrop{background:#071014b8;backdrop-filter:blur(2px)}
.officer-effect-strip{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 10px}.officer-effect-strip span{font-size:10px;padding:4px 7px;border-radius:4px;color:#ffd7aa;border:1px solid #805f43;background:#342317}.officer-scheme-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.officer-scheme-buttons button{display:grid!important;gap:3px!important;text-align:left!important;padding:9px 10px!important;border:1px solid #6d5a3d!important;background:#211c14!important;color:#f1dfb6!important}.officer-scheme-buttons button:hover:not(:disabled){border-color:#c29d5d!important;background:#2d2518!important}.officer-scheme-buttons small{color:#aab3ae;font-size:9px}.officer-scheme-state{margin-top:7px;color:#9aa7a2;font-size:9px}.officer-scheme-targets{display:grid;gap:7px;margin-top:12px}.officer-scheme-target{display:grid!important;grid-template-columns:1fr auto!important;align-items:center!important;gap:10px!important;text-align:left!important;padding:10px 11px!important;border:1px solid #4a565a!important;background:#101a1f!important}.officer-scheme-target strong{color:#f0dfb9}.officer-scheme-target small{color:#9aa6a2}.officer-scheme-chance{font-size:13px;font-weight:900;color:#f2c76e}.officer-scheme-empty{padding:14px;border:1px dashed #4d5b60;color:#94a09c;text-align:center}.officer-scheme-note{margin:10px 0 0;color:#9ba6a1;font-size:10px;line-height:1.5}#officerSchemeModal{width:min(560px,calc(100vw - 28px));border:1px solid #9b8153;border-radius:8px;background:#111d22;color:#eee8dc;padding:0;box-shadow:0 24px 80px #000c}#officerSchemeModal::backdrop{background:#071014b8;backdrop-filter:blur(2px)}@media(prefers-reduced-motion:reduce){#officerTerritoryPanel,.officer-card{transition:none}}
`;document.head.appendChild(style);
 const panel=document.createElement('aside');panel.id='officerTerritoryPanel';panel.setAttribute('aria-label','영토 장수 목록');panel.innerHTML='<div id="officerPanelContent"></div>';document.body.appendChild(panel);
 const modal=document.createElement('dialog');modal.id='officerDetailModal';modal.innerHTML='<div id="officerModalContent"></div>';document.body.appendChild(modal);
 const transfer=document.createElement('dialog');transfer.id='officerTransferModal';transfer.innerHTML='<div id="officerTransferContent"></div>';document.body.appendChild(transfer);
 const schemeModal=document.createElement('dialog');schemeModal.id='officerSchemeModal';schemeModal.innerHTML='<div id="officerSchemeContent"></div>';document.body.appendChild(schemeModal);
 panel.addEventListener('click',e=>{if(e.target.closest('[data-officer-close]')){closeOfficerPanel();return}const card=e.target.closest('[data-officer-id]');if(card)openOfficerDetail(card.dataset.officerId)});
 panel.addEventListener('dragstart',e=>{const card=e.target.closest('[data-officer-id][draggable="true"]');if(!card)return;draggedOfficerId=card.dataset.officerId;card.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',draggedOfficerId);e.dataTransfer.setData('application/x-samguk-officer',draggedOfficerId)});
 panel.addEventListener('dragend',e=>{e.target.closest('[data-officer-id]')?.classList.remove('dragging');draggedOfficerId=null;clearOfficerDropTargets()});
 const mapEl=document.getElementById('map');if(mapEl&&!mapEl.dataset.officerDropBound){mapEl.dataset.officerDropBound='1';mapEl.addEventListener('dragover',e=>{if(!draggedOfficerId)return;const g=e.target.closest('[data-id]');if(!g)return;const targetId=Number(g.dataset.id),o=OFFICER_BY_ID.get(String(draggedOfficerId));if(!o||!isActiveTerritory(targetId)||targetId===o.territoryId)return;e.preventDefault();e.dataTransfer.dropEffect='move';clearOfficerDropTargets();mapEl.querySelectorAll(`[data-id="${targetId}"]`).forEach(x=>x.classList.add('officer-drop-target'))});mapEl.addEventListener('dragleave',e=>{if(!e.relatedTarget||!mapEl.contains(e.relatedTarget))clearOfficerDropTargets()});mapEl.addEventListener('drop',e=>{if(!draggedOfficerId)return;const g=e.target.closest('[data-id]');clearOfficerDropTargets();if(!g)return;const id=draggedOfficerId;draggedOfficerId=null;e.preventDefault();openOfficerTransferModal(id,Number(g.dataset.id))})}
 modal.addEventListener('click',e=>{const scheme=e.target.closest('[data-officer-scheme]');if(scheme){openOfficerSchemeModal(scheme.dataset.officerId,scheme.dataset.officerScheme);return}if(e.target.closest('[data-officer-modal-close]'))modal.close()});
 modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
 transfer.addEventListener('click',e=>{if(e.target===transfer||e.target.closest('[data-officer-transfer-cancel]')){transfer.close();return}const b=e.target.closest('[data-officer-transfer-confirm]');if(b)confirmOfficerTransfer()});
 schemeModal.addEventListener('click',e=>{if(e.target===schemeModal||e.target.closest('[data-officer-scheme-cancel]')){schemeModal.close();officerSchemeDraft=null;return}const b=e.target.closest('[data-scheme-target]');if(b&&officerSchemeDraft)executeOfficerScheme(officerSchemeDraft.officerId,officerSchemeDraft.type,Number(b.dataset.schemeTarget),b.dataset.targetOfficer||null)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.open&&panel.classList.contains('open'))closeOfficerPanel()});
}
let draggedOfficerId=null,officerTransferDraft=null;
function clearOfficerDropTargets(){document.querySelectorAll('#map .officer-drop-target').forEach(x=>x.classList.remove('officer-drop-target'))}
function openOfficerSchemeModal(officerId,type){ensureOfficerUI();const officer=OFFICER_BY_ID.get(String(officerId)),scheme=OFFICER_SCHEMES[type],modal=document.getElementById('officerSchemeModal');if(!officer||!scheme||!modal)return;if(!officerCanUseScheme(officer)){notify('행동력·장수 행동력·스태미너 또는 상태를 확인해 주세요.');return}const targets=adjacentHostileTerritories(officer);officerSchemeDraft={officerId:officer.id,type};let buttons=[];for(const targetId of targets){if(type==='recruit'){for(const targetOfficer of officersInTerritory(targetId)){const chance=Math.round(recruitSchemeChance(officer,targetOfficer)*100);buttons.push(`<button class="officer-scheme-target" type="button" data-scheme-target="${targetId}" data-target-officer="${targetOfficer.id}"><span><strong>${regions[targetId].name} · ${targetOfficer.name}</strong><small>${targetOfficer.role} · 충성 ${targetOfficer.loyalty} · 매력 ${targetOfficer.stats.charisma}</small></span><span class="officer-scheme-chance">${chance}%</span></button>`)}}else{const chance=Math.round(intellectSchemeChance(officer,targetId,type)*100),gov=schemeTargetGovernor(targetId);buttons.push(`<button class="officer-scheme-target" type="button" data-scheme-target="${targetId}"><span><strong>${regions[targetId].name}</strong><small>적 태수 ${gov?.name||'없음'} · 지력 ${gov?.stats.intelligence??'-'} · 병력 ${regions[targetId].troops}</small></span><span class="officer-scheme-chance">${chance}%</span></button>`)}}document.getElementById('officerSchemeContent').innerHTML=`<div class="officer-transfer-wrap"><div class="officer-transfer-head"><div><div class="officer-panel-eyebrow">장수 계략 · ${officer.name}</div><h2>${scheme.icon} ${scheme.name}</h2></div><button class="officer-modal-close" data-officer-scheme-cancel type="button">닫기</button></div><p class="officer-scheme-note">${scheme.description}<br>사용 비용: 국가 행동 ${OFFICER_GAMEPLAY_CONFIG.scheme.globalActionCost} · 장수 행동 ${OFFICER_GAMEPLAY_CONFIG.scheme.officerActionCost} · 스태미너 ${OFFICER_GAMEPLAY_CONFIG.scheme.staminaCost}</p><div class="officer-scheme-targets">${buttons.length?buttons.join(''):'<div class="officer-scheme-empty">현재 사용할 수 있는 인접 적 대상이 없습니다.</div>'}</div></div>`;if(!modal.open)modal.showModal()}
function openOfficerTransferModal(officerId,targetId){ensureOfficerUI();const o=OFFICER_BY_ID.get(String(officerId)),to=Number(targetId);if(!o||!isActiveTerritory(to)||to===o.territoryId)return;const from=o.territoryId,fromR=regions[from],toR=regions[to];if(!fromR||!toR||fromR.owner!==player){notify('아군 영토의 장수만 출병/이동시킬 수 있습니다.');return}const sameOwner=fromR.owner===toR.owner,adjacent=neighbors?.[from]?.includes(to),canEnemy=!sameOwner&&adjacent&&canAttack(fromR.owner,toR.owner),mode=sameOwner?'move':canEnemy?'expedition':'blocked';officerTransferDraft={officerId:o.id,from,targetId:to,mode};const effect=governorEffect(o),actionText=mode==='move'?'장수 이동 확정':mode==='expedition'?'출병 준비 열기':'이동 불가';document.getElementById('officerTransferContent').innerHTML=`<div class="officer-transfer-wrap"><div class="officer-transfer-head"><div><div class="officer-panel-eyebrow">장수 Drag & Drop · 부대 이동</div><h2>${sameOwner?'장수 이동':'출병 준비'}</h2></div><button class="officer-modal-close" data-officer-transfer-cancel type="button">닫기</button></div><div class="officer-transfer-route"><div class="officer-transfer-place"><small>출발</small><b>${fromR.name}</b></div><div class="officer-transfer-arrow">→</div><div class="officer-transfer-place"><small>목적지</small><b>${toR.name}</b></div></div><div class="officer-transfer-officer">${officerPortraitSvg(o,58)}<div><strong>${o.name}</strong><div class="officer-panel-owner">${o.role} · 통솔 ${o.stats.leadership} · 무력 ${o.stats.war} · 지력 ${o.stats.intelligence}</div><small>${effect.label} · 예상 종합 지휘력 ${officerCombinedPower(o,Math.max(1,fromR.troops),'spear')}</small></div></div><p class="officer-transfer-note">${mode==='move'?'같은 세력 영토로 장수 배치를 이동합니다. 병력 수와 기존 전투 수치는 변경하지 않습니다.':mode==='expedition'?'기존 침략 시스템을 사용하도록 출발 영토와 공격 목표를 자동 지정합니다. 실제 진군은 기존 전술/진군 명령에서 실행됩니다.':'현재는 인접한 공격 가능 영토가 아니므로 출병할 수 없습니다.'}</p><div class="officer-transfer-actions"><button class="quiet" data-officer-transfer-cancel type="button">취소</button><button data-officer-transfer-confirm type="button" ${mode==='blocked'?'disabled':''}>${actionText}</button></div></div>`;document.getElementById('officerTransferModal').showModal()}
function confirmOfficerTransfer(){const d=officerTransferDraft,modal=document.getElementById('officerTransferModal');if(!d)return;if(d.mode==='move'){if(moveOfficerToTerritory(d.officerId,d.targetId)){notify(`${OFFICER_BY_ID.get(d.officerId)?.name||'장수'}이(가) ${regions[d.targetId].name}(으)로 이동했습니다.`);log(`장수 이동 · ${regions[d.from].name} → ${regions[d.targetId].name}`);officerPanelTerritoryId=d.targetId;render();openOfficerPanel(d.targetId)}}else if(d.mode==='expedition'){const c=OFFICER_BY_ID.get(d.officerId);selected=d.from;target=null;actionMode='inspect';attackType=null;openInvasionCommandModal(d.from,d.targetId,d.officerId,'normal');notify(`${c?.name||'장수'} 지휘 · ${regions[d.targetId].name} 출병 계획을 열었습니다.`)}officerTransferDraft=null;if(modal?.open)modal.close()}
let officerPanelTerritoryId=null;
function renderOfficerPanel(territoryId){ensureOfficerUI();const i=Number(territoryId),r=regions[i];if(!r)return;officerPanelTerritoryId=i;const list=officersInTerritory(i),owner=r.owner,terrain=typeof terrainKind==='function'?terrainKind(i):'plain',terrainLabel={mountain:'산악',highland:'고지',grassland:'초원',plain:'평지'}[terrain]||terrain,gov=governorForTerritory(i),govFx=governorEffect(gov),synergies=officerSynergiesForTerritory(i);const resourceText=(r.resources||[]).map(x=>RESOURCE_NAMES?.[x]||x).join(' · ')||'없음',activeEffects=territoryEffectLabels(i);document.getElementById('officerPanelContent').innerHTML=`<div class="officer-panel-top"><div class="officer-panel-topline"><div><div class="officer-panel-eyebrow">영토 상세 · 장수 배치</div><h2>${r.name}${isCapital(i)?' ★':''}</h2><div class="officer-panel-owner" style="color:${K[owner]?.color||'#ddd'}">${K[owner]?.name||'무소속'} · ${r.troops}명 주둔</div></div><button class="officer-panel-close" data-officer-close type="button" aria-label="장수 패널 닫기">닫기</button></div><div class="officer-region-summary"><span>지형<b>${terrainLabel}</b></span><span>특산품<b>${resourceText}</b></span><span>장수<b>${list.length}명</b></span></div></div><div class="officer-panel-body">${activeEffects.length?`<div class="officer-effect-strip">${activeEffects.map(x=>`<span>${x}</span>`).join('')}</div>`:''}${gov?`<div class="officer-governor-box"><strong>${govFx.icon} 태수 · ${gov.name}</strong><small>${govFx.label} · 최대 출병 ${officerMaxTroops(gov)}명 · 수입 +${Math.round(officerAdministration(gov)*OFFICER_GAMEPLAY_CONFIG.politics.incomePerPoint*100)}% · 징병 +${Math.round(officerAdministration(gov)*OFFICER_GAMEPLAY_CONFIG.politics.recruitPerPoint*100)}%</small></div>`:''}${synergies.length?`<div class="officer-synergy-strip">${synergies.map(x=>`<span title="${x.description||''}">✦ ${x.name}</span>`).join('')}</div>`:''}<div class="officer-panel-section"><strong>배치 장수</strong><small>${r.owner===player?'카드를 지도 영토로 드래그 가능':'장수를 누르면 상세 능력치'}</small></div><div class="officer-list">${list.length?list.map(officerCard).join(''):'<div class="officer-empty">배치된 장수가 없습니다.</div>'}</div></div>`}
function openOfficerPanel(territoryId){if(!isActiveTerritory(Number(territoryId)))return;renderOfficerPanel(territoryId);requestAnimationFrame(()=>document.getElementById('officerTerritoryPanel')?.classList.add('open'))}
function closeOfficerPanel(){const panel=document.getElementById('officerTerritoryPanel');if(panel)panel.classList.remove('open');officerPanelTerritoryId=null}
function refreshOfficerPanel(){const panel=document.getElementById('officerTerritoryPanel');if(panel?.classList.contains('open')&&officerPanelTerritoryId!==null)renderOfficerPanel(officerPanelTerritoryId)}
const OFFICER_DETAIL_STAT_META={
 leadership:{label:'통솔',icon:'金',className:'command'},
 war:{label:'무력',icon:'火',className:'strength'},
 intelligence:{label:'지력',icon:'水',className:'intelligence'},
 charisma:{label:'매력',icon:'木',className:'charm'},
 authority:{label:'권위',icon:'土',className:'authority'}
};
const OFFICER_TRAIT_ICON={전쟁:'⚔',방어:'盾',기습:'騎','병력 운용':'旗',계략:'策','계략 방어':'眼',첩보:'密',내정:'農',경제:'財','도시 관리':'治',등용:'人',징집:'募',건설:'工'};
function officerDetailTitle(o){return String(o?.title||({king:'군주',general:'대장군',chancellor:'재상',guard:'수비장'}[o?.office])||o?.role||'장수')}
function officerDetailSalary(o){return officerIsRuler(o)?0:10}
function officerDetailAge(o){if(o?.age!==null&&o?.age!==undefined&&o?.age!==''&&Number.isFinite(Number(o.age)))return Math.max(16,Math.min(80,Math.round(Number(o.age))));const hash=[...String(o?.id||'officer')].reduce((h,ch)=>((h*31)+ch.charCodeAt(0))>>>0,0);return 24+(hash%27)}
function officerDetailPortrait(o){if(o?.portraitUrl)return `<img src="${o.portraitUrl}" alt="${o.name||'장수'} 초상" class="tw-officer-portrait-image">`;return officerPortraitSvg(o,360)}
function officerTraitRows(o,isGov=false,govFx=null){const rows=[];for(const raw of (o?.traits||[])){if(!raw)continue;const item=typeof raw==='string'?{name:raw}:raw;rows.push({icon:item.icon||'◆',name:item.name||'특성',description:item.description||'개인 특성'})}for(const skill of (o?.skills||[])){const d=officerSkillDefinition(skill);if(!d)continue;rows.push({icon:OFFICER_TRAIT_ICON[d.category]||'◆',name:d.name,description:d.description})}const temperament={unyielding:{icon:'義',name:'강직',description:'포로 상태에서 적국의 등용 설득 성공률 -12%'},balanced:{icon:'和',name:'중용',description:'포로 등용 설득에 추가 성향 보정 없음'},flexible:{icon:'變',name:'유연',description:'포로 상태에서 적국의 등용 설득 성공률 +8%'}}[o?.temperament]||null;if(temperament)rows.push(temperament);if(isGov&&govFx)rows.push({icon:govFx.icon||'政',name:'태수 재임',description:`${govFx.label} · 전투 보정 ${govFx.combatBonus>=0?'+':''}${govFx.combatBonus} · 내정 보정 ${govFx.domesticBonus>=0?'+':''}${govFx.domesticBonus}`});const seen=new Set();return rows.filter(x=>{const k=x.name+'|'+x.description;if(seen.has(k))return false;seen.add(k);return true}).slice(0,6)}
function renderOfficerDetailStat(key,value){const m=OFFICER_DETAIL_STAT_META[key],v=Math.max(0,Math.min(100,Math.round(Number(value)||0)));return `<div class="tw-officer-stat ${m.className}"><span class="tw-officer-stat-emblem">${m.icon}</span><span class="tw-officer-stat-name">${m.label}</span><div class="tw-officer-stat-track"><i style="width:${v}%"></i></div><b>${v}</b></div>`}
function renderOfficerDetailModal(o){if(!o)return'';const owner=officerOwner(o),r=regions?.[o.territoryId],synergies=officerSynergiesForOfficer(o),isGov=Number.isInteger(Number(o.territoryId))&&territoryOfficerState(o.territoryId).governorId===o.id,govFx=governorEffect(o),status=officerStatusLabel(o),salary=officerDetailSalary(o),age=officerDetailAge(o),title=officerDetailTitle(o),rank=officerCardRank(o),traits=officerTraitRows(o,isGov,govFx),canScheme=officerCanUseScheme(o),hostiles=adjacentHostileTerritories(o),ownTerritory=regions?.[o.territoryId]?.owner===player,factionColor=K[owner]?.color||'#b9904c';const statKeys=['leadership','war','intelligence','charisma','authority'];const aptitude=Object.entries(OFFICER_APTITUDE_LABELS).map(([k,label])=>`<span><em>${label}</em><b>${o.aptitude?.[k]||'C'}</b></span>`).join('');const assignment=`${OFFICER_ASSIGNMENTS[o.assignment]?.icon||'旗'} ${officerAssignmentLabel(o.assignment)}`;return `<div class="tw-officer-detail" style="--officer-faction:${factionColor}"><button class="tw-officer-close" data-officer-modal-close type="button" aria-label="닫기">닫기 ×</button><aside class="tw-officer-hero"><div class="tw-officer-hero-bg"></div><div class="tw-officer-rank-seal rank-${rank.id.toLowerCase()}"><strong>${rank.id}</strong><span>${rank.label}</span></div><div class="tw-officer-portrait-wrap">${officerDetailPortrait(o)}</div><div class="tw-officer-hero-caption"><span>${K[owner]?.name||'무소속'}${r?.name?` · ${r.name}`:''}</span><b>${title}</b></div></aside><main class="tw-officer-info"><header class="tw-officer-head"><div class="tw-officer-kicker">${rank.id}급 · ${rank.label}${isGov?' · 태수':''}</div><h2>${o.name}</h2><div class="tw-officer-subtitle">${title} · ${o.role||'장수'}</div><div class="tw-officer-meta"><span title="녹봉">◉ 녹봉 <b>${salary+'금'}</b></span><span title="나이">歲 <b>${age}세</b></span><span title="충성도">忠 <b>${o.loyalty}</b></span><span class="status-${normalizeOfficerStatus(o.status)}" title="현재 상태">● <b>${status}</b></span><span title="현재 담당">${assignment}</span></div>${synergies.length?`<div class="tw-officer-synergy">${synergies.map(x=>`<span title="${x.description||''}">✦ ${x.name}</span>`).join('')}</div>`:''}</header><section class="tw-officer-stats"><h3>오대 능력</h3>${statKeys.map(k=>renderOfficerDetailStat(k,o.stats?.[k])).join('')}</section><section class="tw-officer-aptitude"><h3>병과 적성</h3><div>${aptitude}</div></section><section class="tw-officer-traits"><div class="tw-officer-section-title"><h3>특성</h3><small>실제 게임 효과</small></div><div class="tw-officer-trait-list">${traits.length?traits.map(t=>`<article><span class="tw-officer-trait-icon">${t.icon}</span><div><b>${t.name}</b><p>${t.description}</p></div></article>`).join(''):'<p class="tw-officer-empty-trait">등록된 특성이 없습니다.</p>'}</div></section>${ownTerritory?`<section class="tw-officer-command"><div class="tw-officer-section-title"><h3>담당 보직</h3><small>현재 ${officerAssignmentLabel(o.assignment)}</small></div>${renderOfficerAssignmentControls(o)}${hostiles.length?`<div class="tw-officer-scheme-row">${Object.entries(OFFICER_SCHEMES).map(([key,v])=>`<button type="button" data-officer-scheme="${key}" data-officer-id="${o.id}" ${canScheme?'':'disabled'}><b>${v.icon}</b><span>${v.name}</span></button>`).join('')}</div>`:''}</section>`:''}</main></div>`}
function openOfficerDetail(officerId){ensureOfficerUI();const o=OFFICER_BY_ID.get(String(officerId));if(!o)return;const target=document.getElementById('officerModalContent');if(!target)return;target.innerHTML=renderOfficerDetailModal(o);const modal=document.getElementById('officerDetailModal');if(modal&&!modal.open)modal.showModal()}
window.renderOfficerDetailModal=renderOfficerDetailModal;

window.SAMGUK_OFFICERS={version:92,Officer,roster:OFFICERS,presets:OFFICER_PRESETS,synergyPresets:OFFICER_SYNERGY_PRESETS,territoryState:OFFICER_TERRITORY_STATE,gameplayConfig:OFFICER_GAMEPLAY_CONFIG,schemes:OFFICER_SCHEMES,getInitDiagnostics:()=>OFFICER_INIT_DIAGNOSTICS,reinitialize:()=>{resetOfficerAssignments();resetOfficerTurnState();return OFFICERS},getByTerritory:officersInTerritory,getTerritoryData:territoryOfficerData,getGovernor:governorForTerritory,setGovernor:setTerritoryGovernor,getSynergies:officerSynergiesForTerritory,moveOfficer:moveOfficerToTerritory,getById:id=>OFFICER_BY_ID.get(String(id)),getCommander:territoryCommander,maxTroops:id=>territoryMaxTroops(Number(id)),schemeChance:(officerId,targetId,type='fire')=>{const o=OFFICER_BY_ID.get(String(officerId));return o?intellectSchemeChance(o,Number(targetId),type):0},useScheme:executeOfficerScheme,attackPreview:(id,troops,aptitude='spear')=>OFFICER_BY_ID.get(String(id))?.commandAttack(troops,aptitude)??0,defensePreview:(id,troops,aptitude='spear')=>OFFICER_BY_ID.get(String(id))?.commandDefense(troops,aptitude)??0,combinedPowerPreview:(id,troops,aptitude='spear')=>officerCombinedPower(OFFICER_BY_ID.get(String(id)),troops,aptitude),domesticPreview:id=>OFFICER_BY_ID.get(String(id))?.domesticScore()??0,governorEffect:id=>governorEffect(OFFICER_BY_ID.get(String(id))),openTerritory:openOfficerPanel,resetTurnState:resetOfficerTurnState,getTurnState:id=>OFFICER_BY_ID.get(String(id))?.turnState||null};

const MOUNTAIN_EVENTS={
 baekdusan:{name:'백두산',icon:'🏔️',x:602,y:415,radius:165},
 geumgangsan:{name:'금강산',icon:'🏔️',x:587,y:657,radius:165},
 taesan:{name:'태산',icon:'🏔️',x:-87,y:887,radius:165}
};
// 명산 접근 영토: 현재 32x32 랜드마크 이미지가 실제로 조금이라도 걸치는 영토만 지정.
// 소유 국가는 고정하지 않고 regions[territoryId].owner를 매번 확인한다.
const MOUNTAIN_ACCESS={
 baekdusan:new Set([Number(window.SAMGUK_JOLBON_SPLIT?.jolbonEastId??1),64]),       // 졸본 동부, 국내성 동부
 geumgangsan:new Set([3]),        // 동예
 taesan:new Set([58])             // 새 태산 위치: 연주
};
function canUseMountain(countryId,mountainId){const access=MOUNTAIN_ACCESS[mountainId];return !!access&&[...access].some(territoryId=>regions[territoryId]&&regions[territoryId].owner===countryId)}
// [1] 명산 이벤트는 국가별·명산별로 게임 연도당 1회만 이용한다. 계절/연도는 turn에서 계산하며 별도 전역 연도 상태를 만들지 않는다.
function mountainVisitState(countryId){const state=K[countryId];if(!state)return {};if(!state.mountainLastVisitedYear||typeof state.mountainLastVisitedYear!=='object')state.mountainLastVisitedYear={};return state.mountainLastVisitedYear}
function mountainVisitedThisYear(countryId,mountainId){return Number(mountainVisitState(countryId)[mountainId])===currentGameYear()}
function markMountainVisited(countryId,mountainId){mountainVisitState(countryId)[mountainId]=currentGameYear();return currentGameYear()}
function mountainCooldownUntilYearEnd(maxTurns=8){return Math.max(0,Math.min(Math.max(0,Number(maxTurns)||0),8-turnInYear()))}
let mountainEventSelection=null;
const GREAT_WALL={name:'만리장성',cost:100,maxUpgrade:10,baseDefense:30,stepDefense:3,southTerritories:new Set([56,57,88]),crossings:new Set(['37-56','37-88','38-88','55-56','56-87','57-87'])};
let wallUpgradeCount=0;
function greatWallDefenseBonus(){return GREAT_WALL.baseDefense+wallUpgradeCount*GREAT_WALL.stepDefense}
function greatWallDefensePercent(attacker,defender){if(attacker===null||defender===null||!regions[attacker]||!regions[defender])return 0;const pair=[attacker,defender].sort((a,b)=>a-b).join('-');return GREAT_WALL.crossings.has(pair)&&seeds[attacker][2]<seeds[defender][2]?greatWallDefenseBonus():0}
function ownsGreatWallSouth(k){return regions.some((r,i)=>r.owner===k&&GREAT_WALL.southTerritories.has(i))}
function canUpgradeGreatWall(k=player){const funds=k===player?gold:(K[k]?.gold||0);return ownsGreatWallSouth(k)&&funds>=GREAT_WALL.cost&&wallUpgradeCount<GREAT_WALL.maxUpgrade}
function greatWallStatusText(k=player){if(wallUpgradeCount>=GREAT_WALL.maxUpgrade)return '증축 완료';if(!ownsGreatWallSouth(k))return '남쪽 접경 영토 필요';const funds=k===player?gold:(K[k]?.gold||0);return funds>=GREAT_WALL.cost?'사용 가능':'금 부족'}
function ensureGreatWallUI(){
 if(!document.getElementById('greatWallStyles')){const style=document.createElement('style');style.id='greatWallStyles';style.textContent='.great-wall-dialog{width:min(520px,calc(100% - 28px));max-width:520px}.greatWallBtn{background:#f7f7f2;color:#24452c;border-color:#d9ddcf;text-align:left;display:grid;gap:4px;padding:12px 14px;min-height:72px}.greatWallBtn:hover:not(:disabled){background:#fff;border-color:#87a08a}.greatWallBtn strong{color:#24452c;font-size:15px}.greatWallBtn small{color:#536858;font-size:12px;line-height:1.45}.greatWallBtn span{color:#758276;font-size:11px;font-weight:700}.greatWallBtn:disabled{background:#dfe2dc;color:#777;opacity:.72;border-color:#c8cdc4}.greatWallBtn:disabled strong,.greatWallBtn:disabled small,.greatWallBtn:disabled span{color:#777}.greatWallInfo{display:grid;gap:7px;margin:12px 0 16px}.greatWallInfo p{margin:0;color:#d6d7d0;font-size:13px;line-height:1.5}.greatWallInfo b{color:#fff3cb}';document.head.appendChild(style)}
 if(!document.getElementById('greatWallMenu')){const menu=document.createElement('dialog');menu.id='greatWallMenu';menu.className='mountain-event-dialog great-wall-dialog';menu.innerHTML='<div class="dialog-inner"><span class="eyebrow">🏯 방어선 관리</span><h2 id="greatWallMenuTitle">만리장성</h2><p id="greatWallMenuDesc" class="mountain-menu-desc"></p><div id="greatWallInfo" class="greatWallInfo"></div><div id="greatWallActions" class="destination-list mountain-event-actions"></div><button class="quiet mountain-close" id="closeGreatWallMenu">닫기</button></div>';document.body.appendChild(menu);menu.addEventListener('click',e=>{const btn=e.target.closest('[data-great-wall-action]');if(!btn||btn.disabled)return;if(btn.dataset.greatWallAction==='upgrade')upgradeGreatWall(player)});document.getElementById('closeGreatWallMenu').onclick=()=>menu.close();}}
function renderGreatWallMenu(k=player){ensureGreatWallUI();document.getElementById('greatWallMenuTitle').textContent=GREAT_WALL.name;document.getElementById('greatWallMenuDesc').textContent='북쪽에서 남쪽으로 성벽을 넘어 공격할 때 남쪽 수비군에게 방어 보너스를 부여합니다.';document.getElementById('greatWallInfo').innerHTML=[
 '<p>현재 방어 효과: <b>+'+greatWallDefenseBonus()+'%</b></p>',
 '<p>증축 단계: <b>'+wallUpgradeCount+' / '+GREAT_WALL.maxUpgrade+'</b></p>',
 '<p>적용: 북쪽 → 남쪽으로 장성을 넘어 침략 시에만 수비 보너스 적용</p>',
 ownsGreatWallSouth(k)?'<p>현재 국가는 장성 남쪽 접경 영토를 보유하고 있습니다.</p>':'<p>만리장성 남쪽 접경 영토를 보유한 국가만 증축할 수 있습니다.</p>'
 ].join('');document.getElementById('greatWallActions').innerHTML='<button class="greatWallBtn" data-great-wall-action="upgrade" '+(canUpgradeGreatWall(k)?'':'disabled')+'><strong>🏗️ 증축</strong><small>100금 소비 · 방어 효과 +3% · 최대 10회</small><span>'+greatWallStatusText(k)+'</span></button>'}
function openGreatWallMenu(){if(!playing||busy)return;renderGreatWallMenu(player);const d=document.getElementById('greatWallMenu');if(!d.open)d.showModal()}
function upgradeGreatWall(k=player){if(wallUpgradeCount>=GREAT_WALL.maxUpgrade){notify('만리장성은 이미 최대 단계까지 증축되었습니다.');return false}if(!ownsGreatWallSouth(k)){notify('만리장성 남쪽 접경 영토를 보유해야 증축할 수 있습니다.');return false}const funds=k===player?gold:(K[k]?.gold||0);if(funds<GREAT_WALL.cost){notify('금이 부족합니다.');return false}if(k===player)gold=Math.round((gold-GREAT_WALL.cost)*100)/100;else K[k].gold=Math.round(((K[k].gold||0)-GREAT_WALL.cost)*100)/100;const before=greatWallDefenseBonus();wallUpgradeCount=Math.min(GREAT_WALL.maxUpgrade,wallUpgradeCount+1);const after=greatWallDefenseBonus();log('🏯 만리장성 증축 · 방어 효과 +'+before+'% → +'+after+'% · 금 -'+GREAT_WALL.cost);notify(wallUpgradeCount>=GREAT_WALL.maxUpgrade?'만리장성이 최대 단계까지 증축되었습니다.':'만리장성 방어 효과가 강화되었습니다.');if(document.getElementById('greatWallMenu')?.open)renderGreatWallMenu(k);render();return true}
function mountainNearbyTerritories(id){const m=MOUNTAIN_EVENTS[id];if(!m)return[];return seeds.map((s,i)=>Math.hypot(s[1]-m.x,s[2]-m.y)<=m.radius?i:-1).filter(i=>i>=0)}
function baekduBeaconProtects(i){const r=regions[i];return !!r&&!!K[r.owner]?.baekduBeaconTurns&&mountainNearbyTerritories('baekdusan').includes(i)}
function adjustWarPenalty(k,delta){warTurns[k]=Math.max(0,Math.min(100,(warTurns[k]||0)+delta));return warTurns[k]}
function addMountainGold(k,amount){if(k===player)gold=Math.round((gold+amount)*100)/100;else K[k].gold=Math.round(((K[k].gold||0)+amount)*100)/100}
function grantNextAttackBonus(k){K[k].nextAttackBonus=1.10}
function mountainCooldownLabel(n){return n>0?`${n}턴 후 사용 가능`:'사용 가능'}
function ensureMountainEventUI(){
 if(!document.getElementById('mountainEventMenu')){
  const menu=document.createElement('dialog');menu.id='mountainEventMenu';menu.className='mountain-event-dialog';menu.innerHTML='<div class="dialog-inner"><span class="eyebrow" id="mountainMenuEyebrow">명산 이벤트</span><h2 id="mountainMenuTitle">명산</h2><p id="mountainMenuDesc" class="mountain-menu-desc"></p><p class="mountain-annual-note">※ 명산 탐방 이벤트는 1년에 1회만 이용할 수 있습니다.</p><div id="mountainEventActions" class="destination-list mountain-event-actions"></div><button class="quiet mountain-close" id="closeMountainEventMenu">닫기</button></div>';document.body.appendChild(menu);
  menu.addEventListener('click',e=>{const b=e.target.closest('[data-mountain-action]');if(!b||b.disabled)return;const action=b.dataset.mountainAction,id=mountainEventSelection;menu.close();executeMountainEvent(id,action,player,true)});
  menu.addEventListener('cancel',()=>{mountainEventSelection=null});
  document.getElementById('closeMountainEventMenu').onclick=()=>{menu.close();mountainEventSelection=null};
 }
 if(!document.getElementById('mountainEventResult')){
  const result=document.createElement('dialog');result.id='mountainEventResult';result.className='mountain-result neutral';result.innerHTML='<div class="dialog-inner"><span class="eyebrow" id="mountainResultMountain">명산 이벤트</span><h2 id="mountainResultTitle">결과</h2><p id="mountainResultDescription" class="mountain-result-description"></p><div id="mountainResultEffects" class="mountain-result-effects"></div><button class="primary" id="closeMountainEventResult">확인</button></div>';document.body.appendChild(result);
  document.getElementById('closeMountainEventResult').onclick=()=>result.close();
 }
}
function renderMountainEventMenu(id){ensureMountainEventUI();const k=K[player],m=MOUNTAIN_EVENTS[id],actions=[];if(!m)return;
 const annualLocked=mountainVisitedThisYear(player,id),annualStatus=annualLocked?`${currentGameYear()}년 이용 완료`:'사용 가능';
 if(id==='baekdusan'){
  actions.push({key:'baekdu-ritual',title:'☀️ 제천의식',desc:'전쟁패널티 -10',disabled:annualLocked||k.baekduRitualUsed,status:annualLocked?annualStatus:(k.baekduRitualUsed?'제천의식 완료':'사용 가능')});
  actions.push({key:'baekdu-beacon',title:'🔥 봉수 점화',desc:'주변 적군 정찰 · 4턴간 주변 기습 +20% 무효',disabled:annualLocked||(k.baekduBeaconCooldown||0)>0,status:annualLocked?annualStatus:mountainCooldownLabel(k.baekduBeaconCooldown||0)});
  actions.push({key:'baekdu-oracle',title:'📜 천명의 징조',desc:'대길 / 길 / 흉조 랜덤 이벤트',disabled:annualLocked||(k.baekduOracleCooldown||0)>0,status:annualLocked?annualStatus:mountainCooldownLabel(k.baekduOracleCooldown||0)});
  document.getElementById('mountainMenuDesc').textContent=annualLocked?'천명과 군사의 기운이 서린 명산입니다. 올해의 탐방은 이미 완료했습니다.':'천명과 군사의 기운이 서린 명산입니다.';
 }else if(id==='geumgangsan'){
  actions.push({key:'geumgang-ritual',title:'☀️ 제천의식',desc:'전쟁패널티 -10',disabled:annualLocked||k.geumgangRitualUsed,status:annualLocked?annualStatus:(k.geumgangRitualUsed?'제천의식 완료':'사용 가능')});
  actions.push({key:'geumgang-herb',title:'🌿 약초 채집',desc:'금 중심 랜덤 보상',disabled:annualLocked||(k.geumgangHerbCooldown||0)>0,status:annualLocked?annualStatus:mountainCooldownLabel(k.geumgangHerbCooldown||0)});
  actions.push({key:'geumgang-expedition',title:'🏔️ 산악 원정',desc:'4종 랜덤 탐험 결과',disabled:annualLocked||(k.geumgangExpeditionCooldown||0)>0,status:annualLocked?annualStatus:mountainCooldownLabel(k.geumgangExpeditionCooldown||0)});
  document.getElementById('mountainMenuDesc').textContent=annualLocked?'민생과 탐험의 기운이 깃든 명산입니다. 올해의 탐방은 이미 완료했습니다.':'민생과 탐험의 기운이 깃든 명산입니다.';
 }else{
  actions.push({key:'taesan-ritual',title:'☀️ 제천의식',desc:'전쟁패널티 -10',disabled:annualLocked||k.taesanRitualUsed,status:annualLocked?annualStatus:(k.taesanRitualUsed?'제천의식 완료':'사용 가능')});
  actions.push({key:'taesan-herb',title:'🌿 약초 채집',desc:'금 중심 랜덤 보상',disabled:annualLocked||(k.taesanHerbCooldown||0)>0,status:annualLocked?annualStatus:mountainCooldownLabel(k.taesanHerbCooldown||0)});
  actions.push({key:'taesan-expedition',title:'🏔️ 산악 원정',desc:'4종 랜덤 탐험 결과',disabled:annualLocked||(k.taesanExpeditionCooldown||0)>0,status:annualLocked?annualStatus:mountainCooldownLabel(k.taesanExpeditionCooldown||0)});
  document.getElementById('mountainMenuDesc').textContent=annualLocked?'민생과 탐험의 기운이 깃든 명산입니다. 올해의 탐방은 이미 완료했습니다.':'금강산과 같은 민생과 탐험의 기운이 깃든 명산입니다.';
 }
 document.getElementById('mountainMenuEyebrow').textContent=`${m.icon} 명산 이벤트 · ${currentGameYear()}년`;
 document.getElementById('mountainMenuTitle').textContent=m.name;
 document.getElementById('mountainEventActions').innerHTML=actions.map(a=>`<button class="mountainEventBtn" data-mountain-action="${a.key}" ${a.disabled?'disabled':''}><strong>${a.title}</strong><small>${a.desc}</small><span>${a.status}</span></button>`).join('');
}
function openMountainEventMenu(id){if(!playing||busy||!MOUNTAIN_EVENTS[id])return;if(!canUseMountain(player,id)){notify(MOUNTAIN_EVENTS[id].name+'과 맞닿은 영토를 보유해야 이용할 수 있습니다.');return}ensureMountainEventUI();mountainEventSelection=id;renderMountainEventMenu(id);const d=document.getElementById('mountainEventMenu');if(!d.open)d.showModal()}
function showMountainEventResult(data){ensureMountainEventUI();const d=document.getElementById('mountainEventResult');d.className=`mountain-result ${data.type||'neutral'}`;document.getElementById('mountainResultMountain').textContent=`${data.icon||'🏔️'} ${data.mountain||'명산'}`;document.getElementById('mountainResultTitle').textContent=data.title||'이벤트 결과';document.getElementById('mountainResultDescription').textContent=data.description||'';const effects=document.getElementById('mountainResultEffects');effects.innerHTML='';for(const effect of data.effects||[]){const p=document.createElement('p');p.textContent=effect;effects.appendChild(p)}if(!d.open)d.showModal()}
function executeMountainEvent(id,action,k=player,showPopup=k===player){const state=K[k],m=MOUNTAIN_EVENTS[id];if(!state||!m||!canUseMountain(k,id))return false;if(mountainVisitedThisYear(k,id)){if(showPopup)notify(`※ ${m.name} 탐방 이벤트는 ${currentGameYear()}년에 이미 이용했습니다.`);return false}let data=null;
 if(action==='baekdu-ritual'){if(state.baekduRitualUsed)return false;state.baekduRitualUsed=true;adjustWarPenalty(k,-10);data={mountain:'백두산',icon:'☀️',title:'제천의식',description:`${K[k].name}가 백두산에서 하늘에 제를 올렸습니다. 백성들의 불안이 가라앉습니다.`,effects:['⚔️ 전쟁패널티 -10'],type:'great'};}
 else if(action==='baekdu-beacon'){if((state.baekduBeaconCooldown||0)>0)return false;state.baekduBeaconCooldown=mountainCooldownUntilYearEnd(8);state.baekduBeaconTurns=4;const enemies=mountainNearbyTerritories('baekdusan').filter(i=>regions[i].owner!==k&&count(regions[i].owner)>0);const scout=enemies.length?enemies.map(i=>`${regions[i].name}(${K[regions[i].owner].name} ${regions[i].troops}명)`).join(' · '):'주변 적군 없음';data={mountain:'백두산',icon:'🔥',title:'봉수 점화',description:'산 정상에 봉화가 올랐습니다. 주변의 적 움직임을 빠르게 파악할 수 있습니다.',effects:[`👁️ 정찰: ${scout}`,'⚡ 4턴간 백두산 주변 기습 +20% 보너스 무효'],type:'success'};}
 else if(action==='baekdu-oracle'){if((state.baekduOracleCooldown||0)>0)return false;state.baekduOracleCooldown=mountainCooldownUntilYearEnd(8);const roll=Math.random();if(roll<.25){adjustWarPenalty(k,-5);grantNextAttackBonus(k);data={mountain:'백두산',icon:'📜',title:'대길',description:'하늘이 군세를 돕는 징조가 나타났습니다.',effects:['⚔️ 전쟁패널티 -5','🗡️ 다음 공격 전투력 +10%'],type:'great'};}else if(roll<.75){adjustWarPenalty(k,-3);data={mountain:'백두산',icon:'📜',title:'길',description:'평온한 기운이 산을 감쌉니다.',effects:['⚔️ 전쟁패널티 -3'],type:'success'};}else{adjustWarPenalty(k,3);data={mountain:'백두산',icon:'📜',title:'흉조',description:'불길한 기운이 산 아래를 뒤덮습니다.',effects:['⚠️ 전쟁패널티 +3'],type:'bad'};}}
 else if(action==='geumgang-ritual'){if(state.geumgangRitualUsed)return false;state.geumgangRitualUsed=true;adjustWarPenalty(k,-10);data={mountain:'금강산',icon:'☀️',title:'제천의식',description:'금강산에서 국태민안을 기원하는 제천의식이 거행되었습니다.',effects:['⚔️ 전쟁패널티 -10'],type:'great'};}
 else if(action==='geumgang-herb'){if((state.geumgangHerbCooldown||0)>0)return false;state.geumgangHerbCooldown=mountainCooldownUntilYearEnd(6);const roll=Math.random();if(roll<.6){addMountainGold(k,80);data={mountain:'금강산',icon:'🌿',title:'약초 발견',description:'산중에서 쓸 만한 약초를 발견했습니다.',effects:['💰 금 +80'],type:'success'};}else if(roll<.9){addMountainGold(k,150);data={mountain:'금강산',icon:'🌿',title:'희귀 약초 발견!',description:'쉽게 구할 수 없는 귀한 약초입니다.',effects:['💰 금 +150'],type:'great'};}else{addMountainGold(k,100);adjustWarPenalty(k,-3);data={mountain:'금강산',icon:'🌿',title:'영험한 약초',description:'보기 드문 약초가 백성들 사이에서 길조로 받아들여졌습니다.',effects:['💰 금 +100','⚔️ 전쟁패널티 -3'],type:'great'};}}
 else if(action==='geumgang-expedition'){if((state.geumgangExpeditionCooldown||0)>0)return false;state.geumgangExpeditionCooldown=mountainCooldownUntilYearEnd(8);const roll=Math.random();if(roll<.4){addMountainGold(k,100);data={mountain:'금강산',icon:'🏔️',title:'무사 귀환',description:'원정대가 약간의 산물을 가지고 무사히 돌아왔습니다.',effects:['💰 금 +100'],type:'success'};}else if(roll<.7){data={mountain:'금강산',icon:'🏔️',title:'원정 실패',description:'험준한 산세 때문에 원정대가 더 이상 전진하지 못했습니다.',effects:['특별한 성과 없음'],type:'neutral'};}else if(roll<.9){grantNextAttackBonus(k);data={mountain:'금강산',icon:'🏔️',title:'숨겨진 산길 발견!',description:'지도에 기록되지 않은 길을 찾아냈습니다.',effects:['🗡️ 다음 공격 전투력 +10%'],type:'great'};}else{addMountainGold(k,200);adjustWarPenalty(k,-5);data={mountain:'금강산',icon:'🏔️',title:'비경 발견!',description:'원정대가 사람의 발길이 닿지 않은 깊은 계곡을 발견했습니다.',effects:['💰 금 +200','⚔️ 전쟁패널티 -5'],type:'great'};}}
 else if(action==='taesan-ritual'){if(state.taesanRitualUsed)return false;state.taesanRitualUsed=true;adjustWarPenalty(k,-10);data={mountain:'태산',icon:'☀️',title:'제천의식',description:'태산에서 국태민안을 기원하는 제천의식이 거행되었습니다.',effects:['⚔️ 전쟁패널티 -10'],type:'great'};}
 else if(action==='taesan-herb'){if((state.taesanHerbCooldown||0)>0)return false;state.taesanHerbCooldown=mountainCooldownUntilYearEnd(6);const roll=Math.random();if(roll<.6){addMountainGold(k,80);data={mountain:'태산',icon:'🌿',title:'약초 발견',description:'산중에서 쓸 만한 약초를 발견했습니다.',effects:['💰 금 +80'],type:'success'};}else if(roll<.9){addMountainGold(k,150);data={mountain:'태산',icon:'🌿',title:'희귀 약초 발견!',description:'쉽게 구할 수 없는 귀한 약초입니다.',effects:['💰 금 +150'],type:'great'};}else{addMountainGold(k,100);adjustWarPenalty(k,-3);data={mountain:'태산',icon:'🌿',title:'영험한 약초',description:'보기 드문 약초가 백성들 사이에서 길조로 받아들여졌습니다.',effects:['💰 금 +100','⚔️ 전쟁패널티 -3'],type:'great'};}}
 else if(action==='taesan-expedition'){if((state.taesanExpeditionCooldown||0)>0)return false;state.taesanExpeditionCooldown=mountainCooldownUntilYearEnd(8);const roll=Math.random();if(roll<.4){addMountainGold(k,100);data={mountain:'태산',icon:'🏔️',title:'무사 귀환',description:'원정대가 약간의 산물을 가지고 무사히 돌아왔습니다.',effects:['💰 금 +100'],type:'success'};}else if(roll<.7){data={mountain:'태산',icon:'🏔️',title:'원정 실패',description:'험준한 산세 때문에 원정대가 더 이상 전진하지 못했습니다.',effects:['특별한 성과 없음'],type:'neutral'};}else if(roll<.9){grantNextAttackBonus(k);data={mountain:'태산',icon:'🏔️',title:'숨겨진 산길 발견!',description:'지도에 기록되지 않은 길을 찾아냈습니다.',effects:['🗡️ 다음 공격 전투력 +10%'],type:'great'};}else{addMountainGold(k,200);adjustWarPenalty(k,-5);data={mountain:'태산',icon:'🏔️',title:'비경 발견!',description:'원정대가 사람의 발길이 닿지 않은 깊은 계곡을 발견했습니다.',effects:['💰 금 +200','⚔️ 전쟁패널티 -5'],type:'great'};}}
 if(!data)return false;markMountainVisited(k,id);if(showPopup)showMountainEventResult(data);return true}
function tickMountainEvents(){for(const k of K){for(const key of ['baekduBeaconCooldown','baekduBeaconTurns','baekduOracleCooldown','geumgangHerbCooldown','geumgangExpeditionCooldown','taesanHerbCooldown','taesanExpeditionCooldown'])k[key]=Math.max(0,(k[key]||0)-1)}}
function maybeAiMountainEvent(k){const s=K[k];if(!s||!count(k))return;
 const canAnnual=id=>canUseMountain(k,id)&&!mountainVisitedThisYear(k,id);
 if(fatigue(k)>=10){if(canAnnual('baekdusan')&&!s.baekduRitualUsed&&Math.random()<.25){executeMountainEvent('baekdusan','baekdu-ritual',k,false);return}if(canAnnual('geumgangsan')&&!s.geumgangRitualUsed&&Math.random()<.25){executeMountainEvent('geumgangsan','geumgang-ritual',k,false);return}if(canAnnual('taesan')&&!s.taesanRitualUsed&&Math.random()<.25){executeMountainEvent('taesan','taesan-ritual',k,false);return}}
 const options=[];if(canAnnual('baekdusan')&&!(s.baekduBeaconCooldown||0))options.push(['baekdusan','baekdu-beacon']);if(canAnnual('baekdusan')&&!(s.baekduOracleCooldown||0))options.push(['baekdusan','baekdu-oracle']);if(canAnnual('geumgangsan')&&!(s.geumgangHerbCooldown||0))options.push(['geumgangsan','geumgang-herb']);if(canAnnual('geumgangsan')&&!(s.geumgangExpeditionCooldown||0))options.push(['geumgangsan','geumgang-expedition']);if(canAnnual('taesan')&&!(s.taesanHerbCooldown||0))options.push(['taesan','taesan-herb']);if(canAnnual('taesan')&&!(s.taesanExpeditionCooldown||0))options.push(['taesan','taesan-expedition']);if(options.length&&Math.random()<.25){const [id,action]=options[Math.floor(Math.random()*options.length)];executeMountainEvent(id,action,k,false)}}

function start(){if(busy||!K[choice]?.initial)return;closeOfficerPanel();const officerModal=document.getElementById('officerDetailModal');if(officerModal?.open)officerModal.close();player=choice;regions=initialRegions();resetOfficerAssignments();resetOfficerTurnState();normalizeAllOfficerSalaries();ongoingBattles={};turn=1;wallUpgradeCount=0;K.forEach(k=>{k.palaceLevel=0;k.palaceTurn=0;k.capitalLevel=1;k.gold=k.initialGold;k.baekduRitualUsed=false;k.baekduBeaconCooldown=0;k.baekduBeaconTurns=0;k.baekduOracleCooldown=0;k.geumgangRitualUsed=false;k.geumgangHerbCooldown=0;k.geumgangExpeditionCooldown=0;k.taesanRitualUsed=false;k.taesanHerbCooldown=0;k.taesanExpeditionCooldown=0;k.mountainLastVisitedYear={};k.inventory=typeof emptyFactionInventory==='function'?emptyFactionInventory():{};k.resources={};k.food=k.initialFood||72;k.policyPoints=0;k.nextAttackBonus=null});resetDiplomacy();ap=3;gold=K[player].gold;selected=regions.findIndex((r,i)=>isActiveTerritory(i)&&r.owner===player);target=null;actionMode='inspect';attackType=null;logs=[];playing=true;busy=false;log(K[player].name+'의 깃발을 올렸습니다. 첫 진군을 명령하세요.');$('start').close();resetMap();render()}
const TEMPLE_NATIONS=new Set([0,1,8,9,10]);
const BUILDINGS={...UNIQUE_BUILDINGS,barracks:{name:'막사',cost:40,description:'모병 12명 → 20명',icon:'막'},wall:{name:'성벽',cost:50,description:'수비 보너스 15% → 40%',icon:'벽'},watchtower:{name:'🗼 망루',cost:50,description:'기습 공격을 받아도 공격자의 +20% 공격 보너스를 제거',icon:'🗼'},market:{name:'시장',cost:60,description:'턴 수입 8금 → 16금',icon:'시'},university:{name:'서원',cost:120,description:'다음 턴부터 매 턴 행동력 +1',icon:'학'},village:{name:'마을',cost:40,description:'단계마다 매 턴 병력 +2 · 최대 5단계',icon:'촌'},temple:{name:'☸️ 사찰',cost:100,description:'전쟁패널티 -1% · 영토별 최대 5회',icon:'☸️'}};
const CITY_TYPES={normal:{label:'일반 영토',icon:'',effect:'',theme:'normal'},agriculture:{label:'농업도시',icon:'🌾',effect:'징집량 +50%',theme:'agriculture'},commerce:{label:'상업도시',icon:'💰',effect:'턴 수입 +50%',theme:'commerce'},military:{label:'군사도시',icon:'🛡️',effect:'방어력 +50%',theme:'military'}};
const CITY_BLOCKED_KEYS={agriculture:new Set(['wall','watchtower','market','defense','defenseFacility']),commerce:new Set(['wall','watchtower','market','defense','defenseFacility']),military:new Set(['temple','village','university','market'])};
const CITY_BLOCKED_NAMES={agriculture:new Set(['방어시설','성벽','망루','🗼 망루','시장']),commerce:new Set(['방어시설','성벽','망루','🗼 망루','시장']),military:new Set(['사찰','☸️ 사찰','마을','서원','시장'])};
function cityTypeOf(i){const r=regions?.[i];if(!r)return 'normal';if(!CITY_TYPES[r.cityType])r.cityType='normal';return r.cityType}
function cityBuildingBlocked(i,type){if(isPassTerritory(i))return true;const city=cityTypeOf(i);if(city==='normal')return false;const name=BUILDINGS[type]?.name||'';return !!CITY_BLOCKED_KEYS[city]?.has(type)||!!CITY_BLOCKED_NAMES[city]?.has(name)}
function cityRecruitMultiplier(i){return cityTypeOf(i)==='agriculture'?1.5:1}
function cityIncomeMultiplier(i){return cityTypeOf(i)==='commerce'?1.5:1}
function cityDefenseMultiplier(i){return cityTypeOf(i)==='military'?1.5:1}
function cityTypeBadge(i){const type=cityTypeOf(i),c=CITY_TYPES[type];return type==='normal'?'':`<div class="city-type-badge ${type}"><strong>${c.icon} ${c.label}</strong><span>${c.effect}</span></div>`}
function cityEffectInfo(i){const type=cityTypeOf(i),c=CITY_TYPES[type];return type==='normal'?'':`<p class="city-effect-line ${type}"><b>${c.icon} ${c.label} 효과</b> · ${c.effect}</p>`}
function ensureCityTypeStyles(){if(document.getElementById('cityTypeStyles'))return;const style=document.createElement('style');style.id='cityTypeStyles';style.textContent='.panel.selected.city-theme-agriculture{border-color:#648f50!important;box-shadow:inset 0 0 0 1px #648f5038}.panel.selected.city-theme-agriculture>.eyebrow,.panel.selected.city-theme-agriculture #detail h2,.panel.selected.city-theme-agriculture #detail .section-title{color:#84b66f!important}.panel.selected.city-theme-commerce{border-color:#b8953e!important;box-shadow:inset 0 0 0 1px #b8953e38}.panel.selected.city-theme-commerce>.eyebrow,.panel.selected.city-theme-commerce #detail h2,.panel.selected.city-theme-commerce #detail .section-title{color:#d6b75d!important}.panel.selected.city-theme-military{border-color:#91424a!important;box-shadow:inset 0 0 0 1px #91424a42}.panel.selected.city-theme-military>.eyebrow,.panel.selected.city-theme-military #detail h2,.panel.selected.city-theme-military #detail .section-title{color:#c76b72!important}.city-type-badge{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:9px 0 11px;padding:8px 10px;border:1px solid #7d7b6b;border-radius:4px;background:#121812}.city-type-badge strong{font-size:14px}.city-type-badge span{font-size:12px;color:#d8d8cf}.city-type-badge.agriculture{border-color:#648f50;background:#162016}.city-type-badge.agriculture strong{color:#8ac073}.city-type-badge.commerce{border-color:#b8953e;background:#211d11}.city-type-badge.commerce strong{color:#e0c465}.city-type-badge.military{border-color:#91424a;background:#241517}.city-type-badge.military strong{color:#d4777e}.city-effect-line{padding:7px 9px;border-left:3px solid #777;background:#ffffff08}.city-effect-line.agriculture{border-color:#648f50}.city-effect-line.commerce{border-color:#b8953e}.city-effect-line.military{border-color:#91424a}.city-upgrade-panel{display:grid;gap:10px}.city-upgrade-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.city-upgrade-btn{min-height:82px;padding:10px 8px;text-align:left;border-width:1px}.city-upgrade-btn strong{display:block;font-size:14px;margin-bottom:5px}.city-upgrade-btn small{display:block;font-size:11px;line-height:1.4}.city-upgrade-btn.agriculture{border-color:#648f50!important}.city-upgrade-btn.agriculture strong{color:#8ac073}.city-upgrade-btn.commerce{border-color:#b8953e!important}.city-upgrade-btn.commerce strong{color:#e0c465}.city-upgrade-btn.military{border-color:#91424a!important}.city-upgrade-btn.military strong{color:#d4777e}.city-restricted{opacity:.56}.city-restricted button{cursor:not-allowed}@media(max-width:760px){.city-upgrade-grid{grid-template-columns:1fr}}';document.head.appendChild(style)}
function applyCityPanelTheme(i){ensureCityTypeStyles();const panel=document.getElementById('detail')?.closest('.panel.selected')||document.getElementById('detail')?.closest('.panel');if(!panel)return;panel.classList.remove('city-theme-agriculture','city-theme-commerce','city-theme-military');const type=i!==null&&i!==undefined?cityTypeOf(i):'normal';if(type!=='normal')panel.classList.add('city-theme-'+type)}
function renderCityUpgradeUI(i){const type=cityTypeOf(i);if(type!=='normal'){const c=CITY_TYPES[type];return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 완료</h3><p class="subtext">${c.icon} ${c.label} · ${c.effect}<br>이 영토는 이미 전문 도시로 증축되었습니다.</p></div>`}return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 하기</h3><p class="subtext">이 영토의 전문 도시 유형을 선택하세요. 증축은 최초 1회만 가능합니다.</p><div class="city-upgrade-grid"><button class="city-upgrade-btn agriculture" data-city-type="agriculture"><strong>🌾 농업도시</strong><small>징집량 +50%<br>방어시설·망루·시장·성벽 추가 건설 불가</small></button><button class="city-upgrade-btn commerce" data-city-type="commerce"><strong>💰 상업도시</strong><small>턴 수입 +50%<br>방어시설·망루·시장·성벽 추가 건설 불가</small></button><button class="city-upgrade-btn military" data-city-type="military"><strong>🛡️ 군사도시</strong><small>방어력 +50%<br>사찰·마을·서원·시장 추가 건설 불가</small></button></div></div>`}
function upgradeCity(type){if(!playing||busy||selected===null||regions[selected]?.owner!==player||!CITY_TYPES[type]||type==='normal')return false;if(cityTypeOf(selected)!=='normal'){notify('이미 전문 도시로 증축된 영토입니다.');return false}regions[selected].cityType=type;const c=CITY_TYPES[type];log(`${regions[selected].name} · ${c.icon} ${c.label} 증축 완료 · ${c.effect}`);notify(`${regions[selected].name}이(가) ${c.label}(으)로 증축되었습니다.`);actionMode='inspect';target=null;applyCityPanelTheme(selected);render();return true}
function universityCount(k){return regions.filter((r,i)=>isActiveTerritory(i)&&r.owner===k&&r.buildings.university).length}
function actionLimit(k=player){return 3+universityCount(k)+(K[k].palaceLevel||0)+capitalActionBonus(k)}
function troopGrowth(i,commit=false){const base=drafted(i,3+2*regions[i].buildings.village+(riverSupply(i)?1:0),commit),wako=isWakoFaction(regions[i]?.owner)?Number(WAKO_CONFIG.growthMultiplier||1.3):1;return Math.max(0,Math.round(base*politicsRecruitMultiplier(i)*wako))}
function recruitAmount(i,commit=false){const base=drafted(i,20,commit);return Math.max(0,Math.round(base*cityRecruitMultiplier(i)*politicsRecruitMultiplier(i)))}
function territoryIncome(i){if(!isActiveTerritory(i)||!regions[i]||(regions[i].devastatedTurns||0)>0)return 0;const base=8+(regions[i].buildings.market?8:0),raw=base*(1+(nationHas(regions[i].owner,'trade')&&COASTAL.has(i)?.25:0)+(regions[i].buildings.tradePort?.2:0))*supplyFactor(i)*resourceTax(i);return Math.round(raw*cityIncomeMultiplier(i)*politicsIncomeMultiplier(i)*100)/100}
function defensePercent(i,attacker=null){return 15+nationalDefense(i)+(regions[i].buildings.wall?25:0)+(terrainKind(i)==='mountain'?30:terrainKind(i)==='high'?15:0)+(mountainLink(i)?5:0)+greatWallDefensePercent(attacker,i)+(cityTypeOf(i)==='military'?50:0)+(isPassTerritory(i)?30:0)}
function defensePower(i,attacker=null){return terrainDefense(i)*(1+greatWallDefensePercent(attacker,i)/100)*cityDefenseMultiplier(i)*moralePowerMultiplier(i)}
function canBuildAt(i,type){const r=regions[i];if(!isActiveTerritory(i)||isPassTerritory(i)||!r||!Object.hasOwn(BUILDINGS,type)||!uniqueBuildAllowed(i,type)||cityBuildingBlocked(i,type))return false;if(type==='temple')return TEMPLE_NATIONS.has(r.owner)&&(r.templeUseCount||0)<5;return type==='village'?r.buildings.village<5:!r.buildings[type]}
function performBuild(i,type,k,actions){if(actions<1||regions[i]?.owner!==k||!canBuildAt(i,type))return false;const cost=buildingCost(i,type),funds=k===player?gold:K[k].gold;if(funds<cost)return false;if(k===player)gold-=cost;else K[k].gold-=cost;if(type==='temple'){warTurns[k]=Math.max(0,(warTurns[k]||0)-1);regions[i].templeUseCount=(regions[i].templeUseCount||0)+1}else regions[i].buildings[type]=type==='village'?regions[i].buildings[type]+1:true;return true}
function buildBuilding(type){if(!playing||busy||selected===null||target!==null||actionMode!=='domestic'||!performBuild(selected,type,player,ap))return;ap--;log(type==='temple'?`${regions[selected].name} 사찰 사용 · 전쟁패널티 -1% · 사용 ${regions[selected].templeUseCount}/5`:regions[selected].name+'에 '+BUILDINGS[type].name+' 건설 완료');render()}
function aiBuild(k,budget){for(const type of ['market','barracks','wall','watchtower','village','university','temple',...Object.keys(UNIQUE_BUILDINGS)]){const i=regions.findIndex((r,j)=>r.owner===k&&canBuildAt(j,type)&&K[k].gold>=buildingCost(j,type));if(i>=0&&performBuild(i,type,k,budget)){log(type==='temple'?`${K[k].name} · ${regions[i].name} 사찰 사용 · 전쟁패널티 -1%`:K[k].name+' · '+regions[i].name+'에 '+BUILDINGS[type].name+' 건설');return 1}}return 0}
function renderBuildings(i){const r=regions[i],own=r.owner===player;if(isPassTerritory(i))return `<section class="buildings"><div class="section-title">관문 시설 <span>건설 불가</span></div><p class="subtext">산해관은 군사 관문으로 일반 건물·시설을 건설할 수 없습니다. 수비측 방어 +30%가 항상 적용됩니다.</p></section>`;return `<section class="buildings"><div class="section-title">영토 시설 <span>${isCapital(i)?'수도 · 건설비 50% 할인':'마을 최대 5단계'}</span></div>${Object.entries(BUILDINGS).filter(([key,b])=>{if(key==='temple')return TEMPLE_NATIONS.has(r.owner)||(r.templeUseCount||0)>0;return !UNIQUE_BUILDINGS[key]||r.buildings[key]||uniqueBuildAllowed(i,key)}).map(([key,b])=>{const temple=key==='temple',level=temple?(r.templeUseCount||0):r.buildings[key],full=temple?level>=5:key==='village'?level>=5:!!level,cost=buildingCost(i,key),buttonClass=temple?'temple-building':UNIQUE_BUILDINGS[key]?'unique-building':'',blocked=cityBuildingBlocked(i,key);return `<div class="building-row ${level?'built':''} ${blocked&&!full?'city-restricted':''}"><span class="building-icon" aria-hidden="true">${b.icon}</span><div class="building-description"><strong>${b.name}${key==='village'?' '+level+'/5단계':temple?' · 사용 '+level+'/5':''}</strong><small>${b.description}${key==='village'?'<br>현재 마을 보충 +'+(level*2)+'명 / 턴':temple?'<br>100금 소비 → 국가 전쟁패널티 즉시 -1%':''}${blocked&&!full?'<br><b>현재 도시 유형에서 추가 건설/업그레이드 불가</b>':''}</small></div>${full?`<span class="built-label">${key==='village'?'최대 단계':temple?'사용 완료':'건설됨'}</span>`:own?`<button class="${buttonClass}" data-building="${key}" ${busy||!playing||ap<1||gold<cost||blocked?'disabled':''} aria-label="${b.name}${key==='village'?' '+(level+1)+'단계':temple?' 사용 '+(level+1)+'/5':''}, ${cost}금, 행동 1">${cost}금<br><small>${blocked?'도시 제한':key==='village'&&level?'업그레이드':temple?'사용 '+level+'/5':'건설'}</small></button>`:'<span class="unbuilt-label">'+(blocked?'도시 제한':temple?'사용 '+level+'/5':level?'추가 개발 가능':'미건설')+'</span>'}</div>`}).join('')}<p class="subtext">${own?'건설·업그레이드·사찰 사용은 행동 1을 사용합니다. ':''}점령 시 시설과 마을 단계는 유지됩니다. 도시 유형상 금지된 시설도 이미 존재하는 경우 삭제되지 않습니다.</p></section>`}
function troopSend(i){const legacy=Math.floor(regions[i].troops*.75),limit=territoryMaxTroops(i);return Math.max(0,Math.min(legacy,Number.isFinite(limit)?limit:legacy))}
function attackPower(i,j){return terrainAttack(i,j)*officerPowerMultiplier(i)*moralePowerMultiplier(i)*falseReportPowerMultiplier(i)}
const ATTACK_TYPES={normal:{label:'⚔️ 정공',desc:'기본 공격'},surprise:{label:'⚡ 기습',desc:'공격력 +20% · 패배 시 아군 피해 +15% · 망루 영토는 공격 보너스 무효'},siege:{label:'🔒 포위',desc:'2방향 이상 · 적 방어 -20% · 적 지원 효과 -50%'},devastate:{label:'🔥 초토화',desc:'점령 성공 시 해당 영토 세금 4턴간 0'}};
// -----------------------------------------------------------------------------
// Oriental invasion command modal (3-step UI)
// Pure presentation/orchestration layer. Existing war/fight/march calculations are reused.
// -----------------------------------------------------------------------------
const INVASION_TACTIC_META={
 normal:{icon:'⚔',han:'正攻',title:'정공',subtitle:'Direct Assault',desc:'기본 전투 규칙으로 정면 공격'},
 surprise:{icon:'⚡',han:'奇襲',title:'기습',subtitle:'Surprise Raid',desc:'성공 시 공격 +20% · 망루가 있으면 보너스 무효'},
 siege:{icon:'◎',han:'包圍',title:'포위',subtitle:'Encirclement',desc:'2방향 이상 압박 · 적 방어 -20%'},
 devastate:{icon:'火',han:'焦土',title:'초토화',subtitle:'Scorched Earth',desc:'점령 성공 시 대상 세금 4턴간 0'},
 large:{icon:'軍',han:'大戰',title:'대규모 전투',subtitle:'Grand Battle',desc:'즉시 승패 없이 전투 상태 생성 · 턴 종료마다 교전'}
};
let invasionModalState={open:false,step:1,sourceId:null,tactic:null,targetId:null,commanderId:null};
function invasionTacticEnabled(sourceId,key){if(key==='siege')return hasSiegeTarget(sourceId,player);return key==='large'||!!ATTACK_TYPES[key]}
function invasionAvailableTargets(sourceId,tactic){const i=Number(sourceId);if(!regions[i]||regions[i].owner!==player||!tactic)return[];const candidates=typeof movementCandidateTargets==='function'?movementCandidateTargets(i):(neighbors[i]||[]);return candidates.filter(j=>{if(!isActiveTerritory(j)||!regions[j]||regions[j].owner===player||largeBattleAt(j)||!canAttack(player,regions[j].owner))return false;const forced=typeof canSteppeForcedMarch==='function'&&canSteppeForcedMarch(i,j);if(isSeaRoute(i,j)&&['siege','large'].includes(tactic))return false;if(tactic==='siege'&&(forced||!siegePossible(i,j,player)))return false;return true})}
function invasionDefaultCommander(sourceId){const list=officersInTerritory(Number(sourceId)).filter(officerCanCommand);return [...list].sort((a,b)=>(b.stats.leadership*1.15+b.stats.war)-(a.stats.leadership*1.15+a.stats.war))[0]||list[0]||null}
function invasionCommander(sourceId,commanderId){const o=commanderId?OFFICER_BY_ID.get(String(commanderId)):null;return o&&o.territoryId===Number(sourceId)?o:invasionDefaultCommander(sourceId)}
function withInvasionCommander(sourceId,commanderId,fn){const prev=activeExpeditionOfficerId,officer=invasionCommander(sourceId,commanderId);activeExpeditionOfficerId=officer?.id||null;try{return fn(officer)}finally{activeExpeditionOfficerId=prev}}
function invasionTroopPreview(sourceId,commanderId){return withInvasionCommander(sourceId,commanderId,()=>troopSend(Number(sourceId)))}
function invasionPowerPreview(sourceId,targetId,tactic,commanderId){if(targetId===null||targetId===undefined)return null;return withInvasionCommander(sourceId,commanderId,()=>{const type=tactic==='large'?'normal':tactic;return {attack:tacticalAttackPower(Number(sourceId),Number(targetId),type),defense:tacticalDefensePower(Number(targetId),Number(sourceId),type),win:prediction(Number(sourceId),Number(targetId),type)}})}
function invasionTerritoryPathBounds(territoryId){const t=WORLD?.territories?.[Number(territoryId)],path=t?.path||'',nums=(path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number).filter(Number.isFinite);if(nums.length<4)return{x:(t?.x||0)-30,y:(t?.y||0)-22,width:60,height:44};let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(let n=0;n+1<nums.length;n+=2){const x=nums[n],y=nums[n+1];if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}if(!Number.isFinite(minX)||!Number.isFinite(minY))return{x:(t?.x||0)-30,y:(t?.y||0)-22,width:60,height:44};const width=Math.max(8,maxX-minX),height=Math.max(8,maxY-minY),pad=Math.max(6,Math.min(24,Math.max(width,height)*.14));return{x:minX-pad,y:minY-pad,width:width+pad*2,height:height+pad*2}}
function invasionTerrainName(territoryId){const kind=typeof terrainKind==='function'?terrainKind(Number(territoryId)):'plain';return({mountain:'산악',high:'고지',highland:'고지',grass:'초원',grassland:'초원',steppe:'초원(STEPPE)',plain:'평지',river:'하천',coast:'해안'})[kind]||String(kind||'평지')}
function invasionObjectiveDifficulty(sourceId,targetId,tactic,commanderId){const power=invasionPowerPreview(sourceId,targetId,tactic,commanderId)||{attack:1,defense:1,win:false},ratio=power.defense/Math.max(1,power.attack);let level=3,label='어려움',tone='hard';if(ratio<=.72){level=1;label='쉬움';tone='easy'}else if(ratio<=.92){level=2;label='보통';tone='normal'}else if(ratio<=1.16){level=3;label='어려움';tone='hard'}else if(ratio<=1.42){level=4;label='매우 어려움';tone='very-hard'}else{level=5;label='극난';tone='extreme'}return{...power,ratio,level,label,tone,attackRatio:Math.round(power.attack/Math.max(1,power.defense)*100)}}
function invasionObjectiveReward(targetId){const i=Number(targetId),r=regions[i],t=WORLD?.territories?.[i],resourceText=(r?.resources||[]).map(x=>RESOURCE_NAMES?.[x]||x).join(' · ')||'없음',income=typeof territoryIncome==='function'?territoryIncome(i):0,cityKey=typeof cityTypeOf==='function'?cityTypeOf(i):(r?.cityType||'normal'),cityLabel=(typeof CITY_TYPES!=='undefined'&&CITY_TYPES?.[cityKey]?.label)||'일반 도시',cityLevel=typeof cityLevelOf==='function'?cityLevelOf(i):(r?.cityLevel||0),capital=typeof isCapital==='function'&&isCapital(i),buildingCount=Object.values(r?.buildings||{}).filter(Boolean).length,value=Math.max(1,Math.round(income*10+(r?.troops||0)*.45+buildingCount*9+(capital?45:0)+(r?.resources?.length||0)*14));return{income:Number(Number(income||0).toFixed(2)),resourceText,cityLabel,cityLevel,capital,buildingCount,value,coordinate:`X ${Math.round(t?.x||0)} · Y ${Math.round(t?.y||0)}`}}
function invasionTerritoryPreviewSvg(targetId){const i=Number(targetId),t=WORLD?.territories?.[i],r=regions[i];if(!t)return'';const b=invasionTerritoryPathBounds(i),owner=K[r?.owner],cx=Number(t.x)||b.x+b.width/2,cy=Number(t.y)||b.y+b.height/2,color=owner?.color||'#8c7a55';return `<svg class="inv-objective-map" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" preserveAspectRatio="xMidYMid meet" aria-label="${r?.name||t.name} 영토 미리보기"><defs><filter id="invObjectiveGlow${i}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><path d="${t.path||''}" fill="${color}88" stroke="#e8c45b" stroke-width="2" vector-effect="non-scaling-stroke" filter="url(#invObjectiveGlow${i})"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="#7ee1d4" stroke="#082b28" stroke-width="1.3" vector-effect="non-scaling-stroke"/><circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="#79d9cd88" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`}
function invasionObjectivePreviewCard(sourceId,targetId,tactic,commanderId){if(targetId===null||targetId===undefined||!regions[targetId])return'';const i=Number(targetId),r=regions[i],owner=K[r.owner]||{},difficulty=invasionObjectiveDifficulty(sourceId,i,tactic,commanderId),reward=invasionObjectiveReward(i),governor=typeof governorForTerritory==='function'?governorForTerritory(i):null,route=typeof canSteppeForcedMarch==='function'&&canSteppeForcedMarch(sourceId,i)?'초원 강행군 · 행동 1':typeof isSeaRoute==='function'&&isSeaRoute(sourceId,i)?'해상 이동':'육상 진군',terrain=invasionTerrainName(i),city=reward.cityLevel>0?`${reward.cityLabel} ${['','I','II','III'][reward.cityLevel]||reward.cityLevel}`:reward.cityLabel;return `<section class="inv-objective-card" aria-live="polite"><div class="inv-objective-visual">${invasionTerritoryPreviewSvg(i)}<div class="inv-objective-pin"><span>${route}</span><b>${reward.coordinate}</b></div></div><div class="inv-objective-info"><div class="inv-objective-head"><div><small>SELECTED OBJECTIVE</small><h4>${r.name}${reward.capital?' ★':''}</h4></div><span class="inv-difficulty ${difficulty.tone}">${difficulty.label}<i>${'◆'.repeat(difficulty.level)}${'◇'.repeat(5-difficulty.level)}</i></span></div><div class="inv-objective-grid"><span>지배 세력<b style="color:${owner.color||'#ead39a'}">${owner.name||'무소속'}</b></span><span>지형 / 경로<b>${terrain} · ${route}</b></span><span>주둔 병력<b>${r.troops}명</b></span><span>태수<b>${governor?.name||'정보 없음'}</b></span><span>도시 등급<b>${city}</b></span><span>예상 전력비<b>${difficulty.attackRatio}%</b></span></div><div class="inv-objective-reward"><small>점령 후 예상 확보</small><strong>턴 수입 +${reward.income}금 · 전략자원 ${reward.resourceText}</strong><em>전략 가치 ${reward.value} · 시설 ${reward.buildingCount}개${reward.capital?' · 수도 거점':''}</em></div><button class="inv-objective-confirm" type="button" data-invasion-confirm-target>이 영토를 침략 목표로 확정</button></div></section>`}

function invasionFullMapSvg(sourceId,targets,selectedTargetId=null){
 const targetSet=new Set((targets||[]).map(Number)),source=Number(sourceId),chosen=selectedTargetId===null?null:Number(selectedTargetId);
 const vx=Number(WORLD?.minX||0),vy=0,vw=Math.max(1,Number(WORLD?.width||1000)),vh=Math.max(1,Number(WORLD?.height||1200));
 const land=WORLD?.landPath?`<path class="inv-world-land" d="${WORLD.landPath}"/>`:'';
 const shapes=(regions||[]).map((r,i)=>{
  if(!isActiveTerritory(i)||!WORLD?.territories?.[i])return'';
  const t=WORLD.territories[i],eligible=targetSet.has(i),isSource=i===source,isChosen=i===chosen,owner=K[r.owner]||{};
  const cls=['inv-world-territory',eligible?'eligible':'',isSource?'source':'',isChosen?'chosen':''].filter(Boolean).join(' ');
  const attrs=eligible?` data-invasion-target="${i}" role="button" tabindex="0" aria-label="${r.name} 침략 목표 선택"`:'';
  const opacity=isChosen?.92:isSource?.88:eligible?.74:.24;
  return `<path class="${cls}"${attrs} d="${t.path||''}" fill="${owner.color||'#59636a'}" fill-opacity="${opacity}"><title>${r.name} · ${owner.name||'무소속'} · 병력 ${r.troops}</title></path>`;
 }).join('');
 const route=chosen!==null&&WORLD?.territories?.[source]&&WORLD?.territories?.[chosen]?(()=>{const a=WORLD.territories[source],b=WORLD.territories[chosen];return `<path class="inv-world-route" d="M${a.x},${a.y} Q${(a.x+b.x)/2},${(a.y+b.y)/2-22} ${b.x},${b.y}"/><circle class="inv-world-route-dot" cx="${b.x}" cy="${b.y}" r="8"/>`})():'';
 const labels=[source,...targetSet].filter((v,i,a)=>a.indexOf(v)===i).map(i=>{const t=WORLD?.territories?.[i],r=regions?.[i];if(!t||!r)return'';const isSource=i===source,isChosen=i===chosen;return `<g class="inv-world-label ${isSource?'source':''} ${isChosen?'chosen':''}" transform="translate(${t.x} ${t.y})"><circle r="${isChosen?5.5:4}"/><text y="-8">${r.name}</text></g>`}).join('');
 return `<div class="inv-full-map-wrap"><svg class="inv-full-map" viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="xMidYMid meet" aria-label="전체 영토 침략 목표 지도"><rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" class="inv-world-sea"/>${land}<g>${shapes}</g>${route}<g>${labels}</g></svg><div class="inv-map-legend"><span><i class="source"></i>출발 영토</span><span><i class="eligible"></i>공격 가능</span><span><i class="chosen"></i>선택 목표</span></div></div>`;
}
function invasionTargetStrip(sourceId,targets,selectedTargetId,tactic,commanderId){
 if(!(targets||[]).length)return '<div class="inv-empty">현재 선택한 전술로 공격 가능한 인접 영토가 없습니다.</div>';
 return `<div class="inv-map-target-strip">${targets.map(i=>{const d=invasionObjectiveDifficulty(sourceId,i,tactic,commanderId);return `<button type="button" data-invasion-target="${i}" aria-pressed="${Number(selectedTargetId)===i}"><strong>${regions[i].name}</strong><small>${K[regions[i].owner]?.name||''} · ${regions[i].troops}명 · ${d.label}</small></button>`}).join('')}</div>`;
}
function invasionLeftOfficerPanel(sourceId,targetId,commanderId,step){
 const sourceCommander=invasionCommander(sourceId,commanderId),hasTarget=step===2&&targetId!==null&&targetId!==undefined&&regions?.[targetId];
 const targetGovernor=hasTarget?(governorForTerritory(Number(targetId))||officersInTerritory(Number(targetId)).sort((a,b)=>b.stats.leadership-a.stats.leadership)[0]||null):null;
 const focus=targetGovernor||sourceCommander,territoryId=targetGovernor?Number(targetId):Number(sourceId),r=regions?.[territoryId],owner=r?K[r.owner]:null;
 const defenders=hasTarget?officersInTerritory(Number(targetId)).slice(0,3):[];
 return `<div class="inv-side-kicker">${targetGovernor?'目標 守將 · TARGET GOVERNOR':'出陣 將帥 · COMMANDER'}</div><div class="inv-portrait">${focus?officerPortraitSvg(focus,116):''}</div><div><div class="inv-general-name">${focus?.name||'장수 정보 없음'}</div><div class="inv-general-role">${focus?`${focus.role} · ${r?.name||''}${owner?` · ${owner.name}`:''}`:'배치된 장수가 없습니다.'}</div>${focus?invasionStatRows(focus):''}<div class="inv-skills">${invasionSkillChips(focus)}</div>${hasTarget?`<div class="inv-defender-list"><small>주둔 장수</small>${defenders.length?defenders.map(o=>`<span><b>${o.name}</b><em>통 ${o.stats.leadership} · 무 ${o.stats.war} · 지 ${o.stats.intelligence}</em></span>`).join(''):'<span>확인 가능한 장수 없음</span>'}</div>${sourceCommander?`<div class="inv-attacker-mini"><small>우리 출진 지휘관</small><b>${sourceCommander.name}</b><span>통 ${sourceCommander.stats.leadership} · 무 ${sourceCommander.stats.war}</span></div>`:''}`:''}</div>`;
}

function invasionStatRows(o){if(!o)return'';return OFFICER_STAT_KEYS.map(k=>`<div class="inv-stat-row"><span>${OFFICER_STAT_LABELS[k]}</span><i><b style="width:${o.stats[k]}%"></b></i><strong>${o.stats[k]}</strong></div>`).join('')}
function invasionSkillChips(o){if(!o)return'<span class="inv-skill-chip">장수 미배치</span>';return (o.skills||[]).slice(0,3).map(s=>{const d=typeof officerSkillDefinition==='function'?officerSkillDefinition(s):null;return `<span class="inv-skill-chip" title="${d?.description||''}">${d?.name||s}</span>`}).join('')||'<span class="inv-skill-chip">전법 없음</span>'}
function invasionStepIndicator(step){const labels=['전술 선택','영토 선택','출진 확인'];return `<div class="inv-step-indicator">${labels.map((x,i)=>`<span class="${step===i+1?'active':step>i+1?'done':''}"><i>${step>i+1?'✓':i+1}</i><b>${x}</b></span>`).join('<em></em>')}</div><div class="inv-step-caption">Step ${step} of 3 · ${labels[step-1]}</div>`}
function ensureInvasionCommandUI(){if(!document.getElementById('invasionCommandStyles')){const style=document.createElement('style');style.id='invasionCommandStyles';style.textContent=`
#invasionCommandModal{width:min(1180px,calc(100vw - 26px));max-width:1180px;max-height:min(760px,calc(100vh - 24px));padding:0;border:1px solid #9d7a2b;border-radius:10px;background:linear-gradient(135deg,#1b1713f7,#11191af5 45%,#17120ff7);color:#eee3c7;box-shadow:0 0 0 1px #2b2114,0 0 34px #d4af3744,0 32px 90px #000d;overflow:hidden}
#invasionCommandModal::backdrop{background:#070907c7;backdrop-filter:blur(3px)}
.inv-shell{position:relative;min-height:590px;background:radial-gradient(circle at 50% 0,#d4af370d,transparent 40%),linear-gradient(90deg,#0f0c09aa,#111817c7);overflow:hidden}.inv-shell:before,.inv-shell:after{content:"";position:absolute;pointer-events:none;z-index:3}.inv-shell:before{inset:9px;border:1px solid #c49a3f55;border-radius:7px;box-shadow:inset 0 0 22px #0008}.inv-shell:after{left:26px;right:26px;top:13px;height:8px;border-top:1px solid #d4af3777;border-bottom:1px solid #5f431855;background:repeating-linear-gradient(90deg,transparent 0 12px,#d4af3722 12px 14px,transparent 14px 28px)}
.inv-head{position:relative;z-index:4;display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:27px 30px 17px;border-bottom:1px solid #7f652b66;background:linear-gradient(180deg,#2a2117b5,#15171344)}.inv-eyebrow{font-size:10px;letter-spacing:.18em;color:#9db9ad;text-transform:uppercase}.inv-title{margin:2px 0 0;font-family:Georgia,'Noto Serif KR',serif;font-size:24px;color:#f4e7c2;text-shadow:0 1px 0 #000,0 0 12px #d4af3733}.inv-title small{margin-left:8px;color:#d4af37;font-size:13px;font-weight:600}.inv-close{border:1px solid #6f5d35;background:#151715;color:#d8c69b;border-radius:4px;padding:8px 12px;cursor:pointer}.inv-close:hover{border-color:#d4af37;color:#fff0b5;box-shadow:0 0 12px #d4af3733}
.inv-main{position:relative;z-index:4;display:grid;grid-template-columns:285px minmax(0,1fr) 255px;min-height:435px}.inv-column{min-width:0;padding:20px}.inv-left{border-right:1px solid #705a2c55;background:linear-gradient(180deg,#3b2a18aa,#18130fb0),repeating-linear-gradient(0deg,#d8bd7b0b 0 2px,transparent 2px 5px)}.inv-center{background:linear-gradient(180deg,#121817cc,#0d1212dd)}.inv-right{border-left:1px solid #705a2c55;background:linear-gradient(180deg,#171b18cc,#111412e8)}
.inv-portrait{height:148px;display:flex;align-items:center;justify-content:center;border:1px solid #b48e3a77;background:radial-gradient(circle,#d4af3719,#120f0c 68%);box-shadow:inset 0 0 30px #0009,0 0 14px #d4af3718;overflow:hidden}.inv-portrait svg{width:116px;height:116px;filter:drop-shadow(0 7px 7px #0008)}.inv-general-name{margin:12px 0 3px;font-family:Georgia,'Noto Serif KR',serif;font-size:21px;color:#fff1c9}.inv-general-role{font-size:11px;color:#98aba2;margin-bottom:12px}.inv-stat-row{display:grid;grid-template-columns:32px 1fr 28px;gap:7px;align-items:center;margin:6px 0;font-size:11px}.inv-stat-row>span{color:#cab88c}.inv-stat-row>i{height:5px;background:#090b0b;border:1px solid #4d493d;border-radius:5px;overflow:hidden}.inv-stat-row>i>b{display:block;height:100%;background:linear-gradient(90deg,#806520,#e0ba4e);box-shadow:0 0 8px #d4af3766}.inv-stat-row>strong{color:#d7f1e7;text-align:right}.inv-skills{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}.inv-skill-chip{font-size:9px;padding:4px 6px;border:1px solid #66542d;background:#211c12;color:#dbc685;border-radius:3px}
.inv-section-title{display:flex;align-items:end;justify-content:space-between;margin-bottom:13px}.inv-section-title h3{margin:0;font-family:Georgia,'Noto Serif KR',serif;color:#ecd79c;font-size:17px}.inv-section-title small{font-size:9px;color:#829790}.inv-tactic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.inv-tactic{position:relative;min-height:95px;padding:12px 10px;border:1px solid #5d553f;background:linear-gradient(180deg,#202522,#141817);color:#ddd5c0;border-radius:5px;text-align:left;cursor:pointer;transition:.16s ease;overflow:hidden}.inv-tactic:hover:not(:disabled){transform:translateY(-1px);border-color:#b9953e;box-shadow:0 0 16px #d4af3728}.inv-tactic[aria-pressed="true"]{border-color:#f0c95a;color:#fff1bd;box-shadow:inset 0 0 0 1px #9c7829,0 0 16px #d4af3755;background:linear-gradient(180deg,#342b18,#181a17)}.inv-tactic:disabled{opacity:.38;cursor:not-allowed}.inv-tactic-icon{float:left;width:41px;height:41px;margin:0 9px 8px 0;border:1px solid #8a733f;border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:serif;font-size:22px;color:#e8d59c;background:radial-gradient(circle,#d4af3722,#090b0b)}.inv-tactic strong,.inv-target strong,.inv-officer strong{display:block;color:#efe3bf}.inv-tactic small,.inv-target small,.inv-officer small{display:block;margin-top:4px;color:#8da098;font-size:9px;line-height:1.45}.inv-tactic em{position:absolute;right:8px;top:8px;font:700 17px Georgia,serif;color:#d4af3724;font-style:normal}.inv-tactic-wide{grid-column:1/-1}
.inv-target-list,.inv-officer-list{display:grid;gap:8px;max-height:310px;overflow:auto;padding-right:4px}.inv-target,.inv-officer{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:10px 11px;border:1px solid #4d5651;background:#151d1b;color:#e8dfca;border-radius:4px;text-align:left;cursor:pointer}.inv-target:hover,.inv-officer:hover{border-color:#a68437}.inv-target[aria-pressed="true"],.inv-officer[aria-pressed="true"]{border-color:#d4af37;background:#2a2417;box-shadow:0 0 11px #d4af3726}.inv-target .inv-target-force{font-size:11px;color:#e3bd5a;text-align:right}.inv-officer{grid-template-columns:auto 1fr auto}.inv-officer svg{width:38px;height:38px}.inv-officer-score{font-size:13px;color:#7fd0c5;font-weight:800}
.inv-target-list.has-preview{max-height:152px}
.inv-side-kicker{margin:0 0 8px;font-size:9px;letter-spacing:.14em;color:#73bfb5;font-weight:800}.inv-defender-list{margin-top:12px;padding-top:9px;border-top:1px solid #5c4d30;display:grid;gap:5px}.inv-defender-list>small,.inv-attacker-mini>small{color:#8fa099;font-size:8px;letter-spacing:.08em}.inv-defender-list>span{display:flex;justify-content:space-between;gap:7px;padding:5px 6px;border:1px solid #4a5148;background:#111715;font-size:9px;color:#e6d9b9}.inv-defender-list em{font-style:normal;color:#8fa29a}.inv-attacker-mini{margin-top:8px;padding:8px;border:1px solid #5e6c64;background:#0e1715}.inv-attacker-mini b{display:block;color:#e8cf83;margin:3px 0 1px}.inv-attacker-mini span{font-size:9px;color:#90a29b}
.inv-full-map-wrap{position:relative;height:238px;border:1px solid #66562e;border-radius:6px;overflow:hidden;background:radial-gradient(circle at 50% 45%,#d1bb7440,#0b1212 68%);box-shadow:inset 0 0 35px #0008}.inv-full-map{display:block;width:100%;height:100%;touch-action:none}.inv-world-sea{fill:#173746}.inv-world-land{fill:#7e7655;fill-opacity:.2;stroke:#b4a26d55;stroke-width:1;vector-effect:non-scaling-stroke}.inv-world-territory{stroke:#17262e;stroke-width:.72;vector-effect:non-scaling-stroke;transition:fill-opacity .12s ease,filter .12s ease,stroke .12s ease}.inv-world-territory.eligible{cursor:pointer;stroke:#b89b4f;stroke-width:1.25;filter:drop-shadow(0 0 1.6px #d4af3755)}.inv-world-territory.eligible:hover{fill-opacity:.92!important;stroke:#ffe58b;stroke-width:2}.inv-world-territory.source{stroke:#63d0c4;stroke-width:2.1;filter:drop-shadow(0 0 3px #63d0c488)}.inv-world-territory.chosen{stroke:#ffd75f;stroke-width:2.8;filter:drop-shadow(0 0 5px #ffcf4cbb)}.inv-world-route{fill:none;stroke:#ffe28a;stroke-width:2.2;stroke-dasharray:7 5;vector-effect:non-scaling-stroke;pointer-events:none}.inv-world-route-dot{fill:none;stroke:#67d6ca;stroke-width:2;vector-effect:non-scaling-stroke;pointer-events:none}.inv-world-label{pointer-events:none}.inv-world-label circle{fill:#d7b950;stroke:#161a18;stroke-width:1.2;vector-effect:non-scaling-stroke}.inv-world-label.source circle{fill:#66d2c6}.inv-world-label.chosen circle{fill:#ffe36f}.inv-world-label text{font-size:10px;font-weight:800;text-anchor:middle;fill:#fff2c9;stroke:#10191c;stroke-width:2.6;paint-order:stroke fill}.inv-map-legend{position:absolute;left:8px;bottom:7px;display:flex;gap:8px;padding:5px 7px;border:1px solid #425650;background:#07110fd9;border-radius:4px;font-size:8px;color:#b8c9c1;pointer-events:none}.inv-map-legend span{display:flex;align-items:center;gap:4px}.inv-map-legend i{width:8px;height:8px;border-radius:2px;background:#877748;border:1px solid #b9a66a}.inv-map-legend i.source{background:#4db9ae;border-color:#8bf0e5}.inv-map-legend i.eligible{background:#9b7e2f;border-color:#e0bd55}.inv-map-legend i.chosen{background:#e4b831;border-color:#ffe78a;box-shadow:0 0 5px #ffd65b}.inv-map-target-strip{display:flex;gap:6px;overflow-x:auto;padding:7px 0 3px}.inv-map-target-strip button{flex:0 0 auto;min-width:130px;padding:7px 9px;border:1px solid #4c5650;background:#121b19;color:#ded4b9;border-radius:4px;text-align:left;cursor:pointer}.inv-map-target-strip button:hover,.inv-map-target-strip button[aria-pressed="true"]{border-color:#d4af37;background:#2a2417;box-shadow:0 0 10px #d4af3728}.inv-map-target-strip strong{display:block;color:#f1dfab;font-size:10px}.inv-map-target-strip small{display:block;color:#8fa099;font-size:8px;margin-top:2px}
.inv-objective-card{margin-top:11px;border:1px solid #947631;background:linear-gradient(135deg,#211a10ee,#101816f5 52%,#17120dee);box-shadow:inset 0 0 0 1px #322816,0 0 18px #d4af3720;border-radius:6px;overflow:hidden;display:grid;grid-template-columns:148px minmax(0,1fr);min-height:196px}.inv-objective-visual{position:relative;min-height:196px;padding:12px;background:radial-gradient(circle at 50% 35%,#c6a23a1f,transparent 58%),linear-gradient(180deg,#1d241f,#0c1110);border-right:1px solid #75612f66;display:flex;align-items:center;justify-content:center;overflow:hidden}.inv-objective-visual:before{content:"地勢";position:absolute;left:8px;top:7px;font:700 22px Georgia,serif;color:#d4af3718;letter-spacing:.08em}.inv-objective-map{width:100%;height:130px;overflow:visible}.inv-objective-pin{position:absolute;left:9px;right:9px;bottom:8px;display:flex;justify-content:space-between;gap:6px;align-items:center;padding:5px 7px;border:1px solid #4c5f58;background:#07100ed9;border-radius:3px;font-size:8px;color:#77cfc3}.inv-objective-pin b{color:#d9c98f;font-weight:600}.inv-objective-info{padding:12px 13px;min-width:0}.inv-objective-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;border-bottom:1px solid #55492e;padding-bottom:7px;margin-bottom:8px}.inv-objective-head small{display:block;font-size:7px;letter-spacing:.16em;color:#78958b}.inv-objective-head h4{margin:1px 0 0;font:700 18px Georgia,'Noto Serif KR',serif;color:#f3df9e}.inv-difficulty{flex:0 0 auto;padding:4px 6px;border:1px solid #695f46;border-radius:3px;background:#171a16;color:#d8c99c;font-size:9px;text-align:right}.inv-difficulty i{display:block;margin-top:2px;font-size:7px;letter-spacing:-1px;font-style:normal}.inv-difficulty.easy{color:#83d9b0;border-color:#3b765b}.inv-difficulty.normal{color:#b6d6a0;border-color:#5f7650}.inv-difficulty.hard{color:#e2c064;border-color:#866d2f}.inv-difficulty.very-hard{color:#e69a6d;border-color:#8b5334}.inv-difficulty.extreme{color:#f0786f;border-color:#8e3935;box-shadow:0 0 10px #b6363033}.inv-objective-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 9px}.inv-objective-grid span{min-width:0;font-size:8px;color:#84978f}.inv-objective-grid b{display:block;margin-top:1px;color:#e6dcc0;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.inv-objective-reward{margin-top:8px;padding:7px 8px;border:1px solid #4d594f;background:#0c1512}.inv-objective-reward small{display:block;color:#6fbcae;font-size:7px;letter-spacing:.08em}.inv-objective-reward strong{display:block;margin-top:2px;color:#ecd184;font-size:9px}.inv-objective-reward em{display:block;margin-top:2px;color:#81928a;font-size:8px;font-style:normal}.inv-objective-confirm{width:100%;margin-top:8px;padding:8px;border:1px solid #5db7ab;background:linear-gradient(180deg,#17675f,#0a3935);color:#eafff8;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer;box-shadow:0 0 12px #38c7b82b}.inv-objective-confirm:hover{border-color:#a6f3e8;box-shadow:0 0 16px #43d6c54a}
.inv-summary{border:1px solid #5e5235;background:#0e1312cc;padding:11px;border-radius:5px}.inv-summary h4{margin:0 0 8px;color:#dfc375;font-size:12px}.inv-summary-row{display:flex;justify-content:space-between;gap:9px;margin:7px 0;font-size:10px;color:#97a59e}.inv-summary-row b{color:#eee1bf;text-align:right}.inv-power{margin-top:10px;padding:9px;border-top:1px solid #514a37;display:grid;grid-template-columns:1fr 1fr;gap:6px}.inv-power span{padding:7px;background:#121816;text-align:center;font-size:9px;color:#85948d}.inv-power b{display:block;margin-top:3px;font-size:15px;color:#e8ce79}.inv-prediction{margin-top:8px;padding:9px;text-align:center;border:1px solid #4e5c57;color:#8fd0c4;background:#10201d;font-weight:800;font-size:11px}.inv-prediction.bad{color:#e0a59a;background:#231514;border-color:#71453f}
.inv-footer{position:relative;z-index:4;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:14px 25px 20px;border-top:1px solid #6f5c3055;background:#111310f2}.inv-step-indicator{display:flex;align-items:center;gap:7px}.inv-step-indicator span{display:flex;align-items:center;gap:5px;color:#5f6c67;font-size:9px}.inv-step-indicator span i{width:19px;height:19px;border-radius:50%;border:1px solid #4f5d57;display:flex;align-items:center;justify-content:center;font-style:normal}.inv-step-indicator span.active{color:#d8c989}.inv-step-indicator span.active i{border-color:#55c9bd;color:#b6fff5;box-shadow:0 0 10px #40d8c944}.inv-step-indicator span.done{color:#9b8a52}.inv-step-indicator em{width:21px;height:1px;background:#4e5147}.inv-step-caption{margin-top:6px;color:#7e8d87;font-size:9px}.inv-actions{display:flex;gap:7px}.inv-actions button{min-width:104px;padding:9px 12px;border-radius:4px;border:1px solid #665b3c;background:#191b17;color:#d8cba8;cursor:pointer}.inv-actions button:hover:not(:disabled){border-color:#d4af37}.inv-actions .primary{background:linear-gradient(180deg,#17645d,#0c3d39);border-color:#4aa69c;color:#e7fff8;box-shadow:inset 0 0 0 1px #0b2a27,0 0 13px #36b9ac33}.inv-actions .launch{background:linear-gradient(180deg,#96772e,#493711);border-color:#dbb74b;color:#fff0b5;box-shadow:0 0 13px #d4af3740}.inv-actions button:disabled{opacity:.38;cursor:not-allowed}.inv-route{font-size:12px;color:#d6c89e;margin-bottom:10px}.inv-route b{color:#f2d266}.inv-empty{padding:18px;border:1px dashed #4c5148;color:#78877f;text-align:center;font-size:11px}
@media(max-width:840px){#invasionCommandModal{width:calc(100vw - 12px);max-height:calc(100vh - 12px)}.inv-main{grid-template-columns:1fr;max-height:70vh;overflow:auto}.inv-left,.inv-right{border:0;border-bottom:1px solid #66542d55}.inv-left{display:grid;grid-template-columns:120px 1fr;gap:12px}.inv-portrait{height:120px}.inv-general-name{margin-top:0}.inv-tactic-grid{grid-template-columns:1fr 1fr}.inv-footer{grid-template-columns:1fr}.inv-actions{justify-content:flex-end}}
@media(max-width:520px){.inv-head{padding:23px 17px 13px}.inv-main .inv-column{padding:14px}.inv-left{grid-template-columns:85px 1fr}.inv-portrait{height:85px}.inv-portrait svg{width:70px;height:70px}.inv-tactic-grid{grid-template-columns:1fr}.inv-tactic-wide{grid-column:auto}.inv-objective-card{grid-template-columns:1fr}.inv-objective-visual{min-height:128px;border-right:0;border-bottom:1px solid #75612f66}.inv-objective-map{height:95px}.inv-objective-grid{grid-template-columns:1fr 1fr}.inv-actions{display:grid;grid-template-columns:1fr 1fr}.inv-actions button{min-width:0}.inv-actions .launch{grid-column:1/-1}.inv-step-indicator span b{display:none}}
`;document.head.appendChild(style)}if(!document.getElementById('invasionCommandModal')){const d=document.createElement('dialog');d.id='invasionCommandModal';d.setAttribute('aria-label','침략 작전 지휘');d.innerHTML='<div id="invasionCommandContent"></div>';document.body.appendChild(d);d.addEventListener('cancel',e=>{e.preventDefault();closeInvasionCommandModal(true)});d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-invasion-close]')){closeInvasionCommandModal(true);return}const back=e.target.closest('[data-invasion-back]');if(back){invasionModalState.step=Math.max(1,invasionModalState.step-1);if(invasionModalState.step===1){invasionModalState.targetId=null}renderInvasionCommandModal();return}const tactic=e.target.closest('[data-invasion-tactic]');if(tactic&&!tactic.disabled){invasionModalState.tactic=tactic.dataset.invasionTactic;invasionModalState.targetId=null;invasionModalState.step=2;renderInvasionCommandModal();return}const targetBtn=e.target.closest('[data-invasion-target]');if(targetBtn){invasionModalState.targetId=Number(targetBtn.dataset.invasionTarget);if(!invasionModalState.commanderId)invasionModalState.commanderId=invasionDefaultCommander(invasionModalState.sourceId)?.id||null;renderInvasionCommandModal();return}if(e.target.closest('[data-invasion-confirm-target]')){const chosen=Number(invasionModalState.targetId);if(Number.isInteger(chosen)&&invasionAvailableTargets(invasionModalState.sourceId,invasionModalState.tactic).includes(chosen)){invasionModalState.step=3;if(!invasionModalState.commanderId)invasionModalState.commanderId=invasionDefaultCommander(invasionModalState.sourceId)?.id||null;renderInvasionCommandModal()}return}const officer=e.target.closest('[data-invasion-officer]');if(officer){invasionModalState.commanderId=officer.dataset.invasionOfficer;renderInvasionCommandModal();return}if(e.target.closest('[data-invasion-change-target]')){invasionModalState.step=2;renderInvasionCommandModal();return}if(e.target.closest('[data-invasion-launch]'))launchInvasionFromModal()})}}
function renderInvasionCommandModal(){
 ensureInvasionCommandUI();
 const d=document.getElementById('invasionCommandModal'),root=document.getElementById('invasionCommandContent'),s=invasionModalState,source=regions[s.sourceId],commander=invasionCommander(s.sourceId,s.commanderId);
 if(!source||source.owner!==player){closeInvasionCommandModal(false);return}
 if(commander&&!s.commanderId)s.commanderId=commander.id;
 const target=s.targetId!==null?regions[s.targetId]:null,tactic=s.tactic?INVASION_TACTIC_META[s.tactic]:null,targets=s.tactic?invasionAvailableTargets(s.sourceId,s.tactic):[],troops=invasionTroopPreview(s.sourceId,s.commanderId),power=target&&s.tactic?invasionPowerPreview(s.sourceId,s.targetId,s.tactic,s.commanderId):null,officers=officersInTerritory(s.sourceId);
 let center='';
 if(s.step===1){
  center=`<div class="inv-section-title"><h3>침략 전술 선택</h3><small>TACTICAL OPERATIONS</small></div><div class="inv-tactic-grid">${Object.entries(INVASION_TACTIC_META).map(([key,m])=>{const enabled=invasionTacticEnabled(s.sourceId,key);return `<button class="inv-tactic ${key==='large'?'inv-tactic-wide':''}" data-invasion-tactic="${key}" aria-pressed="${s.tactic===key}" ${enabled?'':'disabled'}><span class="inv-tactic-icon">${m.icon}</span><strong>${m.title}</strong><small>${m.subtitle}<br>${m.desc}</small><em>${m.han}</em></button>`}).join('')}</div>`;
 }else if(s.step===2){
  const objectivePreview=target?invasionObjectivePreviewCard(s.sourceId,s.targetId,s.tactic,s.commanderId):'';
  center=`<div class="inv-section-title"><h3>침략 영토 선택</h3><small>${tactic?.title||''} · SELECT ON MAP</small></div><div class="inv-route">출발 <b>${source.name}</b> → 지도에서 금빛 외곽선 영토를 직접 선택하세요.</div>${invasionFullMapSvg(s.sourceId,targets,s.targetId)}${invasionTargetStrip(s.sourceId,targets,s.targetId,s.tactic,s.commanderId)}${objectivePreview}`;
 }else{
  center=`<div class="inv-section-title"><h3>장수 및 병력 최종 확인</h3><small>ASSIGN COMMANDER</small></div><div class="inv-route"><b>${source.name}</b> → <b>${target?.name||'목표 미지정'}</b> · ${tactic?.title||''}</div><div class="inv-officer-list">${officers.map(o=>`<button class="inv-officer" data-invasion-officer="${o.id}" aria-pressed="${s.commanderId===o.id}">${officerPortraitSvg(o,38)}<span><strong>${o.name}</strong><small>${o.role} · 통솔 ${o.stats.leadership} · 무력 ${o.stats.war} · 전법 ${(o.skills||[]).slice(0,2).join(' / ')||'없음'}</small></span><span class="inv-officer-score">${officerMaxTroops(o)}</span></button>`).join('')}</div>`;
 }
 const left=invasionLeftOfficerPanel(s.sourceId,s.targetId,s.commanderId,s.step);
 const summary=`<div class="inv-summary"><h4>作戰 槪要 · Operation Summary</h4><div class="inv-summary-row"><span>출발 영토</span><b>${source.name}</b></div><div class="inv-summary-row"><span>전술</span><b>${tactic?.title||'미선택'}</b></div><div class="inv-summary-row"><span>목표</span><b>${target?.name||'미선택'}</b></div><div class="inv-summary-row"><span>지휘관</span><b>${commander?.name||'미정'}</b></div><div class="inv-summary-row"><span>출진 병력</span><b>${troops} / ${source.troops}명</b></div><div class="inv-summary-row"><span>행동 소모</span><b>${target?movementCost(s.sourceId,s.targetId):'-'}</b></div>${power?`<div class="inv-power"><span>공격 전력<b>${Number(power.attack.toFixed(1))}</b></span><span>수비 전력<b>${Number(power.defense.toFixed(1))}</b></span></div><div class="inv-prediction ${power.win?'':'bad'}">${s.tactic==='large'?'장기 교전 개시':power.win?'예상 우세 · 점령 가능성 높음':'예상 열세 · 추가 준비 권장'}</div>`:''}</div>`;
 const canLaunch=s.step===3&&target&&commander&&troops>0&&ap>=movementCost(s.sourceId,s.targetId)&&!busy;
 root.innerHTML=`<div class="inv-shell"><header class="inv-head"><div><div class="inv-eyebrow">三國爭覇 · INVASION COMMAND</div><div class="inv-title">침략 작전 지휘 <small>${K[player]?.name||''}</small></div></div><button class="inv-close" data-invasion-close type="button">닫기 ×</button></header><div class="inv-main"><aside class="inv-column inv-left">${left}</aside><main class="inv-column inv-center">${center}</main><aside class="inv-column inv-right">${summary}</aside></div><footer class="inv-footer"><div>${invasionStepIndicator(s.step)}</div><div class="inv-actions"><button type="button" data-invasion-back ${s.step===1?'disabled':''}>이전</button>${s.step===3?'<button type="button" data-invasion-change-target>목표 변경</button>':''}<button class="${s.step===3?'launch':'primary'}" type="button" ${s.step===3?'data-invasion-launch':s.step===2&&target?'data-invasion-confirm-target':''} ${s.step===3?(canLaunch?'':'disabled'):s.step===2&&target?'':'disabled'}>${s.step===1?'전술을 선택하세요':s.step===2?(target?'目標 確定 · Confirm Objective':'지도에서 영토를 선택하세요'):'出陣 命令 · Launch Invasion'}</button></div></footer></div>`;
 if(!d.open)d.showModal();
}

function openInvasionCommandModal(sourceId,targetId=null,commanderId=null,tactic=null){
 // v98: 기존 3단 <dialog> 침략창은 더 이상 열지 않는다. 동일 진입점을 메인맵 침략 모드로 연결한다.
 return enterLightweightInvasionMode(Number(sourceId),targetId,commanderId,tactic||'normal');
}
function closeInvasionCommandModal(resetAction=true){return exitLightweightInvasionMode(resetAction)}
async function launchInvasionFromModal(){return launchLightweightInvasion()}
window.SAMGUK_INVASION_MODAL={open:openInvasionCommandModal,close:closeInvasionCommandModal,getState:()=>({...invasionModalState}),tactics:INVASION_TACTIC_META,getObjectiveInfo:(sourceId,targetId,tactic='normal',commanderId=null)=>({difficulty:invasionObjectiveDifficulty(sourceId,targetId,tactic,commanderId),reward:invasionObjectiveReward(targetId),terrain:invasionTerrainName(targetId)})};


// =============================================================================
// v98 LIGHTWEIGHT INVASION MODE
// 3단 침략 모달을 제거하고 메인 맵 직접 선택 + 단일 작전 카드 + FX로 통합한다.
// 기존 march/fight/tacticalAttackPower/movementCost 계산은 그대로 재사용한다.
// =============================================================================
const lightweightInvasionState={active:false,sourceId:null,targetId:null,commanderId:null,tactic:'normal',targets:[],launching:false,supporting:false};
let invasionAudioContext=null;
function invasionTargetIds(sourceId,tactic='normal'){
 const t=(tactic==='large'||ATTACK_TYPES[tactic])?tactic:'normal';
 return invasionAvailableTargets(Number(sourceId),t);
}
function invasionCenterPoint(id){
 try{if(typeof territoryLabelCenter==='function'){const c=territoryLabelCenter(Number(id));if(Array.isArray(c)&&Number.isFinite(c[0])&&Number.isFinite(c[1]))return{x:c[0],y:c[1]}}}catch{}
 const t=WORLD?.territories?.[Number(id)],s=seeds?.[Number(id)];
 return{x:Number(t?.x??s?.[1]??0),y:Number(t?.y??s?.[2]??0)};
}
function ensureLightweightInvasionUI(){
 // v99: 출격 준비 카드는 더 이상 body fixed 팝업으로 만들지 않는다.
 // orders 패널 내부에 updateLightweightInvasionOrders()가 단일 인스턴스를 생성한다.
 const orphan=document.body.querySelector(':scope > #invasionQuickCard');if(orphan)orphan.remove();
 const orders=document.getElementById('orders');
 if(orders&&orders.dataset.invasionLiteBound!=='1'){
  orders.dataset.invasionLiteBound='1';
  orders.addEventListener('click',e=>{
   if(e.target.closest('[data-invasion-quick-launch]')){launchLightweightInvasion();return}
   if(e.target.closest('[data-invasion-quick-cancel]')){exitLightweightInvasionMode(true);return}
   const supportButton=e.target.closest('[data-invasion-call-support]');if(supportButton){callLightweightInvasionSupport(Number(supportButton.dataset.invasionCallSupport));return}
  });
 }
 if(!document.getElementById('invasionModeHint')){
  const hint=document.createElement('div');hint.id='invasionModeHint';hint.className='invasion-mode-hint';hint.hidden=true;hint.innerHTML='<b>⚔ 침략 모드</b><span>붉게 빛나는 인접 적 영토를 지도에서 선택하세요.</span><button type="button" data-invasion-hint-cancel>취소</button>';document.body.appendChild(hint);
  hint.addEventListener('click',e=>{if(e.target.closest('[data-invasion-hint-cancel]'))exitLightweightInvasionMode(true)});
 }
}
function removeLegacyInvasionModal(){
 const legacy=document.getElementById('invasionCommandModal');
 if(legacy){try{if(legacy.open)legacy.close()}catch{}legacy.remove()}
}
function playInvasionSFX(name){
 try{
  if(typeof window.playSFX==='function'&&window.playSFX!==playInvasionSFX)return window.playSFX(name);
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;invasionAudioContext=invasionAudioContext||new AC();const ctx=invasionAudioContext;if(ctx.state==='suspended')ctx.resume();
  const now=ctx.currentTime,master=ctx.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(name==='charge'?.16:.10,now+.012);master.gain.exponentialRampToValueAtTime(.0001,now+(name==='charge'?.34:.18));master.connect(ctx.destination);
  const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(master);
  if(name==='drums'){osc.type='sine';osc.frequency.setValueAtTime(92,now);osc.frequency.exponentialRampToValueAtTime(54,now+.16)}
  else if(name==='sword'){osc.type='triangle';osc.frequency.setValueAtTime(680,now);osc.frequency.exponentialRampToValueAtTime(180,now+.13)}
  else{osc.type='sawtooth';osc.frequency.setValueAtTime(130,now);osc.frequency.exponentialRampToValueAtTime(310,now+.26)}
  gain.gain.setValueAtTime(.9,now);gain.gain.exponentialRampToValueAtTime(.001,now+(name==='charge'?.30:.16));osc.start(now);osc.stop(now+(name==='charge'?.32:.18));
  document.dispatchEvent(new CustomEvent('samguk:invasion-sfx',{detail:{cue:name}}));return true;
 }catch(error){console.debug('[삼국쟁패][Invasion SFX] skip',error);return false}
}
if(typeof window.playSFX!=='function')window.playSFX=playInvasionSFX;
window.playInvasionSFX=playInvasionSFX;
function invasionWinRate(sourceId,targetId,tactic='normal',commanderId=null){
 const p=invasionPowerPreview(sourceId,targetId,tactic,commanderId)||{attack:0,defense:0};const sum=Math.max(1,Number(p.attack||0)+Number(p.defense||0));return Math.max(5,Math.min(95,Math.round(Number(p.attack||0)/sum*100)));
}
function invasionPowerBadge(rate){return rate>=58?{label:'우세',className:'advantage'}:rate<=42?{label:'열세',className:'disadvantage'}:{label:'백중',className:'even'}}
function renderLightweightInvasionCard(){
 ensureLightweightInvasionUI();const card=document.getElementById('invasionQuickCard'),body=document.getElementById('invasionQuickCardBody');if(!card||!body)return;
 const s=lightweightInvasionState;if(!s.active||!Number.isInteger(s.targetId)||!regions[s.sourceId]||!regions[s.targetId]){card.hidden=true;return}
 const from=regions[s.sourceId],to=regions[s.targetId],commander=invasionCommander(s.sourceId,s.commanderId),troops=invasionTroopPreview(s.sourceId,commander?.id||null),rate=invasionWinRate(s.sourceId,s.targetId,s.tactic,commander?.id||null),badge=invasionPowerBadge(rate),cost=movementCost(s.sourceId,s.targetId),owner=K[to.owner]||{},power=invasionPowerPreview(s.sourceId,s.targetId,s.tactic,commander?.id||null)||{attack:0,defense:0};
 const disabled=busy||s.launching||s.supporting||ap<cost||troops<1||!commander;
 body.innerHTML=`<header><div><small>INVASION ORDER</small><strong>출격 준비</strong></div><button type="button" data-invasion-quick-cancel aria-label="침략 취소">×</button></header><div class="invq-route"><span>침공 경로</span><b>${from.name}</b><i>➜</i><b>${to.name}</b><em>소유: ${owner.name||'무소속'}</em></div><div class="invq-versus"><div><small>아군 지휘관</small><b>${commander?.name||'장수 없음'}</b><span>병력 ${troops} · 공격 ${Number(power.attack||0).toFixed(1)}</span></div><i>VS</i><div><small>적 수비군</small><b>${owner.name||'무소속'}</b><span>병력 ${to.troops} · 수비 ${Number(power.defense||0).toFixed(1)}</span></div></div><div class="invq-odds"><div><span>예상 승률</span><strong>${rate}%</strong></div><b class="${badge.className}">${badge.label}</b><small>행동 ${cost} 소모 · ${s.tactic==='normal'?'정공':largeBattleLabel(s.tactic)}</small></div><div class="invq-actions"><button type="button" data-invasion-quick-cancel>✖ 취소</button><button class="launch" type="button" data-invasion-quick-launch ${disabled?'disabled':''}>⚔️ 출격 개시</button></div>`;
 card.hidden=false;
}
// v100: 지원 가능한 인접 아군 영토마다 개별 지원 버튼을 제공한다.
function invasionSupportSources(destinationId){
 const destination=Number(destinationId);if(!Number.isInteger(destination)||!regions[destination])return[];
 return regions.map((r,i)=>isActiveTerritory(i)&&r?.owner===player?i:-1).filter(i=>{
  if(i<0||i===destination||largeBattleAt(i)||territoryCannotAct(i))return false;
  const direct=(neighbors[i]||[]).includes(destination),forced=typeof canSteppeForcedMarch==='function'&&canSteppeForcedMarch(i,destination);if(!direct&&!forced)return false;
  const amount=troopSend(i),cost=movementCost(i,destination);return amount>0&&cost<=ap;
 }).sort((a,b)=>troopSend(b)-troopSend(a)||movementCost(a,destination)-movementCost(b,destination));
}
function invasionSupportInfo(sourceId){
 const s=lightweightInvasionState,id=Number(sourceId);if(!s.active||!Number.isInteger(id))return null;
 const liveSources=invasionSupportSources(s.sourceId);if(!liveSources.includes(id))return null;
 return{sourceId:id,amount:troopSend(id),cost:movementCost(id,s.sourceId),name:regions[id]?.name||'인접 아군'};
}
function invasionBestSupportInfo(){
 const s=lightweightInvasionState,sources=s.active?invasionSupportSources(s.sourceId):[];if(!sources.length)return null;
 return invasionSupportInfo(sources[0]);
}
async function callLightweightInvasionSupport(requestedSourceId=null){
 const s=lightweightInvasionState;if(!s.active||s.launching||s.supporting||busy)return false;
 const support=Number.isInteger(Number(requestedSourceId))?invasionSupportInfo(Number(requestedSourceId)):invasionBestSupportInfo();
 if(!support){notify('선택한 영토에서는 현재 지원군을 보낼 수 없습니다.');updateLightweightInvasionOrders();return false}
 const saved={sourceId:s.sourceId,targetId:s.targetId,commanderId:s.commanderId,tactic:s.tactic};
 s.supporting=true;updateLightweightInvasionOrders();renderLightweightInvasionCard();
 clearLightweightInvasionClasses();s.active=false;
 selected=support.sourceId;target=saved.sourceId;actionMode='support';attackType=null;activeExpeditionOfficerId=null;
 notify(`${support.name}에서 ${regions[saved.sourceId].name}(으)로 지원군 ${support.amount}명을 보냅니다.`);render();
 await march();
 s.supporting=false;
 if(!playing||!regions[saved.sourceId]||regions[saved.sourceId].owner!==player)return false;
 const reopened=enterLightweightInvasionMode(saved.sourceId,saved.targetId,saved.commanderId,saved.tactic);
 if(reopened)notify(`${support.name} 지원군이 ${regions[saved.sourceId].name}에 합류했습니다.`);
 return reopened;
}
function updateLightweightInvasionOrders(){
 if(!lightweightInvasionState.active)return;const orders=document.getElementById('orders');if(!orders)return;
 const s=lightweightInvasionState,count=s.targets.length,chosen=Number.isInteger(s.targetId)?regions[s.targetId]?.name:null,supportIds=invasionSupportSources(s.sourceId);
 const supportBusy=busy||s.launching||s.supporting;
 const supportMarkup=supportIds.length
  ?`<section class="invasion-support-section" aria-label="지원 가능한 영토"><div class="invasion-support-head"><b>🛡 지원군 부르기</b><small>${supportIds.length}개 영토에서 지원 가능</small></div><div class="invasion-support-list">${supportIds.map(id=>{const info=invasionSupportInfo(id);if(!info)return'';return `<button class="invasion-call-support" type="button" data-invasion-call-support="${id}" ${supportBusy?'disabled':''}><strong>${info.name} · ${info.amount}명</strong><small>행동 ${info.cost} · ${info.name} → ${regions[s.sourceId]?.name||'출격지'}</small></button>`}).join('')}</div></section>`
  :`<section class="invasion-support-section is-empty"><div class="invasion-support-head"><b>🛡 지원군 부르기</b><small>지원 가능한 영토 없음</small></div><p>현재 출격지와 인접한 아군 영토 중 지원 가능한 병력이 없습니다.</p></section>`;
 orders.innerHTML=`<div class="invasion-command-stack"><section id="invasionQuickCard" class="invasion-quick-card invasion-quick-card-inline" aria-live="polite" ${Number.isInteger(s.targetId)?'':'hidden'}><div id="invasionQuickCardBody"></div></section>${supportMarkup}<div class="invasion-orders-lite"><b>⚔ 침략 모드</b><p>${count?`지도에서 붉게 표시된 ${count}개 영토 중 목표를 선택하세요.`:'현재 공격 가능한 인접 영토가 없습니다.'}${chosen?`<br>선택 목표: <strong>${chosen}</strong>`:''}</p><button id="cancel" class="quiet" type="button">침략 모드 취소</button></div></div>`;
}
function ensureInvasionFxLayer(){
 const svg=document.getElementById('map');if(!svg)return null;let layer=svg.querySelector('#invasion-route-fx-layer');if(!layer){layer=document.createElementNS('http://www.w3.org/2000/svg','g');layer.id='invasion-route-fx-layer';layer.setAttribute('pointer-events','none');svg.appendChild(layer)}return layer;
}
function renderInvasionRouteFx(){
 const layer=ensureInvasionFxLayer();if(!layer)return;layer.innerHTML='';
 const s=lightweightInvasionState;if(!s.active||!Number.isInteger(s.sourceId)||!regions[s.sourceId])return;

 // v115: 공격선과 지원선을 서로 다른 목적지 규칙으로 분리한다.
 // - 빨간 공격선: 공격 시작점 -> 공격 목표점
 // - 노란 지원선: 지원 가능 영토 -> 공격 시작점
 // 지원선 계산에는 공격 목표점(targetId)을 절대 사용하지 않는다.
 const origin=invasionCenterPoint(s.sourceId);
 const supportIds=invasionSupportSources(s.sourceId);
 const defs=`<defs>
   <marker id="invasion-red-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0L8 4L0 8Z" fill="#ff463e"/></marker>
   <marker id="invasion-support-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0L8 4L0 8Z" fill="#ffd85a"/></marker>
   <filter id="invasion-route-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 </defs>`;

 const supportMarkup=supportIds.map((supportId,index)=>{
   const start=invasionCenterPoint(supportId),dx=origin.x-start.x,dy=origin.y-start.y,dist=Math.hypot(dx,dy);
   if(!Number.isFinite(dist)||dist<1)return'';
   // 여러 지원선이 겹쳐도 읽히도록 아주 약한 곡률을 번갈아 준다.
   const sign=index%2===0?1:-1,bend=Math.min(22,Math.max(6,dist*.08))*sign;
   const cx=(start.x+origin.x)/2-dy/Math.max(1,dist)*bend,cy=(start.y+origin.y)/2+dx/Math.max(1,dist)*bend;
   return `<path class="invasion-support-route-arrow" data-support-source="${supportId}" data-support-destination="${s.sourceId}" d="M${start.x},${start.y} Q${cx},${cy} ${origin.x},${origin.y}" fill="none" marker-end="url(#invasion-support-arrow)"/>`;
 }).join('');

 let attackMarkup='';
 if(Number.isInteger(s.targetId)&&regions[s.targetId]){
   const targetPoint=invasionCenterPoint(s.targetId),dx=targetPoint.x-origin.x,dy=targetPoint.y-origin.y,dist=Math.hypot(dx,dy),bend=Math.min(34,Math.max(12,dist*.18)),cx=(origin.x+targetPoint.x)/2-dy/Math.max(1,dist)*bend,cy=(origin.y+targetPoint.y)/2+dx/Math.max(1,dist)*bend;
   attackMarkup=`<path class="invasion-route-arrow" data-attack-origin="${s.sourceId}" data-attack-target="${s.targetId}" d="M${origin.x},${origin.y} Q${cx},${cy} ${targetPoint.x},${targetPoint.y}" fill="none" marker-end="url(#invasion-red-arrow)" filter="url(#invasion-route-glow)"/>`;
 }
 layer.innerHTML=defs+supportMarkup+attackMarkup;
}
function invasionShockwaveAt(targetId){
 const layer=ensureInvasionFxLayer();if(!layer)return;const p=invasionCenterPoint(targetId),circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('class','invasion-shockwave');circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);circle.setAttribute('r','7');layer.appendChild(circle);setTimeout(()=>circle.remove(),650);
}
function clearLightweightInvasionClasses(){
 document.body.classList.remove('invasion-targeting');for(const el of document.querySelectorAll('.attackable-target,.attack-source,.attack-selected'))el.classList.remove('attackable-target','attack-source','attack-selected');const layer=document.querySelector('#map #invasion-route-fx-layer');if(layer)layer.innerHTML='';const hint=document.getElementById('invasionModeHint');if(hint)hint.hidden=true;const card=document.getElementById('invasionQuickCard');if(card)card.hidden=true;
}
function syncLightweightInvasionMapState(){
 const s=lightweightInvasionState;if(!s.active){clearLightweightInvasionClasses();return}ensureLightweightInvasionUI();document.body.classList.add('invasion-targeting');const targetSet=new Set(s.targets.map(Number));const nodes=document.querySelectorAll('#map .territory-shape[data-id],#mapUiOverlay .minimal-label[data-id]');for(const el of nodes){const id=Number(el.dataset.id);el.classList.toggle('attackable-target',targetSet.has(id));el.classList.toggle('attack-source',id===s.sourceId);el.classList.toggle('attack-selected',id===s.targetId)}const hint=document.getElementById('invasionModeHint');if(hint){hint.hidden=false;hint.querySelector('span').textContent=s.targets.length?'붉게 빛나는 인접 적 영토를 지도에서 선택하세요.':'현재 공격 가능한 인접 적 영토가 없습니다.'}renderInvasionRouteFx();updateLightweightInvasionOrders();renderLightweightInvasionCard();
}
function enterLightweightInvasionMode(sourceId,targetId=null,commanderId=null,tactic='normal'){
 const i=Number(sourceId);if(!playing||busy||!isActiveTerritory(i)||regions[i]?.owner!==player)return false;if(!territoryCanAttack(i)){notifyOfficerRequiredForAttack();return false}if(territoryCannotAct(i)){notify('혼란 상태의 부대는 침략할 수 없습니다.');return false}if(largeBattleAt(i)){notify('대규모 전투 중인 영토에서는 새 침략을 시작할 수 없습니다.');return false}
 removeLegacyInvasionModal();ensureLightweightInvasionUI();const resolvedTactic=(tactic==='large'||ATTACK_TYPES[tactic])?tactic:'normal',targets=invasionTargetIds(i,resolvedTactic),pre=Number(targetId);lightweightInvasionState.active=true;lightweightInvasionState.sourceId=i;lightweightInvasionState.tactic=resolvedTactic;lightweightInvasionState.targets=targets;lightweightInvasionState.targetId=Number.isInteger(pre)&&targets.includes(pre)?pre:null;lightweightInvasionState.commanderId=commanderId||invasionDefaultCommander(i)?.id||null;lightweightInvasionState.launching=false;lightweightInvasionState.supporting=false;selected=i;target=lightweightInvasionState.targetId;actionMode='attack';attackType=resolvedTactic;playInvasionSFX('drums');render();requestAnimationFrame(syncLightweightInvasionMapState);if(lightweightInvasionState.targetId!==null){requestAnimationFrame(()=>invasionShockwaveAt(lightweightInvasionState.targetId))}return true;
}
function selectLightweightInvasionTarget(targetId){
 const s=lightweightInvasionState,i=Number(targetId);if(!s.active||!s.targets.includes(i))return false;s.targetId=i;target=i;attackType=s.tactic||'normal';if(!s.commanderId)s.commanderId=invasionDefaultCommander(s.sourceId)?.id||null;playInvasionSFX('sword');render();requestAnimationFrame(()=>{syncLightweightInvasionMapState();invasionShockwaveAt(i)});return true;
}
function exitLightweightInvasionMode(resetAction=true){
 clearLightweightInvasionClasses();lightweightInvasionState.active=false;lightweightInvasionState.sourceId=null;lightweightInvasionState.targetId=null;lightweightInvasionState.commanderId=null;lightweightInvasionState.tactic='normal';lightweightInvasionState.targets=[];lightweightInvasionState.launching=false;lightweightInvasionState.supporting=false;invasionModalState={open:false,step:1,sourceId:null,tactic:null,targetId:null,commanderId:null};if(resetAction&&!busy){target=null;attackType=null;activeExpeditionOfficerId=null;actionMode='inspect';render()}return true;
}
async function launchLightweightInvasion(){
 const s=lightweightInvasionState;if(!s.active||s.launching||!Number.isInteger(s.targetId))return false;const commander=invasionCommander(s.sourceId,s.commanderId);if(!territoryCanAttack(s.sourceId)||!commander){notifyOfficerRequiredForAttack();return false}const liveTargets=invasionTargetIds(s.sourceId,s.tactic);if(!liveTargets.includes(s.targetId)){notify('현재 공격할 수 없는 목표입니다.');s.targets=liveTargets;s.targetId=null;target=null;syncLightweightInvasionMapState();return false}const cost=movementCost(s.sourceId,s.targetId),troops=invasionTroopPreview(s.sourceId,commander.id);if(ap<cost){notify('출병에 필요한 행동력이 부족합니다.');return false}if(troops<1){notify('출진할 병력이 부족합니다.');return false}
 s.launching=true;renderLightweightInvasionCard();playInvasionSFX('charge');
 selected=s.sourceId;target=s.targetId;actionMode='attack';attackType=s.tactic||'normal';activeExpeditionOfficerId=commander.id;clearLightweightInvasionClasses();s.active=false;await new Promise(r=>setTimeout(r,190));await march();lightweightInvasionState.sourceId=null;lightweightInvasionState.targetId=null;lightweightInvasionState.commanderId=null;lightweightInvasionState.targets=[];lightweightInvasionState.launching=false;lightweightInvasionState.supporting=false;return true;
}
// 구형 3단 침략 모달 생성/렌더 함수도 런타임에서 무력화한다.
ensureInvasionCommandUI=function(){removeLegacyInvasionModal();ensureLightweightInvasionUI();return true};
renderInvasionCommandModal=function(){if(lightweightInvasionState.active)syncLightweightInvasionMapState();return true};
window.SAMGUK_LIGHTWEIGHT_INVASION={enter:enterLightweightInvasionMode,select:selectLightweightInvasionTarget,launch:launchLightweightInvasion,callSupport:callLightweightInvasionSupport,cancel:()=>exitLightweightInvasionMode(true),sync:syncLightweightInvasionMapState,getState:()=>({...lightweightInvasionState,targets:[...lightweightInvasionState.targets]})};

function friendlyAdjacentCount(j,k){return neighbors[j].filter(n=>regions[n]?.owner===k).length}
function siegePossible(i,j,k=regions[i]?.owner){return !!regions[i]&&!!regions[j]&&regions[j].owner!==k&&neighbors[i].includes(j)&&friendlyAdjacentCount(j,k)>=2}
function hasSiegeTarget(i,k=regions[i]?.owner){return neighbors[i].some(j=>regions[j].owner!==k&&canAttack(k,regions[j].owner)&&siegePossible(i,j,k))}
function tacticalAttackPower(i,j,type='normal'){const blocked=type==='surprise'&&(!!regions[j]?.buildings.watchtower||baekduBeaconProtects(j)),bonus=K[regions[i]?.owner]?.nextAttackBonus||1;return attackPower(i,j)*(type==='surprise'&&!blocked?1.2:1)*bonus}
function tacticalDefensePower(j,i,type='normal'){return defensePower(j,i)*(type==='siege'?.8:1)}
function prediction(i,j,type=attackType||'normal'){return tacticalAttackPower(i,j,type)>tacticalDefensePower(j,i,type)}
function largeBattleAt(i){const b=ongoingBattles[i];return b&&b.active?b:null}
function largeBattleCountry(b,k){return !!b&&(b.attackerCountry===k||b.defenderCountry===k)}
function largeBattleLabel(type){return type==='large'?'⚔️ 대규모 전투':ATTACK_TYPES[type]?.label||ATTACK_TYPES.normal.label}
function mergeBattleUnits(base,added){for(const key of UNIT_KEYS)base[key]=(base[key]||0)+(added[key]||0);return base}
function scaledBattleUnits(units,n){const total=UNIT_KEYS.reduce((sum,key)=>sum+(units[key]||0),0),out=emptyUnits();if(n<=0||total<=0)return out;let used=0;for(const key of UNIT_KEYS){out[key]=Math.floor((units[key]||0)*n/total);used+=out[key]}let left=n-used;for(const key of [...UNIT_KEYS].sort((a,b)=>((units[b]||0)*n/total-out[b])-((units[a]||0)*n/total-out[a]))){if(left<=0)break;out[key]++;left--}return out}
function largeBattleSupportSources(b,k=player){const d=Number(b?.territoryId);return regions.map((r,i)=>r?.owner===k?i:-1).filter(i=>i>=0&&!largeBattleAt(i)&&troopSend(i)>0&&((neighbors[i]||[]).includes(d)||(typeof canSteppeForcedMarch==='function'&&canSteppeForcedMarch(i,d))))}
function ensureLargeBattleUI(){if(!document.getElementById('largeBattleStyles')){const style=document.createElement('style');style.id='largeBattleStyles';style.textContent='.largeBattleBtn{background:#711b21!important;border-color:#b94a52!important;color:#fff!important}.largeBattleBtn strong,.largeBattleBtn small{color:#fff!important}#largeBattlePanel{position:fixed;left:50%;bottom:82px;transform:translateX(-50%);z-index:11;width:min(430px,calc(100% - 32px));display:grid;gap:8px;pointer-events:none}.largeBattleNotice{background:#2a1115f2;border:1px solid #a63f49;border-left:5px solid #c84f58;color:#fff;padding:13px 14px;border-radius:5px;box-shadow:0 8px 28px #0007;pointer-events:auto}.largeBattleNotice strong{display:block;color:#ffdadc;margin-bottom:5px}.largeBattleNotice p{margin:2px 0;color:#f0e6e6;font-size:13px;line-height:1.5}.largeBattleNotice button{margin-top:8px;width:100%;background:#7c252c;color:#fff;border:1px solid #c45a62;border-radius:3px;padding:8px 10px}.largeBattleNotice button:disabled{opacity:.45}';document.head.appendChild(style)}if(!document.getElementById('largeBattlePanel')){const panel=document.createElement('div');panel.id='largeBattlePanel';panel.hidden=true;panel.setAttribute('aria-live','polite');panel.addEventListener('click',e=>{const btn=e.target.closest('[data-large-support]');if(btn)prepareLargeBattleSupport(+btn.dataset.largeSupport)});document.body.appendChild(panel)}}
function renderLargeBattleNotice(){ensureLargeBattleUI();const panel=document.getElementById('largeBattlePanel'),list=Object.values(ongoingBattles).filter(b=>b?.active);panel.hidden=!list.length;panel.style.display=list.length?'grid':'none';panel.innerHTML=list.map(b=>{const involved=largeBattleCountry(b,player),canSupport=involved&&largeBattleSupportSources(b).length>0;return `<div class="largeBattleNotice"><strong>⚔️ ${regions[b.territoryId].name} 대규모 전투</strong><p>${K[b.attackerCountry].name} ${b.attackerTroops} VS ${K[b.defenderCountry].name} ${b.defenderTroops}</p><p>${b.turnCount?`교전 ${b.turnCount}턴째`:'교전 준비 · 턴 종료 시 첫 교전'}</p>${involved?`<button data-large-support="${b.territoryId}" ${canSupport?'':'disabled'}>병력 지원</button>`:''}</div>`}).join('')}
function prepareLargeBattleSupport(i){const b=largeBattleAt(i);if(!b||!largeBattleCountry(b,player)||busy||!playing)return;const sources=largeBattleSupportSources(b);if(!sources.length){notify('이 대규모 전투에 지원할 수 있는 인접 아군 영토가 없습니다.');return}selected=sources.sort((a,b)=>regions[b].troops-regions[a].troops)[0];target=i;actionMode='support';attackType=null;focusRegion(selected);render()}
// [2] 침략은 출발 영토에 실제 지휘 가능한 장수가 최소 1명 있어야 한다.
function territoryAttackOfficerCount(i){return officersInTerritory(Number(i)).filter(officerCanCommand).length}
function territoryCanAttack(i){return territoryAttackOfficerCount(i)>0}
function notifyOfficerRequiredForAttack(){notify('해당 지역에 주둔 중인 장수가 부족합니다.')}
function eligibleTarget(i){if(selected===null||i===selected)return false;const direct=(neighbors[selected]||[]).includes(i),forced=typeof canSteppeForcedMarch==='function'&&canSteppeForcedMarch(selected,i);if(!direct&&!forced)return false;if(isSeaRoute(selected,i)&&actionMode==='attack'&&['siege','large'].includes(attackType))return false;if(forced&&actionMode==='attack'&&attackType==='siege')return false;const battle=largeBattleAt(i);if(actionMode==='support'){if(battle)return largeBattleCountry(battle,player);return regions[i].owner===player}if(actionMode!=='attack'||!attackType||regions[i].owner===player||battle||!canAttack(player,regions[i].owner))return false;if(attackType==='large')return true;return attackType!=='siege'||siegePossible(selected,i,player)}
function setAction(mode){if(lightweightInvasionState.active&&mode!=='attack'){clearLightweightInvasionClasses();lightweightInvasionState.active=false;lightweightInvasionState.targets=[];lightweightInvasionState.targetId=null}if(busy||!playing||selected===null||!isActiveTerritory(selected)||regions[selected].owner!==player||!['inspect','support','attack','domestic','city'].includes(mode))return;if(territoryCannotAct(selected)&&(mode==='attack'||mode==='support')){notify('혼란 상태의 부대는 공격/지원 행동을 할 수 없습니다.');return;}if(largeBattleAt(selected)&&(mode==='attack'||mode==='support')){notify('대규모 전투가 진행 중인 영토에서는 새 침략이나 병력 출발을 할 수 없습니다.');return}if(mode==='city'&&cityTypeOf(selected)!=='normal'){notify('이미 전문 도시로 증축된 영토입니다.');return}if(mode==='attack'){if(!territoryCanAttack(selected)){notifyOfficerRequiredForAttack();return}actionMode='attack';target=null;attackType='normal';enterLightweightInvasionMode(selected,null,null,'normal');return}actionMode=mode;target=null;attackType=null;render()}
function setAttackType(type){if(actionMode!=='attack'||busy||!playing||(!ATTACK_TYPES[type]&&type!=='large'))return;if(type==='siege'&&!hasSiegeTarget(selected,player)){notify('포위 가능한 영토가 없습니다. 대상 영토에 인접한 아군 영토가 2개 이상 필요합니다.');return}attackType=type;target=null;render()}
function renderAttackTactics(i){return `<h3 class="mode-title">침략 전술 선택</h3><p class="subtext">전술 선택 자체는 행동력을 사용하지 않습니다.</p><div class="destination-list"><button class="largeBattleBtn" data-attack-type="large" aria-pressed="${attackType==='large'}" ${busy?'disabled':''}><strong>⚔️ 대규모 전투</strong><small>즉시 승패 없이 전투 상태 생성 · 매 턴 종료 시 교전</small></button>${Object.entries(ATTACK_TYPES).map(([key,v])=>`<button data-attack-type="${key}" aria-pressed="${attackType===key}" ${busy||key==='siege'&&!hasSiegeTarget(i,player)?'disabled':''}><strong>${v.label}</strong><small>${v.desc}</small></button>`).join('')}</div>`}
function aiAttackType(i,j,k){if(siegePossible(i,j,k))return 'siege';const types=['normal','surprise','devastate'];return types[Math.abs(turn+i+j+k)%types.length]}
function tickDevastation(){regions.forEach(r=>{if((r.devastatedTurns||0)>0)r.devastatedTurns=Math.max(0,r.devastatedTurns-1)})}
function renderActions(){const locked=selected!==null&&!!largeBattleAt(selected),cityDone=selected!==null&&cityTypeOf(selected)!=='normal';return `<div class="territory-actions" aria-label="영토 행동">${[['support','지원 보내기'],['attack','침략하기'],['domestic','내정하기(건설)'],['city',cityDone?'도시증축 완료':'도시증축 하기']].map(([mode,label])=>`<button data-mode="${mode}" aria-pressed="${actionMode===mode}" ${busy||!playing||(locked&&(mode==='support'||mode==='attack'))||(mode==='city'&&cityDone)?'disabled':''}>${label}</button>`).join('')}</div>`}
function createLargeBattle(i,j){const a=regions[i],d=regions[j],n=troopSend(i);if(!a||!d||n<1||a.owner===d.owner||largeBattleAt(j)||!territoryCanAttack(i)||!canAttack(a.owner,d.owner))return false;const sent=sendUnits(i),defenderUnits=unitCounts(d);changeUnits(a,sent,-1);ongoingBattles[j]={territoryId:j,originId:i,attackerCountry:a.owner,defenderCountry:d.owner,commanderId:territoryCommander(i)?.id||null,defenderCommanderId:territoryCommander(j)?.id||null,attackerTroops:n,defenderTroops:d.troops,attackerUnits:sent,defenderUnits,active:true,turnCount:0};recordBattle(a.owner,d.owner);beginWar(a.owner,d.owner);log(`⚔️ ${d.name} 대규모 전투 시작 · ${K[a.owner].name} ${n} VS ${K[d.owner].name} ${d.troops}`);return true}
function supportLargeBattle(i,j,k){const b=largeBattleAt(j),reachable=(neighbors[i]||[]).includes(j)||(typeof canSteppeForcedMarch==='function'&&canSteppeForcedMarch(i,j));if(!b||!largeBattleCountry(b,k)||regions[i]?.owner!==k||!reachable||largeBattleAt(i))return false;const n=troopSend(i);if(n<1)return false;const sent=sendUnits(i);changeUnits(regions[i],sent,-1);if(k===b.attackerCountry){b.attackerTroops+=n;mergeBattleUnits(b.attackerUnits,sent)}else{b.defenderTroops+=n;mergeBattleUnits(b.defenderUnits,sent);replaceUnits(regions[j],b.defenderUnits)}log(`${K[k].name} · ${regions[j].name} 대규모 전투에 지원군 ${n}명 합류`);return true}
function largeBattlePowers(b){const i=b.originId,j=b.territoryId,origin=regions[i],snapshot={owner:origin.owner,troops:origin.troops,units:unitCounts(origin)},previousCommander=activeExpeditionOfficerId;let temp=Math.max(1,Math.ceil(b.attackerTroops/.75));while(Math.floor(temp*.75)<b.attackerTroops)temp++;while(temp>1&&Math.floor((temp-1)*.75)>=b.attackerTroops)temp--;const tempUnits=scaledBattleUnits(b.attackerUnits,temp);origin.owner=b.attackerCountry;replaceUnits(origin,tempUnits);activeExpeditionOfficerId=b.commanderId||null;const attack=attackPower(i,j),defense=defensePower(j,i);activeExpeditionOfficerId=previousCommander;origin.owner=snapshot.owner;replaceUnits(origin,snapshot.units);return {attack,defense}}
async function finishLargeBattle(b,attackerWon){const j=b.territoryId,r=regions[j],attacker=b.attackerCountry,defender=b.defenderCountry,loserOfficer=OFFICER_BY_ID.get(String(attackerWon?b.defenderCommanderId:b.commanderId));if(attackerWon){r.owner=attacker;replaceUnits(r,b.attackerUnits);window.SAMGUK_OCCUPATION_SMOKE?.triggerRegion?.(j,{reason:'large-battle',duration:5600,burst:30});if(loserOfficer)handleOfficerDefeat(loserOfficer,attacker,{loserFaction:defender,battleTerritoryId:j});if(isWakoFaction(attacker))applyWakoLoot(defender,j);cleanWars();announceExtinction(defender);log(`⚔️ ${r.name} 대규모 전투 종료 · ${K[attacker].name} 승리 및 점령`)}else{r.owner=defender;replaceUnits(r,b.defenderUnits);if(loserOfficer)handleOfficerDefeat(loserOfficer,defender,{loserFaction:attacker,battleTerritoryId:j,retreatTerritoryId:b.originId});log(`⚔️ ${r.name} 대규모 전투 종료 · ${K[defender].name} 방어 성공`)}delete ongoingBattles[j];renderLargeBattleNotice();if(attacker===player||defender===player){centerBattle(j);render();await showBattleResult(j,attacker,defender,attackerWon)} }
async function resolveLargeBattleRound(b){if(!b?.active)return;recordBattle(b.attackerCountry,b.defenderCountry);beginWar(b.attackerCountry,b.defenderCountry);const {attack,defense}=largeBattlePowers(b);let defenderLoss=Math.max(1,Math.floor(attack*.65)),attackerLoss=Math.max(1,Math.ceil(defense*.7));if(defenderLoss>=b.defenderTroops&&attackerLoss>=b.attackerTroops){if(attack>defense)attackerLoss=Math.max(0,b.attackerTroops-1);else defenderLoss=Math.max(0,b.defenderTroops-1)}b.attackerTroops=Math.max(0,b.attackerTroops-attackerLoss);b.defenderTroops=Math.max(0,b.defenderTroops-defenderLoss);b.attackerUnits=scaledBattleUnits(b.attackerUnits,b.attackerTroops);b.defenderUnits=scaledBattleUnits(b.defenderUnits,b.defenderTroops);replaceUnits(regions[b.territoryId],b.defenderUnits);b.turnCount++;log(`⚔️ ${regions[b.territoryId].name} 대규모 전투 ${b.turnCount}턴째 · ${K[b.attackerCountry].name} ${b.attackerTroops} VS ${K[b.defenderCountry].name} ${b.defenderTroops}`);if(b.attackerTroops<=0||b.defenderTroops<=0)await finishLargeBattle(b,b.defenderTroops<=0&&b.attackerTroops>0)}
async function processLargeBattles(){for(const b of [...Object.values(ongoingBattles)])if(b?.active)await resolveLargeBattleRound(b);renderLargeBattleNotice()}
async function aiSupportLargeBattle(k,budget){if(budget<=0)return 0;for(const b of Object.values(ongoingBattles)){if(!b?.active||!largeBattleCountry(b,k))continue;const sources=largeBattleSupportSources(b,k).sort((a,c)=>regions[c].troops-regions[a].troops);for(const i of sources){const cost=movementCost(i,b.territoryId);if(cost>budget)continue;await safeTurnVisual(`${K[k]?.name||k} 대규모전투 지원 진군`,()=>animateMarch(i,b.territoryId,true));if(supportLargeBattle(i,b.territoryId,k)){render();return cost}}}return 0}
function safeTerritoryResourceUI(i){
 try{return typeof resourceUI==='function'?resourceUI(i):''}
 catch(err){
  console.error('[삼국쟁패] 영토 특산품 UI 렌더 오류 복구',err);
  const r=regions?.[Number(i)],items=(r?.resources||[]).map(x=>`${(typeof RESOURCE_ICONS!=='undefined'&&RESOURCE_ICONS?.[x])||'◆'} ${(typeof RESOURCE_NAMES!=='undefined'&&RESOURCE_NAMES?.[x])||x}`).join(' · ')||'없음';
  return `<section class="terrain-info territory-resource-card"><div class="resource-card-head"><strong>특산품</strong></div><p class="subtext">${items}</p></section>`;
 }
}
function render(){const own=regions.filter((r,i)=>isActiveTerritory(i)&&r.owner===player),stock=ensureStrategicResources(player);ensureStrategicResourceUIStyle();ensureCityTypeStyles();applyCityPanelTheme(selected);$('kingdom').textContent=K[player].name;$('kingdom').style.color=K[player].color;$('land').innerHTML=own.length+' <small>/ '+TOTAL+'</small>';$('gold').innerHTML=gold.toFixed(1)+' <small>금</small><span class="economy-inline"><span>🌾 병량 <b>'+countryFood(player)+'</b></span><span>📜 국책 <b>'+countryPolicy(player)+'</b></span></span>'+strategicStockpileMarkup(stock)+'';$('gold').title='국고 '+gold.toFixed(1)+'금 · 병량 '+countryFood(player)+' · 국책 '+countryPolicy(player)+' · 창고 '+(window.SAMGUK_RESOURCE_SYSTEM?.stackableKeys||[]).map(key=>(RESOURCE_NAMES[key]||key)+' '+(stock[key]||0)).join(' · ');$('army').innerHTML=own.reduce((a,r)=>a+r.troops,0)+' <small>명</small>';$('season').textContent=`${currentGameYear()}년 · 제 ${turn} 턴 · ${currentSeasonName()}`;$('ap').textContent=`행동 ${ap} · 매 턴 ${actionLimit()}`;$('end').disabled=busy||!playing;
$('restart').disabled=busy;$('diplomacyButton').disabled=busy||!playing;$('fatigue').textContent='전쟁 피로도: −'+fatigue(player)+'% · 징병률 '+(100-fatigue(player))+'%';
$('hint').textContent=busy?'깃발이 이동 중입니다. 진군이 끝나면 전투 결과가 반영됩니다.':ap===0?'행동을 모두 사용했습니다. 턴을 종료하세요.':target!==null?'오른쪽에서 진군 명령을 확인하세요.':actionMode==='support'?'지원할 인접 영토 또는 진행 중인 대규모 전투를 선택하세요.':actionMode==='attack'?(attackType?'침략할 인접 상대 영토를 선택하세요.':'먼저 침략 전술을 선택하세요.'):actionMode==='capital'?'수도 승급 비용과 국가 전체 영구 보너스를 확인하세요.':actionMode==='city'?'증축할 도시 유형을 선택하세요.':actionMode==='personnel'?'인재 목록을 확인하거나 인재소에서 새 인재를 찾으세요.':'영토 선택 → 지원 · 침략 · 내정 · 도시증축 · 인사 중 행동 선택';renderLargeBattleNotice();
$('legend').innerHTML=K.filter((k,i)=>count(i)>0).map(k=>`<span><i style="background:${k.color}"></i>${k.name}</span>`).join('');$('powers').innerHTML=K.map((k,i)=>count(i)>0?`<button class="power-row" data-faction="${i}" ${count(i)===0?'disabled':''}><i style="background:${k.color}"></i>${k.name} ${i===player?'<small>나</small>':''}<b>${count(i)} <small>지역</small></b></button>`:'').join('');$('stack').innerHTML=K.map((k,i)=>`<div style="width:${count(i)/TOTAL*100}%;background:${k.color}"></div>`).join('');$('logs').innerHTML=logs.map(l=>'<p>'+l+'</p>').join('');
$('orders').innerHTML='영토를 선택하면 행동할 수 있습니다.';if(selected===null||!regions[selected]){$('detail').innerHTML='<h2>영토를 선택하세요</h2><p class="subtext">지도에서 영토를 선택한 뒤 행동을 고르세요.</p>'}else{
const r=regions[selected],yours=r.owner===player,t=target!==null?regions[target]:null;
let html=`<h2>${r.name}${isCapital(selected)?' <small class="capital-badge">★ 수도</small>':''}</h2><span class="owner" style="color:${K[r.owner].color}">${K[r.owner].name} · ${yours?'아군':'상대'} 영토</span>${cityTypeBadge(selected)}<div class="detail-stats"><span>⚔ 주둔 병력 <b>${r.troops}</b></span><span>◈ 턴 수입 <b>${territoryIncome(selected).toFixed(1)}금</b></span></div>${largeBattleAt(selected)?'<p class="subtext" style="color:#ff9ca3"><b>⚔️ 대규모 전투 진행 중</b> · 일반 침략 불가</p>':''}`;
if(isCapital(selected)){const cl=capitalLevelOf(selected),ownerLevel=capitalLevelForFaction(r.owner),cm=capitalGrowthMultiplier(r.owner);html+=`<p class="capital-benefit">🏯 수도 Level ${cl}/5 · 건설비 50% 할인${capitalHomeFaction(selected)===r.owner?` · ${K[r.owner].name} 영구 보너스: 행동 +${Math.max(0,ownerLevel-1)} · 모집/수입 ×${cm.toFixed(2)}`:''}</p>`;}
html+=cityEffectInfo(selected)+`<p class="subtext">주둔 ${unitSummary(unitCounts(r))}</p><p class="subtext">${nationTraitText(r.owner)}<br>${strategyFactionTraitText(r.owner)}</p>`+nationalStatus(selected)+supplyInfo(selected)+safeTerritoryResourceUI(selected)+terrainInfo(selected);html+=`<p class="subtext territory-geo-summary">모집 가능 <b>${recruitAmount(selected)}명</b><br>수도: ${isCapital(selected)?'O':'X'} · 산악: ${terrainKind(selected)==='mountain'?'O':'X'} · 강 인접: ${TERRAIN_RULES_DATA?.areas?.[selected]?.river?'O':'X'}</p>`;let info=html;html='';if(yours){html+=renderActions();
if(actionMode==='domestic'){html+=renderDomesticPanel(selected)}
else if(actionMode==='capital'){html+=renderCapitalUpgradeUI(selected)}else if(actionMode==='city'){html+=renderCityUpgradeUI(selected)}
else if(actionMode==='personnel'){html+=renderPersonnelMenuV37(selected)}
else if(actionMode==='authority'){html+=window.SAMGUK_AUTHORITY?.renderAuthorityPanel?.(player)||'<p class="subtext">왕권 시스템을 불러올 수 없습니다.</p>'}
else if(actionMode==='support'||actionMode==='attack'){
const support=actionMode==='support';if(!support)html+=renderAttackTactics(selected);const movementTargets=typeof movementCandidateTargets==='function'?movementCandidateTargets(selected):(neighbors[selected]||[]),destinations=support||attackType?movementTargets.filter(eligibleTarget):[];
if(support||attackType)html+=`<h3 class="mode-title">${support?'지원 보낼':'침략할'} 영토 선택</h3><p class="subtext">지도 또는 아래 목록에서 목적지를 고르세요.<br>${support?'':'선택 전술: <b>'+largeBattleLabel(attackType)+'</b><br>'}내정하기를 누르면 바로 이 영토에 건설할 수 있습니다.</p><div class="destination-list">${destinations.map(i=>`<button data-destination="${i}" aria-pressed="${target===i}" ${busy?'disabled':''}>${regions[i].name}<small>${largeBattleAt(i)?'⚔️ 대규모 전투 · ':''}${regions[i].troops}명 · ${typeof canSteppeForcedMarch==='function'&&canSteppeForcedMarch(selected,i)?'🌿 초원 강행군 · 행동 1':isSeaRoute(selected,i)?'해상':'육상'}${!support&&attackType==='siege'?' · 인접 아군 '+friendlyAdjacentCount(i,player)+'곳':''}</small></button>`).join('')||'<p class="subtext">연결된 대상 영토가 없습니다.</p>'}</div>`;
if(t){const sea=isSeaRoute(selected,target),large=attackType==='large',battle=largeBattleAt(target),wallBonus=support?0:greatWallDefensePercent(selected,target),atk=support?attackPower(selected,target):tacticalAttackPower(selected,target,large?'normal':attackType),def=support?defensePower(target,selected):tacticalDefensePower(target,selected,large?'normal':attackType);html+=`<div class="march-preview"><strong>${r.name} → ${t.name}</strong><p class="subtext">출진 ${troopSend(selected)}명 · 목적지 주둔 ${t.troops}명<br>${support?(battle?'대규모 전투 병력 지원 · 출진 병력 전원 합류':'아군 지원 · 출진 병력 전원 이동'):(large?'⚔️ 대규모 전투 · 즉시 승패 없음 · 턴 종료마다 교전':`전술 ${largeBattleLabel(attackType)} · 예상: ${prediction(selected,target,attackType)?'점령 성공':'공격 실패'}<br>공격 전력 ${Number(atk.toFixed(1))} / 수비 전력 ${Number(def.toFixed(1))} · 수비 +${defensePercent(target,selected)}%${wallBonus?' (만리장성 포함)':''}`)}</p>${!support?'<p class="subtext">'+battleModifiers(selected,target)+'</p>':''}${sea&&!support?'<p class="sea-penalty">'+seaDescription(r.owner)+'</p>':''}<button class="action ${large?'largeBattleBtn':''}" id="march" ${busy||ap<movementCost(selected,target)||!playing||troopSend(selected)<1?'disabled':''}>${support?'지원군 보내기':large?'대규모 전투 개시':'침략 명령'} · 행동 ${movementCost(selected,target)}</button></div>`}
html+='<button id="cancel" class="quiet">행동 선택 취소</button>';
}else html+='<p class="subtext">위에서 행동을 선택하세요.<br>다른 영토를 누르면 해당 영토를 바로 살펴볼 수 있습니다.</p>';
}else html+='<p class="subtext">상대 영토입니다. 침략하려면 아군 영토에서 침략하기를 선택하세요.</p>'+renderBuildings(selected);
info+=`<p class="subtext">매 턴 병력 +${troopGrowth(selected)}명 · 기본 3 + 강 보급 ${riverSupply(selected)?1:0} · 마을은 병량 생산 담당</p>`;info+=`<p class="defense-summary">이 영토의 수비 보너스 <b>+${defensePercent(selected)}%</b></p>`;$('detail').innerHTML=info;$('orders').innerHTML=html;
}
refreshOfficerPanel();updateMapDynamicState();if(lightweightInvasionState.active)requestAnimationFrame(syncLightweightInvasionMapState);}
function select(i){if(!playing||busy||!isActiveTerritory(i)||!regions[i])return;if(lightweightInvasionState.active){if(lightweightInvasionState.targets.includes(Number(i))){selectLightweightInvasionTarget(Number(i));return}if(Number(i)===lightweightInvasionState.sourceId)return;notify('붉게 표시된 공격 가능 영토를 선택하세요.');return}if(eligibleTarget(i)){target=i;render();openOfficerPanel(i);if(actionMode==='attack'&&attackType==='large')march();return}else{selected=i;target=null;actionMode=regions[i].owner===player?'domestic':'inspect'}try{render()}catch(err){console.error('[삼국쟁패] 영토 선택 UI 렌더 오류',err);actionMode=regions[i].owner===player?'domestic':'inspect';renderTerritorySelectionFallback(i,err)}try{openOfficerPanel(i)}catch(err){console.error('[삼국쟁패] 장수 패널 열기 오류',err)}}
function renderTerritorySelectionFallback(i,error){
 const r=regions?.[Number(i)],orders=$('orders'),detail=$('detail');if(!r)return;
 const yours=r.owner===player;
 if(detail)detail.innerHTML=`<h2>${r.name}${isCapital(i)?' ★':''}</h2><p class="owner" style="color:${K[r.owner]?.color||'#ddd'}">${K[r.owner]?.name||'무소속'} · ${r.troops||0}명 주둔</p><p class="subtext">영토 정보 일부를 복구 모드로 표시 중입니다.</p>`;
 if(orders)orders.innerHTML=yours?`${renderActions()}${renderDomesticPanel(i)}`:'<p class="subtext">상대 영토입니다. 침략하려면 아군 영토에서 침략하기를 선택하세요.</p>';
 if(typeof notify==='function')notify('영토 UI를 복구했습니다.');
}
function recruit(){if(!playing||busy||ap<1||selected===null||!isActiveTerritory(selected)||actionMode!=='domestic'||regions[selected].owner!==player||gold<recruitmentCost(selected,20))return;gold-=recruitmentCost(selected,20);ap--;const amount=recruitAmount(selected,true);regions[selected].troops+=amount;log(regions[selected].name+'에서 병력 '+amount+'명을 모집했습니다.');render()}
function announceExtinction(k){if(count(k)===0){const message=K[k].name+'이 멸망했습니다.';log(message);notify(message)}}
function fight(i,j,type='normal'){const a=regions[i],b=regions[j],n=troopSend(i),sent=sendUnits(i),enemy=a.owner!==b.owner,tactic=enemy&&ATTACK_TYPES[type]?type:'normal',attackerFaction=a.owner,defenderFaction=b.owner,attackerCommander=enemy?territoryCommander(i):null,defenderCommander=enemy?territoryCommander(j):null,power=enemy?tacticalAttackPower(i,j,tactic):attackPower(i,j),def=enemy?tacticalDefensePower(j,i,tactic):defensePower(j,i),old=unitCounts(b),defender=b.owner;if(n<1||enemy&&(!territoryCanAttack(i)||!canAttack(a.owner,b.owner)))return false;if(enemy){recordBattle(a.owner,b.owner);beginWar(a.owner,b.owner);if(K[a.owner].nextAttackBonus)K[a.owner].nextAttackBonus=null}changeUnits(a,sent,-1);if(!enemy){changeUnits(b,sent);return false}if(power>def){replaceUnits(b,unitPortion(sent,Math.max(1,n-Math.ceil(def*.7))));b.owner=a.owner;window.SAMGUK_OCCUPATION_SMOKE?.triggerRegion?.(j,{reason:tactic==='siege'?'siege':'capture',duration:tactic==='siege'?6200:5000,burst:tactic==='siege'?34:24});if(tactic==='devastate')b.devastatedTurns=4;if(defenderCommander)handleOfficerDefeat(defenderCommander,attackerFaction,{loserFaction:defenderFaction,battleTerritoryId:j});if(isWakoFaction(a.owner)&&defender!==a.owner)applyWakoLoot(defender,j);cleanWars();announceExtinction(defender);return true}replaceUnits(b,unitPortion(old,Math.max(1,b.troops-Math.floor(power*.65))));const baseLoss=n-Math.floor(n*.25),loss=Math.min(n,Math.ceil(baseLoss*(tactic==='surprise'?1.15:1))),survivors=Math.max(0,n-loss);changeUnits(a,unitPortion(sent,survivors));if(attackerCommander)handleOfficerDefeat(attackerCommander,defenderFaction,{loserFaction:attackerFaction,battleTerritoryId:j,retreatTerritoryId:i});return false}
async function marchLand(){if(!playing||busy||ap<=0||target===null||selected===null||regions[selected].owner!==player||!eligibleTarget(target))return;if(actionMode==='attack'&&!territoryCanAttack(selected)){notifyOfficerRequiredForAttack();return}if(territoryCannotAct(selected)){notify('혼란 상태의 부대는 출병할 수 없습니다.');return;}if(ap<movementCost(selected,target)){notify('이동에 필요한 행동력이 부족합니다.');return}if(troopSend(selected)<1){notify('출진할 병력이 부족합니다.');return}const origin=selected,destination=target,cost=movementCost(selected,target),large=actionMode==='attack'&&attackType==='large',supportBattle=actionMode==='support'&&!!largeBattleAt(destination),tactic=actionMode==='attack'&&!large?(attackType||'normal'):'normal';const attacker=regions[origin].owner,defender=regions[destination].owner,name=regions[destination].name,from=regions[origin].name;busy=true;render();await animateMarch(origin,destination);let won=false;if(large){if(!createLargeBattle(origin,destination)){busy=false;notify('이 영토에는 대규모 전투를 시작할 수 없습니다.');render();return}ap=Math.round((ap-cost)*1000)/1000;log(`${name}에 대규모 전투가 시작되었습니다. 턴 종료 시 교전합니다.`)}else if(supportBattle){if(!supportLargeBattle(origin,destination,player)){busy=false;notify('대규모 전투 지원에 실패했습니다.');render();return}ap=Math.round((ap-cost)*1000)/1000;log(`${from}에서 ${name} 대규모 전투로 지원군을 보냈습니다.`)}else{const same=regions[destination].owner===player;won=fight(origin,destination,tactic);ap=Math.round((ap-cost)*1000)/1000;log(same?`${from}에서 ${name}(으)로 병력을 이동했습니다.`:won?`${ATTACK_TYPES[tactic].label} · ${name} 점령 성공!${tactic==='devastate'?' 세금 수입 4턴간 0.':''} ${K[player].name}의 영토가 넓어졌습니다.`:`${ATTACK_TYPES[tactic].label} · ${name} 공격 실패. 생존 병력이 귀환했습니다.`);if(!same)await showBattleResult(destination,attacker,defender,won)}target=null;actionMode='inspect';attackType=null;activeExpeditionOfficerId=null;busy=false;checkEnd();render()}

function applyWakoLoot(defenderFaction,territoryId){
 if(!Number.isInteger(defenderFaction)||isWakoFaction(defenderFaction))return 0;const before=countryGold(defenderFaction),lost=Math.min(Number(WAKO_CONFIG.lootGold||50),before);setCountryGold(defenderFaction,before-lost);if(lost>0){log(`☠ 왜구 약탈 · ${regions[territoryId]?.name||'영지'} 함락으로 ${K[defenderFaction]?.name||'국가'} 국고 ${lost}금 손실`);if(defenderFaction===player)notify(`왜구 약탈! 국고 ${lost}금 손실`)}return lost;
}
// v64: 바다 중간 정박 상태 없이 WORLD.seaRoutes를 직접 이동 가능한 연결 정보로만 사용한다.
async function march(){return marchLand()}

function checkEnd(){if(count(player)===TOTAL||count(player)===0){playing=false;$('result').textContent=count(player)===TOTAL?'동아시아 제패':'왕국의 마지막 날';$('resultText').textContent=count(player)===TOTAL?`${turn}턴 만에 ${K[player].name}(이)가 동아시아 전역을 제패했습니다. 새로운 시대가 열립니다.`:`${turn}턴, 마지막 영토를 잃었습니다. 다른 전략으로 다시 도전해 보세요.`;$('finish').showModal();return true}return false}
let turnProcessing=false,turnProcessingStage='idle';
const AI_PHASE_CONFIG=Object.freeze({countryTimeoutMs:3000,visualTimeoutMs:3000,maxActionIterations:64});
class AiPhaseTimeoutError extends Error{constructor(message){super(message);this.name='AiPhaseTimeoutError'}}
function turnNow(){return typeof performance!=='undefined'&&performance.now?performance.now():Date.now()}
function aiPhaseLabel(k,step=''){const name=Number.isInteger(k)&&K[k]?K[k].name:`국가 ${k}`;return step?`${name} · ${step}`:name}
function setTurnStage(stage,k=null,step=''){
 turnProcessingStage=Number.isInteger(k)?`${stage}:${k}${step?':'+step:''}`:stage;
 if(stage==='ai-phase')console.log(`[삼국쟁패][AI-PHASE][T${turn}] ${aiPhaseLabel(k,step)} 시작`);
 else console.log(`[삼국쟁패][TURN][T${turn}] ${turnProcessingStage}`);
}
function turnClone(v){if(v===undefined)return undefined;try{return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v))}catch{return JSON.parse(JSON.stringify(v))}}
function validateTurnState(stage='unknown'){
 if(!Array.isArray(regions)||regions.length!==WORLD.territories.length)throw new Error(`[${stage}] regions length mismatch`);
 if(!Array.isArray(K)||!K.length)throw new Error(`[${stage}] faction data missing`);
 if(!Number.isFinite(turn)||turn<1)throw new Error(`[${stage}] invalid turn`);
 if(!Number.isFinite(ap)||ap<0)throw new Error(`[${stage}] invalid action points`);
 if(!Number.isFinite(gold)||gold<0)throw new Error(`[${stage}] invalid player gold`);if(!Number.isFinite(countryFood(player))||countryFood(player)<0)throw new Error(`[${stage}] invalid player food`);if(!Number.isFinite(countryPolicy(player))||countryPolicy(player)<0)throw new Error(`[${stage}] invalid policy points`);
regions.forEach((r,i)=>{if(!isActiveTerritory(i))return;if(!r||!Number.isInteger(r.owner)||r.owner<0||r.owner>=K.length)throw new Error(`[${stage}] invalid owner at territory ${i}`);if(!Number.isFinite(Number(r.troops))||Number(r.troops)<0)throw new Error(`[${stage}] invalid troops at territory ${i}`);if(!r.buildings||typeof r.buildings!=='object')r.buildings={barracks:false,wall:false,market:false,university:false,village:0,tradePort:false,forge:false,jiangnanFort:false,watchtower:false}});
 K.forEach((k,i)=>{if(!k)throw new Error(`[${stage}] missing faction ${i}`);if(!Number.isFinite(Number(k.gold)))k.gold=0});
 if(selected!==null&&(!Number.isInteger(selected)||!regions[selected]||!isActiveTerritory(selected)))selected=null;
 return true;
}
function captureTurnSnapshot(){return {player,choice,playing,turn,ap,gold,selected,target,actionMode,attackType,wallUpgradeCount:typeof wallUpgradeCount!=='undefined'?wallUpgradeCount:0,logs:turnClone(logs),regions:turnClone(regions),factions:K.map(k=>turnClone(k)),ongoingBattles:turnClone(ongoingBattles),officers:typeof OFFICERS!=='undefined'?OFFICERS.map(o=>({id:o.id,data:turnClone(Object.fromEntries(Object.entries(o)))})):[],supportTurn:typeof supportTurn!=='undefined'?turnClone(supportTurn):undefined,relations:typeof relations!=='undefined'?turnClone(relations):undefined,wars:typeof wars!=='undefined'?turnClone(wars):undefined,peaceUntil:typeof peaceUntil!=='undefined'?turnClone(peaceUntil):undefined,warTurns:typeof warTurns!=='undefined'?turnClone(warTurns):undefined,peaceTurns:typeof peaceTurns!=='undefined'?turnClone(peaceTurns):undefined,battleThisTurn:typeof battleThisTurn!=='undefined'?turnClone(battleThisTurn):undefined}}
function restoreTurnSnapshot(s){
 if(!s)return;
 if(Number.isInteger(s.player))player=s.player;
 if(Number.isInteger(s.choice))choice=s.choice;
 if(typeof s.playing==='boolean')playing=s.playing;
 turn=s.turn;ap=s.ap;gold=s.gold;selected=s.selected;target=s.target;actionMode=s.actionMode;attackType=s.attackType;
 if(typeof wallUpgradeCount!=='undefined'&&Number.isFinite(Number(s.wallUpgradeCount)))wallUpgradeCount=Number(s.wallUpgradeCount);
 if(Array.isArray(s.logs))logs=turnClone(s.logs);
 const savedRegions=Array.isArray(s.regions)?turnClone(s.regions):[];
 const freshRegions=initialRegions();
 // v128: v127의 파란 마스크 노드 3개가 삭제되어 뒤쪽 확장 영토 인덱스가 이동한다.
 // 저장 데이터는 숫자 인덱스가 아니라 stable territoryId 우선으로 재결합한다.
 const savedByStableId=new Map();
 const savedIndexToNewIndex=new Map();
 for(let oldIndex=0;oldIndex<savedRegions.length;oldIndex++){
  const row=savedRegions[oldIndex];if(!row)continue;
  const stable=String(row.territoryId||'').trim();if(stable)savedByStableId.set(stable,row);
 }
 const newIndexByStableId=new Map(freshRegions.map((row,i)=>[String(row?.territoryId||''),i]).filter(([id])=>id));
 for(let oldIndex=0;oldIndex<savedRegions.length;oldIndex++){
  const stable=String(savedRegions[oldIndex]?.territoryId||'').trim();
  if(stable&&newIndexByStableId.has(stable))savedIndexToNewIndex.set(oldIndex,newIndexByStableId.get(stable));
  else if(oldIndex<102&&oldIndex<freshRegions.length)savedIndexToNewIndex.set(oldIndex,oldIndex);
 }
 regions=freshRegions.map((fresh,i)=>{
  const stable=String(fresh?.territoryId||'').trim();
  const saved=(stable&&savedByStableId.get(stable))||(i<102?savedRegions[i]:null);
  return saved?Object.assign(fresh,saved):fresh;
 });
 for(let i=0;i<regions.length;i++){
  if(regions[i]&&WORLD.territories?.[i]){
   regions[i].name=WORLD.territories[i].name;
   regions[i].territoryId=WORLD.territories[i].id||regions[i].territoryId||null;
   regions[i].terrainType=WORLD.territories[i].terrainType||regions[i].terrainType||null;
   if(!Array.isArray(regions[i].resources))regions[i].resources=[...(WORLD.territories[i].resources||[])];
  }
 }
 if(typeof bindSteppeTerrainData==='function')bindSteppeTerrainData(regions);
 ongoingBattles=turnClone(s.ongoingBattles)||{};
 s.factions?.forEach((row,i)=>{if(K[i])Object.assign(K[i],turnClone(row))});
 if(typeof OFFICERS!=='undefined')for(const row of s.officers||[]){const o=OFFICER_BY_ID?.get?.(String(row.id));if(o){const data=turnClone(row.data)||{};if(Number.isInteger(data.territoryId)){if(savedIndexToNewIndex.has(data.territoryId))data.territoryId=savedIndexToNewIndex.get(data.territoryId);else if(data.territoryId>=102)data.territoryId=null}Object.assign(o,data);o.status=normalizeOfficerStatus(o.status);ensureOfficerStatCompatibility(o);normalizeOfficerSalary(o)}}
 if(typeof rebuildOfficerTerritoryIndex==='function')rebuildOfficerTerritoryIndex();
 if(typeof rebuildOfficerTerritoryState==='function')rebuildOfficerTerritoryState();
 if(s.supportTurn!==undefined&&typeof supportTurn!=='undefined')supportTurn=turnClone(s.supportTurn);
 if(s.relations!==undefined&&typeof relations!=='undefined')relations=turnClone(s.relations);
 if(s.wars!==undefined&&typeof wars!=='undefined')wars=turnClone(s.wars);
 if(s.peaceUntil!==undefined&&typeof peaceUntil!=='undefined')peaceUntil=turnClone(s.peaceUntil);
 if(s.warTurns!==undefined&&typeof warTurns!=='undefined')warTurns=turnClone(s.warTurns);
 if(s.peaceTurns!==undefined&&typeof peaceTurns!=='undefined')peaceTurns=turnClone(s.peaceTurns);
 if(s.battleThisTurn!==undefined&&typeof battleThisTurn!=='undefined')battleThisTurn=turnClone(s.battleThisTurn);
}
function saveGame(){if(!playing||busy||turnProcessing)return false;try{localStorage.setItem(SAMGUK_SAVE_KEY,JSON.stringify(captureTurnSnapshot()));notify('게임을 저장했습니다.');return true}catch(error){console.error('[삼국쟁패] save failed',error);notify('저장에 실패했습니다.');return false}}
function loadGame(){if(busy||turnProcessing)return false;try{const raw=localStorage.getItem(SAMGUK_SAVE_KEY);if(!raw){notify('저장된 게임이 없습니다.');return false}const data=JSON.parse(raw);restoreTurnSnapshot(data);playing=true;gold=countryGold(player);validateTurnState('load-game');const startDialog=$('start');if(startDialog?.open)startDialog.close();resetMap();render();window.SAMGUK_VISIBILITY?.refreshAll?.({forceOverlay:true});notify('저장된 게임을 불러왔습니다.');return true}catch(error){console.error('[삼국쟁패] load failed',error);notify('불러오기에 실패했습니다.');return false}}
function turnOptional(label,fn,fallback=null){try{return typeof fn==='function'?fn():fallback}catch(error){console.warn(`[삼국쟁패] optional turn step skipped: ${label}`,error);return fallback}}
function closeTurnTransientUI(){if(lightweightInvasionState.active){clearLightweightInvasionClasses();lightweightInvasionState.active=false;lightweightInvasionState.targets=[];lightweightInvasionState.targetId=null}closeOfficerPanel();clearOfficerDropTargets();draggedOfficerId=null;officerTransferDraft=null;officerSchemeDraft=null;activeExpeditionOfficerId=null;mountainEventSelection=null;for(const id of ['officerDetailModal','officerTransferModal','officerSchemeModal','strategyEspionageModal','invasionCommandModal','mountainEventMenu','mountainEventResult','greatWallMenu']){const d=document.getElementById(id);if(d?.open){try{d.close()}catch{}}}document.activeElement?.blur?.()}
function resetTurnInteractionState(){selected=null;target=null;actionMode='inspect';attackType=null}
async function waitWithTimeout(promise,label,ms=AI_PHASE_CONFIG.visualTimeoutMs){
 let timer=null;try{return await Promise.race([Promise.resolve(promise),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new AiPhaseTimeoutError(`${label} ${ms}ms 초과`)),ms)})])}finally{if(timer)clearTimeout(timer)}
}
async function safeTurnVisual(label,producer){
 try{return await waitWithTimeout(typeof producer==='function'?producer():producer,label)}catch(error){console.warn(`[삼국쟁패][AI-PHASE] 시각 연출 스킵: ${label}`,error);return null}
}
async function runAiStep(k,step,fn,{soft=false}={}){
 setTurnStage('ai-phase',k,step);const started=turnNow();
 try{const value=await fn();const elapsed=turnNow()-started;console.log(`[삼국쟁패][AI-PHASE][T${turn}] ${aiPhaseLabel(k,step)} 완료 ${elapsed.toFixed(1)}ms`);if(elapsed>AI_PHASE_CONFIG.countryTimeoutMs)throw new AiPhaseTimeoutError(`${aiPhaseLabel(k,step)} 연산이 ${Math.round(elapsed)}ms 걸려 제한 ${AI_PHASE_CONFIG.countryTimeoutMs}ms 초과`);return value}
 catch(error){console.error(`[삼국쟁패][AI-PHASE][T${turn}] ${aiPhaseLabel(k,step)} 실패`,error);if(soft)return null;throw error}
}
function safeAiMovementCost(i,j){const cost=Number(movementCost(i,j));if(!Number.isFinite(cost)||cost<=0)throw new Error(`invalid AI movement cost ${i}->${j}: ${cost}`);return cost}
async function runAiCountry(k){
 const countrySnapshot=captureTurnSnapshot(),name=K[k]?.name||String(k);let step='init';
 try{
  console.groupCollapsed?.(`[삼국쟁패][AI-PHASE][T${turn}] ${name}`);
  step='officers';await runAiStep(k,step,()=>typeof aiAssignOfficerRoles==='function'?aiAssignOfficerRoles(k):null,{soft:true});
  step='city-specialize';await runAiStep(k,step,()=>typeof aiMaybeSpecializeCity==='function'?aiMaybeSpecializeCity(k):null,{soft:true});
  step='espionage';await runAiStep(k,step,()=>typeof aiTryEspionage==='function'?aiTryEspionage(k):null,{soft:true});
  let own=await runAiStep(k,'territory-scan',()=>regions.map((r,i)=>isActiveTerritory(i)&&r.owner===k?i:-1).filter(i=>i>=0));
  const budget=2+universityCount(k)+(K[k].palaceLevel||0)+capitalActionBonus(k)+(AUTHORITY_SYSTEM?.actionBonus?.(k)||0);
  await runAiStep(k,'income',()=>settleCountryEconomy(k));
  await runAiStep(k,'mountain-event',()=>maybeAiMountainEvent(k),{soft:true});
  let spent=await runAiStep(k,'build',()=>aiBuild(k,budget));spent=Number.isFinite(Number(spent))?Number(spent):0;
  const mobileOwn=await runAiStep(k,'growth',()=>{const list=own.filter(i=>!largeBattleAt(i)&&!territoryCannotAct(i));list.forEach(i=>regions[i].troops+=troopGrowth(i,true));return list});
  let fronts=mobileOwn.filter(i=>(neighbors[i]||[]).some(j=>regions[j]&&regions[j].owner!==k));
  let weak=(fronts.length?fronts:mobileOwn).sort((a,b)=>regions[a].troops-regions[b].troops)[0];
  if(weak!==undefined)await runAiStep(k,'draft',()=>{const money=recruitmentCost(weak,20),foodCost=unitRecruitFoodCost('infantry',weak);if(countryGold(k)<money||countryFood(k)<foodCost)return 0;setCountryGold(k,countryGold(k)-money);setCountryFood(k,countryFood(k)-foodCost);const draftedAmount=drafted(weak,20,true);const amount=Math.max(0,Math.round(draftedAmount*cityRecruitMultiplier(weak)*politicsRecruitMultiplier(weak)*(window.SAMGUK_AUTHORITY?.recruitmentMultiplier?.(k)||1)));regions[weak].troops+=amount;return amount});
  if(weak!==undefined&&spent<budget)spent+=Number(await runAiStep(k,'special-recruit',()=>aiRecruitSpecialUnit(k,weak),{soft:true})||0);
  spent+=Number(await runAiStep(k,'large-battle-support',()=>aiSupportLargeBattle(k,Math.max(0,budget-spent)),{soft:true})||0);
  let iterations=0;
  for(let action=spent;action<budget-1e-9;){
   if(++iterations>AI_PHASE_CONFIG.maxActionIterations)throw new AiPhaseTimeoutError(`${name} AI 행동 루프 ${AI_PHASE_CONFIG.maxActionIterations}회 초과`);
   const loopStart=turnNow();let opts=[];
   regions.forEach((r,i)=>{if(isActiveTerritory(i)&&r.owner===k&&!largeBattleAt(i)&&!territoryCannotAct(i)&&territoryCanAttack(i))(typeof movementCandidateTargets==='function'?movementCandidateTargets(i):(neighbors[i]||[])).forEach(j=>{if(regions[j]&&!largeBattleAt(j)&&regions[j].owner!==k&&canAttack(k,regions[j].owner)){const cost=safeAiMovementCost(i,j);if(cost<=budget-action){const tactic=aiAttackType(i,j,k);if(prediction(i,j,tactic))opts.push([i,j,tacticalAttackPower(i,j,tactic)-tacticalDefensePower(j,i,tactic),tactic,cost])}}})});
   if(turnNow()-loopStart>AI_PHASE_CONFIG.countryTimeoutMs)throw new AiPhaseTimeoutError(`${name} 공격 후보 계산 ${Math.round(turnNow()-loopStart)}ms 초과`);
   opts.sort((a,b)=>b[2]-a[2]);
   if(opts.length){let [i,j,,tactic,cost]=opts[0],was=regions[j].owner;action+=cost;if(was===player)centerBattle(j);await safeTurnVisual(`${name} ${regions[i].name}->${regions[j].name} 진군`,()=>animateMarch(i,j,true));const won=fight(i,j,tactic);if(was===player&&won)centerBattle(j);render();await safeTurnVisual(`${name} ${regions[j].name} 전투결과`,()=>showBattleResult(j,k,was,won,true));log(`${K[k].name} ${ATTACK_TYPES[tactic].label} · ${regions[j].name} 점령${tactic==='devastate'?' · 세금 4턴 0':''}${was===player?' — 우리 영토를 빼앗겼습니다.':'.'}`)}
   else{let interior=regions.map((r,i)=>isActiveTerritory(i)&&r.owner===k&&!largeBattleAt(i)&&!territoryCannotAct(i)&&!(neighbors[i]||[]).some(j=>regions[j]?.owner!==k)?i:-1).filter(i=>i>=0);if(interior.length&&fronts.length){let i=interior.sort((a,b)=>regions[b].troops-regions[a].troops)[0],d=distances(fronts,k),j=(neighbors[i]||[]).filter(j=>regions[j]?.owner===k&&!largeBattleAt(j)&&d[j]<d[i]).sort((a,b)=>d[a]-d[b])[0];if(j!==undefined){const cost=safeAiMovementCost(i,j);if(cost<=budget-action){await safeTurnVisual(`${name} 재배치 ${regions[i].name}->${regions[j].name}`,()=>animateMarch(i,j,true));fight(i,j);render()}}}break}
  }
  validateTurnState(`ai-country-${k}-end`);console.log(`[삼국쟁패][AI-PHASE][T${turn}] ${name} 완료`);return true;
 }catch(error){restoreTurnSnapshot(countrySnapshot);console.error(`[삼국쟁패][AI-PHASE][T${turn}] ${name} 스킵 · 단계 ${step}`,error);log(`⚠ ${name} AI 연산 오류 · 이번 턴은 대기 처리 (${step})`);return false}
 finally{console.groupEnd?.()}
}
async function syncDiplomacyVisualsAfterAi(){
 setTurnStage('ai-phase',null,'diplomacy-sync');
 try{
  // Data first, presentation second. This prevents map effects from observing half-updated diplomacy state.
  await Promise.resolve();
  const legacy=document.getElementById('diplomacyDialog');if(legacy?.open&&typeof renderDiplomacy==='function')renderDiplomacy();
  if(typeof TW_DIPLOMACY_UI_STATE!=='undefined'&&TW_DIPLOMACY_UI_STATE?.open&&typeof renderTotalWarDiplomacy==='function')renderTotalWarDiplomacy();
  const hook=window.SAMGUK_DIPLOMACY_MAP_EFFECTS?.sync||window.SAMGUK_DIPLOMACY_ADAPTER?.syncMapEffects;
  if(typeof hook==='function')await safeTurnVisual('외교 지도 효과 동기화',()=>Promise.resolve(hook({turn,relations:typeof relations!=='undefined'?relations:null,wars:typeof wars!=='undefined'?wars:null,regions})));
  console.log(`[삼국쟁패][AI-PHASE][T${turn}] 외교 데이터 → 지도 효과 동기화 완료`);
 }catch(error){console.warn('[삼국쟁패][AI-PHASE] 외교 지도 효과 동기화 스킵',error)}
}
async function endTurn(){
 if(!playing||busy||turnProcessing)return false;
 const snapshot=captureTurnSnapshot();turnProcessing=true;busy=true;setTurnStage('validate-start');closeTurnTransientUI();resetTurnInteractionState();
 const safeEmptyInventory=()=>{try{return typeof emptyFactionInventory==='function'?emptyFactionInventory():{}}catch(_e){return {}}};
 try{
  validateTurnState(turnProcessingStage);render();
  setTurnStage('ai-phase');
  for(let k=0;k<K.length;k++){if(k===player||!count(k))continue;await runAiCountry(k);if(count(player)===0)break}
  setTurnStage('diplomacy-sync');await syncDiplomacyVisualsAfterAi();
  setTurnStage('large-battles');await processLargeBattles();

  setTurnStage('rice-recruit');turnOptional('riceRecruit',()=>typeof riceRecruit==='function'?riceRecruit():null);
  setTurnStage('strategic-resources');
  let strategicGains=K.map(()=>safeEmptyInventory());
  try{const gains=typeof produceAllStrategicResources==='function'?produceAllStrategicResources():null;if(Array.isArray(gains))strategicGains=gains}
  catch(error){console.error('[삼국쟁패][TURN] 전략자원 정산 복구',error)}

  setTurnStage('officer-effects');turnOptional('officer effects',()=>tickOfficerGameplayEffects());
  setTurnStage('advance-turn');turn++;
  setTurnStage('visibility');turnOptional('visibility tick',()=>window.SAMGUK_VISIBILITY?.updateTurnVisibility?.(turn));
  setTurnStage('officer-status');turnOptional('officer status',()=>updateOfficerStatusOnTurn());
  if(typeof supportTurn!=='undefined')supportTurn=K.map(()=>0);
  setTurnStage('war-fatigue');turnOptional('war fatigue',()=>typeof advanceWarFatigue==='function'?advanceWarFatigue():null);turnOptional('war penalty decay',()=>typeof applyNaturalWarPenaltyDecay==='function'?applyNaturalWarPenaltyDecay():null);turnOptional('temple war relief',()=>applyAllTempleRelief());

  setTurnStage('action-points');
  const nextAp=Number(actionLimit());ap=Number.isFinite(nextAp)&&nextAp>=0?nextAp:3;

  setTurnStage('player-economy');
  let economyReport=null;
  const economyBefore={gold:countryGold(player),food:countryFood(player),policy:countryPolicy(player)};
  try{economyReport=settleCountryEconomy(player)}catch(error){
   console.error('[삼국쟁패][TURN] 플레이어 경제 정산 실패 · 안전 복구',error);
   try{setCountryGold(player,economyBefore.gold);setCountryFood(player,economyBefore.food);setCountryPolicy(player,economyBefore.policy)}catch(_e){}
  }
  if(!economyReport||typeof economyReport!=='object')economyReport={grossGold:0,upkeepGold:0,foodProduction:0,armyFoodUpkeep:0,upkeepFood:0,policyProduction:0,salaryUpkeep:0};
  for(const key of ['grossGold','upkeepGold','foodProduction','armyFoodUpkeep','upkeepFood','policyProduction','salaryUpkeep'])if(!Number.isFinite(Number(economyReport[key])))economyReport[key]=0;
  gold=countryGold(player);

  setTurnStage('troop-growth');
  regions.forEach((r,i)=>{if(!isActiveTerritory(i)||r.owner!==player||largeBattleAt(i))return;try{const growth=Number(troopGrowth(i,true));if(Number.isFinite(growth)&&growth>0)r.troops=Math.max(0,(Number(r.troops)||0)+growth)}catch(error){console.error(`[삼국쟁패][TURN] 병력 보충 스킵 · territory ${i}`,error)}});
  setTurnStage('cleanup');turnOptional('devastation tick',()=>tickDevastation());turnOptional('mountain cooldown tick',()=>tickMountainEvents());

  setTurnStage('turn-log');
  const income=Number(economyReport.grossGold)||0,playerGain=strategicGains[player]||safeEmptyInventory();
  let resourceText='없음';try{resourceText=typeof strategicResourceGainText==='function'?strategicResourceGainText(playerGain):'없음'}catch(_e){}
  log(`제 ${turn} 턴. 금 +${income.toFixed(1)} / 유지 -${Number(economyReport.upkeepGold||0).toFixed(1)}(녹봉 ${economyReport.salaryUpkeep||0}) · 병량 +${economyReport.foodProduction||0} / 병력소모 -${economyReport.armyFoodUpkeep||0} · 국책 +${economyReport.policyProduction||0} · 전략자원 ${resourceText} · 행동 ${ap}회.`);
  if(selected===null||!regions[selected]||regions[selected].owner!==player)selected=regions.findIndex((r,i)=>isActiveTerritory(i)&&r.owner===player);if(selected<0)selected=null;target=null;attackType=null;
  setTurnStage('officer-reset');turnOptional('officer turn reset',()=>resetOfficerTurnState());

  setTurnStage('validate-end');validateTurnState(turnProcessingStage);checkEnd();setTurnStage('complete');return true;
 }catch(error){console.error(`[삼국쟁패] endTurn failed at ${turnProcessingStage}`,error);restoreTurnSnapshot(snapshot);log(`턴 처리 오류 복구 · ${turnProcessingStage} 단계에서 이전 상태로 되돌렸습니다.`);notify(`턴 처리 오류를 복구했습니다. 오류 단계: ${turnProcessingStage}`);return false}
 finally{closeTurnTransientUI();target=null;actionMode='inspect';attackType=null;if(playing&&(selected===null||!regions[selected]||regions[selected].owner!==player))selected=regions.findIndex((r,i)=>isActiveTerritory(i)&&r.owner===player);if(selected<0)selected=null;busy=false;turnProcessing=false;turnProcessingStage='idle';try{render()}catch(error){console.error('[삼국쟁패][TURN] 최종 UI 렌더 오류',error);try{updateMapDynamicState?.({force:true})}catch(_e){}}}
}
async function nextTurn(){return endTurn()}

function distances(fronts,k){let d=regions.map(()=>Infinity),q=[...fronts];q.forEach(i=>d[i]=0);for(let a=0;a<q.length;a++){let i=q[a];neighbors[i].forEach(j=>{if(regions[j].owner===k&&d[j]>d[i]+1){d[j]=d[i]+1;q.push(j)}})}return d}
function choices(){$('choices').innerHTML=K.map((k,i)=>k.initial&&!k.specialFaction?`<button class="choice ${choice===i?'active':''}" data-choice="${i}" aria-pressed="${choice===i}"><span>${k.desc}</span><strong style="color:${k.color}">${k.name}</strong><small>${k.perk}</small><small>${nationTraitText(i)}</small><small class="strategy-faction-traits">${strategyFactionTraitText(i)}</small></button>`:'').join('');$('begin').textContent=K[choice].name+'로 출정하기 →'}
// Recompute only when ownership changes; existing sea adjacency also carries supply.
let supplyKey='',supplyFlags=[];
function supplied(i){const key=regions.map(r=>r.owner).join(',');if(key!==supplyKey){supplyKey=key;supplyFlags=regions.map(()=>false);for(let k=0;k<K.length;k++){const unseen=new Set(regions.map((r,j)=>isActiveTerritory(j)&&r.owner===k?j:-1).filter(j=>j>=0)),parts=[];while(unseen.size){const root=unseen.values().next().value,q=[root];unseen.delete(root);for(const j of q)for(const n of neighbors[j])if(unseen.has(n)){unseen.delete(n);q.push(n)}parts.push(q)}if(!parts.length)continue;const homeCapital=CAPITALS.find(j=>Number.isInteger(j)&&seeds[j]?.[3]===k&&regions[j]?.owner===k);const mainland=homeCapital===undefined?parts.sort((a,b)=>b.length-a.length||a[0]-b[0])[0]:parts.find(a=>a.includes(homeCapital));for(const j of mainland)supplyFlags[j]=true}}return !!supplyFlags[i]}
function supplyFactor(i){return supplied(i)?1:.75}
function supplyInfo(i){return `<p class="subtext">${supplied(i)?'보급 정상':'보급 단절 · 세금 −25% · 모집량 −25%'}</p>`}


// =============================================================================
// Integrated strategy expansion: officers + city growth + espionage + faction AI
// This layer reuses the existing runtime objects/functions and avoids changing
// territory IDs, map rendering, adjacency, or external save formats.
// =============================================================================
const OFFICER_STAT_TOOLTIPS={
 leadership:'통솔 · 출병 가능한 최대 병력과 대군 지휘에 영향',
 war:'무력 · 전투 공격력과 직접 교전 효율에 영향',
 intelligence:'지력 · 첩보/계략 성공률과 행정 판단에 영향',
 charisma:'매력 · 징집, 민심, 충성도 유지, 등용/회유와 내정 보정에 영향',
 authority:'권위 · 장수의 명망과 지휘 위신을 나타내는 인물 평가 수치'
};
const OFFICER_ASSIGNMENTS={
 command:{label:'통솔장',icon:'旗',stat:'leadership',description:'출병과 대군 지휘'},
 combat:{label:'무력장',icon:'武',stat:'war',description:'전투와 직접 공격'},
 strategy:{label:'지장',icon:'策',stat:'intelligence',description:'첩보·계략·계략 방어'},
 administration:{label:'행정관',icon:'政',stat:'intelligence',description:'지력 중심의 수입·건설·도시 관리'},
 recruitment:{label:'매력장',icon:'人',stat:'charisma',description:'징집·민심·등용'}
};
function officerAssignmentLabel(key){return OFFICER_ASSIGNMENTS[key]?.label||'미지정'}
function defaultOfficerAssignment(o){let best='command',score=-1;for(const [key,data] of Object.entries(OFFICER_ASSIGNMENTS)){const v=o?.stats?.[data.stat]??0;if(v>score){score=v;best=key}}return best}
function setOfficerAssignment(officerId,key){const o=OFFICER_BY_ID.get(String(officerId));if(!o||!OFFICER_ASSIGNMENTS[key])return false;o.assignment=key;refreshOfficerPanel();if(document.getElementById('officerDetailModal')?.open)openOfficerDetail(o.id);return true}
function bestOfficerForAssignment(i,key){const stat=OFFICER_ASSIGNMENTS[key]?.stat||'leadership';const list=officersInTerritory(i).filter(officerCanCommand);return [...list].sort((a,b)=>((b.assignment===key?8:0)+(b.stats?.[stat]||0))-((a.assignment===key?8:0)+(a.stats?.[stat]||0)))[0]||null}
function territoryAdministrator(i){return bestOfficerForAssignment(i,'administration')||governorForTerritory(i)}
function territoryRecruiter(i){return bestOfficerForAssignment(i,'recruitment')||governorForTerritory(i)}
function territoryStrategist(i){return bestOfficerForAssignment(i,'strategy')||schemeTargetGovernor(i)}
function defenseCommander(i){return bestOfficerForAssignment(i,'combat')||bestOfficerForAssignment(i,'command')||governorForTerritory(i)}
function renderOfficerAssignmentControls(o){return `<div class="strategy-assignment-grid">${Object.entries(OFFICER_ASSIGNMENTS).map(([key,a])=>`<button type="button" data-officer-assignment="${key}" data-officer-id="${o.id}" aria-pressed="${o.assignment===key}" title="${a.description}"><b>${a.icon}</b><span>${a.label}</span><small>${a.description}</small></button>`).join('')}</div>`}

const OFFICER_SKILL_DEFS={
 cavalry_charge:{id:'cavalry_charge',name:'기병돌격',description:'공격 전력 +8%',category:'전쟁',trigger:'attack',effect:'attackPct',value:.08},
 iron_wall:{id:'iron_wall',name:'철벽',description:'수비 전력 +10%',category:'방어',trigger:'defense',effect:'defensePct',value:.10},
 ambush:{id:'ambush',name:'매복',description:'기습 전력 +10%',category:'기습',trigger:'surprise',effect:'surprisePct',value:.10},
 surprise:{id:'surprise',name:'기습',description:'기습 전력 +8%',category:'기습',trigger:'surprise',effect:'surprisePct',value:.08},
 war_god:{id:'war_god',name:'군신',description:'공격 전력 +10%',category:'전쟁',trigger:'attack',effect:'attackPct',value:.10},
 intimidation:{id:'intimidation',name:'위압',description:'전투 승리 시 적 사기 압박 강화',category:'전쟁',trigger:'battle',effect:'moraleDamagePct',value:.10},
 fire_tactics:{id:'fire_tactics',name:'화공',description:'화계 성공률 +10%',category:'계략',trigger:'scheme',effect:'fireSchemePct',value:.10},
 feint:{id:'feint',name:'허허실실',description:'계략 성공률 +8%',category:'계략',trigger:'scheme',effect:'schemePct',value:.08},
 rapid_march:{id:'rapid_march',name:'신속행군',description:'최대 출병 병력 +12%',category:'병력 운용',trigger:'expedition',effect:'troopLimitPct',value:.12},
 fortress:{id:'fortress',name:'수성전',description:'수비 전력 +12%',category:'방어',trigger:'defense',effect:'defensePct',value:.12},
 logistics:{id:'logistics',name:'병참관리',description:'최대 출병 병력 +10%',category:'병력 운용',trigger:'expedition',effect:'troopLimitPct',value:.10},
 incitement:{id:'incitement',name:'선동',description:'유언비어 성공률 +12%',category:'계략',trigger:'espionage',effect:'rumorSchemePct',value:.12},
 rumor:{id:'rumor',name:'유언비어',description:'유언비어 성공률 +10%',category:'첩보',trigger:'espionage',effect:'rumorSchemePct',value:.10},
 spy_network:{id:'spy_network',name:'첩보망',description:'첩보 성공률 +12%',category:'첩보',trigger:'espionage',effect:'espionagePct',value:.12},
 counter_spy:{id:'counter_spy',name:'반간계',description:'적 첩보 성공률 -14%',category:'계략 방어',trigger:'defense',effect:'counterEspionagePct',value:.14},
 tuntian:{id:'tuntian',name:'둔전',description:'농업·병력 보충 효율 +12%',category:'내정',trigger:'domestic',effect:'agriculturePct',value:.12},
 prosperity:{id:'prosperity',name:'부국강병',description:'도시 수입 +12%',category:'경제',trigger:'income',effect:'incomePct',value:.12},
 calm_people:{id:'calm_people',name:'민심안정',description:'턴 종료 사기·안정도 회복 강화',category:'도시 관리',trigger:'turnEnd',effect:'moraleRecoveryPct',value:.10},
 talent_recruit:{id:'talent_recruit',name:'인재등용',description:'등용/회유 성공률 +12%',category:'등용',trigger:'recruit',effect:'recruitSchemePct',value:.12},
 charisma:{id:'charisma',name:'카리스마',description:'징집 효율 +12%',category:'징집',trigger:'recruit',effect:'recruitPct',value:.12},
 assault:{id:'assault',name:'돌격',description:'공격 전력 +6%',category:'전쟁',trigger:'attack',effect:'attackPct',value:.06},
 steadfast:{id:'steadfast',name:'견고',description:'수비 전력 +6%',category:'방어',trigger:'defense',effect:'defensePct',value:.06},
 vanguard:{id:'vanguard',name:'선봉',description:'최대 출병 병력 +7%',category:'병력 운용',trigger:'expedition',effect:'troopLimitPct',value:.07},
 cavalry_command:{id:'cavalry_command',name:'기마지휘',description:'공격 전력 +5%',category:'전쟁',trigger:'attack',effect:'attackPct',value:.05},
 insight:{id:'insight',name:'간파',description:'적 계략 성공률 -10%',category:'계략 방어',trigger:'defense',effect:'schemeDefensePct',value:.10},
 strategy:{id:'strategy',name:'책략',description:'계략 성공률 +10%',category:'계략',trigger:'scheme',effect:'schemePct',value:.10},
 negotiation:{id:'negotiation',name:'교섭',description:'등용/회유 성공률 +8%',category:'등용',trigger:'recruit',effect:'recruitSchemePct',value:.08},
 supply:{id:'supply',name:'보급',description:'턴 병력 보충 +10%',category:'병력 운용',trigger:'turnEnd',effect:'troopGrowthPct',value:.10},
 engineering:{id:'engineering',name:'공병술',description:'건설 비용 -10%',category:'건설',trigger:'build',effect:'buildDiscountPct',value:.10},
 inspire:{id:'inspire',name:'격려',description:'징집 효율 +8%',category:'징집',trigger:'recruit',effect:'recruitPct',value:.08}
};
const OFFICER_SKILL_ALIAS={
 '화계':'fire_tactics','연환':'strategy','통솔':'logistics','위엄':'charisma','민심':'calm_people','군정':'prosperity','외교':'negotiation',
 '돌격':'assault','견고':'steadfast','위압':'intimidation','선봉':'vanguard','기마지휘':'cavalry_command','수성':'fortress','간파':'insight','책략':'strategy','교섭':'negotiation','보급':'supply','격려':'inspire'
};
function officerSkillDefinition(skill){if(!skill)return null;if(OFFICER_SKILL_DEFS[skill])return OFFICER_SKILL_DEFS[skill];const id=OFFICER_SKILL_ALIAS[skill]||Object.keys(OFFICER_SKILL_DEFS).find(k=>OFFICER_SKILL_DEFS[k].name===skill);return id?OFFICER_SKILL_DEFS[id]:null}
function normalizeOfficerSkills(o){const ids=[];for(const raw of (o.skills||[])){const d=officerSkillDefinition(raw);if(d&&!ids.includes(d.id))ids.push(d.id)}const statOrder=[['leadership',['rapid_march','logistics','vanguard']],['war',['war_god','assault','cavalry_charge']],['intelligence',['strategy','spy_network','counter_spy']],['politics',['prosperity','engineering','tuntian']],['charisma',['charisma','talent_recruit','inspire']]].sort((a,b)=>o.stats[b[0]]-o.stats[a[0]]);for(const [,pool] of statOrder){for(const id of pool){if(ids.length>=3)break;if(!ids.includes(id))ids.push(id)}if(ids.length>=3)break}o.skills=ids.slice(0,3).map(id=>OFFICER_SKILL_DEFS[id].name);return o.skills}
function officerSkillEffect(o,effect){if(!o)return 0;let total=0;for(const s of (o.skills||[])){const d=officerSkillDefinition(s);if(d?.effect===effect)total+=Number(d.value)||0}return total}
function renderOfficerSkillBadges(o){return (o.skills||[]).slice(0,3).map(s=>{const d=officerSkillDefinition(s);return `<span title="${d?.category||'특성'} · ${d?.description||''}">${d?.name||s}</span>`}).join('')||'<span>없음</span>'}

const FACTION_TRAIT_DEFS={
 '고구려':[{id:'mounted_people',name:'기마민족',description:'공격 전력 +6%',effect:'attackPct',value:.06},{id:'mountain_fortress',name:'산성왕국',description:'산악 수비 +12%',effect:'mountainDefensePct',value:.12}],
 '백제':[{id:'maritime_trade',name:'해상교역',description:'턴 수입 +10%',effect:'incomePct',value:.10},{id:'diplomatic_state',name:'외교국가',description:'등용/회유 성공률 +8%',effect:'recruitSchemePct',value:.08}],
 '신라':[{id:'hwarang',name:'화랑',description:'공격 전력 +5%',effect:'attackPct',value:.05},{id:'unity',name:'결속',description:'사기 회복 +12%',effect:'moraleRecoveryPct',value:.12}],
 '가야':[{id:'iron_league',name:'철기연맹',description:'공격 전력 +4%',effect:'attackPct',value:.04},{id:'craft_network',name:'공방연맹',description:'건설 비용 -8%',effect:'buildDiscountPct',value:.08}],
 '유연':[{id:'steppe_mobility',name:'초원의 기동',description:'공격 전력 +6%',effect:'attackPct',value:.06},{id:'nomad_muster',name:'유목 동원',description:'징집 효율 +8%',effect:'recruitPct',value:.08}],
 '거란':[{id:'raider',name:'기습기동',description:'기습 전력 +10%',effect:'surprisePct',value:.10},{id:'pastoral',name:'목축동원',description:'징집 효율 +6%',effect:'recruitPct',value:.06}],
 '부여':[{id:'royal_line',name:'북방왕통',description:'등용/회유 +5%',effect:'recruitSchemePct',value:.05},{id:'northern_cavalry',name:'북방기마',description:'공격 전력 +4%',effect:'attackPct',value:.04}],
 '읍루':[{id:'hunter_guard',name:'수렵민',description:'수비 전력 +6%',effect:'defensePct',value:.06},{id:'scouts',name:'척후망',description:'첩보 성공률 +7%',effect:'espionagePct',value:.07}],
 '북연':[{id:'liaodong_trade',name:'요동교역',description:'턴 수입 +8%',effect:'incomePct',value:.08},{id:'fortification',name:'성곽정비',description:'건설 비용 -5%',effect:'buildDiscountPct',value:.05}],
 '남연':[{id:'cavalry_clans',name:'기병명문',description:'공격 전력 +5%',effect:'attackPct',value:.05},{id:'local_elites',name:'호족정치',description:'턴 수입 +5%',effect:'incomePct',value:.05}],
 '동진':[{id:'jiangnan_economy',name:'강남경제',description:'턴 수입 +10%',effect:'incomePct',value:.10},{id:'civil_bureaucracy',name:'문치행정',description:'건설 비용 -7%',effect:'buildDiscountPct',value:.07}],
 '왜':[{id:'sea_mobility',name:'해상기동',description:'해상 공격 +8%',effect:'seaAttackPct',value:.08},{id:'war_muster',name:'군역동원',description:'징집 효율 +5%',effect:'recruitPct',value:.05}],
 '탐라':[{id:'island_trade',name:'도서교역',description:'턴 수입 +8%',effect:'incomePct',value:.08},{id:'island_defense',name:'섬방어',description:'수비 전력 +10%',effect:'defensePct',value:.10}],
 '우산':[{id:'sea_watch',name:'해상경계',description:'수비 전력 +8%',effect:'defensePct',value:.08},{id:'island_spies',name:'도서첩보',description:'첩보 성공률 +5%',effect:'espionagePct',value:.05}]
};
function factionTraits(k){return FACTION_TRAIT_DEFS[K[k]?.name]||[]}
function factionTraitEffect(k,effect,context={}){return factionTraits(k).reduce((sum,t)=>{if(t.effect!==effect)return sum;if(effect==='mountainDefensePct'&&context.territoryId!==undefined&&typeof terrainKind==='function'&&terrainKind(context.territoryId)!=='mountain')return sum;if(effect==='seaAttackPct'&&context.sourceId!==undefined&&context.targetId!==undefined&&!isSeaRoute(context.sourceId,context.targetId))return sum;return sum+(Number(t.value)||0)},0)}
function strategyFactionTraitText(k){const list=factionTraits(k);return list.length?'국가 특성 · '+list.map(t=>`${t.name}(${t.description})`).join(' · '):'국가 특성 없음'}
K.forEach((n,k)=>{n.strategyTraits=factionTraits(k).map(t=>t.id);if(n.aiEspionageLastTurn===undefined)n.aiEspionageLastTurn=-999});

function ensureOfficerStrategyData(){for(const o of OFFICERS){if(!o._strategyInitial)o._strategyInitial={loyalty:o.loyalty,status:o.status,skills:[...(o.skills||[])]};normalizeOfficerSkills(o);if(!OFFICER_ASSIGNMENTS[o.assignment])o.assignment=defaultOfficerAssignment(o);if(o.morale===undefined)o.morale=100}}
ensureOfficerStrategyData();
const BASE_resetOfficerAssignments=resetOfficerAssignments;
resetOfficerAssignments=function(){BASE_resetOfficerAssignments();for(const o of OFFICERS){if(o._strategyInitial){o.loyalty=o._strategyInitial.loyalty;o.status=o._strategyInitial.status;o.skills=[...o._strategyInitial.skills]}normalizeOfficerSkills(o);o.assignment=defaultOfficerAssignment(o);o.morale=100}rebuildOfficerTerritoryIndex();rebuildOfficerTerritoryState()};

// Role-aware officer selection: placement and assignment now matter.
territoryCommander=function(territoryId){const i=Number(territoryId),active=activeExpeditionOfficerId?OFFICER_BY_ID.get(String(activeExpeditionOfficerId)):null;if(active&&active.territoryId===i&&officerCanCommand(active))return active;return bestOfficerForAssignment(i,'command')||bestOfficerForAssignment(i,'combat')||([governorForTerritory(i),...officersInTerritory(i)].find(officerCanCommand)||null)};
officerMaxTroops=function(officer){if(!officer)return Infinity;const c=GAME_BALANCE.officer.leadership,skill=officerSkillEffect(officer,'troopLimitPct'),role=officer.assignment==='command'?.06:0;return Math.max(1,Math.floor((c.baseTroops+officer.stats.leadership*c.perPoint)*(1+skill+role)))};
officerPowerMultiplier=function(i){const o=territoryCommander(i);if(!o)return 1;const role=o.assignment==='combat'?.05:0;return 1+o.stats.war*GAME_BALANCE.officer.power.attackPerPoint+role};
governorPolitics=function(i){return territoryAdministrator(i)?.stats.politics||0};
politicsIncomeMultiplier=function(i){const o=territoryAdministrator(i),p=o?.stats.politics||0;return 1+p*GAME_BALANCE.officer.politics.incomePerPoint+officerSkillEffect(o,'incomePct')};
politicsRecruitMultiplier=function(i){const admin=territoryAdministrator(i),recruiter=territoryRecruiter(i),p=admin?.stats.politics||0,c=recruiter?.stats.charisma||0;return 1+p*GAME_BALANCE.officer.politics.recruitPerPoint+c*GAME_BALANCE.officer.charisma.recruitPerPoint+officerSkillEffect(recruiter,'recruitPct')+officerSkillEffect(admin,'agriculturePct')};

function ensureRegionStrategyState(i){const r=regions?.[Number(i)];if(!r)return null;if(!Number.isFinite(r.cityLevel))r.cityLevel=r.cityType&&r.cityType!=='normal'?1:0;if(!Number.isFinite(r.stability))r.stability=100;if(!r.strategyState)r.strategyState={counterIntelTurns:0,falseIntelTurns:0,falseIntelFactor:1,scoutUntil:0,scoutBy:null,lastScoutReport:null,disabledBuildings:{}};const s=r.strategyState;s.counterIntelTurns=Math.max(0,Math.floor(Number(s.counterIntelTurns)||0));s.falseIntelTurns=Math.max(0,Math.floor(Number(s.falseIntelTurns)||0));if(!s.disabledBuildings||typeof s.disabledBuildings!=='object')s.disabledBuildings={};return s}
function cityLevelOf(i){const r=regions?.[i];if(!r)return 0;ensureRegionStrategyState(i);return cityTypeOf(i)==='normal'?0:Math.max(1,Math.min(GAME_BALANCE.city.maxLevel,r.cityLevel||1))}
function cityLevelLabel(i){const level=cityLevelOf(i);return level?['','I','II','III'][level]||String(level):''}
function cityBonusFor(type,level){level=Math.max(0,Math.min(3,level||0));if(type==='agriculture')return GAME_BALANCE.city.agricultureRecruitBonus[level]||0;if(type==='commerce')return GAME_BALANCE.city.commerceIncomeBonus[level]||0;if(type==='military')return GAME_BALANCE.city.militaryDefenseBonus[level]||0;return 0}
cityRecruitMultiplier=function(i){const local=1+cityBonusFor('agriculture',cityTypeOf(i)==='agriculture'?cityLevelOf(i):0),owner=regions?.[i]?.owner;return local*capitalGrowthMultiplier(owner)};
cityIncomeMultiplier=function(i){const local=1+cityBonusFor('commerce',cityTypeOf(i)==='commerce'?cityLevelOf(i):0),owner=regions?.[i]?.owner;return local*capitalGrowthMultiplier(owner)};
cityDefenseMultiplier=function(i){return 1+cityBonusFor('military',cityTypeOf(i)==='military'?cityLevelOf(i):0)};
cityTypeBadge=function(i){const type=cityTypeOf(i),c=CITY_TYPES[type],lv=cityLevelLabel(i);return type==='normal'?'':`<div class="city-type-badge ${type}"><strong>${c.icon} ${c.label} ${lv}</strong><span>${Math.round(cityBonusFor(type,cityLevelOf(i))*100)}% 특화 효과</span></div>`};
cityEffectInfo=function(i){const type=cityTypeOf(i),c=CITY_TYPES[type];if(type==='normal')return'';const pct=Math.round(cityBonusFor(type,cityLevelOf(i))*100),effect=type==='agriculture'?`징집·보충 +${pct}%`:type==='commerce'?`턴 수입 +${pct}%`:`방어력 +${pct}%`;return `<p class="city-effect-line ${type}"><b>${c.icon} ${c.label} ${cityLevelLabel(i)} 효과</b> · ${effect}</p>`};

const CITY_SPECIAL_BUILDINGS={
 granary:{name:'곡창',cost:55,description:'징집 효율 +12%',icon:'穀',city:'agriculture',effect:'recruitPct',value:.12},
 irrigation:{name:'관개시설',cost:65,description:'턴 병력 보충 +2',icon:'水',city:'agriculture',effect:'troopGrowthFlat',value:2},
 agriTuntian:{name:'둔전',cost:75,description:'징집 +5% · 수입 +2금',icon:'田',city:'agriculture',effect:'agricultureMixed',value:.05},
 barracksVillage:{name:'병영촌',cost:80,description:'턴 병력 보충 +3',icon:'兵',city:'agriculture',effect:'troopGrowthFlat',value:3},
 relayStation:{name:'역참',cost:70,description:'최대 출병 병력 +10%',icon:'驛',city:'agriculture',effect:'troopLimitPct',value:.10},
 specialMarket:{name:'시장',cost:60,description:'턴 수입 +15%',icon:'市',city:'commerce',effect:'incomePct',value:.15},
 tradeOffice:{name:'교역소',cost:85,description:'턴 수입 +12%',icon:'商',city:'commerce',effect:'incomePct',value:.12},
 inn:{name:'객잔',cost:60,description:'등용/회유 성공률 +5%',icon:'客',city:'commerce',effect:'recruitSchemePct',value:.05},
 warehouse:{name:'창고',cost:70,description:'턴 수입 +3금',icon:'倉',city:'commerce',effect:'incomeFlat',value:3},
 mint:{name:'조폐소',cost:110,description:'턴 수입 +18%',icon:'錢',city:'commerce',effect:'incomePct',value:.18},
 trainingGround:{name:'훈련소',cost:75,description:'공격 전력 +5%',icon:'練',city:'military',effect:'attackPct',value:.05},
 armory:{name:'병기고',cost:90,description:'공격 전력 +6%',icon:'兵',city:'military',effect:'attackPct',value:.06},
 cityGate:{name:'성문',cost:80,description:'수비 전력 +10%',icon:'門',city:'military',effect:'defensePct',value:.10}
};
Object.assign(BUILDINGS,Object.fromEntries(Object.entries(CITY_SPECIAL_BUILDINGS).map(([k,v])=>[k,{name:v.name,cost:v.cost,description:v.description,icon:v.icon}])));
const CITY_SPECIAL_BUILDING_LISTS={agriculture:['granary','irrigation','agriTuntian','barracksVillage','relayStation'],commerce:['specialMarket','tradeOffice','inn','warehouse','mint'],military:['wall','watchtower','trainingGround','armory','cityGate']};
const BASE_cityBuildingBlocked=cityBuildingBlocked;
cityBuildingBlocked=function(i,type){const req=CITY_SPECIAL_BUILDINGS[type]?.city;if(req&&cityTypeOf(i)!==req)return true;return BASE_cityBuildingBlocked(i,type)};
function cityBuildingEffect(i,effect){const r=regions?.[i];if(!r)return 0;let total=0;for(const [key,data] of Object.entries(CITY_SPECIAL_BUILDINGS)){if(data.effect===effect&&r.buildings?.[key]&&buildingOperational(i,key))total+=Number(data.value)||0}return total}
function cityHasSpecialBuilding(i,key){return !!regions?.[i]?.buildings?.[key]&&buildingOperational(i,key)}
function buildingOperational(i,key){const s=ensureRegionStrategyState(i);return !!regions?.[i]?.buildings?.[key]&&!(s?.disabledBuildings?.[key]>0)}
function withDisabledBuildingsMasked(i,fn){const r=regions?.[i],s=ensureRegionStrategyState(i);if(!r||!s)return fn();const saved={};for(const [key,turns] of Object.entries(s.disabledBuildings)){if(turns>0&&r.buildings&&r.buildings[key]){saved[key]=r.buildings[key];r.buildings[key]=false}}try{return fn()}finally{for(const [key,v] of Object.entries(saved))r.buildings[key]=v}}

const BASE_buildingCost=buildingCost;
buildingCost=function(i,type){let cost=BASE_buildingCost(i,type);const admin=territoryAdministrator(i),politics=admin?.stats.politics||0,discount=Math.min(.35,politics*GAME_BALANCE.officer.politics.buildDiscountPerPoint+officerSkillEffect(admin,'buildDiscountPct')+factionTraitEffect(regions?.[i]?.owner,'buildDiscountPct',{territoryId:i}));return Math.max(1,Math.ceil(cost*(1-discount)))};
function constructionActionCost(i){const p=territoryAdministrator(i)?.stats.politics||0,skill=officerSkillEffect(territoryAdministrator(i),'buildDiscountPct');return Math.max(.6,Math.round((1-Math.min(.4,p*.003+skill*.5))*100)/100)}
const BASE_buildBuilding=buildBuilding;
buildBuilding=function(type){if(!playing||busy||selected===null||target!==null||actionMode!=='domestic'||regions[selected]?.owner!==player)return;const actionCost=constructionActionCost(selected);if(ap<1){notify('건설에 필요한 행동력이 부족합니다.');return}const before=gold;if(!performBuild(selected,type,player,1))return;ap=Math.round((ap-actionCost)*100)/100;const spent=Math.round((before-gold)*100)/100;log(type==='temple'?`${regions[selected].name} 사찰 사용 · 전쟁패널티 -1%`:`${regions[selected].name} · ${BUILDINGS[type].name} 건설 완료 · 정치 행정으로 행동 ${actionCost} 소비 · ${spent}금`);render()};

const BASE_renderBuildings=renderBuildings;
renderBuildings=function(i){let html=BASE_renderBuildings(i),s=ensureRegionStrategyState(i),disabled=Object.entries(s?.disabledBuildings||{}).filter(([,v])=>v>0);const type=cityTypeOf(i),special=type==='normal'?'':CITY_SPECIAL_BUILDING_LISTS[type].map(k=>BUILDINGS[k]?.name).filter(Boolean).join(' · ');const extra=`<div class="strategy-building-note">${special?`<b>${CITY_TYPES[type].icon} 특화 건물</b> · ${special}<br>`:''}${disabled.length?`<b>🔥 방화 피해</b> · ${disabled.map(([k,v])=>`${BUILDINGS[k]?.name||k} ${v}턴 비활성`).join(' · ')}`:''}</div>`;return html.replace('</section>',extra+'</section>')};


function capitalUpgradeCost(nextLevel,i=selected){const base=window.SAMGUK_CAPITAL_UPGRADE?.costForLevel?.(nextLevel)||({2:180,3:320,4:520,5:800}[Number(nextLevel)]||0);const mult=window.SAMGUK_RESOURCE_SYSTEM?.constructionCostMultiplier?.(i)||1;return Math.max(0,Math.ceil(base*mult))}
function renderCapitalUpgradeUI(i){
 const lv=capitalLevelOf(i);
 if(!isUpgradeableCapitalFor(i,player)){
  const home=capitalHomeFaction(i);
  return `<section class="capital-upgrade-panel"><div class="capital-upgrade-head"><span>🏯 수도증축</span><b>${regions[i]?.name||'수도'}</b></div><div class="capital-max">${home===null?'이 영토는 업그레이드 가능한 본국 수도가 아닙니다.':`${K[home]?.name||'원 세력'}의 본국 수도입니다.`}</div></section>`;
 }
 const next=Math.min(5,lv+1),baseCost=window.SAMGUK_CAPITAL_UPGRADE?.costForLevel?.(next)||capitalUpgradeCost(next,i),actualCost=capitalUpgradeCost(next,i),woodDiscount=actualCost<baseCost;
 const panel=window.SAMGUK_CAPITAL_UPGRADE?.renderUpgradePanel?.({territoryName:regions[i]?.name||'수도',level:lv,gold:gold+(baseCost-actualCost),actionPoints:ap});
 if(panel){const note=woodDiscount?' · 🌲 목재 -30%':'';return panel.replace(`비용 ${baseCost}금`,`비용 ${actualCost}금${note}`)}
 return `<section class="capital-upgrade-panel"><h3>수도증축 · Level ${lv}/5</h3><p>승급마다 최대 행동력 +1 · 모집량/세금 수입 ×1.30${woodDiscount?` · 🌲 목재 건설비 -30%`:''}</p></section>`;
}
function upgradeCapital(){
 if(!playing||busy||selected===null||!isActiveTerritory(selected)||!isUpgradeableCapitalFor(selected,player))return false;
 const current=capitalLevelOf(selected);
 if(current>=5){notify('수도는 이미 최고 단계입니다.');return false}
 if(ap<1){notify('수도 증축에는 행동 1이 필요합니다.');return false}
 const next=current+1,cost=capitalUpgradeCost(next,selected);
 if(gold<cost){notify(`수도 Level ${next} 증축에 ${cost}금이 필요합니다.`);return false}
 gold-=cost;K[player].gold=gold;ap=Math.max(0,ap-1);
 regions[selected].capitalLevel=next;K[player].capitalLevel=next;
 document.dispatchEvent(new CustomEvent('samguk:capital-upgraded',{detail:{territoryId:selected,owner:player,level:next,maxLevel:5,cost}}));
 const mult=capitalGrowthMultiplier(player);
 log(`🏯 ${regions[selected].name} 수도 Level ${next}/5 완성 · 최대 행동력 +1 · 국가 모집/수입 ×${mult.toFixed(2)}`);
 notify(`${regions[selected].name} 수도 Level ${next} 완성! 국가 전체가 강화되었습니다.`);
 actionMode='inspect';target=null;attackType=null;render();return true;
}

function cityUpgradeCost(i,nextLevel=1){const base=nextLevel<=1?GAME_BALANCE.city.specializeCost:nextLevel===2?GAME_BALANCE.city.level2Cost:GAME_BALANCE.city.level3Cost;const admin=territoryAdministrator(i),discount=Math.min(.2,(admin?.stats.politics||0)*.001+officerSkillEffect(admin,'buildDiscountPct')*.5),resourceMult=typeof resourceConstructionCostMultiplier==='function'?resourceConstructionCostMultiplier(i):1;return Math.max(1,Math.ceil(base*(1-discount)*resourceMult))}
function cityCanUpgrade(i){if(isCapital(i))return false;return cityTypeOf(i)==='normal'||cityLevelOf(i)<GAME_BALANCE.city.maxLevel}
renderCityUpgradeUI=function(i){const type=cityTypeOf(i),lv=cityLevelOf(i);if(type==='normal'){const cost=cityUpgradeCost(i,1);return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 하기</h3><p class="subtext">전문 도시 I로 성장시킵니다. 비용 ${cost}금 · 행동 1. 이후 II/III 단계 확장 가능.</p><div class="city-upgrade-grid">${[['agriculture','🌾 농업도시','징집량 +50%'],['commerce','💰 상업도시','턴 수입 +50%'],['military','🛡️ 군사도시','방어력 +50%']].map(([k,n,e])=>`<button class="city-upgrade-btn ${k}" data-city-type="${k}" ${gold<cost||ap<1?'disabled':''}><strong>${n} I</strong><small>${e}<br>${CITY_SPECIAL_BUILDING_LISTS[k].map(x=>BUILDINGS[x]?.name).join(' · ')}</small></button>`).join('')}</div></div>`}if(lv>=GAME_BALANCE.city.maxLevel)return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 완료</h3><p class="subtext">${CITY_TYPES[type].icon} ${CITY_TYPES[type].label} III · 최고 단계입니다.</p></div>`;const next=lv+1,cost=cityUpgradeCost(i,next),pct=Math.round(cityBonusFor(type,next)*100);return `<div class="city-upgrade-panel"><h3 class="mode-title">${CITY_TYPES[type].icon} ${CITY_TYPES[type].label} ${cityLevelLabel(i)} 확장</h3><p class="subtext">다음 단계 ${['','I','II','III'][next]} · 핵심 특화 효과 ${pct}% · 비용 ${cost}금 · 행동 1</p><button class="action city-upgrade-btn ${type}" data-city-type="${type}" ${gold<cost||ap<1?'disabled':''}>${CITY_TYPES[type].label} ${['','I','II','III'][next]}로 증축</button></div>`};
function upgradeCityForCountry(i,type,k){if(!isActiveTerritory(i)||isCapital(i)||regions[i]?.owner!==k||!CITY_TYPES[type]||type==='normal')return false;const current=cityTypeOf(i),lv=cityLevelOf(i),next=current==='normal'?1:lv+1;if(current!=='normal'&&current!==type||next>GAME_BALANCE.city.maxLevel)return false;const cost=cityUpgradeCost(i,next),funds=k===player?gold:K[k].gold;if(funds<cost)return false;if(k===player)gold-=cost;else K[k].gold-=cost;regions[i].cityType=type;regions[i].cityLevel=next;ensureRegionStrategyState(i);document.dispatchEvent(new CustomEvent('samguk:city-upgraded',{detail:{territoryId:i,cityType:type,level:next,maxLevel:GAME_BALANCE.city.maxLevel,owner:k,reachedMax:next>=GAME_BALANCE.city.maxLevel}}));return true}
upgradeCity=function(type){if(!playing||busy||selected===null||regions[selected]?.owner!==player||ap<1)return false;if(!cityCanUpgrade(selected)){notify('이미 최고 단계 전문 도시입니다.');return false}const next=cityTypeOf(selected)==='normal'?1:cityLevelOf(selected)+1,cost=cityUpgradeCost(selected,next);if(gold<cost){notify(`도시 증축에 ${cost}금이 필요합니다.`);return false}if(!upgradeCityForCountry(selected,type,player))return false;ap--;const c=CITY_TYPES[type];log(`${regions[selected].name} · ${c.icon} ${c.label} ${cityLevelLabel(selected)} 증축 완료`);notify(`${regions[selected].name}이(가) ${c.label} ${cityLevelLabel(selected)}(으)로 성장했습니다.`);actionMode='inspect';target=null;render();return true};
const BASE_setAction=setAction;
setAction=function(mode){
 if(mode==='capital'){
  if(busy||!playing||selected===null||!isActiveTerritory(selected)||regions[selected].owner!==player||!isUpgradeableCapitalFor(selected,player))return;
  if(capitalLevelOf(selected)>=5){notify('수도는 이미 최고 단계입니다.');return}
  actionMode='capital';target=null;attackType=null;render();return;
 }
 if(mode==='city'){
  if(busy||!playing||selected===null||!isActiveTerritory(selected)||regions[selected].owner!==player)return;
  if(isCapital(selected)){notify('수도는 일반 도시증축이 아닌 수도증축을 사용합니다.');return}
  if(!cityCanUpgrade(selected)){notify('이미 최고 단계 전문 도시입니다.');return}
  actionMode='city';target=null;attackType=null;render();return;
 }
 return BASE_setAction(mode)
};
renderActions=function(){
 const locked=selected!==null&&!!largeBattleAt(selected),capitalTerritory=selected!==null&&isCapital(selected),capital=capitalTerritory&&isUpgradeableCapitalFor(selected,player),capitalMax=capital&&capitalLevelOf(selected)>=5,cityMax=selected!==null&&!capitalTerritory&&!cityCanUpgrade(selected);
 const growthMode=capitalTerritory?'capital':'city',growthLabel=capitalTerritory?(capital?(capitalMax?'수도증축 MAX':'수도증축'):'수도증축 불가'):(cityMax?'도시증축 완료':'도시증축 하기');
 return `<div class="territory-actions" aria-label="영토 행동">${[['support','지원 보내기'],['attack','침략하기'],['domestic','내정하기(건설)'],[growthMode,growthLabel],['personnel','인사']].map(([mode,label])=>`<button data-mode="${mode}" aria-pressed="${actionMode===mode}" ${busy||!playing||(locked&&(mode==='support'||mode==='attack'))||(mode==='capital'&&(!capital||capitalMax))||(mode==='city'&&cityMax)?'disabled':''}>${label}</button>`).join('')}<button data-strategy-espionage-open="1" ${busy||!playing||locked?'disabled':''}>첩보 / 계략</button></div>`;
};

const BASE_troopGrowth=troopGrowth,BASE_recruitAmount=recruitAmount,BASE_territoryIncome=territoryIncome,BASE_defensePower=defensePower,BASE_defensePercent=defensePercent,BASE_attackPower=attackPower,BASE_tacticalAttackPower=tacticalAttackPower,BASE_prediction=prediction;
troopGrowth=function(i,commit=false){return withDisabledBuildingsMasked(i,()=>{let v=BASE_troopGrowth(i,commit),extra=cityBuildingEffect(i,'troopGrowthFlat'),pct=officerSkillEffect(territoryRecruiter(i),'troopGrowthPct')+factionTraitEffect(regions[i]?.owner,'recruitPct',{territoryId:i});if(cityHasSpecialBuilding(i,'agriTuntian')){extra+=1;pct+=.05}return Math.max(0,Math.round((v+extra)*(1+pct)))})};
recruitAmount=function(i,commit=false){return withDisabledBuildingsMasked(i,()=>{let v=BASE_recruitAmount(i,commit),pct=cityBuildingEffect(i,'recruitPct')+factionTraitEffect(regions[i]?.owner,'recruitPct',{territoryId:i});if(cityHasSpecialBuilding(i,'agriTuntian'))pct+=.05;return Math.max(0,Math.round(v*(1+pct)))})};
territoryIncome=function(i){return withDisabledBuildingsMasked(i,()=>{let v=BASE_territoryIncome(i),pct=cityBuildingEffect(i,'incomePct')+factionTraitEffect(regions[i]?.owner,'incomePct',{territoryId:i}),flat=cityBuildingEffect(i,'incomeFlat');if(cityHasSpecialBuilding(i,'agriTuntian'))flat+=2;return Math.round((v*(1+pct)+flat)*100)/100})};
attackPower=function(i,j){let v=BASE_attackPower(i,j),o=territoryCommander(i),pct=officerSkillEffect(o,'attackPct')+cityBuildingEffect(i,'attackPct')+factionTraitEffect(regions[i]?.owner,'attackPct',{sourceId:i,targetId:j})+factionTraitEffect(regions[i]?.owner,'seaAttackPct',{sourceId:i,targetId:j});return v*(1+pct)};
defensePower=function(i,attacker=null){let v=withDisabledBuildingsMasked(i,()=>BASE_defensePower(i,attacker)),o=defenseCommander(i),pct=officerSkillEffect(o,'defensePct')+cityBuildingEffect(i,'defensePct')+factionTraitEffect(regions[i]?.owner,'defensePct',{territoryId:i})+factionTraitEffect(regions[i]?.owner,'mountainDefensePct',{territoryId:i});return v*(1+pct)};
defensePercent=function(i,attacker=null){let v=withDisabledBuildingsMasked(i,()=>BASE_defensePercent(i,attacker)),type=cityTypeOf(i),lv=cityLevelOf(i);if(type==='military'&&lv>1)v+=Math.round((cityBonusFor('military',lv)-.5)*100);v+=Math.round((cityBuildingEffect(i,'defensePct')+factionTraitEffect(regions[i]?.owner,'defensePct',{territoryId:i})+factionTraitEffect(regions[i]?.owner,'mountainDefensePct',{territoryId:i}))*100);return v};
tacticalAttackPower=function(i,j,type='normal'){let v=withDisabledBuildingsMasked(j,()=>BASE_tacticalAttackPower(i,j,type));if(type==='surprise'){const atk=territoryStrategist(i)?.stats.intelligence||50,def=territoryStrategist(j)?.stats.intelligence||50,o=territoryCommander(i),extra=Math.max(-.08,Math.min(.12,(atk-def)*.001))+officerSkillEffect(o,'surprisePct')+factionTraitEffect(regions[i]?.owner,'surprisePct',{sourceId:i,targetId:j});if(!buildingOperational(j,'watchtower')&&!baekduBeaconProtects(j))v*=1+extra}return v};
prediction=function(i,j,type=attackType||'normal'){let def=tacticalDefensePower(j,i,type),owner=regions[i]?.owner;if(owner!==player){const perceived=aiPerceivedTroops(j,owner),actual=Math.max(1,regions[j]?.troops||1);def*=perceived/actual}return tacticalAttackPower(i,j,type)>def};

intellectSchemeChance=function(officer,targetId,type='fire'){const c=GAME_BALANCE.officer.intellect,target=territoryStrategist(targetId)||schemeTargetGovernor(targetId),resist=(target?.stats.intelligence||50)*c.resistPerPoint,skill=officerSkillEffect(officer,'schemePct')+(type==='fire'?officerSkillEffect(officer,'fireSchemePct'):0),defSkill=officerSkillEffect(target,'schemeDefensePct'),watch=buildingOperational(targetId,'watchtower')?.06:0,mod=type==='confusion'?.02:type==='falseReport'?.04:0;return clampNumber(c.baseChance+officer.stats.intelligence*c.perPoint+skill+mod-resist-defSkill-watch,c.min,c.max)};
recruitSchemeChance=function(officer,targetOfficer){const c=GAME_BALANCE.officer.charisma,morale=clampNumber(targetOfficer?.morale??100,0,100),loyalty=clampNumber(targetOfficer?.loyalty??80,0,100),skill=officerSkillEffect(officer,'recruitSchemePct'),faction=factionTraitEffect(officerOwner(officer),'recruitSchemePct',{territoryId:officer.territoryId}),inn=cityHasSpecialBuilding(officer.territoryId,'inn')?.05:0;return clampNumber(c.baseChance+officer.stats.charisma*c.perPoint+skill+faction+inn-(loyalty*c.loyaltyPenalty)+(100-morale)*c.moraleBonus,c.min,c.max)};

const ESPIONAGE_ACTIONS={
 scout:{code:'SPY_SCOUT',name:'정찰',icon:'👁️',description:'병력·장수·건물·방어력을 파악',modifier:.10,asset:'image_HVYpzu.png'},
 rumor:{code:'SPY_RUMOR',name:'유언비어',icon:'🗣️',description:'적 도시 사기와 안정도를 감소',modifier:0,asset:'image_zlI1-7.png'},
 supplyRaid:{code:'SPY_RAID',name:'병량고 습격',icon:'🔥',description:'적 병력과 국고 일부를 감소',modifier:-.04,asset:'image_VJrNXn.png'},
 arson:{code:'SPY_ARSON',name:'방화',icon:'🏚️',description:'적 건물 하나를 2턴간 비활성화',modifier:-.08,asset:'image_U5ZYX_.png'},
 discord:{code:'SPY_DISCORD',name:'이간계',icon:'💢',description:'적 장수의 충성도를 감소',modifier:-.03,asset:'image_smlfKO.png'},
 counterIntel:{code:'SPY_COUNTER',name:'반간계',icon:'🛡️',description:'3턴간 이 도시를 향한 적 첩보 성공률 감소',modifier:1,asset:'image_ZTBQhS.png'},
 falseIntel:{code:'SPY_FAKE_INFO',name:'거짓정보',icon:'📜',description:'AI가 해당 도시 병력을 잘못 판단하도록 교란',modifier:.02,asset:'image_OTJoMB.png'}
};
let strategyEspionageDraft=null;
function espionageOfficer(i){return territoryStrategist(i)||governorForTerritory(i)}
function espionageChance(officer,targetId,type){if(type==='counterIntel')return 1;const c=GAME_BALANCE.espionage,target=territoryStrategist(targetId)||schemeTargetGovernor(targetId),ts=ensureRegionStrategyState(targetId),skill=officerSkillEffect(officer,'espionagePct')+(type==='rumor'?officerSkillEffect(officer,'rumorSchemePct'):0),def=officerSkillEffect(target,'counterEspionagePct')+officerSkillEffect(target,'schemeDefensePct'),watch=buildingOperational(targetId,'watchtower')?c.watchtowerPenalty:0,counter=ts?.counterIntelTurns>0?c.counterIntelPenalty:0,faction=factionTraitEffect(officerOwner(officer),'espionagePct',{territoryId:officer.territoryId});return clampNumber(c.baseChance+officer.stats.intelligence*c.intelligenceRate-(target?.stats.intelligence||50)*c.defenseRate+skill+faction+(ESPIONAGE_ACTIONS[type]?.modifier||0)-def-watch-counter,c.min,c.max)}
function adjacentEspionageTargets(i){return (neighbors?.[i]||[]).filter(j=>isActiveTerritory(j)&&regions[j]?.owner!==regions[i]?.owner&&canAttack(regions[i].owner,regions[j].owner))}
function officerCanEspionage(o,isAI=false){if(!o||territoryCannotAct(o.territoryId)||normalizeOfficerStatus(o.status)!==OFFICER_STATUS.ACTIVE)return false;const c=GAME_BALANCE.espionage;if((o.turnState?.actionPoints??0)<c.officerActionCost||(o.turnState?.stamina??0)<c.staminaCost)return false;return isAI||ap>=c.globalActionCost}
function spendEspionageCost(o,isAI=false){const c=GAME_BALANCE.espionage;if(!isAI)ap=Math.max(0,Math.round((ap-c.globalActionCost)*100)/100);o.turnState.actionPoints=Math.max(0,(o.turnState.actionPoints||0)-c.officerActionCost);o.turnState.stamina=Math.max(0,(o.turnState.stamina||0)-c.staminaCost);o.turnState.acted=true}
function builtBuildingKeys(i){return Object.keys(regions[i]?.buildings||{}).filter(k=>regions[i].buildings[k]&&buildingOperational(i,k)&&k!=='temple')}
function executeEspionageAction(sourceId,targetId,type,officerId=null,isAI=false){sourceId=Number(sourceId);targetId=Number(targetId);const action=ESPIONAGE_ACTIONS[type],officer=officerId?OFFICER_BY_ID.get(String(officerId)):espionageOfficer(sourceId);if(!action||!officer||officer.territoryId!==sourceId||regions[sourceId]?.owner!==officerOwner(officer)||!officerCanEspionage(officer,isAI))return false;if(type!=='counterIntel'&&!adjacentEspionageTargets(sourceId).includes(targetId))return false;if(type==='counterIntel')targetId=sourceId;const chance=espionageChance(officer,targetId,type),success=type==='counterIntel'||Math.random()<chance;spendEspionageCost(officer,isAI);const s=ensureRegionStrategyState(targetId),fx=ensureTerritoryOfficerEffects(targetId);let result='';if(success){if(type==='scout'){const gov=governorForTerritory(targetId),buildings=Object.keys(regions[targetId].buildings||{}).filter(k=>regions[targetId].buildings[k]).map(k=>BUILDINGS[k]?.name||k);s.scoutUntil=turn+2;s.scoutBy=regions[sourceId].owner;window.SAMGUK_VISIBILITY?.scoutTerritory?.(targetId,2,{viewerFactionId:regions[sourceId].owner,mode:'SCOUTED'});s.lastScoutReport={troops:regions[targetId].troops,defense:defensePercent(targetId,sourceId),governor:gov?.name||'없음',officers:officersInTerritory(targetId).map(o=>o.name),buildings};result=`병력 ${regions[targetId].troops} · 방어 +${defensePercent(targetId,sourceId)}% · 태수 ${gov?.name||'없음'} · 건물 ${buildings.join('/')||'없음'}`}
 else if(type==='rumor'){fx.morale=clampNumber(fx.morale-18,0,100);regions[targetId].stability=clampNumber((regions[targetId].stability??100)-12,0,100);result='사기 -18 · 안정도 -12'}
 else if(type==='supplyRaid'){const loss=reduceTerritoryTroops(targetId,Math.max(2,Math.round(regions[targetId].troops*.10))),owner=regions[targetId].owner,goldLoss=15;if(owner===player)gold=Math.max(0,gold-goldLoss);else K[owner].gold=Math.max(0,(K[owner].gold||0)-goldLoss);result=`병력 -${loss} · 국고 -${goldLoss}`}
 else if(type==='arson'){const keys=builtBuildingKeys(targetId);if(keys.length){const key=keys[Math.floor(officerNoise(targetId,turn+officer.stats.intelligence)*keys.length)];s.disabledBuildings[key]=Math.max(s.disabledBuildings[key]||0,2);result=`${BUILDINGS[key]?.name||key} 2턴 비활성`}else{fx.morale=clampNumber(fx.morale-8,0,100);result='건물이 없어 사기 -8'}}
 else if(type==='discord'){const targets=[...officersInTerritory(targetId)].sort((a,b)=>b.loyalty-a.loyalty),victim=targets[0];if(victim){victim.loyalty=clampNumber(victim.loyalty-15,0,100);result=`${victim.name} 충성 -15`}else result='대상 장수 없음'}
 else if(type==='falseIntel'){s.falseIntelTurns=2;s.falseIntelFactor=officerNoise(targetId,turn+77)>.5?1.45:.58;result='2턴간 허위 병력 정보 유포'}
 else if(type==='counterIntel'){s.counterIntelTurns=Math.max(s.counterIntelTurns,3);result='3턴간 첩보 방어 강화'}}else result='적 첩보망에 간파됨';const msg=`${action.icon} ${officer.name} · ${action.name} ${success?'성공':'실패'}${type==='counterIntel'?'':` (${Math.round(chance*100)}%)`} · ${regions[targetId].name} · ${result}`;log(msg);if(!isAI||regions[targetId].owner===player)notify(msg);if(!isAI){ensureStrategyUI();const d=document.getElementById('strategyEspionageModal');if(d?.open)d.close();strategyEspionageDraft=null;render();openOfficerPanel(sourceId)}return success}
function aiPerceivedTroops(i,observerK){const s=ensureRegionStrategyState(i);if(s?.falseIntelTurns>0&&regions[i]?.owner!==observerK)return Math.max(1,Math.round(regions[i].troops*(s.falseIntelFactor||1)));return regions[i]?.troops||0}

function ensureStrategyUI(){if(!document.getElementById('strategyExpansionStyles')){const style=document.createElement('style');style.id='strategyExpansionStyles';style.textContent=`
.strategy-assignment-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.strategy-assignment-grid button{padding:7px 4px!important;min-width:0!important;border:1px solid #45545b!important;background:#10191e!important;color:#d8d0bd!important}.strategy-assignment-grid button[aria-pressed="true"]{border-color:#c69c4d!important;background:#2a2115!important;color:#f4d791!important}.strategy-assignment-grid b{display:block;font-size:16px}.strategy-assignment-grid span{display:block;font-size:10px;font-weight:700}.strategy-assignment-grid small{display:block;font-size:8px;line-height:1.25;color:#899590;margin-top:3px}.strategy-building-note{margin-top:8px;padding:8px 9px;border:1px solid #ffffff12;background:#ffffff06;border-radius:4px;font-size:10px;line-height:1.5;color:#b8c1bd}.strategy-faction-traits{color:#d0b774!important}#strategyEspionageModal{width:min(610px,calc(100vw - 30px));max-width:610px;border:1px solid #7e775c;border-radius:7px;background:#101a1f;color:#ece5d5;padding:0;box-shadow:0 24px 80px #000c}#strategyEspionageModal::backdrop{background:#071014b8}.strategy-espionage-wrap{padding:17px}.strategy-espionage-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #514d3b;padding-bottom:11px}.strategy-espionage-head h2{margin:2px 0;color:#e7d39e}.strategy-espionage-actions,.strategy-espionage-targets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.strategy-espionage-actions button,.strategy-espionage-targets button{text-align:left!important;padding:10px!important;border:1px solid #4c5758!important;background:#152126!important;color:#e5dfd1!important}.strategy-espionage-actions button[aria-pressed="true"]{border-color:#c39d54!important;background:#292116!important}.strategy-espionage-actions strong,.strategy-espionage-targets strong{display:block;color:#f0d596}.strategy-espionage-actions small,.strategy-espionage-targets small{display:block;color:#9ca8a4;margin-top:3px;line-height:1.35}.strategy-espionage-rate{float:right;color:#efc76e;font-weight:800}.strategy-scout-report{margin-top:10px;padding:9px;background:#0c1418;border:1px solid #3e494b;border-radius:4px;font-size:11px;line-height:1.55}@media(max-width:760px){.strategy-assignment-grid{grid-template-columns:repeat(2,1fr)}.strategy-espionage-actions,.strategy-espionage-targets{grid-template-columns:1fr}}`;document.head.appendChild(style)}if(!document.getElementById('strategyEspionageModal')){const d=document.createElement('dialog');d.id='strategyEspionageModal';d.className='strategy-espionage-cinematic-modal';d.innerHTML='<div id="strategyEspionageContent"></div>';document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-strategy-espionage-close]')){d.close();strategyEspionageDraft=null;return}const a=e.target.closest('[data-espionage-action]');if(a){strategyEspionageDraft={sourceId:Number(a.dataset.sourceId),type:a.dataset.espionageAction};renderEspionageModal(strategyEspionageDraft.sourceId,strategyEspionageDraft.type);return}const t=e.target.closest('[data-espionage-target]');if(t&&strategyEspionageDraft)executeEspionageAction(strategyEspionageDraft.sourceId,Number(t.dataset.espionageTarget),strategyEspionageDraft.type,strategyEspionageDraft.officerId||null,false)})}}
function renderEspionageModal(sourceId,type=null){ensureStrategyUI();const d=document.getElementById('strategyEspionageModal'),officer=espionageOfficer(sourceId),targets=adjacentEspionageTargets(sourceId);strategyEspionageDraft={sourceId,type,officerId:officer?.id||null};const actionButtons=Object.entries(ESPIONAGE_ACTIONS).map(([key,a])=>`<button class="strategy-espionage-action-slot" type="button" data-espionage-action="${key}" data-spy-code="${a.code}" data-source-id="${sourceId}" aria-pressed="${type===key}" style="--espionage-bg-image:url('${a.asset}')" ${!officer||!officerCanEspionage(officer,false)?'disabled':''}><span class="strategy-espionage-action-copy"><strong><span class="strategy-espionage-action-icon" aria-hidden="true">${a.icon}</span>${a.name}</strong><small>${a.description}</small></span><span class="strategy-espionage-action-sheen" aria-hidden="true"></span></button>`).join('');let targetHtml='';if(type){if(type==='counterIntel'){targetHtml=`<button type="button" data-espionage-target="${sourceId}"><strong>${regions[sourceId].name} · 반간계 설치</strong><small>성공 확정 · ${GAME_BALANCE.espionage.globalActionCost} 행동 / 스태미너 ${GAME_BALANCE.espionage.staminaCost}</small><span class="strategy-espionage-rate">100%</span></button>`}else targetHtml=targets.map(i=>`<button type="button" data-espionage-target="${i}"><strong>${regions[i].name}</strong><small>적 지장 ${territoryStrategist(i)?.name||'없음'} · 망루 ${buildingOperational(i,'watchtower')?'O':'X'} · 병력 ${regions[i].troops}</small><span class="strategy-espionage-rate">${Math.round(espionageChance(officer,i,type)*100)}%</span></button>`).join('')||'<p class="subtext">인접한 첩보 대상이 없습니다.</p>'}const scout=ensureRegionStrategyState(sourceId)?.lastScoutReport;document.getElementById('strategyEspionageContent').innerHTML=`<div class="strategy-espionage-wrap" style="--spy-faction-glow:${K[regions[sourceId]?.owner]?.color||'#d4af37'}"><div class="strategy-espionage-head"><div><div class="officer-panel-eyebrow">정보전 · ${regions[sourceId].name}</div><h2>첩보 / 계략</h2><p class="subtext">담당 지장: ${officer?.name||'없음'} · 지력 ${officer?.stats.intelligence??'-'} · 망루는 적 첩보 성공률을 감소시킵니다.</p></div><button class="officer-modal-close" data-strategy-espionage-close type="button">닫기</button></div><div class="strategy-espionage-actions">${actionButtons}</div>${type?`<h3 class="mode-title">${ESPIONAGE_ACTIONS[type].name} 대상</h3><div class="strategy-espionage-targets">${targetHtml}</div>`:''}${scout?`<div class="strategy-scout-report"><b>최근 정찰 기록</b><br>병력 ${scout.troops} · 방어 +${scout.defense}% · 태수 ${scout.governor}<br>장수 ${scout.officers.join(' · ')||'없음'}<br>건물 ${scout.buildings.join(' · ')||'없음'}</div>`:''}</div>`;if(!d.open)d.showModal()}
function openEspionageForSelected(){if(selected===null||regions[selected]?.owner!==player){notify('아군 영토를 선택해야 합니다.');return}const officer=espionageOfficer(selected);if(!officer){notify('이 영토에 첩보를 담당할 장수가 없습니다.');return}renderEspionageModal(selected,null)}

function tickStrategyEffects(){for(let i=0;i<regions.length;i++){if(!isActiveTerritory(i))continue;const r=regions[i],s=ensureRegionStrategyState(i),recruiter=territoryRecruiter(i),moraleFx=ensureTerritoryOfficerEffects(i);for(const key of Object.keys(s.disabledBuildings)){s.disabledBuildings[key]=Math.max(0,(s.disabledBuildings[key]||0)-1);if(!s.disabledBuildings[key])delete s.disabledBuildings[key]}s.counterIntelTurns=Math.max(0,s.counterIntelTurns-1);s.falseIntelTurns=Math.max(0,s.falseIntelTurns-1);r.stability=Math.min(100,(r.stability??100)+2);const char=recruiter?.stats.charisma||0,recovery=Math.round(2+char*.03+(officerSkillEffect(recruiter,'moraleRecoveryPct')+factionTraitEffect(r.owner,'moraleRecoveryPct',{territoryId:i}))*10);moraleFx.morale=Math.min(100,moraleFx.morale+recovery);if(recruiter&&char>=75){for(const o of officersInTerritory(i))o.loyalty=clampNumber(o.loyalty+Math.max(0,Math.floor((char-70)/20)),0,100)}}}
const BASE_tickOfficerGameplayEffects=tickOfficerGameplayEffects;
tickOfficerGameplayEffects=function(){BASE_tickOfficerGameplayEffects();tickStrategyEffects()};

function aiChooseGovernorForTerritory(i){const list=officersInTerritory(i);if(!list.length)return null;const type=cityTypeOf(i),front=(neighbors[i]||[]).some(j=>regions[j]?.owner!==regions[i]?.owner);const score=o=>front||type==='military'?o.stats.leadership*.42+o.stats.war*.38+o.stats.intelligence*.1+o.loyalty*.1:type==='commerce'?o.stats.politics*.50+o.stats.intelligence*.22+o.stats.charisma*.18+o.loyalty*.1:type==='agriculture'?o.stats.politics*.38+o.stats.charisma*.36+o.stats.leadership*.16+o.loyalty*.1:o.stats.politics*.34+o.stats.intelligence*.25+o.stats.leadership*.2+o.stats.charisma*.11+o.loyalty*.1;return [...list].sort((a,b)=>score(b)-score(a))[0]}
function aiAssignOfficerRoles(k){const own=regions.map((r,i)=>isActiveTerritory(i)&&r.owner===k?i:-1).filter(i=>i>=0);for(const i of own){const list=officersInTerritory(i);for(const o of list)o.assignment=defaultOfficerAssignment(o);const gov=aiChooseGovernorForTerritory(i);if(gov)setTerritoryGovernor(i,gov.id)}}
function aiCityType(i,k){const front=(neighbors[i]||[]).some(j=>regions[j]?.owner!==k);if(front)return'military';if(regions[i].troops<35)return'agriculture';if(COASTAL?.has?.(i)||regions[i].resources?.includes('gold'))return'commerce';return territoryAdministrator(i)?.stats.charisma>territoryAdministrator(i)?.stats.politics?'agriculture':'commerce'}
function aiMaybeSpecializeCity(k){if(turn%GAME_BALANCE.ai.citySpecializationInterval!==k%GAME_BALANCE.ai.citySpecializationInterval)return false;const own=regions.map((r,i)=>isActiveTerritory(i)&&r.owner===k?i:-1).filter(i=>i>=0),candidates=own.filter(i=>!isCapital(i)&&(cityTypeOf(i)==='normal'||cityLevelOf(i)<GAME_BALANCE.city.maxLevel));for(const i of candidates.sort((a,b)=>((neighbors[b]||[]).some(j=>regions[j]?.owner!==k)?1:0)-((neighbors[a]||[]).some(j=>regions[j]?.owner!==k)?1:0))){const type=cityTypeOf(i)==='normal'?aiCityType(i,k):cityTypeOf(i),next=cityTypeOf(i)==='normal'?1:cityLevelOf(i)+1;if(K[k].gold>=cityUpgradeCost(i,next)&&upgradeCityForCountry(i,type,k)){log(`${K[k].name} · ${regions[i].name} ${CITY_TYPES[type].label} ${cityLevelLabel(i)} 증축`);return true}}return false}
const BASE_aiBuild=aiBuild;
aiBuild=function(k,budget){if(budget>=1){const own=regions.map((r,i)=>isActiveTerritory(i)&&r.owner===k?i:-1).filter(i=>i>=0);for(const i of own){const type=cityTypeOf(i),list=CITY_SPECIAL_BUILDING_LISTS[type]||[];for(const key of list){if(BUILDINGS[key]&&canBuildAt(i,key)&&K[k].gold>=buildingCost(i,key)&&performBuild(i,key,k,budget)){log(`${K[k].name} · ${regions[i].name}에 ${BUILDINGS[key].name} 건설`);return 1}}}}return BASE_aiBuild(k,budget)};
function aiTryEspionage(k){if(turn-(K[k].aiEspionageLastTurn??-999)<GAME_BALANCE.ai.espionageCooldown)return false;const officers=OFFICERS.filter(o=>officerOwner(o)===k&&o.assignment==='strategy'&&officerCanEspionage(o,true)&&adjacentEspionageTargets(o.territoryId).length).sort((a,b)=>b.stats.intelligence-a.stats.intelligence);const o=officers[0];if(!o)return false;const targets=adjacentEspionageTargets(o.territoryId),target=targets.sort((a,b)=>aiPerceivedTroops(b,k)-aiPerceivedTroops(a,k))[0];if(target===undefined)return false;const types=['scout','rumor','supplyRaid','discord','falseIntel'],type=types[(turn+k+o.territoryId)%types.length];K[k].aiEspionageLastTurn=turn;return executeEspionageAction(o.territoryId,target,type,o.id,true)}
const CORE_endTurn=endTurn; // compatibility alias: safe transactional endTurn already includes strategic AI

// Map current 30-skill pool and strategic data to the public debugging/API surface.
Object.assign(window.SAMGUK_OFFICERS||{}, {skillDefs:OFFICER_SKILL_DEFS,assignments:OFFICER_ASSIGNMENTS,setAssignment:setOfficerAssignment,factionTraits:FACTION_TRAIT_DEFS,espionageActions:ESPIONAGE_ACTIONS,espionageChance:(officerId,targetId,type)=>espionageChance(OFFICER_BY_ID.get(String(officerId)),Number(targetId),type),useEspionage:executeEspionageAction,citySpecialBuildings:CITY_SPECIAL_BUILDINGS,gameBalance:GAME_BALANCE});
window.SAMGUK_TURN_MANAGER={version:3,config:AI_PHASE_CONFIG,getState:()=>({processing:turnProcessing,stage:turnProcessingStage,turn,ap,gold,selected,target}),validate:()=>validateTurnState('manual'),endTurn:()=>endTurn(),runAiCountry:(k)=>runAiCountry(Number(k)),syncDiplomacyVisuals:()=>syncDiplomacyVisualsAfterAi()};
window.SAMGUK_STRATEGY={version:3,balance:GAME_BALANCE,skills:OFFICER_SKILL_DEFS,factionTraits:FACTION_TRAIT_DEFS,espionage:ESPIONAGE_ACTIONS,serialize(){return {version:3,officers:OFFICERS.map(o=>({id:o.id,territoryId:o.territoryId,loyalty:o.loyalty,assignment:o.assignment,skills:[...o.skills],status:o.status,woundedTurnsLeft:o.woundedTurnsLeft,woundedUntilTurn:o.woundedUntilTurn,capturedBy:o.capturedBy,originalFactionId:o.originalFactionId,previousTerritoryId:o.previousTerritoryId,captureTurn:o.captureTurn,preWoundStats:o.preWoundStats?{...o.preWoundStats}:null,temperament:o.temperament,friendIds:[...(o.friendIds||[])],familyIds:[...(o.familyIds||[])],stats:{...o.stats},age:o.age,salary:o.salary,title:o.title,traits:Array.isArray(o.traits)?o.traits.map(x=>typeof x==='object'?{...x}:x):[],portraitUrl:o.portraitUrl||null})),regions:regions.map((r,i)=>isActiveTerritory(i)?{id:i,cityType:r.cityType,cityLevel:cityLevelOf(i),stability:r.stability,strategyState:ensureRegionStrategyState(i)}:null)}},hydrate(data){if(!data||![1,2,3].includes(data.version))return false;for(const row of data.officers||[]){const o=OFFICER_BY_ID.get(String(row.id));if(!o)continue;if(Number.isInteger(row.territoryId)&&(isActiveTerritory(row.territoryId)||row.territoryId===-1))o.territoryId=row.territoryId;if(Number.isFinite(row.loyalty))o.loyalty=clampNumber(row.loyalty,0,100);if(OFFICER_ASSIGNMENTS[row.assignment])o.assignment=row.assignment;if(Array.isArray(row.skills))o.skills=row.skills.slice(0,3);if(row.status!==undefined)o.status=normalizeOfficerStatus(row.status);if(row.woundedTurnsLeft!==undefined)o.woundedTurnsLeft=Math.max(0,Number(row.woundedTurnsLeft)||0);if(row.woundedUntilTurn!==undefined)o.woundedUntilTurn=Number.isFinite(Number(row.woundedUntilTurn))?Number(row.woundedUntilTurn):null;if(row.capturedBy!==undefined)o.capturedBy=Number.isInteger(Number(row.capturedBy))?Number(row.capturedBy):null;if(row.originalFactionId!==undefined)o.originalFactionId=Number.isInteger(Number(row.originalFactionId))?Number(row.originalFactionId):null;if(row.previousTerritoryId!==undefined)o.previousTerritoryId=Number.isInteger(Number(row.previousTerritoryId))?Number(row.previousTerritoryId):null;if(row.captureTurn!==undefined)o.captureTurn=Number.isFinite(Number(row.captureTurn))?Number(row.captureTurn):null;if(row.preWoundStats!==undefined)o.preWoundStats=row.preWoundStats?{...row.preWoundStats}:null;if(row.temperament)o.temperament=String(row.temperament);if(Array.isArray(row.friendIds))o.friendIds=row.friendIds.map(String);if(Array.isArray(row.familyIds))o.familyIds=row.familyIds.map(String);if(row.stats&&typeof row.stats==='object'){o.stats=window.SAMGUK_CHARACTER_MODEL?.normalizeStats?.(row.stats)||{...o.stats,...row.stats};ensureOfficerStatCompatibility(o)}if(Number.isFinite(Number(row.age)))o.age=Math.max(16,Math.min(80,Math.round(Number(row.age))));if(row.salary!==undefined)normalizeOfficerSalary(o);if(row.title!==undefined)o.title=String(row.title||o.role||'장수');if(Array.isArray(row.traits))o.traits=row.traits.map(x=>typeof x==='string'?{name:x}:x).filter(Boolean);if(row.portraitUrl!==undefined)o.portraitUrl=row.portraitUrl?String(row.portraitUrl):null}rebuildOfficerIndexesPreserveGovernors();for(const row of data.regions||[]){if(!row||!isActiveTerritory(row.id)||!regions[row.id])continue;const r=regions[row.id];if(CITY_TYPES[row.cityType])r.cityType=row.cityType;if(Number.isFinite(row.cityLevel))r.cityLevel=row.cityLevel;if(Number.isFinite(row.stability))r.stability=row.stability;if(row.strategyState&&typeof row.strategyState==='object')r.strategyState=row.strategyState;ensureRegionStrategyState(row.id)}return true}};

ensureStrategyUI();
document.addEventListener('click',e=>{const assignment=e.target.closest('[data-officer-assignment]');if(assignment){e.preventDefault();setOfficerAssignment(assignment.dataset.officerId,assignment.dataset.officerAssignment);return}const spy=e.target.closest('[data-strategy-espionage-open]');if(spy){e.preventDefault();openEspionageForSelected()}});



// ============================================================================
// Total War-inspired Diplomacy UI (presentation-first, legacy-safe adapter)
// - Reuses the existing SVG world map and regions[] ownership data.
// - Does not rewrite map rendering or territory IDs.
// - Capture-phase button interception replaces only the diplomacy presentation.
// ============================================================================
const TW_DIPLOMACY_UI_STATE={open:false,targetFaction:null,relationFallback:{},treatiesFallback:{}};
const TW_DIPLOMACY_ACTIONS=[
 {id:'trade',icon:'商',name:'교역 협정',desc:'양국의 교역을 개방하고 관계를 개선합니다.',tone:'positive',goldCost:20,relation:10},
 {id:'nonaggression',icon:'和',name:'불가침 조약',desc:'상호 침공을 자제하는 협정을 제안합니다.',tone:'positive',goldCost:10,relation:14},
 {id:'alliance',icon:'盟',name:'동맹 제안',desc:'공동의 적에 맞서 군사 동맹을 제안합니다.',tone:'positive',goldCost:35,relation:18},
 {id:'tribute',icon:'貢',name:'공물 제안',desc:'국고를 사용해 상대국의 태도를 우호적으로 바꿉니다.',tone:'positive',goldCost:45,relation:22},
 {id:'demand',icon:'令',name:'요구 전달',desc:'영향력을 앞세워 양보를 요구합니다. 실패 시 관계가 악화됩니다.',tone:'negative',goldCost:0,relation:-8},
 {id:'threaten',icon:'威',name:'위압 / 협박',desc:'군사력을 과시해 상대를 압박합니다.',tone:'negative',goldCost:0,relation:-14}
];
function twDipPairKey(a,b){return [Number(a),Number(b)].sort((x,y)=>x-y).join(':')}
function twDipRelation(a,b){
 try{if(typeof getDiplomacyRelation==='function'){const v=Number(getDiplomacyRelation(a,b));if(Number.isFinite(v))return Math.max(-100,Math.min(100,v))}}catch(_e){}
 return Number(TW_DIPLOMACY_UI_STATE.relationFallback[twDipPairKey(a,b)]||0);
}
function twDipRelationLabel(v){return v>=65?'맹우':v>=30?'우호':v>=8?'친선':v<=-65?'숙적':v<=-30?'적대':v<=-8?'경계':'중립'}
function twDipTargetTerritories(k){const out=[];for(let i=0;i<regions.length;i++)if(isActiveTerritory(i)&&regions[i]?.owner===k)out.push(i);return out}
function twDipFactionPower(k){const lands=twDipTargetTerritories(k),troops=lands.reduce((n,i)=>n+(Number(regions[i]?.troops)||0),0),g=Number(K[k]?.gold)||0;return Math.round(lands.length*25+troops*1.15+g*.2)}
function twDipLeaderTitle(k){return `${K[k]?.name||'미상'} 군주`}
function ensureTotalWarDiplomacyStyles(){
 if(document.getElementById('twDiplomacyStyle'))return;
 const st=document.createElement('style');st.id='twDiplomacyStyle';st.textContent=`
 body.tw-diplomacy-map-focus #map [data-id]{opacity:.18;filter:saturate(.25) brightness(.48);transition:opacity .22s ease,filter .22s ease}
 body.tw-diplomacy-map-focus #map [data-id].tw-dip-target{opacity:1;filter:saturate(1.18) brightness(1.16) drop-shadow(0 0 2.5px #f9db7c) drop-shadow(0 0 7px #d8a83f)}
 body.tw-diplomacy-map-focus #map [data-id].tw-dip-player{opacity:.72;filter:saturate(.9) brightness(.82) drop-shadow(0 0 2px #75d5cb)}
 #twDiplomacyOverlay{position:fixed;inset:0;z-index:3500;display:none;color:#efe7d4;font-family:inherit;pointer-events:none}
 #twDiplomacyOverlay.open{display:block}
 #twDiplomacyOverlay .tw-dip-vignette{position:absolute;inset:0;background:radial-gradient(circle at 50% 44%,rgba(10,13,12,.08) 0 24%,rgba(6,9,9,.52) 60%,rgba(0,0,0,.78) 100%);backdrop-filter:brightness(.78) saturate(.78);pointer-events:auto}
 #twDiplomacyOverlay .tw-dip-shell{position:absolute;inset:54px 46px 34px;display:grid;grid-template-columns:minmax(210px,280px) minmax(430px,1fr) minmax(210px,280px);grid-template-rows:auto 1fr auto;gap:16px;pointer-events:none}
 .tw-dip-topbar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid #9b8249;background:linear-gradient(180deg,rgba(37,31,22,.96),rgba(13,17,17,.92));box-shadow:0 0 0 1px #211c13 inset,0 7px 24px #0009;pointer-events:auto}
 .tw-dip-title{display:flex;align-items:center;gap:11px}.tw-dip-title b{font-size:18px;color:#ead596;letter-spacing:.06em}.tw-dip-title small{color:#8ea6a0}
 .tw-dip-close{border:1px solid #806d43!important;background:#171713!important;color:#e7d8ad!important;padding:7px 11px!important}
 .tw-dip-side{position:relative;align-self:stretch;display:flex;flex-direction:column;justify-content:flex-end;padding:18px 12px 20px;border:1px solid #6e6040;background:linear-gradient(180deg,rgba(18,23,22,.35),rgba(17,17,14,.92));box-shadow:inset 0 0 48px #000a,0 10px 34px #0008;overflow:hidden;pointer-events:auto}
 .tw-dip-side::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 26%,var(--faction-glow,#b99a52) 0,transparent 42%);opacity:.16}
 .tw-dip-ruler-sigil{position:relative;margin:auto auto 16px;width:128px;height:168px;border-radius:64px 64px 20px 20px;border:1px solid #9d8751;background:linear-gradient(160deg,#202725 0%,#111512 58%,#5c4724 140%);display:grid;place-items:center;font-family:serif;font-size:68px;font-weight:900;color:#f3df9d;text-shadow:0 0 14px var(--faction-glow,#d4af37);box-shadow:inset 0 0 32px #000,0 0 18px color-mix(in srgb,var(--faction-glow,#d4af37) 35%,transparent)}
 .tw-dip-side h3{position:relative;margin:0;text-align:center;color:#f2dfa7;font-size:20px}.tw-dip-side p{position:relative;margin:5px 0 0;text-align:center;color:#98aaa4;font-size:11px;line-height:1.5}
 .tw-dip-center{align-self:end;display:flex;flex-direction:column;gap:10px;pointer-events:auto}
 .tw-dip-faction-strip{display:flex;gap:7px;overflow:auto;padding:7px;border:1px solid #665b3e;background:#111816e8;scrollbar-width:thin}
 .tw-dip-faction{flex:0 0 auto;min-width:92px;padding:7px 9px!important;border:1px solid #394540!important;background:#151c1a!important;color:#cdd6d0!important;text-align:left!important}.tw-dip-faction.active{border-color:#d4af37!important;background:#302817!important;color:#ffe9a0!important;box-shadow:0 0 10px #d4af3748}
 .tw-dip-faction strong{display:block}.tw-dip-faction small{display:block;color:#87978f;font-size:9px;margin-top:2px}
 .tw-dip-panel{border:1px solid #8d7746;background:linear-gradient(180deg,rgba(27,30,25,.96),rgba(10,14,13,.97));box-shadow:inset 0 0 0 1px #251f15,0 0 24px #000b;padding:13px}
 .tw-dip-relation{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:8px 9px;margin-bottom:10px;border-bottom:1px solid #51472f}.tw-dip-relation strong{color:#e9d59a}.tw-dip-relation b{font-size:18px;color:#69d5cb}.tw-dip-relbar{height:5px;background:#252c29;margin-top:5px;overflow:hidden}.tw-dip-relbar i{display:block;height:100%;background:linear-gradient(90deg,#a64d44,#d8b64f,#54b8ac)}
 .tw-dip-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.tw-dip-option{min-height:74px;padding:9px!important;text-align:left!important;border:1px solid #4d4a3c!important;background:#151916!important;color:#e2ddcf!important}.tw-dip-option:hover{border-color:#d4af37!important;background:#262015!important;box-shadow:0 0 12px #d4af3730}.tw-dip-option.negative:hover{border-color:#a65d4f!important}.tw-dip-option .ico{font-family:serif;color:#e2c36c;font-size:18px;margin-right:5px}.tw-dip-option strong{color:#f0dfae}.tw-dip-option small{display:block;margin-top:4px;color:#8f9e97;line-height:1.35}
 .tw-dip-mapnote{grid-column:1/-1;justify-self:center;padding:7px 13px;border:1px solid #5d563c;background:#0c1110dc;color:#b8c7c0;font-size:10px;pointer-events:none}
 @media(max-width:980px){#twDiplomacyOverlay .tw-dip-shell{inset:45px 16px 18px;grid-template-columns:170px 1fr 170px}.tw-dip-ruler-sigil{width:96px;height:126px;font-size:50px}.tw-dip-options{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:720px){#twDiplomacyOverlay .tw-dip-shell{grid-template-columns:1fr;grid-template-rows:auto auto auto 1fr}.tw-dip-side{display:none}.tw-dip-center{grid-column:1}.tw-dip-options{grid-template-columns:1fr 1fr}.tw-dip-topbar{grid-column:1}.tw-dip-mapnote{grid-column:1}}
 `;document.head.appendChild(st);
}
function ensureTotalWarDiplomacyDOM(){
 ensureTotalWarDiplomacyStyles();if(document.getElementById('twDiplomacyOverlay'))return;
 const root=document.createElement('section');root.id='twDiplomacyOverlay';root.setAttribute('aria-hidden','true');root.innerHTML=`<div class="tw-dip-vignette" data-tw-dip-close></div><div class="tw-dip-shell"><header class="tw-dip-topbar"><div class="tw-dip-title"><span style="font-size:22px;color:#d4af37">◆</span><div><b>천하 외교</b><small> · 상대 국가를 선택하면 월드맵에서 해당 세력의 영지가 강조됩니다.</small></div></div><button type="button" class="tw-dip-close" data-tw-dip-close>닫기 ×</button></header><aside class="tw-dip-side tw-dip-player-side" id="twDipPlayerSide"></aside><main class="tw-dip-center"><div class="tw-dip-faction-strip" id="twDipFactionStrip"></div><div class="tw-dip-panel" id="twDipOptionsPanel"></div></main><aside class="tw-dip-side tw-dip-target-side" id="twDipTargetSide"></aside><div class="tw-dip-mapnote">지도 효과: 선택 국가 영지는 금빛 외곽선 · 아군은 옥빛 · 나머지 세력은 암전</div></div>`;document.body.appendChild(root);
 root.addEventListener('click',e=>{if(e.target.closest('[data-tw-dip-close]')){closeTotalWarDiplomacy();return}const f=e.target.closest('[data-tw-dip-faction]');if(f){selectTotalWarDiplomacyFaction(Number(f.dataset.twDipFaction));return}const a=e.target.closest('[data-tw-dip-action]');if(a)executeTotalWarDiplomacyAction(a.dataset.twDipAction)});
}
function twDipSideMarkup(k,side){const lands=twDipTargetTerritories(k),power=twDipFactionPower(k);return `<div class="tw-dip-ruler-sigil" style="--faction-glow:${K[k]?.color||'#d4af37'}">${K[k]?.symbol||K[k]?.name?.[0]||'王'}</div><h3>${twDipLeaderTitle(k)}</h3><p>${side==='player'?'나의 조정':'외교 상대'} · ${lands.length}개 영토<br>군사력 지표 ${power.toLocaleString()}</p>`}
function renderTotalWarDiplomacy(){
 const root=document.getElementById('twDiplomacyOverlay');if(!root)return;let t=TW_DIPLOMACY_UI_STATE.targetFaction;if(!Number.isInteger(t)||t===player||count(t)<=0)t=K.findIndex((_,i)=>i!==player&&count(i)>0&&isDiplomaticFaction(i));TW_DIPLOMACY_UI_STATE.targetFaction=t;
 document.getElementById('twDipPlayerSide').innerHTML=twDipSideMarkup(player,'player');document.getElementById('twDipTargetSide').innerHTML=t>=0?twDipSideMarkup(t,'target'):'<h3>외교 상대 없음</h3>';
 document.getElementById('twDipFactionStrip').innerHTML=K.map((k,i)=>i!==player&&count(i)>0&&isDiplomaticFaction(i)?`<button type="button" class="tw-dip-faction ${i===t?'active':''}" data-tw-dip-faction="${i}"><strong style="color:${i===t?'#ffe9a0':k.color}">${k.symbol} ${k.name}</strong><small>${count(i)}개 영토 · 관계 ${twDipRelationLabel(twDipRelation(player,i))}</small></button>`:'').join('');
 const rel=t>=0?twDipRelation(player,t):0,pct=Math.max(0,Math.min(100,(rel+100)/2));document.getElementById('twDipOptionsPanel').innerHTML=t<0?'<p>외교 가능한 국가가 없습니다.</p>':`<div class="tw-dip-relation"><div><strong>${K[player].name} ↔ ${K[t].name}</strong><div class="tw-dip-relbar"><i style="width:${pct}%"></i></div></div><b>${rel>0?'+':''}${rel} · ${twDipRelationLabel(rel)}</b></div><div class="tw-dip-options">${TW_DIPLOMACY_ACTIONS.map(a=>`<button type="button" class="tw-dip-option ${a.tone==='negative'?'negative':''}" data-tw-dip-action="${a.id}"><span class="ico">${a.icon}</span><strong>${a.name}</strong><small>${a.desc}${a.goldCost?` · ${a.goldCost}금`:''}</small></button>`).join('')}</div>`;applyTotalWarDiplomacyMapFocus();
}
function applyTotalWarDiplomacyMapFocus(){
 const t=TW_DIPLOMACY_UI_STATE.targetFaction;document.body.classList.toggle('tw-diplomacy-map-focus',TW_DIPLOMACY_UI_STATE.open);document.querySelectorAll('#map [data-id]').forEach(el=>{const id=Number(el.dataset.id),own=regions[id]?.owner;el.classList.toggle('tw-dip-target',TW_DIPLOMACY_UI_STATE.open&&own===t);el.classList.toggle('tw-dip-player',TW_DIPLOMACY_UI_STATE.open&&own===player)})
}
function selectTotalWarDiplomacyFaction(k){if(k===player||count(k)<=0||!isDiplomaticFaction(k))return;TW_DIPLOMACY_UI_STATE.targetFaction=k;renderTotalWarDiplomacy()}
function openTotalWarDiplomacy(){if(busy||!playing)return;ensureTotalWarDiplomacyDOM();const legacy=document.getElementById('diplomacyDialog');if(legacy?.open)legacy.close();TW_DIPLOMACY_UI_STATE.open=true;const root=document.getElementById('twDiplomacyOverlay');root.classList.add('open');root.setAttribute('aria-hidden','false');renderTotalWarDiplomacy()}
function closeTotalWarDiplomacy(){TW_DIPLOMACY_UI_STATE.open=false;const root=document.getElementById('twDiplomacyOverlay');if(root){root.classList.remove('open');root.setAttribute('aria-hidden','true')}document.body.classList.remove('tw-diplomacy-map-focus');document.querySelectorAll('#map .tw-dip-target,#map .tw-dip-player').forEach(el=>el.classList.remove('tw-dip-target','tw-dip-player'))}
function executeTotalWarDiplomacyAction(id){
 const a=TW_DIPLOMACY_ACTIONS.find(x=>x.id===id),t=TW_DIPLOMACY_UI_STATE.targetFaction;if(!a||!Number.isInteger(t)||t===player||!isDiplomaticFaction(t))return;if(busy){notify('다른 처리가 끝난 뒤 외교를 진행해 주세요.');return}if(ap<1){notify('외교 행동에는 행동력 1이 필요합니다.');return}if(a.goldCost&&gold<a.goldCost){notify(`국고가 부족합니다. (${a.goldCost}금 필요)`);return}
 let delegated=false;try{const hook=window.SAMGUK_DIPLOMACY_ADAPTER?.propose;if(typeof hook==='function'){delegated=hook({action:id,from:player,to:t,cost:a.goldCost})!==false}}catch(err){console.warn('[Diplomacy adapter]',err)}
 if(!delegated){ap=Math.max(0,ap-1);if(a.goldCost){gold=Math.max(0,gold-a.goldCost);K[player].gold=gold}const key=twDipPairKey(player,t),old=twDipRelation(player,t),powerDiff=twDipFactionPower(player)-twDipFactionPower(t),persuasion=Math.max(-8,Math.min(8,Math.round(powerDiff/90))),delta=a.relation+(a.tone==='negative'?Math.max(0,persuasion):Math.max(-3,persuasion));TW_DIPLOMACY_UI_STATE.relationFallback[key]=Math.max(-100,Math.min(100,old+delta));TW_DIPLOMACY_UI_STATE.treatiesFallback[key]=TW_DIPLOMACY_UI_STATE.treatiesFallback[key]||{};if(['trade','nonaggression','alliance'].includes(id)&&delta>0)TW_DIPLOMACY_UI_STATE.treatiesFallback[key][id]=true;if(id==='alliance'&&delta>0)window.SAMGUK_VISIBILITY?.updateAllianceVision?.(player,t,true);else window.SAMGUK_VISIBILITY?.refreshAll?.({forceOverlay:true});log(`🤝 ${K[t].name}에 ${a.name}을(를) 제안했습니다.`);notify(`${K[t].name}: ${a.name} 처리 완료`);render();renderTotalWarDiplomacy()}
}
function initTotalWarDiplomacyUI(){
 ensureTotalWarDiplomacyDOM();const btn=document.getElementById('diplomacyButton');if(btn&&!btn.dataset.twDiplomacyBound){btn.dataset.twDiplomacyBound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openTotalWarDiplomacy()},true)}document.addEventListener('keydown',e=>{if(e.key==='Escape'&&TW_DIPLOMACY_UI_STATE.open)closeTotalWarDiplomacy()});
}
window.SAMGUK_DIPLOMACY_UI={open:openTotalWarDiplomacy,close:closeTotalWarDiplomacy,selectFaction:selectTotalWarDiplomacyFaction,state:TW_DIPLOMACY_UI_STATE,actions:TW_DIPLOMACY_ACTIONS};


// =============================================================================
// v36 BUILDING & ECONOMY PATCH
// Data-driven building sheet + city III unlock gates + food/policy turn economy.
// =============================================================================
const BUILDING_SHEET=window.SAMGUK_BUILDING_DATA;
const BUILDING_UNLOCKS=window.SAMGUK_CITY_BUILDING_UNLOCKS;
const TURN_ECONOMY=window.SAMGUK_TURN_ECONOMY;
const BUILDING_KEYS_HIDDEN=new Set(['specialMarket']);
const BASE_BUILDING_ORDER=['village','market','barracks','talentOffice','university','temple'];
const CITY_BUILDING_ORDER={
 agriculture:['granary','irrigation','agriTuntian','relayStation','barracksVillage'],
 commerce:['tradeOffice','inn','warehouse','mint'],
 military:['trainingGround','armory','cityGate','wall','watchtower']
};

if(BUILDING_SHEET){
 for(const [key,def] of Object.entries(BUILDING_SHEET.BUILDINGS)){
  BUILDINGS[key]={name:def.name,cost:def.levels?.[0]?.cost||0,description:def.description||'',icon:def.icon||'建'};
 }
 delete CITY_SPECIAL_BUILDINGS.specialMarket;
 for(const key of ['granary','irrigation','agriTuntian','relayStation','barracksVillage','tradeOffice','inn','warehouse','mint','trainingGround','armory','cityGate']){
  const def=BUILDING_SHEET.getDefinition(key);if(!def)continue;
  const effects=def.effects||{},effectKey=Object.keys(effects).find(k=>typeof effects[k]==='number');
  CITY_SPECIAL_BUILDINGS[key]={name:def.name,cost:def.levels?.[0]?.cost||0,description:def.description,icon:def.icon,city:def.unlock?.cityType||def.category,effect:effectKey||'',value:effectKey?effects[effectKey]:0};
 }
 CITY_SPECIAL_BUILDING_LISTS.agriculture=[...CITY_BUILDING_ORDER.agriculture];
 CITY_SPECIAL_BUILDING_LISTS.commerce=[...CITY_BUILDING_ORDER.commerce];
 CITY_SPECIAL_BUILDING_LISTS.military=[...CITY_BUILDING_ORDER.military];
}

function currentGameYear(){return 400+Math.floor((turn-1)/8)}
function turnInYear(){return (turn-1)%8}
function currentSeasonIndex(){return Math.floor(turnInYear()/2)}
function currentSeasonName(){return ['봄','여름','가을','겨울'][currentSeasonIndex()]||'봄'}
function currentSeasonMultiplier(){return [1,3,1,0][currentSeasonIndex()]??1}
function countryFood(k){const n=K[k];if(!n)return 0;n.food=Math.max(0,Math.floor(Number(n.food)||0));return n.food}
function setCountryFood(k,v){if(K[k])K[k].food=Math.max(0,Math.floor(Number(v)||0));return countryFood(k)}
function countryPolicy(k){const n=K[k];if(!n)return 0;n.policyPoints=Math.max(0,Math.floor(Number(n.policyPoints)||0));return n.policyPoints}
function setCountryPolicy(k,v){if(K[k])K[k].policyPoints=Math.max(0,Math.floor(Number(v)||0));return countryPolicy(k)}
function countryGold(k){return k===player?gold:Math.max(0,Number(K[k]?.gold)||0)}
function setCountryGold(k,v){v=Math.max(0,Math.round((Number(v)||0)*100)/100);if(K[k])K[k].gold=v;if(k===player)gold=v;return v}
// [3] 국가 녹봉: 생존/소속 인물 중 군주 0금, 문관·무관·일반 장수 10금.
function factionSalaryUpkeep(k){let total=0;for(const o of OFFICERS){if(officerOwner(o)!==Number(k))continue;const status=normalizeOfficerStatus(o.status);if(status===OFFICER_STATUS.DEAD||status===OFFICER_STATUS.CAPTURED)continue;total+=normalizeOfficerSalary(o)}return total}
// [4] 국가 보유 병력의 10%를 매 턴 병량으로 소모한다.
function factionTroopTotalForFood(k){return regions.reduce((sum,r,i)=>sum+(isActiveTerritory(i)&&r.owner===Number(k)?Math.max(0,Math.floor(Number(r.troops)||0)):0),0)}
function handleCountryFoodShortage(k,detail={}){const shortage=Math.max(0,Math.floor(Number(detail.shortage)||0));if(!shortage)return 0;const total=Math.max(0,Math.floor(Number(detail.totalTroops)||factionTroopTotalForFood(k)));const payload={factionId:Number(k),shortage,totalTroops:total,turn,year:currentGameYear(),foodAfter:countryFood(k)};document.dispatchEvent(new CustomEvent('samguk:food-shortage',{detail:payload}));log(`🌾 ${K[k]?.name||'세력'} 병량 부족 · 필요량보다 ${shortage} 부족 (병력 ${total}명)`);if(Number(k)===player)notify(`병량이 부족합니다. 부족분 ${shortage} · 향후 사기/이탈 효과와 연동할 수 있습니다.`);return shortage}
function recruitFoodCost(i){return unitRecruitFoodCost('infantry',i)}
function seowonNationCount(k){return regions.reduce((n,r,i)=>n+(isActiveTerritory(i)&&r.owner===k&&BUILDING_SHEET?.buildingLevel(r,'university')>0?1:0),0)}
function buildingLevelAt(i,key){return BUILDING_SHEET?.buildingLevel(regions?.[i],key)??(regions?.[i]?.buildings?.[key]?1:0)}
function maxBuildingLevel(key){return BUILDING_SHEET?.getDefinition(key)?.maxLevel||1}
function buildingLockState(i,key){
 const r=regions?.[i],def=BUILDING_SHEET?.getDefinition(key);if(!r||!def)return {locked:false,reason:''};
 return BUILDING_UNLOCKS?.check({key,region:r,cityType:cityTypeOf(i),cityLevel:cityLevelOf(i),maxCityLevel:GAME_BALANCE.city.maxLevel,nationBuildingCount:def.nationLimit?seowonNationCount(r.owner):0})||{locked:false,reason:''};
}

cityBuildingBlocked=function(i,type){return !!buildingLockState(i,type).locked};

buildingCost=function(i,type){
 const def=BUILDING_SHEET?.getDefinition(type),r=regions?.[i];let base;
 if(def){const next=BUILDING_SHEET.nextLevel(r,type),row=BUILDING_SHEET.getLevelData(type,next);base=Number(row?.cost)||0}
 else base=Number(UNIQUE_BUILDINGS[type]?.cost??BUILDINGS[type]?.cost)||0;
 if(isCapital(i))base*=.5;
 const admin=territoryAdministrator(i),politics=admin?.stats.politics||0,discount=Math.min(.35,politics*GAME_BALANCE.officer.politics.buildDiscountPerPoint+officerSkillEffect(admin,'buildDiscountPct')+factionTraitEffect(regions?.[i]?.owner,'buildDiscountPct',{territoryId:i}));
 const resourceMult=typeof resourceConstructionCostMultiplier==='function'?resourceConstructionCostMultiplier(i):1;
 return Math.max(1,Math.ceil(base*(1-discount)*resourceMult));
};

canBuildAt=function(i,type){
 const r=regions?.[i];if(!isActiveTerritory(i)||!r||!Object.hasOwn(BUILDINGS,type)||!uniqueBuildAllowed(i,type))return false;
 const def=BUILDING_SHEET?.getDefinition(type);if(!def)return !r.buildings?.[type];
 const level=buildingLevelAt(i,type);if(level>=def.maxLevel)return false;
 if(buildingLockState(i,type).locked)return false;
 return true;
};

performBuild=function(i,type,k,actions){
 if(actions<1||regions[i]?.owner!==k||!canBuildAt(i,type))return false;
 const cost=buildingCost(i,type),funds=countryGold(k);if(funds<cost)return false;setCountryGold(k,funds-cost);
 const def=BUILDING_SHEET?.getDefinition(type);
 if(def){
  const current=buildingLevelAt(i,type),next=Math.min(def.maxLevel,current+1);
  regions[i].buildings[type]=def.maxLevel>1?next:true;
  if(type==='university'&&next===def.maxLevel)log(`📚 ${K[k].name} · ${regions[i].name} 서원 III 완성 · 다음 턴부터 행동력 +1`);
 }else regions[i].buildings[type]=true;
 return true;
};

buildBuilding=function(type){
 if(!playing||busy||selected===null||target!==null||actionMode!=='domestic'||regions[selected]?.owner!==player)return;
 const actionCost=constructionActionCost(selected);if(ap<1){notify('건설에 필요한 행동력이 부족합니다.');return}
 const before=gold,beforeLevel=buildingLevelAt(selected,type);if(!performBuild(selected,type,player,1)){const lock=buildingLockState(selected,type);if(lock.lock)notify(lock.reason);return}
 ap=Math.max(0,Math.round((ap-actionCost)*100)/100);const spent=Math.round((before-gold)*100)/100,afterLevel=buildingLevelAt(selected,type),name=BUILDINGS[type]?.name||type;
 log(`${regions[selected].name} · ${name}${maxBuildingLevel(type)>1?' '+afterLevel+'단계':''} 건설 완료 · 금 -${spent} · 행동 ${actionCost}`);render()
};

universityCount=function(k){
 const max=BUILDING_SHEET?.getDefinition('university')?.maxLevel||3;
 return regions.filter((r,i)=>isActiveTerritory(i)&&r.owner===k&&buildingLevelAt(i,'university')>=max&&buildingOperational(i,'university')).length;
};
actionLimit=function(k=player){return 3+universityCount(k)+(K[k].palaceLevel||0)};

// 마을은 이제 병력 직접 보충 대신 병량 경제를 담당한다.
troopGrowth=function(i,commit=false){return withDisabledBuildingsMasked(i,()=>{
 const base=drafted(i,3+(riverSupply(i)?1:0),commit);let extra=cityBuildingEffect(i,'troopGrowthFlat'),pct=officerSkillEffect(territoryRecruiter(i),'troopGrowthPct')+factionTraitEffect(regions[i]?.owner,'recruitPct',{territoryId:i});
 return Math.max(0,Math.round((base+extra)*(1+pct)*politicsRecruitMultiplier(i)));
})};

// 금 생산은 territoryIncome을 단일 진실 공급원으로 유지한다. 시장 +8 및 상업 특화 보너스 포함.
territoryIncome=function(i){return withDisabledBuildingsMasked(i,()=>{
 if(!isActiveTerritory(i)||!regions[i]||(regions[i].devastatedTurns||0)>0)return 0;
 const r=regions[i],market=BUILDING_SHEET?.levelProduction(r,'market')?.gold||0,base=8+market;
 let raw=base*(1+(nationHas(r.owner,'trade')&&COASTAL.has(i)?.25:0)+(r.buildings.tradePort?.2:0))*supplyFactor(i)*resourceTax(i);
 let v=raw*cityIncomeMultiplier(i)*politicsIncomeMultiplier(i),pct=cityBuildingEffect(i,'incomePct')+factionTraitEffect(r.owner,'incomePct',{territoryId:i}),flat=cityBuildingEffect(i,'incomeFlat');
 if(cityHasSpecialBuilding(i,'agriTuntian'))flat+=2;
 return Math.round((v*(1+pct)+flat)*100)/100;
})};

function buildingEconomyText(i,key,level){
 const def=BUILDING_SHEET?.getDefinition(key);if(!def)return '';
 const shown=Math.max(1,Math.min(def.maxLevel,level||1)),row=def.levels?.[shown-1]||{},p=row.production||{},u=row.upkeep||{},parts=[];
 if(p.gold)parts.push(`금 +${p.gold}/턴`);if(p.food)parts.push(`병량 +${p.food}/턴`);if(p.policy)parts.push(`국책 +${p.policy}/턴`);
 if(u.gold)parts.push(`금 -${u.gold}/턴`);if(u.food)parts.push(`병량 -${u.food}/턴`);
 return parts.length?parts.join(' · '):'';
}
function renderBuildingRowV36(i,key){
 const r=regions[i],b=BUILDINGS[key];if(!b)return'';const def=BUILDING_SHEET?.getDefinition(key),own=r.owner===player,level=buildingLevelAt(i,key),max=def?.maxLevel||1,full=level>=max,lock=buildingLockState(i,key),cost=full?0:buildingCost(i,key),next=Math.min(max,level+1),econ=buildingEconomyText(i,key,full?level:next),isUnique=!!UNIQUE_BUILDINGS[key],buttonClass=key==='temple'?'temple-building':isUnique?'unique-building':'';
 const lvText=max>1?` ${level}/${max}단계`:'';const production=econ?`<br><span class="${econ.includes('-')?'building-upkeep':'building-production'}">${econ}</span>`:'';const lockText=lock.lock?`<br><span class="building-lock-reason">🔒 ${lock.reason}</span>`:'';
 return `<div class="building-row ${level?'built':''} ${lock.lock&&!full?'city-restricted':''}"><span class="building-icon" aria-hidden="true">${b.icon}</span><div class="building-description"><strong>${b.name}${lvText}</strong><small>${b.description||''}${production}${lockText}</small></div>${full?`<span class="built-label">${max>1?'최대 단계':'건설됨'}</span>`:own?`<button class="${buttonClass}" data-building="${key}" ${busy||!playing||ap<1||gold<cost||lock.lock?'disabled':''} aria-label="${b.name} ${next}단계, ${cost}금, 행동 1">${cost}금<br><small>${lock.lock?'도시 제한':level?'업그레이드':'건설'}</small></button>`:`<span class="unbuilt-label">${lock.lock?'도시 제한':'미건설'}</span>`}</div>`;
}
renderBuildings=function(i){
 const r=regions[i],type=cityTypeOf(i),lv=cityLevelOf(i),unique=Object.keys(UNIQUE_BUILDINGS).filter(k=>r.buildings?.[k]||uniqueBuildAllowed(i,k));
 const primary=BASE_BUILDING_ORDER.map(k=>renderBuildingRowV36(i,k)).join('');
 const cityKeys=type==='normal'?[]:(CITY_BUILDING_ORDER[type]||[]),cityRows=cityKeys.map(k=>renderBuildingRowV36(i,k)).join('');
 const cityNote=type==='normal'?`<div class="economy-summary"><b>전문도시 성장</b><br>상업·군사·농업도시는 III에서 상위 건물이 해금됩니다. 항구도시는 해안 전용으로 수입과 병량 생산을 함께 강화합니다.</div>`:type==='port'?`<div class="economy-summary"><b>⚓ 항구도시 ${cityLevelLabel(i)}</b><br>해안 전용 · 턴 수입 +${Math.round(cityBonusFor('port',lv)*100)}% · 해당 영토 병량 생산 +${Math.round(portFoodBonusForLevel(lv)*100)}%</div>`:`<div class="economy-summary"><b>${CITY_TYPES[type].icon} ${CITY_TYPES[type].label} ${cityLevelLabel(i)}</b><br>${lv<GAME_BALANCE.city.maxLevel?'상위 건물은 III 완성 후 건설 가능':'상위 건물 해금 완료'}</div>`;
 const uniqueRows=unique.map(k=>renderBuildingRowV36(i,k)).join('');
 const preview=TURN_ECONOMY?.previewCountry?.(r.owner);const summary=preview?`<div class="economy-summary"><b>국가 턴 정산 예상</b><br>금 ${preview.grossGold.toFixed(1)} 생산 / ${preview.upkeepGold.toFixed(1)} 유지 <small>(녹봉 ${preview.salaryUpkeep||0})</small> · 병량 +${preview.foodProduction} / -${preview.upkeepFood} <small>(병력 ${preview.totalTroops||0}명 → ${preview.armyFoodUpkeep||0})</small> · 국책 +${preview.policyProduction}</div>`:'';
 return `<section class="buildings"><div class="section-title">영토 시설 <span>${isCapital(i)?'수도 · 건설비 50% 할인':'기초 경제 → 전문도시 III'}</span></div>${primary}${cityNote}${cityRows}${uniqueRows}${summary}<p class="subtext">건설·업그레이드는 행동 1을 사용합니다. 사찰은 모든 영지에 건설할 수 있으며 매 턴 전쟁 불만도를 1% 완화합니다.</p></section>`;
};

// 전문도시 상위 건물은 III 단계에서만 해금된다.
CITY_SPECIAL_BUILDING_LISTS.agriculture=[...CITY_BUILDING_ORDER.agriculture];
CITY_SPECIAL_BUILDING_LISTS.commerce=[...CITY_BUILDING_ORDER.commerce];
CITY_SPECIAL_BUILDING_LISTS.military=[...CITY_BUILDING_ORDER.military];

renderCityUpgradeUI=function(i){
 if(isPassTerritory(i))return `<div class="city-upgrade-panel"><h3 class="mode-title">관문 영토</h3><p class="subtext">산해관은 특수 관문 영토입니다.<br>건물·시설 건설 및 도시 증축 불가 · 수성 방어 +30%</p></div>`;
 const type=cityTypeOf(i),lv=cityLevelOf(i);
 if(type==='normal'){const cost=cityUpgradeCost(i,1);return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 하기</h3><p class="subtext">전문 도시 I로 성장시킵니다. 상위 건물은 해당 도시가 III 단계에 도달하면 해금됩니다. 비용 ${cost}금 · 행동 1.</p><div class="city-upgrade-grid">${[['agriculture','🌾 농업도시','곡창 · 관개시설 · 둔전 · 역참 · 병영촌'],['commerce','💰 상업도시','교역소 · 객잔 · 창고 · 조폐소'],['military','🛡️ 군사도시','훈련소 · 병기고 · 성문 · 성벽 · 망루']].map(([k,n,list])=>`<button class="city-upgrade-btn ${k}" data-city-type="${k}" ${gold<cost||ap<1?'disabled':''}><strong>${n} I</strong><small>III 완성 시 해금<br>${list}</small></button>`).join('')}</div></div>`}
 if(lv>=GAME_BALANCE.city.maxLevel)return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 완료</h3><p class="subtext">${CITY_TYPES[type].icon} ${CITY_TYPES[type].label} III · 상위 건물 해금 완료.</p></div>`;
 const next=lv+1,cost=cityUpgradeCost(i,next),pct=Math.round(cityBonusFor(type,next)*100);return `<div class="city-upgrade-panel"><h3 class="mode-title">${CITY_TYPES[type].icon} ${CITY_TYPES[type].label} ${cityLevelLabel(i)} 확장</h3><p class="subtext">다음 단계 ${['','I','II','III'][next]} · 핵심 특화 효과 ${pct}% · 비용 ${cost}금 · 행동 1<br>${next===GAME_BALANCE.city.maxLevel?'완성 즉시 상위 건물 해금':'상위 건물은 III에서 해금'}</p><button class="action city-upgrade-btn ${type}" data-city-type="${type}" ${gold<cost||ap<1?'disabled':''}>${CITY_TYPES[type].label} ${['','I','II','III'][next]}로 증축</button></div>`
};

function settleCountryEconomy(k){return TURN_ECONOMY?.settleCountry?.(k)||{grossGold:regions.reduce((sum,r,i)=>sum+(isActiveTerritory(i)&&r.owner===k?territoryIncome(i):0),0),upkeepGold:0,foodProduction:0,upkeepFood:0,policyProduction:0,temples:0}}
function applyAllTempleRelief(){let total=0;for(let k=0;k<K.length;k++)if(count(k)>0)total+=TURN_ECONOMY?.applyTempleRelief?.(k)||0;return total}
TURN_ECONOMY?.configureRuntime?.({
 getRegions:()=>regions,isActive:isActiveTerritory,territoryIncome,getTurn:()=>turn,
 getGold:countryGold,setGold:setCountryGold,getFood:countryFood,setFood:setCountryFood,getPolicy:countryPolicy,setPolicy:setCountryPolicy,
 getSalaryUpkeep:factionSalaryUpkeep,getTotalTroops:factionTroopTotalForFood,getArmyFoodUpkeepMultiplier:k=>typeof resourceArmyFoodUpkeepMultiplier==='function'?resourceArmyFoodUpkeepMultiplier(k):1,onFoodShortage:handleCountryFoodShortage,
 reduceWarPenalty:(k,amount)=>{if(typeof warTurns==='undefined')return 0;const before=Math.max(0,Number(warTurns[k])||0);warTurns[k]=Math.max(0,before-Math.max(0,Number(amount)||0));return before-warTurns[k]}
});

// 기본 모병은 병량을 실제 소비하여 금-병량-모병 루프를 완성한다.
recruit=function(){
 if(!playing||busy||ap<1||selected===null||!isActiveTerritory(selected)||actionMode!=='domestic'||regions[selected].owner!==player)return;
 const money=recruitmentCost(selected,20),foodCost=recruitFoodCost(selected);if(gold<money){notify('금이 부족합니다.');return}if(countryFood(player)<foodCost){notify(`병량이 부족합니다. (${foodCost} 필요)`);return}
 gold-=money;K[player].gold=gold;setCountryFood(player,countryFood(player)-foodCost);ap--;const amount=recruitAmount(selected,true);regions[selected].troops+=amount;log(`${regions[selected].name}에서 병력 ${amount}명 모집 · 금 -${money} · 병량 -${foodCost}`);render()
};

// AI 건설은 기존 우선순위를 유지하되 새 도시 잠금/서원 단계 규칙을 그대로 사용한다.
aiBuild=function(k,budget){
 const own=regions.map((r,i)=>isActiveTerritory(i)&&r.owner===k?i:-1).filter(i=>i>=0),preferred=['market','village','barracks','university','temple',...Object.keys(UNIQUE_BUILDINGS)];
 for(const i of own){for(const key of CITY_BUILDING_ORDER[cityTypeOf(i)]||[]){if(canBuildAt(i,key)&&countryGold(k)>=buildingCost(i,key)&&performBuild(i,key,k,budget)){log(`${K[k].name} · ${regions[i].name}에 ${BUILDINGS[key].name} 건설`);return 1}}}
 for(const key of preferred){const i=own.find(j=>canBuildAt(j,key)&&countryGold(k)>=buildingCost(j,key));if(i!==undefined&&performBuild(i,key,k,budget)){log(`${K[k].name} · ${regions[i].name}에 ${BUILDINGS[key].name} ${maxBuildingLevel(key)>1?buildingLevelAt(i,key)+'단계 ':''}건설`);return 1}}
 return 0;
};


// =============================================================================
// v37 PERSONNEL / GACHA PATCH
// Personnel submenu + nationwide list + recruitment-office gated weighted draw.
// =============================================================================
const PERSONNEL_SYSTEM=window.SAMGUK_PERSONNEL_SYSTEM;
const V37_setAction=setAction;
setAction=function(mode){
 if(mode==='personnel'){
  if(busy||!playing||selected===null||!isActiveTerritory(selected)||regions[selected]?.owner!==player)return;
  actionMode='personnel';target=null;attackType=null;render();return;
 }
 return V37_setAction(mode);
};
function renderPersonnelMenuV37(i){return PERSONNEL_SYSTEM?.renderSubmenu?.(i)||'<p class="subtext">인사 시스템을 불러올 수 없습니다.</p>'}
function addRecruitedOfficerV37(data){
 try{
  if(!data||!Number.isInteger(Number(data.territoryId))||regions[Number(data.territoryId)]?.owner!==player)return false;
  if(OFFICER_BY_ID.has(String(data.id)))return false;
  const officer=new Officer({...data,portraitVariant:Number(data.portraitVariant??(OFFICERS.length%6))});
  ensureOfficerStatCompatibility(officer);officer.assignment=defaultOfficerAssignment(officer);officer.morale=100;
  OFFICERS.push(officer);OFFICER_BY_ID.set(officer.id,officer);rebuildOfficerTerritoryIndex();rebuildOfficerTerritoryState();
  ensureOfficerStrategyData();refreshOfficerPanel();return true;
 }catch(err){console.error('[삼국쟁패][인사] 신규 인재 등록 오류',err);return false}
}
function handlePersonnelActionV37(action){
 if(action==='list'){PERSONNEL_SYSTEM?.openList?.();return}
 if(action==='search'){PERSONNEL_SYSTEM?.search?.(selected);return}
 if(action==='captives'){PERSONNEL_SYSTEM?.openCaptives?.();return}
}
PERSONNEL_SYSTEM?.configureRuntime?.({
 getPlayer:()=>player,
 getGold:()=>gold,
 setGold:v=>setCountryGold(player,v),
 getOfficers:()=>OFFICERS,
 getPlayerOfficers:()=>OFFICERS.filter(o=>officerOwner(o)===player),
 getPlayerFactionName:()=>K?.[player]?.name||'아군',
 getPlayerFactionColor:()=>K?.[player]?.color||'#caa85a',
 getCaptives:()=>captivesHeldBy(player),
 getCaptivePreview:o=>captivePreview(o,player),
 captiveAction:(id,action)=>handleCaptiveAction(id,action,player),
 getFactionName:k=>K?.[Number(k)]?.name||'무소속',
 renderOfficerPortrait:(officer,size)=>officerPortraitSvg(officer,size),
 officerOwner,
 getRegionName:i=>regions?.[Number(i)]?.name||WORLD.territories?.[Number(i)]?.name||'',
 hasRecruitOffice:i=>regions?.[Number(i)]?.owner===player&&buildingLevelAt(Number(i),'talentOffice')>0&&buildingOperational(Number(i),'talentOffice'),
 addOfficer:addRecruitedOfficerV37,
 notify,log,render,openOfficerDetail
});
window.SAMGUK_PERSONNEL={version:38,system:PERSONNEL_SYSTEM,addOfficer:addRecruitedOfficerV37,openList:()=>PERSONNEL_SYSTEM?.openList?.(),openCaptives:()=>PERSONNEL_SYSTEM?.openCaptives?.(),search:i=>PERSONNEL_SYSTEM?.search?.(i)};


// =============================================================================
// v74 AUTHORITY / PRESTIGE PATCH
// Four ranks only: 지방왕 -> 왕 -> 대왕 -> 황제.
// Derived bonuses are applied at read-time so rank-up never double-applies values.
// =============================================================================
const AUTHORITY_SYSTEM=window.SAMGUK_AUTHORITY;
AUTHORITY_SYSTEM?.configureRuntime?.({
 getFactions:()=>K,
 getPlayer:()=>player,
 getFactionName:k=>K?.[Number(k)]?.name||'',
 isAlive:k=>count(Number(k))>0,
 getRelation:(a,b)=>typeof relations!=='undefined'?(Number(relations?.[Number(a)]?.[Number(b)])||0):0,
 setRelation:(a,b,v)=>{
  if(typeof relations==='undefined'||!relations?.[Number(a)]||!relations?.[Number(b)])return false;
  const n=Math.max(-100,Math.min(100,Number(v)||0));relations[Number(a)][Number(b)]=n;relations[Number(b)][Number(a)]=n;return true;
 },
 log,notify
});

const V74_start=start;
start=function(){AUTHORITY_SYSTEM?.resetAll?.(K);return V74_start()};

const V74_setAction=setAction;
function openAuthorityPanelV76(event){
 if(event){try{event.preventDefault();event.stopPropagation()}catch(_e){}}
 if(busy||!playing||!Number.isInteger(player))return false;
 actionMode='authority';target=null;attackType=null;
 // The modal is independent from #orders, so a normal render can no longer erase it.
 render();
 const opened=AUTHORITY_SYSTEM?.openAuthorityModal?.(player);
 return opened?false:false;
}
window.openKingdomRankUI=openAuthorityPanelV76;

setAction=function(mode){
 if(mode==='authority'){openAuthorityPanelV76();return}
 return V74_setAction(mode);
};

const V74_renderActions=renderActions;
renderActions=function(){
 const base=V74_renderActions();
 const disabled=busy||!playing?' disabled':'';
 const button=`<button type="button" class="rank-tab-btn" id="kingRankBtn" data-mode="authority" aria-pressed="${actionMode==='authority'}" onclick="return openKingdomRankUI(event)"${disabled}>왕권</button>`;
 return base.replace(/<\/div>\s*$/,button+'</div>');
};

const V74_actionLimit=actionLimit;
actionLimit=function(k=player){return V74_actionLimit(k)+(AUTHORITY_SYSTEM?.actionBonus?.(k)||0)};

const V74_recruitAmount=recruitAmount;
recruitAmount=function(i,commit=false){
 const owner=regions?.[Number(i)]?.owner,mult=AUTHORITY_SYSTEM?.recruitmentMultiplier?.(owner)||1;
 return Math.max(0,Math.round(V74_recruitAmount(i,commit)*mult));
};

const V74_territoryIncome=territoryIncome;
territoryIncome=function(i){
 const owner=regions?.[Number(i)]?.owner,mult=AUTHORITY_SYSTEM?.incomeMultiplier?.(owner)||1,steppeMult=typeof steppeIncomeMultiplier==='function'?steppeIncomeMultiplier(i):1;
 return Math.round(V74_territoryIncome(i)*mult*steppeMult*100)/100;
};

// Cavalry / special troops use drafted() directly, so add only the rank bonus
// after their original recruitment completes. Troop growth is deliberately untouched.
if(typeof recruitCavalry==='function'){
 const V74_recruitCavalry=recruitCavalry;
 recruitCavalry=function(){
  const i=selected,before=i!==null&&regions?.[i]?regions[i].troops:null,type=i!==null?cavalryType(player):null,mult=AUTHORITY_SYSTEM?.recruitmentMultiplier?.(player)||1;
  const out=V74_recruitCavalry();
  if(before!==null&&mult>1&&regions?.[i]&&regions[i].troops>before){
   const gained=regions[i].troops-before,extra=Math.max(0,Math.round(gained*(mult-1)));
   if(extra){regions[i].troops+=extra;if(type)regions[i][type]=(regions[i][type]||0)+extra;render()}
  }
  return out;
 };
}
if(typeof recruitSpecial==='function'){
 const V74_recruitSpecial=recruitSpecial;
 recruitSpecial=function(type){
  const i=selected,before=i!==null&&regions?.[i]?regions[i].troops:null,mult=AUTHORITY_SYSTEM?.recruitmentMultiplier?.(player)||1;
  const out=V74_recruitSpecial(type);
  if(before!==null&&mult>1&&regions?.[i]&&regions[i].troops>before){
   const gained=regions[i].troops-before,extra=Math.max(0,Math.round(gained*(mult-1)));
   if(extra){regions[i].troops+=extra;regions[i][type]=(regions[i][type]||0)+extra;render()}
  }
  return out;
 };
}

// Award authority from the existing combat/build/capital flows without replacing them.
const V74_fight=fight;
fight=function(i,j,type='normal'){
 const attacker=regions?.[i]?.owner,defender=regions?.[j]?.owner,enemy=Number.isInteger(attacker)&&Number.isInteger(defender)&&attacker!==defender;
 const validEnemyAttack=enemy&&troopSend(i)>0&&territoryCanAttack(i)&&canAttack(attacker,defender);
 if(validEnemyAttack&&isSeaRoute(i,j)&&typeof resourceSeaAttackSupply==='function'){
  const supply=resourceSeaAttackSupply(attacker,troopSend(i)),before=countryFood(attacker),spent=Math.min(before,supply.cost);
  setCountryFood(attacker,before-spent);
  if(supply.useTachibana&&typeof consumeFactionInventory==='function')consumeFactionInventory(attacker,'tachibana',1);
  log(`🌊 ${K[attacker]?.name||'세력'} 해상 공격 병량 -${spent}${supply.useTachibana?` · 🍊 귤 1개 사용 (${supply.base} → ${supply.cost})`:''}`);
 }
 const won=V74_fight(i,j,type);
 if(enemy){const winner=won?attacker:defender;AUTHORITY_SYSTEM?.onBattleVictory?.(winner,{reason:won?'전투 승리 · 영토 점령':'전투 승리 · 방어 성공',territoryId:j})}
 return won;
};

const V74_finishLargeBattle=finishLargeBattle;
finishLargeBattle=async function(b,attackerWon){
 const winner=attackerWon?b?.attackerCountry:b?.defenderCountry,territoryId=b?.territoryId;
 const out=await V74_finishLargeBattle(b,attackerWon);
 if(Number.isInteger(winner))AUTHORITY_SYSTEM?.onBattleVictory?.(winner,{reason:'대규모 전투 승리',territoryId});
 return out;
};

const V74_performBuild=performBuild;
performBuild=function(i,type,k,actions){
 const ok=V74_performBuild(i,type,k,actions);
 if(ok)AUTHORITY_SYSTEM?.onBuildingCompleted?.(k,{reason:`${BUILDINGS?.[type]?.name||type} 건설 완료`,territoryId:i,building:type});
 return ok;
};

const V74_upgradeCapital=upgradeCapital;
upgradeCapital=function(){
 const i=selected,owner=i!==null?regions?.[i]?.owner:null,before=i!==null?capitalLevelOf(i):0;
 const ok=V74_upgradeCapital();
 if(ok&&Number.isInteger(owner)&&i!==null&&capitalLevelOf(i)>before){AUTHORITY_SYSTEM?.onCapitalUpgraded?.(owner,{reason:'수도 증축 완료',territoryId:i,level:capitalLevelOf(i)});render()}
 return ok;
};

const V74_endTurn=endTurn;
endTurn=async function(){
 const before=turn,out=await V74_endTurn();
 if(out!==false&&turn>before&&Number.isInteger(player)){AUTHORITY_SYSTEM?.applyEmperorChallengeTurn?.(player);render()}
 return out;
};

window.SAMGUK_AUTHORITY_SYSTEM={version:76,system:AUTHORITY_SYSTEM,getRank:k=>AUTHORITY_SYSTEM?.getRank?.(k),getAuthority:k=>AUTHORITY_SYSTEM?.getFaction?.(k)?.authorityScore||0,canAppointHighestOffices:k=>!!AUTHORITY_SYSTEM?.canAppointHighestOffices?.(k),getDiplomacyDemandBonus:k=>AUTHORITY_SYSTEM?.diplomacyDemandBonus?.(k)||0};

window.SAMGUK_BUILDING_SYSTEM={version:37,data:BUILDING_SHEET,unlocks:BUILDING_UNLOCKS,economy:TURN_ECONOMY,getFood:countryFood,getPolicy:countryPolicy,getBuildingLevel:buildingLevelAt,getLockState:buildingLockState,settleCountry:settleCountryEconomy};
window.SAMGUK_CAPITAL_SYSTEM={version:63,getLevel:capitalLevelOf,getFactionLevel:capitalLevelForFaction,getGrowthMultiplier:capitalGrowthMultiplier,getActionBonus:capitalActionBonus,getCost:capitalUpgradeCost,canUpgrade:(i,k=player)=>isUpgradeableCapitalFor(Number(i),Number(k))&&capitalLevelOf(Number(i))<5,upgrade:upgradeCapital};

// v76: bubble-phase fallback only. The real button uses inline onclick, so this never blocks
// the target phase. This is intentionally NOT capture-phase and never calls stopPropagation().
document.addEventListener('click',e=>{
 const b=e.target.closest?.('#orders #kingRankBtn, #detail #kingRankBtn');
 if(!b||b.disabled||e.defaultPrevented)return;
 openAuthorityPanelV76(e);
});

$('choices').onclick=e=>{let b=e.target.closest('[data-choice]');if(b){choice=Number(b.dataset.choice);choices()}};$('begin').onclick=start;$('powers').onclick=e=>{if(busy)return;const b=e.target.closest('[data-faction]');if(!b)return;const i=regions.findIndex(r=>r.owner===+b.dataset.faction);if(i>=0){selected=i;target=null;actionMode='inspect';focusRegion(i);render()}};$('help').onclick=()=>$('rules').showModal();if($('saveGame'))$('saveGame').onclick=saveGame;if($('loadGame'))$('loadGame').onclick=loadGame;$('closeRules').onclick=()=>$('rules').close();$('end').onclick=endTurn;$('restart').onclick=()=>{if(busy)return;choices();$('start').showModal()};$('again').onclick=()=>{$('finish').close();choices();$('start').showModal()};$('mapViewport').onclick=e=>{if(mapDragged||busy)return;const wall=e.target.closest?.('[data-great-wall]');if(wall){openGreatWallMenu();return}const landmark=e.target.closest?.('[data-landmark]');if(landmark){openMountainEventMenu(landmark.dataset.landmark);return}let g=e.target.closest?.('#map .territory-shape[data-id], #shanhaiguan-pass-asset[data-id]');if(!g&&Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)){g=(document.elementsFromPoint?.(e.clientX,e.clientY)||[]).map(el=>el.closest?.('#map .territory-shape[data-id], #shanhaiguan-pass-asset[data-id]')).find(Boolean)||null}if(g){const i=+g.dataset.id;if(lightweightInvasionState.active){select(i)}else{if(mapView[2]>500)focusRegion(i);select(i)}}};$('mapViewport').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const wall=e.target.closest('[data-great-wall]');if(wall){e.preventDefault();openGreatWallMenu();return}const landmark=e.target.closest('[data-landmark]');if(landmark){e.preventDefault();openMountainEventMenu(landmark.dataset.landmark);return}let g=e.target.closest('[data-id]');if(g){e.preventDefault();select(+g.dataset.id)}}};bindDomesticEventsV106();$('start').addEventListener('cancel',e=>{if(!playing)e.preventDefault()});$('finish').addEventListener('cancel',e=>e.preventDefault());regions=initialRegions();window.SAMGUK_CAPITAL_UPGRADE?.configureRuntime?.({getRegions:()=>regions,isCapital,getGold:()=>gold,getActionPoints:()=>ap});window.SAMGUK_CITY_TECH_TREE?.configureRuntime?.({getRegions:()=>regions,isActive:isActiveTerritory,isCapital,getCityType:cityTypeOf,getCityLevel:cityLevelOf,getCapitalLevel:capitalLevelOf,getMaxLevel:()=>GAME_BALANCE.city.maxLevel});window.SAMGUK_CITY_SPRITES?.configureRuntime?.({getRegions:()=>regions,getSeed:i=>{const s=seeds[i];return s?[s[1],s[2]]:null},getView:()=>[...mapView],getWorld:()=>WORLD,getSvg:()=>document.getElementById('map')});resetDiplomacy();initDiplomacy();initTotalWarDiplomacyUI();initMapControls();render();choices();$('start').showModal();


// =============================================================================
// v84 PORT CITY + CITY ASSET PATCH
// - Adds coast-only 港口城市 using existing city specialization/level systems.
// - Hybrid balance: income + food production (Lv I/II/III = +25/+35/+50%).
// - Reuses COASTAL, city upgrade, AI and save/hydrate structures; no new territory data.
// =============================================================================
CITY_TYPES.port={label:'항구도시',icon:'⚓',effect:'해안 전용 · 턴 수입/병량 생산 증가',theme:'port'};
GAME_BALANCE.city.portIncomeBonus=[0,.25,.35,.50];
GAME_BALANCE.city.portFoodBonus=[0,.25,.35,.50];
CITY_BUILDING_ORDER.port=[];
CITY_SPECIAL_BUILDING_LISTS.port=[];

const V84_BASE_cityBonusFor=cityBonusFor;
cityBonusFor=function(type,level){
 level=Math.max(0,Math.min(GAME_BALANCE.city.maxLevel,Number(level)||0));
 if(type==='port')return GAME_BALANCE.city.portIncomeBonus[level]||0;
 return V84_BASE_cityBonusFor(type,level);
};
function portFoodBonusForLevel(level){
 level=Math.max(0,Math.min(GAME_BALANCE.city.maxLevel,Number(level)||0));
 return GAME_BALANCE.city.portFoodBonus[level]||0;
}
function portCityAllowed(i){return !!COASTAL?.has?.(Number(i))}

// Existing income pipeline remains the single source of truth; port adds only its city multiplier.
const V84_BASE_cityIncomeMultiplier=cityIncomeMultiplier;
cityIncomeMultiplier=function(i){
 if(cityTypeOf(i)==='port'){
  const owner=regions?.[i]?.owner;
  return (1+cityBonusFor('port',cityLevelOf(i)))*capitalGrowthMultiplier(owner);
 }
 return V84_BASE_cityIncomeMultiplier(i);
};

cityTypeBadge=function(i){
 const type=cityTypeOf(i),c=CITY_TYPES[type],lv=cityLevelLabel(i);if(type==='normal')return'';
 if(type==='port'){
  const inc=Math.round(cityBonusFor('port',cityLevelOf(i))*100),food=Math.round(portFoodBonusForLevel(cityLevelOf(i))*100);
  return `<div class="city-type-badge port"><strong>${c.icon} ${c.label} ${lv}</strong><span>수입 +${inc}% · 병량 +${food}%</span></div>`;
 }
 return `<div class="city-type-badge ${type}"><strong>${c.icon} ${c.label} ${lv}</strong><span>${Math.round(cityBonusFor(type,cityLevelOf(i))*100)}% 특화 효과</span></div>`;
};
cityEffectInfo=function(i){
 const type=cityTypeOf(i),c=CITY_TYPES[type];if(type==='normal')return'';
 if(type==='port'){
  const inc=Math.round(cityBonusFor('port',cityLevelOf(i))*100),food=Math.round(portFoodBonusForLevel(cityLevelOf(i))*100);
  return `<p class="city-effect-line port"><b>${c.icon} ${c.label} ${cityLevelLabel(i)} 효과</b> · 턴 수입 +${inc}% · 해당 영토 병량 생산 +${food}%</p>`;
 }
 const pct=Math.round(cityBonusFor(type,cityLevelOf(i))*100),effect=type==='agriculture'?`징집·보충 +${pct}%`:type==='commerce'?`턴 수입 +${pct}%`:`방어력 +${pct}%`;
 return `<p class="city-effect-line ${type}"><b>${c.icon} ${c.label} ${cityLevelLabel(i)} 효과</b> · ${effect}</p>`;
};

// Port styling is additive so the existing three city themes remain untouched.
(function ensureV84PortCityStyles(){
 if(document.getElementById('v84PortCityStyles'))return;
 const style=document.createElement('style');style.id='v84PortCityStyles';style.textContent=`
 .panel.selected.city-theme-port{border-color:#3f8193!important;box-shadow:inset 0 0 0 1px #3f819342}
 .panel.selected.city-theme-port>.eyebrow,.panel.selected.city-theme-port #detail h2,.panel.selected.city-theme-port #detail .section-title{color:#75c6d9!important}
 .city-type-badge.port{border-color:#3f8193;background:#102229}.city-type-badge.port strong{color:#7fd5e8}
 .city-effect-line.port{border-color:#3f8193}
 .city-upgrade-btn.port{border-color:#3f8193!important}.city-upgrade-btn.port strong{color:#7fd5e8}
 .city-upgrade-btn.port[disabled]{filter:saturate(.35)}
 @media(min-width:980px){.city-upgrade-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}
 `;document.head.appendChild(style);
})();
const V84_BASE_applyCityPanelTheme=applyCityPanelTheme;
applyCityPanelTheme=function(i){
 V84_BASE_applyCityPanelTheme(i);
 const panel=document.getElementById('detail')?.closest('.panel.selected')||document.getElementById('detail')?.closest('.panel');if(!panel)return;
 panel.classList.remove('city-theme-port');
 const type=i!==null&&i!==undefined?cityTypeOf(i):'normal';if(type==='port')panel.classList.add('city-theme-port');
};

renderCityUpgradeUI=function(i){
 const type=cityTypeOf(i),lv=cityLevelOf(i),steppe=typeof isSteppeTerrain==='function'&&isSteppeTerrain(i),steppeTip='초원 지형에는 농업 도시를 건설할 수 없습니다';
 if(type==='normal'){
  const cost=cityUpgradeCost(i,1),portAllowed=portCityAllowed(i),disabledBase=gold<cost||ap<1;
  const choices=[
   ['agriculture','🌾 농업도시','III 완성 시 해금 · 곡창 · 관개시설 · 둔전 · 역참 · 병영촌',false,steppe],
   ['commerce','💰 상업도시','III 완성 시 해금 · 교역소 · 객잔 · 창고 · 조폐소',false,false],
   ['military','🛡️ 군사도시','III 완성 시 해금 · 훈련소 · 병기고 · 성문 · 성벽 · 망루',false,false],
   ['port','⚓ 항구도시','수입/병량 +25% → +35% → +50% · 해안 영토 전용',!portAllowed,false]
  ];
  return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 하기</h3><p class="subtext">전문 도시 I로 성장시킵니다. 비용 ${cost}금 · 행동 1. 항구도시는 해안 영토에서만 선택할 수 있습니다.${steppe?'<br>🌿 STEPPE: 농업도시 건설/증축 불가':''}</p><div class="city-upgrade-grid">${choices.map(([k,n,desc,coastLocked,terrainLocked])=>`<button class="city-upgrade-btn ${k}" data-city-type="${k}" ${disabledBase||coastLocked||terrainLocked?'disabled':''} ${terrainLocked?`title="${steppeTip}"`:''}><strong>${n} I</strong><small>${desc}${coastLocked?'<br>🔒 현재 영토는 해안이 아님':''}${terrainLocked?'<br>🔒 초원 지형에는 건설 불가':''}</small></button>`).join('')}</div></div>`;
 }
 if(lv>=GAME_BALANCE.city.maxLevel){
  if(type==='port')return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 완료</h3><p class="subtext">⚓ 항구도시 III · 턴 수입 +50% · 해당 영토 병량 생산 +50% · 최고 단계입니다.</p></div>`;
  return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 완료</h3><p class="subtext">${CITY_TYPES[type].icon} ${CITY_TYPES[type].label} III · 상위 건물 해금 완료.</p></div>`;
 }
 const next=lv+1,cost=cityUpgradeCost(i,next),pct=Math.round(cityBonusFor(type,next)*100);
 if(type==='agriculture'&&steppe)return `<div class="city-upgrade-panel"><h3 class="mode-title">🌾 농업도시 증축 제한</h3><p class="subtext">🌿 ${steppeTip}</p><button class="action city-upgrade-btn agriculture" data-city-type="agriculture" disabled title="${steppeTip}">초원 지형 · 증축 불가</button></div>`;
 if(type==='port')return `<div class="city-upgrade-panel"><h3 class="mode-title">⚓ 항구도시 ${cityLevelLabel(i)} 확장</h3><p class="subtext">다음 단계 ${['','I','II','III'][next]} · 턴 수입 +${pct}% · 해당 영토 병량 생산 +${Math.round(portFoodBonusForLevel(next)*100)}% · 비용 ${cost}금 · 행동 1</p><button class="action city-upgrade-btn port" data-city-type="port" ${gold<cost||ap<1?'disabled':''}>항구도시 ${['','I','II','III'][next]}로 증축</button></div>`;
 return `<div class="city-upgrade-panel"><h3 class="mode-title">${CITY_TYPES[type].icon} ${CITY_TYPES[type].label} ${cityLevelLabel(i)} 확장</h3><p class="subtext">다음 단계 ${['','I','II','III'][next]} · 핵심 특화 효과 ${pct}% · 비용 ${cost}금 · 행동 1<br>${next===GAME_BALANCE.city.maxLevel?'완성 즉시 상위 건물 해금':'상위 건물은 III에서 해금'}</p><button class="action city-upgrade-btn ${type}" data-city-type="${type}" ${gold<cost||ap<1?'disabled':''}>${CITY_TYPES[type].label} ${['','I','II','III'][next]}로 증축</button></div>`;
};

const V84_BASE_upgradeCityForCountry=upgradeCityForCountry;
upgradeCityForCountry=function(i,type,k){
 if(isPassTerritory(i))return false;
 if(type==='agriculture'&&typeof isSteppeTerrain==='function'&&isSteppeTerrain(i))return false;
 if(type==='port'&&!portCityAllowed(i))return false;
 return V84_BASE_upgradeCityForCountry(i,type,k);
};
const V84_BASE_upgradeCity=upgradeCity;
upgradeCity=function(type){
 if(selected!==null&&isPassTerritory(selected)){notify('산해관은 특수 관문 영토라 도시 증축을 할 수 없습니다.');return false}
 if(type==='agriculture'&&selected!==null&&typeof isSteppeTerrain==='function'&&isSteppeTerrain(selected)){notify('초원 지형에는 농업 도시를 건설할 수 없습니다.');return false}
 if(type==='port'&&selected!==null&&!portCityAllowed(selected)){notify('항구도시는 바다와 맞닿은 해안 영토에만 증축할 수 있습니다.');return false}
 return V84_BASE_upgradeCity(type);
};

// Coastal AI prefers the hybrid port city unless the territory urgently needs military/agriculture specialization.
const V84_BASE_aiCityType=aiCityType;
aiCityType=function(i,k){
 const front=(neighbors[i]||[]).some(j=>regions[j]?.owner!==k);
 if(front)return'military';
 if(typeof isSteppeTerrain==='function'&&isSteppeTerrain(i))return portCityAllowed(i)?'port':'commerce';
 if(regions[i]?.troops<35)return'agriculture';
 if(portCityAllowed(i))return'port';
 return V84_BASE_aiCityType(i,k);
};
const V84_BASE_aiChooseGovernorForTerritory=aiChooseGovernorForTerritory;
aiChooseGovernorForTerritory=function(i){
 if(cityTypeOf(i)!=='port')return V84_BASE_aiChooseGovernorForTerritory(i);
 const list=officersInTerritory(i);if(!list.length)return null;
 const score=o=>o.stats.politics*.42+o.stats.charisma*.26+o.stats.intelligence*.18+o.stats.leadership*.04+o.loyalty*.10;
 return [...list].sort((a,b)=>score(b)-score(a))[0];
};

// Refresh the currently selected panel once after registering the new type.
try{applyCityPanelTheme(selected);render()}catch(_e){}


// =============================================================================
// v106 DOMESTIC / RECRUIT / BUILD HOTFIX
// [1] #orders를 단일 렌더 영역으로 사용하고 내정 하단은 매번 완전 교체한다.
// [2] 실제 등록 병과 전체를 하나의 unitTypes 배열로 렌더한다.
// [3] 메인 6버튼 + 왕권 / 모집 / 건설 / 증축 / 인사 / 첩보 이벤트를 단일 위임기로 재연결한다.
// =============================================================================
var domesticPanelTabV106='recruit';

function domesticUnitTypesV106(i){
 const owner=regions?.[Number(i)]?.owner;
 if(!Number.isInteger(owner))return[];
 const cavalryUnit=cavalryType(owner);
 const list=[
  {key:'infantry',label:'보병',kind:'infantry',amount:()=>recruitAmount(i),cost:()=>recruitmentCost(i,20,false,'infantry'),food:()=>unitRecruitFoodCost('infantry',i),description:'기본 보병 · 행동 1'},
  {key:cavalryUnit,label:UNIT_NAMES[cavalryUnit]||'기병',kind:'cavalry',amount:()=>drafted(i,9,false,cavalryUnit),cost:()=>cavalryCost(i),food:()=>unitRecruitFoodCost(cavalryUnit,i),description:nationHas(owner,'nomad')?'기마민족 고유 기병 · STEPPE 전투 공/방 +20% · 행동 1':'STEPPE 전투 공/방 +20% · STEPPE 2칸 강행군(기병 50% 초과) · 행동 1'}
 ];
 // 궁병·해군은 항상 일반 모집 목록에 노출한다. 철보병은 철이 없어도 잠금 상태를 보여준다.
 for(const key of ['archers','marines','ironInfantry']){
  const spec=SPECIAL_RECRUITS?.[key];if(!spec)continue;
  list.push({key,label:UNIT_NAMES[key]||key,kind:'special',amount:()=>drafted(i,9,false,key),cost:()=>specialRecruitCost(i,key),food:()=>unitRecruitFoodCost(key,i),description:spec.text||'특수 병과 · 행동 1',forceVisible:true});
 }
 // 국가 고유 병과는 현재 국가가 사용할 수 있는 것만 추가한다.
 for(const [key,spec] of Object.entries(SPECIAL_RECRUITS||{})){
  if(['archers','marines','ironInfantry'].includes(key))continue;
  if(key==='nomadCavalry'&&cavalryUnit==='nomadCavalry')continue;
  let allowed=false;try{allowed=canRecruitSpecialUnit(owner,key)}catch(_e){allowed=false}
  if(!allowed)continue;
  list.push({key,label:UNIT_NAMES[key]||key,kind:'special',amount:()=>drafted(i,9,false,key),cost:()=>specialRecruitCost(i,key),food:()=>unitRecruitFoodCost(key,i),description:spec.text||'고유 병과 · 행동 1'});
 }
 return list;
}
function domesticRecruitDiscountV106(i,key){
 const notes=[];try{
  if(['cavalry','nomadCavalry','armoredCavalry'].includes(key)&&typeof hasResource==='function'&&hasResource(i,'horse'))notes.push('🐴 말 -50%');
  if(['cavalry','nomadCavalry','armoredCavalry'].includes(key)&&typeof isSteppeTerrain==='function'&&isSteppeTerrain(i))notes.push('🌿 STEPPE -20%');
  if(key==='archers'&&typeof factionInventoryAmount==='function'&&factionInventoryAmount(regions[i].owner,'bow')>0)notes.push('🏹 각궁 -30%');
  if(key==='ironInfantry'&&typeof factionInventoryAmount==='function')notes.push(factionInventoryAmount(regions[i].owner,'iron')>0?'⛏️ 철 보유 · 해금':'🔒 철 재고 필요');
 }catch(_e){}
 return notes.join(' · ');
}
function domesticRecruitRowV106(i,u){
 let amount=0,cost=Infinity,food=0;try{amount=Math.max(0,Number(u.amount())||0)}catch(_e){}try{cost=Math.max(0,Number(u.cost())||0)}catch(_e){}try{food=Math.max(0,Number(u.food())||0)}catch(_e){}
 let unlocked=true;try{if(u.key==='ironInfantry')unlocked=canRecruitSpecialUnit(regions[i].owner,u.key)}catch(_e){unlocked=false}
 const disabled=busy||!playing||ap<1||gold<cost||countryFood(player)<food||amount<1||!unlocked;
 const discount=domesticRecruitDiscountV106(i,u.key),unique=(u.kind==='special'&&(isNationSpecialUnit?.(u.key)||u.key==='ironInfantry'));
 const attrs=u.kind==='infantry'?'id="recruit"':u.kind==='cavalry'?'id="recruitCavalry"':`data-recruit-unit="${u.key}"`;
 return `<div class="domestic-unit-row ${unique?'unique-unit-row':''} ${!unlocked?'is-locked':''}"><button class="action recruit-slot ${unique?'unique-unit':''}" ${attrs} ${disabled?'disabled':''}><strong>${unique?'★ ':''}${u.label} +${amount}명</strong><span>금 ${Number.isFinite(cost)?cost:'-'} · 병량 ${food}</span></button><p class="recruit-slot-desc">${u.description}${discount?`<br><b>${discount}</b>`:''}</p></div>`;
}
function renderRecruitPanelV106(i){
 let rows='';try{rows=domesticUnitTypesV106(i).map(u=>domesticRecruitRowV106(i,u)).join('')}catch(err){console.error('[삼국쟁패][v106] 전체 병과 렌더 복구',err)}
 return `<section class="recruit-compact-list domestic-subpanel" id="domesticRecruitPanel" aria-label="병과 모집">${rows||'<p class="subtext">현재 모집 가능한 병과를 계산할 수 없습니다.</p>'}</section>`;
}
function renderBuildingPanelV106(i){
 try{return `<section class="domestic-subpanel" id="domesticBuildPanel">${renderBuildings(i)}</section>`}
 catch(err){console.error('[삼국쟁패][v106] 건설 패널 렌더 오류',err);return '<section class="domestic-subpanel"><p class="subtext">건설 정보를 다시 불러오는 중입니다.</p></section>'}
}
function renderDomesticPanel(i){
 if(!regions?.[Number(i)]||regions[Number(i)].owner!==player)return'';
 const tab=domesticPanelTabV106==='build'?'build':'recruit';
 return `<section id="domesticPanelRoot" class="domestic-panel-singleton" data-domestic-panel="1"><div class="domestic-panel-head"><h3 class="mode-title domestic-mode-title">내정 · 모병 · 건설</h3><div class="domestic-subtabs" role="tablist"><button type="button" data-domestic-tab="recruit" aria-pressed="${tab==='recruit'}">⚔ 모병</button><button type="button" data-domestic-tab="build" aria-pressed="${tab==='build'}">🏗 건설</button></div></div><div id="domesticSubmenuRoot">${tab==='recruit'?renderRecruitPanelV106(i):renderBuildingPanelV106(i)}</div></section>`;
}
window.renderDomesticPanel=renderDomesticPanel;

// 최종 메인 컨트롤 6개 + 하단 왕권. 이전 버전의 중첩 wrapper 결과를 사용하지 않는다.
renderActions=function(){
 if(selected===null||!regions?.[selected]||regions[selected].owner!==player)return'';
 const locked=!!largeBattleAt(selected),capitalTerritory=isCapital(selected),capital=capitalTerritory&&isUpgradeableCapitalFor(selected,player),capitalMax=capital&&capitalLevelOf(selected)>=5,cityMax=!capitalTerritory&&!cityCanUpgrade(selected);
 const growthMode=capitalTerritory?'capital':'city',growthLabel=capitalTerritory?(capital?(capitalMax?'수도증축 MAX':'도시증축 하기'):'도시증축 불가'):(cityMax?'도시증축 완료':'도시증축 하기');
 const main=[['support','지원 보내기'],['attack','침략하기'],['domestic','내정하기(건설)'],[growthMode,growthLabel],['personnel','인사']];
 const buttons=main.map(([mode,label])=>{const disabled=busy||!playing||(locked&&(mode==='support'||mode==='attack'))||(mode==='capital'&&(!capital||capitalMax))||(mode==='city'&&cityMax);return `<button type="button" data-mode="${mode}" aria-pressed="${actionMode===mode}" ${disabled?'disabled':''}>${label}</button>`}).join('');
 const spyDisabled=busy||!playing||locked;
 const authorityDisabled=busy||!playing;
 return `<div id="territoryActionRoot" class="territory-action-root"><div class="territory-actions" aria-label="영토 행동">${buttons}<button type="button" data-strategy-espionage-open="1" ${spyDisabled?'disabled':''}>첩보 / 계략</button></div><div class="territory-authority-row"><button type="button" class="rank-tab-btn" id="kingRankBtn" data-mode="authority" aria-pressed="${actionMode==='authority'}" ${authorityDisabled?'disabled':''}>왕권</button></div></div>`;
};

// 탭 전환 시 이전 하단 DOM을 버리고 render()로 새 DOM만 생성한다.
function setDomesticTabV106(tab){
 if(!['recruit','build'].includes(tab)||selected===null||actionMode!=='domestic')return false;
 domesticPanelTabV106=tab;render();return true;
}

function dispatchDomesticActionV106(e){
 const b=e.target.closest?.('button');if(!b||b.disabled)return;
 try{
  if(b.dataset.domesticTab){e.preventDefault();setDomesticTabV106(b.dataset.domesticTab);return}
  if(b.dataset.invasionQuickLaunch||b.dataset.invasionQuickCancel||b.dataset.invasionCallSupport)return; // v98~v100 전용 listener가 처리
  if(b.id==='kingRankBtn'){e.preventDefault();openAuthorityPanelV76(e);return}
  if(b.dataset.strategyEspionageOpen){e.preventDefault();e.stopPropagation();openEspionageForSelected();return}
  if(b.dataset.resourceAction){e.preventDefault();resourceAction(b.dataset.resourceAction);return}
  if(b.dataset.mode){e.preventDefault();if(b.dataset.mode==='domestic')domesticPanelTabV106='recruit';setAction(b.dataset.mode);return}
  if(b.dataset.personnelAction){e.preventDefault();handlePersonnelActionV37(b.dataset.personnelAction);return}
  if(b.dataset.attackType){e.preventDefault();setAttackType(b.dataset.attackType);return}
  if(b.dataset.destination!==undefined){e.preventDefault();const id=Number(b.dataset.destination);if(!busy&&eligibleTarget(id)){target=id;render();if(actionMode==='attack'&&attackType==='large')march()}return}
  if(b.dataset.building){e.preventDefault();buildBuilding(b.dataset.building);return}
  if(b.dataset.cityType){e.preventDefault();upgradeCity(b.dataset.cityType);return}
  if(b.dataset.capitalUpgrade){e.preventDefault();upgradeCapital();return}
  if(b.dataset.recruitUnit){e.preventDefault();recruitSpecial(b.dataset.recruitUnit);return}
  if(b.id==='recruitCavalry'){e.preventDefault();recruitCavalry();return}
  if(b.id==='recruit'){e.preventDefault();recruit();return}
  if(b.id==='march'){e.preventDefault();march();return}
  if(b.id==='cancel'){e.preventDefault();setAction('inspect');return}
 }catch(err){console.error('[삼국쟁패][v106] 내정 패널 이벤트 오류',err);notify?.('메뉴 동작을 복구하는 중 오류가 발생했습니다.');}
}
function bindDomesticEventsV106(){
 const orders=$('orders'),detail=$('detail');
 if(orders){orders.onclick=dispatchDomesticActionV106;orders.dataset.domesticDelegation='v106'}
 if(detail){detail.onclick=dispatchDomesticActionV106;detail.dataset.domesticDelegation='v106'}
 return true;
}
window.bindDomesticEventsV106=bindDomesticEventsV106;

// fallback도 동일한 전체 UI를 사용한다. 보병/기병 2개짜리 임시 화면을 다시 만들지 않는다.
renderTerritorySelectionFallback=function(i,error){
 const r=regions?.[Number(i)],orders=$('orders'),detail=$('detail');if(!r)return;
 const yours=r.owner===player;
 if(detail)detail.innerHTML=`<h2>${r.name}${isCapital(i)?' ★':''}</h2><p class="owner" style="color:${K[r.owner]?.color||'#ddd'}">${K[r.owner]?.name||'무소속'} · ${r.troops||0}명 주둔</p><p class="subtext">영토 정보 일부를 안전 모드로 표시 중입니다.</p>`;
 if(orders)orders.innerHTML=yours?`${renderActions()}${renderDomesticPanel(i)}`:'<p class="subtext">상대 영토입니다. 침략하려면 아군 영토에서 침략하기를 선택하세요.</p>';
 bindDomesticEventsV106();
 if(error)console.error('[삼국쟁패][v106] 원본 렌더 오류',error);
};

(function ensureDomesticHotfixStylesV106(){
 if(document.getElementById('domesticHotfixStylesV106'))return;const s=document.createElement('style');s.id='domesticHotfixStylesV106';s.textContent=`
 #territoryActionRoot{display:grid;gap:8px}.territory-authority-row{display:grid}.territory-authority-row .rank-tab-btn{width:100%}
 .domestic-panel-singleton{margin-top:10px}.domestic-panel-head{display:grid;gap:8px}.domestic-subtabs{display:grid;grid-template-columns:1fr 1fr;gap:6px}
 .domestic-subtabs button{padding:9px;border:1px solid #4e5c59;background:#132024;color:#d7d0be;border-radius:4px}.domestic-subtabs button[aria-pressed="true"]{border-color:#c39b50;background:#2a2115;color:#f0d28b}
 #domesticSubmenuRoot{margin-top:8px}.domestic-unit-row{display:grid;grid-template-columns:1fr;gap:2px;margin-bottom:7px}.domestic-unit-row .recruit-slot{display:flex;justify-content:space-between;align-items:center;gap:8px;text-align:left}.domestic-unit-row .recruit-slot strong{font-weight:800}.domestic-unit-row.is-locked{opacity:.66}.domestic-unit-row .recruit-slot-desc b{color:#e6c46e}
 `;document.head.appendChild(s)
})();

bindDomesticEventsV106();
try{if(selected!==null&&regions?.[selected]?.owner===player)render()}catch(err){console.error('[삼국쟁패][v106] 초기 UI 재렌더 실패',err)}

// =============================================================================
// v108 DOMESTIC / RECRUIT / BUILD RELIABILITY HOTFIX
// - v107에서 아군 영토 선택을 강제로 inspect로 바꾸던 회귀를 제거한다.
// - 아군 영토 선택 즉시 domestic 상태로 복구하고, 선택 테두리는 UI 렌더와 독립 갱신한다.
// - 내정/모병/건설 핵심 버튼은 document capture delegation으로 직접 처리한다.
//   (#orders.innerHTML 재생성이나 onclick 덮어쓰기 이후에도 이벤트가 끊기지 않는다.)
// - selected/regions/owner/domestic/buildings Guard Clause를 모든 내정 진입점에 적용한다.
// =============================================================================
(function installDomesticRecruitBuildHotfixV108(){
  if(window.__SAMGUK_V108_DOMESTIC_RECRUIT_BUILD_FIX__)return;
  window.__SAMGUK_V108_DOMESTIC_RECRUIT_BUILD_FIX__=true;

  function noticeV108(message){
    try{if(typeof notify==='function'){notify(message);return}}catch(_e){}
    try{window.alert?.(message)}catch(_e){}
  }

  function normalizeDomesticTerritoryV108(territory){
    if(!territory||typeof territory!=='object')return null;
    if(!territory.domestic||typeof territory.domestic!=='object'||Array.isArray(territory.domestic))territory.domestic={};
    if(!territory.buildings||typeof territory.buildings!=='object'||Array.isArray(territory.buildings)){
      territory.buildings=(window.SAMGUK_BUILDING_DATA?.createInitialState?.()||{});
    }
    return territory;
  }

  function selectedTerritoryV108({owned=false,notifyOnFail=false}={}){
    const hasSelection=selected!==null&&selected!==undefined&&selected!=='';
    const id=hasSelection?Number(selected):NaN;
    const valid=hasSelection&&Number.isInteger(id)&&id>=0&&Array.isArray(regions)&&!!regions[id]&&
      (typeof isActiveTerritory!=='function'||isActiveTerritory(id));
    if(!valid){
      if(notifyOnFail)noticeV108('먼저 지도에서 아군 영토를 선택해 주세요.');
      return null;
    }
    const territory=normalizeDomesticTerritoryV108(regions[id]);
    if(!territory){
      if(notifyOnFail)noticeV108('선택한 영토 데이터를 불러올 수 없습니다. 다시 선택해 주세요.');
      return null;
    }
    if(owned&&territory.owner!==player){
      if(notifyOnFail)noticeV108('내정·모병·건설은 자신의 영토에서만 실행할 수 있습니다.');
      return null;
    }
    return {id,territory};
  }
  window.getSelectedTerritorySafeV108=selectedTerritoryV108;

  function refreshSelectionV108(force=false){
    try{
      if(typeof updateMapDynamicState==='function')return updateMapDynamicState({force:!!force});
      if(typeof window.updateMapDynamicState==='function')return window.updateMapDynamicState({force:!!force});
      if(typeof drawMap==='function'){drawMap('v108-selection');return true}
    }catch(err){
      console.error('[삼국쟁패][v108] 선택 테두리 갱신 오류',err);
      try{if(typeof drawMap==='function'){drawMap('v108-selection-recovery');return true}}catch(_e){}
    }
    return false;
  }
  window.refreshSelectionVisualV108=refreshSelectionV108;

  function safeRenderV108(reason='domestic'){
    try{
      render();
      return true;
    }catch(err){
      console.error(`[삼국쟁패][v108] ${reason} 렌더 오류`,err);
      try{
        if(Number.isInteger(Number(selected)))renderTerritorySelectionFallback?.(Number(selected),err);
      }catch(fallbackError){
        console.error('[삼국쟁패][v108] 안전 UI 복구 오류',fallbackError);
      }
      return false;
    }finally{
      refreshSelectionV108();
    }
  }

  // 내정 패널은 잘못된 selected/territory 상태를 절대 직접 역참조하지 않는다.
  const renderDomesticPanelBeforeV108=renderDomesticPanel;
  renderDomesticPanel=function(i){
    const id=Number(i),territory=Number.isInteger(id)?regions?.[id]:null;
    if(!territory||territory.owner!==player){
      return '<section class="domestic-subpanel"><p class="subtext">내정을 진행할 아군 영토를 먼저 선택해 주세요.</p></section>';
    }
    normalizeDomesticTerritoryV108(territory);
    try{return renderDomesticPanelBeforeV108(id)}
    catch(err){
      console.error('[삼국쟁패][v108] 내정 패널 렌더 보호',err);
      return '<section class="domestic-subpanel"><p class="subtext">내정 정보를 불러오는 중 오류가 발생했습니다. 영토를 다시 선택해 주세요.</p></section>';
    }
  };
  window.renderDomesticPanel=renderDomesticPanel;

  // 아군 영토 선택 시 원래 게임 흐름대로 즉시 domestic으로 진입한다.
  // UI 렌더가 실패해도 지도 선택 상태/테두리는 먼저 확정된다.
  select=function(i){
    i=Number(i);
    if(!playing||busy||!Number.isInteger(i)||!isActiveTerritory(i)||!regions?.[i])return false;

    if(lightweightInvasionState?.active){
      if(lightweightInvasionState.targets.includes(i)){selectLightweightInvasionTarget(i);return true}
      if(i===lightweightInvasionState.sourceId)return false;
      noticeV108('붉게 표시된 공격 가능 영토를 선택하세요.');
      return false;
    }

    if(eligibleTarget(i)){
      target=i;
      refreshSelectionV108();
      safeRenderV108('목적지 선택');
      try{openOfficerPanel(i)}catch(err){console.error('[삼국쟁패][v108] 장수 패널 열기 오류',err)}
      if(actionMode==='attack'&&attackType==='large')march();
      return true;
    }

    selected=i;
    target=null;
    attackType=null;
    const yours=regions[i].owner===player;
    actionMode=yours?'domestic':'inspect';
    if(yours){
      normalizeDomesticTerritoryV108(regions[i]);
      if(typeof domesticPanelTabV106!=='undefined')domesticPanelTabV106='recruit';
    }

    refreshSelectionV108();
    safeRenderV108('영토 선택');
    try{openOfficerPanel(i)}catch(err){console.error('[삼국쟁패][v108] 장수 패널 열기 오류',err)}
    return true;
  };
  window.selectTerritoryV108=select;

  // setAction의 내정 진입도 별도 Guard Clause로 보호한다.
  const setActionBeforeV108=setAction;
  setAction=function(mode){
    if(mode==='domestic'){
      const ctx=selectedTerritoryV108({owned:true,notifyOnFail:true});
      if(!ctx){actionMode='inspect';target=null;attackType=null;refreshSelectionV108();return false}
      if(typeof domesticPanelTabV106!=='undefined')domesticPanelTabV106='recruit';
      normalizeDomesticTerritoryV108(ctx.territory);
    }
    try{return setActionBeforeV108(mode)}
    catch(err){
      console.error(`[삼국쟁패][v108] ${mode||'unknown'} 행동 실행 오류`,err);
      if(mode==='domestic')noticeV108('내정 메뉴를 여는 중 오류가 발생했습니다. 영토를 다시 선택해 주세요.');
      return false;
    }
  };

  // 기존 #orders.onclick 하나에만 의존하지 않는 영구 이벤트 브리지.
  // 핵심 내정 버튼만 capture 단계에서 처리하고 나머지 게임 액션은 기존 핸들러에 맡긴다.
  document.addEventListener('click',function domesticCaptureV108(e){
    const button=e.target?.closest?.('button');
    if(!button||button.disabled)return;
    const host=button.closest?.('#orders,#detail');
    if(!host)return;

    // v111: v108의 capture/stopImmediatePropagation보다 먼저 새 통합 내정 브리지에 위임한다.
    // 처리된 버튼은 여기서 종료하여 v106/v108 onclick과의 중복 실행을 막는다.
    try{
      if(window.SAMGUK_DOMESTIC_V111?.captureClick?.(e,button,host))return;
    }catch(v111BridgeError){
      console.error('[삼국쟁패][v112] v108 브리지 위임 오류',v111BridgeError);
    }

    const isDomesticMain=button.dataset?.mode==='domestic';
    const domesticTab=button.dataset?.domesticTab;
    const isDomesticAction=!!button.dataset?.building||!!button.dataset?.recruitUnit||button.id==='recruit'||button.id==='recruitCavalry';
    if(!isDomesticMain&&!domesticTab&&!isDomesticAction)return;

    // 핵심 버튼은 여기서 완결 처리하여 stale onclick / 중복 실행을 막는다.
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();

    const ctx=selectedTerritoryV108({owned:true,notifyOnFail:true});
    if(!ctx)return;

    try{
      if(isDomesticMain){
        normalizeDomesticTerritoryV108(ctx.territory);
        domesticPanelTabV106='recruit';
        actionMode='domestic';
        target=null;
        attackType=null;
        safeRenderV108('내정 진입');
        return;
      }

      if(domesticTab){
        if(actionMode!=='domestic')actionMode='domestic';
        domesticPanelTabV106=domesticTab==='build'?'build':'recruit';
        safeRenderV108(`내정 ${domesticPanelTabV106} 탭`);
        return;
      }

      if(actionMode!=='domestic'){
        actionMode='domestic';
        safeRenderV108('내정 상태 복구');
      }
      if(button.dataset?.building){buildBuilding(button.dataset.building);return}
      if(button.dataset?.recruitUnit){recruitSpecial(button.dataset.recruitUnit);return}
      if(button.id==='recruitCavalry'){recruitCavalry();return}
      if(button.id==='recruit'){recruit();return}
    }catch(err){
      console.error('[삼국쟁패][v108] 내정/모병/건설 버튼 처리 오류',err);
      noticeV108('내정 메뉴 동작 중 오류가 발생했습니다. 영토를 다시 선택해 주세요.');
      safeRenderV108('내정 오류 복구');
    }
  },true);

  // fallback도 현재 actionMode를 존중하고 이벤트를 다시 묶는다.
  renderTerritorySelectionFallback=function(i,error){
    const id=Number(i),r=regions?.[id],orders=$('orders'),detail=$('detail');
    if(!r){refreshSelectionV108();return false}
    const yours=r.owner===player;
    if(yours)normalizeDomesticTerritoryV108(r);
    if(detail)detail.innerHTML=`<h2>${r.name}${isCapital(id)?' ★':''}</h2><p class="owner" style="color:${K[r.owner]?.color||'#ddd'}">${K[r.owner]?.name||'무소속'} · ${r.troops||0}명 주둔</p><p class="subtext">영토 정보를 안전 모드로 표시 중입니다.</p>`;
    if(orders)orders.innerHTML=yours?`${renderActions()}${actionMode==='domestic'?renderDomesticPanel(id):'<p class="subtext">행동을 선택해 주세요.</p>'}`:'<p class="subtext">상대 영토입니다. 아군 영토에서 침략하기를 선택하세요.</p>';
    try{bindDomesticEventsV106?.()}catch(_e){}
    refreshSelectionV108();
    if(error)console.error('[삼국쟁패][v108] 영토 UI 안전모드',error);
    return true;
  };

  // 이미 선택된 아군 영토가 있다면 패치 로딩 직후도 즉시 정상화한다.
  const initial=selectedTerritoryV108({owned:false,notifyOnFail:false});
  if(initial&&initial.territory.owner===player){
    normalizeDomesticTerritoryV108(initial.territory);
    actionMode='domestic';
    if(typeof domesticPanelTabV106!=='undefined')domesticPanelTabV106='recruit';
  }
  refreshSelectionV108(true);
})();

// =============================================================================
// v110 INVASION / END TURN RECOVERY HOTFIX
// 원인 정리
// 1) v109의 공격 capture handler가 기존 침략 엔진을 우회해 별도 검증/렌더 경로를 만들면서
//    render() 내부 예외까지 "침략 명령 오류"로 오인했다.
// 2) v109 handleEndTurn은 기존 transactional endTurn 바깥에서 다시 try/catch 하여,
//    코어 처리가 성공한 뒤 finally의 render()만 실패해도 "턴 종료 오류"를 표시했다.
// 3) 실제 게임의 기존 침략/턴 엔진은 이미 상태 검증/롤백을 갖고 있으므로,
//    v110은 코어 로직을 재작성하지 않고 이벤트 연결 + 렌더 예외 격리 + busy 복구만 담당한다.
// =============================================================================
(function installCombatTurnRecoveryV110(){
  if(window.__SAMGUK_V110_COMBAT_TURN_FIX__)return;
  window.__SAMGUK_V110_COMBAT_TURN_FIX__=true;

  const VERSION=110;
  const PREFIX='[삼국쟁패][v110]';
  let endTurnInFlight=false;

  function v110Notify(message){
    try{if(typeof notify==='function'){notify(message);return}}catch(_e){}
    try{window.alert?.(message)}catch(_e){}
  }

  function v110State(extra={}){
    return {
      playing:!!playing,
      busy:!!busy,
      turnProcessing:typeof turnProcessing!=='undefined'?!!turnProcessing:false,
      stage:typeof turnProcessingStage!=='undefined'?turnProcessingStage:'unknown',
      turn,ap,player,selected,target,actionMode,attackType,
      invasionActive:!!lightweightInvasionState?.active,
      invasionLaunching:!!lightweightInvasionState?.launching,
      ...extra
    };
  }

  function normalizeSelectionV110(){
    if(selected===null||selected===undefined)return;
    const id=Number(selected);
    if(!Number.isInteger(id)||!regions?.[id]||(typeof isActiveTerritory==='function'&&!isActiveTerritory(id))){
      selected=null;target=null;actionMode='inspect';attackType=null;return;
    }
    if(!K?.[regions[id].owner]){
      console.warn(`${PREFIX}[STATE] 유효하지 않은 owner를 가진 선택 영토 해제`,{id,owner:regions[id].owner});
      selected=null;target=null;actionMode='inspect';attackType=null;
    }
  }

  // -------------------------------------------------------------------------
  // A. render() 예외 격리
  // 공격/턴 로직의 성공 여부와 UI 렌더 실패를 분리한다.
  // -------------------------------------------------------------------------
  const renderCoreV110=render;
  render=function renderV110(){
    normalizeSelectionV110();
    try{
      return renderCoreV110.apply(this,arguments);
    }catch(error){
      console.error(`${PREFIX}[RENDER] UI 렌더 예외 격리`,error,v110State());
      try{
        const hasSelection=selected!==null&&selected!==undefined&&selected!=='';
        const id=hasSelection?Number(selected):NaN;
        if(Number.isInteger(id)&&regions?.[id]&&typeof renderTerritorySelectionFallback==='function'){
          renderTerritorySelectionFallback(id,error);
        }else{
          const orders=document.getElementById('orders');
          const detail=document.getElementById('detail');
          if(orders)orders.innerHTML='영토를 선택하면 행동할 수 있습니다.';
          if(detail)detail.innerHTML='<h2>영토를 선택하세요</h2><p class="subtext">지도에서 영토를 다시 선택해 주세요.</p>';
        }
      }catch(fallbackError){
        console.error(`${PREFIX}[RENDER] fallback 실패`,fallbackError);
      }
      try{updateMapDynamicState?.({force:true})}catch(_e){}
      return false;
    }
  };
  window.renderGameV110=render;

  // -------------------------------------------------------------------------
  // B. 공격 대상 계산 가드
  // 오래된/비활성 인접 ID 하나 때문에 침략 UI 전체가 죽지 않도록 한다.
  // -------------------------------------------------------------------------
  const eligibleTargetCoreV110=eligibleTarget;
  eligibleTarget=function eligibleTargetV110(i){
    const id=Number(i),src=Number(selected);
    if(!Number.isInteger(id)||!regions?.[id]||(typeof isActiveTerritory==='function'&&!isActiveTerritory(id)))return false;
    if(!Number.isInteger(src)||!regions?.[src]||(typeof isActiveTerritory==='function'&&!isActiveTerritory(src)))return false;
    try{return !!eligibleTargetCoreV110(id)}
    catch(error){console.warn(`${PREFIX}[ATTACK] 대상 판정 스킵`,{id,src,error});return false}
  };

  const hasSiegeTargetCoreV110=hasSiegeTarget;
  hasSiegeTarget=function hasSiegeTargetV110(i,k=player){
    const id=Number(i);
    if(!Number.isInteger(id)||!regions?.[id]||!Array.isArray(neighbors?.[id]))return false;
    try{return !!hasSiegeTargetCoreV110(id,k)}catch(error){console.warn(`${PREFIX}[ATTACK] 포위 대상 계산 스킵`,error);return false}
  };

  // -------------------------------------------------------------------------
  // C. 진군 busy 잠금 복구
  // 기존 marchLand를 그대로 사용하되 예외가 밖으로 튀는 경우에만 롤백한다.
  // -------------------------------------------------------------------------
  const marchLandCoreV110=marchLand;
  marchLand=async function marchLandV110(){
    const snapshot=typeof captureTurnSnapshot==='function'?captureTurnSnapshot():null;
    console.log(`${PREFIX}[MARCH] start`,v110State());
    try{
      return await marchLandCoreV110.apply(this,arguments);
    }catch(error){
      console.error(`${PREFIX}[MARCH] 예외 · 상태 복구`,error,v110State());
      try{if(snapshot&&typeof restoreTurnSnapshot==='function')restoreTurnSnapshot(snapshot)}catch(restoreError){console.error(`${PREFIX}[MARCH] snapshot 복구 실패`,restoreError)}
      target=null;attackType=null;activeExpeditionOfficerId=null;actionMode='inspect';
      v110Notify('진군 처리 중 오류를 복구했습니다. 영토를 다시 선택해 주세요.');
      return false;
    }finally{
      if(typeof turnProcessing==='undefined'||!turnProcessing)busy=false;
      try{lightweightInvasionState.launching=false;lightweightInvasionState.supporting=false}catch(_e){}
      try{render()}catch(_e){}
    }
  };

  // -------------------------------------------------------------------------
  // D. 침략하기: 기존 setAction('attack')을 그대로 호출한다.
  // v109처럼 별도 공격 상태 머신을 만들지 않는다.
  // -------------------------------------------------------------------------
  function handleAttackV110(attackerCountry=player,defenderCountry=null){
    console.log(`${PREFIX}[ATTACK] click`,v110State({attackerCountry,defenderCountry}));
    if(!playing){v110Notify('먼저 게임을 시작해 주세요.');return false}
    if(busy||(typeof turnProcessing!=='undefined'&&turnProcessing)){v110Notify('현재 다른 처리가 진행 중입니다.');return false}
    const hasSource=selected!==null&&selected!==undefined&&selected!=='';
    const sourceId=hasSource?Number(selected):NaN;
    if(!Number.isInteger(sourceId)||!regions?.[sourceId]||regions[sourceId].owner!==player){v110Notify('침략을 시작할 아군 영토를 먼저 선택해 주세요.');return false}
    if(Number(attackerCountry)!==Number(player)){v110Notify('현재 플레이어 국가에서만 직접 침략할 수 있습니다.');return false}
    try{
      const result=setAction('attack');
      // setAction은 성공 시 명시적 true를 반환하지 않는 기존 API다.
      // 실제 상태가 attack 또는 lightweight invasion으로 바뀌었는지 확인한다.
      const opened=actionMode==='attack'||!!lightweightInvasionState?.active;
      console.log(`${PREFIX}[ATTACK] result`,{result,opened,...v110State()});
      if(!opened&&typeof territoryCanAttack==='function'&&!territoryCanAttack(sourceId))return false;
      return opened;
    }catch(error){
      console.error(`${PREFIX}[ATTACK] 기존 침략 엔진 호출 오류`,error,v110State());
      busy=false;
      try{render()}catch(_e){}
      v110Notify('침략 화면을 열지 못했습니다. 영토를 다시 선택한 뒤 시도해 주세요.');
      return false;
    }
  }
  window.handleAttack=handleAttackV110;

  // -------------------------------------------------------------------------
  // E. 턴 종료: 기존 transactional endTurn을 한 번만 호출한다.
  // 렌더 실패와 턴 로직 실패를 분리하고 finally에서 잠금만 정리한다.
  // -------------------------------------------------------------------------
  const endTurnCoreV110=endTurn;
  async function handleEndTurnV110(){
    if(endTurnInFlight){console.warn(`${PREFIX}[TURN] 중복 클릭 차단`);return false}
    if(!playing){v110Notify('먼저 게임을 시작해 주세요.');return false}
    if(typeof turnProcessing!=='undefined'&&turnProcessing){console.warn(`${PREFIX}[TURN] 이미 처리 중`,v110State());return false}
    if(busy){
      console.warn(`${PREFIX}[TURN] stale busy 검사`,v110State());
      // 실제 침략/이동 플래그가 없고 턴 처리도 아니면 과거 예외가 남긴 stale lock으로 판단한다.
      const realInvasionBusy=!!lightweightInvasionState?.launching||!!lightweightInvasionState?.supporting;
      if(realInvasionBusy){v110Notify('현재 이동 또는 전투 처리가 진행 중입니다.');return false}
      busy=false;
      console.warn(`${PREFIX}[TURN] stale busy 자동 해제`);
    }

    endTurnInFlight=true;
    const before=turn;
    console.log(`${PREFIX}[TURN] start`,v110State({before}));
    try{
      const result=await endTurnCoreV110();
      console.log(`${PREFIX}[TURN] core result`,{result,before,after:turn,...v110State()});
      // 기존 코어가 false를 반환하면 자체 롤백/알림이 이미 수행되었다.
      return result!==false;
    }catch(error){
      console.error(`${PREFIX}[TURN] 코어 밖 예외 격리`,error,v110State());
      // 코어 finally의 UI 렌더 문제라면 턴 자체는 이미 성공했을 수 있다.
      if(turn>before){
        console.warn(`${PREFIX}[TURN] 턴 증가는 완료됨 · UI만 복구`,{before,after:turn});
        return true;
      }
      v110Notify('턴 처리 중 오류가 발생했습니다. 상태를 복구했으니 다시 시도해 주세요.');
      return false;
    }finally{
      endTurnInFlight=false;
      if(typeof turnProcessing==='undefined'||!turnProcessing)busy=false;
      normalizeSelectionV110();
      try{render()}catch(_e){}
      try{updateMapDynamicState?.({force:true})}catch(_e){}
      console.log(`${PREFIX}[TURN] finish`,v110State());
    }
  }
  window.handleEndTurn=handleEndTurnV110;
  endTurn=handleEndTurnV110;

  // -------------------------------------------------------------------------
  // F. 버튼 이벤트 재바인딩
  // -------------------------------------------------------------------------
  function bindEventsV110(){
    const endButton=document.getElementById('end');
    if(endButton&&endButton.dataset.v110Bound!=='1'){
      endButton.dataset.v110Bound='1';
      endButton.onclick=null;
      endButton.addEventListener('click',function(event){
        event.preventDefault();
        handleEndTurnV110();
      });
    }

    if(document.documentElement.dataset.v110AttackBound!=='1'){
      document.documentElement.dataset.v110AttackBound='1';
      document.addEventListener('click',function(event){
        const button=event.target?.closest?.('#orders button[data-mode="attack"],#detail button[data-mode="attack"]');
        if(!button||button.disabled)return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        handleAttackV110(player,null);
      },true);
    }
    console.log(`${PREFIX} 이벤트 바인딩 완료`,{end:!!endButton,attack:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindEventsV110,{once:true});
  else bindEventsV110();

  window.SAMGUK_COMBAT_TURN_HOTFIX={
    version:VERSION,
    handleAttack:handleAttackV110,
    handleEndTurn:handleEndTurnV110,
    bind:bindEventsV110,
    getState:()=>v110State(),
    recoverUiLock(){
      if(typeof turnProcessing!=='undefined'&&turnProcessing)return false;
      busy=false;
      try{lightweightInvasionState.launching=false;lightweightInvasionState.supporting=false}catch(_e){}
      try{render()}catch(_e){}
      return true;
    }
  };
})();
// ============================================================================
// v112 HOTFIX — 내정 / 모병 / 건설 통합 복구 + 상태/이벤트 감사
// - v106/v108 이벤트 중첩을 단일 브리지로 통합
// - 건설 AP 실제 비용(0.6~1.0)과 UI disabled 조건 동기화
// - 모병/건설 silent return 제거, 명시적 사유 표시
// - 구형 세이브 buildings 스키마 자동 보정
// - 관문 영토 건설/도시증축 차단 회귀 복구
// - stale target/attackType 정리 및 action rollback
// ============================================================================
(function installDomesticRecruitBuildV111(){
  'use strict';
  const VERSION='v112';
  const PREFIX='[삼국쟁패][v112]';

  const notifyV111=(msg)=>{try{notify(String(msg))}catch(_e){console.warn(PREFIX,msg)}};
  const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const clone=(v)=>{try{return structuredClone(v)}catch(_e){try{return JSON.parse(JSON.stringify(v))}catch(_e2){return v}}};
  const attr=(v)=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function buildingDefaultsV111(){
    try{return window.SAMGUK_BUILDING_DATA?.createInitialState?.()||{}}
    catch(_e){return {}}
  }

  function normalizeRegionV111(region){
    if(!region||typeof region!=='object')return region;
    const old=region.buildings&&typeof region.buildings==='object'&&!Array.isArray(region.buildings)?region.buildings:{};
    const defaults=buildingDefaultsV111();
    region.buildings={...defaults,...old};
    try{
      const defs=window.SAMGUK_BUILDING_DATA?.BUILDINGS||window.SAMGUK_BUILDING_DATA?.DEFINITIONS||window.SAMGUK_BUILDING_DATA?.definitions||{};
      for(const [key,def] of Object.entries(defs||{})){
        if((def?.maxLevel||1)>1)region.buildings[key]=Math.max(0,Math.floor(n(region.buildings[key],0)));
        else region.buildings[key]=!!region.buildings[key];
      }
    }catch(_e){}
    if(!region.domestic||typeof region.domestic!=='object'||Array.isArray(region.domestic))region.domestic={};
    if(!Number.isFinite(Number(region.troops)))region.troops=0;
    if(region.draftCarry===undefined||region.draftCarry===null)region.draftCarry=0;
    return region;
  }

  function normalizeAllRegionsV111(){
    try{if(Array.isArray(regions))regions.forEach(normalizeRegionV111)}catch(error){console.warn(PREFIX,'영토 스키마 보정 실패',error)}
  }

  function selectedContextV111({owned=true,notifyOnFail=false}={}){
    const fail=(m)=>{if(notifyOnFail)notifyV111(m);return null};
    if(!playing)return fail('먼저 게임을 시작해 주세요.');
    // v112: Number(null) === 0 때문에 미선택 상태가 0번 영토로 오인되던 버그 차단.
    const hasSelection=selected!==null&&selected!==undefined&&selected!=='';
    if(!hasSelection)return fail('영토를 먼저 선택해 주세요.');
    const id=Number(selected);
    if(!Number.isInteger(id)||!regions?.[id])return fail('영토를 먼저 선택해 주세요.');
    if(typeof isActiveTerritory==='function'&&!isActiveTerritory(id))return fail('선택한 영토는 현재 사용할 수 없습니다.');
    const territory=normalizeRegionV111(regions[id]);
    if(owned&&territory.owner!==player)return fail('내정·모병·건설은 자신의 영토에서만 가능합니다.');
    return {id,territory};
  }

  function clearCombatSelectionV111(){
    target=null;
    attackType=null;
    try{activeExpeditionOfficerId=null}catch(_e){}
    try{
      if(typeof clearLightweightInvasionClasses==='function')clearLightweightInvasionClasses();
      if(typeof lightweightInvasionState==='object'&&lightweightInvasionState){
        lightweightInvasionState.active=false;
        lightweightInvasionState.launching=false;
        lightweightInvasionState.supporting=false;
        lightweightInvasionState.targets=[];
        lightweightInvasionState.targetId=null;
        lightweightInvasionState.sourceId=null;
      }
    }catch(_e){}
  }

  function safeRenderV111(reason='UI 갱신'){
    normalizeAllRegionsV111();
    // v112: 오래된 저장/실패한 액션이 남긴 잘못된 domestic 상태를 렌더 전에 정리한다.
    const hasSelection=selected!==null&&selected!==undefined&&selected!=='';
    const sid=hasSelection?Number(selected):NaN;
    if(actionMode==='domestic'&&(!Number.isInteger(sid)||!regions?.[sid]||regions[sid].owner!==player)){
      actionMode='inspect';target=null;attackType=null;
    }
    try{return render()}
    catch(error){console.error(`${PREFIX}[RENDER] ${reason}`,error);try{if(typeof updateMapDynamicState==='function')updateMapDynamicState({force:true})}catch(_e){};return false}
  }

  // ------------------------------------------------------------------------
  // 1) 구형 세이브/초기 상태 정규화 + 관문 회귀 복구
  // ------------------------------------------------------------------------
  normalizeAllRegionsV111();

  const canBuildAtCoreV111=typeof canBuildAt==='function'?canBuildAt:null;
  if(canBuildAtCoreV111){
    canBuildAt=function canBuildAtV111(i,type){
      const id=Number(i);
      if(!Number.isInteger(id)||!regions?.[id])return false;
      normalizeRegionV111(regions[id]);
      if(typeof isPassTerritory==='function'&&isPassTerritory(id))return false;
      try{return !!canBuildAtCoreV111(id,type)}catch(error){console.warn(PREFIX,'건설 가능 판정 실패',{id,type,error});return false}
    };
  }

  const cityCanUpgradeCoreV111=typeof cityCanUpgrade==='function'?cityCanUpgrade:null;
  if(cityCanUpgradeCoreV111){
    cityCanUpgrade=function cityCanUpgradeV111(i){
      const id=Number(i);
      if(!Number.isInteger(id)||!regions?.[id])return false;
      if(typeof isPassTerritory==='function'&&isPassTerritory(id))return false;
      try{return !!cityCanUpgradeCoreV111(id)}catch(error){console.warn(PREFIX,'도시 증축 판정 실패',error);return false}
    };
  }

  // ------------------------------------------------------------------------
  // 2) 건설 UI / 실행 로직 단일화
  // ------------------------------------------------------------------------
  function buildActionCostV111(i){
    try{return Math.max(0.01,n(constructionActionCost(i),1))}catch(_e){return 1}
  }

  function buildingReasonV111(i,key){
    const r=regions?.[i];
    if(!r)return '영토 정보 없음';
    if(typeof isPassTerritory==='function'&&isPassTerritory(i))return '관문 영토에는 건물을 건설할 수 없습니다.';
    if(r.owner!==player)return '자신의 영토가 아닙니다.';
    if(!playing)return '게임이 시작되지 않았습니다.';
    if(busy)return '다른 처리가 진행 중입니다.';
    const max=typeof maxBuildingLevel==='function'?maxBuildingLevel(key):1;
    const level=typeof buildingLevelAt==='function'?buildingLevelAt(i,key):(r.buildings?.[key]?1:0);
    if(level>=max)return '이미 최대 단계입니다.';
    try{const lock=buildingLockState?.(i,key);if(lock?.locked)return lock.reason||'도시 단계/조건이 충족되지 않았습니다.'}catch(_e){}
    const actionCost=buildActionCostV111(i);
    if(n(ap)<actionCost-1e-9)return `행동력이 부족합니다. (필요 ${actionCost})`;
    let cost=Infinity;try{cost=n(buildingCost(i,key),Infinity)}catch(_e){}
    if(n(gold)<cost)return `금이 부족합니다. (필요 ${cost})`;
    try{if(!canBuildAt(i,key))return '현재 이 영토에는 건설할 수 없습니다.'}catch(_e){return '건설 조건을 확인할 수 없습니다.'}
    return '';
  }

  function economyTextV111(i,key,level){
    try{return typeof buildingEconomyText==='function'?buildingEconomyText(i,key,level):''}catch(_e){return ''}
  }

  function renderBuildingRowV111(i,key){
    const r=normalizeRegionV111(regions?.[i]);
    const b=BUILDINGS?.[key];
    if(!r||!b)return '';
    const def=window.SAMGUK_BUILDING_DATA?.getDefinition?.(key);
    const level=typeof buildingLevelAt==='function'?buildingLevelAt(i,key):(r.buildings[key]?1:0);
    const max=def?.maxLevel||1;
    const full=level>=max;
    const next=Math.min(max,level+1);
    let cost=0;try{cost=full?0:n(buildingCost(i,key),0)}catch(_e){}
    const actionCost=buildActionCostV111(i);
    const reason=full?'':buildingReasonV111(i,key);
    const econ=economyTextV111(i,key,full?level:next);
    let lockText='';
    try{const lock=buildingLockState?.(i,key);if(lock?.locked&&!full)lockText=`<br><span class="building-lock-reason">🔒 ${attr(lock.reason||'조건 미충족')}</span>`}catch(_e){}
    const unique=!!UNIQUE_BUILDINGS?.[key];
    const btnClass=key==='temple'?'temple-building':unique?'unique-building':'';
    const lvText=max>1?` ${level}/${max}단계`:'';
    const production=econ?`<br><span class="${econ.includes('-')?'building-upkeep':'building-production'}">${econ}</span>`:'';
    return `<div class="building-row ${level?'built':''} ${reason&&!full?'city-restricted':''}">
      <span class="building-icon" aria-hidden="true">${b.icon||'🏗️'}</span>
      <div class="building-description"><strong>${b.name||key}${lvText}</strong><small>${b.description||''}${production}${lockText}</small></div>
      ${full?`<span class="built-label">${max>1?'최대 단계':'건설됨'}</span>`:
        `<button class="${btnClass}" data-building="${attr(key)}" ${reason?'disabled':''} title="${attr(reason||`${cost}금 · 행동 ${actionCost}`)}" aria-label="${attr(b.name||key)} ${next}단계, ${cost}금, 행동 ${actionCost}">${cost}금<br><small>${reason?'건설 불가':level?'업그레이드':'건설'} · AP ${actionCost}</small></button>`}
    </div>`;
  }

  renderBuildings=function renderBuildingsV111(i){
    const id=Number(i),r=normalizeRegionV111(regions?.[id]);
    if(!r)return '<section class="buildings"><p class="subtext">영토 정보를 불러올 수 없습니다.</p></section>';
    if(typeof isPassTerritory==='function'&&isPassTerritory(id))return `<section class="buildings"><div class="section-title">영토 시설</div><div class="economy-summary"><b>관문 영토</b><br>산해관은 특수 관문 영토이므로 건물·시설 건설 및 도시 증축이 불가능합니다.</div></section>`;
    const type=typeof cityTypeOf==='function'?cityTypeOf(id):(r.cityType||'normal');
    const lv=typeof cityLevelOf==='function'?cityLevelOf(id):n(r.cityLevel,0);
    const baseKeys=Array.isArray(BASE_BUILDING_ORDER)?BASE_BUILDING_ORDER:[];
    const cityKeys=type==='normal'?[]:(CITY_BUILDING_ORDER?.[type]||[]);
    const uniqueKeys=Object.keys(UNIQUE_BUILDINGS||{}).filter(k=>r.buildings?.[k]||(()=>{try{return uniqueBuildAllowed(id,k)}catch(_e){return false}})());
    const primary=baseKeys.map(k=>renderBuildingRowV111(id,k)).join('');
    const cityRows=cityKeys.map(k=>renderBuildingRowV111(id,k)).join('');
    const uniqueRows=uniqueKeys.map(k=>renderBuildingRowV111(id,k)).join('');
    let cityNote='';
    try{
      if(type==='normal')cityNote='<div class="economy-summary"><b>전문도시 성장</b><br>도시증축 메뉴에서 상업·군사·농업도시를 선택할 수 있습니다. 상위 건물은 III에서 해금됩니다.</div>';
      else if(type==='port')cityNote=`<div class="economy-summary"><b>⚓ 항구도시 ${cityLevelLabel(id)}</b><br>해안 전용 특화도시입니다.</div>`;
      else cityNote=`<div class="economy-summary"><b>${CITY_TYPES?.[type]?.icon||'🏙️'} ${CITY_TYPES?.[type]?.label||type} ${cityLevelLabel?.(id)||lv}</b><br>${lv<(GAME_BALANCE?.city?.maxLevel||3)?'상위 건물은 III 완성 후 해금':'상위 건물 해금 완료'}</div>`;
    }catch(_e){}
    let summary='';
    try{
      const preview=TURN_ECONOMY?.previewCountry?.(r.owner);
      if(preview)summary=`<div class="economy-summary"><b>국가 턴 정산 예상</b><br>금 ${n(preview.grossGold).toFixed(1)} 생산 / ${n(preview.upkeepGold).toFixed(1)} 유지 · 병량 +${n(preview.foodProduction)} / -${n(preview.upkeepFood)} · 국책 +${n(preview.policyProduction)}</div>`;
    }catch(error){console.warn(PREFIX,'경제 미리보기 생략',error)}
    return `<section class="buildings"><div class="section-title">영토 시설 <span>${typeof isCapital==='function'&&isCapital(id)?'수도 · 건설비 50% 할인':'건설 AP는 담당관 능력에 따라 감소 가능'}</span></div>${primary}${cityNote}${cityRows}${uniqueRows}${summary}<p class="subtext">건설 버튼의 AP 표시는 실제 소모 행동력과 동일합니다.</p></section>`;
  };

  const performBuildCurrentV111=typeof performBuild==='function'?performBuild:null;
  buildBuilding=function buildBuildingV111(type){
    const ctx=selectedContextV111({owned:true,notifyOnFail:true});
    if(!ctx)return false;
    if(busy){notifyV111('현재 다른 처리가 진행 중입니다.');return false}
    clearCombatSelectionV111();
    actionMode='domestic';
    const {id,territory:r}=ctx;
    const key=String(type||'');
    if(!key||!BUILDINGS?.[key]){notifyV111('알 수 없는 건설 항목입니다.');safeRenderV111('건설 항목 검증');return false}
    const reason=buildingReasonV111(id,key);
    if(reason){notifyV111(reason);safeRenderV111('건설 조건 표시');return false}
    if(!performBuildCurrentV111){notifyV111('건설 처리 함수를 찾지 못했습니다.');return false}
    const actionCost=buildActionCostV111(id);
    const before={ap:n(ap),gold:n(gold),kgold:n(K?.[player]?.gold),buildings:clone(r.buildings)};
    let committed=false;
    try{
      const ok=performBuildCurrentV111(id,key,player,1);
      if(!ok){notifyV111('건설 조건이 충족되지 않았습니다.');safeRenderV111('건설 미실행');return false}
      ap=Math.max(0,Math.round((n(ap)-actionCost)*100)/100);
      committed=true;
    }catch(error){
      console.error(PREFIX,'건설 실행 오류',error,{id,key});
      r.buildings=before.buildings;
      ap=before.ap;
      try{setCountryGold(player,before.gold)}catch(_e){gold=before.gold;if(K?.[player])K[player].gold=before.kgold}
      notifyV111('건설 처리 중 오류가 발생해 이전 상태로 복구했습니다.');
      safeRenderV111('건설 오류 복구');
      return false;
    }
    if(committed){
      try{
        const name=BUILDINGS?.[key]?.name||key;
        const level=typeof buildingLevelAt==='function'?buildingLevelAt(id,key):1;
        log(`${r.name} · ${name}${(typeof maxBuildingLevel==='function'&&maxBuildingLevel(key)>1)?' '+level+'단계':''} 건설 완료 · 행동 ${actionCost}`);
      }catch(_e){}
      safeRenderV111('건설 완료');
      console.log(PREFIX,'건설 완료',{id,key,actionCost,ap,gold});
      return true;
    }
    return false;
  };

  // ------------------------------------------------------------------------
  // 3) 모병 UI / 실행 가드 + silent return 제거
  // ------------------------------------------------------------------------
  function recruitSpecV111(i,type){
    const r=normalizeRegionV111(regions?.[i]);
    if(!r)return null;
    const owner=r.owner;
    let key=type;
    if(type==='cavalry')key=typeof cavalryType==='function'?cavalryType(owner):'cavalry';
    let amount=0,cost=Infinity,foodCost=0,unlocked=true,label=UNIT_NAMES?.[key]||key;
    try{
      if(type==='infantry'){
        key='infantry';label=UNIT_NAMES?.infantry||'보병';amount=Math.max(0,n(recruitAmount(i,false),0));cost=n(recruitmentCost(i,20,false,'infantry'),Infinity);foodCost=n(unitRecruitFoodCost('infantry',i),0);
      }else if(type==='cavalry'){
        amount=Math.max(0,n(drafted(i,9,false,key),0));cost=n(cavalryCost(i),Infinity);foodCost=n(unitRecruitFoodCost(key,i),0);
      }else{
        const spec=SPECIAL_RECRUITS?.[key];if(!spec)return null;
        amount=Math.max(0,n(drafted(i,9,false,key),0));cost=n(specialRecruitCost(i,key),Infinity);foodCost=n(unitRecruitFoodCost(key,i),0);unlocked=!!canRecruitSpecialUnit(owner,key);label=UNIT_NAMES?.[key]||key;
      }
    }catch(error){console.warn(PREFIX,'모병 미리보기 실패',{i,type,error});return null}
    let reason='';
    if(!playing)reason='게임이 시작되지 않았습니다.';
    else if(busy)reason='다른 처리가 진행 중입니다.';
    else if(r.owner!==player)reason='자신의 영토가 아닙니다.';
    else if(n(ap)<1)reason='행동력이 부족합니다. (필요 1)';
    else if(!unlocked)reason='현재 국가/자원 조건으로 해금되지 않은 병과입니다.';
    else if(amount<1)reason='현재 보급/피로 조건에서는 모집 가능한 병력이 없습니다.';
    else if(n(gold)<cost)reason=`금이 부족합니다. (필요 ${cost})`;
    else if(n(countryFood(player))<foodCost)reason=`병량이 부족합니다. (필요 ${foodCost})`;
    return {type,key,label,amount,cost,foodCost,unlocked,reason};
  }

  function recruitButtonV111(i,type){
    const s=recruitSpecV111(i,type);if(!s)return '';
    const unique=s.type!=='infantry'&&s.type!=='cavalry'&&(typeof isNationSpecialUnit==='function'&&isNationSpecialUnit(s.key)||s.key==='ironInfantry');
    const attrs=s.type==='infantry'?'id="recruit"':s.type==='cavalry'?'id="recruitCavalry"':`data-recruit-unit="${attr(s.key)}"`;
    let desc='';
    try{desc=SPECIAL_RECRUITS?.[s.key]?.text||''}catch(_e){}
    let discount='';try{discount=typeof domesticRecruitDiscountV106==='function'?domesticRecruitDiscountV106(i,s.key):''}catch(_e){}
    return `<div class="domestic-unit-row ${unique?'unique-unit-row':''} ${s.reason?'is-locked':''}"><button class="action recruit-slot ${unique?'unique-unit':''}" ${attrs} ${s.reason?'disabled':''} title="${attr(s.reason||`${s.label} ${s.amount}명 · 금 ${s.cost} · 병량 ${s.foodCost} · 행동 1`)}"><strong>${unique?'★ ':''}${s.label} +${s.amount}명</strong><span>금 ${s.cost} · 병량 ${s.foodCost}</span></button><p class="recruit-slot-desc">${desc||'행동 1'}${discount?`<br><b>${discount}</b>`:''}${s.reason?`<br><b>${attr(s.reason)}</b>`:''}</p></div>`;
  }

  renderRecruitPanelV106=function renderRecruitPanelV111(i){
    const id=Number(i),r=normalizeRegionV111(regions?.[id]);
    if(!r)return '<div class="domestic-panel"><p class="subtext">영토 정보를 불러올 수 없습니다.</p></div>';
    const types=[];
    types.push('infantry','cavalry');
    try{
      for(const key of Object.keys(SPECIAL_RECRUITS||{})){
        if(key==='nomadCavalry'&&typeof cavalryType==='function'&&cavalryType(r.owner)==='nomadCavalry')continue;
        if(canRecruitSpecialUnit(r.owner,key)||['archers','marines','ironInfantry'].includes(key))types.push(key);
      }
    }catch(_e){}
    const seen=new Set();
    const rows=types.filter(t=>{const s=recruitSpecV111(id,t);const k=s?.key||t;if(seen.has(k))return false;seen.add(k);return true}).map(t=>recruitButtonV111(id,t)).join('');
    return `<section class="recruit-compact-list domestic-subpanel" id="domesticRecruitPanel" aria-label="병과 모집"><div class="economy-summary"><b>모병 자원</b><br>행동 ${n(ap)} · 금 ${n(gold)} · 병량 ${n(countryFood(player))}</div>${rows||'<p class="subtext">현재 모집 가능한 병과가 없습니다.</p>'}<p class="subtext">모병은 행동 1을 사용합니다. 비활성 버튼의 툴팁에서 사유를 확인할 수 있습니다.</p></section>`;
  };

  renderBuildingPanelV106=function renderBuildingPanelV111(i){return `<section class="domestic-subpanel" id="domesticBuildPanel">${renderBuildings(i)}</section>`};

  renderDomesticPanel=function renderDomesticPanelV111(i){
    const id=Number(i);
    if(!Number.isInteger(id)||!regions?.[id]||(typeof isActiveTerritory==='function'&&!isActiveTerritory(id)))return '';
    const r=normalizeRegionV111(regions[id]);
    if(!r||r.owner!==player)return '';
    const tab=domesticPanelTabV106==='build'?'build':'recruit';
    return `<section id="domesticPanelRoot" class="domestic-panel-singleton" data-domestic-panel="1"><div class="domestic-panel-head"><h3 class="mode-title domestic-mode-title">내정 · 모병 · 건설</h3><div class="domestic-subtabs" role="tablist"><button type="button" data-domestic-tab="recruit" aria-pressed="${tab==='recruit'}">⚔ 모병</button><button type="button" data-domestic-tab="build" aria-pressed="${tab==='build'}">🏗 건설</button></div></div><div id="domesticSubmenuRoot">${tab==='recruit'?renderRecruitPanelV106(id):renderBuildingPanelV106(id)}</div></section>`;
  };
  window.renderDomesticPanel=renderDomesticPanel;

  const recruitCoreV111=typeof recruit==='function'?recruit:null;
  const cavalryCoreV111=typeof recruitCavalry==='function'?recruitCavalry:null;
  const specialCoreV111=typeof recruitSpecial==='function'?recruitSpecial:null;

  function unitSnapshotV111(r){
    const values={};
    try{for(const key of UNIT_KEYS||[])values[key]=Object.prototype.hasOwnProperty.call(r,key)?r[key]:undefined}catch(_e){}
    return {troops:n(r.troops),values,draftCarry:clone(r.draftCarry),ap:n(ap),gold:n(gold),kgold:n(K?.[player]?.gold),food:n(countryFood(player))};
  }
  function restoreUnitSnapshotV111(r,s){
    r.troops=s.troops;
    for(const [k,v] of Object.entries(s.values||{})){if(v===undefined)delete r[k];else r[k]=v}
    r.draftCarry=clone(s.draftCarry);
    ap=s.ap;
    try{setCountryGold(player,s.gold)}catch(_e){gold=s.gold;if(K?.[player])K[player].gold=s.kgold}
    try{setCountryFood(player,s.food)}catch(_e){if(K?.[player])K[player].food=s.food}
  }

  function executeRecruitV111(type,core){
    const ctx=selectedContextV111({owned:true,notifyOnFail:true});if(!ctx)return false;
    clearCombatSelectionV111();actionMode='domestic';
    const spec=recruitSpecV111(ctx.id,type);
    if(!spec){notifyV111('모병 정보를 계산하지 못했습니다.');return false}
    if(spec.reason){notifyV111(spec.reason);safeRenderV111('모병 조건 표시');return false}
    if(typeof core!=='function'){notifyV111('모병 처리 함수를 찾지 못했습니다.');return false}
    const before=unitSnapshotV111(ctx.territory);
    try{
      const out=core();
      const changed=n(ctx.territory.troops)!==before.troops||n(ap)!==before.ap||n(gold)!==before.gold||n(countryFood(player))!==before.food;
      if(!changed){notifyV111('모병이 실행되지 않았습니다. 현재 영토/자원/해금 조건을 확인해 주세요.');safeRenderV111('모병 미실행');return false}
      console.log(PREFIX,'모병 완료',{territory:ctx.id,type:spec.key,before,after:{troops:ctx.territory.troops,ap,gold,food:countryFood(player)}});
      // 코어 렌더가 이전 래퍼에서 격리되었더라도 최종 상태를 한 번 확정 렌더한다.
      safeRenderV111('모병 완료');
      return out===false?false:true;
    }catch(error){
      console.error(PREFIX,'모병 실행 오류',error,{id:ctx.id,type});
      restoreUnitSnapshotV111(ctx.territory,before);
      notifyV111('모병 처리 중 오류가 발생해 이전 상태로 복구했습니다.');
      safeRenderV111('모병 오류 복구');
      return false;
    }
  }

  if(recruitCoreV111)recruit=function recruitV111(){
    if(!selectedContextV111({owned:true,notifyOnFail:true}))return false;
    return executeRecruitV111('infantry',()=>recruitCoreV111())
  };
  if(cavalryCoreV111)recruitCavalry=function recruitCavalryV111(){
    if(!selectedContextV111({owned:true,notifyOnFail:true}))return false;
    return executeRecruitV111('cavalry',()=>cavalryCoreV111())
  };
  if(specialCoreV111)recruitSpecial=function recruitSpecialV111(type){
    if(!selectedContextV111({owned:true,notifyOnFail:true}))return false;
    const key=String(type||'');if(!key){notifyV111('모병할 병과를 선택해 주세요.');return false}
    return executeRecruitV111(key,()=>specialCoreV111(key))
  };

  // ------------------------------------------------------------------------
  // 4) 국내 UI 이벤트를 v108 capture의 첫 단계에서 위임받는다.
  // ------------------------------------------------------------------------
  function handleDomesticClickV111(event,button,host){
    if(!button||button.disabled||!host)return false;
    // v114: 도시증축/인사 계열은 내정 전용 capture가 가로채지 않는다.
    // 이 버튼들은 아래 v114 단일 라우터가 처리해야 기존 도시/인사 엔진과 충돌하지 않는다.
    if(button.dataset?.cityType||button.dataset?.personnelAction||button.dataset?.mode==='city'||button.dataset?.mode==='personnel')return false;
    const isMain=button.dataset?.mode==='domestic';
    const tab=button.dataset?.domesticTab;
    const buildKey=button.dataset?.building;
    const special=button.dataset?.recruitUnit;
    const infantry=button.id==='recruit';
    const cavalry=button.id==='recruitCavalry';
    const cityType=button.dataset?.cityType;
    const capitalUpgrade=button.dataset?.capitalUpgrade!==undefined;
    const handled=isMain||!!tab||!!buildKey||!!special||infantry||cavalry; // v113: 도시/수도 증축은 전용 UI 라우터가 처리
    if(!handled)return false;

    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
    const ctx=selectedContextV111({owned:true,notifyOnFail:true});if(!ctx)return true;
    if(busy){notifyV111('현재 다른 처리가 진행 중입니다.');return true}
    clearCombatSelectionV111();

    try{
      if(isMain){domesticPanelTabV106='recruit';actionMode='domestic';safeRenderV111('내정 진입');return true}
      if(tab){
        if(!['recruit','build'].includes(tab)){notifyV111('알 수 없는 내정 탭입니다.');return true}
        actionMode='domestic';domesticPanelTabV106=tab;safeRenderV111(`내정 ${domesticPanelTabV106} 탭`);return true
      }
      if(buildKey){actionMode='domestic';buildBuilding(buildKey);return true}
      if(special){actionMode='domestic';recruitSpecial(special);return true}
      if(cavalry){actionMode='domestic';recruitCavalry();return true}
      if(infantry){actionMode='domestic';recruit();return true}
      if(cityType){
        // v112: render()가 인식하지 못하는 'cityUpgrade' 상태를 만들지 않는다.
        actionMode='city';
        try{const ok=upgradeCity(cityType);if(ok===false)safeRenderV111('도시 증축 조건 표시')}catch(error){console.error(PREFIX,'도시 증축 오류',error);notifyV111('도시 증축 처리 중 오류가 발생했습니다.');safeRenderV111('도시 증축 오류')}
        return true
      }
      if(capitalUpgrade){
        // v112: 유효 actionMode는 기존 렌더 계약의 'capital'을 유지한다.
        actionMode='capital';
        try{const ok=upgradeCapital();if(ok===false)safeRenderV111('수도 증축 조건 표시')}catch(error){console.error(PREFIX,'수도 증축 오류',error);notifyV111('수도 증축 처리 중 오류가 발생했습니다.');safeRenderV111('수도 증축 오류')}
        return true
      }
    }catch(error){console.error(PREFIX,'내정 이벤트 처리 오류',error);notifyV111('내정 처리 중 오류가 발생했습니다.');safeRenderV111('내정 이벤트 오류')}
    return true;
  }

  // 프로그램 방식으로 탭을 여는 구형 코드도 동일 경로로 통합한다.
  setDomesticTabV106=function setDomesticTabV111(tab){
    if(!['recruit','build'].includes(tab)){notifyV111('알 수 없는 내정 탭입니다.');return false}
    const ctx=selectedContextV111({owned:true,notifyOnFail:true});if(!ctx)return false;
    clearCombatSelectionV111();actionMode='domestic';domesticPanelTabV106=tab;safeRenderV111(`내정 ${domesticPanelTabV106} 탭`);return true;
  };

  // 턴 시작/AI 처리 전에 오래된 buildings 상태를 최신 스키마로 맞춰
  // recruitmentCost/TurnEconomy에서 undefined buildings 접근이 나지 않게 한다.
  if(typeof validateTurnState==='function'){
    const validateTurnStateCoreV111=validateTurnState;
    validateTurnState=function validateTurnStateV111(stage){normalizeAllRegionsV111();return validateTurnStateCoreV111(stage)};
  }

  window.SAMGUK_DOMESTIC_V111={
    version:VERSION,
    captureClick:handleDomesticClickV111,
    normalizeAll:normalizeAllRegionsV111,
    normalizeRegion:normalizeRegionV111,
    render:safeRenderV111,
    state:()=>({playing,busy,selected,target,actionMode,tab:domesticPanelTabV106,ap,gold,food:typeof countryFood==='function'?countryFood(player):null})
  };
  // v108 브리지와의 하위호환을 위해 V111 이름을 유지하고, 최신 명시적 별칭도 제공한다.
  window.SAMGUK_DOMESTIC_V112=window.SAMGUK_DOMESTIC_V111;

  // v108이 없는 환경에서도 작동하도록 fallback capture를 설치한다.
  if(document.documentElement.dataset.v111DomesticFallback!=='1'){
    document.documentElement.dataset.v111DomesticFallback='1';
    document.addEventListener('click',function v111DomesticFallback(event){
      const button=event.target?.closest?.('#orders button,#detail button');
      if(!button)return;
      const host=button.closest?.('#orders,#detail');
      if(!host)return;
      // v108 브리지가 설치된 빌드에서는 v108이 먼저 위임하므로 여기까지 오지 않는다.
      handleDomesticClickV111(event,button,host);
    },true);
  }

  // render 직전에 모든 영토 스키마를 보정하여 턴 경제/내정 렌더가 오래된 세이브로 죽지 않게 한다.
  const renderBeforeNormalizeV111=render;
  render=function renderNormalizedV111(){normalizeAllRegionsV111();return renderBeforeNormalizeV111.apply(this,arguments)};

  // 게임 시작/로드 직후에도 정규화.
  if(typeof start==='function'){
    const startCoreV111=start;
    start=function startV111(){const out=startCoreV111.apply(this,arguments);normalizeAllRegionsV111();return out};
  }
  if(typeof loadGame==='function'){
    const loadGameCoreV111=loadGame;
    loadGame=function loadGameV111(){
      const out=loadGameCoreV111.apply(this,arguments);
      if(out&&typeof out.then==='function')return out.then(v=>{normalizeAllRegionsV111();safeRenderV111('불러오기 후 정규화');return v});
      normalizeAllRegionsV111();safeRenderV111('불러오기 후 정규화');return out;
    };
  }

  console.log(`${PREFIX} 내정·모병·건설 통합 복구 적용 완료`,window.SAMGUK_DOMESTIC_V111.state());
})();



// ============================================================================
// v113 HOTFIX — 도시 증축 / 인사 / 턴 종료 통합 안정화
// - v106/v108/v112 capture 체인에서 city/personnel 이벤트가 유실되는 문제를 최종 라우터로 차단
// - Personnel runtime 재연결 및 버튼 직접 위임
// - city/capital 버튼은 기존 검증/비용 엔진을 그대로 사용
// ============================================================================
(function installCityPersonnelTurnV113(){
 'use strict';
 if(window.__SAMGUK_V113_CITY_PERSONNEL_TURN__)return;window.__SAMGUK_V113_CITY_PERSONNEL_TURN__=true;
 const PREFIX='[삼국쟁패][v113]';
 const notice=m=>{try{notify(String(m))}catch(_e){console.warn(PREFIX,m)}};
 function selectedOwn(){const has=selected!==null&&selected!==undefined&&selected!=='';const i=has?Number(selected):NaN;if(!playing||busy||!Number.isInteger(i)||!regions?.[i]||(typeof isActiveTerritory==='function'&&!isActiveTerritory(i))||regions[i].owner!==player)return null;return i}
 function safeRender(reason){try{render();return true}catch(error){console.error(PREFIX,reason,error);try{updateMapDynamicState?.({force:true})}catch(_e){}return false}}
 function openCity(){const i=selectedOwn();if(i===null){notice('도시 증축할 아군 영토를 먼저 선택해 주세요.');return false}if(isCapital(i)){notice('수도는 도시 증축이 아니라 수도 증축을 사용합니다.');return false}/* v117: 전문도시가 최고 단계여도 토성 관리/재건축을 위해 도시증축 탭 진입을 허용한다. */target=null;attackType=null;actionMode='city';return safeRender('도시 증축 탭 렌더 오류')}
 function openCapital(){const i=selectedOwn();if(i===null)return false;if(!isUpgradeableCapitalFor(i,player)){notice('이 영토에서는 수도 증축을 할 수 없습니다.');return false}target=null;attackType=null;actionMode='capital';return safeRender('수도 증축 탭 렌더 오류')}
 function configurePersonnel(){const sys=window.SAMGUK_PERSONNEL_SYSTEM;if(!sys?.configureRuntime)return false;try{sys.configureRuntime({getPlayer:()=>player,getGold:()=>gold,setGold:v=>setCountryGold(player,v),getOfficers:()=>OFFICERS,getPlayerOfficers:()=>OFFICERS.filter(o=>officerOwner(o)===player),getPlayerFactionName:()=>K?.[player]?.name||'아군',getPlayerFactionColor:()=>K?.[player]?.color||'#caa85a',getCaptives:()=>captivesHeldBy(player),getCaptivePreview:o=>captivePreview(o,player),captiveAction:(id,action)=>handleCaptiveAction(id,action,player),getFactionName:k=>K?.[Number(k)]?.name||'무소속',renderOfficerPortrait:(officer,size)=>officerPortraitSvg(officer,size),officerOwner,getRegionName:i=>regions?.[Number(i)]?.name||WORLD.territories?.[Number(i)]?.name||'',hasRecruitOffice:i=>regions?.[Number(i)]?.owner===player&&buildingLevelAt(Number(i),'talentOffice')>0&&buildingOperational(Number(i),'talentOffice'),addOfficer:addRecruitedOfficerV37,notify,log,render:()=>safeRender('인사 시스템 렌더 오류'),openOfficerDetail});return true}catch(error){console.error(PREFIX,'인사 runtime 연결 실패',error);return false}}
 function openPersonnel(){const i=selectedOwn();if(i===null){notice('인사를 진행할 아군 영토를 먼저 선택해 주세요.');return false}configurePersonnel();target=null;attackType=null;actionMode='personnel';return safeRender('인사 탭 렌더 오류')}
 function personnelAction(action){const sys=window.SAMGUK_PERSONNEL_SYSTEM;if(!configurePersonnel()||!sys)return false;try{if(action==='list'){sys.openList?.();return true}if(action==='search'){return sys.search?.(selected)!==false}if(action==='captives'){sys.openCaptives?.();return true}}catch(error){console.error(PREFIX,'인사 액션 오류',action,error);notice('인사 처리 중 오류가 발생했습니다.');return false}return false}

 // 기존 bubble onclick을 다시 묶어 동적 innerHTML 교체 후에도 유지한다.
 const legacyDispatch=typeof dispatchDomesticActionV106==='function'?dispatchDomesticActionV106:null;
 function router(event){const b=event.target?.closest?.('button');if(!b||b.disabled)return;try{
   if(b.dataset?.mode==='city'){event.preventDefault();openCity();return}
   if(b.dataset?.mode==='capital'){event.preventDefault();openCapital();return}
   if(b.dataset?.mode==='personnel'){event.preventDefault();openPersonnel();return}
   if(b.dataset?.personnelAction){event.preventDefault();personnelAction(b.dataset.personnelAction);return}
   if(b.dataset?.cityType){event.preventDefault();const i=selectedOwn();if(i===null)return;actionMode='city';const ok=upgradeCity(b.dataset.cityType);if(ok===false)safeRender('도시 증축 조건 갱신');return}
   if(b.dataset?.capitalUpgrade!==undefined){event.preventDefault();const i=selectedOwn();if(i===null)return;actionMode='capital';const ok=upgradeCapital();if(ok===false)safeRender('수도 증축 조건 갱신');return}
   legacyDispatch?.(event);
  }catch(error){console.error(PREFIX,'UI 라우터 오류',error);notice('메뉴 처리 중 오류가 발생했습니다.');safeRender('UI 라우터 복구')}}
 bindDomesticEventsV106=function bindDomesticEventsV113(){const orders=document.getElementById('orders'),detail=document.getElementById('detail');if(orders){orders.onclick=router;orders.dataset.domesticDelegation='v113'}if(detail){detail.onclick=router;detail.dataset.domesticDelegation='v113'}return true};
 bindDomesticEventsV106();configurePersonnel();
 // 인사 액션은 inline handler 유무와 상관없이 capture에서 보장한다. cityType은 v112 handler에서 제외되어 bubble router로 전달된다.
 if(false&&document.documentElement.dataset.v113PersonnelCapture!=='1'){document.documentElement.dataset.v113PersonnelCapture='1';document.addEventListener('click',event=>{const b=event.target?.closest?.('#orders button[data-personnel-action],#detail button[data-personnel-action]');if(!b||b.disabled)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();personnelAction(b.dataset.personnelAction)},true)} // v114: legacy personnel capture disabled; v114 single router owns these buttons.
 window.SAMGUK_UI_V113={version:113,openCity,openCapital,openPersonnel,personnelAction,bind:bindDomesticEventsV106,state:()=>({selected,actionMode,busy,turn,stage:typeof turnProcessingStage!=='undefined'?turnProcessingStage:null})};
 console.log(PREFIX,'도시 증축·인사·턴 종료 안정화 적용 완료');
})();


// ============================================================================
// v114 HOTFIX — 도시증축 / 인사 완전 복구
// 원인:
// 1) v108 -> v111 문서 capture 브리지가 data-city-type 버튼까지 '내정 버튼'으로 선점하고
//    stopImmediatePropagation()을 호출하여, 최신 도시증축 라우터까지 이벤트가 도달하지 못했다.
// 2) 도시/인사 탭은 여러 세대의 #orders.onclick / document capture가 혼재하여
//    render()로 DOM이 교체된 뒤 이벤트 경로가 버전별로 달라질 수 있었다.
// 3) 인사 패널은 Personnel runtime 연결 실패 시 render 전체가 중단될 여지가 있었다.
// 해결:
// - 도시/인사만 담당하는 단일 v114 capture 라우터를 설치한다.
// - 도시/인사 패널 렌더를 예외 격리하고, 실패 시 독립 fallback UI를 표시한다.
// - 기존 upgradeCity / PersonnelSystem.search/openList 엔진은 그대로 재사용한다.
// ============================================================================
(function installCityPersonnelRestoreV114(){
 'use strict';
 if(window.__SAMGUK_V114_CITY_PERSONNEL_RESTORE__)return;
 window.__SAMGUK_V114_CITY_PERSONNEL_RESTORE__=true;
 const PREFIX='[삼국쟁패][v114]';
 const notice=m=>{try{notify(String(m))}catch(_e){console.warn(PREFIX,m)}};
 const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

 function ownSelected(){
  const has=selected!==null&&selected!==undefined&&selected!=='';
  const i=has?Number(selected):NaN;
  if(!playing)return {ok:false,reason:'먼저 게임을 시작해 주세요.'};
  if(busy)return {ok:false,reason:'현재 다른 처리가 진행 중입니다.'};
  if(!Number.isInteger(i)||!regions?.[i])return {ok:false,reason:'아군 영토를 먼저 선택해 주세요.'};
  if(typeof isActiveTerritory==='function'&&!isActiveTerritory(i))return {ok:false,reason:'선택한 영토는 현재 사용할 수 없습니다.'};
  if(regions[i].owner!==player)return {ok:false,reason:'자신의 영토에서만 사용할 수 있습니다.'};
  return {ok:true,i,r:regions[i]};
 }

 function configurePersonnelV114(){
  const sys=window.SAMGUK_PERSONNEL_SYSTEM;
  if(!sys?.configureRuntime)return false;
  try{
   sys.configureRuntime({
    getPlayer:()=>player,
    getGold:()=>Number(gold)||0,
    setGold:v=>{const n=Math.max(0,Number(v)||0);try{setCountryGold(player,n)}catch(_e){gold=n;if(K?.[player])K[player].gold=n}},
    getOfficers:()=>Array.isArray(OFFICERS)?OFFICERS:[],
    getPlayerOfficers:()=>Array.isArray(OFFICERS)?OFFICERS.filter(o=>officerOwner(o)===player):[],
    getPlayerFactionName:()=>K?.[player]?.name||'아군',
    getPlayerFactionColor:()=>K?.[player]?.color||'#caa85a',
    getCaptives:()=>typeof captivesHeldBy==='function'?captivesHeldBy(player):[],
    getCaptivePreview:o=>typeof captivePreview==='function'?captivePreview(o,player):{},
    captiveAction:(id,action)=>typeof handleCaptiveAction==='function'?handleCaptiveAction(id,action,player):{ok:false,message:'포로 시스템을 사용할 수 없습니다.'},
    getFactionName:k=>K?.[Number(k)]?.name||'무소속',
    renderOfficerPortrait:(officer,size)=>typeof officerPortraitSvg==='function'?officerPortraitSvg(officer,size):'',
    officerOwner:o=>typeof officerOwner==='function'?officerOwner(o):null,
    getRegionName:i=>regions?.[Number(i)]?.name||WORLD?.territories?.[Number(i)]?.name||'',
    hasRecruitOffice:i=>{
     const id=Number(i);if(!Number.isInteger(id)||regions?.[id]?.owner!==player)return false;
     try{return (typeof buildingLevelAt==='function'?buildingLevelAt(id,'talentOffice'):0)>0&&(typeof buildingOperational!=='function'||buildingOperational(id,'talentOffice'))}
     catch(_e){return false}
    },
    addOfficer:data=>typeof addRecruitedOfficerV37==='function'?addRecruitedOfficerV37(data):false,
    notify:m=>notice(m),
    log:m=>{try{log(m)}catch(_e){}},
    render:()=>safeRenderV114('인사 시스템 갱신'),
    openOfficerDetail:id=>{try{openOfficerDetail(id)}catch(error){console.error(PREFIX,'장수 상세 열기 실패',error)}}
   });
   return true;
  }catch(error){console.error(PREFIX,'Personnel runtime 연결 실패',error);return false}
 }

 function fallbackCityPanel(i){
  const r=regions?.[i];if(!r)return '<p class="subtext">도시 정보를 불러올 수 없습니다.</p>';
  const type=typeof cityTypeOf==='function'?cityTypeOf(i):(r.cityType||'normal');
  const lv=typeof cityLevelOf==='function'?cityLevelOf(i):(Number(r.cityLevel)||0);
  if(type!=='normal'){
   const c=CITY_TYPES?.[type]||{icon:'🏙️',label:type};
   return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축</h3><p class="subtext">${c.icon||''} ${esc(c.label)} ${typeof cityLevelLabel==='function'?esc(cityLevelLabel(i)):lv} 상태입니다.</p>${typeof renderCityUpgradeUI==='function'?'':'<p class="subtext">도시 증축 엔진을 다시 불러와 주세요.</p>'}</div>`;
  }
  let cost=0;try{cost=typeof cityUpgradeCost==='function'?cityUpgradeCost(i,1):0}catch(_e){}
  const steppe=typeof isSteppeTerrain==='function'&&isSteppeTerrain(i),coastal=typeof portCityAllowed==='function'?portCityAllowed(i):!!COASTAL?.has?.(i);
  const choices=[
   ['agriculture','🌾 농업도시','징집·병량 중심',steppe?'초원 지형에는 농업도시를 건설할 수 없습니다.':''],
   ['commerce','💰 상업도시','금 수입 중심',''],
   ['military','🛡️ 군사도시','방어·군사 중심',''],
   ['port','⚓ 해상도시(항구)','해안 수입·병량 중심',coastal?'':'해안 영토에서만 건설할 수 있습니다.']
  ];
  return `<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 하기</h3><p class="subtext">전문 도시를 선택하세요.${cost?` 비용 ${cost}금 · 행동 1`:''}</p><div class="city-upgrade-grid">${choices.map(([k,n,d,lock])=>`<button type="button" class="city-upgrade-btn ${k}" data-city-type="${k}" ${lock||gold<cost||ap<1?'disabled':''} title="${esc(lock)}"><strong>${n}</strong><small>${d}${lock?`<br>🔒 ${esc(lock)}`:''}</small></button>`).join('')}</div></div>`;
 }

 const cityRendererV114=typeof renderCityUpgradeUI==='function'?renderCityUpgradeUI:null;
 if(cityRendererV114){
  renderCityUpgradeUI=function renderCityUpgradeUIV114(i){
   try{const html=cityRendererV114(i);if(html)return html}
   catch(error){console.error(PREFIX,'도시증축 패널 렌더 실패 → fallback',error,{territory:i})}
   return fallbackCityPanel(Number(i));
  };
 }

 function fallbackPersonnelPanel(i){
  let hasOffice=false;try{hasOffice=typeof buildingLevelAt==='function'&&buildingLevelAt(i,'talentOffice')>0&&(!buildingOperational||buildingOperational(i,'talentOffice'))}catch(_e){}
  return `<section class="personnel-submenu"><div class="personnel-submenu-head"><div><span>人事</span><h3>인사 관리</h3></div><small>${esc(regions?.[i]?.name||'')}</small></div><div class="personnel-actions"><button type="button" data-personnel-action="list"><b>① 인재 목록</b><small>현재 아군 소속 장수 목록을 확인합니다.</small></button><button type="button" data-personnel-action="search" class="personnel-search-btn ${hasOffice?'ready':'locked'}"><b>② 인재 등용 · 50금</b><small>${hasOffice?'인재소에서 새로운 인재를 등용합니다.':'🔒 이 영지에 인재소가 필요합니다.'}</small></button><button type="button" data-personnel-action="captives"><b>③ 포로 관리</b><small>설득 · 몸값 · 석방 · 처형</small></button></div></section>`;
 }

 renderPersonnelMenuV37=function renderPersonnelMenuV114(i){
  const id=Number(i);configurePersonnelV114();
  try{const html=window.SAMGUK_PERSONNEL_SYSTEM?.renderSubmenu?.(id);if(html)return html}
  catch(error){console.error(PREFIX,'인사 패널 렌더 실패 → fallback',error,{territory:id})}
  return fallbackPersonnelPanel(id);
 };

 function ensureOrdersMode(mode,i){
  const orders=document.getElementById('orders');if(!orders)return false;
  const selector=mode==='city'?'[data-city-type]':'[data-personnel-action]';
  if(orders.querySelector(selector))return true;
  const panel=mode==='city'?renderCityUpgradeUI(i):renderPersonnelMenuV37(i);
  orders.innerHTML=`${typeof renderActions==='function'?renderActions():''}${panel}`;
  try{bindDomesticEventsV106?.()}catch(_e){}
  return !!orders.querySelector(selector);
 }

 function safeRenderV114(reason){
  try{render();return true}
  catch(error){console.error(PREFIX,reason,error);try{updateMapDynamicState?.({force:true})}catch(_e){}return false}
 }

 function openCityV114(){
  const ctx=ownSelected();if(!ctx.ok){notice(ctx.reason);return false}
  const i=ctx.i;
  if(typeof isPassTerritory==='function'&&isPassTerritory(i)){notice('관문 영토에서는 도시 증축을 할 수 없습니다.');return false}
  if(typeof isCapital==='function'&&isCapital(i)){notice('수도는 도시 증축이 아니라 수도 증축을 사용합니다.');return false}
  /* v117: 전문도시 III 완료 후에도 토성 관리/재건축을 위해 도시증축 탭 진입 허용 */
  target=null;attackType=null;actionMode='city';
  safeRenderV114('도시증축 탭 렌더 오류');
  if(!ensureOrdersMode('city',i)){notice('도시 증축 메뉴를 표시하지 못했습니다.');return false}
  console.log(PREFIX,'도시증축 탭 열림',{territory:i,name:regions[i]?.name,cityType:cityTypeOf?.(i),cityLevel:cityLevelOf?.(i)});
  return true;
 }

 function openPersonnelV114(){
  const ctx=ownSelected();if(!ctx.ok){notice(ctx.reason);return false}
  configurePersonnelV114();target=null;attackType=null;actionMode='personnel';
  safeRenderV114('인사 탭 렌더 오류');
  if(!ensureOrdersMode('personnel',ctx.i)){notice('인사 메뉴를 표시하지 못했습니다.');return false}
  console.log(PREFIX,'인사 탭 열림',{territory:ctx.i,name:regions[ctx.i]?.name});
  return true;
 }

 function doPersonnelActionV114(action){
  const ctx=ownSelected();if(!ctx.ok){notice(ctx.reason);return false}
  if(!configurePersonnelV114()){notice('인사 시스템을 불러오지 못했습니다.');return false}
  const sys=window.SAMGUK_PERSONNEL_SYSTEM;
  try{
   if(action==='list'){sys.openList?.();return true}
   if(action==='search')return sys.search?.(ctx.i)!==false
   if(action==='captives'){sys.openCaptives?.();return true}
  }catch(error){console.error(PREFIX,'인사 액션 실패',action,error);notice('인사 처리 중 오류가 발생했습니다.');return false}
  return false;
 }

 function doCityTypeV114(type){
  const ctx=ownSelected();if(!ctx.ok){notice(ctx.reason);return false}
  const t=String(type||'');if(!['agriculture','commerce','military','port'].includes(t)){notice('알 수 없는 도시 유형입니다.');return false}
  actionMode='city';target=null;attackType=null;
  try{
   const ok=upgradeCity(t);
   if(ok===false){safeRenderV114('도시 증축 조건 갱신');ensureOrdersMode('city',ctx.i)}
   return ok!==false;
  }catch(error){console.error(PREFIX,'도시 증축 실행 실패',error,{type:t,territory:ctx.i});notice('도시 증축 처리 중 오류가 발생했습니다.');safeRenderV114('도시 증축 오류 복구');ensureOrdersMode('city',ctx.i);return false}
 }

 // 최종 단일 capture 라우터. v111 내정 브리지는 위 소스 수정으로 이 네 종류를 더 이상 선점하지 않는다.
 if(document.documentElement.dataset.v114CityPersonnelCapture!=='1'){
  document.documentElement.dataset.v114CityPersonnelCapture='1';
  document.addEventListener('click',function cityPersonnelCaptureV114(event){
   const b=event.target?.closest?.('#orders button,#detail button');if(!b||b.disabled)return;
   const mode=b.dataset?.mode,cityType=b.dataset?.cityType,personnelAction=b.dataset?.personnelAction;
   if(mode!=='city'&&mode!=='personnel'&&!cityType&&!personnelAction)return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
   if(mode==='city'){openCityV114();return}
   if(mode==='personnel'){openPersonnelV114();return}
   if(cityType){doCityTypeV114(cityType);return}
   if(personnelAction){doPersonnelActionV114(personnelAction);return}
  },true);
 }

 configurePersonnelV114();
 window.SAMGUK_CITY_PERSONNEL_V114={version:114,openCity:openCityV114,openPersonnel:openPersonnelV114,cityType:doCityTypeV114,personnelAction:doPersonnelActionV114,configurePersonnel:configurePersonnelV114,state:()=>({selected,actionMode,busy,playing,city:selected!==null?cityTypeOf?.(selected):null})};
 console.log(PREFIX,'도시증축 4종 + 인재 목록/등용 복구 완료');
})();


// ============================================================================
// v117 FEATURE — 도시 증축 · 토성(Earth Wall) 테크트리
// - 전문도시 성장과 독립된 도시 방어 시설: Lv1 +30%, Lv2 +50%, Lv3 +70%
// - 실제 교전 3회 후 파괴 / 저비용 재건축으로 내구 초기화
// - 일반전 fight(), 대규모전 resolveLargeBattleRound() 양쪽에서 내구 소모
// - 기존 저장 데이터는 buildings.earthWall 객체를 지연 생성하여 완전 호환
// ============================================================================
(function installEarthWallV117(){
 'use strict';
 if(window.__SAMGUK_EARTH_WALL_V117__)return;
 window.__SAMGUK_EARTH_WALL_V117__=true;
 const PREFIX='[삼국쟁패][v117][EARTH-WALL]';
 const CFG=Object.freeze({
  maxLevel:3,
  maxBattles:3,
  defensePct:Object.freeze([0,.30,.50,.70]),
  buildCost:Object.freeze([0,60,90,120]),
  rebuildCost:30,
  actionCost:1,
  assets:Object.freeze({1:'assets/images/earth_wall_lv1.png',2:'assets/images/earth_wall_lv1.png',3:'assets/images/earth_wall_lv3.png'})
 });
 const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 const notice=m=>{try{notify(String(m))}catch(_e){console.warn(PREFIX,m)}};

 function normalizeStateValue(value){
  if(value&&typeof value==='object'&&!Array.isArray(value)){
   const level=clamp(Math.floor(n(value.level,0)),0,CFG.maxLevel);
   let current=clamp(Math.floor(n(value.currentBattles,0)),0,CFG.maxBattles);
   let destroyed=level>0&&(!!value.isDestroyed||current>=CFG.maxBattles);
   if(level===0){current=0;destroyed=false}
   if(destroyed)current=CFG.maxBattles;
   return {level,maxBattles:CFG.maxBattles,currentBattles:current,isDestroyed:destroyed};
  }
  const level=value===true?1:clamp(Math.floor(n(value,0)),0,CFG.maxLevel);
  return {level,maxBattles:CFG.maxBattles,currentBattles:0,isDestroyed:false};
 }
 function earthWallState(i){
  const id=Number(i),r=Number.isInteger(id)?regions?.[id]:null;if(!r)return null;
  if(!r.buildings||typeof r.buildings!=='object'||Array.isArray(r.buildings))r.buildings={};
  r.buildings.earthWall=normalizeStateValue(r.buildings.earthWall);
  return r.buildings.earthWall;
 }
 function earthWallBonus(i){const s=earthWallState(i);return !s||s.level<1||s.isDestroyed?0:(CFG.defensePct[s.level]||0)}
 function earthWallBonusPct(i){return Math.round(earthWallBonus(i)*100)}
 function earthWallRemaining(i){const s=earthWallState(i);return s?Math.max(0,s.maxBattles-s.currentBattles):0}
 function earthWallOperational(i){const s=earthWallState(i);return !!s&&s.level>0&&!s.isDestroyed&&s.currentBattles<s.maxBattles}
 function earthWallBuildCost(i,nextLevel){
  const base=CFG.buildCost[clamp(Number(nextLevel)||1,1,CFG.maxLevel)]||CFG.buildCost[1];
  let resourceMult=1,discount=0;
  try{resourceMult=typeof resourceConstructionCostMultiplier==='function'?Math.max(.1,n(resourceConstructionCostMultiplier(i),1)):1}catch(_e){}
  try{const admin=typeof territoryAdministrator==='function'?territoryAdministrator(i):null;discount=Math.min(.2,n(admin?.stats?.politics,0)*.001+(typeof officerSkillEffect==='function'?n(officerSkillEffect(admin,'buildDiscountPct'),0)*.5:0))}catch(_e){}
  return Math.max(1,Math.ceil(base*(1-discount)*resourceMult));
 }
 function validCityTerritory(i){
  const id=Number(i);if(!Number.isInteger(id)||!regions?.[id])return {ok:false,reason:'영토 정보가 없습니다.'};
  if(!playing)return {ok:false,reason:'먼저 게임을 시작해 주세요.'};
  if(busy)return {ok:false,reason:'현재 다른 처리가 진행 중입니다.'};
  if(typeof isActiveTerritory==='function'&&!isActiveTerritory(id))return {ok:false,reason:'현재 사용할 수 없는 영토입니다.'};
  if(regions[id].owner!==player)return {ok:false,reason:'자신의 영토에서만 토성을 관리할 수 있습니다.'};
  if(typeof isPassTerritory==='function'&&isPassTerritory(id))return {ok:false,reason:'관문 영토에는 토성을 증축할 수 없습니다.'};
  if(typeof isCapital==='function'&&isCapital(id))return {ok:false,reason:'수도는 별도의 수도 증축 시스템을 사용합니다.'};
  return {ok:true,id,r:regions[id]};
 }
 function spendEarthWallResources(cost){
  if(n(gold)<cost||n(ap)<CFG.actionCost)return false;
  try{setCountryGold(player,n(gold)-cost)}catch(_e){gold=Math.max(0,n(gold)-cost);if(K?.[player])K[player].gold=gold}
  ap=Math.max(0,Math.round((n(ap)-CFG.actionCost)*100)/100);
  return true;
 }
 function upgradeEarthWall(i=selected){
  const ctx=validCityTerritory(i);if(!ctx.ok){notice(ctx.reason);return false}
  const s=earthWallState(ctx.id);if(!s)return false;
  if(s.isDestroyed){notice('토성이 무너진 상태입니다. 먼저 재건축해 내구도를 복구해 주세요.');return false}
  if(s.level>=CFG.maxLevel){notice('토성은 이미 최고 단계입니다.');return false}
  const next=s.level+1,cost=earthWallBuildCost(ctx.id,next);
  if(n(ap)<CFG.actionCost){notice(`토성 증축에는 행동 ${CFG.actionCost}이 필요합니다.`);return false}
  if(n(gold)<cost){notice(`토성 Lv.${next} 증축에 ${cost}금이 필요합니다.`);return false}
  if(!spendEarthWallResources(cost))return false;
  s.level=next;s.currentBattles=0;s.isDestroyed=false;s.maxBattles=CFG.maxBattles;
  try{log(`🧱 ${ctx.r.name} · 토성 Lv.${next} 완성 · 방어 +${Math.round(CFG.defensePct[next]*100)}% · 내구 0/${CFG.maxBattles} · 금 -${cost}`)}catch(_e){}
  notice(`${ctx.r.name} 토성 Lv.${next}이 완성되었습니다.`);
  try{
   document.dispatchEvent(new CustomEvent('samguk:city-upgraded',{detail:{territoryId:ctx.id,cityType:'earthWall',level:next,reason:'earth-wall-upgrade'}}));
   window.SAMGUK_MAP_UI_OVERLAY?.refresh?.({force:true});
  }catch(_e){}
  try{render()}catch(error){console.error(PREFIX,'증축 후 렌더 오류',error)}
  return true;
 }
 function rebuildEarthWall(i=selected){
  const ctx=validCityTerritory(i);if(!ctx.ok){notice(ctx.reason);return false}
  const s=earthWallState(ctx.id);if(!s||s.level<1){notice('재건축할 토성이 없습니다.');return false}
  if(!s.isDestroyed&&s.currentBattles<CFG.maxBattles){notice('토성이 아직 무너지지 않았습니다.');return false}
  const cost=CFG.rebuildCost;
  if(n(ap)<CFG.actionCost){notice(`토성 재건축에는 행동 ${CFG.actionCost}이 필요합니다.`);return false}
  if(n(gold)<cost){notice(`토성 재건축에 ${cost}금이 필요합니다.`);return false}
  if(!spendEarthWallResources(cost))return false;
  s.currentBattles=0;s.isDestroyed=false;s.maxBattles=CFG.maxBattles;
  try{log(`🧱 ${ctx.r.name} · 토성 Lv.${s.level} 재건축 완료 · 내구 0/${CFG.maxBattles} · 금 -${cost}`)}catch(_e){}
  notice(`${ctx.r.name} 토성이 재건축되어 방어 효과가 다시 활성화되었습니다.`);
  try{
   document.dispatchEvent(new CustomEvent('samguk:city-upgraded',{detail:{territoryId:ctx.id,cityType:'earthWall',level:s.level,reason:'earth-wall-rebuild'}}));
   window.SAMGUK_MAP_UI_OVERLAY?.refresh?.({force:true});
  }catch(_e){}
  try{render()}catch(error){console.error(PREFIX,'재건축 후 렌더 오류',error)}
  return true;
 }
 function recordEarthWallBattle(i,meta={}){
  const id=Number(i),s=earthWallState(id);if(!s||s.level<1||s.isDestroyed)return false;
  s.currentBattles=clamp(s.currentBattles+1,0,s.maxBattles);
  if(s.currentBattles>=s.maxBattles)s.isDestroyed=true;
  const name=regions?.[id]?.name||`영토 ${id}`,remain=Math.max(0,s.maxBattles-s.currentBattles);
  try{log(s.isDestroyed?`💥 ${name} · 토성 Lv.${s.level}이 ${s.maxBattles}번째 전투 후 무너졌습니다.`:`🧱 ${name} · 토성 내구 소모 ${s.currentBattles}/${s.maxBattles} · 잔여 전투 ${remain}회`)}catch(_e){}
  const defenderWasPlayer=Number(meta.defenderFaction)===Number(player),ownerNowPlayer=regions?.[id]?.owner===player;
  if(defenderWasPlayer||ownerNowPlayer)notice(s.isDestroyed?`${name}의 토성이 무너졌습니다. 도시증축에서 재건축할 수 있습니다.`:`${name} 토성 내구: ${s.currentBattles}/${s.maxBattles}`);
  console.log(PREFIX,'전투 내구 소모',{territory:id,level:s.level,currentBattles:s.currentBattles,isDestroyed:s.isDestroyed,meta});
  if(s.isDestroyed){try{window.SAMGUK_MAP_UI_OVERLAY?.refresh?.({force:true})}catch(_e){}}
  return true;
 }
 function renderEarthWallPanel(i){
  const id=Number(i),s=earthWallState(id);if(!s)return'';
  const activePct=s.level>0&&!s.isDestroyed?Math.round(CFG.defensePct[s.level]*100):0;
  const next=Math.min(CFG.maxLevel,s.level+1),nextCost=s.level<CFG.maxLevel?earthWallBuildCost(id,next):0;
  const remaining=earthWallRemaining(id),asset=CFG.assets[Math.max(1,s.level||1)];
  let action='';
  if(s.level===0)action=`<button type="button" class="action earth-wall-btn" data-earth-wall-action="upgrade" ${n(gold)<nextCost||n(ap)<CFG.actionCost?'disabled':''}>토성 Lv.1 축조 · ${nextCost}금 · AP ${CFG.actionCost}</button>`;
  else if(s.isDestroyed)action=`<button type="button" class="action earth-wall-btn rebuild" data-earth-wall-action="rebuild" ${n(gold)<CFG.rebuildCost||n(ap)<CFG.actionCost?'disabled':''}>토성 재건축 · ${CFG.rebuildCost}금 · AP ${CFG.actionCost}</button>`;
  else if(s.level<CFG.maxLevel)action=`<button type="button" class="action earth-wall-btn" data-earth-wall-action="upgrade" ${n(gold)<nextCost||n(ap)<CFG.actionCost?'disabled':''}>토성 Lv.${next} 증축 · ${nextCost}금 · AP ${CFG.actionCost}</button>`;
  else action='<span class="earth-wall-max">최고 단계</span>';
  const status=s.level===0?'미건설':s.isDestroyed?'파괴 · 방어 효과 비활성':`정상 · 방어 +${activePct}%`;
  return `<section class="earth-wall-tech ${s.isDestroyed?'destroyed':''}" data-earth-wall-panel="1">
   <div class="earth-wall-copy"><div class="section-title">🧱 토성</div><strong>${s.level?`Lv.${s.level}`:'미건설'} · ${status}</strong>
   <p class="subtext">방어 단계: Lv.1 +30% → Lv.2 +50% → Lv.3 +70%<br>전투 내구: <b>${s.currentBattles}/${s.maxBattles}</b>${s.level&&!s.isDestroyed?` · 잔여 ${remaining}회`:''}${s.isDestroyed?'<br>3회의 전투를 버텨 파괴되었습니다. 재건축 시 내구가 0/3으로 복구됩니다.':''}</p>${action}</div>
   <div class="earth-wall-art"><img src="${asset}" alt="토성 Lv.${Math.max(1,s.level||1)}" loading="lazy"></div>
  </section>`;
 }

 // 도시증축 패널의 전문도시 트리 아래에 토성 트리를 독립 섹션으로 결합한다.
 const BASE_renderCityUpgradeUI_V117=renderCityUpgradeUI;
 renderCityUpgradeUI=function renderCityUpgradeUIV117(i){
  let city='';try{city=BASE_renderCityUpgradeUI_V117(i)||''}catch(error){console.error(PREFIX,'기존 도시증축 렌더 실패',error)}
  return city+renderEarthWallPanel(Number(i));
 };

 // 전문도시가 III까지 완료되어도 토성 관리 때문에 도시증축 버튼은 계속 열 수 있어야 한다.
 const BASE_renderActions_V117=renderActions;
 renderActions=function renderActionsV117(){
  let html=BASE_renderActions_V117();
  const id=selected!==null&&selected!==undefined?Number(selected):NaN;
  const canManage=playing&&!busy&&Number.isInteger(id)&&regions?.[id]?.owner===player&&!(typeof isCapital==='function'&&isCapital(id))&&!(typeof isPassTerritory==='function'&&isPassTerritory(id));
  if(canManage&&typeof cityCanUpgrade==='function'&&!cityCanUpgrade(id)){
   html=String(html).replace(/<button([^>]*\bdata-mode="city"[^>]*)>([\s\S]*?)<\/button>/i,(m,attrs)=>`<button${attrs.replace(/\sdisabled(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi,'')}>도시증축 · 토성</button>`);
  }
  return html;
 };

 // 구형 setAction 경로에서도 최고 단계 도시의 토성 관리 진입을 허용한다.
 const BASE_setAction_V117=setAction;
 setAction=function setActionV117(mode){
  if(mode==='city'){
   const id=selected!==null&&selected!==undefined?Number(selected):NaN;
   if(playing&&!busy&&Number.isInteger(id)&&regions?.[id]?.owner===player&&!(typeof isCapital==='function'&&isCapital(id))&&!(typeof isPassTerritory==='function'&&isPassTerritory(id))){
    target=null;attackType=null;actionMode='city';try{render()}catch(error){console.error(PREFIX,'도시/토성 탭 렌더 오류',error)}return true;
   }
  }
  return BASE_setAction_V117(mode);
 };

 // 실제 전투력 계산에 토성 배율을 반영한다.
 const BASE_defensePower_V117=defensePower;
 defensePower=function defensePowerEarthWallV117(i,attacker=null){return BASE_defensePower_V117(i,attacker)*(1+earthWallBonus(i))};
 const BASE_defensePercent_V117=defensePercent;
 defensePercent=function defensePercentEarthWallV117(i,attacker=null){return BASE_defensePercent_V117(i,attacker)+earthWallBonusPct(i)};

 // 영토 상세 정보에도 현재 토성 상태를 노출한다.
 const BASE_cityEffectInfo_V117=cityEffectInfo;
 cityEffectInfo=function cityEffectInfoEarthWallV117(i){
  const base=BASE_cityEffectInfo_V117(i),s=earthWallState(i);if(!s||s.level<1)return base;
  const line=s.isDestroyed?`<p class="city-effect-line earth-wall destroyed"><b>🧱 토성 Lv.${s.level}</b> · 파괴 · 방어 효과 비활성 · 재건축 필요</p>`:`<p class="city-effect-line earth-wall"><b>🧱 토성 Lv.${s.level}</b> · 방어 +${earthWallBonusPct(i)}% · 내구 ${s.currentBattles}/${s.maxBattles}</p>`;
  return base+line;
 };

 // 일반 침략/전투: 실제 적대 교전이 성립한 경우 1회 소모. 세 번째 전투에도 방어 효과는 적용되고 전투 후 파괴된다.
 const BASE_fight_V117=fight;
 fight=function fightEarthWallV117(i,j,type='normal'){
  const a=regions?.[Number(i)],d=regions?.[Number(j)],enemy=!!a&&!!d&&a.owner!==d.owner;
  const defenderFaction=d?.owner,willBattle=enemy&&typeof troopSend==='function'&&troopSend(Number(i))>0&&(!territoryCanAttack||territoryCanAttack(Number(i)))&&(!canAttack||canAttack(a.owner,d.owner));
  const out=BASE_fight_V117(i,j,type);
  if(willBattle)recordEarthWallBattle(Number(j),{kind:'normal',attackerFaction:a?.owner,defenderFaction,tactic:type,result:out?'attacker-win':'defender-hold'});
  return out;
 };

 // 대규모전: 턴 종료 때 실제 교전 라운드가 발생할 때마다 1회 소모.
 const BASE_resolveLargeBattleRound_V117=resolveLargeBattleRound;
 resolveLargeBattleRound=async function resolveLargeBattleRoundEarthWallV117(b){
  const active=!!b?.active&&n(b?.attackerTroops)>0&&n(b?.defenderTroops)>0,id=Number(b?.territoryId),defenderFaction=b?.defenderCountry,attackerFaction=b?.attackerCountry;
  const out=await BASE_resolveLargeBattleRound_V117(b);
  if(active&&Number.isInteger(id))recordEarthWallBattle(id,{kind:'large-battle-round',attackerFaction,defenderFaction});
  return out;
 };

 // 전투 중 DOM 교체와 무관하도록 토성 버튼은 document capture에서 단일 처리한다.
 if(document.documentElement.dataset.v117EarthWallCapture!=='1'){
  document.documentElement.dataset.v117EarthWallCapture='1';
  document.addEventListener('click',function earthWallCaptureV117(event){
   const btn=event.target?.closest?.('#orders [data-earth-wall-action],#detail [data-earth-wall-action]');if(!btn||btn.disabled)return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation?.();
   const action=btn.dataset.earthWallAction;
   if(action==='upgrade')upgradeEarthWall(selected);else if(action==='rebuild')rebuildEarthWall(selected);
  },true);
 }

 // 토성 카드 스타일. 제공된 Lv1/Lv3 이미지를 UI 미리보기로 재사용한다.
 if(!document.getElementById('earthWallV117Styles')){
  const style=document.createElement('style');style.id='earthWallV117Styles';style.textContent=`
   .earth-wall-tech{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:12px;margin-top:12px;padding:12px;border:1px solid #9c7a3e;background:linear-gradient(135deg,#201b11,#101713);box-shadow:inset 0 0 0 1px #d8b65a1f}
   .earth-wall-tech.destroyed{border-color:#8d4a42;background:linear-gradient(135deg,#241313,#121515)}
   .earth-wall-tech .section-title{color:#e3c36b;margin-bottom:6px}.earth-wall-tech strong{color:#f2e6bd}.earth-wall-tech.destroyed strong{color:#e58b7e}
   .earth-wall-art{min-height:105px;border:1px solid #75633d;background:#050706;overflow:hidden;display:flex;align-items:center;justify-content:center}
   .earth-wall-art img{width:100%;height:120px;object-fit:cover;object-position:center;display:block;opacity:.92}
   .earth-wall-btn{width:100%;margin-top:7px}.earth-wall-btn.rebuild{border-color:#b96f54!important}.earth-wall-max{display:inline-flex;padding:7px 10px;margin-top:6px;border:1px solid #74673e;color:#d7c589;background:#1a1a13}
   .city-effect-line.earth-wall{border-color:#a77b35;background:#241f12}.city-effect-line.earth-wall.destroyed{border-color:#8d4a42;background:#261516;color:#dca29a}
   @media(max-width:760px){.earth-wall-tech{grid-template-columns:1fr}.earth-wall-art{display:none}}
  `;document.head.appendChild(style);
 }

 // 현재 로드된 모든 영토를 즉시 정규화한다. 이후 신규/로드 데이터는 접근 시 자동 정규화된다.
 try{if(Array.isArray(regions))regions.forEach((_,i)=>earthWallState(i))}catch(error){console.warn(PREFIX,'초기 상태 정규화 실패',error)}
 window.SAMGUK_EARTH_WALL={version:117,config:CFG,getState:earthWallState,getDefenseBonus:earthWallBonus,getDefensePercent:earthWallBonusPct,isOperational:earthWallOperational,upgrade:upgradeEarthWall,rebuild:rebuildEarthWall,recordBattle:recordEarthWallBattle,renderPanel:renderEarthWallPanel};
 console.log(PREFIX,'토성 테크트리 적용 완료',CFG);
})();

// ============================================================================
// v118 UI/UX — 도시증축 가로형 통합 카드 UI
// - 농업/상업/군사/해상도시 + 토성을 같은 카드 컴포넌트로 통일
// - 좌측 정보 / 우측 축소 이미지의 compact horizontal layout
// - 토성 UI에서 "Earth Wall" 영문 제거
// - 기존 data-city-type / data-earth-wall-action 이벤트 계약은 유지
// ============================================================================
(function installCityDevelopmentCardsV118(){
 'use strict';
 if(window.__SAMGUK_CITY_DEVELOPMENT_CARDS_V118__)return;
 window.__SAMGUK_CITY_DEVELOPMENT_CARDS_V118__=true;
 const PREFIX='[삼국쟁패][v118][CITY-CARDS]';
 const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
 const ROMAN=['','I','II','III'];
 const CARD_META=Object.freeze({
  agriculture:Object.freeze({label:'농업도시',icon:'🌾',image:'city_agriculture.png',tone:'agriculture'}),
  commerce:Object.freeze({label:'상업도시',icon:'💰',image:'city_commerce.png',tone:'commerce'}),
  military:Object.freeze({label:'군사도시',icon:'⚔️',image:'city_military.png',tone:'military'}),
  port:Object.freeze({label:'해상도시',icon:'⚓',image:'city_port.png',tone:'port'})
 });

 function cityEffectText(type,level){
  if(type==='agriculture')return '턴 병량 +50% · 모병/보충 병량 소모 -20%';
  if(type==='commerce')return '턴 금 수입 +50% · 특산품 생산량 2배';
  if(type==='military')return '출병 행동력 -1(최소 1) · 적 도시/토성 공격 +30% · 출병 장수 무력/통솔 +5';
  if(type==='port')return '턴 금 +25% · 병량 +25% · 외교 특산품 교역가치 +50%';
  return '';
 }
 function cityUnlockText(type,nextLevel){
  if(type==='port')return '해안 전용 교역 거점 · 금/병량 복합 수입과 외교 교역 강화';
  if(nextLevel>=3){
   if(type==='agriculture')return '병량·보급 거점 · III 완성 시 곡창·관개시설·둔전·역참·병영촌 해금';
   if(type==='commerce')return '금·특산품 거점 · III 완성 시 교역소·객잔·창고·조폐소 해금';
   if(type==='military')return '공격·기동·장수 특화 거점 · III 완성 시 훈련소·병기고·성문·성벽·망루 해금';
  }
  return '핵심 전문 효과는 즉시 적용 · III 단계에서 상위 전문 건물 해금';
 }
 function lockReasonForCity(i,type,cost){
  if(num(ap)<1)return '행동력이 부족합니다. (필요 1)';
  if(num(gold)<cost)return `금이 부족합니다. (필요 ${cost})`;
  if(type==='agriculture'&&typeof isSteppeTerrain==='function'&&isSteppeTerrain(i))return '초원 지형에는 농업도시를 건설·증축할 수 없습니다.';
  if(type==='port'&&typeof portCityAllowed==='function'&&!portCityAllowed(i))return '해상도시는 바다와 맞닿은 해안 영토에서만 건설할 수 있습니다.';
  return '';
 }
 function renderHorizontalCard({tone,title,badge,description,detail,image,actionHtml='',locked=false,destroyed=false,complete=false}){
  return `<article class="city-dev-card ${esc(tone)}${locked?' is-locked':''}${destroyed?' is-destroyed':''}${complete?' is-complete':''}">
   <div class="city-dev-copy">
    <div class="city-dev-heading"><strong>${title}</strong>${badge?`<span>${badge}</span>`:''}</div>
    <p class="city-dev-desc">${description}</p>
    ${detail?`<p class="city-dev-detail">${detail}</p>`:''}
    <div class="city-dev-action-row">${actionHtml}</div>
   </div>
   <div class="city-dev-art"><img src="${esc(image)}" alt="${esc(title)}" loading="lazy" draggable="false"></div>
  </article>`;
 }
 function renderCityChoiceCard(i,type,targetLevel){
  const meta=CARD_META[type],cost=typeof cityUpgradeCost==='function'?cityUpgradeCost(i,targetLevel):0;
  const reason=lockReasonForCity(i,type,cost),locked=!!reason;
  const effect=cityEffectText(type,targetLevel),detail=reason?`🔒 ${esc(reason)}`:cityUnlockText(type,targetLevel);
  const action=`<button type="button" class="city-dev-action city-upgrade-btn ${type}" data-city-type="${type}" ${locked?'disabled':''} title="${esc(reason||`${meta.label} ${ROMAN[targetLevel]} · ${cost}금 · 행동 1`)}">${meta.label} ${ROMAN[targetLevel]} ${targetLevel===1?'건설':'증축'} · ${cost}금</button>`;
  return renderHorizontalCard({tone:type,title:`${meta.icon} ${meta.label}`,badge:ROMAN[targetLevel],description:effect,detail,image:meta.image,actionHtml:action,locked});
 }
 function renderCurrentCityCard(i,type,level){
  const meta=CARD_META[type]||{label:CITY_TYPES?.[type]?.label||type,icon:CITY_TYPES?.[type]?.icon||'🏙️',image:'city_commerce.png'};
  const max=Number(GAME_BALANCE?.city?.maxLevel)||3;
  if(level>=max){
   const effect=cityEffectText(type,level);
   return renderHorizontalCard({tone:type,title:`${meta.icon} ${meta.label}`,badge:`${ROMAN[level]} · 최고 단계`,description:effect,detail:type==='port'?'해안 특화도시 성장 완료':'전문도시 성장 완료 · 상위 건물 해금',image:meta.image,actionHtml:'<span class="city-dev-complete">증축 완료</span>',complete:true});
  }
  const next=level+1,cost=typeof cityUpgradeCost==='function'?cityUpgradeCost(i,next):0,reason=lockReasonForCity(i,type,cost),locked=!!reason;
  const action=`<button type="button" class="city-dev-action city-upgrade-btn ${type}" data-city-type="${type}" ${locked?'disabled':''} title="${esc(reason||`${meta.label} ${ROMAN[next]} · ${cost}금 · 행동 1`)}">${ROMAN[level]} → ${ROMAN[next]} 증축 · ${cost}금</button>`;
  return renderHorizontalCard({tone:type,title:`${meta.icon} ${meta.label}`,badge:`현재 ${ROMAN[level]}`,description:`다음 단계: ${cityEffectText(type,next)}`,detail:reason?`🔒 ${esc(reason)}`:cityUnlockText(type,next),image:meta.image,actionHtml:action,locked});
 }
 function earthWallBuildCostV118(i,nextLevel){
  const api=window.SAMGUK_EARTH_WALL,cfg=api?.config;if(!cfg)return 0;
  const base=num(cfg.buildCost?.[Math.max(1,Math.min(3,Number(nextLevel)||1))],0);
  let resourceMult=1,discount=0;
  try{resourceMult=typeof resourceConstructionCostMultiplier==='function'?Math.max(.1,num(resourceConstructionCostMultiplier(i),1)):1}catch(_e){}
  try{const admin=typeof territoryAdministrator==='function'?territoryAdministrator(i):null;discount=Math.min(.2,num(admin?.stats?.politics,0)*.001+(typeof officerSkillEffect==='function'?num(officerSkillEffect(admin,'buildDiscountPct'),0)*.5:0))}catch(_e){}
  return Math.max(1,Math.ceil(base*(1-discount)*resourceMult));
 }
 function renderEarthWallCard(i){
  const api=window.SAMGUK_EARTH_WALL;if(!api)return '';
  const s=api.getState?.(i),cfg=api.config;if(!s||!cfg)return '';
  const currentLevel=num(s.level),destroyed=!!s.isDestroyed;
  const activePct=currentLevel>0&&!destroyed?Math.round(num(cfg.defensePct?.[currentLevel])*100):0;
  const next=Math.min(num(cfg.maxLevel,3),currentLevel+1),remaining=Math.max(0,num(s.maxBattles,3)-num(s.currentBattles));
  const image=cfg.assets?.[Math.max(1,currentLevel||1)]||'assets/images/earth_wall_lv1.png';
  let action='',detail='',badge='';
  if(currentLevel===0){
   const cost=earthWallBuildCostV118(i,1),locked=num(gold)<cost||num(ap)<num(cfg.actionCost,1);
   const reason=num(ap)<num(cfg.actionCost,1)?`행동력이 부족합니다. (필요 ${cfg.actionCost})`:num(gold)<cost?`금이 부족합니다. (필요 ${cost})`:'';
   action=`<button type="button" class="city-dev-action earth-wall-btn" data-earth-wall-action="upgrade" ${locked?'disabled':''} title="${esc(reason||`토성 Lv.1 · ${cost}금 · 행동 ${cfg.actionCost}`)}">토성 Lv.1 축조 · ${cost}금</button>`;
   detail=reason?`🔒 ${esc(reason)}`:'전투 3회 내구 · 파괴 후 저비용 재건축 가능';badge='미건설';
   return renderHorizontalCard({tone:'earth-wall',title:'🧱 토성',badge,description:'Lv.1 +30% → Lv.2 +50% → Lv.3 +70%',detail,image,actionHtml:action,locked});
  }
  if(destroyed){
   const cost=num(cfg.rebuildCost,30),locked=num(gold)<cost||num(ap)<num(cfg.actionCost,1);
   const reason=num(ap)<num(cfg.actionCost,1)?`행동력이 부족합니다. (필요 ${cfg.actionCost})`:num(gold)<cost?`금이 부족합니다. (필요 ${cost})`:'';
   action=`<button type="button" class="city-dev-action earth-wall-btn rebuild" data-earth-wall-action="rebuild" ${locked?'disabled':''} title="${esc(reason||`토성 재건축 · ${cost}금`)}">재건축 · ${cost}금</button>`;
   detail=reason?`🔒 ${esc(reason)}`:'내구 3/3 소진 · 재건축 시 0/3으로 복구';badge=`Lv.${currentLevel} · 파괴`;
   return renderHorizontalCard({tone:'earth-wall',title:'🧱 토성',badge,description:'방어 효과 비활성',detail,image,actionHtml:action,locked,destroyed:true});
  }
  if(currentLevel<num(cfg.maxLevel,3)){
   const cost=earthWallBuildCostV118(i,next),locked=num(gold)<cost||num(ap)<num(cfg.actionCost,1);
   const reason=num(ap)<num(cfg.actionCost,1)?`행동력이 부족합니다. (필요 ${cfg.actionCost})`:num(gold)<cost?`금이 부족합니다. (필요 ${cost})`:'';
   action=`<button type="button" class="city-dev-action earth-wall-btn" data-earth-wall-action="upgrade" ${locked?'disabled':''} title="${esc(reason||`토성 Lv.${next} · ${cost}금`)}">Lv.${next} 증축 · ${cost}금</button>`;
   detail=reason?`🔒 ${esc(reason)}`:`내구 ${s.currentBattles}/${s.maxBattles} · 잔여 ${remaining}회`;
   badge=`Lv.${currentLevel}`;
   return renderHorizontalCard({tone:'earth-wall',title:'🧱 토성',badge,description:`현재 방어 +${activePct}% · 다음 Lv.${next} +${Math.round(num(cfg.defensePct?.[next])*100)}%`,detail,image,actionHtml:action,locked});
  }
  badge=`Lv.${currentLevel} · 최고 단계`;
  detail=`내구 ${s.currentBattles}/${s.maxBattles} · 잔여 ${remaining}회`;
  return renderHorizontalCard({tone:'earth-wall',title:'🧱 토성',badge,description:`방어 +${activePct}%`,detail,image,actionHtml:'<span class="city-dev-complete">최고 단계</span>',complete:true});
 }

 renderCityUpgradeUI=function renderCityUpgradeUIV118(i){
  const id=Number(i),r=Number.isInteger(id)?regions?.[id]:null;
  if(!r)return '<div class="city-upgrade-panel"><p class="subtext">도시 정보를 불러올 수 없습니다.</p></div>';
  if(typeof isPassTerritory==='function'&&isPassTerritory(id))return '<div class="city-upgrade-panel"><h3 class="mode-title">도시증축 하기</h3><p class="subtext">관문 영토에는 전문도시 및 토성을 증축할 수 없습니다.</p></div>';
  const type=typeof cityTypeOf==='function'?cityTypeOf(id):(r.cityType||'normal'),lv=typeof cityLevelOf==='function'?cityLevelOf(id):num(r.cityLevel);
  const cards=[];
  if(type==='normal'){
   for(const cityType of ['agriculture','commerce','military','port'])cards.push(renderCityChoiceCard(id,cityType,1));
  }else cards.push(renderCurrentCityCard(id,type,lv));
  cards.push(renderEarthWallCard(id));
  return `<div class="city-upgrade-panel city-upgrade-panel-v118">
   <h3 class="mode-title">도시증축 하기</h3>
   <p class="subtext">전문도시와 방어시설을 선택해 성장시킵니다. 각 카드는 같은 규격으로 표시됩니다.</p>
   <span data-city-type="ui-sentinel" hidden aria-hidden="true"></span>
   <div class="city-development-list">${cards.join('')}</div>
  </div>`;
 };

 // 외부에서 토성 단독 패널을 요청해도 같은 카드 규격을 사용한다.
 if(window.SAMGUK_EARTH_WALL)window.SAMGUK_EARTH_WALL.renderPanel=i=>renderEarthWallCard(Number(i));

 // v117의 별도 토성 카드 스타일과 기존 세로형 전문도시 그리드를 v118 공통 카드 규격으로 덮어쓴다.
 if(!document.getElementById('cityDevelopmentCardsV118Styles')){
  const style=document.createElement('style');style.id='cityDevelopmentCardsV118Styles';style.textContent=`
   .city-upgrade-panel-v118{display:block;min-width:0}
   .city-development-list{display:grid;grid-template-columns:1fr;gap:8px;margin-top:9px}
   .city-dev-card{display:grid;grid-template-columns:minmax(0,1fr) 112px;align-items:stretch;gap:10px;min-height:112px;padding:9px;border:1px solid #6f705e;background:linear-gradient(135deg,#182019 0%,#101511 100%);box-shadow:inset 0 0 0 1px #ffffff08;overflow:hidden}
   .city-dev-card.agriculture{border-color:#648f50}.city-dev-card.commerce{border-color:#b8953e}.city-dev-card.military{border-color:#91424a}.city-dev-card.port{border-color:#3f8193}.city-dev-card.earth-wall{border-color:#9c7a3e}
   .city-dev-card.is-locked{opacity:.62}.city-dev-card.is-destroyed{border-color:#8d4a42;background:linear-gradient(135deg,#241313,#121515)}
   .city-dev-copy{display:flex;min-width:0;flex-direction:column;justify-content:center;gap:4px}
   .city-dev-heading{display:flex;align-items:center;justify-content:space-between;gap:7px;min-width:0}
   .city-dev-heading strong{font-size:14px;line-height:1.25;color:#eee7d1}.city-dev-card.agriculture .city-dev-heading strong{color:#8ac073}.city-dev-card.commerce .city-dev-heading strong{color:#e0c465}.city-dev-card.military .city-dev-heading strong{color:#d4777e}.city-dev-card.port .city-dev-heading strong{color:#7fd5e8}.city-dev-card.earth-wall .city-dev-heading strong{color:#e3c36b}
   .city-dev-heading span{flex:0 0 auto;padding:2px 5px;border:1px solid #6d6855;background:#0c100d;color:#d8c993;font-size:10px;white-space:nowrap}
   .city-dev-desc,.city-dev-detail{margin:0!important;font-size:11px;line-height:1.35;color:#d5d6cc}.city-dev-detail{color:#9fa79d}.city-dev-card.is-destroyed .city-dev-desc{color:#e5a097}
   .city-dev-action-row{margin-top:3px;min-height:25px;display:flex;align-items:flex-end}
   .city-dev-action{width:100%;min-height:30px!important;padding:5px 7px!important;margin:0!important;font-size:11px!important;line-height:1.25;text-align:center}
   .city-dev-complete{display:inline-flex;align-items:center;justify-content:center;width:100%;min-height:28px;border:1px solid #5e624f;background:#141913;color:#aaa98f;font-size:11px}
   .city-dev-art{width:112px;min-height:92px;align-self:stretch;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(circle at 50% 45%,#ffffff0b,#050806 72%);border-left:1px solid #ffffff0d}
   .city-dev-art img{display:block;width:104px;height:96px;object-fit:contain;object-position:center;filter:drop-shadow(0 3px 3px #0009);user-select:none;pointer-events:none}
   .earth-wall-tech{display:none!important}
   @media(max-width:520px){.city-dev-card{grid-template-columns:minmax(0,1fr) 92px;gap:7px;padding:8px}.city-dev-art{width:92px}.city-dev-art img{width:88px;height:84px}.city-dev-heading strong{font-size:13px}.city-dev-desc,.city-dev-detail{font-size:10px}}
  `;document.head.appendChild(style);
 }
 console.log(PREFIX,'가로형 도시/토성 통합 카드 UI 적용 완료');
})();


// ============================================================================
// v121 PATCH — 전문도시 역할 전면 개편
// 군사도시: 공격/기동/장수 특화, 농업: 병량, 상업: 금/특산품, 해상: 교역
// 토성: 기존 순수 수비 전용 역할 유지
// ============================================================================
(function installProfessionalCityRebalanceV121(){
 'use strict';
 if(window.__SAMGUK_PRO_CITY_V121__)return;
 window.__SAMGUK_PRO_CITY_V121__=true;
 const PREFIX='[삼국쟁패][v121][PRO-CITY]';
 const RULES=window.SAMGUK_PROFESSIONAL_CITY_RULES?.rules||{};
 const cityRule=(i,key)=>regions?.[Number(i)]?.cityType===key?RULES[key]||null:null;
 const isMilitary=i=>!!cityRule(i,'military');
 const isAgriculture=i=>!!cityRule(i,'agriculture');
 const isCommerce=i=>!!cityRule(i,'commerce');
 const isPort=i=>!!cityRule(i,'port');

 // 데이터/툴팁의 단일 설명값을 최신 기획으로 갱신한다.
 if(typeof GAME_BALANCE==='object'&&GAME_BALANCE?.city)GAME_BALANCE.city.modifiers=RULES;
 if(typeof CITY_TYPES==='object'){
  if(CITY_TYPES.agriculture)CITY_TYPES.agriculture.effect='턴 병량 +50% · 모병/보충 병량 소모 -20%';
  if(CITY_TYPES.commerce)CITY_TYPES.commerce.effect='턴 금 +50% · 특산품 생산량 2배';
  if(CITY_TYPES.military){CITY_TYPES.military.icon='⚔️';CITY_TYPES.military.effect='출병 AP -1(최소 1) · 적 도시/토성 공격 +30% · 출병 장수 무력/통솔 +5'}
  if(CITY_TYPES.port){CITY_TYPES.port.label='해상도시';CITY_TYPES.port.effect='턴 금 +25% · 병량 +25% · 외교 특산품 교역가치 +50%'}
 }

 // 기존 농업도시 징집량 증가를 제거한다. 수도 성장 보너스는 그대로 유지한다.
 cityRecruitMultiplier=function cityRecruitMultiplierV121(i){
  const owner=regions?.[Number(i)]?.owner;
  return typeof capitalGrowthMultiplier==='function'?capitalGrowthMultiplier(owner):1;
 };

 // 상업 +50%, 해상 +25%로 고정. 기존 II/III 단계의 65/80%, 35/50% 스케일은 제거한다.
 cityIncomeMultiplier=function cityIncomeMultiplierV121(i){
  const id=Number(i),owner=regions?.[id]?.owner,capital=typeof capitalGrowthMultiplier==='function'?capitalGrowthMultiplier(owner):1;
  if(isCommerce(id))return (Number(RULES.commerce?.goldIncomeMultiplier)||1.5)*capital;
  if(isPort(id))return (Number(RULES.port?.goldIncomeMultiplier)||1.25)*capital;
  return capital;
 };

 // 군사도시의 기존 방어 배율을 완전히 제거한다. 토성/성벽/지형 방어만 남긴다.
 cityDefenseMultiplier=function cityDefenseMultiplierV121(){return 1};
 const BASE_defensePercent_V121=defensePercent;
 defensePercent=function defensePercentV121(i,attacker=null){
  let value=Number(BASE_defensePercent_V121(i,attacker))||0;
  if(isMilitary(i)){
   // v117 이전 레거시 군사도시 방어 수치: I 50 / II 65 / III 80%.
   const lv=typeof cityLevelOf==='function'?cityLevelOf(i):(regions?.[i]?.cityLevel||1);
   const legacy=[0,50,65,80][Math.max(0,Math.min(3,Number(lv)||1))]||50;
   value-=legacy;
  }
  return Math.max(0,value);
 };

 // 출병 장수 통솔 +5: 최대 출병 병력 계산에만 적용하여 원본 장수 스탯은 변경하지 않는다.
 const BASE_territoryMaxTroops_V121=territoryMaxTroops;
 territoryMaxTroops=function territoryMaxTroopsV121(i){
  const id=Number(i),o=typeof territoryCommander==='function'?territoryCommander(id):null;
  if(!isMilitary(id)||!o)return BASE_territoryMaxTroops_V121(id);
  const cfg=GAME_BALANCE?.officer?.leadership||{baseTroops:12,perPoint:.75},skill=typeof officerSkillEffect==='function'?officerSkillEffect(o,'troopLimitPct'):0,role=o.assignment==='command'?.06:0;
  return Math.max(1,Math.floor((Number(cfg.baseTroops||12)+((Number(o.stats?.leadership)||0)+(Number(RULES.military?.officerLeadershipBonus)||5))*Number(cfg.perPoint||.75))*(1+skill+role)));
 };

 // 출병 장수 무력 +5: 공격 전력 계산용 임시 보정이며 실제 장수 데이터는 변경하지 않는다.
 const BASE_officerPowerMultiplier_V121=officerPowerMultiplier;
 officerPowerMultiplier=function officerPowerMultiplierV121(i){
  let value=Number(BASE_officerPowerMultiplier_V121(i))||1;
  if(isMilitary(i)&&typeof territoryCommander==='function'&&territoryCommander(i))value+=(Number(RULES.military?.officerWarBonus)||5)*(Number(GAME_BALANCE?.officer?.power?.attackPerPoint)||.003);
  return value;
 };

 function targetIsFortifiedCityV121(j){
  const id=Number(j),r=regions?.[id];if(!r)return false;
  const specialized=(typeof cityTypeOf==='function'?cityTypeOf(id):r.cityType)!=='normal';
  const capital=typeof isCapital==='function'&&isCapital(id);
  let earth=false;try{const s=window.SAMGUK_EARTH_WALL?.getState?.(id);earth=!!s&&Number(s.level)>0&&!s.isDestroyed}catch(_e){}
  return specialized||capital||earth;
 }

 // 군사도시 공성 파괴력 +30%: 적 전문도시/수도/가동 토성을 공격할 때 적용.
 const BASE_attackPower_V121=attackPower;
 attackPower=function attackPowerV121(i,j){
  let value=Number(BASE_attackPower_V121(i,j))||0;
  if(isMilitary(i)&&regions?.[i]?.owner!==regions?.[j]?.owner&&targetIsFortifiedCityV121(j))value*=Number(RULES.military?.siegeDamageMultiplier)||1.30;
  return value;
 };

 function professionalCityEffectTextV121(i){
  const type=typeof cityTypeOf==='function'?cityTypeOf(i):(regions?.[i]?.cityType||'normal');
  if(type==='agriculture')return '🌾 농업도시 · 턴 병량 +50% · 모병/보충 병량 소모 -20%';
  if(type==='commerce')return '💰 상업도시 · 턴 금 +50% · 해당 영토 특산품 생산량 2배';
  if(type==='military')return '⚔️ 군사도시 · 출병 행동력 -1(최소 1) · 적 도시/토성 공격 +30% · 출병 장수 무력/통솔 +5';
  if(type==='port')return '⚓ 해상도시 · 턴 금 +25% · 병량 +25% · 외교 특산품 교역가치 +50%';
  return '';
 }

 cityTypeBadge=function cityTypeBadgeV121(i){
  const type=typeof cityTypeOf==='function'?cityTypeOf(i):(regions?.[i]?.cityType||'normal');if(type==='normal')return'';
  const c=CITY_TYPES?.[type]||{icon:'🏙️',label:type},lv=typeof cityLevelLabel==='function'?cityLevelLabel(i):'';
  return `<div class="city-type-badge ${type}"><strong>${c.icon} ${c.label} ${lv}</strong><span>${professionalCityEffectTextV121(i).replace(/^.*? · /,'')}</span></div>`;
 };

 cityEffectInfo=function cityEffectInfoV121(i){
  const type=typeof cityTypeOf==='function'?cityTypeOf(i):(regions?.[i]?.cityType||'normal');let html='';
  if(type!=='normal')html=`<p class="city-effect-line ${type}"><b>${CITY_TYPES?.[type]?.icon||'🏙️'} ${CITY_TYPES?.[type]?.label||type} ${typeof cityLevelLabel==='function'?cityLevelLabel(i):''} 효과</b> · ${professionalCityEffectTextV121(i).replace(/^.*? · /,'')}</p>`;
  try{
   const s=window.SAMGUK_EARTH_WALL?.getState?.(i);
   if(s&&Number(s.level)>0)html+=s.isDestroyed?`<p class="city-effect-line earth-wall destroyed"><b>🧱 토성 Lv.${s.level}</b> · 파괴 · 방어 효과 비활성 · 재건축 필요</p>`:`<p class="city-effect-line earth-wall"><b>🧱 토성 Lv.${s.level}</b> · 방어 +${window.SAMGUK_EARTH_WALL.getDefensePercent(i)}% · 내구 ${s.currentBattles}/${s.maxBattles}</p>`;
  }catch(_e){}
  return html;
 };

 const BASE_battleModifiers_V121=battleModifiers;
 battleModifiers=function battleModifiersV121(i,j){
  let text=BASE_battleModifiers_V121(i,j);
  if(isMilitary(i))text+=`<br>⚔️ 군사도시: 출병 AP -1 · 출병 장수 무력/통솔 +5${targetIsFortifiedCityV121(j)?' · 공성 파괴력 +30%':''}`;
  return text;
 };

 window.SAMGUK_PROFESSIONAL_CITY_V121=Object.freeze({
  version:121,rules:RULES,
  effectText:professionalCityEffectTextV121,
  targetIsFortified:targetIsFortifiedCityV121,
  isMilitary,isAgriculture,isCommerce,isPort
 });
 console.log(PREFIX,'전문도시 개편 적용 완료',RULES);
})();
