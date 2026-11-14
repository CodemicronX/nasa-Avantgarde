// Leaflet maps on real NASA tiles. Moon & Mars: NASA Solar System Treks WMTS (equirectangular, EPSG:4326-like grid).
// Earth: NASA GIBS Blue Marble (Web Mercator).
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TREK = (body, layer) => `https://trek.nasa.gov/tiles/${body}/EQ/${layer}/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`;
export const BODIES = {
  earth: { crs: L.CRS.EPSG3857, center: [20, 0], zoom: 2, min: 1, max: 9,
    layers: { 'Blue Marble (NASA GIBS)': { url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg', native: 8 } },
    credit: 'Imagery: NASA GIBS / Blue Marble Shaded Relief & Bathymetry' },
  moon: { crs: L.CRS.EPSG4326, center: [5, 15], zoom: 2, min: 1, max: 10,
    layers: { 'LRO WAC mosaic': { url: TREK('Moon', 'LRO_WAC_Mosaic_Global_303ppd_v02'), native: 8 } },
    credit: 'Imagery: NASA/GSFC/Arizona State University LRO WAC via NASA Solar System Treks' },
  mars: { crs: L.CRS.EPSG4326, center: [0, 30], zoom: 2, min: 1, max: 9,
    layers: { 'Viking MDIM 2.1 colour': { url: TREK('Mars', 'Mars_Viking_MDIM21_ClrMosaic_global_232m'), native: 7 },
              'MOLA colour shaded relief': { url: TREK('Mars', 'Mars_MGS_MOLA_ClrShade_merge_global_463m'), native: 7 } },
    credit: 'Imagery: NASA/USGS Viking MDIM 2.1 and MGS MOLA via NASA Solar System Treks' },
};

export function createMap(el, body, { markers = [], onOpen, zoom, center, big = false } = {}) {
  const B = BODIES[body];
  const map = L.map(el, { crs: B.crs, center: center || B.center, zoom: zoom ?? B.zoom, minZoom: B.min, maxZoom: B.max, worldCopyJump: false, maxBounds: [[-90, -200], [90, 200]], attributionControl: true, zoomSnap: 0.5 });
  const base = {};
  Object.entries(B.layers).forEach(([name, l], i) => {
    base[name] = L.tileLayer(l.url, { maxNativeZoom: l.native, maxZoom: B.max, noWrap: true, bounds: [[-90, -180], [90, 180]], attribution: B.credit, crossOrigin: true });
    if (i === 0) base[name].addTo(map);
  });
  if (Object.keys(base).length > 1) L.control.layers(base, null, { collapsed: big || window.innerWidth < 700 }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  const byId = {};
  markers.forEach((m) => {
    const icon = L.divIcon({ className: '', html: `<div class="pin ${m.kind || ""} ${m.found ? "found" : ""} ${big ? 'big' : ''}"></div>`, iconSize: [big ? 24 : 18, big ? 24 : 18], iconAnchor: [big ? 12 : 9, big ? 12 : 9] });
    const mk = L.marker(m.coords, { icon, keyboard: true, title: m.name, alt: m.name }).addTo(layer);
    mk.bindTooltip(`${m.name}${m.year ? ' · ' + m.year : ''}`, { direction: 'top', offset: [0, -10] });
    const html = document.createElement('div');
    html.innerHTML = `<h4>${m.name}</h4><div>${m.summary || ''}</div><small>${m.coords[0].toFixed(3)}°, ${m.coords[1].toFixed(3)}°</small><br/>`;
    if (onOpen && m.id) { const b = document.createElement('button'); b.textContent = 'Open story card'; b.onclick = () => onOpen(m.id); html.appendChild(b); }
    mk.bindPopup(html);
    byId[m.id] = mk;
  });
  return { map, byId, focus(id, z = 6) { const mk = byId[id]; if (mk) { map.flyTo(mk.getLatLng(), z, { duration: 1.2 }); setTimeout(() => mk.openPopup(), 1300); } } };
}
