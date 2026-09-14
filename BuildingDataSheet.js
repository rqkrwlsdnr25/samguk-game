'use strict';
(function(global){
  const freeze = (v) => Object.freeze(v);
  const level = (cost, production={}, upkeep={}) => freeze({cost, production:freeze({...production}), upkeep:freeze({...upkeep})});

  const BUILDINGS = freeze({
    village: freeze({
      id:'village', name:'마을', icon:'村', category:'basic', maxLevel:5,
      description:'농촌 개발. 단계가 오를수록 매 턴 병량 생산량이 증가합니다.',
      levels: freeze([
        level(40,{food:6}), level(55,{food:10}), level(70,{food:15}), level(90,{food:21}), level(115,{food:28})
      ])
    }),
    market: freeze({
      id:'market', name:'시장', icon:'市', category:'basic', maxLevel:1,
      description:'매 턴 금 +8.', levels:freeze([level(60,{gold:8})])
    }),
    barracks: freeze({
      id:'barracks', name:'막사', icon:'募', category:'basic', maxLevel:1,
      description:'모병량 +8. 매 턴 금 2 · 병량 3 유지비.',
      levels:freeze([level(40,{}, {gold:2,food:3})]), effects:freeze({recruitFlat:8})
    }),
    talentOffice: freeze({
      id:'talentOffice', name:'인재소', hanja:'人才所', icon:'人', category:'utility', maxLevel:1,
      description:'모든 일반 영지에 건설 가능. 인사 → 인재 찾기를 해금합니다. 인재 탐색 1회 50금.',
      levels:freeze([level(90,{}, {gold:1})]), effects:freeze({personnelSearch:true})
    }),
    university: freeze({
      id:'university', name:'서원', hanja:'書院', icon:'書', category:'utility', maxLevel:3, nationLimit:2,
      description:'국책 포인트를 생산하는 고급 교육·연구 기관. III 단계에서 행동력 +1.',
      levels:freeze([
        level(160,{policy:2},{gold:2}),
        level(240,{policy:4},{gold:4}),
        level(360,{policy:7},{gold:6})
      ]), effects:freeze({finalActionPoints:1})
    }),
    temple: freeze({
      id:'temple', name:'사찰', icon:'寺', category:'utility', maxLevel:1,
      description:'모든 영지 건설 가능. 매 턴 국가 전쟁 불만도 -1% · 금 2 유지비.',
      levels:freeze([level(100,{}, {gold:2})]), effects:freeze({warPenaltyDecay:1})
    }),

    tradeOffice: freeze({id:'tradeOffice',name:'교역소',icon:'商',category:'commerce',maxLevel:1,description:'상업도시 III 전용. 턴 수입 +12%.',levels:freeze([level(85)]),unlock:freeze({cityType:'commerce',minCityLevel:3}),effects:freeze({incomePct:.12})}),
    inn: freeze({id:'inn',name:'객잔',icon:'客',category:'commerce',maxLevel:1,description:'상업도시 III 전용. 등용/회유 성공률 +5%.',levels:freeze([level(60)]),unlock:freeze({cityType:'commerce',minCityLevel:3}),effects:freeze({recruitSchemePct:.05})}),
    warehouse: freeze({id:'warehouse',name:'창고',icon:'倉',category:'commerce',maxLevel:1,description:'상업도시 III 전용. 턴 수입 +3금.',levels:freeze([level(70,{gold:3})]),unlock:freeze({cityType:'commerce',minCityLevel:3}),effects:freeze({incomeFlat:3})}),
    mint: freeze({id:'mint',name:'조폐소',icon:'錢',category:'commerce',maxLevel:1,description:'상업도시 III 전용. 턴 수입 +18%.',levels:freeze([level(110)]),unlock:freeze({cityType:'commerce',minCityLevel:3}),effects:freeze({incomePct:.18})}),

    trainingGround: freeze({id:'trainingGround',name:'훈련소',icon:'練',category:'military',maxLevel:1,description:'군사도시 III 전용. 공격 전력 +5%.',levels:freeze([level(75,{}, {gold:2,food:2})]),unlock:freeze({cityType:'military',minCityLevel:3}),effects:freeze({attackPct:.05})}),
    armory: freeze({id:'armory',name:'병기고',icon:'兵',category:'military',maxLevel:1,description:'군사도시 III 전용. 공격 전력 +6%.',levels:freeze([level(90,{}, {gold:3,food:2})]),unlock:freeze({cityType:'military',minCityLevel:3}),effects:freeze({attackPct:.06})}),
    cityGate: freeze({id:'cityGate',name:'성문',icon:'門',category:'military',maxLevel:1,description:'군사도시 III 전용. 수비 전력 +10%.',levels:freeze([level(80,{}, {gold:2})]),unlock:freeze({cityType:'military',minCityLevel:3}),effects:freeze({defensePct:.10})}),
    wall: freeze({id:'wall',name:'성벽',icon:'壁',category:'military',maxLevel:1,description:'군사도시 III 전용. 수비 보너스 +25%.',levels:freeze([level(50,{}, {gold:1})]),unlock:freeze({cityType:'military',minCityLevel:3}),effects:freeze({defensePct:.25})}),
    watchtower: freeze({id:'watchtower',name:'망루',icon:'望',category:'military',maxLevel:1,description:'군사도시 III 전용. 적 기습 공격 보너스 제거.',levels:freeze([level(50,{}, {gold:1})]),unlock:freeze({cityType:'military',minCityLevel:3}),effects:freeze({antiSurprise:true})}),

    granary: freeze({id:'granary',name:'곡창',icon:'穀',category:'agriculture',maxLevel:1,description:'농업도시 III 전용. 병량 +5/턴 · 징집 효율 +12%.',levels:freeze([level(55,{food:5})]),unlock:freeze({cityType:'agriculture',minCityLevel:3}),effects:freeze({recruitPct:.12})}),
    irrigation: freeze({id:'irrigation',name:'관개시설',icon:'水',category:'agriculture',maxLevel:1,description:'농업도시 III 전용. 병량 +8/턴 · 병력 보충 +2.',levels:freeze([level(65,{food:8})]),unlock:freeze({cityType:'agriculture',minCityLevel:3}),effects:freeze({troopGrowthFlat:2})}),
    agriTuntian: freeze({id:'agriTuntian',name:'둔전',icon:'田',category:'agriculture',maxLevel:1,description:'농업도시 III 전용. 병량 +6/턴 · 징집 +5% · 수입 +2금.',levels:freeze([level(75,{food:6,gold:2})]),unlock:freeze({cityType:'agriculture',minCityLevel:3}),effects:freeze({recruitPct:.05,incomeFlat:2})}),
    relayStation: freeze({id:'relayStation',name:'역참',icon:'驛',category:'agriculture',maxLevel:1,description:'농업도시 III 전용. 최대 출병 병력 +10%.',levels:freeze([level(70)]),unlock:freeze({cityType:'agriculture',minCityLevel:3}),effects:freeze({troopLimitPct:.10})}),
    barracksVillage: freeze({id:'barracksVillage',name:'병영촌',icon:'屯',category:'agriculture',maxLevel:1,description:'농업도시 III 전용. 병량 +4/턴 · 병력 보충 +3.',levels:freeze([level(80,{food:4},{gold:1})]),unlock:freeze({cityType:'agriculture',minCityLevel:3}),effects:freeze({troopGrowthFlat:3})})
  });

  const CITY_UNLOCKS=freeze({
    commerce:freeze(['tradeOffice','inn','warehouse','mint']),
    military:freeze(['trainingGround','armory','cityGate','wall','watchtower']),
    agriculture:freeze(['granary','irrigation','agriTuntian','relayStation','barracksVillage'])
  });

  function numericLevel(value){return value===true?1:Math.max(0,Math.floor(Number(value)||0));}
  function buildingLevel(region,key){return numericLevel(region?.buildings?.[key]);}
  function getDefinition(key){return BUILDINGS[key]||null;}
  function getLevelData(key,currentOrNext=1){const def=getDefinition(key);if(!def)return null;const n=Math.max(1,Math.min(def.maxLevel||1,Math.floor(Number(currentOrNext)||1)));return def.levels?.[n-1]||null;}
  function nextLevel(region,key){const def=getDefinition(key);if(!def)return 1;return Math.min(def.maxLevel||1,buildingLevel(region,key)+1);}
  function getBuildCost(region,key){const def=getDefinition(key),n=nextLevel(region,key);return def?.levels?.[n-1]?.cost??null;}
  function createInitialState(){
    const out={}; for(const [key,def] of Object.entries(BUILDINGS))out[key]=(def.maxLevel||1)>1?0:false;
    // Existing national unique buildings remain compatible with the legacy rules.
    Object.assign(out,{tradePort:false,forge:false,jiangnanFort:false,specialMarket:false});
    return out;
  }
  function levelProduction(region,key){const n=buildingLevel(region,key),def=getDefinition(key);if(!n||!def)return {gold:0,food:0,policy:0};const p=def.levels?.[n-1]?.production||{};return {gold:Number(p.gold)||0,food:Number(p.food)||0,policy:Number(p.policy)||0};}
  function levelUpkeep(region,key){const n=buildingLevel(region,key),def=getDefinition(key);if(!n||!def)return {gold:0,food:0};const u=def.levels?.[n-1]?.upkeep||{};return {gold:Number(u.gold)||0,food:Number(u.food)||0};}

  const api=freeze({version:1,BUILDINGS,CITY_UNLOCKS,getDefinition,getLevelData,buildingLevel,nextLevel,getBuildCost,createInitialState,levelProduction,levelUpkeep});
  global.SAMGUK_BUILDING_DATA=api;
})(window);
