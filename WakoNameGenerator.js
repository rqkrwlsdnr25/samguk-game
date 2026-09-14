'use strict';
(function(global){
  const SURNAMES=Object.freeze(['장','배','가','마','엄','곽','전','도','강','석','노','해','모','풍','백']);
  const GIVEN=Object.freeze(['해','도','귀','호','철','산','풍','랑','무','진','창','검','뢰','흑','적','야','천','강','웅','패','성','룡','표','한','돌','갈','범','준','혁','원']);
  function clamp01(v){v=Number(v);return Number.isFinite(v)?Math.max(0,Math.min(.999999999999,v)):0}
  function createUniqueGenerator({rng=Math.random,reservedNames=[]}={}){
    const used=new Set((reservedNames||[]).map(String));let serial=1;
    function nextName(){
      for(let tries=0;tries<500;tries++){
        const s=SURNAMES[Math.floor(clamp01(rng())*SURNAMES.length)]||'장';
        const g=GIVEN[Math.floor(clamp01(rng())*GIVEN.length)]||'해';
        const n=s+g;if(!used.has(n)){used.add(n);return n}
      }
      let n;do n=`장해${serial++}`;while(used.has(n));used.add(n);return n;
    }
    return {nextName,used,reserve(n){if(n)used.add(String(n));return this}};
  }
  global.SAMGUK_WAKO_NAMES={version:1,SURNAMES,GIVEN,createUniqueGenerator};
})(window);
