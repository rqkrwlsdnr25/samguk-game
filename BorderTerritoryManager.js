'use strict';
(function(global){
  const SEA_ROUTE_CACHE=new WeakMap();
  function seaRouteSet(world){
    if(!world||typeof world!=='object')return new Set();
    if(SEA_ROUTE_CACHE.has(world))return SEA_ROUTE_CACHE.get(world);
    const set=new Set((world.seaRoutes||[]).map(pair=>Array.isArray(pair)&&pair.length>=2?[Number(pair[0]),Number(pair[1])].sort((a,b)=>a-b).join('-'):null).filter(Boolean));
    SEA_ROUTE_CACHE.set(world,set);return set;
  }
  function isSeaAdjacency(a,b,world){return seaRouteSet(world).has([Number(a),Number(b)].sort((x,y)=>x-y).join('-'))}
  function ownerAt(i,world,ownerOf){
    if(typeof ownerOf==='function'){
      const v=Number(ownerOf(i));if(Number.isInteger(v))return v;
    }
    const v=Number(world?.territories?.[i]?.home);return Number.isInteger(v)?v:-1;
  }
  function foreignNeighbors(territoryId,nationId,{world,neighbors=world?.neighbors,isActive=(i)=>!!world?.territories?.[i],ownerOf}={}){
    const i=Number(territoryId);if(!Number.isInteger(i)||!isActive(i)||ownerAt(i,world,ownerOf)!==nationId)return [];
    const list=Array.isArray(neighbors?.[i])?neighbors[i]:[];
    return list.filter(j=>Number.isInteger(j)&&isActive(j)&&!isSeaAdjacency(i,j,world)&&ownerAt(j,world,ownerOf)!==nationId);
  }
  function isBorderTerritory(territoryId,nationId,opts={}){return foreignNeighbors(territoryId,nationId,opts).length>0}
  function listBorderTerritories(nationId,{world,neighbors=world?.neighbors,isActive=(i)=>!!world?.territories?.[i],ownerOf}={}){
    const out=[];for(let i=0;i<(world?.territories?.length||0);i++)if(isActive(i)&&ownerAt(i,world,ownerOf)===nationId&&foreignNeighbors(i,nationId,{world,neighbors,isActive,ownerOf}).length)out.push(i);return out;
  }
  function bfsDistances(start,nationId,{world,neighbors=world?.neighbors,isActive=(i)=>!!world?.territories?.[i],ownerOf}={}){
    const dist=new Map();if(!Number.isInteger(start)||!isActive(start)||ownerAt(start,world,ownerOf)!==nationId)return dist;
    const q=[start];dist.set(start,0);for(let head=0;head<q.length;head++){
      const at=q[head],nextD=dist.get(at)+1;for(const n of (Array.isArray(neighbors?.[at])?neighbors[at]:[])){
        if(!Number.isInteger(n)||dist.has(n)||!isActive(n)||isSeaAdjacency(at,n,world)||ownerAt(n,world,ownerOf)!==nationId)continue;dist.set(n,nextD);q.push(n);
      }
    }return dist;
  }
  function selectDistributedBorderTerritories(nationId,candidates,{max=3,world,neighbors=world?.neighbors,isActive=(i)=>!!world?.territories?.[i],ownerOf}={}){
    const unique=[...new Set((candidates||[]).map(Number).filter(Number.isInteger))].filter(i=>isBorderTerritory(i,nationId,{world,neighbors,isActive,ownerOf}));
    const limit=Math.max(0,Math.min(Number(max)||0,unique.length));if(!limit)return[];if(unique.length<=limit)return unique.slice().sort((a,b)=>a-b);
    const threat=i=>foreignNeighbors(i,nationId,{world,neighbors,isActive,ownerOf}).length;
    unique.sort((a,b)=>threat(b)-threat(a)||a-b);
    const selected=[unique[0]],distanceMaps=[bfsDistances(unique[0],nationId,{world,neighbors,isActive,ownerOf})];
    while(selected.length<limit){let best=null,bestSpread=-1,bestThreat=-1;
      for(const id of unique){if(selected.includes(id))continue;let min=Infinity;for(const dm of distanceMaps){const d=dm.get(id);if(Number.isFinite(d))min=Math.min(min,d)}
        // Different disconnected owned components should be covered before doubling up one frontier.
        const spread=Number.isFinite(min)?min:1e9,t=threat(id);
        if(spread>bestSpread||(spread===bestSpread&&t>bestThreat)||(spread===bestSpread&&t===bestThreat&&(best===null||id<best))){best=id;bestSpread=spread;bestThreat=t}
      }
      if(best===null)break;selected.push(best);distanceMaps.push(bfsDistances(best,nationId,{world,neighbors,isActive,ownerOf}));
    }
    return selected;
  }
  global.SAMGUK_BORDER_TERRITORIES={version:2,ownerAt,isSeaAdjacency,foreignNeighbors,isBorderTerritory,listBorderTerritories,bfsDistances,selectDistributedBorderTerritories};
})(window);
