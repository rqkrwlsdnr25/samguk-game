(function(global){
  'use strict';

  const MAX_LEVEL=5;
  const COSTS=Object.freeze({2:180,3:320,4:520,5:800});
  const ASSETS=Object.freeze({
    lv1:Object.freeze({key:'lv1',src:'capital_lv1.png',label:'기본 수도',minLevel:1,maxLevel:2,baseWidth:40,baseHeight:40}),
    lv3:Object.freeze({key:'lv3',src:'capital_lv3.png',label:'확장 수도',minLevel:3,maxLevel:4,baseWidth:58,baseHeight:58}),
    lv5:Object.freeze({key:'lv5',src:'capital_lv5.png',label:'황궁 대도시',minLevel:5,maxLevel:5,baseWidth:84,baseHeight:48})
  });
  const cache=new Map();
  const images=new Map();
  const runtime={
    getRegions:()=>[],
    isCapital:()=>false,
    getGold:()=>0,
    getActionPoints:()=>0
  };
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const normalizeLevel=level=>Math.max(1,Math.min(MAX_LEVEL,Math.floor(Number(level)||1)));

  function configureRuntime(api={}){
    for(const k of Object.keys(runtime))if(typeof api[k]==='function')runtime[k]=api[k];
    return apiObject;
  }
  function tierForLevel(level){level=normalizeLevel(level);return level>=5?'lv5':level>=3?'lv3':'lv1'}
  function assetForLevel(level){return ASSETS[tierForLevel(level)]}
  function baseDimensionsForLevel(level){const a=assetForLevel(level);return {width:a.baseWidth,height:a.baseHeight,tier:a.key}}
  function multiplierForLevel(level){return Math.pow(1.3,Math.max(0,normalizeLevel(level)-1))}
  function actionBonusForLevel(level){return Math.max(0,normalizeLevel(level)-1)}
  function costForLevel(nextLevel){return COSTS[normalizeLevel(nextLevel)]||0}
  function preload(src){
    if(!src)return Promise.resolve(null);
    if(cache.has(src))return cache.get(src);
    const img=new Image();
    images.set(src,img);
    const promise=new Promise(resolve=>{
      img.decoding='async';
      img.onload=async()=>{try{if(img.decode)await img.decode()}catch(_e){}resolve(img)};
      img.onerror=()=>{console.warn('[삼국쟁패][Capital] asset load failed:',src);resolve(null)};
      img.src=src;
    });
    cache.set(src,promise);
    return promise;
  }
  function preloadAll(){return Promise.all(Object.values(ASSETS).map(a=>preload(a.src)))}
  async function imageForLevel(level){return preload(assetForLevel(level).src)}

  function drawCapitalCity(ctx,x,y,level,currentZoom){
    if(!ctx)return false;
    const a=assetForLevel(level),img=images.get(a.src);
    const zoomCfg=global.SAMGUK_MAP_ZOOM_CONFIG||{};
    const scale=clamp(currentZoom,Number(zoomCfg.cityIconMinScale)||.55,Number(zoomCfg.cityIconMaxScale)||2.2);
    const draw=img=>{
      if(!img)return false;
      const w=a.baseWidth*scale,h=a.baseHeight*scale;
      ctx.save();
      ctx.drawImage(img,Number(x)-w/2,Number(y)-h/2,w,h);
      ctx.restore();
      return true;
    };
    if(img?.complete&&img.naturalWidth>0)return draw(img);
    preload(a.src);return false;
  }

  function renderUpgradePanel({territoryName='수도',level=1,gold=0,actionPoints=0}={}){
    level=normalizeLevel(level);
    const mult=multiplierForLevel(level),maxed=level>=MAX_LEVEL,next=Math.min(MAX_LEVEL,level+1),nextMult=maxed?mult:multiplierForLevel(next),cost=maxed?0:costForLevel(next);
    const disabled=maxed||Number(gold)<cost||Number(actionPoints)<1;
    return `<section class="capital-upgrade-panel" aria-label="수도 증축">
      <div class="capital-upgrade-head"><span>🏯 수도증축</span><b>${territoryName}</b></div>
      <div class="capital-level-row"><strong>Level ${level}/${MAX_LEVEL}</strong><span>국가 모집·수입 ×${mult.toFixed(2)}</span></div>
      <div class="capital-level-track">${Array.from({length:MAX_LEVEL},(_,i)=>`<i class="${i<level?'on':''}"></i>`).join('')}</div>
      ${maxed?`<div class="capital-max">MAX · 천도급 황궁 도시 완성</div>`:`<div class="capital-upgrade-next">
        <b>다음 단계 Level ${next}</b>
        <p>영구 효과 · 최대 행동력 +1<br>국가 전체 모집량/세금 수입: ×${mult.toFixed(2)} → ×${nextMult.toFixed(2)} <small>(이전 단계 대비 +30%)</small></p>
        <p class="capital-cost">비용 ${cost}금 · 행동 1</p>
        <button class="action capital-upgrade-button" data-capital-upgrade="1" ${disabled?'disabled':''}>수도 Level ${next}로 증축</button>
      </div>`}
    </section>`;
  }

  const apiObject=Object.freeze({
    version:1,MAX_LEVEL,COSTS,ASSETS,configureRuntime,tierForLevel,assetForLevel,baseDimensionsForLevel,
    multiplierForLevel,actionBonusForLevel,costForLevel,preload,preloadAll,imageForLevel,drawCapitalCity,renderUpgradePanel
  });
  global.SAMGUK_CAPITAL_UPGRADE=apiObject;
  global.drawCapitalCity=drawCapitalCity;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',preloadAll,{once:true});else preloadAll();
})(window);
