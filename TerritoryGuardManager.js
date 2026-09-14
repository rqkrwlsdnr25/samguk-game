'use strict';
(function(global){
  function buildGuard({territoryId,territoryName,nationId,name,rng}){
    const M=global.SAMGUK_CHARACTER_MODEL;if(!M)throw new Error('SAMGUK_CHARACTER_MODEL is required');
    // Hard balance invariant: both martial stats must never exceed 70.
    const stats={
      war:M.randomInt(45,70,rng),
      leadership:M.randomInt(48,70,rng),
      intelligence:M.randomInt(34,62,rng),
      charisma:M.randomInt(36,64,rng)
    };
    stats.war=Math.min(70,stats.war);stats.leadership=Math.min(70,stats.leadership);
    return M.makeBase({
      id:`border-guard-${nationId}-${territoryId}`,
      name:String(name||`${territoryName||'국경'} 수비장`),
      role:'국경 수비장',office:M.OFFICE.GUARD,characterClass:'border-guard',territoryId,nationId,
      loyalty:M.randomInt(72,91,rng),stats,aptitude:{spear:'B',cavalry:'C',archery:'C'},skills:[]
    });
  }
  function validateGuard(spec){return !!spec&&spec.office==='guard'&&Number(spec.stats?.war)<=70&&Number(spec.stats?.leadership)<=70}
  global.SAMGUK_TERRITORY_GUARDS={version:2,buildGuard,validateGuard};
})(window);
