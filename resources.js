// 삼국쟁패 v104 - 특산품 효과 / 국가 창고 스택 / 외교 교역 공용 데이터
const RESOURCE_TYPES=Object.freeze({
 rice:Object.freeze({key:'rice',emoji:'🌾',name:'벼',description:'해당 영토의 턴 병량 생산 ×2',isStackable:false,tradeable:false}),
 gold:Object.freeze({key:'gold',emoji:'✨',name:'금',description:'해당 영토의 턴 금 수입 +30% · 국가 창고 +1/턴',isStackable:true,tradeable:true,tradeScore:24}),
 horse:Object.freeze({key:'horse',emoji:'🐴',name:'말',description:'해당 영토의 기병 계열 생산 금 비용 -50%',isStackable:false,tradeable:false}),
 wood:Object.freeze({key:'wood',emoji:'🌲',name:'목재',description:'해당 영토의 건설·증축·성곽 수리 비용 -30%',isStackable:false,tradeable:false}),
 salt:Object.freeze({key:'salt',emoji:'🧂',name:'소금',description:'보유 시 국가 병력의 턴 병량 유지비 -20% · 국가 창고 +1/턴',isStackable:true,tradeable:true,tradeScore:18}),
 iron:Object.freeze({key:'iron',emoji:'⛏️',name:'철',description:'보유 시 특수 병종 철보병 징집 해금 · 국가 창고 +1/턴',isStackable:true,tradeable:true,tradeScore:24}),
 herb:Object.freeze({key:'herb',emoji:'🍵',name:'약초',description:'해당 영토의 턴 금 수입 +10% · 국가 창고 +1/턴',isStackable:true,tradeable:true,tradeScore:12}),
 silk:Object.freeze({key:'silk',emoji:'📜',name:'비단',description:'해당 영토의 턴 금 수입 +50% · 국가 창고 +1/턴',isStackable:true,tradeable:true,tradeScore:28}),
 bow:Object.freeze({key:'bow',emoji:'🏹',name:'각궁',description:'보유 시 궁병 계열 생산 금 비용 -30% · 국가 창고 +1/턴',isStackable:true,tradeable:true,tradeScore:20}),
 tachibana:Object.freeze({key:'tachibana',emoji:'🍊',name:'귤',description:'해상 공격 병량 소모 -30% · 해상 공격 1회당 재고 1개 소비 · 국가 창고 +1/턴',isStackable:true,tradeable:true,tradeScore:18})
});
window.RESOURCE_TYPES=RESOURCE_TYPES;
const RESOURCE_ICONS=Object.freeze(Object.fromEntries(Object.entries(RESOURCE_TYPES).map(([k,v])=>[k,v.emoji])));
const RESOURCE_NAMES=Object.freeze(Object.fromEntries(Object.entries(RESOURCE_TYPES).map(([k,v])=>[k,v.name])));
const STACKABLE_RESOURCE_KEYS=Object.freeze(Object.keys(RESOURCE_TYPES).filter(k=>RESOURCE_TYPES[k].isStackable));
const TRADEABLE_RESOURCE_KEYS=Object.freeze(STACKABLE_RESOURCE_KEYS.filter(k=>RESOURCE_TYPES[k].tradeable));
const GOLD_GIFTS=[[10,5],[50,15],[100,30]];

function normalizeResourceTerritoryName(v){return String(v||'').replace(/\s+/g,'').trim()}
function resourceWorld(){return window.SAMGUK_WORLD||window.WORLD||null}
function findResourceTerritoryId(name){const W=resourceWorld(),needle=normalizeResourceTerritoryName(name);return W?.territories?.findIndex(t=>normalizeResourceTerritoryName(t?.name)===needle)??-1}
function setWorldTerritoryResource(name,key,enabled=true){
 const W=resourceWorld(),i=findResourceTerritoryId(name);if(!W||i<0)return false;const t=W.territories[i],set=new Set(Array.isArray(t.resources)?t.resources:[]);
 if(enabled)set.add(key);else set.delete(key);t.resources=[...set];
 if(key==='iron'){
  if(enabled){t.specialty='IRON';t.resourceType='MINE'}
  else if(t.specialty==='IRON'||t.resourceType==='MINE'){t.specialty=null;t.resourceType=null}
 }
 return true;
}
function applySpecialtyResourceMapPatch(){
 // 요청 배치: 기존 졸본 철 삭제 → 신규 국내성 철. 나머지는 기존 특산품을 보존한 채 추가한다.
 setWorldTerritoryResource('졸본','iron',false);
 setWorldTerritoryResource('국내성','iron',true);
 setWorldTerritoryResource('개마고원','horse',true);
 setWorldTerritoryResource('개마고원','herb',true);
 setWorldTerritoryResource('소백산','herb',true);
 ['개원','동녕','숙신 고토','찰하'].forEach(n=>setWorldTerritoryResource(n,'bow',true));
 ['왜 서부 동부','탐라'].forEach(n=>setWorldTerritoryResource(n,'tachibana',true));
 ['산둥반도','동진 연안'].forEach(n=>setWorldTerritoryResource(n,'silk',true));
 setWorldTerritoryResource('소흥안령 변방','horse',true);
}
applySpecialtyResourceMapPatch();

function hasResource(i,key){return !!regions?.[Number(i)]?.resources?.includes(key)}
function nationResource(k,key){return !!regions?.some((r,i)=>typeof isActiveTerritory!=='function'||isActiveTerritory(i)?r.owner===Number(k)&&r.resources?.includes(key):false)}
function emptyFactionInventory(){return Object.fromEntries(STACKABLE_RESOURCE_KEYS.map(k=>[k,0]))}
function ensureFactionInventory(k){
 const f=typeof K!=='undefined'?K?.[Number(k)]:null;if(!f)return emptyFactionInventory();
 if(!f.inventory||Array.isArray(f.inventory))f.inventory=emptyFactionInventory();
 // v83~v103 저장본의 전략자원 구조를 새 창고로 1회 호환 이전한다.
 const legacy=f.resources&&typeof f.resources==='object'&&!Array.isArray(f.resources)?f.resources:null;
 if(legacy&&!f.__resourceInventoryMigrated){
  f.inventory.iron=Math.max(Number(f.inventory.iron)||0,Number(legacy.iron)||0);
  f.inventory.gold=Math.max(Number(f.inventory.gold)||0,Number(legacy.goldOre)||0,Number(legacy.gold)||0);
  f.__resourceInventoryMigrated=true;
 }
 for(const key of STACKABLE_RESOURCE_KEYS)f.inventory[key]=Math.max(0,Math.floor(Number(f.inventory[key])||0));
 return f.inventory;
}
function factionInventoryAmount(k,key){return Math.max(0,Math.floor(Number(ensureFactionInventory(k)[key])||0))}
function addFactionInventory(k,key,amount=1){if(!RESOURCE_TYPES[key]?.isStackable)return 0;const inv=ensureFactionInventory(k);inv[key]=Math.max(0,Math.floor((Number(inv[key])||0)+Number(amount||0)));return inv[key]}
function consumeFactionInventory(k,key,amount=1){amount=Math.max(0,Math.floor(Number(amount)||0));if(factionInventoryAmount(k,key)<amount)return false;addFactionInventory(k,key,-amount);return true}
function factionResourceProduction(k){
 const gain=emptyFactionInventory();if(typeof regions==='undefined')return gain;
 regions.forEach((r,i)=>{
  if((typeof isActiveTerritory==='function'&&!isActiveTerritory(i))||r.owner!==Number(k))return;
  const commerce=window.SAMGUK_PROFESSIONAL_CITY_RULES?.rules?.commerce,cityMult=r.cityType==='commerce'?(Number(commerce?.specialtyProductionMultiplier)||2):1;
  for(const key of (r.resources||[]))if(RESOURCE_TYPES[key]?.isStackable)gain[key]+=cityMult;
 });return gain;
}
function produceFactionInventory(k){const gain=factionResourceProduction(k);for(const key of STACKABLE_RESOURCE_KEYS)addFactionInventory(k,key,gain[key]);return gain}
function produceAllFactionInventories(){return (typeof K==='undefined'?[]:K.map((_,k)=>produceFactionInventory(k)))}

function resourceIncomeBonusPct(i){let pct=0;if(hasResource(i,'gold'))pct+=.30;if(hasResource(i,'herb'))pct+=.10;if(hasResource(i,'silk'))pct+=.50;return pct}
function resourceTax(i){return 1+resourceIncomeBonusPct(i)}
function resourceFoodProductionMultiplier(i){return hasResource(i,'rice')?2:1}
function resourceArmyFoodUpkeepMultiplier(k){return factionInventoryAmount(k,'salt')>0 ? .80 : 1}
function resourceConstructionCostMultiplier(i){return hasResource(i,'wood')?.70:1}
function resourceRecruitCostMultiplier(i,type,cavalry=false){
 let mult=1;const owner=regions?.[Number(i)]?.owner,unit=String(type||'');
 if((cavalry||['cavalry','nomadCavalry','armoredCavalry'].includes(unit))&&hasResource(i,'horse'))mult*=.50;
 if(['archers'].includes(unit)&&factionInventoryAmount(owner,'bow')>0)mult*=.70;
 return mult;
}
function resourceUnlocksUnit(k,type){if(type==='ironInfantry')return factionInventoryAmount(k,'iron')>0;return true}
function resourceSeaAttackSupply(k,troops){
 const base=Math.max(1,Math.floor(Math.max(0,Number(troops)||0)/10));const hasTachibana=factionInventoryAmount(k,'tachibana')>0;
 return {base,cost:hasTachibana?Math.max(1,Math.floor(base*.70)):base,useTachibana:hasTachibana};
}
function resourceDraft(){return 1} // 구형 벼/소금/말 징집량 증가는 v104 규칙에서 제거.
function riceRecruit(){return 0}   // 벼는 병량 생산 ×2 전용.
function palaceCost(k){return Number(K?.[k]?.palaceUpgradeCost)||0}

function resourceEffectText(key){return RESOURCE_TYPES[key]?.description||''}
function resourceUI(i){
 const r=regions?.[Number(i)];if(!r)return '';const k=K?.[r.owner]||{},wood=nationResource(r.owner,'wood'),disabled=busy||!playing||ap<1||!wood;
 const items=(r.resources||[]).map(x=>`<span class="resource-chip" title="${resourceEffectText(x)}"><b>${RESOURCE_ICONS[x]||'◆'}</b>${RESOURCE_NAMES[x]||x}</span>`).join('')||'<span class="resource-empty">없음</span>';
 const effects=(r.resources||[]).map(x=>`<small>${RESOURCE_ICONS[x]||'◆'} ${RESOURCE_NAMES[x]||x} · ${resourceEffectText(x)}</small>`).join('')||'<small>이 영토에는 특산품 효과가 없습니다.</small>';
 return `<section class="terrain-info territory-resource-card" aria-label="특산품"><div class="resource-card-head"><strong>특산품</strong><div class="resource-chip-row">${items}</div></div><div class="resource-effects">${effects}</div>${r.owner===player&&actionMode==='domestic'&&isCapital(i)?`<button class="resource-palace-action" data-resource-action="palace" ${disabled||k.palaceLevel>=3||k.palaceTurn===turn||gold<palaceCost(player)?'disabled':''}>궁전 ${k.palaceLevel}/3 · 증축 행동 1${palaceCost(player)?' · 금 '+palaceCost(player):''}</button><small class="resource-palace-note">목재 보유 필요 · 턴당 1단계 · 매 턴 행동력 +${k.palaceLevel}</small>`:''}</section>`
}
function resourceAction(action){if(!playing||busy||selected===null||regions[selected].owner!==player||actionMode!=='domestic'||ap<1||!nationResource(player,'wood'))return;const k=K[player];if(action==='palace'){if(!isCapital(selected)||k.palaceLevel>=3||k.palaceTurn===turn||gold<palaceCost(player))return;gold-=palaceCost(player);ap--;k.palaceLevel++;k.palaceTurn=turn;log('궁전 '+k.palaceLevel+'단계 · 다음 턴 행동력 +'+k.palaceLevel)}else return;render()}
function goldGift(index){const k=diplomacyTarget,row=GOLD_GIFTS[index];if(!row||!playing||busy||k===null||k===player||!count(k)||wars[player][k]||gold<row[0])return;gold-=row[0];relations[player][k]=relations[k][player]=Math.min(100,relations[player][k]+row[1]);render();renderDiplomacy()}
function goldGiftUI(k){return '<h3>금화 선물</h3><div class="destination-list">'+GOLD_GIFTS.map(([cost,gain],i)=>`<button data-gold-gift="${i}" ${busy||!playing||wars[player][k]||gold<cost?'disabled':''}>${cost}금<small>우호도 +${gain}</small></button>`).join('')+'</div>'}

window.SAMGUK_RESOURCE_SYSTEM=Object.freeze({
 version:104,types:RESOURCE_TYPES,stackableKeys:STACKABLE_RESOURCE_KEYS,tradeableKeys:TRADEABLE_RESOURCE_KEYS,
 emptyInventory:emptyFactionInventory,ensureInventory:ensureFactionInventory,amount:factionInventoryAmount,add:addFactionInventory,consume:consumeFactionInventory,
 production:factionResourceProduction,produce:produceFactionInventory,produceAll:produceAllFactionInventories,
 incomeBonusPct:resourceIncomeBonusPct,foodProductionMultiplier:resourceFoodProductionMultiplier,armyFoodUpkeepMultiplier:resourceArmyFoodUpkeepMultiplier,
 constructionCostMultiplier:resourceConstructionCostMultiplier,recruitCostMultiplier:resourceRecruitCostMultiplier,unlocksUnit:resourceUnlocksUnit,seaAttackSupply:resourceSeaAttackSupply,
 patchTerritoryResources:applySpecialtyResourceMapPatch,findTerritoryId:findResourceTerritoryId
});
