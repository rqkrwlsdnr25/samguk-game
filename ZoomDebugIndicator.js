(function(global){
  'use strict';

  /**
   * v60 Zoom Debug Indicator
   * - Dedicated fixed overlay canvas: never inherits map pan/zoom transforms.
   * - Redraw is event-driven from samguk:map-view-changed, not a permanent RAF loop.
   * - pointer-events:none so it cannot block map interaction.
   */

  const DEFAULTS = Object.freeze({
    width: 158,
    height: 42,
    right: 18,
    bottom: 18,
    radius: 8,
    background: 'rgba(0, 0, 0, 0.50)',
    border: 'rgba(255, 255, 255, 0.18)',
    text: '#ffffff',
    font: '600 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  });

  function finite(value, fallback){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function roundedRectPath(ctx, x, y, w, h, r){
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, rr);
      return;
    }
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /**
   * Generic Canvas API requested for tuning/debug builds.
   * Call this after the world/map render pass.
   * It forcibly returns the context to screen-space before drawing.
   */
  function drawZoomIndicator(ctx, currentZoom, options = {}){
    if (!ctx || !ctx.canvas) return;

    const canvas = ctx.canvas;
    const cfg = Object.assign({}, DEFAULTS, options);
    const zoom = Math.max(0, finite(currentZoom, 1));

    const boxW = Math.min(cfg.width, Math.max(96, canvas.width - cfg.right * 2));
    const boxH = Math.min(cfg.height, Math.max(30, canvas.height - cfg.bottom * 2));
    const x = Math.max(0, canvas.width - boxW - cfg.right);
    const y = Math.max(0, canvas.height - boxH - cfg.bottom);

    ctx.save();
    // Critical: debug HUD is screen-space, completely independent from camera transform.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    roundedRectPath(ctx, x, y, boxW, boxH, cfg.radius);
    ctx.fillStyle = cfg.background;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = cfg.border;
    ctx.stroke();

    ctx.fillStyle = cfg.text;
    ctx.font = cfg.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Zoom: ${zoom.toFixed(2)}x`, x + boxW / 2, y + boxH / 2 + 0.5);
    ctx.restore();
  }

  class ZoomDebugIndicator {
    constructor(options = {}){
      this.options = Object.assign({}, DEFAULTS, options);
      this.canvas = null;
      this.ctx = null;
      this.zoom = 1;
      this._raf = 0;
      this._boundView = (event) => this.onMapViewChanged(event);
      this._boundResize = () => this.scheduleDraw();
    }

    ensureCanvas(){
      if (this.canvas && this.canvas.isConnected) return this.canvas;

      let canvas = document.getElementById('zoomDebugIndicator');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'zoomDebugIndicator';
        canvas.width = this.options.width;
        canvas.height = this.options.height;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.dataset.debugUi = 'zoom-indicator';
        document.body.appendChild(canvas);
      }

      Object.assign(canvas.style, {
        position: 'fixed',
        width: `${this.options.width}px`,
        height: `${this.options.height}px`,
        right: `${this.options.right}px`,
        bottom: `${this.options.bottom}px`,
        zIndex: '2147483000',
        pointerEvents: 'none',
        userSelect: 'none',
        touchAction: 'none',
        contain: 'strict'
      });

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
      return canvas;
    }

    getLiveZoom(){
      const snapshot = global.SAMGUK_GPU_MAP_CAMERA?.getSnapshot?.();
      if (Number.isFinite(Number(snapshot?.zoomRatio))) return Number(snapshot.zoomRatio);

      const view = snapshot?.view || global.mapView;
      const worldWidth = finite(global.WORLD?.width, 1150);
      if (Array.isArray(view) && Number.isFinite(Number(view[2])) && Number(view[2]) > 0) {
        return worldWidth / Number(view[2]);
      }
      return this.zoom || 1;
    }

    onMapViewChanged(event){
      const eventZoom = event?.detail?.camera?.zoomRatio;
      this.zoom = Number.isFinite(Number(eventZoom)) ? Number(eventZoom) : this.getLiveZoom();
      this.scheduleDraw();
    }

    scheduleDraw(){
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        this.draw();
      });
    }

    draw(){
      if (!this.ensureCanvas() || !this.ctx) return;
      // The dedicated canvas is already viewport-fixed, so use zero outer margin here.
      drawZoomIndicator(this.ctx, this.zoom, {
        width: this.canvas.width,
        height: this.canvas.height,
        right: 0,
        bottom: 0,
        radius: this.options.radius,
        background: this.options.background,
        border: this.options.border,
        text: this.options.text,
        font: this.options.font
      });
    }

    init(){
      this.ensureCanvas();
      this.zoom = this.getLiveZoom();
      document.addEventListener('samguk:map-view-changed', this._boundView, { passive: true });
      global.addEventListener('resize', this._boundResize, { passive: true });
      this.draw();
      return this;
    }

    destroy(){
      document.removeEventListener('samguk:map-view-changed', this._boundView);
      global.removeEventListener('resize', this._boundResize);
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
      this.canvas?.remove();
      this.canvas = null;
      this.ctx = null;
    }
  }

  global.drawZoomIndicator = drawZoomIndicator;
  global.SAMGUK_ZOOM_DEBUG_INDICATOR = new ZoomDebugIndicator();

  const boot = () => global.SAMGUK_ZOOM_DEBUG_INDICATOR?.init?.();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);
