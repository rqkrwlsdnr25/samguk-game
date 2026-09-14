(function(global){
'use strict';
const W=global.SAMGUK_WORLD||global.WORLD;if(!W||!Array.isArray(W.territories)||!Array.isArray(W.neighbors))return;
const NORTH=88,SOUTH=56,NAME='산해관';
let id=W.territories.findIndex(t=>t&&t.name===NAME&&t.isPass);
const x=38,y=634,w=14,h=11;
if(id<0){
 id=W.territories.length;
 W.territories.push({name:NAME,x,y,home:8,resources:[],type:'pass',isPass:true,canBuild:false,defenseBonus:0.30,asset:'shanhaiguan.png',badgeAnchorY:30,labelOffsetY:-30,path:`M${x-w},${y-h}L${x+w},${y-h}L${x+w},${y+h}L${x-w},${y+h}Z`});
 W.neighbors.push([]);
}else if(W.territories[id]){
 Object.assign(W.territories[id],{name:NAME,x,y,type:'pass',isPass:true,canBuild:false,defenseBonus:0.30,asset:'shanhaiguan.png',badgeAnchorY:30,labelOffsetY:-30,path:`M${x-w},${y-h}L${x+w},${y-h}L${x+w},${y+h}L${x-w},${y+h}Z`});
 if(!Array.isArray(W.territories[id].resources))W.territories[id].resources=[];
}
function unlink(a,b){if(Array.isArray(W.neighbors[a]))W.neighbors[a]=W.neighbors[a].filter(v=>Number(v)!==Number(b));}
function link(a,b){if(!Array.isArray(W.neighbors[a]))W.neighbors[a]=[];if(!W.neighbors[a].includes(b))W.neighbors[a].push(b);}
unlink(NORTH,SOUTH);unlink(SOUTH,NORTH);link(NORTH,id);link(id,NORTH);link(SOUTH,id);link(id,SOUTH);
global.SAMGUK_SHANHAIGUAN=Object.freeze({id,northId:NORTH,southId:SOUTH,name:NAME,asset:'shanhaiguan.png',x:38,y:634,defenseBonus:0.30,badgeAnchorY:30,labelOffsetY:-30,isPassTerritory:i=>Number(i)===id,canBuild:i=>Number(i)!==id});
})(window);
