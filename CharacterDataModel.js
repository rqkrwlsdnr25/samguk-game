'use strict';
(function(global){
  const STAT_KEYS=Object.freeze(['war','leadership','intelligence','charisma','authority']);
  const STAT_LABELS=Object.freeze({war:'무력',leadership:'통솔',intelligence:'지력',charisma:'매력',authority:'권위'});
  const OFFICE=Object.freeze({KING:'king',GENERAL:'general',CHANCELLOR:'chancellor',GUARD:'guard'});
  function clamp(value,min,max){const n=Number(value);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min))}
  function intStat(value,fallback=50){return Math.round(clamp(Number.isFinite(Number(value))?Number(value):fallback,0,100))}
  function normalizeStats(input={}){const war=intStat(input.war),leadership=intStat(input.leadership),intelligence=intStat(input.intelligence),charisma=intStat(input.charisma);const derivedAuthority=Math.round(leadership*.45+charisma*.35+war*.10+intelligence*.10);return {war,leadership,intelligence,charisma,authority:intStat(input.authority,derivedAuthority)}}
  function administration(stats){const s=normalizeStats(stats);return Math.round((s.intelligence+s.charisma)/2)}
  function attachLegacyAdminAlias(stats){
    if(!stats||typeof stats!=='object')stats=normalizeStats();
    const d=Object.getOwnPropertyDescriptor(stats,'politics');
    if(!d||d.configurable){
      try{Object.defineProperty(stats,'politics',{configurable:true,enumerable:false,get(){return Math.round(((Number(this.intelligence)||0)+(Number(this.charisma)||0))/2)}})}catch{}
    }
    return stats;
  }
  function secureUnitRandom(){
    try{if(global.crypto?.getRandomValues){const a=new Uint32Array(1);global.crypto.getRandomValues(a);return a[0]/4294967296}}catch{}
    return Math.random();
  }
  function randomInt(min,max,rng=secureUnitRandom){min=Math.ceil(Number(min)||0);max=Math.floor(Number(max)||min);if(max<min)[min,max]=[max,min];const r=clamp(rng(),0,0.999999999999);return min+Math.floor(r*(max-min+1))}
  function stableHash(text=''){let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function defaultTitle(office,role){if(office===OFFICE.KING)return '군주';if(office===OFFICE.GENERAL)return '대장군';if(office===OFFICE.CHANCELLOR)return '재상';if(office===OFFICE.GUARD)return '수비장';return String(role||'장수')}
  function defaultSalary(office,isRuler=false){return office===OFFICE.KING||isRuler?0:10}
  function makeBase({id,name,role,office,characterClass,territoryId,nationId,stats,loyalty=90,status='active',woundedTurnsLeft=0,capturedBy=null,originalFactionId=null,temperament='balanced',friendIds=[],familyIds=[],aptitude,skills=[],age=null,salary=null,title=null,traits=[],portraitUrl=null,isRuler=false}){
    const normalizedStats=normalizeStats(stats);if(stats?.authority===undefined){const officeBonus=office===OFFICE.KING?8:office===OFFICE.GENERAL?4:office===OFFICE.CHANCELLOR?3:0;normalizedStats.authority=intStat(normalizedStats.authority+officeBonus)}const hash=stableHash(id);const hasAge=age!==null&&age!==undefined&&age!==''&&Number.isFinite(Number(age));const hasSalary=salary!==null&&salary!==undefined&&salary!==''&&Number.isFinite(Number(salary));const resolvedAge=hasAge?Math.max(16,Math.min(80,Math.round(Number(age)))):24+(hash%27);
    return {id:String(id),name:String(name||'무명 인물'),role:String(role||'장수'),office:office||null,characterClass:characterClass||office||null,territoryId:Number(territoryId),nationId:Number(nationId),loyalty:intStat(loyalty,90),status:String(status||'active'),woundedTurnsLeft:Math.max(0,Math.floor(Number(woundedTurnsLeft)||0)),capturedBy:Number.isInteger(Number(capturedBy))?Number(capturedBy):null,originalFactionId:Number.isInteger(Number(originalFactionId))?Number(originalFactionId):null,temperament:String(temperament||'balanced'),friendIds:Array.isArray(friendIds)?friendIds.map(String):[],familyIds:Array.isArray(familyIds)?familyIds.map(String):[],stats:normalizedStats,age:resolvedAge,isRuler:!!isRuler||office===OFFICE.KING,salary:defaultSalary(office,!!isRuler),title:String(title||defaultTitle(office,role)),traits:Array.isArray(traits)?traits.map(x=>typeof x==='string'?{name:x}:x).filter(Boolean):[],portraitUrl:portraitUrl?String(portraitUrl):null,aptitude:aptitude||{spear:'C',cavalry:'C',archery:'C'},skills:Array.isArray(skills)?skills.slice(0,3):[]};
  }
  global.SAMGUK_CHARACTER_MODEL={version:4,STAT_KEYS,STAT_LABELS,OFFICE,clamp,intStat,normalizeStats,administration,attachLegacyAdminAlias,randomInt,secureUnitRandom,makeBase};
})(window);
