@echo off
setlocal
del /Q "SeaTileSystem.js" 2>nul
del /Q "SeaRoutePathfinder.js" 2>nul
del /Q "WakoEncounterSystem.js" 2>nul
del /Q "sea-system.css" 2>nul
echo [v64] obsolete sea-node/stationing files removed.
endlocal
