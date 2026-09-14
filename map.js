'use strict';
// Geographic vectors come from the supplied atlas; labels are separate text.

// Non-blocking Hangul text labels, with a narrow halo for contrast.
const ATLAS_LABELS=[
 [4,1,214,160,48],[6,470,184,104,37],[7,760,140,96,45],
 [8,30,370,193,88],[0,428,458,242,58],[1,473,871,154,48],[2,631,873,83,42],
 [3,575,921,101,48],[9,8,806,210,51],[10,0,1024,188,95],[11,759,1077,80,50],
 [12,495,1068,96,35],[13,787,750,92,45]
];
function koreanAtlasLabels(){const sizeFactor=Math.max(.015,Math.min(1,mapView[2]/700));return '<g id="atlas-labels" class="atlas-labels large-country-names" pointer-events="none" style="opacity:var(--large-country-name-opacity,1);will-change:opacity">'+ATLAS_LABELS.filter(([k])=>count(k)>0).map(([k,x,y,w,h])=>`<text x="${x+w/2}" y="${y+h/2+7}" text-anchor="middle" fill="#fff9e7" stroke="#193645" stroke-width="2.8" stroke-opacity=".85" paint-order="stroke fill" font-size="${(w<100?21:26)*sizeFactor}" font-weight="700" font-family="sans-serif">${K[k].name}</text>`).join('')+'</g>'}
const LABEL_OFFSETS={"68": [-16, 0], "71": [-16, 0], "72": [0, 14], "99": [0, -26]};
const mapBounds=()=>window.SAMGUK_WORLD_MAP_BOUNDS;
const FULL_MAP=(mapBounds()?.fullView?.()||[WORLD.minX||0,WORLD.minY||0,WORLD.width,WORLD.height]),KOREA_MAP=[405,640,325,390];
let mapView=[...FULL_MAP],mapDragged=false,dragState=null,referenceMode=false,specialtyMode=false;
const mapReduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function sanitizeMapView(v){return mapBounds()?.clampView?.(v)||v}
function resetMap(){mapView=sanitizeMapView([...FULL_MAP]);referenceMode=false;specialtyMode=false;document.body?.classList.remove('specialty-map-mode');try{MAP_RENDER_STATE.initialized=false}catch(_e){}}
function centerMap(){window.SAMGUK_SMOOTH_MAP_ZOOM?.cancel?.();const cfg=window.SAMGUK_MAP_ZOOM_CONFIG||{};mapView=mapBounds()?.viewForZoom?.(Number(cfg.defaultZoom)||1)||mapBounds()?.fullView?.()||[...FULL_MAP];dragState=null;applyView({rafSafe:true,refreshUI:true,sharp:true});return [...mapView]}
window.centerMap=centerMap;
function applyView({rafSafe=false,refreshUI=false,sharp=false}={}){const svg=document.getElementById('map'),gpu=window.SAMGUK_GPU_MAP_CAMERA;let applied=false;if(gpu?.setView)applied=gpu.setView(mapView,{immediate:!!rafSafe,sharp:!!sharp});if(!applied){svg.setAttribute('viewBox',mapView.join(' '));document.getElementById('mapUiOverlay')?.setAttribute('viewBox',mapView.join(' '));document.dispatchEvent(new CustomEvent('samguk:map-view-changed',{detail:{view:[...mapView]}}))}if(refreshUI)window.SAMGUK_MAP_UI_OVERLAY?.scheduleRefresh?.()}
function setView(v){window.SAMGUK_SMOOTH_MAP_ZOOM?.cancel?.();mapView=sanitizeMapView(v);dragState=null;applyView({rafSafe:true,refreshUI:true,sharp:true})}
function focusRegion(i){const s=seeds[i],same=seeds.filter((r,j)=>j!==i&&r[3]===s[3]),nearest=same.length?Math.min(...same.map(r=>Math.hypot(r[1]-s[1],r[2]-s[2]))):90,w=Math.max(22,Math.min(310,nearest*5)),b=mapBounds()?.referenceBounds?.()||mapBounds()?.bounds?.(),desiredZoom=b?b.w/w:2.2,z=mapBounds()?.clampZoom?.(desiredZoom)??desiredZoom;setView(mapBounds()?.viewForZoom?.(z,[s[1],s[2]])||[s[1]-w/2,s[2]-w/2,w,w])}
function computeZoomView(view,factor,anchor){const bounds=mapBounds();if(bounds?.zoomViewByFactor)return bounds.zoomViewByFactor(view,factor,anchor);let [x,y,w,h]=view;const safeFactor=Number.isFinite(Number(factor))&&Number(factor)>0?Number(factor):1;const cfg=window.SAMGUK_MAP_ZOOM_CONFIG||{};const minZoom=Math.max(.01,Number(cfg.minZoom)||.5),maxZoom=Math.max(minZoom,Number(cfg.maxZoom)||15.0),worldW=Math.max(1,Number(WORLD.width)||1150),currentZoom=worldW/Math.max(1e-6,w),targetZoom=Math.min(maxZoom,Math.max(minZoom,currentZoom/safeFactor)),scale=currentZoom/targetZoom,nw=w*scale,nh=h*scale;const p=Array.isArray(anchor)&&Number.isFinite(anchor[0])&&Number.isFinite(anchor[1])?anchor:[x+w/2,y+h/2];return sanitizeMapView([p[0]-(p[0]-x)*scale,p[1]-(p[1]-y)*scale,nw,nh])}
function zoomMap(factor,anchor){if(window.SAMGUK_SMOOTH_MAP_ZOOM?.requestZoom?.(factor,anchor))return;setView(computeZoomView(mapView,factor,anchor))}
window.zoomMap=zoomMap;
window.SAMGUK_MAP_CAMERA_API={getView:()=>[...mapView],getZoomLevel:view=>mapBounds()?.zoomLevel?.(view||mapView)??1,viewForZoom:(zoom,center)=>mapBounds()?.viewForZoom?.(zoom,center)||[...FULL_MAP],computeZoomView:(view,factor,anchor)=>computeZoomView(view,factor,anchor),clampView:view=>sanitizeMapView(view),clientToWorld:(clientX,clientY,view)=>window.SAMGUK_GPU_MAP_CAMERA?.clientToWorld?.(clientX,clientY,view||mapView)||null,screenDeltaToWorld:(dx,dy,view)=>window.SAMGUK_GPU_MAP_CAMERA?.screenDeltaToWorld?.(dx,dy,view||mapView)||[0,0],centerMap:()=>centerMap(),resetZoom:(zoom=1,center)=>{const next=mapBounds()?.viewForZoom?.(zoom,center)||[...FULL_MAP];setView(next);return [...mapView]},applyInterpolatedView:view=>{if(!Array.isArray(view)||view.length!==4||view.some(v=>!Number.isFinite(v))||view[2]<=0||view[3]<=0)return false;mapView=sanitizeMapView(view);dragState=null;applyView({rafSafe:true,refreshUI:false,sharp:false});return true},commitView:view=>{if(!Array.isArray(view)||view.length!==4||view.some(v=>!Number.isFinite(v))||view[2]<=0||view[3]<=0)return false;mapView=sanitizeMapView(view);dragState=null;applyView({rafSafe:true,refreshUI:true,sharp:true});return true}};
function svgPoint(e){const gpu=window.SAMGUK_GPU_MAP_CAMERA,p=gpu?.clientToWorld?.(e.clientX,e.clientY,mapView);if(p)return{x:p[0],y:p[1]};const q=document.getElementById('map').createSVGPoint();q.x=e.clientX;q.y=e.clientY;const ctm=document.getElementById('map').getScreenCTM();return q.matrixTransform(ctm.inverse())}
function initMapControls(){const svg=document.getElementById('map'),viewport=document.getElementById('mapViewport')||svg;const zoomIn=document.getElementById('zoomIn'),zoomOut=document.getElementById('zoomOut'),referenceButton=document.getElementById('mapReference'),specialtyButton=document.getElementById('mapSpecialty');if(zoomIn)zoomIn.onclick=()=>zoomMap(.8);if(zoomOut)zoomOut.onclick=()=>zoomMap(1.25);if(referenceButton)referenceButton.onclick=()=>{if(busy)return;referenceMode=!referenceMode;if(referenceMode)specialtyMode=false;drawMap('reference-mode')};if(specialtyButton)specialtyButton.onclick=()=>{if(busy)return;specialtyMode=!specialtyMode;if(specialtyMode)referenceMode=false;document.body.classList.toggle('specialty-map-mode',specialtyMode);drawMap('specialty-mode');window.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('specialty-mode')};if(!window.SAMGUK_WHEEL_ZOOM?.bind?.(viewport)){viewport.addEventListener('wheel',e=>{e.preventDefault();const p=svgPoint(e);zoomMap(e.deltaY>0?1.15:.87,[p.x,p.y])},{passive:false})}viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;mapDragged=false;const p=svgPoint(e);dragState={id:e.pointerId,x:e.clientX,y:e.clientY,point:p,view:[...mapView]};});viewport.addEventListener('pointermove',e=>{if(!dragState)return;const dx=e.clientX-dragState.x,dy=e.clientY-dragState.y;if(Math.hypot(dx,dy)>5){mapDragged=true;viewport.setPointerCapture?.(e.pointerId);const delta=window.SAMGUK_GPU_MAP_CAMERA?.screenDeltaToWorld?.(dx,dy,dragState.view)||[dx*(dragState.view[2]/Math.max(1,viewport.clientWidth)),dy*(dragState.view[3]/Math.max(1,viewport.clientHeight))];mapView=sanitizeMapView([dragState.view[0]-delta[0],dragState.view[1]-delta[1],dragState.view[2],dragState.view[3]]);applyView({rafSafe:false,refreshUI:false})}});const release=()=>{const hadDrag=!!dragState;dragState=null;if(hadDrag&&mapDragged)applyView({rafSafe:true,refreshUI:false,sharp:true})};viewport.addEventListener('pointerup',release);window.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',()=>{mapDragged=true;release()});}
function troopLabelScale(n){return n<50?.94:n<100?1:1.06}
function centerBattle(i){const s=seeds[i];setView([s[1]-mapView[2]/2,s[2]-mapView[3]/2,mapView[2],mapView[3]])}
function markerScale(){return Math.max(.018,Math.min(1,mapView[2]/650))}
function routeData(i,j){const a=seeds[i],b=seeds[j],dx=b[1]-a[1],dy=b[2]-a[2],len=Math.hypot(dx,dy)||1;const bend=Math.min(30,len*.13);return {a:[a[1],a[2]],b:[b[1],b[2]],c:[(a[1]+b[1])/2-dy/len*bend,(a[2]+b[2])/2+dx/len*bend]}}
function routePath(r){return `M${r.a} Q${r.c} ${r.b}`}
function routePosition(r,t){return [(1-t)**2*r.a[0]+2*(1-t)*t*r.c[0]+t*t*r.b[0],(1-t)**2*r.a[1]+2*(1-t)*t*r.c[1]+t*t*r.b[1]]}
// v67: 일반 지도에서 해상 이동 가능 연결을 은은한 청색 점선으로 항상 표시한다.
// SeaNode/닻 마커는 만들지 않고, 실제 이동 그래프(WORLD.seaRoutes)의 육지↔육지 연결만 시각화한다.
function seaConnectionNetworkMarkup(){
 const routes=Array.isArray(WORLD.seaRoutes)?WORLD.seaRoutes:[],seen=new Set(),paths=[];
 for(const pair of routes){
  if(!Array.isArray(pair)||pair.length<2)continue;
  const a=Number(pair[0]),b=Number(pair[1]);
  if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||!seeds[a]||!seeds[b])continue;
  const key=a<b?`${a}-${b}`:`${b}-${a}`;if(seen.has(key))continue;seen.add(key);
  const r=routeData(a,b),d=routePath(r);
  // 바다 위에서만 보이도록 영토 폴리곤보다 먼저 그린다. 육지 구간은 뒤의 영토 fill에 가려진다.
  // 짧은 둥근 dash + 넓은 gap으로 참고 이미지처럼 가볍고 정돈된 항로를 만든다.
  paths.push(`<path class="sea-route-shadow" d="${d}" fill="none" stroke="#2f6f86" stroke-width="1.9" opacity=".28" stroke-dasharray="5 8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path class="sea-route-link" d="${d}" fill="none" stroke="#5793a8" stroke-width="1.05" opacity=".80" stroke-dasharray="5 8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`);
 }
 return `<g id="sea-route-network" class="sea-route-network" pointer-events="none" aria-label="해상 이동 가능 점선 경로">${paths.join('')}</g>`;
}
window.SAMGUK_SEA_ROUTE_NETWORK={markup:seaConnectionNetworkMarkup,routeCount:()=>new Set((WORLD.seaRoutes||[]).map(p=>Array.isArray(p)&&p.length>=2?[Number(p[0]),Number(p[1])].sort((x,y)=>x-y).join('-'):null).filter(Boolean)).size};
function drawSeaRoutes(){return seaConnectionNetworkMarkup()}
window.drawSeaRoutes=drawSeaRoutes;
function labelZoom(){return 600/mapView[2]}
function labelMetrics(z=labelZoom()){return {compact:z<=.55,showCapital:z>=.45,label:Math.max(9,Math.min(14,4+10*z)),troops:Math.max(9,Math.min(13,3+10*z)),flag:z<=.3?15:z<=.4?15+(z-.3)*30:Math.min(21,18+(z-.4)*20),capital:z>=1?40:z>=.8?34:z>=.6?28:z>=.45?24:0,resource:z>=1?20:z>=.8?18:z>=.6?16:z>=.45?14:0}}
function territoryPlaceNameStyle(name,baseSize){
 const glyphs=Math.max(1,Array.from(String(name||'')).length),maxWidth=118,estimate=glyphs*Math.max(1,baseSize)*.92;
 const fontSize=estimate>maxWidth?Math.max(9,baseSize*(maxWidth/estimate)):baseSize;
 return `font-size:${fontSize.toFixed(2)}px;text-rendering:geometricPrecision`;
}
function resourceLabels(r,m,y){if(!m.resource||!r.resources.length)return '';const columns=Math.max(1,Math.floor(86/(m.resource*1.35))),rows=Math.ceil(r.resources.length/columns);return Array.from({length:rows},(_,row)=>`<text class="resource-icons" x="0" y="${y+row*(m.resource+4)}" text-anchor="middle" style="font-size:${m.resource}px;stroke:none">${r.resources.slice(row*columns,(row+1)*columns).map(x=>RESOURCE_ICONS[x]).join(' ')}</text>`).join('')}
function territoryLabelCenter(i){const r=regions?.[i],c=r?.center||window.SAMGUK_REGION_GEOMETRY?.territoryCenter?.(i);if(c&&Number.isFinite(Number(c.x))&&Number.isFinite(Number(c.y)))return[Number(c.x),Number(c.y)];const s=seeds[i];return s?[s[1],s[2]]:[0,0]}
function territoryHudScreenOffsetY(i,m=labelMetrics()){
 const r=regions?.[i];if(!r)return 0;
 const shanhaiguan=window.SAMGUK_SHANHAIGUAN;
 if(shanhaiguan?.isPassTerritory?.(i)){
  const pass=regions?.[i]||{};
  const passAnchor=Number.isFinite(Number(pass.badgeAnchorY))?Number(pass.badgeAnchorY):Number(shanhaiguan.badgeAnchorY)||32;
  return Math.max(20,passAnchor);
 }
 const cityUI=window.SAMGUK_CITY_SPRITES;
 const cityLayout=cityUI?.layoutFor?.(i,m,{compact:m.compact})||{visible:false,height:0,top:0,bottom:0};
 const hasCityVisual=!!cityLayout.visible;
 if(m.compact)return hasCityVisual?cityLayout.bottom+10:0;
 const zoomRatio=Number(window.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.()?.zoomRatio)||1;
 const tuned=window.SAMGUK_REGION_COMPOSITE_UI?.gapsForZoom?.(zoomRatio)||{};
 const cityToResource=Number.isFinite(Number(tuned.cityToResource))?Number(tuned.cityToResource):6;
 const resourceToTroop=hasCityVisual&&Number.isFinite(Number(tuned.resourceToTroop))?Number(tuned.resourceToTroop):11;
 const cityToTroop=hasCityVisual&&Number.isFinite(Number(tuned.cityToTroop))?Number(tuned.cityToTroop):14;
 const gap=m.resource+4,resourceColumns=Math.max(1,Math.floor(86/(m.resource*1.35))),resourceRows=r.resources.length?Math.ceil(r.resources.length/resourceColumns):0;
 const resourceY=hasCityVisual?cityLayout.bottom+cityToResource:gap;
 return resourceRows?resourceY+(resourceRows-1)*(m.resource+4)+Math.max(14,m.resource+resourceToTroop):(hasCityVisual?cityLayout.bottom+cityToTroop:m.label+15);
}
window.SAMGUK_TERRITORY_HUD_LAYOUT={
 getCenter:i=>{const c=territoryLabelCenter(i);return{x:c[0],y:c[1]}},
 getOffsetY:i=>territoryHudScreenOffsetY(i),
 getMetrics:()=>labelMetrics()
};
function specialtyResourceLabels(){
 return regions.map((r,i)=>{
  if(!isActiveTerritory(i)||!Array.isArray(r.resources)||!r.resources.length)return '';
  const center=territoryLabelCenter(i),icons=r.resources.map(x=>RESOURCE_ICONS?.[x]||'◆').join(' ');
  const title=r.resources.map(x=>(typeof RESOURCE_NAMES!=='undefined'&&RESOURCE_NAMES?.[x])||x).join(' · ');
  return `<g class="specialty-map-marker" data-id="${i}" transform="translate(${center[0].toFixed(3)} ${center[1].toFixed(3)})" pointer-events="none"><g class="territory-screen-space specialty-screen-space"><text class="specialty-map-icons" x="0" y="0" text-anchor="middle" dominant-baseline="central" aria-label="${title}">${icons}</text></g></g>`;
 }).join('');
}
window.SAMGUK_SPECIALTY_MAP_MODE={isActive:()=>specialtyMode,setActive:value=>{const next=!!value;if(next===specialtyMode)return specialtyMode;specialtyMode=next;if(specialtyMode)referenceMode=false;document.body.classList.toggle('specialty-map-mode',specialtyMode);drawMap('specialty-mode-api');window.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('specialty-mode-api');return specialtyMode;}};
function territoryLabels(){
 if(specialtyMode)return specialtyResourceLabels();
 const svg=document.getElementById('map'),camera=window.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.(),pixels=camera?.pixelsPerWorldUnit||1000/mapView[2],m=labelMetrics();
 const zoomRatio=Number(camera?.zoomRatio)||1;
 const visibilitySystem=window.SAMGUK_VISIBILITY;
 const currentZoom=Number(window.SAMGUK_MAP_CAMERA_API?.getZoomLevel?.(mapView))||zoomRatio||1;
 const lowDetail=visibilitySystem?.isLowDetail?.(currentZoom)??(currentZoom<2.5);
 const compositeGaps=window.SAMGUK_REGION_COMPOSITE_UI?.gapsForZoom?.(zoomRatio)||{cityToResource:6};
 if(m.showCapital)m.capital=Math.max(m.capital,Math.min(96,11*pixels*1.4));
 const hud=window.SAMGUK_FACTION_TROOP_HUD;
 const badge=(i,y,compact=false)=>{
  const r=regions[i],f=K[r.owner];
  if(hud?.territoryMarkup)return hud.territoryMarkup(i,{faction:f,troops:r.troops,x:0,y,compact});
  return `<text class="troop" x="0" y="${y}" style="font-size:${m.troops}px">${r.troops}</text>`;
 };
 return regions.map((r,i)=>{
  if(!isActiveTerritory(i))return '';
  const visibility='VISIBLE';
  const showTroopLabel=visibilitySystem?.canSeeTroopLabel?.(i)??true;
  const center=territoryLabelCenter(i),selectedHere=selected===i,capital=isCapital(i),offset=[0,0];
  const cityUI=window.SAMGUK_CITY_SPRITES;
  const cityLayout=cityUI?.layoutFor?.(i,m,{compact:m.compact})||{visible:false,height:0,top:0,bottom:0};
  const hasCityVisual=!!cityLayout.visible;
  const islandCity=!!(hasCityVisual&&cityUI?.isIslandOverride?.(i));
  const capitalTier=capital?(window.SAMGUK_CAPITAL_UPGRADE?.tierForLevel?.(cityLayout.state?.capitalLevel||r.capitalLevel||1)||'lv1'):null;
  const capitalTierClass=capital?` capital-tier-${capitalTier}`:'';
  const visionClass=' vision-visible';
  const aria=showTroopLabel?`${r.name}, ${K[r.owner].name}, 병력 ${r.troops}${capital?`, 수도 Level ${cityLayout.state?.capitalLevel||r.capitalLevel||1}`:''}`:`${r.name}, ${K[r.owner].name}${capital?`, 수도 Level ${cityLayout.state?.capitalLevel||r.capitalLevel||1}`:''}`;
  let html=`<g class="territory map-marker minimal-label${visionClass} ${selectedHere?'chosen':''}${hasCityVisual?' has-city-visual':''}${islandCity?' is-island-city':''}${capitalTierClass}${m.compact?' is-compact':''}" data-id="${i}" data-visibility="VISIBLE" data-troop-intel="${showTroopLabel?'visible':'hidden'}" aria-label="${aria}" aria-pressed="${selectedHere}" pointer-events="none" transform="translate(${center[0].toFixed(3)} ${center[1].toFixed(3)})" data-center-x="${center[0].toFixed(3)}" data-center-y="${center[1].toFixed(3)}"><title>${showTroopLabel?r.name+' · '+r.troops+'명':r.name}</title><g class="territory-screen-space">`;

  if(m.compact){
   if(hasCityVisual)html+=cityUI.inlineImageMarkup(i,m,{compact:true});
   const hudY=territoryHudScreenOffsetY(i,m);
   if(showTroopLabel)html+=badge(i,hudY,true);
   // LOD: 줌 2.5 미만에서는 VISIBLE이어도 상세 자원 아이콘을 생성하지 않는다.
   if(!lowDetail&&m.resource){const base=hudY+14;html+=resourceLabels(r,m,base+m.resource+3);}
  }else{
   const placeNameStyle=territoryPlaceNameStyle(r.name,m.label),gap=m.resource+4;
   const groupY=offset[1]*.5;
   const cityMarkup=hasCityVisual?cityUI.inlineImageMarkup(i,m,{compact:false}):'';
   const cityToResource=Number.isFinite(Number(compositeGaps.cityToResource))?Number(compositeGaps.cityToResource):6;
   const contentBase=hasCityVisual?cityLayout.bottom+cityToResource:gap;
   const resourceY=contentBase;
   const hudY=territoryHudScreenOffsetY(i,m);
   const resourcesMarkup=!lowDetail?resourceLabels(r,m,resourceY):'';
   const passTerritory=window.SAMGUK_SHANHAIGUAN?.isPassTerritory?.(i);
   if(passTerritory){
    const pass=regions?.[i]||{};
    const labelOffsetY=Number.isFinite(Number(pass.labelOffsetY))?Number(pass.labelOffsetY):Number(window.SAMGUK_SHANHAIGUAN?.labelOffsetY)||-28;
    html+=`<g class="territory-composite-lift territory-composite-lift-pass" pointer-events="none"><g class="territory-label-stack territory-label-pass" pointer-events="none" transform="translate(${offset[0]*.5} ${groupY})"><text class="place-name place-name-pass" x="0" y="${labelOffsetY}" text-anchor="middle" dominant-baseline="middle" style="${placeNameStyle}">${r.name}</text>${showTroopLabel?badge(i,hudY,false):''}</g></g>`;
   }else{
    html+=`<g class="territory-composite-lift" pointer-events="none"><g class="territory-label-stack" pointer-events="none" transform="translate(${offset[0]*.5} ${groupY})">${cityMarkup}<text class="place-name" x="0" y="0" text-anchor="middle" dominant-baseline="middle" style="${placeNameStyle}">${r.name}</text>${resourcesMarkup}${showTroopLabel?badge(i,hudY,false):''}</g></g>`;
   }
  }
  return html+'</g></g>';
 }).join('')
}
window.territoryLabels=territoryLabels;
function refreshTerritoryLabels(){if(window.SAMGUK_MAP_UI_OVERLAY?.refresh)return window.SAMGUK_MAP_UI_OVERLAY.refresh({force:true});const layer=document.getElementById('territory-labels');if(layer&&regions.length)layer.innerHTML=territoryLabels()}
// v143: two water bodies were converted to land by EumnuMapDataV143.
// Remove only those exact filled subpaths from GEOGRAPHY.rivers; all other rivers/lakes remain untouched.
let EUMNU_GEOGRAPHY_RIVER_CACHE_V143=null;
function geographyRiversWithoutReclaimedWaterV143(){
 const raw=String(GEOGRAPHY?.rivers||'');
 const reclaim=window.SAMGUK_EUMNU_MAP_DATA_V143?.reclaimedWaterBodies||window.SAMGUK_EUMNU_MAP_DATA_V142?.reclaimedWaterBodies||[];
 const masks=reclaim.filter(x=>x?.removeFromGeographyRivers&&Array.isArray(x.bbox)&&x.bbox.length===4);
 if(!raw||!masks.length)return raw;
 if(EUMNU_GEOGRAPHY_RIVER_CACHE_V143?.raw===raw&&EUMNU_GEOGRAPHY_RIVER_CACHE_V143?.maskCount===masks.length)return EUMNU_GEOGRAPHY_RIVER_CACHE_V143.value;
 const segments=raw.match(/M[^M]*/g)||[];
 const eps=1.2;
 const kept=segments.filter(seg=>{
   const nums=(seg.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
   if(nums.length<4)return true;
   let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
   for(let i=0;i+1<nums.length;i+=2){const x=nums[i],y=nums[i+1];if(!Number.isFinite(x)||!Number.isFinite(y))continue;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
   return !masks.some(m=>{const [x0,y0,x1,y1]=m.bbox.map(Number);return minX>=x0-eps&&minY>=y0-eps&&maxX<=x1+eps&&maxY<=y1+eps});
 });
 const value=kept.join('');
 EUMNU_GEOGRAPHY_RIVER_CACHE_V143={raw,maskCount:masks.length,value};
 return value;
}

function mapInactiveWaterMasks(){const ids=WORLD.waterTerritoryIds||[];return ids.map(i=>{const t=WORLD.territories[i];return t?.path?`<path class="removed-territory-water" d="${t.path}" fill="#9ecbd0" stroke="#5f847b" stroke-width=".9" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>`:''}).join('')}

// v139: guide-defined Dongjin river. The path is data-driven so geometry can live
// in DongjinMapDataV137.js / JSON instead of being hard-coded into the renderer.
function dongjinRiverMarkup(){
 const river=window.SAMGUK_DONGJIN_MAP_DATA_V140?.river||window.SAMGUK_DONGJIN_MAP_DATA_V139?.river||window.SAMGUK_DONGJIN_MAP_DATA_V137?.river;
 if(!river?.path)return'';
 const halo=river.halo||'#d7f0f3',stroke=river.stroke||'#3f9bc4';
 const haloWidth=Number(river.haloWidth)||7,strokeWidth=Number(river.strokeWidth)||3.6,opacity=Number(river.opacity)||.96;
 const riverId=String(river.id||'dongjin-boundary-river').replace(/[^a-zA-Z0-9_-]/g,'-');
 return `<g id="${riverId}" class="map-rivers dongjin-river" pointer-events="none" aria-hidden="true" clip-path="url(#river-land)"><path d="${river.path}" fill="none" stroke="${halo}" stroke-width="${haloWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${Math.min(1,opacity*.88)}" vector-effect="non-scaling-stroke"/><path d="${river.path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" vector-effect="non-scaling-stroke"/></g>`;
}
window.dongjinRiverMarkup=dongjinRiverMarkup;


// Per-territory visual terrain textures. These are rendering-only overlays and never participate
// in hit testing, adjacency, ownership, combat, saves, or any other game rule.
// To add another territory later, add one entry keyed by its stable territory ID.
const TERRAIN_TEXTURE_DEFAULTS=Object.freeze({
 image:'mountain_terrain_texture.png',opacity:.42,inset:6,scale:1.10,offsetX:0,offsetY:0
});
const TERRAIN_TEXTURE_OVERRIDES={
 54:{scale:1.10},               // 대흥안령 산맥 남부 - 산맥 텍스처 + 산맥 병량 효과
 55:{},                         // 북연 내륙
 87:{},                         // 요서 남부
 53:{scale:1.08},               // 영주 북부
 24:{scale:1.06},               // 유연 서부
 75:{scale:1.10},               // 유연 서부 북부
 0:{scale:1.06},                // 국내성
 3:{scale:1.04,offsetY:-6},     // 동예
 64:{scale:1.06},               // 국내성 동부
 68:{inset:5,scale:1.18},       // 소백산 (좁은 영토라 약간 완화)
 67:{inset:5,scale:1.20},       // 관산성 (좁은 영토라 약간 완화)
 15:{inset:5,scale:1.18},       // 하슬라
 16:{inset:4,scale:1.24},       // 실직
 44:{scale:1.10},               // 왜 북부
 97:{inset:5,scale:1.20}        // 왜 북부 서부
};
// v90 산맥 컨텐츠의 단일 판정 기준. 화면의 산맥 텍스처와 병량 패널티가 같은 ID 집합을 공유한다.
const JAPAN_VISUAL_TEXTURE_OVERRIDES=Object.create(null);
for(let i=0;i<(WORLD.territories?.length||0);i++){
 const t=WORLD.territories[i];
 // v130: 일본 본토 텍스처는 JapanTerrainMaskCanvas의 비트맵 마스크가 담당한다.
 // Canvas 모듈이 비활성화된 환경에서만 기존 SVG <image> 오버레이를 fallback으로 사용한다.
 if(t&&String(t.name||'').startsWith('왜')&&!window.SAMGUK_JAPAN_MASK_CANVAS?.enabled){
  JAPAN_VISUAL_TEXTURE_OVERRIDES[i]={inset:5,scale:1.10,opacity:.40};
 }
}
function terrainTextureKeys(){return [...new Set([...Object.keys(TERRAIN_TEXTURE_OVERRIDES),...Object.keys(JAPAN_VISUAL_TEXTURE_OVERRIDES)])]}

const MOUNTAIN_TEXTURE_TERRITORY_IDS=Object.freeze(Object.keys(TERRAIN_TEXTURE_OVERRIDES).map(Number));
const MOUNTAIN_TEXTURE_TERRITORY_SET=new Set(MOUNTAIN_TEXTURE_TERRITORY_IDS);
function hasMountainTerrainTexture(i){return MOUNTAIN_TEXTURE_TERRITORY_SET.has(Number(i))}
window.SAMGUK_MOUNTAIN_TERRAIN=Object.freeze({
 ids:MOUNTAIN_TEXTURE_TERRITORY_IDS,
 foodMultiplier:.5,
 has:hasMountainTerrainTexture
});

// v106 STEPPE texture overlay. Keep its visual density synchronized with the
// existing mountain terrain: slim inset and a translucent texture overlay.
const STEPPE_INSET_PADDING=7;
const STEPPE_TEXTURE_OPACITY=.45;
const STEPPE_TEXTURE_PATH='assets/textures/steppe.png';
const STEPPE_TEXTURE_FALLBACK_IDS=Object.freeze([52,77,74,51]);
function steppeTextureTerritoryIds(){const ids=window.SAMGUK_STEPPE_TERRAIN?.ids;return Array.isArray(ids)&&ids.length?ids.map(Number):[...STEPPE_TEXTURE_FALLBACK_IDS]}
function steppeTexturePatternDef(){return `<pattern id="pattern-steppe" patternUnits="userSpaceOnUse" width="192" height="192"><image href="${STEPPE_TEXTURE_PATH}" x="0" y="0" width="192" height="192" preserveAspectRatio="xMidYMid slice"/></pattern>`}
function steppeTextureDefs(){
 const masks=steppeTextureTerritoryIds().map(i=>{const t=WORLD.territories?.[i],b=t?.path?territoryPathBounds(t.path):null;if(!t||!b)return'';const pad=STEPPE_INSET_PADDING+4,x=b.minX-pad,y=b.minY-pad,w=b.w+pad*2,h=b.h+pad*2;return `<mask id="mask-inset-${i}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000"/><path d="${t.path}" fill="white"/><path d="${t.path}" fill="none" stroke="black" stroke-width="${STEPPE_INSET_PADDING*2}" stroke-linejoin="round" stroke-linecap="round"/></mask>`}).join('');
 return steppeTexturePatternDef()+masks;
}
function steppeTerrainTextureLayer(){
 const paths=steppeTextureTerritoryIds().map(i=>{if(!isActiveTerritory(i))return'';const t=WORLD.territories?.[i];if(!t?.path)return'';return `<path id="territory-texture-${i}" class="territory-terrain-texture territory-steppe-texture" data-terrain-texture-id="${i}" data-terrain-type="STEPPE" d="${t.path}" fill="url(#pattern-steppe)" mask="url(#mask-inset-${i})" opacity="${STEPPE_TEXTURE_OPACITY}" pointer-events="none"/>`}).join('');
 return paths?`<g id="territory-steppe-textures" pointer-events="none" aria-hidden="true">${paths}</g>`:'';
}
function ensureSteppePattern(svgMap){
 if(!svgMap)return null;let defs=svgMap.querySelector('defs');if(!defs){defs=document.createElementNS('http://www.w3.org/2000/svg','defs');svgMap.insertBefore(defs,svgMap.firstChild)}
 let pattern=defs.querySelector('#pattern-steppe');if(!pattern){pattern=document.createElementNS('http://www.w3.org/2000/svg','pattern');pattern.setAttribute('id','pattern-steppe');pattern.setAttribute('patternUnits','userSpaceOnUse');pattern.setAttribute('width','192');pattern.setAttribute('height','192');const image=document.createElementNS('http://www.w3.org/2000/svg','image');image.setAttribute('href',STEPPE_TEXTURE_PATH);image.setAttribute('x','0');image.setAttribute('y','0');image.setAttribute('width','192');image.setAttribute('height','192');image.setAttribute('preserveAspectRatio','xMidYMid slice');pattern.appendChild(image);defs.appendChild(pattern)}return defs;
}
function applySteppeTexture(svgMap,territoryId){
 const i=Number(territoryId),territory=WORLD.territories?.[i];if(!svgMap||!territory?.path||!steppeTextureTerritoryIds().includes(i))return false;
 const defs=ensureSteppePattern(svgMap),maskId=`mask-inset-${i}`,originalPathD=territory.pathD||territory.path;
 let mask=defs.querySelector(`#${maskId}`);if(!mask){mask=document.createElementNS('http://www.w3.org/2000/svg','mask');mask.setAttribute('id',maskId);mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('maskContentUnits','userSpaceOnUse');const b=territoryPathBounds(originalPathD),pad=STEPPE_INSET_PADDING+4;if(b){mask.setAttribute('x',String(b.minX-pad));mask.setAttribute('y',String(b.minY-pad));mask.setAttribute('width',String(b.w+pad*2));mask.setAttribute('height',String(b.h+pad*2))}const fill=document.createElementNS('http://www.w3.org/2000/svg','path');fill.setAttribute('d',originalPathD);fill.setAttribute('fill','white');const inset=document.createElementNS('http://www.w3.org/2000/svg','path');inset.setAttribute('d',originalPathD);inset.setAttribute('fill','none');inset.setAttribute('stroke','black');inset.setAttribute('stroke-width',String(STEPPE_INSET_PADDING*2));inset.setAttribute('stroke-linejoin','round');inset.setAttribute('stroke-linecap','round');mask.append(fill,inset);defs.appendChild(mask)}
 const pathElem=svgMap.querySelector(`#territory-texture-${i}`);if(pathElem){pathElem.setAttribute('fill','url(#pattern-steppe)');pathElem.setAttribute('mask',`url(#${maskId})`);pathElem.setAttribute('opacity',String(STEPPE_TEXTURE_OPACITY));pathElem.style.pointerEvents='none';return true}return false;
}
function applyAllSteppeTextures(svgMap){let applied=0;for(const id of steppeTextureTerritoryIds())if(applySteppeTexture(svgMap,id))applied++;return applied}
window.applySteppeTexture=applySteppeTexture;
window.SAMGUK_STEPPE_TEXTURE=Object.freeze({version:106,path:STEPPE_TEXTURE_PATH,insetPadding:STEPPE_INSET_PADDING,opacity:STEPPE_TEXTURE_OPACITY,apply:applySteppeTexture,applyAll:applyAllSteppeTextures});
function terrainTextureConfig(i){const o=TERRAIN_TEXTURE_OVERRIDES[i]||JAPAN_VISUAL_TEXTURE_OVERRIDES[i];return o?{...TERRAIN_TEXTURE_DEFAULTS,...o}:null}
function territoryPathBounds(path){
 const nums=(path&&path.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);if(nums.length<2)return null;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(let i=0;i+1<nums.length;i+=2){const x=nums[i],y=nums[i+1];if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
 return {minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY,cx:(minX+maxX)/2,cy:(minY+maxY)/2};
}
function terrainTextureDefs(){
 const mountainMasks=terrainTextureKeys().map(k=>{
  const i=+k,t=WORLD.territories[i],cfg=terrainTextureConfig(i),b=t?.path?territoryPathBounds(t.path):null;if(!t||!cfg||!b)return '';
  const pad=Math.max(4,cfg.inset+2),x=b.minX-pad,y=b.minY-pad,w=b.w+pad*2,h=b.h+pad*2,stroke=Math.max(0,cfg.inset*2);
  // White territory fill minus a black inward border produces an inset mask (~stroke/2 px).
  return `<mask id="terrain-texture-mask-${i}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000"/><path d="${t.path}" fill="#fff" stroke="none"/><path d="${t.path}" fill="none" stroke="#000" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/></mask>`;
 }).join('');
 return mountainMasks+steppeTextureDefs();
}
function territoryTerrainTextureLayer(){
 const images=terrainTextureKeys().map(k=>{
  const i=+k;if(!isActiveTerritory(i))return '';const t=WORLD.territories[i],cfg=terrainTextureConfig(i),b=t?.path?territoryPathBounds(t.path):null;if(!b)return '';
  const w=b.w*cfg.scale,h=b.h*cfg.scale,x=b.cx-w/2+cfg.offsetX,y=b.cy-h/2+cfg.offsetY;
  return `<image class="territory-terrain-texture" data-terrain-texture-id="${i}" href="${cfg.image}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" opacity="${cfg.opacity}" mask="url(#terrain-texture-mask-${i})" pointer-events="none"/>`;
 }).join('');
 const mountain=images?`<g id="territory-terrain-textures" pointer-events="none" aria-hidden="true">${images}</g>`:'';
 return mountain+steppeTerrainTextureLayer();
}
const MAP_RENDER_STATE={initialized:false,owners:[],troops:[],city:[],selected:null,target:null,territoryNodes:new Map(),territoryPaths:new Map()};
const MAP_PERF=window.__perfDebug=window.__perfDebug||{fullMapDraws:0,diplomacyFrames:0,activeRaf:0};
function isPassTerritoryNode(i){return !!window.SAMGUK_SHANHAIGUAN?.isPassTerritory?.(i)}
function cityVisualSignature(i){const r=regions[i];if(!r)return '';const state=window.SAMGUK_CITY_TECH_TREE?.getTerritoryState?.(i);return `${r.cityType||'normal'}:${Number(r.cityLevel)||0}:${Number(r.capitalLevel)||0}:${state?.assetKey||''}:${state?.asset?.src||''}`}
function japanBorderCleanupConfigV134(){
 const explicit=window.SAMGUK_JAPAN_BORDER_CLEANUP_V134;
 if(explicit)return explicit;
 const data=window.SAMGUK_JAPAN_MAP_DATA_V134||window.SAMGUK_JAPAN_MAP_DATA_V132;
 const hints=data?.renderHints||{};
 return {version:134,suppressShapeStroke:hints.suppressShapeStroke||[],seamlessFillGroups:hints.seamlessFillGroups||[],artifactVerticalX:[969.5,1022.22],trueDividers:hints.trueDividers||[]};
}
function japanSeamlessGroupsV134(){const groups=japanBorderCleanupConfigV134()?.seamlessFillGroups||[];return Array.isArray(groups)?groups:[]}
function japanGroupInfoForTerritoryV134(i){
 const name=String(WORLD.territories?.[i]?.name||''),ids=new Map((WORLD.territories||[]).map((t,j)=>[String(t?.name||''),j]));
 for(const names of japanSeamlessGroupsV134()){
  if(!Array.isArray(names)||!names.includes(name))continue;
  const members=names.map(n=>ids.get(String(n))).filter(Number.isInteger);
  if(members.length!==names.length)return null;
  const owners=members.map(j=>regions?.[j]?.owner);
  const sameOwner=owners.length>0&&owners.every(o=>o===owners[0]);
  return {names,members,owner:owners[0],sameOwner};
 }
 return null;
}
function suppressJapanTerritoryShapeStrokeV134(i){
 const info=japanGroupInfoForTerritoryV134(i);if(info?.sameOwner)return true;
 return false;
}
function hideJapanTerritoryBaseFillV134(i){return !!japanGroupInfoForTerritoryV134(i)?.sameOwner}
function japanSeamlessFillMarkupV134(){
 let out='<g id="japan-v134-seamless-fill-layer" pointer-events="none">';
 const seen=new Set();
 for(const names of japanSeamlessGroupsV134()){
  if(!Array.isArray(names)||!names.length)continue;const key=names.join('|');if(seen.has(key))continue;seen.add(key);
  const ids=names.map(name=>(WORLD.territories||[]).findIndex(t=>String(t?.name||'')===String(name)));
  if(ids.some(i=>!Number.isInteger(i)||i<0||!isActiveTerritory(i)||!regions[i]))continue;
  const owner=regions[ids[0]].owner;if(!ids.every(i=>regions[i].owner===owner))continue;
  const d=ids.map(i=>String(WORLD.territories[i]?.path||'')).join('');if(!d)continue;
  out+=`<path class="japan-v134-seamless-owner-fill" data-japan-fill-group="${key}" d="${d}" fill="${K[owner].color}" fill-opacity="${referenceMode?0:.7}" stroke="none" fill-rule="nonzero"/>`;
 }
 return out+'</g>';
}
function japanV134AffectedIndices(){
 const ids=new Map((WORLD.territories||[]).map((t,i)=>[String(t?.name||''),i])),out=[];
 for(const names of japanSeamlessGroupsV134())for(const name of names){const i=ids.get(String(name));if(Number.isInteger(i)&&!out.includes(i))out.push(i)}
 return out;
}
function japanArtifactVerticalBorderV134(path,border){
 if(!path||!border)return false;
 const aName=String(WORLD.territories?.[border.a]?.name||''),bName=String(WORLD.territories?.[border.b]?.name||'');
 const relevant=new Set(['왜 북부 서부','왜 북부','왜 동북부','왜 극동부']);
 if(!relevant.has(aName)&&!relevant.has(bName))return false;
 const bounds=territoryPathBounds(path);if(!bounds)return false;
 if(bounds.h<18||bounds.w>5)return false;
 const cx=bounds.cx,seams=japanBorderCleanupConfigV134()?.artifactVerticalX||[969.5,1022.22];
 return seams.some(x=>Math.abs(cx-Number(x))<=2.5);
}
function japanTrueDividerMarkupV134(){
 const cfg=japanBorderCleanupConfigV134(),dividers=cfg?.trueDividers||[];if(!Array.isArray(dividers)||!dividers.length)return'';
 const ids=new Map((WORLD.territories||[]).map((t,i)=>[String(t?.name||''),i]));let out='';
 for(const divider of dividers){
  const pair=divider?.between||[],a=ids.get(String(pair[0]||'')),b=ids.get(String(pair[1]||'')),d=String(divider?.path||'');
  if(!d||!Number.isInteger(a)||!Number.isInteger(b)||!isActiveTerritory(a)||!isActiveTerritory(b)||!regions[a]||!regions[b])continue;
  if(regions[a].owner===regions[b].owner){out+=`<path class="province-border japan-v134-true-divider" data-japan-divider="${divider.id||''}" d="${d}" fill="none" stroke="#233542" stroke-width=".58" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`}
  else{out+=`<path class="national-border national-border-outer japan-v134-true-divider" data-japan-divider="${divider.id||''}" d="${d}" fill="none" stroke="#142936" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path class="national-border national-border-inner japan-v134-true-divider" data-japan-divider="${divider.id||''}" d="${d}" fill="none" stroke="#fff1c1" stroke-width=".72" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`}
 }
 return out;
}
function currentBorderZoom(){const z=window.SAMGUK_MAP_CAMERA_API?.getZoomLevel?.(mapView);return Number.isFinite(Number(z))?Number(z):1}
function borderRenderPath(index,border){return window.SAMGUK_BORDER_OPTIMIZER?.pathForBorder?.(index,border?.path,currentBorderZoom())||border?.path||''}
function buildBoundaryLayerMarkup(){let out='';const borders=WORLD.borders||[];
 for(let index=0;index<borders.length;index++){const border=borders[index];if(!isActiveTerritory(border.a)||!isActiveTerritory(border.b))continue;if(regions[border.a].owner===regions[border.b].owner){const d=borderRenderPath(index,border);if(japanArtifactVerticalBorderV134(d,border))continue;out+=`<path class="province-border" data-border-index="${index}" data-border-role="province" d="${d}" fill="none" stroke="#233542" stroke-width=".58" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`}}
 for(let index=0;index<borders.length;index++){const border=borders[index];if(!isActiveTerritory(border.a)||!isActiveTerritory(border.b))continue;if(regions[border.a].owner!==regions[border.b].owner){const d=borderRenderPath(index,border);if(japanArtifactVerticalBorderV134(d,border))continue;out+=`<path class="national-border national-border-outer" data-border-index="${index}" data-border-role="national-outer" d="${d}" fill="none" stroke="#142936" stroke-width="2" vector-effect="non-scaling-stroke"/><path class="national-border national-border-inner" data-border-index="${index}" data-border-role="national-inner" d="${d}" fill="none" stroke="#fff1c1" stroke-width=".72" vector-effect="non-scaling-stroke"/>`}}
 out+=japanTrueDividerMarkupV134();
 for(const i of [selected,target]){if(i!==null&&isActiveTerritory(i)&&regions[i]&&!isPassTerritoryNode(i)){const color=i===target?'#fff0a8':'#ffd84d';out+=`<path class="selection-border selection-border-shadow" data-selection-outline-shadow="${i}" d="${WORLD.territories[i].path}" fill="none" stroke="#2b2110" stroke-opacity=".72" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><path class="selection-border" data-selection-outline="${i}" d="${WORLD.territories[i].path}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`}}
 return out;
}
function plannedRouteMarkup(){
 if(target===null||selected===null)return '';
 // v116: 메인 침략 모드에서는 새 침략 FX 레이어가 공격 경로를 전담한다.
 // 기존 planned-route의 노란 selected -> target 점선을 동시에 그리면
 // 빨간 공격선과 중복되므로 공격 모드에서만 완전히 숨긴다.
 // 지원군 이동(actionMode === 'support')은 이 조건에 걸리지 않아
 // 지원 영토 -> 공격 시작점 노란 이동선이 그대로 유지된다.
 let invasionState=null;
 try{invasionState=window.SAMGUK_LIGHTWEIGHT_INVASION?.getState?.()||null}catch(_e){}
 if(actionMode==='attack'&&invasionState?.active)return '';
 const r=routeData(selected,target),sea=typeof isSeaRoute==='function'&&isSeaRoute(selected,target);
 if(sea){
  // v65: 해상선은 명령 대상이 선택된 순간에만 나타난다. 상시 SeaNode/항로는 렌더링하지 않는다.
  if(typeof busy!=='undefined'&&busy)return '';
  return `<path class="planned-route sea-movement-guide" d="${routePath(r)}" fill="none" stroke="#f8fbff" stroke-width="1.4" opacity=".78" stroke-dasharray="6 7" stroke-linecap="round" vector-effect="non-scaling-stroke" marker-end="url(#route-arrow)"/>`;
 }
 return `<path class="planned-route" d="${routePath(r)}" fill="none" stroke="#ffe4a2" stroke-width="2.5" stroke-dasharray="6 5" vector-effect="non-scaling-stroke" marker-end="url(#route-arrow)"/>`;
}
function cacheTerritoryMapNodes(){MAP_RENDER_STATE.territoryNodes.clear();MAP_RENDER_STATE.territoryPaths.clear();document.querySelectorAll('#map .territory-shape[data-id]').forEach(el=>{const id=Number(el.dataset.id);if(!Number.isInteger(id))return;MAP_RENDER_STATE.territoryNodes.set(id,el);const path=el.querySelector(':scope > path');if(path)MAP_RENDER_STATE.territoryPaths.set(id,path)})}
function snapshotMapDynamicState(){MAP_RENDER_STATE.owners=regions.map((r,i)=>isActiveTerritory(i)?r.owner:null);MAP_RENDER_STATE.troops=regions.map((r,i)=>isActiveTerritory(i)?Number(r.troops)||0:null);MAP_RENDER_STATE.city=regions.map((r,i)=>isActiveTerritory(i)?cityVisualSignature(i):'');MAP_RENDER_STATE.selected=selected;MAP_RENDER_STATE.target=target;MAP_RENDER_STATE.initialized=true;cacheTerritoryMapNodes()}
function updateTerritoryShape(i){const r=regions[i],g=MAP_RENDER_STATE.territoryNodes.get(i),path=MAP_RENDER_STATE.territoryPaths.get(i);if(!r||!g||!path)return false;const isSel=selected===i,isTarget=target===i,isPass=isPassTerritoryNode(i),suppressStroke=suppressJapanTerritoryShapeStrokeV134(i),hideBaseFill=hideJapanTerritoryBaseFillV134(i);g.classList.toggle('is-selected',isSel);g.classList.toggle('is-target',isTarget);g.classList.toggle('pass-territory',isPass);if(isPass){path.setAttribute('fill','transparent');path.setAttribute('fill-opacity','0');path.setAttribute('stroke','none');path.setAttribute('stroke-width','0');path.setAttribute('pointer-events','none');return true}path.setAttribute('fill',hideBaseFill?'transparent':K[r.owner].color);path.setAttribute('fill-opacity',String(hideBaseFill?0:(referenceMode?0:isSel?.84:.7)));path.setAttribute('stroke',suppressStroke?'none':(isTarget?'#ffeeb0':isSel?'#ffe182':'#233542'));path.setAttribute('stroke-width',String(suppressStroke?0:(isSel||isTarget?3:.7)));path.setAttribute('pointer-events','all');return true}
function updateSeaRouteSelection(){const layer=document.getElementById('planned-route-layer');if(layer)layer.innerHTML=plannedRouteMarkup()}
function updateAtlasLabels(){const old=document.getElementById('atlas-labels');if(old)old.outerHTML=koreanAtlasLabels()}
function updateOverlaySelection(previousSelected){for(const id of new Set([previousSelected,selected].filter(Number.isInteger))){const el=document.querySelector(`#mapUiOverlay .minimal-label[data-id="${id}"]`);if(!el)continue;const chosen=selected===id;el.classList.toggle('chosen',chosen);el.setAttribute('aria-pressed',String(chosen))}}
function updateMapDynamicState({force=false}={}){
 const svg=document.getElementById('map');if(!svg)return false;if(!MAP_RENDER_STATE.initialized||!svg.querySelector('.territory-shape[data-id]')){drawMap('initial');return true}
 const changedOwners=[],changedTroops=[];let cityChanged=false;
 for(let i=0;i<regions.length;i++){if(!isActiveTerritory(i))continue;const r=regions[i],owner=r.owner,troops=Number(r.troops)||0,city=cityVisualSignature(i);if(force||MAP_RENDER_STATE.owners[i]!==owner)changedOwners.push(i);if(force||MAP_RENDER_STATE.troops[i]!==troops)changedTroops.push(i);if(force||MAP_RENDER_STATE.city[i]!==city)cityChanged=true}
 const previousSelected=MAP_RENDER_STATE.selected,selectionChanged=force||previousSelected!==selected||MAP_RENDER_STATE.target!==target,ownerChanged=changedOwners.length>0;
 const shapeIds=new Set(force?regions.map((_,i)=>isActiveTerritory(i)?i:null).filter(Number.isInteger):[...changedOwners,previousSelected,MAP_RENDER_STATE.target,selected,target].filter(Number.isInteger));if(ownerChanged)for(const i of japanV134AffectedIndices())shapeIds.add(i);for(const i of shapeIds)updateTerritoryShape(i);
 if(ownerChanged||selectionChanged){const boundary=document.getElementById('boundary-layer');if(boundary)boundary.innerHTML=buildBoundaryLayerMarkup();if(ownerChanged){const seamless=document.getElementById('japan-v134-seamless-fill-layer');if(seamless)seamless.outerHTML=japanSeamlessFillMarkupV134();updateAtlasLabels()}updateSeaRouteSelection()}
 const hud=window.SAMGUK_FACTION_TROOP_HUD;if(cityChanged||ownerChanged||!document.querySelector('#mapUiOverlay .minimal-label[data-id]')){window.SAMGUK_MAP_UI_OVERLAY?.refresh?.({force:true});requestAnimationFrame(()=>window.SAMGUK_CITY_SPRITES?.bindImageFallbacks?.())}else{for(const i of new Set([...changedOwners,...changedTroops]))hud?.updateTerritory?.(i,{forceCount:true});if(selectionChanged)updateOverlaySelection(previousSelected)}window.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('map-dirty');
 if(TW_DIPLOMACY_UI_STATE?.open&&typeof applyTotalWarDiplomacyMapFocus==='function')applyTotalWarDiplomacyMapFocus();
 MAP_RENDER_STATE.owners=regions.map((r,i)=>isActiveTerritory(i)?r.owner:null);MAP_RENDER_STATE.troops=regions.map((r,i)=>isActiveTerritory(i)?Number(r.troops)||0:null);MAP_RENDER_STATE.city=regions.map((r,i)=>isActiveTerritory(i)?cityVisualSignature(i):'');MAP_RENDER_STATE.selected=selected;MAP_RENDER_STATE.target=target;
 document.dispatchEvent(new CustomEvent('samguk:map-state-updated',{detail:{ownerChanged,selectionChanged,cityChanged,changedOwners:[...changedOwners],changedTroops:[...changedTroops]}}));return true;
}
window.updateMapDynamicState=updateMapDynamicState;
function drawMap(reason='full'){const svg=document.getElementById('map');window.SAMGUK_GPU_MAP_CAMERA?.init?.();applyView({rafSafe:true,refreshUI:false,sharp:true});
svg.classList.toggle('terrain-mode',referenceMode);svg.classList.toggle('specialty-mode',specialtyMode);document.body.classList.toggle('specialty-map-mode',specialtyMode);const refButton=document.getElementById('mapReference'),specialtyButton=document.getElementById('mapSpecialty');if(refButton){refButton.textContent=referenceMode?'지형 보기 ON':'지형 보기';refButton.setAttribute('aria-pressed',String(referenceMode))}if(specialtyButton){specialtyButton.textContent=specialtyMode?'특산품 ON':'특산품';specialtyButton.setAttribute('aria-pressed',String(specialtyMode))}
const atlasBounds=mapBounds()?.bounds?.()||{x:WORLD.minX||0,y:WORLD.minY||0,w:WORLD.width,h:WORLD.height};
let str=`<defs><clipPath id="image-bounds" clipPathUnits="userSpaceOnUse"><rect x="${atlasBounds.x}" y="${atlasBounds.y}" width="${atlasBounds.w}" height="${atlasBounds.h}"/></clipPath><clipPath id="river-land" clipPathUnits="userSpaceOnUse"><path d="${WORLD.landPath}"/></clipPath><marker id="route-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0L8 4L0 8Z" fill="#f6d383"/></marker><filter id="landmark-white-outline" x="-35%" y="-35%" width="170%" height="170%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="0.55" result="expanded"/><feFlood flood-color="#fffdf4" result="white"/><feComposite in="white" in2="expanded" operator="in" result="whiteShape"/><feComposite in="whiteShape" in2="SourceAlpha" operator="out" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter>${terrainTextureDefs()}</defs><rect x="-2000" y="-2000" width="5000" height="5000" fill="#102632"/><g clip-path="url(#image-bounds)" aria-label="참고 지도의 해안선·강·산악 지형"><rect x="${atlasBounds.x}" y="${atlasBounds.y}" width="${atlasBounds.w}" height="${atlasBounds.h}" fill="#9ecbd0"/><path d="${WORLD.landPath}" fill="#9aad82" stroke="#5f847b" stroke-width=".8"/><path d="${GEOGRAPHY.highlands}" fill="#d6c691" opacity=".62"/></g>`;
str+='<g clip-path="url(#image-bounds)">';
str+=seaConnectionNetworkMarkup();
str+=japanSeamlessFillMarkupV134();
regions.forEach((r,i)=>{if(!isActiveTerritory(i))return;const isSel=selected===i,isTarget=target===i,isPass=isPassTerritoryNode(i),suppressStroke=suppressJapanTerritoryShapeStrokeV134(i),hideBaseFill=hideJapanTerritoryBaseFillV134(i),stroke=isTarget?'#ffeeb0':isSel?'#ffe182':'#233542',fill=(isPass||hideBaseFill)?'transparent':K[r.owner].color,fillOpacity=(isPass||hideBaseFill)?0:(referenceMode?0:isSel?.84:.7),strokeColor=(isPass||suppressStroke)?'none':stroke,strokeWidth=(isPass||suppressStroke)?0:(isSel||isTarget?3:.7),pathPointer=isPass?'none':'all';str+=`<g class="territory territory-shape ${isPass?'pass-territory':''} ${isSel?'is-selected':''} ${isTarget?'is-target':''}" data-id="${i}"><path d="${WORLD.territories[i].path}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="${pathPointer}"/></g>`});
str+=territoryTerrainTextureLayer();
if(referenceMode)str+=`<g id="terrain-overlay" pointer-events="none" aria-hidden="true"><path d="${TERRAIN.grass}" fill="#50bb52" opacity=".27"/><path d="${TERRAIN.high}" fill="#dc735f" opacity=".35"/><path d="${TERRAIN.ridge}" fill="#fa2929" opacity=".9"/></g>`;str+=mountainRelief();str+=`<path id="river-layer" class="map-rivers" d="${geographyRiversWithoutReclaimedWaterV143()}${TERRAIN.river}" fill="#398fbf" opacity="${referenceMode?1:.88}" clip-path="url(#river-land)" pointer-events="none" aria-hidden="true"/>`;str+=(window.SAMGUK_EUMNU_SKETCH_V144?.lakeMarkup?.()||'');str+=dongjinRiverMarkup();str+=mapInactiveWaterMasks();if(!specialtyMode)str+=mapShanhaiguanPassAsset();str+=`<g id="boundary-layer" pointer-events="none">${buildBoundaryLayerMarkup()}</g>`;if(!specialtyMode){str+=mapGreatWallDefenseLine();str+=mapRiverNames();str+=koreanAtlasLabels()}
str+=`<g id="planned-route-layer">${specialtyMode?'':plannedRouteMarkup()}</g>`;if(!specialtyMode){str+=mapGreatWallLandmark();str+=mapLandmarks()}
str+='</g><g id="march-layer" aria-hidden="true" pointer-events="none"></g><g id="battle-layer" aria-hidden="true" pointer-events="none"></g>';svg.innerHTML=str;applyAllSteppeTextures(svg);window.SAMGUK_GPU_MAP_CAMERA?.setView?.(mapView,{immediate:true});window.SAMGUK_MAP_UI_OVERLAY?.refresh?.({force:true});snapshotMapDynamicState();MAP_PERF.fullMapDraws=(MAP_PERF.fullMapDraws||0)+1;MAP_PERF.lastFullMapReason=reason;document.dispatchEvent(new CustomEvent('samguk:map-rendered',{detail:{view:[...mapView],reason}}));}
window.drawMapFull=drawMap;

function flagMarkup(k,n,scale){
 const color=K[k].color,letter=K[k].symbol,hud=window.SAMGUK_FACTION_TROOP_HUD;
 const troopHud=n?(hud?.armyMarkup?.({faction:K[k],troops:n,x:0,y:21,scale:.88,unitId:`march-${k}`})||`<rect x="-19" y="10" width="38" height="20" rx="4" fill="#102936" stroke="#e3c484"/><text x="0" y="25" fill="#ffedbd" font-size="13" font-weight="bold" text-anchor="middle">${n}</text>`):'';
 return `<g class="march-standard" transform="scale(${scale})"><ellipse cx="0" cy="9" rx="13" ry="5" fill="#122b33" opacity=".3"/><path d="M-3 8V-44" stroke="#312c25" stroke-width="3"/><circle cx="-3" cy="-46" r="3" fill="#f9db8e"/><g class="flag-cloth"><path d="M-2-42L27-42L21-29L27-15L-2-15Z" fill="${color}" stroke="#ffe0a0" stroke-width="1.4"/><text x="10" y="-23" fill="#fff5da" font-size="17" text-anchor="middle" font-family="serif">${letter}</text></g>${troopHud}</g>`
}
function transportShipMarkup(k,n,scale){
 const color=K[k]?.color||'#d7b46a',hud=window.SAMGUK_FACTION_TROOP_HUD;
 const troopHud=n?(hud?.armyMarkup?.({faction:K[k],troops:n,x:0,y:22,scale:.82,unitId:`sea-march-${k}`})||`<rect x="-20" y="12" width="40" height="19" rx="4" fill="#102936" stroke="#e3c484"/><text x="0" y="26" fill="#ffedbd" font-size="12" font-weight="bold" text-anchor="middle">${n}</text>`):'';
 return `<g class="march-transport-ship" transform="scale(${scale})"><ellipse cx="0" cy="8" rx="19" ry="5" fill="#102a36" opacity=".28"/><image href="transport_ship.svg" x="-22" y="-22" width="44" height="34" preserveAspectRatio="xMidYMid meet"/><path d="M1-19V-31L13-27L1-23Z" fill="${color}" stroke="#fff2c8" stroke-width=".9"/>${troopHud}</g>`;
}
async function animateMarch(i,j,enemy=false){
 const forcedPath=typeof steppeForcedMarchPath==='function'?steppeForcedMarchPath(i,j):null,routeIds=forcedPath||[i,j],routes=[];
 for(let n=0;n<routeIds.length-1;n++)routes.push(routeData(routeIds[n],routeIds[n+1]));
 const r=routes[0]||routeData(i,j),lastRoute=routes[routes.length-1]||r,k=regions[i].owner,n=troopSend(i),isAttack=regions[j].owner!==k,sea=!forcedPath&&typeof isSeaRoute==='function'&&isSeaRoute(i,j),forced=!!forcedPath;
 const points=[r.a,...routes.map(x=>x.b)],pad=45;let [x,y,w,h]=mapView;
 if(!enemy&&points.some(p=>p[0]<x+pad||p[0]>x+w-pad||p[1]<y+pad||p[1]>y+h-pad)){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),cx=(minX+maxX)/2,cy=(minY+maxY)/2,nw=Math.max(250,maxX-minX+150,(maxY-minY+150)*w/h),nh=nw*h/w;
  mapView=sanitizeMapView([cx-nw/2,cy-nh/2,nw,nh]);applyView({rafSafe:true,refreshUI:true,sharp:true});
 }
 const layer=document.getElementById('march-layer');if(!layer)return;
 const scale=markerScale()*1.1;
 let routeMarkup='';
 if(sea){routeMarkup=`<path class="march-route sea-movement-active" d="${routePath(r)}" fill="none" stroke="#f8fbff" stroke-width="1.6" opacity=".84" stroke-dasharray="7 7" stroke-linecap="round" marker-end="url(#route-arrow)" vector-effect="non-scaling-stroke"/>`}
 else{routeMarkup=routes.map((seg,idx)=>`<path d="${routePath(seg)}" fill="none" stroke="#20343c" stroke-width="6" opacity=".5" vector-effect="non-scaling-stroke"/><path class="march-route${forced?' steppe-forced-march-route':''}" d="${routePath(seg)}" fill="none" stroke="${forced?'#d9e997':'#ffe5a3'}" stroke-width="${forced?3:2.5}" stroke-dasharray="${forced?'5 4':'7 6'}" ${idx===routes.length-1?'marker-end="url(#route-arrow)"':''} vector-effect="non-scaling-stroke"/>`).join('')}
 const marker=(count,s)=>sea?transportShipMarkup(k,count,s):flagMarkup(k,count,s),end=lastRoute.b;
 layer.innerHTML=`${routeMarkup}<circle class="battle-target" cx="${end[0]}" cy="${end[1]}" r="${25*scale}" fill="none" stroke="${forced?'#e6f29a':'#ffdda0'}" stroke-width="2.5"/><g id="standard-2">${marker(0,scale*.8)}</g><g id="standard-1">${marker(0,scale*.9)}</g><g id="standard-0">${marker(n,scale)}</g>`;
 const via=forcedPath?` · ${regions[forcedPath[1]]?.name||'중간 영토'} 경유`:'';const label=`${K[k].name} · ${regions[i].name} → ${regions[j].name}${via} · ${n}명 ${sea?'해상 수송 ':forced?'초원 강행군 ':'지상 '}${isAttack?'공격':'이동'}`;{const hintEl=document.getElementById('hint');if(hintEl)hintEl.textContent=label;}
 const flags=[0,1,2].map(a=>document.getElementById('standard-'+a));const reduced=mapReduced(),duration=(reduced?150:enemy?550:forced?1650:1400)/aiPlaybackRate(regions[i].owner,regions[j].owner,enemy);
 function positionAt(progress){progress=Math.max(0,Math.min(1,progress));if(routes.length<=1)return routePosition(r,progress);const scaled=progress*routes.length,idx=Math.min(routes.length-1,Math.floor(Math.min(routes.length-.000001,scaled))),local=Math.max(0,Math.min(1,scaled-idx));return routePosition(routes[idx],local)}
 await new Promise(resolve=>{let startTime;function frame(now){if(startTime===undefined)startTime=now;const t=Math.min(1,(now-startTime)/duration);flags.forEach((f,a)=>{if(!f)return;const progress=reduced?1:Math.max(0,Math.min(1,t*1.3-a*.14)),p=positionAt(progress);f.setAttribute('transform',`translate(${p[0]} ${p[1]})`)});if(t<1)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});layer.innerHTML='';
}
function battleOutcome(attacker,defender,won){const involved=attacker===player||defender===player;const victory=attacker===player?won:defender===player?!won:true;return {victory,title:involved?(attacker===player?(won?'승리 · 점령 성공':'패배 · 공격 실패'):(won?'패배 · 영토 상실':'승리 · 방어 성공')):`${K[won?attacker:defender].name} 승리`,color:involved?(victory?'#60e6a3':'#ff7880'):'#ffda87'}}
function triggerPlayerBattleResultFx(outcome,attacker,defender){
 const involved=attacker===player||defender===player;if(!involved||!outcome)return;
 const body=document.body,viewport=document.getElementById('mapViewport');
 body.classList.remove('battle-result-victory-rim','battle-result-defeat-rim');
 if(viewport)viewport.classList.remove('battle-result-screen-shake');
 void body.offsetWidth;
 if(outcome.victory){
  body.classList.add('battle-result-victory-rim');
  setTimeout(()=>body.classList.remove('battle-result-victory-rim'),560);
 }else{
  body.classList.add('battle-result-defeat-rim');
  if(viewport){void viewport.offsetWidth;viewport.classList.add('battle-result-screen-shake');setTimeout(()=>viewport.classList.remove('battle-result-screen-shake'),280)}
  setTimeout(()=>body.classList.remove('battle-result-defeat-rim'),620);
 }
}
async function showBattleResult(i,attacker,defender,won,enemy=false){const outcome=battleOutcome(attacker,defender,won),s=seeds[i],scale=markerScale()*1.25;triggerPlayerBattleResultFx(outcome,attacker,defender);const layer=document.getElementById('battle-layer');if(!layer)return;const icon=outcome.victory?'<path d="M-13-1L-3 10L16-12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>':'<path d="M-11-11L11 11M11-11L-11 11" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>';
layer.innerHTML=`<g transform="translate(${s[1]} ${s[2]}) scale(${scale})"><g id="battle-float" class="battle-popup" style="color:${outcome.color}"><circle r="28" fill="#112b37" stroke="${outcome.color}" stroke-width="3"/>${icon}<rect x="-88" y="33" width="176" height="49" rx="6" fill="#102734" stroke="${outcome.color}" stroke-width="1.5"/><text y="54" fill="${outcome.color}" font-size="17" font-weight="700" text-anchor="middle">${outcome.title}</text><text y="72" fill="#ecede3" font-size="12" text-anchor="middle">${regions[i].name} · ${K[attacker].name}의 공격</text></g></g>`;
const description=`${regions[i].name}: ${outcome.title}`;document.getElementById('battleAnnounce').textContent=description;{const hintEl=document.getElementById('hint');if(hintEl)hintEl.textContent=description;}const group=document.getElementById('battle-float'),reduced=mapReduced(),duration=(reduced?400:enemy?750:1350)/aiPlaybackRate(attacker,defender,enemy);
await new Promise(resolve=>{let started;function frame(now){if(started===undefined)started=now;const t=Math.min(1,(now-started)/duration);group.setAttribute('transform',`translate(0 ${reduced?-42:-15-65*t})`);group.setAttribute('opacity',reduced||t<.72?'1':String(Math.max(0,(1-t)/.28)));if(t<1)requestAnimationFrame(frame);else resolve()}requestAnimationFrame(frame)});layer.innerHTML='';}

// Fixed labels placed beside existing river courses. v140 also injects the custom Dongjin Yangtze label from the external Dongjin map data.
const RIVER_NAMES=[['송화강',535,327,-8],['우수리강',758,264,68],['두만강',684,385,-20],['요하강',297,449,-50],['압록강',471,507,-37],['대동강',476,670,-26],['한강',548,800,12],['금강',566,873,17],['낙동강',651,889,74],['난하',14,621,64],['황하',-60,804,-49],['회수',26,1060,-27]];
function customRiverNameEntries(){const river=window.SAMGUK_DONGJIN_MAP_DATA_V140?.river||window.SAMGUK_DONGJIN_MAP_DATA_V139?.river||window.SAMGUK_DONGJIN_MAP_DATA_V137?.river;if(!river?.label)return[];const x=Number(river.label.x),y=Number(river.label.y),angle=Number.isFinite(Number(river.label.angle))?Number(river.label.angle):0,text=String(river.label.text||river.name||'').trim();if(!text||!Number.isFinite(x)||!Number.isFinite(y))return[];return[[text,x,y,angle]]}
function mapRiverNames(){const names=[...RIVER_NAMES,...customRiverNameEntries()];return '<g class="river-names" pointer-events="none" aria-hidden="true">'+names.map(([name,x,y,angle])=>`<text x="${x}" y="${y}" transform="rotate(${angle} ${x} ${y})" text-anchor="middle" fill="#15516b" stroke="#d1e5d5" stroke-width="2.2" paint-order="stroke" font-size="11" font-weight="600">${name}</text>`).join('')+'</g>'}

// Great Wall remains one logical facility. The defense line is rendered directly on the
// existing WORLD.borders shared-border geometry for the six designated territory pairs.
// It is visual-only (pointer-events:none); the small landmark remains the sole clickable UI target.
const GREAT_WALL_BORDER_PAIRS=[
 [88,38], // 북연 중부 ↔ 요서 동부
 [88,37], // 북연 중부 ↔ 요서 서부
 [56,37], // 북연 남부 ↔ 요서 서부
 [56,55], // 북연 남부 ↔ 북연 내륙
 [56,87], // 북연 남부 ↔ 요서 남부
 [57,87]  // 기주 ↔ 요서 남부
];
const GREAT_WALL_LANDMARK={src:'greatwall_landmark.png',x:-88,y:593,w:32,h:32,label:'만리장성',labelDy:23,fontSize:7.2};
function greatWallSharedBorders(){
 const borders=WORLD.borders||[];
 return GREAT_WALL_BORDER_PAIRS.map(([a,b])=>{
  const index=borders.findIndex(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a));
  if(index<0)return null;
  const border=borders[index];
  return {index,border,path:borderRenderPath(index,border)};
 }).filter(Boolean);
}
function greatWallSharedBorderPaths(){return greatWallSharedBorders().map(x=>x.path)}
// National-border-weight dark outline + brown inner line, both sitting on the exact shared border.
function mapGreatWallDefenseLine(){const entries=greatWallSharedBorders();return `<g id="great-wall-defense-line" class="great-wall-defense-line" pointer-events="none" aria-hidden="true">
 ${entries.map(({index,path})=>`<path class="great-wall-border-outer" data-border-index="${index}" d="${path}" fill="none" stroke="#142936" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('')}
 ${entries.map(({index,path})=>`<path class="great-wall-border-inner" data-border-index="${index}" d="${path}" fill="none" stroke="#a45f3f" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('')}
 </g>`}
function mapGreatWallLandmark(){const o=GREAT_WALL_LANDMARK;return `<g id="great-wall-landmark" class="map-landmark great-wall-landmark">
 <image data-great-wall="1" aria-label="만리장성 증축 및 방어선 정보" href="${o.src}" x="${o.x-o.w/2}" y="${o.y-o.h/2}" width="${o.w}" height="${o.h}" preserveAspectRatio="xMidYMid meet" pointer-events="all" filter="url(#landmark-white-outline)" style="cursor:pointer;outline:none"/>
 <text x="${o.x}" y="${o.y+o.labelDy}" text-anchor="middle" fill="#d6b66d" stroke="#382b1b" stroke-width="1.15" paint-order="stroke fill" font-size="${o.fontSize}" font-weight="800" font-family="sans-serif" pointer-events="none">${o.label}</text>
 </g>`}

// Decorative mountain landmarks. They are clickable event points; game rules live in game.js.
const MAP_LANDMARKS=[
 {id:"geumgangsan",src:"geumgangsan.png",x:587,y:657,w:32,h:32,opacity:.96,label:"금강산",labelDy:23,fontSize:7.2,outline:true},
 {id:"baekdusan",src:"baekdusan.png",x:602,y:415,w:32,h:32,opacity:.96,label:"백두산",labelDy:23,fontSize:7.2,outline:true},
 {id:"taesan",src:"taesan.png",x:-87,y:887,w:32,h:32,opacity:.97,label:"태산",labelDy:23,fontSize:7.2,outline:true}
];
function mapLandmarks(){
 return '<g id="map-landmarks">'+
  MAP_LANDMARKS.map(o=>`<g class="map-landmark" data-landmark="${o.id}" role="button" tabindex="0" aria-label="${o.label} 명산 이벤트" style="cursor:pointer">
   <image href="${o.src}" x="${o.x-o.w/2}" y="${o.y-o.h/2}" width="${o.w}" height="${o.h}" opacity="${o.opacity}" preserveAspectRatio="xMidYMid meet" pointer-events="all"${o.outline?' filter="url(#landmark-white-outline)"':''}/>
   <text x="${o.x}" y="${o.y+(o.labelDy||0)}" text-anchor="middle" fill="#2f8a48" stroke="#f4f1d2" stroke-width="1.25" stroke-opacity=".96" paint-order="stroke fill" font-size="${o.fontSize||7}" font-weight="800" font-family="sans-serif" pointer-events="none">${o.label||""}</text>
  </g>`).join('')+
 '</g>';
}


function mapShanhaiguanPassAsset(){
 const pass=window.SAMGUK_SHANHAIGUAN;if(!pass||!WORLD.territories?.[pass.id])return '';
 const m=labelMetrics();if(!m.showCapital)return '';
 const t=WORLD.territories[pass.id],size=Math.max(20,Number(window.SAMGUK_TERRITORY_CITY_UI?.config?.standardSizePx)||Number(window.SAMGUK_MAP_ZOOM_CONFIG?.cityIconBaseSize)||40);
 const x=Number(t.x)||0,y=Number(t.y)||0;
 const left=x-size/2,top=y-size/2,badgePad=14;
 return `<g id="shanhaiguan-pass-asset" class="map-pass-asset" data-id="${pass.id}" data-pass-node="1" role="button" tabindex="0" aria-label="산해관 특수 관문 영토" style="cursor:pointer"><rect class="shanhaiguan-hitbox" x="${(left-2).toFixed(2)}" y="${(top-2).toFixed(2)}" width="${(size+4).toFixed(2)}" height="${(size+badgePad).toFixed(2)}" rx="6" pointer-events="all"/><image class="shanhaiguan-pass-image" href="${pass.asset}" x="${left.toFixed(2)}" y="${top.toFixed(2)}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" pointer-events="none"/><title>산해관 · 관문 방어 +30% · 건설 불가</title></g>`;
}

function mountainRelief(){return `<g class="ridge-relief" id="mountain-layer" pointer-events="none" aria-hidden="true" clip-path="url(#river-land)"><path d="${TERRAIN.ridge}" fill="#8a7251" opacity=".56" stroke="#d3bd89" stroke-width="1.1" stroke-linejoin="round"/></g>`}

function aiPlaybackRate(a,b,enemy){return enemy&&a!==player&&b!==player?2:1}
