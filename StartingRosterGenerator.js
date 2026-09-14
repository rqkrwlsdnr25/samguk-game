'use strict';
(function(global){
  function ownerAt(i,world,ownerOf){if(typeof ownerOf==='function'){const v=Number(ownerOf(i));if(Number.isInteger(v))return v}const v=Number(world?.territories?.[i]?.home);return Number.isInteger(v)?v:-1}
  function ownedTerritories(nationId,world,isActive,ownerOf){const out=[];for(let i=0;i<(world?.territories?.length||0);i++)if(isActive(i)&&ownerAt(i,world,ownerOf)===nationId)out.push(i);return out}
  // Compatibility alias retained for older UI/debug code.
  function activeHomeTerritories(nationId,world,isActive){return ownedTerritories(nationId,world,isActive,null)}
  function resolveCapital(nationId,capitals,world,isActive,ownerOf){const fixed=Number(capitals?.[nationId]);if(Number.isInteger(fixed)&&isActive(fixed)&&ownerAt(fixed,world,ownerOf)===nationId)return fixed;return ownedTerritories(nationId,world,isActive,ownerOf)[0]??null}
  function kingStats(M,rng){return {war:M.randomInt(72,90,rng),leadership:M.randomInt(76,93,rng),intelligence:M.randomInt(74,93,rng),charisma:M.randomInt(78,96,rng)}}
  function generalStats(M,rng){const warPrimary=M.randomInt(0,1,rng)===1;return warPrimary?{war:M.randomInt(90,99,rng),leadership:M.randomInt(78,94,rng),intelligence:M.randomInt(44,70,rng),charisma:M.randomInt(48,75,rng)}:{war:M.randomInt(78,94,rng),leadership:M.randomInt(90,99,rng),intelligence:M.randomInt(44,70,rng),charisma:M.randomInt(48,75,rng)}}
  function chancellorStats(M,rng){const intPrimary=M.randomInt(0,1,rng)===1;return intPrimary?{war:M.randomInt(28,56,rng),leadership:M.randomInt(46,72,rng),intelligence:M.randomInt(90,99,rng),charisma:M.randomInt(76,94,rng)}:{war:M.randomInt(28,56,rng),leadership:M.randomInt(46,72,rng),intelligence:M.randomInt(76,94,rng),charisma:M.randomInt(90,99,rng)}}
  function wakoBossStats(M,rng){return {war:M.randomInt(80,92,rng),leadership:M.randomInt(82,94,rng),intelligence:M.randomInt(62,80,rng),charisma:M.randomInt(70,88,rng)}}
  function wakoGuardStats(M,rng){return {war:Math.min(70,M.randomInt(52,70,rng)),leadership:Math.min(70,M.randomInt(50,70,rng)),intelligence:M.randomInt(30,58,rng),charisma:M.randomInt(30,60,rng)}}
  function generate(opts={}){
    const M=global.SAMGUK_CHARACTER_MODEL,G=global.SAMGUK_TERRITORY_GUARDS,B=global.SAMGUK_BORDER_TERRITORIES,N=global.SAMGUK_ORIENTAL_NAMES;
    if(!M||!G||!B||!N)throw new Error('character / border guard / border territory / name generator module missing');
    const {factions=[],world,capitals=[],isActive=(i)=>!!world?.territories?.[i],ownerOf,rng=M.secureUnitRandom,reservedNames=[]}=opts;
    const roster=[],capitalsByNation={},missingNationIds=[],borderCandidatesByNation={},guardTerritoriesByNation={};
    const names=N.createUniqueGenerator({rng,reservedNames});
    for(let nationId=0;nationId<factions.length;nationId++){
      const own=ownedTerritories(nationId,world,isActive,ownerOf);if(!own.length){missingNationIds.push(nationId);borderCandidatesByNation[nationId]=[];guardTerritoriesByNation[nationId]=[];continue}
      const capitalId=resolveCapital(nationId,capitals,world,isActive,ownerOf);if(!Number.isInteger(capitalId)){missingNationIds.push(nationId);continue}
      capitalsByNation[nationId]=capitalId;
      if(factions[nationId]?.specialFaction==='wako'){
        const WN=global.SAMGUK_WAKO_NAMES;if(!WN)throw new Error('Wako name generator module missing');const wnames=WN.createUniqueGenerator({rng,reservedNames:[...names.used]});
        const bossName=wnames.nextName();names.reserve(bossName);roster.push(M.makeBase({id:`wako-${nationId}-boss`,name:bossName,role:'왜구 두목',office:M.OFFICE.KING,characterClass:'wako-boss',territoryId:capitalId,nationId,loyalty:100,stats:wakoBossStats(M,rng),aptitude:{spear:'A',cavalry:'B',archery:'A'},skills:[]}));
        borderCandidatesByNation[nationId]=[];guardTerritoriesByNation[nationId]=[capitalId,capitalId,capitalId];
        for(let n=0;n<3;n++){const nm=wnames.nextName();names.reserve(nm);roster.push(M.makeBase({id:`wako-${nationId}-guard-${n+1}`,name:nm,role:'왜구 수비장',office:M.OFFICE.GUARD,characterClass:'wako-guard',territoryId:capitalId,nationId,loyalty:M.randomInt(78,96,rng),stats:wakoGuardStats(M,rng),aptitude:{spear:'B',cavalry:'C',archery:'B'},skills:[]}))}
        continue;
      }
      roster.push(M.makeBase({id:`core-${nationId}-king`,name:names.nextName(),role:'군주',office:M.OFFICE.KING,characterClass:'ruler',territoryId:capitalId,nationId,loyalty:100,stats:kingStats(M,rng),aptitude:{spear:'A',cavalry:'A',archery:'A'},skills:[]}));
      roster.push(M.makeBase({id:`core-${nationId}-general`,name:names.nextName(),role:'대장군',office:M.OFFICE.GENERAL,characterClass:'martial',territoryId:capitalId,nationId,loyalty:M.randomInt(92,100,rng),stats:generalStats(M,rng),aptitude:{spear:'S',cavalry:'A',archery:'B'},skills:[]}));
      roster.push(M.makeBase({id:`core-${nationId}-chancellor`,name:names.nextName(),role:'재상',office:M.OFFICE.CHANCELLOR,characterClass:'civil',territoryId:capitalId,nationId,loyalty:M.randomInt(92,100,rng),stats:chancellorStats(M,rng),aptitude:{spear:'C',cavalry:'C',archery:'B'},skills:[]}));
      const border=B.listBorderTerritories(nationId,{world,neighbors:world?.neighbors,isActive,ownerOf});
      const selected=B.selectDistributedBorderTerritories(nationId,border,{max:3,world,neighbors:world?.neighbors,isActive,ownerOf});
      borderCandidatesByNation[nationId]=border;guardTerritoriesByNation[nationId]=selected;
      for(const territoryId of selected)roster.push(G.buildGuard({territoryId,territoryName:world.territories[territoryId]?.name||`영지 ${territoryId}`,nationId,name:names.nextName(),rng}));
    }
    return {roster,capitalsByNation,missingNationIds,borderCandidatesByNation,guardTerritoriesByNation};
  }
  function validate(result,opts={}){
    const B=global.SAMGUK_BORDER_TERRITORIES;
    const {factions=[],world,capitals=[],isActive=(i)=>!!world?.territories?.[i],ownerOf}=opts,errors=[];const rows=result?.roster||[];
    const seenNames=new Set();for(const row of rows){if(!row?.name)errors.push(`officer ${row?.id||'?'}: empty name`);else if(seenNames.has(row.name))errors.push(`duplicate name: ${row.name}`);else seenNames.add(row.name)}
    for(let nationId=0;nationId<factions.length;nationId++){
      const own=ownedTerritories(nationId,world,isActive,ownerOf);if(!own.length)continue;
      const cap=resolveCapital(nationId,capitals,world,isActive,ownerOf);if(factions[nationId]?.specialFaction==='wako'){const wr=rows.filter(x=>x.nationId===nationId&&x.territoryId===cap),boss=wr.filter(x=>x.office==='king'),guards=wr.filter(x=>x.office==='guard');if(boss.length!==1||guards.length!==3||wr.length!==4)errors.push(`nation ${nationId}: Wako capital roster invalid`);for(const g of guards)if(Number(g.stats?.war)>70||Number(g.stats?.leadership)>70)errors.push(`nation ${nationId}: Wako guard stat exceeds 70`);continue}const atCap=rows.filter(x=>x.nationId===nationId&&x.territoryId===cap&&x.office!=='guard');const offices=new Set(atCap.map(x=>x.office));
      if(atCap.length!==3||!['king','general','chancellor'].every(x=>offices.has(x)))errors.push(`nation ${nationId}: capital core roster invalid`);
      const borders=B.listBorderTerritories(nationId,{world,neighbors:world?.neighbors,isActive,ownerOf});
      const guards=rows.filter(x=>x.nationId===nationId&&x.office==='guard');const expected=Math.min(3,borders.length);
      if(guards.length!==expected)errors.push(`nation ${nationId}: border guard count ${guards.length}/${expected}`);
      const occupied=new Set();for(const g of guards){if(!borders.includes(g.territoryId))errors.push(`territory ${g.territoryId}: guard is not on border`);if(occupied.has(g.territoryId))errors.push(`territory ${g.territoryId}: duplicate border guard`);occupied.add(g.territoryId);if(Number(g.stats?.war)>70||Number(g.stats?.leadership)>70)errors.push(`territory ${g.territoryId}: guard stat exceeds 70`)}
      // Any non-border, non-capital territory must start empty.
      for(const id of own){if(id===cap||borders.includes(id))continue;if(rows.some(x=>x.nationId===nationId&&x.territoryId===id))errors.push(`territory ${id}: inland territory should be empty`)}
    }
    return {ok:errors.length===0,errors};
  }
  global.SAMGUK_STARTING_ROSTER={version:2,generate,validate,resolveCapital,ownedTerritories,activeHomeTerritories};
})(window);
