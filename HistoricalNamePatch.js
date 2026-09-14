'use strict';
/**
 * v72 Historical officer display-name patch.
 *
 * IMPORTANT:
 * - Does NOT create factions or officers.
 * - Does NOT change IDs, nationId, office, territoryId, stats, loyalty, skills, or references.
 * - Only mutates the existing Officer.name field for the 11 requested factions.
 */
(function(global){
  const OFFICE = Object.freeze({KING:'king', GENERAL:'general', CHANCELLOR:'chancellor'});

  const HISTORICAL_NAMES = Object.freeze({
    GOGURYEO: Object.freeze({factionName:'고구려', king:'광개토대왕 (담덕)', general:'모두루', chancellor:'연라'}),
    BAEKJE: Object.freeze({factionName:'백제', king:'아신왕', general:'진무', chancellor:'해충'}),
    SILLA: Object.freeze({factionName:'신라', king:'내물 마립간', general:'석실나', chancellor:'미사흔'}),
    GAYA: Object.freeze({factionName:'가야', king:'이시품왕', general:'가라파', chancellor:'정견모주'}),
    WA: Object.freeze({factionName:'왜', king:'리추 천황', general:'카츠라기노 소츠히코', chancellor:'나카토미노 카마코'}),
    ROURAN: Object.freeze({factionName:'유연', king:'욱구려 사륜', general:'욱구려 대단', chancellor:'필쇠나'}),
    YILOU: Object.freeze({factionName:'읍루', king:'아구나', general:'돌지신', chancellor:'골속지'}),
    BUYEO: Object.freeze({factionName:'부여', king:'잔왕', general:'위구태', chancellor:'여울'}),
    EASTERN_JIN: Object.freeze({factionName:'동진', king:'안제', general:'유유', chancellor:'사안'}),
    NORTHERN_YAN: Object.freeze({factionName:'북연', king:'모용보', general:'고운', chancellor:'풍발'}),
    SOUTHERN_YAN: Object.freeze({factionName:'남연', king:'모용덕', general:'모용초', chancellor:'한범'})
  });

  function factionIndexByName(factions, factionName){
    if(!Array.isArray(factions)) return -1;
    return factions.findIndex(f => String(f?.name || '') === factionName);
  }

  function findExistingOfficer(officers, nationId, office){
    if(!Array.isArray(officers) || nationId < 0) return null;
    return officers.find(o => Number(o?.nationId) === nationId && String(o?.office || '') === office) || null;
  }

  function renameExistingOfficer(officer, nextName){
    if(!officer || typeof nextName !== 'string' || !nextName) return false;
    // Pinpoint update: name only. Object identity and every other field remain untouched.
    officer.name = nextName;
    return true;
  }

  function patchExistingOfficers(officers, factions){
    const report = {patched:0, factions:[], missing:[]};

    for(const [code, row] of Object.entries(HISTORICAL_NAMES)){
      const nationId = factionIndexByName(factions, row.factionName);
      if(nationId < 0){
        report.missing.push(`${code}: faction`);
        continue;
      }

      const king = findExistingOfficer(officers, nationId, OFFICE.KING);
      const general = findExistingOfficer(officers, nationId, OFFICE.GENERAL);
      const chancellor = findExistingOfficer(officers, nationId, OFFICE.CHANCELLOR);

      const before = {
        king: king?.name || null,
        general: general?.name || null,
        chancellor: chancellor?.name || null
      };

      if(renameExistingOfficer(king, row.king)) report.patched++;
      else report.missing.push(`${code}: king`);

      if(renameExistingOfficer(general, row.general)) report.patched++;
      else report.missing.push(`${code}: general`);

      if(renameExistingOfficer(chancellor, row.chancellor)) report.patched++;
      else report.missing.push(`${code}: chancellor`);

      report.factions.push({code, nationId, factionName:row.factionName, before, after:{king:king?.name||null, general:general?.name||null, chancellor:chancellor?.name||null}});
    }

    return report;
  }

  function audit(officers, factions){
    const rows = [];
    for(const [code, row] of Object.entries(HISTORICAL_NAMES)){
      const nationId = factionIndexByName(factions, row.factionName);
      rows.push({
        code,
        faction:row.factionName,
        nationId,
        king:findExistingOfficer(officers,nationId,OFFICE.KING)?.name||null,
        general:findExistingOfficer(officers,nationId,OFFICE.GENERAL)?.name||null,
        premier:findExistingOfficer(officers,nationId,OFFICE.CHANCELLOR)?.name||null
      });
    }
    return rows;
  }

  global.SAMGUK_HISTORICAL_NAMES = Object.freeze({
    version:72,
    data:HISTORICAL_NAMES,
    patchExistingOfficers,
    audit
  });
})(window);
