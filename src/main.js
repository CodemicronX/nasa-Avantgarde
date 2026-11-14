import { initMotion, watchReveals, scrollToEl } from './motion.js';
import { initSky } from './sky.js';
import '@fontsource/syne/600.css';
import '@fontsource/syne/700.css';
import '@fontsource/syne/800.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/epilogue/400.css';
import '@fontsource/epilogue/500.css';
import '@fontsource/epilogue/600.css';
import '@fontsource/epilogue/700.css';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { SimulatorUI } from './game/ui.js';
import { loadCampaign } from './game/engine.js';
import { initModal, renderHeroStats, initStory, renderStorySteps, initCatalog, initAtlas, initLab, initOrbit, renderStatic } from './sections.js';
import { webglAvailable } from './three/common.js';
import { initPip } from './pip.js';
import { initMoon } from './moon/moon.js';
import { initSourceAccordions } from './sources-ui.js';

const $ = (s) => document.querySelector(s);

// Explore menu: hover on desktop (fine pointer), click/tap everywhere, Esc / outside click close
const explore = $('#explore'), exBtn = $('#explore-btn'), exPanel = $('#nav');
const setExplore = (open, focusFirst = false) => {
  explore.classList.toggle('open', open); exBtn.setAttribute('aria-expanded', String(open));
  if (open && focusFirst) exPanel.querySelector('a')?.focus();
};
let hoverOpenedAt = -1e9;
exBtn.addEventListener('click', () => { const open = exBtn.getAttribute('aria-expanded') === 'true'; if (open && performance.now() - hoverOpenedAt < 700) return; setExplore(!open); });
exBtn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setExplore(true, true); } });
let hoverT = 0;
explore.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { clearTimeout(hoverT); if (!explore.classList.contains('open')) hoverOpenedAt = performance.now(); setExplore(true); } });
explore.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { clearTimeout(hoverT); hoverT = setTimeout(() => setExplore(false), 220); } });
exPanel.addEventListener('click', (e) => { if (e.target.closest('a')) setExplore(false); });
exPanel.addEventListener('keydown', (e) => {
  const links = [...exPanel.querySelectorAll('a')]; const i = links.indexOf(document.activeElement);
  if (['ArrowDown', 'ArrowRight'].includes(e.key)) { e.preventDefault(); links[(i + 1) % links.length].focus(); }
  if (['ArrowUp', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); links[(i - 1 + links.length) % links.length].focus(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && explore.classList.contains('open')) { setExplore(false); exBtn.focus(); } });
document.addEventListener('pointerdown', (e) => { if (!explore.contains(e.target)) setExplore(false); });
explore.addEventListener('focusout', (e) => { if (e.relatedTarget && !explore.contains(e.relatedTarget)) setExplore(false); });

// static content first
initModal(); renderHeroStats(); renderStatic(); initCatalog(); initSourceAccordions();

// game
const ui = new SimulatorUI({ consoleEl: $('#console'), body: $('#console-body'), title: $('#console-title'), btnSound: $('#btn-sound'), btnMenu: $('#btn-menu'), live: $('#game-live') });
const m = location.hash.match(/^#report=([\w-]+)/);
(m ? ui.openShared(m[1]) : Promise.resolve(false)).then((ok) => { if (!ok) ui.menu(); else setTimeout(() => scrollToEl($('#game'), false), 200); });
document.addEventListener('game:play', async (e) => { scrollToEl($('#game')); ui.start(await loadCampaign(e.detail.id)); });

// hero: the Moon fades in (no countdown)
const pip = initPip();
let heroGlobe = null;
if (webglAvailable()) import('./three/globe.js').then(({ PlanetGlobe }) => {
  const host = $('.hero-bg'); host.innerHTML = '';
  heroGlobe = new PlanetGlobe(host, { distance: 3.1 }); heroGlobe.fitR = 1.05; heroGlobe.setBody('moon'); heroGlobe.spin = 0.05;
  const cam = heroGlobe.stage.camera;
  cam.position.z = heroGlobe.fitDistance(1.08);
  heroGlobe.stage.tick.push((dt) => { cam.position.z += (heroGlobe.fitDistance(1.08) - cam.position.z) * Math.min(1, dt * 1.6); });
  requestAnimationFrame(() => requestAnimationFrame(() => host.classList.add('in')));
});
setTimeout(() => pip.start(), 700);

// lazy-init heavy sections when they approach the viewport
initSky();
renderStorySteps();
const lazy = { moon: initMoon, story: initStory, atlas: initAtlas, lab: initLab, orbit: initOrbit };
const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (!en.isIntersecting) return; const f = lazy[en.target.id]; if (f) { delete lazy[en.target.id]; io.unobserve(en.target); f(); } }), { rootMargin: '400px 0px' });
Object.keys(lazy).forEach((id) => io.observe(document.getElementById(id)));
// atlas requests coming before lazy init
document.addEventListener('atlas:show', (e) => { if (lazy.atlas) { const f = lazy.atlas; delete lazy.atlas; io.unobserve(document.getElementById('atlas')); f(); setTimeout(() => document.dispatchEvent(new CustomEvent('atlas:show', { detail: e.detail })), 0); } });

// reveal-on-scroll (GSAP ScrollTrigger) + Lenis smooth scroll; re-scan when lazy sections render
initMotion();
new MutationObserver(() => watchReveals()).observe(document.querySelector('main') || document.body, { childList: true, subtree: true });

// service worker: cache-first for models/textures (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=${__MEDIA_VER__}`, { scope: import.meta.env.BASE_URL }).catch(() => {}));
}
