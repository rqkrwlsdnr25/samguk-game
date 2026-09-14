(function(global){
  'use strict';

  const CFG=Object.freeze({
    durationOut:.18,
    durationIn:.24,
    shiftPx:12,
    easeOut:'power2.in',
    easeIn:'power3.out'
  });

  function root(){return document.getElementById('mapViewport')}
  function gsapApi(){return global.gsap&&typeof global.gsap.to==='function'?global.gsap:null}

  function setVars(el,opacity,shift){
    if(!el)return;
    el.style.setProperty('--troop-badge-opacity',String(opacity));
    el.style.setProperty('--troop-badge-shift',`${shift}px`);
  }

  function kill(){
    const el=root(),g=gsapApi();
    if(el&&g)g.killTweensOf(el);
  }

  function hide({immediate=false,onComplete=null}={}){
    const el=root();if(!el)return false;
    kill();
    el.classList.remove('faction-hud-badge-hidden');
    el.classList.add('faction-hud-compact');
    el.dataset.factionHudMode='compact';

    const done=()=>{
      if(el.dataset.factionHudMode!=='compact')return;
      el.classList.add('faction-hud-badge-hidden');
      setVars(el,0,CFG.shiftPx);
      if(typeof onComplete==='function')onComplete();
    };

    if(immediate){setVars(el,0,CFG.shiftPx);done();return true}
    const g=gsapApi();
    if(g){
      g.to(el,{duration:CFG.durationOut,'--troop-badge-opacity':0,'--troop-badge-shift':`${CFG.shiftPx}px`,ease:CFG.easeOut,overwrite:true,onUpdate:()=>global.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('hud-fade-out'),onComplete:done});
    }else{
      // Safe fallback when CDN access is unavailable. The game remains functional;
      // GSAP is used automatically whenever the bundled page can load it.
      setVars(el,0,CFG.shiftPx);global.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('hud-hide-fallback');
      global.setTimeout(done,Math.round(CFG.durationOut*1000));
    }
    return true;
  }

  function show({immediate=false,onComplete=null}={}){
    const el=root();if(!el)return false;
    kill();
    el.dataset.factionHudMode='full';
    el.classList.remove('faction-hud-badge-hidden','faction-hud-compact');

    // Hidden troop text may have intentionally skipped backend updates while
    // compact. Synchronize it once before making glyphs visible again.
    global.SAMGUK_FACTION_TROOP_HUD?.updateAllTerritories?.({forceCount:true});

    const done=()=>{
      if(el.dataset.factionHudMode!=='full')return;
      setVars(el,1,0);
      if(typeof onComplete==='function')onComplete();
    };

    if(immediate){setVars(el,1,0);done();return true}
    setVars(el,0,CFG.shiftPx);
    const g=gsapApi();
    if(g){
      g.to(el,{duration:CFG.durationIn,'--troop-badge-opacity':1,'--troop-badge-shift':'0px',ease:CFG.easeIn,overwrite:true,onUpdate:()=>global.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('hud-fade-in'),onComplete:done});
    }else{
      // Fallback uses the CSS transition already declared on the SVG subgroup.
      requestAnimationFrame(()=>{setVars(el,1,0);global.SAMGUK_FACTION_LABEL_SPRITE?.scheduleDraw?.('hud-show-fallback')});
      global.setTimeout(done,Math.round(CFG.durationIn*1000));
    }
    return true;
  }

  global.SAMGUK_FACTION_HUD_TRANSITIONS=Object.freeze({config:CFG,hide,show,kill});
})(window);
