(function(global){
  'use strict';

  const ASSETS=Object.freeze({
    normal:Object.freeze({key:'normal',label:'일반 영토',src:null,kind:'normal'}),
    capital:Object.freeze({key:'capital',label:'수도',src:'capital_lv1.png',kind:'capital'}),
    agriculture:Object.freeze({key:'agriculture',label:'농업도시',src:'city_agriculture.png',kind:'specialized'}),
    commerce:Object.freeze({key:'commerce',label:'상업도시',src:'city_commerce.png',kind:'specialized'}),
    military:Object.freeze({key:'military',label:'군사도시',src:'city_military.png',kind:'specialized'}),
    port:Object.freeze({key:'port',label:'항구도시',src:'city_port.png',kind:'specialized'})
  });

  const EARTH_WALL_ASSETS=Object.freeze({
    1:Object.freeze({key:'earthWall',label:'토성 Lv.1',src:'assets/images/earth_wall_lv1.png',kind:'specialized'}),
    2:Object.freeze({key:'earthWall',label:'토성 Lv.2',src:'assets/images/earth_wall_lv1.png',kind:'specialized'}),
    3:Object.freeze({key:'earthWall',label:'토성 Lv.3',src:'assets/images/earth_wall_lv3.png',kind:'specialized'})
  });

  const runtime={
    getRegions:()=>[],
    isActive:()=>false,
    isCapital:()=>false,
    getCityType:()=> 'normal',
    getCityLevel:()=>0,
    getCapitalLevel:()=>1,
    getMaxLevel:()=>3
  };
  const preloadCache=new Map();
  const assetHealth=new Map();

  function configureRuntime(api={}){
    for(const key of Object.keys(runtime))if(typeof api[key]==='function')runtime[key]=api[key];
    return manager;
  }

  function maxLevel(){
    const n=Number(runtime.getMaxLevel?.());
    return Number.isFinite(n)&&n>0?Math.floor(n):3;
  }

  function normalizeType(type){return ASSETS[type]?type:'normal'}

  function getTerritoryState(territoryId){
    const id=Number(territoryId),regions=runtime.getRegions?.()||[];
    if(!Number.isInteger(id)||id<0||!regions[id]||!runtime.isActive?.(id))return null;
    const type=normalizeType(runtime.getCityType?.(id));
    const level=Math.max(0,Number(runtime.getCityLevel?.(id))||0);
    const max=maxLevel();
    const capital=!!runtime.isCapital?.(id);
    const capitalLevel=capital?Math.max(1,Math.min(5,Math.floor(Number(runtime.getCapitalLevel?.(id))||1))):0;
    // v63: capitals are a separate global tech tree and never borrow a specialized-city asset.
    const specialized=!capital&&type!=='normal'&&level>=1;
    const completed=specialized&&level>=max;
    const capAsset=capital?global.SAMGUK_CAPITAL_UPGRADE?.assetForLevel?.(capitalLevel):null;

    // v119: 토성은 기존 전문도시와 동일한 월드맵 도시 오브젝트 파이프라인을 공유한다.
    // 전문도시 + 토성이 동시에 존재할 경우, 방어시설인 토성 비주얼을 지도 중앙의 대표 오브젝트로 우선 표시한다.
    // 데이터/효과는 기존 cityType/cityLevel을 그대로 유지하므로 전문도시 시스템에는 영향을 주지 않는다.
    const earthRaw=regions[id]?.buildings?.earthWall;
    const earthLevel=Math.max(0,Math.min(3,Math.floor(Number(earthRaw&&typeof earthRaw==='object'?earthRaw.level:earthRaw)||0)));
    const hasEarthWall=!capital&&earthLevel>=1;
    const earthAsset=hasEarthWall?EARTH_WALL_ASSETS[earthLevel]:null;
    const normalAssetKey=capital?'capital':(specialized?type:null);
    const normalAsset=capital&&capAsset?Object.freeze({key:'capital',label:`수도 Lv.${capitalLevel}`,src:capAsset.src,kind:'capital',capitalTier:capAsset.key,baseWidth:capAsset.baseWidth,baseHeight:capAsset.baseHeight}):(normalAssetKey?ASSETS[normalAssetKey]:null);
    const assetKey=hasEarthWall?'earthWall':normalAssetKey;
    const asset=hasEarthWall?earthAsset:normalAsset;
    const fallbackAsset=hasEarthWall?(normalAsset||ASSETS.capital):(capital?ASSETS.capital:null);
    return {territoryId:id,type,level,maxLevel:max,capital,capitalLevel,specialized,completed,earthWallLevel:earthLevel,hasEarthWall,assetKey,asset,fallbackAsset};
  }

  function getTerritoryAssetMap(){
    const regions=runtime.getRegions?.()||[],out={};
    for(let i=0;i<regions.length;i++){
      const state=getTerritoryState(i);if(!state)continue;
      out[i]={
        territoryId:i,
        cityType:state.type,
        cityLevel:state.level,
        maxLevel:state.maxLevel,
        isCapital:state.capital,
        capitalLevel:state.capitalLevel,
        specialized:state.specialized,
        completed:state.completed,
        assetKey:state.assetKey,
        assetPath:state.asset?.src||null,
        fallbackPath:state.fallbackAsset?.src||null
      };
    }
    return out;
  }

  function preload(src){
    if(!src)return Promise.resolve(null);
    if(preloadCache.has(src))return preloadCache.get(src);
    const p=new Promise(resolve=>{
      const img=new Image();
      img.decoding='async';
      try{img.fetchPriority='low'}catch(_){ }
      img.onload=async()=>{
        try{if(img.decode)await img.decode()}catch(_){ }
        assetHealth.set(src,true);
        resolve(img);
      };
      img.onerror=()=>{
        assetHealth.set(src,false);
        console.warn('[삼국쟁패][CityAsset] preload failed:',src);
        resolve(null);
      };
      img.src=src;
    });
    preloadCache.set(src,p);
    return p;
  }

  function preloadAll(){
    return Promise.all([global.SAMGUK_CAPITAL_UPGRADE?.preloadAll?.(),...Object.values(ASSETS).filter(x=>x.src&&x.kind!=='capital').map(x=>preload(x.src)),...Object.values(EARTH_WALL_ASSETS).map(x=>preload(x.src))]);
  }

  function isAssetKnownBroken(src){return src?assetHealth.get(src)===false:false}

  const manager={
    version:2,
    assets:ASSETS,
    earthWallAssets:EARTH_WALL_ASSETS,
    configureRuntime,
    maxLevel,
    getTerritoryState,
    getTerritoryAssetMap,
    preload,
    preloadAll,
    isAssetKnownBroken
  };

  global.SAMGUK_CITY_TECH_TREE=manager;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>preloadAll(),{once:true});
  else preloadAll();
})(window);
