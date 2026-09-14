'use strict';
// Run from the extracted project root: node verify-map-v144.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname, context={};
context.window=context;
vm.createContext(context);
for(const name of ['geography.js','world.js','JapanBaseTerritoryPatchV132.js','JapanMapDataV132.js','DongjinMapDataV137.js','MapExpansionV125.js','JolbonTerritoryPatch.js','EumnuTerritoryPatchV144.js','RegionGeometry.js']){
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),context,{filename:name});
}
const w=context.SAMGUK_WORLD,d=context.SAMGUK_EUMNU_MAP_DATA_V144;
assert.equal(d.version,144);
const id=name=>w.territories.findIndex(t=>t.name===name);
const inside=(p,ring)=>{let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;
}return c;};
for(const t of d.territories){
 const live=w.territories[id(t.name)];
 assert.equal(live.path,t.path);
 assert(inside([t.x,t.y],t.coordinates),t.name+' center outside polygon');
 const c=context.SAMGUK_REGION_GEOMETRY.pathCentroid(live.path);
 assert(Math.hypot(c.x-t.x,c.y-t.y)<1e-7);
}
const expected={
 '찰하':['숙신 고토','연해주 북부','목단강 유역'],
 '연해주 북부':['찰하','숙신 고토','읍루 동해안'],
 '숙신 고토':['옥저','책성','찰하','연해주 남부','동녕','연해주 북부','목단강 유역','읍루 동해안']
};
for(const [name,names] of Object.entries(expected)){
 const actual=Array.from(w.neighbors[id(name)],i=>w.territories[i].name).sort();
 assert.deepEqual(actual,names.slice().sort());
 for(const other of names)assert(w.neighbors[id(other)].includes(id(name)));
}
const ids=new Set(d.territories.map(t=>id(t.name)));
assert(w.borders.filter(b=>ids.has(b.a)||ids.has(b.b)).every(b=>b.geometryRevision===d.geometryRevision));
for(let y=115.271;y<175;y+=.73)for(let x=874.271;x<916;x+=.73){
 if(inside([x,y],d.lake.coordinates))assert(d.territories.every(t=>!inside([x,y],t.coordinates)),'land inside lake');
}
const old=fs.readFileSync(path.join(root,'geography.js'),'utf8');
const original=JSON.parse(old.replace(/^const GEOGRAPHY=/,'').replace(/;\s*$/,'')).rivers.match(/M[^M]*/g);
const rivers=vm.runInContext('GEOGRAPHY.rivers',context);
for(const i of d.removeGeographySubpaths)assert(!rivers.includes(original[i]));
const before=JSON.stringify(w);
vm.runInContext(fs.readFileSync(path.join(root,'EumnuTerritoryPatchV144.js'),'utf8'),context);
assert.equal(JSON.stringify(w),before,'patch must be idempotent');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.indexOf('EumnuTerritoryPatchV144.js')>html.indexOf('terrain.js'));
assert(html.indexOf('EumnuTerritoryPatchV144.js')<html.indexOf('RegionGeometry.js'));
console.log('v144: geometry, centroid, lake, adjacency, old-border removal and idempotence passed');
