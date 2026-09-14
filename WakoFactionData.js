'use strict';
(function(global){
  const CONFIG=Object.freeze({
    key:'wako',name:'왜구',symbol:'구',spriteKey:'구',color:'#8a6246',desc:'외교가 통하지 않는 해상 약탈 독립 세력',
    baseTerritoryId:100,baseTerritoryName:'대마도',seaAttackMultiplier:1.5,lootGold:50,growthMultiplier:1.3,
    encounterChance:.18,encounterMin:25,encounterMax:35,selectable:false,diplomatic:false
  });
  function isWako(k){const id=global.SAMGUK_WAKO_ID;return Number.isInteger(id)&&Number(k)===id}
  function isDiplomaticFaction(k){return !isWako(k)}
  global.SAMGUK_WAKO_CONFIG=CONFIG;
  global.SAMGUK_WAKO_RULES={version:1,isWako,isDiplomaticFaction};
})(window);
