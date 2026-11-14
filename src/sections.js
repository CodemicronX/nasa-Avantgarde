import { pauseScroll, resumeScroll, scrollToEl } from './motion.js';
// Supporting sections: story, catalog + story cards, atlas, 3D lab, live orbit, causes, numbers, prevention, sources.
import { OBJECTS, PLACE_LABEL, byId } from './data/objects.js';
import { FACTORS } from './data/factors.js';
import { icon } from './icons.js';
import { PREVENTION, STATS, DECAY, DATA_SOURCES, CHALLENGE_RESOURCES } from './data/prevention.js';
import { createMap, BODIES } from './atlas.js';
import { webglAvailable } from './three/common.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s) => document.querySelector(s);
const factorById = Object.fromEntries(FACTORS.map((f) => [f.id, f]));
const sorted = [...OBJECTS].sort((a, b) => a.year - b.year);
const modelSpec = (m) => (m?.startsWith('nasa:') ? { src: `models/${m.slice(5)}.glb`, fallback: 'lander' } : { proc: (m || 'proc:debris').slice(5) });
const isNasaModel = (m) => m?.startsWith('nasa:');
const kindLabel = (o) => (o.kind === 'retired' ? 'Retired hardware' : 'Lost / failed');
let ModelViewerP = null;
const getViewer = () => (ModelViewerP ||= import('./three/viewer.js').then((m) => m.ModelViewer));

// ---------- STORY CARD (modal) ----------
let modalViewer = null; let lastFocus = null;
export async function openCard(id) {
  const o = byId[id]; if (!o) return;
  lastFocus = document.activeElement;
  const modal = $('#modal'); const box = $('#modal-content'); modal.dataset.card = id;
  const f = factorById[o.factor];
  box.innerHTML = `<article class="story-card">
    <div><div class="viewer" id="card-viewer" role="img" aria-label="3D model of ${esc(o.name)} (${isNasaModel(o.model) ? 'NASA 3D Resources model' : 'simplified procedural reconstruction'}). Drag to rotate."></div>
      <p class="small muted">${isNasaModel(o.model) ? '3D model: NASA 3D Resources (public domain)' : 'Simplified procedural 3D reconstruction — not an official model'} · drag to rotate</p></div>
    <div><p class="eyebrow">${esc(PLACE_LABEL[o.place])} · ${esc(o.date || String(o.year))} · ${kindLabel(o)}</p>
      <h2 id="modal-title" style="font-size:2rem">${esc(o.name)}</h2>
      <p><span class="badge">${esc(o.agency)}</span> ${f ? `<span class="badge nasa">${icon(f.icon, 'ic badge-ic')} ${esc(f.title)}</span>` : ''}</p>
      <p class="lead-s">${esc(o.summary)}</p><p>${esc(o.story)}</p>
      <dl class="facts">${(o.facts || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}${o.coords ? `<dt>Coordinates</dt><dd>${o.coords[0].toFixed(3)}°, ${o.coords[1].toFixed(3)}°</dd>` : ''}<dt>Status</dt><dd>${esc(o.status)}</dd></dl>
      <div class="card-actions">${o.coords && ['moon', 'mars', 'earth'].includes(o.place) ? `<button class="btn btn-primary small-btn" data-map="${o.id}">Show on the ${esc(PLACE_LABEL[o.place])} map</button>` : ''}
        ${o.campaign ? `<a class="btn btn-ghost small-btn" href="#game" data-play="${o.campaign}">▶ Play this mission</a>` : ''}</div>
      <h3 style="font-size:1rem;margin-top:1rem">Sources</h3><ul class="srcs">${(o.sources || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>
    </div></article>`;
  modal.hidden = false; document.body.style.overflow = 'hidden'; pauseScroll();
  modal.querySelector('.modal-close').focus();
  box.querySelector('[data-map]')?.addEventListener('click', () => { closeCard(); document.dispatchEvent(new CustomEvent('atlas:show', { detail: { body: o.place, id: o.id } })); });
  box.querySelector('[data-play]')?.addEventListener('click', () => { closeCard(); document.dispatchEvent(new CustomEvent('game:play', { detail: { id: o.campaign } })); });
  if (webglAvailable()) {
    const MV = await getViewer(); if (modal.hidden) return;
    modalViewer = new MV(box.querySelector('#card-viewer'), { ground: o.place === 'moon' ? 'moon' : o.place === 'mars' ? 'mars' : 'none' });
    modalViewer.load(modelSpec(o.model));
  }
}
export function closeCard() {
  const modal = $('#modal'); if (modal.hidden) return;
  modal.hidden = true; document.body.style.overflow = ''; resumeScroll(); modalViewer?.dispose(); modalViewer = null; lastFocus?.focus?.({ preventScroll: true });
}
export function initModal() {
  const modal = $('#modal');
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) closeCard(); });
  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeCard();
    if (e.key === 'Tab') { const f = [...modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]; if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-open]'); if (b) { e.preventDefault(); openCard(b.dataset.open); } });
}

// ---------- HERO STATS ----------
export function renderHeroStats() {
  const retired = OBJECTS.filter((o) => o.kind === 'retired' && (o.place === 'moon' || o.place === 'mars')).length;
  $('#hero-stats').innerHTML = [
    ['3', 'playable NASA missions'], [String(retired), 'NASA sites on the Moon & Mars mapped'], [String(OBJECTS.length), 'story cards with sources'], ['2,600+', 'real debris objects in 3D'],
  ].map(([v, l]) => `<li><b>${v}</b><span>${l}</span></li>`).join('');
}

// ---------- SCROLL STORY ----------
// Moon and Mars only, in chronological order. [id, body, heading, text]
const CHAPTERS = [
  ['surveyor-1', 'moon', 'Scouts for the astronauts', 'Before people could land on the Moon, robots had to prove it was possible. Surveyor 1 touched down gently in 1966 — and it is still standing there.'],
  ['apollo-11-site', 'moon', 'Footprints and a descent stage', 'Every Apollo crew flew home in the top half of their lander. The bottom half — the descent stage — stayed behind, with experiments around it.'],
  ['apollo-15-lrv', 'moon', 'Three cars parked on the Moon', 'Apollo 15, 16 and 17 each brought an electric Lunar Roving Vehicle. All three are still parked where the astronauts left them.'],
  ['mars-3', 'mars', 'The first soft landing on Mars', 'In December 1971 the Soviet Mars 3 lander became the first spacecraft to land softly on Mars. It started to transmit — and went silent within seconds.'],
  ['viking-1', 'mars', 'The first long-lived Mars landers', 'Viking 1 worked on Mars for more than six years. It stopped on 11 November 1982 after a faulty command was sent from Earth.'],
  ['mco', 'mars', 'When the numbers don’t match', 'Not everything retires peacefully. In 1999 Mars Climate Orbiter was lost at Mars because one team used imperial units and another used metric.'],
  ['phoenix', 'mars', 'Frozen by the arctic winter', 'Phoenix dug into the ice-rich soil near Mars’ north pole. When winter came, there was not enough sunlight to keep it alive.'],
  ['spirit', 'mars', 'Stuck in the sand', 'Spirit was planned to work for 90 sols and lasted over six years. In the end it got trapped in soft sand at a place called Troy.'],
  ['insight', 'mars', 'Buried by dust', 'InSight listened to more than 1,300 marsquakes until dust covered its solar panels; it fell silent in December 2022. It is Campaign 1 in our Simulator.'],
  ['vikram', 'moon', 'A new generation tries', 'In 2019 India’s Vikram lander lost contact moments before touchdown near the lunar south pole. Its debris was later found in images from NASA’s Lunar Reconnaissance Orbiter.'],
];
// chapter markup is rendered at start-up (it sets the page height); the 3D globe stays lazy
export function renderStorySteps() {
  const steps = $('#story-steps'); if (steps.children.length) return;
  steps.innerHTML = CHAPTERS.map(([id, body, h, t], i) => { const o = byId[id];
    return `<li class="story-step" data-i="${i}" data-body="${body}"><span class="year">${o.year}</span><span class="step-body ${body}">${body === 'moon' ? 'Moon' : 'Mars'}</span><h3>${esc(h)}</h3><p>${esc(t)}</p><button class="link" data-open="${id}">Open the story card for ${esc(o.name)} →</button></li>`; }).join('');
}
export async function initStory() {
  renderStorySteps();
  const steps = $('#story-steps');
  const label = $('#story-globe-label');
  let globe = null;
  if (webglAvailable()) { const { PlanetGlobe } = await import('./three/globe.js'); globe = new PlanetGlobe($('#story-globe'), { distance: 3.0, fit: true, body: CHAPTERS[0][1], maxDpr: 1.5 }); }
  const show = (i) => {
    const [id, body] = CHAPTERS[i], o = byId[id], name = body === 'moon' ? 'Moon' : 'Mars';
    label.textContent = o.coords ? `${name} · ${Math.abs(o.coords[0]).toFixed(1)}° ${o.coords[0] >= 0 ? 'N' : 'S'}, ${Math.abs(o.coords[1]).toFixed(1)}° ${o.coords[1] >= 0 ? 'E' : 'W'}` : `${name} · lost in orbit, no landing site`;
    label.dataset.body = body;
    $('#story-globe').setAttribute('aria-label', `Globe of ${body === 'moon' ? 'the Moon' : 'Mars'}${o.coords ? ' with a pin at the site of ' + o.name : ''}`);
    if (!globe) return;
    globe.setBody(body);
    if (o.coords) globe.focus(o.coords[0], o.coords[1]); else globe.free();
  };
  const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { steps.querySelectorAll('.story-step').forEach((s) => s.classList.toggle('active', s === e.target)); show(+e.target.dataset.i); } }), { rootMargin: matchMedia('(max-width: 860px)').matches ? '-58% 0px -32% 0px' : '-45% 0px -45% 0px' });
  steps.querySelectorAll('.story-step').forEach((s) => io.observe(s));
  show(0);
}

// ---------- CATALOG ----------
export function initCatalog() {
  const state = { kind: 'all', place: 'all', factor: 'all', view: localStorage.getItem('cat-view') || 'grid' };
  const seg = (group, label, opts) => `<div class="seg" role="radiogroup" aria-label="${label}">${opts.map(([v, l]) => `<button type="button" role="radio" class="seg-b" data-g="${group}" data-v="${v}" aria-checked="${state[group] === v}">${esc(l)}</button>`).join('')}</div>`;
  const shortPlace = { orbit: 'Orbit', earth: 'Earth', moon: 'Moon', mars: 'Mars', elsewhere: 'Deep space', archive: 'Archives' };
  $('#filters').innerHTML = `
    <div class="cat-row">
      ${seg('kind', 'Type', [['all', 'All'], ['retired', 'Retired'], ['lost', 'Lost & failed']])}
      ${seg('place', 'Place', [['all', 'Everywhere'], ...Object.keys(PLACE_LABEL).map((k) => [k, shortPlace[k] || PLACE_LABEL[k]])])}
      <div class="cat-right"><span class="cat-legend" aria-hidden="true"><i class="dot r"></i>Retired <i class="dot l"></i>Lost</span><span class="cat-count" id="cards-count" aria-live="polite"></span>
        <div class="seg view-seg" role="radiogroup" aria-label="View">
          <button type="button" role="radio" class="seg-b" data-g="view" data-v="grid" aria-checked="${state.view === 'grid'}" aria-label="Grid view" title="Grid view"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></button>
          <button type="button" role="radio" class="seg-b" data-g="view" data-v="list" aria-checked="${state.view === 'list'}" aria-label="List view" title="List view"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg></button>
        </div></div>
    </div>
    <div class="cause-row" role="radiogroup" aria-label="Cause">
      <button type="button" role="radio" class="cause" data-g="factor" data-v="all" aria-checked="true">All causes</button>
      ${FACTORS.map((f) => `<button type="button" role="radio" class="cause" data-g="factor" data-v="${f.id}" aria-checked="false">${icon(f.icon, 'ic chip-ic')}${esc(f.title)}</button>`).join('')}
    </div>`;
  const cards = $('#cards');
  const render = () => {
    const list = sorted.filter((o) => (state.kind === 'all' || (state.kind === 'retired' ? o.kind === 'retired' : o.kind !== 'retired')) && (state.place === 'all' || o.place === state.place) && (state.factor === 'all' || o.factor === state.factor));
    cards.classList.toggle('list', state.view === 'list');
    cards.innerHTML = list.length ? list.map((o) => `<button class="card ${o.kind === 'retired' ? 'retired' : 'lost'}" data-open="${o.id}" aria-label="${esc(o.name)}, ${o.year}. Open story card">
      <span class="meta"><span class="m-place"><i class="dot" title="${kindLabel(o)}" aria-hidden="true"></i>${esc(PLACE_LABEL[o.place])}<span class="sr-only"> · ${kindLabel(o)}</span></span><span class="yr">${o.year}</span></span>
      <h3>${esc(o.name)}</h3><p>${esc(o.summary)}</p>
      <span class="status"><span>${esc(o.status)}</span>${isNasaModel(o.model) ? '<span class="badge3d" title="Official NASA 3D model">3D · NASA</span>' : ''}</span></button>`).join('') : '<p class="cat-empty">No objects match these filters. <button class="link-btn" data-reset>Show everything</button></p>';
    $('#cards-count').textContent = `${list.length} of ${OBJECTS.length}`;
  };
  const set = (g, v) => { state[g] = v; $('#filters').querySelectorAll(`[data-g="${g}"]`).forEach((x) => x.setAttribute('aria-checked', String(x.dataset.v === v))); if (g === 'view') localStorage.setItem('cat-view', v); render(); };
  $('#filters').addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (b) set(b.dataset.g, b.dataset.v); });
  $('#filters').addEventListener('keydown', (e) => { // arrow keys move within a radio group
    const b = e.target.closest('[data-g]'); if (!b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const grp = [...$('#filters').querySelectorAll(`[data-g="${b.dataset.g}"]`)]; const n = grp[(grp.indexOf(b) + (e.key === 'ArrowRight' ? 1 : -1) + grp.length) % grp.length];
    e.preventDefault(); n.focus(); n.scrollIntoView({ block: 'nearest', inline: 'nearest' }); set(n.dataset.g, n.dataset.v);
  });
  cards.addEventListener('click', (e) => { if (e.target.closest('[data-reset]')) { ['kind', 'place', 'factor'].forEach((g) => { state[g] = 'all'; $('#filters').querySelectorAll(`[data-g="${g}"]`).forEach((x) => x.setAttribute('aria-checked', String(x.dataset.v === 'all'))); }); render(); } });
  render();
}

// ---------- ATLAS ----------
export function initAtlas() {
  let cur = null; let body = 'moon';
  const side = $('#atlas-side');
  const build = (b, focusId) => {
    body = b; if (cur) cur.map.remove();
    document.querySelectorAll('.atlas-tabs [data-body]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.body === b)));
    const items = sorted.filter((o) => o.coords && (o.place === b || (b === 'earth' && o.place === 'earth')));
    // nudge markers that share exactly the same coordinates so both stay clickable
    const seen = {};
    const markers = items.map((o) => { const k = o.coords.join(','); const n = (seen[k] = (seen[k] || 0) + 1) - 1; return { id: o.id, name: o.name, coords: [o.coords[0] + n * 0.02, o.coords[1] + n * 0.02], year: o.year, summary: o.summary, kind: o.kind === 'retired' ? 'retired' : 'lost' }; });
    cur = createMap($('#atlas-map'), b, { markers, onOpen: openCard });
    const ret = items.filter((o) => o.kind === 'retired'), lost = items.filter((o) => o.kind !== 'retired');
    const li = (o) => `<li><button data-fly="${o.id}"><span class="dot ${o.kind === 'retired' ? 'retired' : 'lost'}" aria-hidden="true"></span>${esc(o.name)}<small>${o.year} · ${o.coords[0].toFixed(2)}°, ${o.coords[1].toFixed(2)}°</small></button></li>`;
    side.innerHTML = `<h3>${b === 'moon' ? 'The Moon' : b === 'mars' ? 'Mars' : 'Earth'} · ${items.length} sites</h3>
      <p class="legend"><span class="dot retired"></span> Retired hardware (“ghost” sites) <span class="dot lost"></span> Lost / crashed</p>
      ${ret.length ? `<h4>Retired hardware</h4><ul>${ret.map(li).join('')}</ul>` : ''}${lost.length ? `<h4>Lost or crashed</h4><ul>${lost.map(li).join('')}</ul>` : ''}
      <p class="credit-l">${esc(BODIES[b].credit)}. Coordinates: NASA NSSDCA, LROC, The Planetary Society and mission papers (see each story card).</p>`;
    side.querySelectorAll('[data-fly]').forEach((x) => x.addEventListener('click', () => cur.focus(x.dataset.fly, b === 'earth' ? 5 : 6)));
    if (focusId) setTimeout(() => cur.focus(focusId, b === 'earth' ? 5 : 6), 200);
  };
  document.querySelectorAll('.atlas-tabs [data-body]').forEach((t) => t.addEventListener('click', () => build(t.dataset.body)));
  document.addEventListener('atlas:show', (e) => { const { body: b, id } = e.detail; scrollToEl($('#atlas')); setTimeout(() => build(['moon', 'mars', 'earth'].includes(b) ? b : 'moon', byId[id] ? id : null), 400); });
  build('moon');
}

// ---------- 3D LAB ----------
export async function initLab() {
  const items = sorted.filter((o) => isNasaModel(o.model)).concat(sorted.filter((o) => !isNasaModel(o.model) && ['surveyor', 'lrv', 'golf', 'vanguard', 'beagle', 'philae', 'envisat'].includes(o.model.slice(5))));
  const uniq = []; const seenM = new Set(); items.forEach((o) => { if (!seenM.has(o.model)) { seenM.add(o.model); uniq.push(o); } });
  const list = $('#lab-list');
  list.innerHTML = uniq.map((o, i) => `<li><button role="option" aria-selected="${i === 0}" data-i="${i}">${esc(o.name)} <small>${isNasaModel(o.model) ? 'NASA model' : 'procedural'}</small></button></li>`).join('');
  let viewer = null, vmod = null, preloaded = false;
  if (webglAvailable()) { vmod = await import('./three/viewer.js'); viewer = new vmod.ModelViewer($('#lab-viewer'), { ground: 'moon' }); }
  const groundOf = (o) => (o.place === 'moon' ? 'moon' : o.place === 'mars' ? 'mars' : 'none');
  const show = (i) => { const o = uniq[i];
    list.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.i === i)));
    $('#lab-caption').innerHTML = `<h3>${esc(o.name)}</h3><p>${esc(o.summary)} <button class="link-btn" data-open="${o.id}">Story card →</button></p><p class="small muted">${isNasaModel(o.model) ? '3D model: NASA 3D Resources (public domain)' : 'Simplified procedural reconstruction — not an official model'}</p>`;
    $('#lab-viewer').setAttribute('aria-label', `Rotatable 3D model of ${o.name}`);
    viewer?.load(modelSpec(o.model), groundOf(o)).then(() => {
      // after the first model is up, fetch the rest quietly so reselecting is instant
      if (!preloaded) { preloaded = true; vmod.preloadModels(uniq.map((x) => modelSpec(x.model).src)); }
    }); };
  list.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); });
  list.addEventListener('keydown', (e) => { if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return; e.preventDefault(); const bs = [...list.querySelectorAll('button')]; const i = bs.indexOf(document.activeElement); const j = Math.max(0, Math.min(bs.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); bs[j].focus(); show(j); });
  show(0);
}

// ---------- LIVE ORBIT ----------
// Panel + skeleton render at once; three.js and the SGP4 worker load in the background.
const ORBIT_GROUPS = [['cosmos-2251-debris', 'Kosmos 2251 debris', '#ff6a3d', 581], ['iridium-33-debris', 'Iridium 33 debris', '#b8d36b', 109], ['fengyun-1c-debris', 'Fengyun-1C debris', '#ffb547', 1988]];
export async function initOrbit() {
  const side = $('#orbit-side'), viewer = $('#orbit-viewer');
  const skel = document.createElement('div'); skel.className = 'orbit-skel'; skel.setAttribute('aria-hidden', 'true');
  skel.innerHTML = '<div class="orbit-skel-globe"></div><p>Loading tracked fragments…</p>';
  viewer.appendChild(skel);
  const panel = (labelSrc, live) => `<h3>Debris clouds</h3>${ORBIT_GROUPS.map(([k, l, c, n]) => `<label><input type="checkbox" data-k="${k}" checked ${live ? '' : 'disabled'}/> <span class="sw" style="background:${c}"></span>${esc(l)}<span class="count">${n.toLocaleString('en-US')}</span></label>`).join('')}
      <p class="note"><span class="sw" style="background:#ff3d1f"></span> Vanguard 1 & Envisat (lost satellites) · <span class="sw" style="background:#fff"></span> ISS for scale</p>
      <p class="note">Positions: SGP4 via satellite.js, recomputed about 3 times a second for the current time${LITE_NOTE()}. Data: <span id="orbit-src">${esc(labelSrc)}</span>.</p>
      <button class="btn btn-ghost light small-btn" id="orbit-live" ${live ? '' : 'disabled'}>↻ Load live elements from CelesTrak</button><p class="note" id="orbit-msg" aria-live="polite"></p>
      <p class="note">Why this is here: Moon and Mars hardware sits still; around Earth, retired hardware keeps moving at 7–8 km/s and can collide. It is the supporting context for why “end of mission” planning matters.</p>`;
  const fallback = (why) => {
    skel.classList.add('failed');
    skel.innerHTML = `<div class="orbit-skel-globe still"></div><p><b>Live 3D view unavailable</b>${esc(why)}<br/>About ${ORBIT_GROUPS.reduce((a, x) => a + x[3], 0).toLocaleString('en-US')} tracked fragments from these three breakups are still in orbit (CelesTrak, Nov 2026).</p>`;
    const m = side.querySelector('#orbit-msg'); if (m) m.textContent = 'Showing the static summary.';
  };
  side.innerHTML = panel('CelesTrak snapshot', false);
  if (!webglAvailable() || typeof Worker === 'undefined') { fallback(' — this browser has no WebGL.'); return; }
  let g;
  try {
    const { startOrbitWorker } = await import('./three/orbit-data.js');
    const boot = startOrbitWorker(); // fetch + SGP4 parsing start while three.js downloads
    const mod = await import('./three/orbit.js');
    g = new mod.DebrisGlobe(viewer, $('#orbit-tip'), boot);
    await g.loadSnapshot();
  } catch (e) { console.warn('orbit:', e); fallback(' — the orbital data could not be loaded.'); return; }
  const lite = g.order.some((x) => x.n < x.tracked);
  LITE_NOTE = () => (lite ? '; on phones every 2nd fragment is drawn' : '');
  const render = () => {
    side.innerHTML = panel(g.sourceLabel || '', true);
    side.querySelectorAll('input[data-k]').forEach((c) => { c.checked = g.groups[c.dataset.k]?.visible ?? true; c.addEventListener('change', () => g.setVisible(c.dataset.k, c.checked)); });
    g.onUpdate();
    side.querySelector('#orbit-live').onclick = async (ev) => { const m = side.querySelector('#orbit-msg'); ev.currentTarget.disabled = true; m.textContent = 'Loading…'; try { await g.loadLive(); render(); side.querySelector('#orbit-msg').textContent = 'Live elements loaded (cached for 12 h).'; } catch { ev.currentTarget.disabled = false; m.textContent = 'CelesTrak did not answer (it limits request rates). Still showing the bundled snapshot.'; } };
  };
  g.onUpdate = () => { side.querySelectorAll('input[data-k]').forEach((c) => { const x = g.groups[c.dataset.k]; const s = c.parentElement.querySelector('.count'); if (x && s) s.textContent = x.count.toLocaleString('en-US'); }); };
  render();
  skel.classList.add('gone'); setTimeout(() => skel.remove(), 600);
  const total = g.order.reduce((a, x) => a + x.tracked, 0);
  viewer.setAttribute('aria-label', `3D globe of Earth with ${total} tracked debris fragments from three breakup events, positioned from CelesTrak orbital elements.`);
}
let LITE_NOTE = () => '';

// ---------- WHY / NUMBERS / PREVENT / SOURCES ----------
const CHEV = '<svg class="ic chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export function renderStatic() {
  const pad = (n) => String(n + 1).padStart(2, '0');
  const more = (id, label) => `<button class="u-more" type="button" aria-expanded="false" aria-controls="${id}"><span>${label}</span>${CHEV}</button>`;
  // Why missions end: numbered "failure modes" with patch icons; details expand on click
  $('#factor-grid').innerHTML = FACTORS.map((f, i) => { const cases = f.examples.filter((id) => byId[id]);
    return `<article class="ucard fm reveal" data-n="${pad(i)}">
      <div class="u-top"><span class="u-patch">${icon(f.icon)}</span><span class="u-num">${pad(i)}</span></div>
      <h3>${esc(f.title)}</h3><p class="u-line">${esc(f.short)}</p>
      <div class="u-foot"><span class="u-pill">${cases.length} case${cases.length === 1 ? '' : 's'}</span>${more(`fm-${f.id}`, 'Details')}</div>
      <div class="u-detail" id="fm-${f.id}" inert><div><p>${esc(f.text)}</p><ul class="u-chips">${cases.map((id) => `<li><button data-open="${id}">${esc(byId[id].name)}</button></li>`).join('')}</ul></div></div>
    </article>`; }).join('');
  // Numbers: same card system, dark variant
  $('#stat-grid').innerHTML = STATS.map((x) => `<div class="ucard dark stat2 reveal"><span class="u-patch">${icon(x.icon)}</span><b>${esc(x.value)}</b><span class="u-line">${esc(x.label)}</span><small>${esc(x.src)}</small></div>`).join('');
  $('#decay').innerHTML = DECAY.map((d) => `<div class="decay-row"><span>${esc(d.alt)}</span><div class="bar" role="img" aria-label="${esc(d.alt)}: ${esc(d.time)}"><i style="width:${d.w}%">${esc(d.time)}</i></div></div>`).join('');
  // Prevent: checklist cards, steps + sources revealed on click
  $('#prevent-grid').innerHTML = PREVENTION.map((x, i) => `<article class="ucard pv reveal">
      <div class="u-top"><span class="u-patch">${icon(x.icon)}</span><span class="u-tag">${esc(x.tag)}</span></div>
      <h3>${esc(x.title)}</h3><p class="u-line">${esc(x.short)}</p>
      <div class="u-foot"><span class="u-pill">${x.items.length} steps · ${x.sources.length} source${x.sources.length === 1 ? '' : 's'}</span>${more(`pv-${x.id}`, 'Checklist')}</div>
      <div class="u-detail" id="pv-${x.id}" inert><div><ul class="u-check">${x.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <p class="u-src">Sources: ${x.sources.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join(' · ')}</p></div></div>
    </article>`).join('');
  // Details open as an overlay drawer over the cards below (no layout shift); one open at a time.
  const label = (card) => (card.classList.contains('pv') ? 'Checklist' : 'Details');
  const setOpen = (card, open) => {
    const d = card.querySelector('.u-detail');
    if (open) { // open upward if the drawer would run past the viewport bottom and there is more room above
      const r = card.getBoundingClientRect(), need = Math.min(d.scrollHeight, innerHeight * 0.62, 460) + 16;
      card.classList.toggle('up', r.bottom + need > innerHeight && r.top - need > 64);
    }
    card.classList.toggle('open', open);
    const b = card.querySelector('.u-more'); b.setAttribute('aria-expanded', String(open));
    b.querySelector('span').textContent = open ? 'Close' : label(card);
    d.inert = !open;
  };
  const closeAll = (except) => document.querySelectorAll('.ucard.fm.open, .ucard.pv.open').forEach((c) => { if (c !== except) setOpen(c, false); });
  document.querySelectorAll('.ucard .u-more').forEach((b) => b.addEventListener('click', () => {
    const card = b.closest('.ucard'), open = !card.classList.contains('open');
    closeAll(card); setOpen(card, open);
  }));
  document.addEventListener('click', (e) => { if (!e.target.closest('.ucard.open')) closeAll(); });
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; const c = document.querySelector('.ucard.fm.open, .ucard.pv.open'); if (c) { setOpen(c, false); c.querySelector('.u-more').focus(); } });
  $('#src-data').innerHTML = DATA_SOURCES.map(([l, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('');
  const cr = $('#src-challenge');
  if (cr) cr.innerHTML = CHALLENGE_RESOURCES.map(([l, u, ids]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a><br/><small>In this project: ${ids.filter((i) => byId[i]).map((i) => `<button class="link-btn" data-open="${esc(i)}">${esc(byId[i].name)}</button>`).join(', ')}</small></li>`).join('');
  const all = new Map(); OBJECTS.forEach((o) => (o.sources || []).forEach((s) => all.set(s.url, s.label)));
  $('#src-all').innerHTML = [...all].sort((a, b) => a[1].localeCompare(b[1])).map(([u, l]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a></li>`).join('');
}
