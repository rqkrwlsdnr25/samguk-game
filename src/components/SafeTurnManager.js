// Reference module for the integrated game.js Safe Turn Manager v3.
// Runtime implementation lives in game.js because the game is loaded as classic scripts.
export const AI_PHASE_CONFIG=Object.freeze({countryTimeoutMs:3000,visualTimeoutMs:3000,maxActionIterations:64});

export function validateTurnState(ctx){
  const {regions,territories,factions,turn,ap,gold}=ctx;
  if(!Array.isArray(regions)||regions.length!==territories.length) throw new Error('regions length mismatch');
  if(!Number.isFinite(turn)||turn<1) throw new Error('invalid turn');
  if(!Number.isFinite(ap)||ap<0) throw new Error('invalid AP');
  if(!Number.isFinite(gold)||gold<0) throw new Error('invalid gold');
  regions.forEach((r,i)=>{if(!r)return;if(!Number.isInteger(r.owner)||!factions[r.owner])throw new Error(`invalid owner ${i}`);if(!Number.isFinite(Number(r.troops)))throw new Error(`invalid troops ${i}`)});
  return true;
}

export async function runTurnTransaction({snapshot,execute,rollback,finalize}){
  const before=snapshot();
  try{return await execute()}
  catch(error){rollback(before,error);return false}
  finally{finalize()}
}

export async function runCountryTransaction({countryId,snapshot,execute,rollback,onSkip}){
  const before=snapshot();
  try{return await execute(countryId)}
  catch(error){rollback(before,error);onSkip?.(countryId,error);return false}
}
