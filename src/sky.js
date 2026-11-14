// Fixed deep-space backdrop: static star layer drawn once per resize + a handful of twinkling stars.
// Cheap: DPR capped at 1.5, ~10 fps twinkle, paused when the tab is hidden; static under reduced motion.
export function initSky() {
  const cv = document.getElementById('sky-stars'); if (!cv) return;
  const ctx = cv.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = document.createElement('canvas'), bx = base.getContext('2d');
  let W = 0, H = 0, dpr = 1, tw = [], raf = 0, last = 0;
  const COLS = ['242,241,255', '201,197,255', '169,165,243', '180,190,255'];
  function build() {
    dpr = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    for (const c of [cv, base]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    bx.setTransform(dpr, 0, 0, dpr, 0, 0); bx.clearRect(0, 0, W, H);
    const n = Math.round(W * H / 2600); tw = [];
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = Math.random() < 0.92 ? Math.random() * 0.9 + 0.25 : Math.random() * 1.2 + 1;
      const c = COLS[(Math.random() * COLS.length) | 0], a = 0.25 + Math.random() * 0.6;
      if (r > 1 && tw.length < 60) { tw.push({ x, y, r, c, a, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.4 }); continue; }
      bx.fillStyle = `rgba(${c},${a})`; bx.beginPath(); bx.arc(x, y, r, 0, 6.283); bx.fill();
    }
    draw(0);
  }
  function draw(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const s of tw) {
      const k = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * s.s + s.p);
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      g.addColorStop(0, `rgba(${s.c},${s.a * k})`); g.addColorStop(0.3, `rgba(${s.c},${s.a * k * 0.35})`); g.addColorStop(1, `rgba(${s.c},0)`);
      ctx.fillStyle = g; ctx.fillRect(s.x - s.r * 4, s.y - s.r * 4, s.r * 8, s.r * 8);
    }
  }
  function loop(now) { raf = requestAnimationFrame(loop); if (now - last < 100) return; last = now; draw(now / 1000); }
  let rt; addEventListener('resize', () => { if (Math.abs(innerWidth - W) < 2 && Math.abs(innerHeight - H) < 120) return; clearTimeout(rt); rt = setTimeout(build, 200); });
  build();
  if (!reduce) {
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(loop); });
  }
}
