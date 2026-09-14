# v130 Japan map module layout

```text
/
├─ index.html
├─ world.js                         # original base atlas (unchanged)
├─ JapanMapDataV130.js              # Japan nodes, polygons, routes, mask-space transform
├─ MapExpansionV125.js              # merges modular expansion data into WORLD
├─ JapanTerrainMaskCanvas.js        # cached Canvas masking / blue-sea hit guard
├─ japan-mask-canvas.css
├─ map.js                           # SVG renderer; Japan texture falls back only if Canvas module is unavailable
└─ assets/
   └─ map/
      ├─ japan_red_blue_mask_v130.png
      ├─ japan_land_alpha_v130.png
      └─ japan_sea_alpha_v130.png
```

Suggested commit:

`feat(map): rebuild Japan land/sea mask and modularize canvas terrain rendering (v130)`

The map data module also exports through `module.exports` when loaded in Node/CommonJS tooling,
while browser runtime uses `window.SAMGUK_JAPAN_MAP_DATA_V130` for compatibility with the current classic-script stack.
