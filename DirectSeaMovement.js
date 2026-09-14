'use strict';
(function(global){
  const world=global.SAMGUK_WORLD;
  if(!world||!Array.isArray(world.territories)||!Array.isArray(world.neighbors))return;

  // v65: SeaNode 없이 육지 영토 ↔ 육지 영토를 직접 연결한다.
  // 한성 연결은 기존 v64에도 있었지만, 명시적으로 유지/검증한다.
  const ROUTE_NAMES=Object.freeze([
    Object.freeze(['산둥반도','한성']),
    Object.freeze(['산둥반도','웅진 서부']),
    Object.freeze(['산둥반도','탕정성'])
  ]);

  const idByName=new Map(world.territories.map((t,i)=>[String(t?.name||''),i]));
  const routeKey=(a,b)=>[Number(a),Number(b)].sort((x,y)=>x-y).join('-');
  const installedIds=[];

  function addNeighbor(a,b){
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b)return false;
    const an=world.neighbors[a],bn=world.neighbors[b];
    if(!Array.isArray(an)||!Array.isArray(bn))return false;
    if(!an.includes(b))an.push(b);
    if(!bn.includes(a))bn.push(a);
    an.sort((x,y)=>x-y);bn.sort((x,y)=>x-y);
    return true;
  }

  function addSeaRoute(a,b){
    if(!Array.isArray(world.seaRoutes))world.seaRoutes=[];
    const key=routeKey(a,b);
    const exists=world.seaRoutes.some(pair=>Array.isArray(pair)&&pair.length>=2&&routeKey(pair[0],pair[1])===key);
    if(!exists)world.seaRoutes.push([Math.min(a,b),Math.max(a,b)]);
    return addNeighbor(a,b);
  }

  for(const [fromName,toName] of ROUTE_NAMES){
    const a=idByName.get(fromName),b=idByName.get(toName);
    if(Number.isInteger(a)&&Number.isInteger(b)&&addSeaRoute(a,b))installedIds.push(Object.freeze([a,b]));
  }

  const directKeys=new Set(installedIds.map(([a,b])=>routeKey(a,b)));
  const centerOf=region=>{
    const c=region?.center;
    const x=Number(c?.x ?? region?.x),y=Number(c?.y ?? region?.y);
    return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
  };

  function curveFor(fromRegion,toRegion){
    const a=centerOf(fromRegion),b=centerOf(toRegion);if(!a||!b)return null;
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    const bend=Math.min(34,len*.12);
    return {a,b,c:{x:(a.x+b.x)/2-dy/len*bend,y:(a.y+b.y)/2+dx/len*bend}};
  }

  function quadraticPoint(curve,t){
    const u=1-t;
    return {x:u*u*curve.a.x+2*u*t*curve.c.x+t*t*curve.b.x,y:u*u*curve.a.y+2*u*t*curve.c.y+t*t*curve.b.y};
  }

  /**
   * Canvas fallback/API: 실제 이동 명령/이동 중에만 호출한다.
   * progress 0..1까지의 항로 구간만 그리므로 별도 SeaNode/상시 루트는 만들지 않는다.
   */
  function drawActiveSeaMovementPath(ctx,fromRegion,toRegion,progress=1,currentZoom=1){
    if(!ctx)return null;const curve=curveFor(fromRegion,toRegion);if(!curve)return null;
    const p=Math.max(0,Math.min(1,Number(progress)||0));
    const zoom=Math.max(.05,Number(currentZoom)||1);
    const steps=Math.max(2,Math.ceil(24*p));
    ctx.save();
    ctx.lineWidth=1.4/zoom;
    ctx.strokeStyle='rgba(248,251,255,.82)';
    ctx.setLineDash([6/zoom,6/zoom]);
    ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(curve.a.x,curve.a.y);
    for(let i=1;i<=steps;i++){const t=p*i/steps,q=quadraticPoint(curve,t);ctx.lineTo(q.x,q.y)}
    ctx.stroke();ctx.restore();
    return quadraticPoint(curve,p);
  }

  // Canvas 사용 시 수송선 이미지는 딱 한 번만 메모리에 올린다.
  const transportShipImage=new Image();
  transportShipImage.decoding='async';
  transportShipImage.src='transport_ship.svg';

  function drawTransportUnit(ctx,x,y,count,currentZoom=1){
    if(!ctx||!transportShipImage.complete)return false;
    const zoom=Math.max(.05,Number(currentZoom)||1),size=34/zoom;
    ctx.save();
    ctx.drawImage(transportShipImage,x-size/2,y-size*.42,size,size*.75);
    if(Number.isFinite(Number(count))){
      ctx.font=`700 ${Math.max(8,11/zoom)}px system-ui,sans-serif`;
      ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#fff7df';
      ctx.strokeStyle='rgba(8,20,28,.9)';ctx.lineWidth=2/zoom;
      const ty=y+size*.34;ctx.strokeText(String(count),x,ty);ctx.fillText(String(count),x,ty);
    }
    ctx.restore();return true;
  }

  global.drawActiveSeaMovementPath=drawActiveSeaMovementPath;
  global.SAMGUK_DIRECT_SEA_MOVEMENT=Object.freeze({
    routeNames:ROUTE_NAMES,
    installedIds:Object.freeze(installedIds.slice()),
    isDirectSeaConnection:(a,b)=>directKeys.has(routeKey(a,b)),
    drawActiveSeaMovementPath,
    drawTransportUnit,
    transportShipImage
  });
})(window);
