'use strict';
(function(global){
  let runtime=null;
  function configureRuntime(next){runtime=next;return api;}
  function getRegionBuildingTotals(region){
    const data=global.SAMGUK_BUILDING_DATA;const total={food:0,policy:0,goldFlat:0,upkeepGold:0,upkeepFood:0,temples:0};
    if(!data||!region)return total;
    for(const key of Object.keys(data.BUILDINGS)){
      const disabled=(region.strategyState?.disabledBuildings?.[key]||0)>0;
      const p=disabled?{gold:0,food:0,policy:0}:data.levelProduction(region,key),u=data.levelUpkeep(region,key);
      // Market/commerce gold is calculated by territoryIncome so city multipliers remain correct.
      if(key!=='market'&&key!=='warehouse'&&key!=='agriTuntian')total.goldFlat+=p.gold;
      total.food+=p.food;total.policy+=p.policy;total.upkeepGold+=u.gold;total.upkeepFood+=u.food;
      if(key==='temple'&&!disabled&&data.buildingLevel(region,key)>0)total.temples++;
    }
    return total;
  }
  function previewCountry(k){
    if(!runtime)throw new Error('TurnEconomyManager runtime not configured');
    const owned=runtime.getRegions().map((r,i)=>runtime.isActive(i)&&r.owner===k?i:-1).filter(i=>i>=0);
    const out={country:k,grossGold:0,foodProduction:0,policyProduction:0,upkeepGold:0,upkeepFood:0,buildingUpkeepGold:0,salaryUpkeep:0,armyFoodUpkeep:0,totalTroops:0,temples:0,territories:owned.length};
    const turn=Math.max(1,Number(runtime.getTurn?.())||1),turnInYear=(turn-1)%8,seasonIndex=Math.floor(turnInYear/2),seasonMultiplier=[1,3,1,0][seasonIndex]??1;
    // v121 전문도시 병량 규칙: 농업도시 +50%, 해상도시 +25%.
    // 국가 food 하나만 유지하며 영토별 재고/군단별 재고는 만들지 않는다.
    const cityRules=global.SAMGUK_PROFESSIONAL_CITY_RULES?.rules||{};
    out.foodProduction=0;out.agricultureFoodBonus=0;out.portFoodBonus=0;out.resourceFoodBonus=0;out.mountainFoodPenalty=0;out.steppeFoodPenalty=0;
    out.seasonIndex=seasonIndex;out.seasonMultiplier=seasonMultiplier;
    for(const i of owned){
      out.grossGold+=Number(runtime.territoryIncome(i))||0;
      const region=runtime.getRegions()[i],baseFood=8*seasonMultiplier;
      const resourceFoodMultiplier=Number(global.SAMGUK_RESOURCE_SYSTEM?.foodProductionMultiplier?.(i))||1;
      let cityFoodMultiplier=1;
      if(region?.cityType==='agriculture')cityFoodMultiplier=Number(cityRules.agriculture?.foodProductionMultiplier)||1.5;
      else if(region?.cityType==='port')cityFoodMultiplier=Number(cityRules.port?.foodProductionMultiplier)||1.25;
      const cityBase=Math.round(baseFood*cityFoodMultiplier);
      const beforeMountain=Math.round(cityBase*resourceFoodMultiplier);
      // 산맥/STEPPE는 지도와 동일한 단일 판정 API를 사용한다. STEPPE 지정 4개 영토는
      // 최종 병량 생산량을 50%로 제한하며, 기존 산맥 패널티와도 충돌 없이 순차 적용한다.
      const mountainMultiplier=global.SAMGUK_MOUNTAIN_TERRAIN?.has?.(i)?(Number(global.SAMGUK_MOUNTAIN_TERRAIN.foodMultiplier)||.5):1;
      const steppeMultiplier=global.SAMGUK_STEPPE_TERRAIN?.has?.(i)?(Number(global.SAMGUK_STEPPE_TERRAIN.foodMultiplier)||.5):1;
      const afterMountain=Math.round(beforeMountain*mountainMultiplier),terrainMultiplier=mountainMultiplier*steppeMultiplier;
      const territoryFood=Math.round(beforeMountain*terrainMultiplier),baseAfterTerrain=Math.round(baseFood*terrainMultiplier),cityAfterTerrain=Math.round(cityBase*terrainMultiplier);
      out.foodProduction+=territoryFood;
      if(region?.cityType==='agriculture')out.agricultureFoodBonus+=Math.max(0,cityAfterTerrain-baseAfterTerrain);
      if(region?.cityType==='port')out.portFoodBonus+=Math.max(0,cityAfterTerrain-baseAfterTerrain);
      out.resourceFoodBonus+=Math.max(0,territoryFood-cityAfterTerrain);
      out.mountainFoodPenalty+=Math.max(0,beforeMountain-afterMountain);out.steppeFoodPenalty+=Math.max(0,afterMountain-territoryFood);
      const t=getRegionBuildingTotals(region);// 기존 건물의 금/국책/사찰 효과는 유지한다. 병량 재고는 국가 단일 수치만 사용한다.
      out.policyProduction+=t.policy;out.buildingUpkeepGold+=t.upkeepGold;out.temples+=t.temples;
    }
    out.salaryUpkeep=Math.max(0,Math.floor(Number(runtime.getSalaryUpkeep?.(k))||0));
    out.totalTroops=Math.max(0,Math.floor(Number(runtime.getTotalTroops?.(k))||0));
    out.armyFoodUpkeepBase=Math.floor(out.totalTroops/10);
    out.armyFoodUpkeepMultiplier=Math.max(0,Number(runtime.getArmyFoodUpkeepMultiplier?.(k))||1);
    out.armyFoodUpkeep=Math.floor(out.armyFoodUpkeepBase*out.armyFoodUpkeepMultiplier);
    out.armyFoodSaved=Math.max(0,out.armyFoodUpkeepBase-out.armyFoodUpkeep);
    out.upkeepGold=Math.max(0,Math.round((out.buildingUpkeepGold+out.salaryUpkeep)*100)/100);
    out.upkeepFood=Math.max(0,out.armyFoodUpkeep);
    out.netGold=Math.round((out.grossGold-out.upkeepGold)*100)/100;
    out.netFood=out.foodProduction-out.upkeepFood;
    return out;
  }
  function settleCountry(k){
    const report=previewCountry(k),beforeGold=Number(runtime.getGold(k))||0,beforeFood=Number(runtime.getFood(k))||0,beforePolicy=Number(runtime.getPolicy(k))||0;
    const goldAfter=Math.max(0,Math.round((beforeGold+report.grossGold-report.upkeepGold)*100)/100);
    const foodAfter=Math.max(0,Math.floor(beforeFood+report.foodProduction-report.upkeepFood));
    const policyAfter=Math.max(0,Math.floor(beforePolicy+report.policyProduction));
    runtime.setGold(k,goldAfter);runtime.setFood(k,foodAfter);runtime.setPolicy(k,policyAfter);
    report.goldAfter=goldAfter;report.foodAfter=foodAfter;report.policyAfter=policyAfter;
    report.goldShortage=Math.max(0,report.upkeepGold-(beforeGold+report.grossGold));
    report.foodShortage=Math.max(0,report.upkeepFood-(beforeFood+report.foodProduction));
    if(report.foodShortage>0){try{runtime.onFoodShortage?.(k,{...report,beforeFood,requiredFood:report.upkeepFood,availableFood:beforeFood+report.foodProduction,shortage:report.foodShortage})}catch(error){console.warn('[삼국쟁패] food shortage hook failed',error)}}
    return report;
  }
  function applyTempleRelief(k){
    if(!runtime)return 0;const report=previewCountry(k),amount=Math.max(0,report.temples);
    if(!amount)return 0;return Number(runtime.reduceWarPenalty?.(k,amount))||0;
  }
  const api=Object.freeze({version:2,configureRuntime,previewCountry,settleCountry,applyTempleRelief,getRegionBuildingTotals});
  global.SAMGUK_TURN_ECONOMY=api;
})(window);
