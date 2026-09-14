// =============================================================================
// v106 STEPPE TERRAIN INTEGRATION
// - Four designated northern territories become the dedicated STEPPE terrain type.
// - STEPPE rules are the single source of truth for economy/combat/movement hooks.
// =============================================================================
const TERRAIN_TYPES=Object.freeze({
 STEPPE:Object.freeze({
  key:'STEPPE',name:'초원',texture:'assets/textures/steppe.png',insetPadding:18,
  foodMultiplier:.5,pastoralIncomeMultiplier:1.3,cavalryRecruitCostMultiplier:.8,
  cavalryAttackMultiplier:1.2,cavalryDefenseMultiplier:1.2,infantryDefenseMultiplier:.85,
  forcedMarchApCost:1,forcedMarchMaxHops:2,minCavalryRatio:.5
 })
});
window.TERRAIN_TYPES=TERRAIN_TYPES;

const STEPPE_TERRITORY_BINDINGS=Object.freeze([
 Object.freeze({id:'yuyeon_east_steppe',index:52,name:'유연 동부 초원'}),
 Object.freeze({id:'daeheungan_steppe',index:77,name:'대흥안령 초원'}),
 Object.freeze({id:'yuyeon_mountain_west',index:74,name:'유연 산지 서부'}),
 Object.freeze({id:'yuyeon_north',index:51,name:'유연 북부'})
]);
const STEPPE_TERRITORY_IDS=Object.freeze(STEPPE_TERRITORY_BINDINGS.map(x=>x.index));
const STEPPE_TERRITORY_SET=new Set(STEPPE_TERRITORY_IDS);
const STEPPE_CAVALRY_KEYS=Object.freeze(['cavalry','nomadCavalry','armoredCavalry']);

// WORLD data is available before this module. Bind stable IDs + terrainType once so later
// initialRegions() can inherit the terrain metadata without changing the world geometry.
for(const binding of STEPPE_TERRITORY_BINDINGS){
 const t=window.SAMGUK_WORLD?.territories?.[binding.index]||window.WORLD?.territories?.[binding.index];
 if(!t)continue;
 if(!t.id)t.id=binding.id;
 t.terrainType='STEPPE';
}
function bindSteppeTerrainData(list){
 if(!Array.isArray(list))return list;
 for(const binding of STEPPE_TERRITORY_BINDINGS){
  const r=list[binding.index];if(!r)continue;
  r.territoryId=binding.id;r.terrainType='STEPPE';
 }
 return list;
}
function isSteppeTerrain(i){
 const id=Number(i);if(!Number.isInteger(id))return false;
 if(STEPPE_TERRITORY_SET.has(id))return true;
 try{if(regions?.[id]?.terrainType==='STEPPE')return true}catch(_e){}
 return (window.SAMGUK_WORLD?.territories?.[id]||window.WORLD?.territories?.[id])?.terrainType==='STEPPE';
}
function steppeFoodMultiplier(i){return isSteppeTerrain(i)?TERRAIN_TYPES.STEPPE.foodMultiplier:1}
function steppeIncomeMultiplier(i){return isSteppeTerrain(i)?TERRAIN_TYPES.STEPPE.pastoralIncomeMultiplier:1}
function steppeCavalryRecruitMultiplier(i){return isSteppeTerrain(i)?TERRAIN_TYPES.STEPPE.cavalryRecruitCostMultiplier:1}
function isSteppeCavalryType(type){return STEPPE_CAVALRY_KEYS.includes(String(type||''))}

const TERRAIN_TEXT={
 mountain:{name:'산악',text:'방어 +30% · 기병 전투력 −20% · 이동 행동 2'},
 high:{name:'고지',text:'출발지 공격 +10% · 방어 +15% · 인접 적군 정찰'},
 grass:{name:'초원',text:'출발지 기병 공격 +20% · 이동 행동 0.5'},
 steppe:{name:'초원(STEPPE)',text:'병량 생산 −50% · 목축 수입 +30% · 기병 모집비 −20% · 초원 전투 기병 공/방 +20% · 보병 방어 −15%'},
 plain:{name:'평지',text:'기본 전투력 · 이동 행동 1'}
};
const riverEdges=new Set(TERRAIN_RULES_DATA.crossings.map(e=>e.join('-')));
function terrainKind(i){return isSteppeTerrain(i)?'steppe':TERRAIN_RULES_DATA.areas[i].kind}
function crossesRiver(i,j){return !isSeaRoute(i,j)&&riverEdges.has([i,j].sort((a,b)=>a-b).join('-'))}
function mountainLink(i){return terrainKind(i)==='mountain'&&neighbors[i].some(j=>!isSeaRoute(i,j)&&regions[j].owner===regions[i].owner&&terrainKind(j)==='mountain')}
function riverSupply(i){return TERRAIN_RULES_DATA.areas[i].river&&neighbors[i].some(j=>!isSeaRoute(i,j)&&regions[j].owner===regions[i].owner&&TERRAIN_RULES_DATA.areas[j].river)}
function isGrassLikeKind(kind){return kind==='grass'||kind==='steppe'}
function grassNetwork(k){return regions.filter((r,i)=>r.owner===k&&isGrassLikeKind(terrainKind(i))).length>=3}
function cavalryCost(i){const type=cavalryType(regions[i].owner);return recruitmentCost(i,30,true,type)}

function steppeCavalryRatio(i){
 if(!isSteppeTerrain(i))return 0;
 const n=Math.max(0,Number(troopSend(i))||0);if(!n)return 0;
 const u=sendUnits(i),c=STEPPE_CAVALRY_KEYS.reduce((sum,key)=>sum+(Number(u?.[key])||0),0);
 return Math.max(0,Math.min(1,c/n));
}
function steppeForcedMarchPath(i,j){
 i=Number(i);j=Number(j);if(!Number.isInteger(i)||!Number.isInteger(j)||i===j)return null;
 if(!isSteppeTerrain(i)||!isSteppeTerrain(j)||steppeCavalryRatio(i)<=TERRAIN_TYPES.STEPPE.minCavalryRatio)return null;
 if((neighbors[i]||[]).includes(j))return null; // 강행군은 정확히 2칸 이동에만 적용.
 const owner=regions?.[i]?.owner;if(!Number.isInteger(owner))return null;
 for(const mid of neighbors[i]||[]){
  if(!isSteppeTerrain(mid)||regions?.[mid]?.owner!==owner||isSeaRoute(i,mid))continue;
  if(!(neighbors[mid]||[]).includes(j)||isSeaRoute(mid,j))continue;
  return [i,mid,j];
 }
 return null;
}
function canSteppeForcedMarch(i,j){return !!steppeForcedMarchPath(i,j)}
function movementCandidateTargets(i){
 i=Number(i);const out=new Set(neighbors?.[i]||[]);
 if(!isSteppeTerrain(i)||steppeCavalryRatio(i)<=TERRAIN_TYPES.STEPPE.minCavalryRatio)return [...out];
 const owner=regions?.[i]?.owner;
 for(const mid of neighbors?.[i]||[]){
  if(!isSteppeTerrain(mid)||regions?.[mid]?.owner!==owner||isSeaRoute(i,mid))continue;
  for(const j of neighbors?.[mid]||[]){if(j!==i&&isSteppeTerrain(j)&&!isSeaRoute(mid,j))out.add(j)}
 }
 return [...out];
}
function movementCost(i,j){
 let cost;
 if(canSteppeForcedMarch(i,j))cost=TERRAIN_TYPES.STEPPE.forcedMarchApCost;
 else if(isSeaRoute(i,j))cost=1;
 else{
  const kind=terrainKind(j),base=kind==='mountain'?2:kind==='grass'?.5:1,u=sendUnits(i),n=troopSend(i),fast=u.nomadCavalry+(nationHas(regions[i].owner,'nomad')?u.cavalry+u.armoredCavalry:0),factor=kind==='grass'?.63:.7;
  cost=Math.round(base*(1-(n?fast/n:0)*(1-factor))*1000)/1000;
 }
 // v121 군사도시: 출병/공격 행동력 -1, 최종 비용은 기획 명세대로 최소 1.
 const military=window.SAMGUK_PROFESSIONAL_CITY_RULES?.rules?.military;
 if(regions?.[Number(i)]?.cityType==='military'&&military)cost=Math.max(Number(military.minActionPointCost)||1,cost-(Number(military.actionPointDiscount)||0));
 return Math.round(cost*1000)/1000;
}
function cavalrySend(i){return sendUnits(i).cavalry}
function cavalryModifier(i,j,attack=true){let value=1;if(terrainKind(j)==='mountain')value-=.2;if(attack&&terrainKind(i)==='grass')value+=.2;return value}
function terrainAttack(i,j){
 const u=sendUnits(i),k=regions[i].owner;if(k===regions[j].owner)return troopSend(i);
 const mountain=terrainKind(j)==='mountain',grass=terrainKind(i)==='grass',steppeBattle=isSteppeTerrain(j),sea=isSeaRoute(i,j),cav=cavalryModifier(i,j);
 const infantry=u.infantry+u.ironInfantry+u.archers+u.hwarang*(1+(mountain?.1:0))+u.pirates*(sea?1.3:1);
 const cavalry=((u.cavalry+u.nomadCavalry)*cav+u.armoredCavalry*(cav+.15+(grass?.3:0)))*(steppeBattle?TERRAIN_TYPES.STEPPE.cavalryAttackMultiplier:1);
 const river=crossesRiver(i,j)?.75:1,normal=infantry+cavalry;
 return (normal*river*(sea?seaFactor(k):1)+u.marines*(sea?1.5:1))*(terrainKind(i)==='high'?1.1:1)*(sea&&nationHas(k,'pirateHire')?1.2:1)*(supportActive(k)?1.3:1)*(sea&&k===window.SAMGUK_WAKO_ID?1.5:1);
}
function terrainDefense(i){
 const u=unitCounts(regions[i]),b=regions[i].buildings,cav=cavalryModifier(i,i,false),steppe=isSteppeTerrain(i),mountain=terrainKind(i)==='mountain';
 const infantry=(u.infantry+u.ironInfantry*1.3+u.hwarang*(1.2+(mountain?.1:0)))*(steppe?TERRAIN_TYPES.STEPPE.infantryDefenseMultiplier:1);
 const cavalry=((u.cavalry+u.nomadCavalry)*cav+u.armoredCavalry*(cav+.15))*(steppe?TERRAIN_TYPES.STEPPE.cavalryDefenseMultiplier:1);
 const other=u.marines+u.pirates+u.archers*((b.wall?1.5:1.25)+(b.jiangnanFort?.2:0));
 return Math.ceil((infantry+cavalry+other)*(1+defensePercent(i)/100));
}
function recruitCavalry(){if(!playing||busy||ap<1||selected===null||actionMode!=='domestic'||regions[selected].owner!==player)return;const cost=cavalryCost(selected),type=cavalryType(player),foodCost=unitRecruitFoodCost(type,selected);if(gold<cost||countryFood(player)<foodCost)return;gold-=cost;K[player].gold=gold;setCountryFood(player,countryFood(player)-foodCost);ap--;const n=drafted(selected,9,true,type);regions[selected].troops+=n;regions[selected][type]=(regions[selected][type]||0)+n;log(regions[selected].name+' '+UNIT_NAMES[type]+' '+n+'명 모집 · 병량 -'+foodCost);render()}
function terrainInfo(i){
 const t=TERRAIN_TEXT[terrainKind(i)]||TERRAIN_TEXT.plain,r=regions[i],river=TERRAIN_RULES_DATA.areas[i].river,mountainFood=window.SAMGUK_MOUNTAIN_TERRAIN?.has?.(i),steppe=isSteppeTerrain(i),ratio=steppe?Math.round(steppeCavalryRatio(i)*100):0;
 const steppeLine=steppe?`<br>🌿 STEPPE: 농업도시 건설 불가 · 병량 ×0.5 · 목축 수입 ×1.3 · 기병 모집비 ×0.8<br>⚔ 초원 전투: 기병 공/방 +20% · 보병 방어 -15% · 기병비율 ${ratio}%${ratio>50?' (2칸 강행군 가능)':''}`:'';
 return `<section class="terrain-info"><strong>${t.name}${river?' · 강 인접':''}${mountainFood?' · 산맥 지대':''}</strong><p>${t.text}${river?'<br>강을 건너 공격: 공격 −25% (해병 면제)':''}${mountainFood?'<br>🌾 산맥 효과: 이 영토의 병량 생산 −50%':''}${steppeLine}</p><p>연계: ${mountainLink(i)?'산악 방어선 방어 +5%':riverSupply(i)?'강 보급 병력 +1 / 턴':'없음'}${mountainLink(i)&&riverSupply(i)?' · 강 보급 병력 +1 / 턴':''}${grassNetwork(r.owner)?' · 초원 3곳 이상: 기병 모집비 −10%':''}</p><small>각 연계는 1회만 적용됩니다. 지형 보너스는 표시 ON/OFF와 무관합니다.</small>${terrainKind(i)==='high'?`<div class="scout"><strong>고지 정찰 · 인접 적군</strong>${neighbors[i].filter(j=>regions[j].owner!==r.owner).map(j=>`<p>${regions[j].name} · ${K[regions[j].owner].name} · ${regions[j].troops}명 (기병 ${regions[j].cavalry})</p>`).join('')||'<p>인접 적군 없음</p>'}</div>`:''}</section>`;
}
function battleModifiers(i,j){
 const wall=greatWallDefensePercent(i,j),steppe=isSteppeTerrain(j),march=canSteppeForcedMarch(i,j);
 return `출진 ${unitSummary(sendUnits(i))}<br>${terrainKind(i)==='high'?'고지 공격 +10% · ':''}${terrainKind(i)==='grass'?'초원 기병 +20% · ':''}${terrainKind(j)==='mountain'?'산악 기병 −20% · ':''}${steppe?'STEPPE 기병 공/방 +20% · 보병 방어 −15% · ':''}${crossesRiver(i,j)?'도하 −25% (해병 면제) · ':''}공통 수비 +${defensePercent(j)}%${wall?' · 만리장성 +'+wall+'%':''}<br>${march?'🌿 기병 강행군: 2칸 이동 · 행동 1<br>':''}궁병 수비 +${(regions[j].buildings.wall?50:25)+(regions[j].buildings.jiangnanFort?20:0)}% · 공격 시 미적용<br>병과별 보정 후 공통 지형·수비 보너스 적용`;
}

window.SAMGUK_STEPPE_TERRAIN=Object.freeze({
 version:106,type:TERRAIN_TYPES.STEPPE,bindings:STEPPE_TERRITORY_BINDINGS,ids:STEPPE_TERRITORY_IDS,
 has:isSteppeTerrain,bind:bindSteppeTerrainData,foodMultiplier:TERRAIN_TYPES.STEPPE.foodMultiplier,
 incomeMultiplier:TERRAIN_TYPES.STEPPE.pastoralIncomeMultiplier,cavalryRecruitCostMultiplier:TERRAIN_TYPES.STEPPE.cavalryRecruitCostMultiplier,
 cavalryRatio:steppeCavalryRatio,forcedMarchPath:steppeForcedMarchPath,canForcedMarch:canSteppeForcedMarch,
 movementCandidates:movementCandidateTargets
});
