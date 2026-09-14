# v54 Region centroid example

`com.samguk.geometry.Region` recalculates `Point center` whenever `setVertices(...)` is called.
The implementation uses the polygon Shoelace formula and works with clockwise or counter-clockwise vertex order.

Frontend runtime equivalent: `RegionGeometry.js`.
The live game remains SVG-based for map labels, so v54 uses the same cached centroid as the anchor of the existing SVG label/troop HUD hierarchy. `renderRegionLabels(ctx, region)` is also exported for a Canvas/Astra renderer.
