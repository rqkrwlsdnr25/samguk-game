(function(global){
  'use strict';

  const EPS=1e-9;
  const pathCache=new Map();
  const territoryCache=new Map();

  const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;

  function averagePoint(points){
    if(!Array.isArray(points)||!points.length)return{x:0,y:0};
    let x=0,y=0,n=0;
    for(const p of points){
      const px=finite(p?.x,Array.isArray(p)?p[0]:NaN),py=finite(p?.y,Array.isArray(p)?p[1]:NaN);
      if(!Number.isFinite(px)||!Number.isFinite(py))continue;
      x+=px;y+=py;n++;
    }
    return n?{x:x/n,y:y/n}:{x:0,y:0};
  }

  // Shoelace formula. signedArea2 is twice the signed polygon area.
  function polygonCentroid(points){
    if(!Array.isArray(points)||points.length<3)return averagePoint(points||[]);
    let signedArea2=0,cxNumerator=0,cyNumerator=0;
    const valid=[];
    for(const p of points){
      const x=finite(p?.x,Array.isArray(p)?p[0]:NaN),y=finite(p?.y,Array.isArray(p)?p[1]:NaN);
      if(Number.isFinite(x)&&Number.isFinite(y))valid.push({x,y});
    }
    if(valid.length<3)return averagePoint(valid);
    for(let i=0,n=valid.length;i<n;i++){
      const a=valid[i],b=valid[(i+1)%n],cross=a.x*b.y-b.x*a.y;
      signedArea2+=cross;
      cxNumerator+=(a.x+b.x)*cross;
      cyNumerator+=(a.y+b.y)*cross;
    }
    if(Math.abs(signedArea2)<EPS)return averagePoint(valid);
    return{x:cxNumerator/(3*signedArea2),y:cyNumerator/(3*signedArea2)};
  }

  function ringMetrics(points){
    if(!Array.isArray(points)||points.length<3){const c=averagePoint(points||[]);return{center:c,signedArea:0}}
    let signedArea2=0,cxNumerator=0,cyNumerator=0;
    for(let i=0,n=points.length;i<n;i++){
      const a=points[i],b=points[(i+1)%n],cross=a.x*b.y-b.x*a.y;
      signedArea2+=cross;cxNumerator+=(a.x+b.x)*cross;cyNumerator+=(a.y+b.y)*cross;
    }
    if(Math.abs(signedArea2)<EPS)return{center:averagePoint(points),signedArea:0};
    return{center:{x:cxNumerator/(3*signedArea2),y:cyNumerator/(3*signedArea2)},signedArea:signedArea2/2};
  }

  // WORLD territory paths currently use absolute M/L/Z. H/V and relative forms
  // are also accepted so the utility remains safe if atlas export changes later.
  function parseSvgPathRings(path){
    const key=String(path||'');
    if(pathCache.has(key))return pathCache.get(key);
    const tokens=key.match(/[MmLlHhVvZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)||[];
    const rings=[];let ring=[],cmd='',i=0,cx=0,cy=0,startX=0,startY=0;
    const closeRing=()=>{if(ring.length>=3)rings.push(ring);ring=[]};
    while(i<tokens.length){
      const token=tokens[i];
      if(/^[A-Za-z]$/.test(token)){
        cmd=token;i++;
        if(cmd==='Z'||cmd==='z'){closeRing();cx=startX;cy=startY;cmd='';}
        continue;
      }
      if(!cmd){i++;continue;}
      const rel=cmd===cmd.toLowerCase(),upper=cmd.toUpperCase();
      if(upper==='M'||upper==='L'){
        if(i+1>=tokens.length)break;
        let x=Number(tokens[i]),y=Number(tokens[i+1]);i+=2;
        if(rel){x+=cx;y+=cy}
        if(upper==='M'){
          if(ring.length)closeRing();startX=x;startY=y;cmd=rel?'l':'L';
        }
        cx=x;cy=y;ring.push({x,y});
      }else if(upper==='H'){
        let x=Number(tokens[i++]);if(rel)x+=cx;cx=x;ring.push({x:cx,y:cy});
      }else if(upper==='V'){
        let y=Number(tokens[i++]);if(rel)y+=cy;cy=y;ring.push({x:cx,y:cy});
      }else{i++;}
    }
    if(ring.length)closeRing();
    pathCache.set(key,rings);
    return rings;
  }

  // Multiple subpaths (islands/holes) are combined by signed area, matching SVG's
  // geometric mass-center behavior for consistently oriented atlas rings.
  function pathCentroid(path){
    const rings=parseSvgPathRings(path);
    if(!rings.length)return{x:0,y:0};
    const metrics=rings.map(ringMetrics);
    let area=0,x=0,y=0;
    for(const m of metrics){area+=m.signedArea;x+=m.center.x*m.signedArea;y+=m.center.y*m.signedArea;}
    if(Math.abs(area)>=EPS)return{x:x/area,y:y/area};
    let absArea=0; x=0; y=0;
    for(const m of metrics){const a=Math.abs(m.signedArea);absArea+=a;x+=m.center.x*a;y+=m.center.y*a;}
    return absArea>=EPS?{x:x/absArea,y:y/absArea}:averagePoint(rings.flat());
  }

  function territoryCenter(indexOrTerritory){
    const world=global.SAMGUK_WORLD||global.WORLD;
    const index=Number.isInteger(Number(indexOrTerritory))?Number(indexOrTerritory):null;
    const territory=index!=null?world?.territories?.[index]:indexOrTerritory;
    if(!territory)return{x:0,y:0};
    if(index!=null&&territoryCache.has(index))return territoryCache.get(index);
    const center=territory.path?pathCentroid(territory.path):{x:finite(territory.x),y:finite(territory.y)};
    const frozen=Object.freeze({x:center.x,y:center.y});
    if(index!=null)territoryCache.set(index,frozen);
    return frozen;
  }

  function attachCenters(regions,territories){
    if(!Array.isArray(regions))return regions;
    const worldTerritories=territories||global.SAMGUK_WORLD?.territories||global.WORLD?.territories||[];
    for(let i=0;i<regions.length;i++){
      const t=worldTerritories[i];if(!regions[i]||!t)continue;
      const c=territoryCenter(Number.isInteger(i)?i:t);
      regions[i].center={x:c.x,y:c.y};
    }
    return regions;
  }

  // Canvas/Astra label renderer. Territory names are positioned at the polygon
  // centroid and can cancel camera zoom so text remains screen-space sharp.
  function canvasLabelZoom(options={}){
    const direct=Number(options.currentZoom);
    if(Number.isFinite(direct)&&direct>0)return direct;
    const globalZoom=Number(global.currentZoom);
    if(Number.isFinite(globalZoom)&&globalZoom>0)return globalZoom;
    return 1;
  }

  function renderRegionLabels(ctx,region,options={}){
    if(!ctx||!region)return;
    const center=region.center||polygonCentroid(region.vertices||region.points||[]);
    const centerX=finite(center?.x),centerY=finite(center?.y);
    const nameOffsetY=finite(options.nameOffsetY,0);
    const troopOffsetY=finite(options.troopOffsetY,26);
    const resourceOffsetY=finite(options.resourceOffsetY,50);
    const currentZoom=Math.max(EPS,canvasLabelZoom(options));
    const keepScreenSize=options.keepScreenSize!==false;
    ctx.save();
    ctx.translate(centerX,centerY);
    // Expected Canvas camera order: translate/pan -> scale(currentZoom) -> world draw.
    // Cancelling only currentZoom preserves DPR scaling while preventing blurred,
    // oversized text at deep zoom levels.
    if(keepScreenSize)ctx.scale(1/currentZoom,1/currentZoom);
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.lineJoin='round';
    ctx.miterLimit=2;
    ctx.font=options.nameFont||'600 16px "Noto Sans KR", "Malgun Gothic", sans-serif';
    ctx.fillStyle=options.nameColor||'#fff0d0';
    if(options.nameStroke!==false){
      ctx.lineWidth=finite(options.nameStrokeWidth,3);
      ctx.strokeStyle=options.nameStrokeColor||'#142a2c';
      ctx.strokeText(String(region.name||''),0,nameOffsetY);
    }
    ctx.fillText(String(region.name||''),0,nameOffsetY);
    if(region.army||region.troops!=null){
      if(typeof options.renderArmy==='function')options.renderArmy(ctx,region.army||region,0,troopOffsetY);
      else{
        ctx.font=options.troopFont||'700 13px "Noto Sans KR", "Malgun Gothic", sans-serif';
        ctx.fillStyle=options.troopColor||'#fff5d6';
        const prefix=region.army?.factionShortName||region.factionShortName||'';
        const count=region.army?.units??region.troops??'';
        ctx.fillText(`${prefix}${prefix?' ':''}${count}`,0,troopOffsetY);
      }
    }
    if(region.resource&&typeof options.renderResource==='function')options.renderResource(ctx,region.resource,0,resourceOffsetY);
    ctx.restore();
  }

  function clearCache(){pathCache.clear();territoryCache.clear();}

  global.SAMGUK_REGION_GEOMETRY=Object.freeze({
    version:1,
    averagePoint,
    polygonCentroid,
    parseSvgPathRings,
    pathCentroid,
    territoryCenter,
    attachCenters,
    canvasLabelZoom,
    renderRegionLabels,
    clearCache
  });
  global.renderRegionLabels=renderRegionLabels;
})(window);
