(function(global){
  'use strict';

  /**
   * v48 — world-map pan boundary tuning.
   *
   * Padding is expressed in *visible world-space view size*, not screen pixels.
   * This makes the drag cushion automatically scale with zoom. In particular,
   * southPaddingRatio leaves extra room below the atlas so the southernmost
   * territories can be pulled above map-status / bottom HUD overlays.
   */
  global.SAMGUK_MAP_PAN_CONFIG=Object.freeze({
    westPaddingRatio:0.08,
    eastPaddingRatio:0.08,
    northPaddingRatio:0.08,
    southPaddingRatio:0.30,

    minHorizontalPaddingWorld:36,
    maxHorizontalPaddingWorld:120,
    minNorthPaddingWorld:32,
    maxNorthPaddingWorld:96,
    minSouthPaddingWorld:88,
    maxSouthPaddingWorld:220,

    // At <= 1x the entire atlas already fits inside the logical view.
    // Keep it centered instead of allowing empty-space panning.
    centerWhenViewContainsWorld:true
  });
})(window);
