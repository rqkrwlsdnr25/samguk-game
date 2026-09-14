'use strict';
/*
 * 삼국쟁패 v83 - 첩보/계략 공통 타겟 도시 선택 / Canvas Spotlight / Confirm / 공통 VFX
 * --------------------------------------------------------------------------
 * 목적
 * 1) 첩보/계략 UI의 모든 행동 버튼을 '지도에서 대상 도시 선택' 흐름으로 통일
 * 2) 선택 모드 중 전체 맵 암전 + 선택 영토만 destination-out 마스크로 밝게 노출
 * 3) 도시 클릭 -> DOM confirm modal -> 기존 executeEspionageAction 로직 호출
 * 4) 성공 시 모든 첩보 행동이 동일한 requestAnimationFrame 기반 레이더/빛의 펄스 VFX 재생
 * 5) 기존 전투/AI/저장/첩보 확률 계산은 건드리지 않는다. 이 모듈은 UI 흐름만 확장한다.
 */
(() => {
  const NS = 'SAMGUK_ESPIONAGE_TARGETING';
  if (window[NS]?.version >= 2) return;

  // 독립 테스트용 예시 구조. 실제 게임에서는 regions / SVG territory polygon을 사용한다.
  const CITY_EXAMPLE = Object.freeze([
    { id: 1, name: '타겟도시', x: 300, y: 250, radius: 50 }
  ]);

  const state = {
    active: false,
    phase: 'idle', // idle | select | confirm | vfx
    sourceId: null,
    officerId: null,
    actionType: null,
    candidateIds: new Set(),
    hoverId: null,
    selectedId: null,
    enterAt: 0,
    canvas: null,
    ctx: null,
    hud: null,
    modal: null,
    raf: 0,
    vfx: null,
    reducedMotion: false,
    pointerDown: null,
    dragDistance: 0,
    resizeObserver: null
  };

  const now = () => performance.now();
  const viewport = () => document.getElementById('mapViewport');

  function getRegion(id) {
    try { return regions?.[Number(id)] || null; } catch (_) { return null; }
  }

  function getRegionName(id) {
    return getRegion(id)?.name || `도시 ${id}`;
  }

  function getActionDef(actionType) {
    try { return ESPIONAGE_ACTIONS?.[actionType] || null; } catch (_) { return null; }
  }

  function getActionName(actionType) {
    return getActionDef(actionType)?.name || '첩보';
  }

  function isSelfTargetAction(actionType) {
    return actionType === 'counterIntel';
  }

  function getCandidateIds(sourceId, actionType) {
    sourceId = Number(sourceId);
    if (isSelfTargetAction(actionType)) return [sourceId];

    try {
      if (typeof adjacentEspionageTargets === 'function') {
        return adjacentEspionageTargets(sourceId).map(Number);
      }
    } catch (_) {}

    // 안전 폴백: 실제 인접 그래프와 공격 가능 조건을 직접 검사한다.
    try {
      const list = Array.isArray(neighbors?.[sourceId]) ? neighbors[sourceId] : [];
      const own = getRegion(sourceId)?.owner;
      return list.filter(id => {
        const r = getRegion(id);
        if (!r || r.owner === own) return false;
        if (typeof isActiveTerritory === 'function' && !isActiveTerritory(id)) return false;
        if (typeof canAttack === 'function' && !canAttack(own, r.owner)) return false;
        return true;
      }).map(Number);
    } catch (_) { return []; }
  }

  function getActionChance(sourceId, targetId, actionType) {
    try {
      const officer = typeof espionageOfficer === 'function' ? espionageOfficer(sourceId) : null;
      if (officer && typeof espionageChance === 'function') {
        return Math.round(espionageChance(officer, targetId, actionType) * 100);
      }
    } catch (_) {}
    return null;
  }

  function ensureDOM() {
    const vp = viewport();
    if (!vp) return false;

    if (!state.canvas) {
      const c = document.createElement('canvas');
      c.id = 'scoutReconCanvas';
      c.className = 'scout-recon-canvas';
      c.setAttribute('aria-hidden', 'true');
      vp.appendChild(c);
      state.canvas = c;
      state.ctx = c.getContext('2d', { alpha: true, desynchronized: true });
    }

    if (!state.hud) {
      const hud = document.createElement('div');
      hud.id = 'scoutReconHud';
      hud.className = 'scout-recon-hud';
      hud.innerHTML = `
        <div class="scout-recon-hud-copy">
          <strong data-scout-hud-title>👁 대상 도시 선택</strong>
          <span data-scout-hud-note>대상 도시 위에 마우스를 올린 뒤 클릭하세요.</span>
        </div>
        <button type="button" data-scout-cancel>취소</button>`;
      vp.appendChild(hud);
      state.hud = hud;
    }

    if (!state.modal) {
      const d = document.createElement('dialog');
      d.id = 'scoutReconConfirm';
      d.className = 'scout-recon-confirm';
      d.innerHTML = `<div class="scout-recon-confirm-inner" data-scout-confirm-content></div>`;
      document.body.appendChild(d);
      state.modal = d;

      d.addEventListener('click', e => {
        const cancel = e.target.closest('[data-scout-confirm-cancel]');
        if (cancel) {
          e.preventDefault();
          cancelTargetMode({ reopenEspionage: true });
          return;
        }
        const execute = e.target.closest('[data-scout-confirm-execute]');
        if (execute) {
          e.preventDefault();
          executeSelectedAction();
        }
      });
      d.addEventListener('cancel', e => {
        e.preventDefault();
        cancelTargetMode({ reopenEspionage: true });
      });
    }

    if (!state.resizeObserver && 'ResizeObserver' in window) {
      state.resizeObserver = new ResizeObserver(() => {
        if (state.active) resizeCanvas();
      });
      state.resizeObserver.observe(vp);
    }
    return true;
  }

  function resizeCanvas() {
    if (!state.canvas) return;
    const rect = viewport()?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const dpr = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (state.canvas.width !== w || state.canvas.height !== h) {
      state.canvas.width = w;
      state.canvas.height = h;
    }
  }

  function territoryNode(id) {
    return document.querySelector(`#map .territory-shape[data-id="${Number(id)}"]`);
  }

  function territoryPath(id) {
    return territoryNode(id)?.querySelector(':scope > path') || null;
  }

  function clearTerritoryClasses() {
    document.querySelectorAll('#map .scout-target-candidate,#map .scout-spotlight-territory')
      .forEach(el => el.classList.remove('scout-target-candidate', 'scout-spotlight-territory'));
  }

  function applyCandidateClasses() {
    clearTerritoryClasses();
    if (!state.active) return;
    state.candidateIds.forEach(id => territoryNode(id)?.classList.add('scout-target-candidate'));
    const focus = state.selectedId ?? state.hoverId;
    if (Number.isInteger(focus)) territoryNode(focus)?.classList.add('scout-spotlight-territory');
  }

  function screenGeometryForTerritory(id) {
    const path = territoryPath(id);
    const vp = viewport();
    if (!path || !vp) return null;
    const vpRect = vp.getBoundingClientRect();
    const r = path.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      x: r.left - vpRect.left + r.width / 2,
      y: r.top - vpRect.top + r.height / 2,
      radius: Math.max(26, Math.min(96, Math.max(r.width, r.height) * 0.62)),
      rect: r,
      vpRect,
      path
    };
  }

  // 실제 SVG territory path를 Canvas 좌표로 변환해 검은 마스크에 '구멍'을 낸다.
  // SVG path를 얻지 못하는 환경에서는 원형 스포트라이트로 안전 폴백한다.
  function cutTerritoryFromMask(ctx, id, dpr) {
    const geo = screenGeometryForTerritory(id);
    if (!geo) return false;
    const { path, vpRect } = geo;
    try {
      const d = path.getAttribute('d');
      const ctm = path.getScreenCTM();
      if (!d || !ctm || typeof Path2D !== 'function') throw new Error('Path2D unavailable');
      const p = new Path2D(d);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.setTransform(
        dpr * ctm.a, dpr * ctm.b,
        dpr * ctm.c, dpr * ctm.d,
        dpr * (ctm.e - vpRect.left), dpr * (ctm.f - vpRect.top)
      );
      ctx.fillStyle = '#000';
      ctx.fill(p);
      ctx.restore();
      return true;
    } catch (_) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createRadialGradient(geo.x, geo.y, geo.radius * .64, geo.x, geo.y, geo.radius);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(.78, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(geo.x, geo.y, geo.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    }
  }

  function drawAmbientGlow(ctx, id, dpr, intensity = 1) {
    const geo = screenGeometryForTerritory(id);
    if (!geo) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const radius = geo.radius * (1.15 + Math.sin(now() * .004) * .05);
    const g = ctx.createRadialGradient(geo.x, geo.y, radius * .18, geo.x, geo.y, radius * 1.35);
    g.addColorStop(0, `rgba(255,224,135,${.18 * intensity})`);
    g.addColorStop(.5, `rgba(94,214,220,${.07 * intensity})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(geo.x, geo.y, radius * 1.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 모든 첩보 성공 시 공통으로 쓰는 레이더/빛의 펄스 고리 VFX.
  class EspionagePulseVFX {
    constructor(targetId, duration = 1280) {
      this.targetId = Number(targetId);
      this.duration = state.reducedMotion ? 260 : duration;
      this.startedAt = now();
      this.done = false;
    }
    draw(ctx, dpr, tNow) {
      const geo = screenGeometryForTerritory(this.targetId);
      if (!geo) return false;
      const t = Math.min(1, (tNow - this.startedAt) / this.duration);
      if (t >= 1) this.done = true;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const flash = Math.max(0, 1 - t * 2.1);
      if (flash > 0) {
        const glow = ctx.createRadialGradient(geo.x, geo.y, 0, geo.x, geo.y, geo.radius * (1.25 + t));
        glow.addColorStop(0, `rgba(255,241,181,${.52 * flash})`);
        glow.addColorStop(.45, `rgba(88,221,225,${.24 * flash})`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(geo.x, geo.y, geo.radius * (1.25 + t), 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < 3; i++) {
        const local = (t * 1.38 - i * .22);
        if (local < 0 || local > 1) continue;
        const eased = 1 - Math.pow(1 - local, 3);
        const radius = geo.radius * (.38 + eased * 2.15);
        const alpha = (1 - local) * (.78 - i * .13);
        ctx.strokeStyle = i === 0
          ? `rgba(255,224,126,${alpha})`
          : `rgba(93,226,230,${alpha * .86})`;
        ctx.lineWidth = Math.max(1.5, 3.2 - local * 1.5);
        ctx.beginPath();
        ctx.arc(geo.x, geo.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      return !this.done;
    }
  }

  function drawFrame(tNow) {
    if (!state.active || !state.ctx || !state.canvas) return;
    resizeCanvas();
    const ctx = state.ctx;
    const dpr = Math.max(1, Math.min(2.25, window.devicePixelRatio || 1));
    const w = state.canvas.width, h = state.canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const fade = Math.min(1, Math.max(0, (tNow - state.enterAt) / (state.reducedMotion ? 1 : 190)));
    const darkness = .70 * fade;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${darkness})`;
    ctx.fillRect(0, 0, w, h);

    const focusId = state.selectedId ?? state.hoverId;
    if (Number.isInteger(focusId)) {
      cutTerritoryFromMask(ctx, focusId, dpr);
      drawAmbientGlow(ctx, focusId, dpr, state.phase === 'vfx' ? 1.2 : 1);
    }

    if (state.phase === 'vfx' && state.vfx) {
      const alive = state.vfx.draw(ctx, dpr, tNow);
      if (!alive) {
        finishTargetMode();
        return;
      }
    }

    state.raf = requestAnimationFrame(drawFrame);
  }

  function updateHud() {
    if (!state.hud) return;
    const title = state.hud.querySelector('[data-scout-hud-title]');
    const note = state.hud.querySelector('[data-scout-hud-note]');
    const actionName = getActionName(state.actionType);
    if (title) title.textContent = `✦ ${actionName} 대상 도시 선택`;

    const focus = state.selectedId ?? state.hoverId;
    if (!Number.isInteger(focus)) {
      if (isSelfTargetAction(state.actionType)) {
        note.textContent = `${actionName}을 설치할 도시를 클릭하세요.`;
      } else {
        note.textContent = `${actionName} 가능한 인접 적 도시 ${state.candidateIds.size}곳 · 도시 위에 마우스를 올린 뒤 클릭하세요.`;
      }
      return;
    }
    const chance = getActionChance(state.sourceId, focus, state.actionType);
    note.textContent = `${getRegionName(focus)}${chance == null ? '' : ` · 예상 성공률 ${chance}%`} · 클릭하면 실행 확인`;
  }

  function setHover(id) {
    const next = Number.isInteger(id) && state.candidateIds.has(id) ? id : null;
    if (state.hoverId === next || state.phase === 'confirm' || state.phase === 'vfx') return;
    state.hoverId = next;
    applyCandidateClasses();
    updateHud();
  }

  function cityIdFromEventTarget(target) {
    const node = target?.closest?.('#map .territory-shape[data-id], #map [data-id]');
    if (!node) return null;
    const id = Number(node.dataset.id);
    return Number.isInteger(id) ? id : null;
  }

  function renderConfirm(targetId) {
    ensureDOM();
    const action = getActionDef(state.actionType) || { name: '첩보', description: '첩보를 실행합니다.' };
    const chance = getActionChance(state.sourceId, targetId, state.actionType);
    const src = getRegionName(state.sourceId);
    const dst = getRegionName(targetId);
    const actionCost = (() => {
      try { return GAME_BALANCE?.espionage?.globalActionCost ?? 1; } catch (_) { return 1; }
    })();
    const stamina = (() => {
      try { return GAME_BALANCE?.espionage?.staminaCost ?? 18; } catch (_) { return 18; }
    })();
    state.modal.querySelector('[data-scout-confirm-content]').innerHTML = `
      <div class="scout-recon-confirm-eyebrow">정보전 · ${action.name} 명령</div>
      <h2>${dst}에 ${action.name}을(를) 실행하시겠습니까?</h2>
      <p><b>${src}</b>에서 계략을 실행합니다. ${action.description} 실행하면 행동력과 담당 지장의 행동/스태미너가 소모됩니다.</p>
      <div class="scout-recon-confirm-stats">
        <span><small>대상 도시</small><strong>${dst}</strong></span>
        <span><small>예상 성공률</small><strong>${chance == null ? '—' : `${chance}%`}</strong></span>
        <span><small>국가 행동 / 스태미너</small><strong>${actionCost} / ${stamina}</strong></span>
      </div>
      <div class="scout-recon-confirm-actions">
        <button type="button" data-scout-confirm-cancel>취소</button>
        <button type="button" class="primary" data-scout-confirm-execute>실행</button>
      </div>`;
  }

  function openTargetConfirm(targetId) {
    if (!state.active || !state.candidateIds.has(Number(targetId))) return;
    state.selectedId = Number(targetId);
    state.hoverId = Number(targetId);
    state.phase = 'confirm';
    renderConfirm(targetId);
    updateHud();
    applyCandidateClasses();
    if (!state.modal.open) state.modal.showModal();
  }

  function executeSelectedAction() {
    if (!state.active || !Number.isInteger(state.selectedId) || !state.actionType) return;
    const targetId = state.selectedId;
    const actionType = state.actionType;
    const actionName = getActionName(actionType);
    if (state.modal?.open) state.modal.close();

    let success = false;
    try {
      if (window.SAMGUK_OFFICERS?.useEspionage) {
        success = !!window.SAMGUK_OFFICERS.useEspionage(state.sourceId, targetId, actionType, state.officerId || null, false);
      } else if (typeof executeEspionageAction === 'function') {
        success = !!executeEspionageAction(state.sourceId, targetId, actionType, state.officerId || null, false);
      }
    } catch (err) {
      console.error('[EspionageTargeting] 첩보 실행 오류', err);
      success = false;
      try { notify?.(`${actionName} 실행 중 오류가 발생했습니다.`); } catch (_) {}
    }

    if (success) {
      state.phase = 'vfx';
      state.vfx = new EspionagePulseVFX(targetId);
      state.hud?.classList.add('is-success');
      const note = state.hud?.querySelector('[data-scout-hud-note]');
      if (note) note.textContent = `${getRegionName(targetId)} ${actionName} 성공 · 정보 파동 분석 중…`;
    } else {
      window.setTimeout(() => finishTargetMode(), state.reducedMotion ? 0 : 220);
    }
  }

  function startTargetMode({ sourceId, officerId = null, actionType = 'scout' } = {}) {
    sourceId = Number(sourceId);
    if (!Number.isInteger(sourceId) || !getRegion(sourceId)) return false;
    if (!getActionDef(actionType)) return false;
    if (!ensureDOM()) return false;

    const candidates = getCandidateIds(sourceId, actionType);
    if (!candidates.length) {
      try { notify?.('실행 가능한 첩보 대상 도시가 없습니다.'); } catch (_) {}
      return false;
    }

    try {
      const espionageDialog = document.getElementById('strategyEspionageModal');
      if (espionageDialog?.open) espionageDialog.close();
    } catch (_) {}

    state.active = true;
    state.phase = 'select';
    state.sourceId = sourceId;
    state.officerId = officerId;
    state.actionType = actionType;
    state.candidateIds = new Set(candidates);
    state.hoverId = null;
    state.selectedId = null;
    state.enterAt = now();
    state.vfx = null;
    state.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.pointerDown = null;
    state.dragDistance = 0;

    document.body.classList.add('scout-target-mode');
    state.canvas.hidden = false;
    state.hud.hidden = false;
    state.hud.classList.remove('is-success');
    updateHud();
    resizeCanvas();
    applyCandidateClasses();
    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(drawFrame);
    return true;
  }

  function reopenEspionagePanel() {
    try {
      if (Number.isInteger(state.sourceId) && typeof renderEspionageModal === 'function') {
        renderEspionageModal(state.sourceId, state.actionType || null);
      }
    } catch (err) {
      console.warn('[EspionageTargeting] 첩보창 복귀 실패', err);
    }
  }

  function cancelTargetMode({ reopenEspionage = false } = {}) {
    const sourceId = state.sourceId;
    const actionType = state.actionType;
    if (state.modal?.open) state.modal.close();
    finishTargetMode({ keepSource: true, keepAction: true });
    if (reopenEspionage && Number.isInteger(sourceId)) {
      state.sourceId = sourceId;
      state.actionType = actionType;
      reopenEspionagePanel();
      state.sourceId = null;
      state.actionType = null;
    }
  }

  function finishTargetMode({ keepSource = false, keepAction = false } = {}) {
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    clearTerritoryClasses();
    document.body.classList.remove('scout-target-mode');
    if (state.canvas) {
      state.ctx?.clearRect(0, 0, state.canvas.width, state.canvas.height);
      state.canvas.hidden = true;
    }
    if (state.hud) {
      state.hud.hidden = true;
      state.hud.classList.remove('is-success');
    }
    if (state.modal?.open) state.modal.close();
    state.active = false;
    state.phase = 'idle';
    state.candidateIds.clear();
    state.hoverId = null;
    state.selectedId = null;
    state.officerId = null;
    state.vfx = null;
    state.pointerDown = null;
    state.dragDistance = 0;
    if (!keepSource) state.sourceId = null;
    if (!keepAction) state.actionType = null;
  }

  function onPointerMove(e) {
    if (!state.active) return;
    if (state.pointerDown) {
      state.dragDistance = Math.max(
        state.dragDistance,
        Math.hypot(e.clientX - state.pointerDown.x, e.clientY - state.pointerDown.y)
      );
    }
    if (state.phase !== 'select') return;
    if (!e.target.closest?.('#mapViewport')) return;
    const id = cityIdFromEventTarget(e.target);
    setHover(id);
  }

  function onPointerDown(e) {
    if (!state.active || !e.target.closest?.('#mapViewport')) return;
    state.pointerDown = { x: e.clientX, y: e.clientY };
    state.dragDistance = 0;
  }

  function onPointerUp() {
    if (!state.active) return;
    window.setTimeout(() => { state.pointerDown = null; }, 0);
  }

  // 지도 클릭을 capture 단계에서 가로채 기존 영토 선택/침략 클릭과 충돌하지 않게 한다.
  function onMapClickCapture(e) {
    if (!state.active) return;
    const vp = e.target.closest?.('#mapViewport');
    if (!vp) return;

    if (e.target.closest?.('[data-scout-cancel]')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      cancelTargetMode({ reopenEspionage: true });
      return;
    }
    if (e.target.closest?.('.scout-recon-hud')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (state.phase !== 'select' || state.dragDistance > 6) return;
    const id = cityIdFromEventTarget(e.target);
    if (Number.isInteger(id) && state.candidateIds.has(id)) {
      openTargetConfirm(id);
    } else {
      try { notify?.('실행 가능한 첩보 대상 도시를 선택하세요.'); } catch (_) {}
    }
  }

  // 기존 v81/v82 시네마틱 첩보창의 모든 행동 버튼을 새 지도 선택 흐름으로 교체한다.
  function onEspionageClickCapture(e) {
    const button = e.target.closest?.('[data-espionage-action]');
    if (!button || button.disabled) return;
    const d = button.closest('#strategyEspionageModal');
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const sourceId = Number(button.dataset.sourceId);
    const actionType = button.dataset.espionageAction;
    const officerId = (() => {
      try { return typeof espionageOfficer === 'function' ? espionageOfficer(sourceId)?.id ?? null : null; }
      catch (_) { return null; }
    })();
    startTargetMode({ sourceId, officerId, actionType });
  }

  function onKeyDown(e) {
    if (!state.active || e.key !== 'Escape') return;
    if (state.modal?.open) return;
    e.preventDefault();
    cancelTargetMode({ reopenEspionage: true });
  }

  function bindEvents() {
    document.addEventListener('click', onEspionageClickCapture, true);
    document.addEventListener('click', onMapClickCapture, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('samguk:map-rendered', () => {
      if (state.active) applyCandidateClasses();
    });
    document.addEventListener('samguk:map-state-updated', () => {
      if (state.active) applyCandidateClasses();
    });
    window.addEventListener('blur', () => {
      if (state.active && state.phase === 'select') setHover(null);
    });
  }

  ensureDOM();
  if (state.canvas) state.canvas.hidden = true;
  if (state.hud) state.hud.hidden = true;
  bindEvents();

  const api = Object.freeze({
    version: 2,
    exampleCities: CITY_EXAMPLE,
    start: startTargetMode,
    startScout: (opts = {}) => startTargetMode({ ...opts, actionType: 'scout' }),
    cancel: cancelTargetMode,
    finish: finishTargetMode,
    openConfirm: openTargetConfirm,
    VFXEffect: EspionagePulseVFX,
    getState: () => ({
      active: state.active,
      phase: state.phase,
      sourceId: state.sourceId,
      actionType: state.actionType,
      hoverId: state.hoverId,
      selectedId: state.selectedId,
      candidates: [...state.candidateIds]
    })
  });

  window[NS] = api;
  // 기존 정찰 전용 네임스페이스도 같은 API로 유지해 하위 호환성을 보장한다.
  window.SAMGUK_SCOUT_RECON = api;
})();
