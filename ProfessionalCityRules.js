(function(global){
 'use strict';
 const RULES=Object.freeze({
  version:121,
  military:Object.freeze({
   label:'군사도시',
   actionPointDiscount:1,
   minActionPointCost:1,
   siegeDamageMultiplier:1.30,
   officerWarBonus:5,
   officerLeadershipBonus:5
  }),
  agriculture:Object.freeze({
   label:'농업도시',
   foodProductionMultiplier:1.50,
   recruitFoodCostMultiplier:0.80,
   replenishmentFoodCostMultiplier:0.80
  }),
  commerce:Object.freeze({
   label:'상업도시',
   goldIncomeMultiplier:1.50,
   specialtyProductionMultiplier:2.00
  }),
  port:Object.freeze({
   label:'해상도시',
   goldIncomeMultiplier:1.25,
   foodProductionMultiplier:1.25,
   specialtyTradeValueMultiplier:1.50,
   specialtyTradeAmountMultiplier:1.50
  }),
  earthWall:Object.freeze({
   label:'토성',
   role:'수비 전용',
   defensePct:Object.freeze({1:.30,2:.50,3:.70})
  })
 });
 function cityType(region){return region?.cityType||'normal'}
 function isType(region,type){return cityType(region)===type}
 function ruleForRegion(region){return RULES[cityType(region)]||null}
 global.SAMGUK_PROFESSIONAL_CITY_RULES=Object.freeze({
  version:121,
  rules:RULES,
  cityType,
  isType,
  ruleForRegion
 });
})(window);
