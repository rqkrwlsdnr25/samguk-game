'use strict';
(function(global){
  function check({key,region,cityType='normal',cityLevel=0,maxCityLevel=3,nationBuildingCount=0}={}){
    const data=global.SAMGUK_BUILDING_DATA,def=data?.getDefinition?.(key);
    if(!def)return {locked:false,reason:''};
    const current=data.buildingLevel(region,key);
    if(current>0&&current>=(def.maxLevel||1))return {locked:false,reason:''};
    if(def.nationLimit&&current===0&&nationBuildingCount>=def.nationLimit)return {locked:true,reason:`국가 제한 ${def.nationLimit}곳`};
    const req=def.unlock;
    if(req){
      if(cityType!==req.cityType)return {locked:true,reason:`${label(req.cityType)} 전용`};
      const required=Math.min(maxCityLevel,req.minCityLevel||maxCityLevel);
      if(cityLevel<required)return {locked:true,reason:`${label(req.cityType)} ${roman(required)} 완성 필요`};
    }
    return {locked:false,reason:''};
  }
  function label(type){return type==='commerce'?'상업도시':type==='military'?'군사도시':type==='agriculture'?'농업도시':type==='port'?'항구도시':'전문도시';}
  function roman(n){return ['','I','II','III','IV','V'][n]||String(n);}
  global.SAMGUK_CITY_BUILDING_UNLOCKS=Object.freeze({version:1,check,label,roman});
})(window);
