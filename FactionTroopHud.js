(function(global){
  'use strict';

  const CFG=Object.freeze({
    width:74,
    height:24,
    flagWidth:22,
    barLeft:-17,
    barRight:37,
    fontSize:11.5,
    symbolSize:12.5,
    compactScale:.72,
    normalScale:.92,
    armyScale:.92
  });

  const runtime={
    getTerritory:()=>null,
    getFaction:()=>null
  };

  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function configureRuntime(api={}){
    if(typeof api.getTerritory==='function')runtime.getTerritory=api.getTerritory;
    if(typeof api.getFaction==='function')runtime.getFaction=api.getFaction;
    return controller;
  }

  function normalizeFaction(faction={}){
    const name=String(faction.name||'세력');
    return {
      name,
      color:String(faction.color||'#385f8d'),
      symbol:String(faction.symbol||name[0]||'?').slice(0,1)
    };
  }

  function formatTroops(value){
    const n=Math.max(0,Math.round(finite(value,0)));
    if(n>=1000000)return `${(n/1000000).toFixed(n>=10000000?0:1)}M`;
    if(n>=100000)return `${Math.round(n/1000)}k`;
    return String(n);
  }

  function useSpriteForFaction(faction){
    const sprite=global.SAMGUK_FACTION_LABEL_SPRITE;
    return !!(sprite&&!sprite.isFailed?.()&&sprite.hasFaction?.(faction));
  }

  /** Legacy vector HUD is retained only as a compatibility fallback for faction
   * badges not present in the supplied 11-cell sprite sheet and for moving-army
   * standards.  Supported territory badges are NOT constructed as SVG paths. */
  function coreMarkup({faction,troops,kind='territory',territoryId=null,unitId=null}={}){
    const f=normalizeFaction(faction),count=formatTroops(troops);
    const key=territoryId!=null?` data-territory-hud-id="${Number(territoryId)}"`:unitId!=null?` data-unit-hud-id="${esc(unitId)}"`:'';
    const title=`${f.name} · 병력 ${count}`;
    return `<g class="faction-troop-hud faction-troop-hud-${kind}"${key} data-faction-hud="1" aria-label="${esc(title)}">
      <title>${esc(title)}</title>
      <g class="faction-troop-hud-visual">
        <g class="faction-troop-number-badge" data-troop-badge="1">
          <path class="faction-troop-bar" d="M-17-9H28Q37-9 37 0Q37 9 28 9H-17Z"/>
          <path class="faction-troop-bar-edge" d="M-17-9H28Q37-9 37 0Q37 9 28 9H-17"/>
          <text class="faction-troop-count" data-troop-count="1" x="10" y="1">${esc(count)}</text>
        </g>
        <g class="faction-troop-flag-group">
          <path class="faction-troop-flag" data-faction-fill="1" d="M-37-11H-15V5L-26 11L-37 5Z" fill="${esc(f.color)}"/>
          <path class="faction-troop-flag-highlight" d="M-35-9H-17V3L-26 8.5L-35 3Z"/>
          <text class="faction-troop-symbol" data-faction-symbol="1" x="-26" y="1">${esc(f.symbol)}</text>
        </g>
      </g>
    </g>`;
  }

  function positionedMarkup({faction,troops,x=0,y=0,scale=1,kind='territory',territoryId=null,unitId=null}={}){
    const sx=clamp(finite(scale,1),.35,2.5),px=finite(x,0),py=finite(y,0);
    return `<g class="faction-troop-hud-position" transform="translate(${px.toFixed(2)} ${py.toFixed(2)}) scale(${sx.toFixed(4)})">${coreMarkup({faction,troops,kind,territoryId,unitId})}</g>`;
  }

  function territoryMarkup(territoryId,{faction,troops,x=0,y=0,compact=false,scale=null}={}){
    // v58: supplied sheet factions are rendered by one canvas + one Image.
    if(useSpriteForFaction(faction)){
      global.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('territory-markup');
      return '';
    }
    return positionedMarkup({
      faction,troops,x,y,
      scale:scale==null?(compact?CFG.compactScale:CFG.normalScale):scale,
      kind:'territory',territoryId
    });
  }

  function armyMarkup({faction,troops,x=0,y=0,scale=CFG.armyScale,unitId=null}={}){
    // Moving standards live inside the animated SVG march layer, so they keep
    // the legacy tiny component.  Static map territory HUDs use the sprite canvas.
    return positionedMarkup({faction,troops,x,y,scale,kind:'army',unitId});
  }

  function isCompactMode(){
    return !!document.getElementById('mapViewport')?.classList.contains('faction-hud-badge-hidden');
  }

  function updateTerritory(territoryId,{forceCount=false}={}){
    const id=Number(territoryId),territory=runtime.getTerritory(id);
    if(!territory)return false;
    const faction=runtime.getFaction(Number(territory.owner));
    if(!faction)return false;

    if(useSpriteForFaction(faction)){
      global.SAMGUK_FACTION_LABEL_SPRITE?.invalidateTerritory?.(id);
      return true;
    }

    const root=document.querySelector(`[data-territory-hud-id="${id}"]`);
    if(!root)return false;
    const normalized=normalizeFaction(faction);
    const count=root.querySelector('[data-troop-count]');
    const symbol=root.querySelector('[data-faction-symbol]');
    const fill=root.querySelector('[data-faction-fill]');

    if(count&&(!isCompactMode()||forceCount))count.textContent=formatTroops(territory.troops);
    if(symbol)symbol.textContent=normalized.symbol;
    if(fill)fill.setAttribute('fill',normalized.color);
    root.setAttribute('aria-label',`${normalized.name} · 병력 ${formatTroops(territory.troops)}`);
    return true;
  }

  function updateAllTerritories(options={}){
    // One canvas redraw covers every supported faction in a single frame.
    global.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('all-territories');
    document.querySelectorAll('[data-territory-hud-id]').forEach(el=>updateTerritory(Number(el.getAttribute('data-territory-hud-id')),options));
  }

  const controller={
    version:3,
    config:CFG,
    configureRuntime,
    formatTroops,
    coreMarkup,
    positionedMarkup,
    territoryMarkup,
    armyMarkup,
    updateTerritory,
    updateAllTerritories,
    isCompactMode,
    useSpriteForFaction
  };

  global.SAMGUK_FACTION_TROOP_HUD=controller;
})(window);
