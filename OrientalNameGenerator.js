'use strict';
(function(global){
  const SURNAMES=Object.freeze([
    '김','이','박','최','조','손','유','관','장','하후','사마','제갈','공손','원','서','황','마','주','정','허','곽','진','위','한','태사','감','문','노','배','양','강','전','임','송','도','엄'
  ]);
  const GIVEN_NAMES=Object.freeze([
    '영','호','성','준','명','현','우','진','원','혁','태','윤','건','륜','용','찬','경','무','령','신','담','헌','빈','규','환','재','덕','수','연','림',
    '성호','준영','명진','현우','진원','태혁','윤성','건우','용진','경호','무진','헌준','규현','재원','덕명','수현','연호','진혁','태준','원명','성윤','우진','영준','호진','명현','윤호','건명','찬우','경진','혁준'
  ]);
  function clamp01(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(.999999999999,n)):0}
  function shuffle(list,rng=Math.random){for(let i=list.length-1;i>0;i--){const j=Math.floor(clamp01(rng())*(i+1));[list[i],list[j]]=[list[j],list[i]]}return list}
  function createPool(){const out=[];for(const s of SURNAMES)for(const g of GIVEN_NAMES)out.push(s+g);return out}
  function createUniqueGenerator({rng=Math.random,reservedNames=[]}={}){
    const used=new Set(Array.from(reservedNames||[],x=>String(x)).filter(Boolean));
    const pool=shuffle(createPool().filter(n=>!used.has(n)),rng);
    let cursor=0,fallback=1;
    function nextName(){
      while(cursor<pool.length){const name=pool[cursor++];if(!used.has(name)){used.add(name);return name}}
      // The Cartesian pool is intentionally large, but never crash if a future mod exhausts it.
      for(let tries=0;tries<10000;tries++){
        const s=SURNAMES[Math.floor(clamp01(rng())*SURNAMES.length)]||'무';
        const g=GIVEN_NAMES[Math.floor(clamp01(rng())*GIVEN_NAMES.length)]||'명';
        const name=`${s}${g}${fallback++}`;if(!used.has(name)){used.add(name);return name}
      }
      const emergency=`무명${Date.now()}-${fallback++}`;used.add(emergency);return emergency;
    }
    return {nextName,reserve(name){if(name)used.add(String(name));return this},has(name){return used.has(String(name))},used};
  }
  global.SAMGUK_ORIENTAL_NAMES={version:1,SURNAMES,GIVEN_NAMES,createUniqueGenerator};
})(window);
