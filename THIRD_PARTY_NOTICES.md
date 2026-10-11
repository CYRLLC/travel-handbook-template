# Third-Party Notices

## Application

Travel Handbook Template's original application source, generic examples and documentation use the MIT license in `LICENSE`.

## Leaflet 1.9.4

`vendor/leaflet.js` and `vendor/leaflet.css` are redistributed under BSD-2-Clause. The original copyright notices and complete license are retained in `vendor/leaflet-LICENSE.txt`. Preserve these files when redistributing a website bundle.

Source: https://leafletjs.com/download.html

## OpenStreetMap

OpenStreetMap map data is credited on the rendered map. Public tile servers have their own usage policy and are not included in the application's MIT grant. This template loads only tiles needed for an explicitly opened map, uses browser caching, and does not prefetch tiles for offline use. The `file://` edition shows route information without requesting public tiles; serve over HTTP(S) for map tiles.

Attribution: https://www.openstreetmap.org/copyright

Tile policy: https://operations.osmfoundation.org/policies/tiles/

## Open-Meteo

Weather is optional and disabled by default. Weather data uses CC BY 4.0 and the page retains visible provider/license attribution. The free API is for non-commercial use; commercial deployments must arrange an appropriate service or keep weather disabled. API access conditions and limits are separate from the application's MIT license.

Provider terms: https://open-meteo.com/en/terms

## Test Dependency

Playwright is a development-only dependency under Apache-2.0. It and its browsers are not included in the website ZIP. Dependency metadata is pinned in `package-lock.json`.
