import { scrollToEl } from '../motion.js';
// Moon Mission Control: 3D Moon with mission pins, time slider and mission files.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { asset } from '../three/common.js';
import { MISSIONS, STATUS, statusAt, TODAY_YEAR } from './missions.js';

const $ = (s) => document.querySelector(s);
const MIN_YEAR = 1966;
let pipT;
function say(text, mood, section) {
  clearTimeout(pipT);
  document.dispatchEvent(new CustomEvent('pip:say', { detail: { text, mood, section } }));
}
const state = { year: MIN_YEAR, selected: 'luna9', mode: 'surface', touring: false, lastClick: null };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- static UI (works even without WebGL) ---------- */
$('#mc-legend').innerHTML = Object.entries(STATUS).map(([, s]) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('');
const cardsEl = $('#mc-cards');
const cardEls = {};
for (const m of MISSIONS) {
  const c = document.createElement('button');
  c.className = 'mc-card';
  c.addEventListener('click', () => {
    if (state.year < m.year) setYear(m.year, { quiet: true });
    selectMission(m.id, { fly: true, talk: true });
    scrollToEl($('#moon'));
  });
  cardsEl.appendChild(c); cardEls[m.id] = c;
}

function fmtCoord(lat, lon) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
}
function renderCards() {
  for (const m of MISSIONS) {
    const st = statusAt(m, state.year), s = STATUS[st.status], c = cardEls[m.id];
    c.classList.toggle('future', st.status === 'future');
    c.classList.toggle('sel', state.selected === m.id);
    c.setAttribute('aria-label', `${m.name}, ${m.dateText}, ${s.label}`);
    c.innerHTML = `<span class="mc-card-year" aria-hidden="true">${m.year}</span>
      <span class="mc-card-top">${esc(m.agency)} · ${m.dateText}</span>
      <h3>${esc(m.name)}</h3>
      <span class="mc-status" style="--c:${s.color}">${s.label}</span>
      <p>${esc(m.firsts)}</p>`;
  }
}
function renderFile() {
  const m = MISSIONS.find((x) => x.id === state.selected);
  const st = statusAt(m, state.year), s = STATUS[st.status];
  $('#mc-file').innerHTML = `
    <span class="mc-status" style="--c:${s.color}">${s.label} · ${state.year >= TODAY_YEAR ? 'today' : state.year}</span>
    <h3>${esc(m.name)}</h3>
    <p class="mc-sub">${esc(m.kind)}</p>
    <dl class="mc-kv">
      <dt>Agency</dt><dd>${esc(m.agency)}</dd>
      <dt>Landed</dt><dd>${m.dateText}</dd>
      <dt>Site</dt><dd>${esc(m.site)}</dd>
      <dt>Coords</dt><dd>${fmtCoord(m.lat, m.lon)}${m.coordNote ? ` <small>(${esc(m.coordNote)})</small>` : ''}</dd>
    </dl>
    <p class="mc-note">${esc(st.text)}</p>
    <h4>Left behind</h4>
    <ul>${m.left.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h4>First!</h4><p>${esc(m.firsts)}</p>
    <h4>Fun fact</h4><p>${esc(m.fact)}</p>
    <p class="mc-links"><a href="${m.source}" target="_blank" rel="noopener">Source ↗</a>${m.museum ? ` · <button class="link-btn" data-open="${m.museum}">Museum story card →</button>` : ''}</p>`;
}

/* ---------- 3D ---------- */
const wrap = $('#mc-wrap');
const pinsEl = $('#mc-pins');
let three = null; // filled in when WebGL starts

function initThree() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch { $('#mc-loading').textContent = '3D is not available in this browser, but the mission files below still work.'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'mc-canvas';
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D Moon. Drag to rotate, pinch or use the buttons to zoom.');
  wrap.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 2000);
  camera.position.set(0, 0.1, 3.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.55, zoomSpeed: 0.8, minDistance: 1.45, maxDistance: 8, autoRotate: true, autoRotateSpeed: 0.3 });
  controls.addEventListener('start', () => { controls.autoRotate = false; stopTour(); });

  // stars
  const n = 1800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(300 + Math.random() * 500); pos.set([v.x, v.y, v.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdcdaff, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.75 })));

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.6); sun.position.set(-3, 1.5, 4); scene.add(sun);

  const moon = new THREE.Group(); moon.rotation.y = -Math.PI / 2; scene.add(moon); // longitude 0 faces the camera
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  moon.add(new THREE.Mesh(new THREE.SphereGeometry(1, 256, 128), mat));

  const aniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();
  const load = (u) => new Promise((res, rej) => loader.load(asset(u), res, undefined, rej));
  const tex = {};
  Promise.all([load('textures/moon.jpg'), load('textures/moon_dem.jpg')]).then(([color, dem]) => {
    color.colorSpace = THREE.SRGBColorSpace; color.anisotropy = aniso;
    tex.surface = color; tex.dem = dem; tex.terrain = makeTerrainTexture(dem.image, aniso);
    applyMode(); $('#mc-loading')?.remove();
  }).catch(() => { $('#mc-loading').textContent = 'Could not load the NASA Moon map. Please refresh.'; });

  function applyMode() {
    if (!tex.surface) return;
    if (state.mode === 'surface') { mat.map = tex.surface; mat.displacementMap = null; mat.bumpMap = tex.dem; mat.bumpScale = 1.5; }
    else { mat.map = tex.terrain; mat.displacementMap = tex.dem; mat.displacementScale = 0.06; mat.displacementBias = -0.03; mat.bumpMap = tex.dem; mat.bumpScale = 3; }
    mat.needsUpdate = true;
  }

  const pins = MISSIONS.map((m) => {
    const anchor = new THREE.Object3D(); anchor.position.copy(latLonToLocal(m.lat, m.lon, 1.01)); moon.add(anchor);
    const b = document.createElement('button');
    b.className = 'mc-pin' + (m.id === 'surveyor3' ? ' left' : '');
    b.innerHTML = `<span class="d"></span><span class="l">${esc(m.name)}</span>`;
    b.setAttribute('aria-label', `${m.name}, landed ${m.dateText}`);
    b.addEventListener('click', (e) => { e.stopPropagation(); selectMission(m.id, { fly: true, talk: true }); });
    pinsEl.appendChild(b);
    return { m, anchor, el: b };
  });

  const v = new THREE.Vector3(), nrm = new THREE.Vector3(), cd = new THREE.Vector3();
  function updatePins() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    for (const p of pins) {
      p.anchor.getWorldPosition(v); nrm.copy(v).normalize(); cd.copy(camera.position).sub(v).normalize();
      const facing = nrm.dot(cd); v.project(camera);
      const vis = facing > 0.08 && v.z < 1;
      p.el.classList.toggle('hidden', !vis);
      if (vis) p.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w - 14}px, ${(-v.y * 0.5 + 0.5) * h - 14}px)`;
    }
  }

  let fly = null;
  function flyTo(dir, dist, ms = 1000) {
    const from = camera.position.clone();
    fly = { t0: performance.now(), ms, from, fromDist: from.length(), dist, q: new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), dir.clone().normalize()) };
    controls.enabled = false;
  }
  function stepFly(now) {
    if (!fly) return;
    const t = Math.min(1, (now - fly.t0) / fly.ms), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const q = new THREE.Quaternion().slerp(fly.q, e);
    camera.position.copy(fly.from).normalize().applyQuaternion(q).multiplyScalar(fly.fromDist + (fly.dist - fly.fromDist) * e);
    camera.lookAt(0, 0, 0);
    if (t >= 1) { fly = null; controls.enabled = true; controls.update(); }
  }
  const zoomBy = (f) => flyTo(camera.position.clone(), THREE.MathUtils.clamp(camera.position.length() * f, controls.minDistance, controls.maxDistance), 350);
  $('#mc-zin').addEventListener('click', () => zoomBy(0.8));
  $('#mc-zout').addEventListener('click', () => zoomBy(1.25));
  $('#mc-zreset').addEventListener('click', () => flyTo(new THREE.Vector3(0, 0.1, 1), 3.4, 900));

  const resize = () => { const w = wrap.clientWidth, h = wrap.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(wrap); resize();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(wrap);
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    stepFly(now); if (!fly) controls.update();
    renderer.render(scene, camera); updatePins();
  };
  requestAnimationFrame(loop);

  three = {
    applyMode,
    renderPins() {
      for (const p of pins) {
        const st = statusAt(p.m, state.year);
        p.el.style.setProperty('--c', STATUS[st.status].color);
        p.el.classList.toggle('future', st.status === 'future');
        p.el.classList.toggle('sel', state.selected === p.m.id);
        p.el.title = `${p.m.name}: ${STATUS[st.status].label}`;
      }
    },
    flyToMission(m) {
      const p = pins.find((x) => x.m.id === m.id); p.anchor.getWorldPosition(v);
      controls.autoRotate = false;
      flyTo(v.clone().normalize().add(new THREE.Vector3(0, 0.05, 0)), Math.min(camera.position.length(), 3.0), 1000);
    },
  };
  three.renderPins();
}

// lat/lon -> position matching three.js SphereGeometry UVs
function latLonToLocal(lat, lon, r = 1) {
  const phi = ((lon + 180) / 360) * Math.PI * 2, la = THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(-Math.cos(phi) * Math.cos(la) * r, Math.sin(la) * r, Math.sin(phi) * Math.cos(la) * r);
}
// Colour the LOLA elevation map: low = deep olive, high = cream
function makeTerrainTexture(img, aniso) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const stops = [[0, [40, 52, 92]], [0.3, [60, 110, 150]], [0.5, [94, 140, 90]], [0.65, [216, 154, 60]], [0.8, [180, 68, 30]], [1, [255, 244, 228]]];
  for (let i = 0; i < d.data.length; i += 4) {
    const x = d.data[i] / 255; let k = 0; while (k < stops.length - 2 && x > stops[k + 1][0]) k++;
    const [a, ca] = stops[k], [b, cb] = stops[k + 1], t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    for (let j = 0; j < 3; j++) d.data[i + j] = ca[j] + (cb[j] - ca[j]) * t;
  }
  ctx.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}

/* ---------- interactions ---------- */
function renderAll() { three?.renderPins(); renderCards(); renderFile(); }

function selectMission(id, { fly = false, talk = false } = {}) {
  const m = MISSIONS.find((x) => x.id === id);
  const second = state.selected === id && state.lastClick === id;
  state.selected = id; state.lastClick = talk ? id : state.lastClick;
  renderAll();
  if (fly) three?.flyToMission(m);
  if (!talk) return;
  const st = statusAt(m, state.year);
  if (st.status === 'future') say(`Not yet! ${m.name} lands in ${m.year}. Slide the time machine forward!`, 'point');
  else if (second) say(`Fun fact: ${m.fact}`, 'cheer');
  else say(m.pip[st.status] || st.text, 'wave');
}

function setMode(mode) {
  state.mode = mode;
  for (const [id, mm] of [['#mc-surface', 'surface'], ['#mc-terrain', 'terrain']]) { $(id).classList.toggle('on', mode === mm); $(id).setAttribute('aria-pressed', String(mode === mm)); }
  three?.applyMode();
  say(mode === 'terrain'
    ? 'Terrain mode! Colours show height from NASA’s LOLA laser altimeter: blue is low, orange and cream are high.'
    : 'Back to the real colours of the Moon, photographed by NASA’s Lunar Reconnaissance Orbiter.', 'point');
}
$('#mc-surface').addEventListener('click', () => setMode('surface'));
$('#mc-terrain').addEventListener('click', () => setMode('terrain'));

const range = $('#mc-year');
range.max = String(TODAY_YEAR);
function setYear(y, { quiet = false } = {}) {
  const prev = state.year; state.year = y; range.value = y;
  range.style.setProperty('--p', ((y - MIN_YEAR) / (TODAY_YEAR - MIN_YEAR)) * 100 + '%');
  $('#mc-yearout').textContent = y >= TODAY_YEAR ? 'Today' : y;
  const events = [];
  for (const m of MISSIONS) for (const t of m.timeline) if (t.from === y) events.push({ m, t });
  $('#mc-yearnote').textContent = events.length ? events.map((e) => `${e.m.name}: ${e.t.text}`).join('  •  ')
    : y >= TODAY_YEAR ? 'Today: the mirrors still work, several flags still stand, and new missions are on their way.' : 'A quiet year on the Moon. Everything stays where it was left.';
  renderAll();
  if (prev === y && !quiet) return;
  clearTimeout(pipT);
  if (quiet) return;
  pipT = setTimeout(() => {
    const ev = events.find((e) => e.t.from === e.m.year) || events[0];
    if (ev) {
      if (!state.touring) selectMission(ev.m.id, { fly: true });
      say(`${y}! ` + (ev.m.pip[statusAt(ev.m, y).status] || ev.t.text), 'cheer', 'moon');
    } else if (y >= TODAY_YEAR) say('Back to today! Four laser mirrors on this map still help scientists. Abandoned… but not forgotten!', 'wave', 'moon');
  }, 280);
}
range.addEventListener('input', () => { stopTour(); setYear(+range.value); });

let tourTimer = null;
function startTour() {
  state.touring = true; $('#mc-tour').textContent = '■ Stop the tour';
  const steps = [...MISSIONS].sort((a, b) => a.date.localeCompare(b.date));
  let i = 0;
  const next = () => {
    if (!state.touring) return;
    if (i >= steps.length) { setYear(TODAY_YEAR, { quiet: true }); say('That’s the tour! Everything you saw is still up there. Abandoned… but not forgotten.', 'wave', 'moon'); return stopTour(); }
    const m = steps[i++];
    setYear(m.year, { quiet: true }); selectMission(m.id, { fly: true });
    say(`${m.year}: ${m.pip[statusAt(m, m.year).status] || m.firsts}`, 'cheer', 'moon');
    tourTimer = setTimeout(next, 6500);
  };
  next();
}
function stopTour() { if (!state.touring) return; state.touring = false; clearTimeout(tourTimer); $('#mc-tour').textContent = '▶ Take the tour with Pip'; }
$('#mc-tour').addEventListener('click', () => (state.touring ? stopTour() : startTour()));

setYear(MIN_YEAR, { quiet: true });

let started = false;
export function initMoon() { if (started) return; started = true; initThree(); renderAll(); }
