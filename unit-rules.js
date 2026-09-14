// Fixed tags and unit modifiers; no generated decisions or descriptions.
const NATION_TAGS={백제:['trade'],가야:['confederation'],신라:['defensive'],왜:['maritime','pirateHire'],고구려:['continental','agropastoral'],동진:['continental','jiangnan'],유연:['continental','nomad'],거란:['continental','nomad'],북연:['continental','nomad'],남연:['continental','nomad'],읍루:['continental','nomad'],부여:['continental','nomad']};
const TRAIT_TEXT={maritime:'해양국가 · 해상 공격 패널티 없음',continental:'대륙국가 · 일반 병과 해상 공격 추가 패널티 −30%',nomad:'기마민족 · 기병 모집비 −30% · 기병 이동 −30%, 초원 추가 −10% · 고유: 유목기병',trade:'무역국가 · 해안 수입 +25% · 고유: 교역항',confederation:'연합국가 · 우호국 지원군 합류 턴 공격 +30% · 고유: 대장간',defensive:'방어국가 · 소유 영토 방어 +15% · 고유: 화랑',agropastoral:'반농반목 · 산악/초원 징병 +20% · 고유: 천리장성, 철갑기병',jiangnan:'강남 방어 · 성벽 방어 +20%, 강 인접 +10% · 고유: 강남성곽',pirateHire:'해적 고용 · 상륙 공격 +20% · 고유: 해적 용병'};
const UNIT_KEYS=['infantry','ironInfantry','cavalry','archers','marines','hwarang','armoredCavalry','nomadCavalry','pirates'];
const UNIT_NAMES={infantry:'보병',ironInfantry:'철보병',cavalry:'기병',archers:'궁병',marines:'해군',hwarang:'화랑',armoredCavalry:'철갑기병',nomadCavalry:'유목기병',pirates:'해적'};
const UNIT_FOOD_COSTS=Object.freeze({infantry:20,archers:12,cavalry:18,marines:22,armoredCavalry:28,ironInfantry:20,nomadCavalry:15,pirates:18,hwarang:15,ssawulabi:15,heavyInfantry:22});
function unitRecruitFoodCost(type,territoryId=null){const base=Object.hasOwn(UNIT_FOOD_COSTS,type)?UNIT_FOOD_COSTS[type]:(({'보병':20,'궁병':12,'기병':18,'해군':22,'해병':22,'철갑기병':28,'철보병':20,'유목기병':15,'해적':18,'해적 용병':18,'화랑':15,'싸울아비':15,'중장보병':22})[UNIT_NAMES[type]||type]??0);const id=Number(territoryId),agri=window.SAMGUK_PROFESSIONAL_CITY_RULES?.rules?.agriculture;if(Number.isInteger(id)&&regions?.[id]?.cityType==='agriculture'&&agri)return Math.max(1,Math.ceil(base*(Number(agri.recruitFoodCostMultiplier)||.8)-1e-9));return base}
function nationHas(k,tag){return K[k].traits.includes(tag)}
function nationTraitText(k){return K[k].traits.map(t=>TRAIT_TEXT[t]).join('<br>')||'일반 국가 · 일반 병과 해상 공격 −50%'}
function emptyUnits(){return Object.fromEntries(UNIT_KEYS.map(k=>[k,0]))}
function unitCounts(r){const out=emptyUnits();for(const k of UNIT_KEYS.slice(1))out[k]=r[k]||0;out.infantry=r.troops-Object.values(out).reduce((a,b)=>a+b,0);return out}
function unitPortion(units,n){const total=UNIT_KEYS.reduce((s,k)=>s+(units[k]||0),0),out=Object.fromEntries(UNIT_KEYS.map(k=>[k,total?Math.floor((units[k]||0)*n/total):0]));let left=n-Object.values(out).reduce((a,b)=>a+b,0);const order=[...UNIT_KEYS].sort((a,b)=>((units[b]||0)*n/total-out[b])-((units[a]||0)*n/total-out[a]));for(const k of order)if(left>0&&out[k]<(units[k]||0)){out[k]++;left--}return out}
function sendUnits(i){return unitPortion(unitCounts(regions[i]),troopSend(i))}
function changeUnits(r,u,sign=1){r.troops+=sign*Object.values(u).reduce((a,b)=>a+b,0);for(const k of UNIT_KEYS.slice(1))r[k]=(r[k]||0)+sign*(u[k]||0)}
function replaceUnits(r,u){r.troops=0;for(const k of UNIT_KEYS.slice(1))r[k]=0;changeUnits(r,u)}
function unitSummary(u){return UNIT_KEYS.filter(k=>u[k]>0||k==='infantry').map(k=>UNIT_NAMES[k]+' '+u[k]).join(' · ')}
function seaFactor(k){return nationHas(k,'maritime')?1:nationHas(k,'continental')?.2:.5}
function seaDescription(k){return '해상 공격: 일반 병과 '+(seaFactor(k)===1?'패널티 없음':'−'+Math.round((1-seaFactor(k))*100)+'%')+' · 해병 +50%'+(nationHas(k,'pirateHire')?' · 왜 상륙 +20% · 해적 용병 고유 +30%':'')}
const SPECIAL_RECRUITS={
 ironInfantry:{cost:38,text:'철 재고 보유 시 징집 가능 · 수비 전력 +30%'},
 archers:{cost:30,text:'수비 +25% · 성벽 수비 +50%'},
 marines:{cost:40,text:'도하 패널티 없음 · 해상 공격 +50%'},
 hwarang:{cost:35,nation:2,originNations:[2],text:'방어 +20% · 산악 전투 추가 +10%'},
 armoredCavalry:{cost:45,nation:0,originNations:[0],text:'기본 전투 +15% · 초원 공격 추가 +30%'},
 nomadCavalry:{cost:30,originNations:[4,8,9],text:'기존 유목기병 전투·이동 효과 유지'},
 pirates:{cost:35,nation:11,originNations:[11],text:'상륙 공격 +30% · 육상 추가 보너스 없음'}
};
// 수도 점령 해금은 별도 저장값 없이 현재 수도 owner를 실시간으로 검사한다.
// 아직 이 소스에 병과 정의가 없는 싸울아비/철보병/중장보병도 같은 이름으로 추가되면 이 매핑을 자동 사용한다.
const SPECIAL_UNIT_ORIGINS_BY_NAME={
 '철갑기병':[0],
 '싸울아비':[1],
 '화랑':[2],
 '철보병':[3],
 '중장보병':[10],
 '유목기병':[4,8,9],
 '해적':[11],
 '해적 용병':[11]
};
function specialUnitOrigins(type){if(type==='ironInfantry')return [];const spec=SPECIAL_RECRUITS[type];if(spec?.originNations?.length)return spec.originNations;const name=UNIT_NAMES[type];return SPECIAL_UNIT_ORIGINS_BY_NAME[name]||[]}
function isNationSpecialUnit(type){return specialUnitOrigins(type).length>0}
function controlsOriginalCapital(countryId,originNationId){const capitalId=CAPITALS[originNationId];return Number.isInteger(capitalId)&&!!regions[capitalId]&&regions[capitalId].owner===countryId}
function canRecruitSpecialUnit(countryId,type){if(typeof resourceUnlocksUnit==='function'&&!resourceUnlocksUnit(countryId,type))return false;const origins=specialUnitOrigins(type);if(!origins.length)return true;if(origins.includes(countryId))return true;return origins.some(originNationId=>controlsOriginalCapital(countryId,originNationId))}
function specialRecruitCost(i,type){const spec=SPECIAL_RECRUITS[type];if(!spec)return Infinity;if(type==='nomadCavalry')return cavalryCost(i);return recruitmentCost(i,spec.cost,type==='armoredCavalry',type)}
function recruitSpecial(type){const spec=SPECIAL_RECRUITS[type];if(!spec||selected===null||!canRecruitSpecialUnit(player,type)||!playing||busy||ap<1||actionMode!=='domestic'||regions[selected].owner!==player)return;const cost=specialRecruitCost(selected,type),foodCost=unitRecruitFoodCost(type,selected);if(gold<cost||countryFood(player)<foodCost)return;gold-=cost;K[player].gold=gold;setCountryFood(player,countryFood(player)-foodCost);ap--;const n=drafted(selected,9,true,type);regions[selected].troops+=n;regions[selected][type]=(regions[selected][type]||0)+n;log(regions[selected].name+' '+UNIT_NAMES[type]+' '+n+'명 모집 · 병량 -'+foodCost);render()}
function specialRecruitUI(i){const owner=regions[i].owner;return Object.entries(SPECIAL_RECRUITS).filter(([key])=>{if(!canRecruitSpecialUnit(owner,key))return false;/* 기존 기마민족은 기존 기병 버튼에서 이미 유목기병을 모집하므로 중복 버튼만 숨긴다. */if(key==='nomadCavalry'&&cavalryType(owner)==='nomadCavalry')return false;return true}).map(([key,s])=>{const cost=specialRecruitCost(i,key),unique=isNationSpecialUnit(key)||key==='ironInfantry';return `<button class="action recruit-slot ${unique?'unique-unit':''}" data-recruit-unit="${key}" ${busy||ap<1||gold<cost||countryFood(player)<unitRecruitFoodCost(key,i)||!playing?'disabled':''}>${unique?'★ ':''}${UNIT_NAMES[key]} +${drafted(i,9,false,key)}명 <span>· 금 ${cost} · 병량 ${unitRecruitFoodCost(key,i)}</span></button><p class="recruit-slot-desc" title="${s.text} · 행동 1">${s.text} · 행동 1</p>`}).join('')}
function specialRecruitCandidates(k){return Object.keys(SPECIAL_RECRUITS).filter(type=>(isNationSpecialUnit(type)||type==='ironInfantry')&&canRecruitSpecialUnit(k,type))}
function aiRecruitSpecialUnit(k,i){if(!regions[i]||regions[i].owner!==k||!K[k])return 0;const candidates=specialRecruitCandidates(k).filter(type=>K[k].gold>=specialRecruitCost(i,type)&&countryFood(k)>=unitRecruitFoodCost(type,i));if(!candidates.length)return 0;const type=candidates[Math.abs(turn+k+i)%candidates.length],cost=specialRecruitCost(i,type),foodCost=unitRecruitFoodCost(type,i);K[k].gold=Math.round((K[k].gold-cost)*100)/100;setCountryFood(k,countryFood(k)-foodCost);const n=drafted(i,9,true,type);regions[i].troops+=n;regions[i][type]=(regions[i][type]||0)+n;log(K[k].name+' · '+regions[i].name+' '+UNIT_NAMES[type]+' '+n+'명 모집 · 병량 -'+foodCost);return 1}
