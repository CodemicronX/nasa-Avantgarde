// Scroll motion: GSAP ScrollTrigger reveals + Lenis smooth scrolling (desktop pointers only).
// Respects prefers-reduced-motion; touch devices keep native (iOS) scrolling.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
// nested scroll areas, maps and 3D canvases keep their own wheel handling
const NO_LENIS = '.modal, .pipchat, .explore-panel, .u-detail, .lab-list, .atlas-side, .leaflet-container, canvas, .mc-wrap, [data-lenis-prevent]';

export let lenis = null;

export function initMotion() {
  document.documentElement.classList.add('gsap-on');
  if (!reduce && !touch) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.12, wheelMultiplier: 1, allowNestedScroll: true, prevent: (node) => !!node.closest?.(NO_LENIS) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }
  watchReveals();
  addEventListener('load', () => ScrollTrigger.refresh());
  // lazy sections change the page height: keep trigger positions fresh
  let t = 0; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 200); }).observe(document.body);
}

const seen = new WeakSet();
/** Animate any .reveal element (including ones rendered later) the first time it scrolls into view. */
export function watchReveals(root = document) {
  const els = [...root.querySelectorAll('.reveal:not(.in)')].filter((el) => !seen.has(el));
  if (!els.length) return;
  els.forEach((el) => seen.add(el));
  if (reduce) { els.forEach((el) => el.classList.add('in')); return; }
  ScrollTrigger.batch(els, {
    start: 'top 92%', once: true,
    onEnter: (batch) => gsap.fromTo(batch, { autoAlpha: 0, y: 28 }, {
      autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07, overwrite: true,
      onComplete() { batch.forEach((el) => { el.classList.add('in'); gsap.set(el, { clearProps: 'transform,opacity,visibility' }); }); },
    }),
  });
}

const OFFSET = 70;
/** Scroll to an element; lazy sections above it may grow on the way, so re-aim until it lands. */
export function scrollToEl(el, smooth = true, tries = 3) {
  if (!el) return;
  const again = () => { const top = el.getBoundingClientRect().top; if (tries > 0 && Math.abs(top - OFFSET) > 12) scrollToEl(el, smooth, tries - 1); };
  if (lenis) lenis.scrollTo(el, { offset: 0, immediate: !smooth, onComplete: () => setTimeout(again, 120) });
  else { el.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto' }); setTimeout(again, smooth && !reduce ? 900 : 150); }
}
// in-page links (#section): go through scrollToEl so they land correctly with or without Lenis
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey) return;
  const id = a.getAttribute('href').slice(1); if (!id || id.startsWith('report=')) return;
  const el = document.getElementById(id); if (!el) return;
  e.preventDefault(); history.pushState(null, '', '#' + id); scrollToEl(el);
  if (el.matches('section, [tabindex]')) el.focus?.({ preventScroll: true });
});
export const pauseScroll = () => lenis?.stop();
export const resumeScroll = () => { if (!lenis) return; lenis.start(); lenis.scrollTo(window.scrollY, { immediate: true, force: true }); };
