(function(global){
  'use strict';

  /**
   * v50 — single source of truth for world-map zoom.
   *
   * zoomLevel = 1.0  : complete atlas fits the camera view.
   * zoomLevel < 1.0  : zoomed out, with symmetric empty margin around the atlas.
   * zoomLevel > 1.0  : zoomed in.
   *
   * Keeping these numbers in one object prevents min/max values from silently
   * diverging between wheel, buttons, camera clamp and smooth interpolation.
   */
  global.SAMGUK_MAP_ZOOM_CONFIG=Object.freeze({
    minZoom:0.5,
    maxZoom:15.0,
    defaultZoom:1.0,
    koreaZoom:2.5,
    cameraSmoothingSpeed:11.0,
    cameraDeadzone:0.001,
    maxDeltaTime:0.05,
    wheelSensitivity:0.00135,
    wheelDeltaClamp:480,
    highZoomHudStart:1.45,
    highZoomDetailEnd:6.0,
    highZoomHudMaxScale:1.42,
    highZoomLabelMaxScale:1.28,

    // v57 — large country names fade only; territory/city/troop UI is untouched.
    largeCountryNameFadeStart:1.25,
    largeCountryNameFadeEnd:2.40,

    // v59 — unified capital/specialized city icon sizing.
    // One global zoom scalar is applied in CSS, so camera RAF never rewrites
    // every city's width/height attributes.
    cityIconBaseSize:40,
    cityIconMinScale:0.55,
    cityIconMaxScale:2.20,
    islandCityIconScale:0.50,

    // v61 — high-zoom composite UI compaction tuning.  These are screen-pixel
    // layout thresholds, not world geometry values.
    regionCompositeCompactStart:1.25,
    regionCompositeCompactTarget:3.74,
    regionCompositeExtraLiftPx:18,
    regionCompositeMaxLiftPx:72
  });
})(window);
