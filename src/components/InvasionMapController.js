// UI reference: game.js uses the real WORLD.territories[].path data to draw the full objective map.
export function buildObjectiveMapModel({regions,territories,factions,sourceId,targetIds,selectedId}){
  const targets=new Set(targetIds);
  return territories.map((t,id)=>({
    id,name:regions[id]?.name||t.name,path:t.path,x:t.x,y:t.y,
    owner:regions[id]?.owner,color:factions[regions[id]?.owner]?.color,
    source:id===sourceId,eligible:targets.has(id),selected:id===selectedId
  }));
}
