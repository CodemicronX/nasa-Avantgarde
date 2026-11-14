// Tiny (no three.js) helpers so the SGP4 worker can start fetching/parsing before three.js has loaded.
const asset = (p) => import.meta.env.BASE_URL + p.replace(/^\//, '');

export const LITE = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const LIVE_KEY = 'orbit-live-v1', LIVE_TTL = 12 * 3600e3;
export function readLiveCache() { try { const c = JSON.parse(localStorage.getItem(LIVE_KEY) || 'null'); return c && Date.now() - c.t < LIVE_TTL ? c.data : null; } catch { return null; } }
export function writeLiveCache(data) { try { localStorage.setItem(LIVE_KEY, JSON.stringify({ t: Date.now(), data })); } catch { /* quota: skip */ } }

/** Start the worker and the first load right away; messages are buffered until the globe attaches. */
export function startOrbitWorker() {
  const worker = new Worker(new URL('./orbit-worker.js', import.meta.url), { type: 'module' });
  const early = []; let failed = null;
  worker.onmessage = (e) => early.push(e.data);
  worker.onerror = (e) => { e.preventDefault?.(); failed = new Error('worker failed'); };
  const cached = readLiveCache(), stride = LITE ? 2 : 1;
  worker.postMessage(cached ? { type: 'load', data: cached, stride } : { type: 'load', url: new URL(asset('data/tle-snapshot.json'), location.href).href, stride });
  return { worker, early, cached, failed: () => failed };
}
