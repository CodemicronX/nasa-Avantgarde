import {initPipChat} from './pip-chat.js';
const POS_KEY = 'pip-pos-v1';
const SECTIONS = {
  hero: { side: 'right', pose: 'wave', line: 'Hi, I`m Pip! I look after the machines people left in space. Scroll down and let`s go explore the space!'},
  moon: {side: 'left', pose: 'point', line: 'This is the real Moon, mapped by NASA`s LRO. Drag it, tap a glowing pin, and move the time slider!'},
  game: {side: 'right', pose: 'think', line: 'Your turn at mission control! Can you keep the spacecraft alive as long as NASA`s engineers did?'},
  story: {side:'right', pose: 'cheer', line: 'Story time! Moon and Mars only - watch the globe switch worlds and pin each landing site.'},
  catalog: {side: 'left', pose:'point', line:'Welcome to the museum of left-behind things. Tap any card to open its story file.'},
  atlas: {side:'right', pose: 'think', line:'These pins sit on real NASA maps. Can you find Tranquility Base, where Apollo 11 landed??'},
  lab: {side: 'left', pose: 'jump', line: '3D lab!! Spin the hardware like a real engineer. Some models come straight from NASA.'},
  orbit: {side:'right', pose:'think', line:'Around Earth it gets crowded: thousands of pieces of old hardware are still circling.'},
  why: {side: 'left', pose: 'think', line: 'Why do missions end? Dust, cold nights, lost signals... and sometimes one tiiny mistake.'},
  numbers: {side:'right', pose:'point', line:'Big numbers! Every one of these is a reason to plan for the end of a mission.'},
  prevent: {side:'left', pose:'cheer', line:'Good news: engineers have clever ways to stop making new space junk.'},
  disclosure: {side: 'left', pose:'point', line:'How we built this site, honestly explained. Tap me to ask a question!!'},
  sources: {side:'right', pose:'sleep', line:'Every fact here has a source. Scientists love sources... almost as much as naps.'},
};
const SVG = `
<svg viewBox="0 0 160 190" aria-hidden="true">
    <defs>
      <radialGradient id="pipB" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9c5ff"/></radialGradient>
      <linearGradient id="pipV" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10169f"/><stop offset="1" stop-color="#060439"/></linearGradient>
    </defs>
    <g class="pp-body">
      <ellipse class="pp-shadow" cx="80" cy="182" rx="30" ry="5" fill="#000" opacity=".35"/>
      <line x1="80" y1="30" x2="80" y2="12" stroke="#5a47c4" stroke-width="3"/>
      <circle class="pp-light" cx="80" cy="10" r="6" fill="#a9a5f3"/>
      <g class="pp-arm-l"><path d="M42 118 q-20 8 -22 28" stroke="#b4aef2" stroke-width="9" fill="none" stroke-linecap="round"/></g>
      <g class="pp-arm-r"><path d="M118 118 q20 8 22 28" stroke="#b4aef2" stroke-width="9" fill="none" stroke-linecap="round"/></g>
      <rect x="44" y="108" width="72" height="54" rx="22" fill="url(#pipB)" stroke="#8f88e0" stroke-width="1.5"/>
      <rect x="62" y="124" width="36" height="14" rx="5" fill="#5a47c4"/>
      <text x="80" y="134.5" font-size="9" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="700" fill="#ffffff">PIP</text>
      <g class="pp-head">
          <circle cx="80" cy="70" r="46" fill="url(#pipB)" stroke="#8f88e0" stroke-width="1.5"/>
          <rect x="46" y="48" width="68" height="46" rx="22" fill="url(#pipV)"/>
          <g class="pp-eyes">
            <ellipse cx="66" cy="69" rx="7" ry="9" fill="#9fe8ff"/><ellipse cx="94" cy="69" rx="7" ry="9" fill="#9fe8ff"/>
            <circle cx="68" cy="66" r="2.2" fill="#fff"/><circle cx="96" cy="66" r="2.2" fill="#fff"/>
          </g>
          <g class="pp-eyes-closed"><path d="M59 70 q7 5 14 0 M87 70 q7 5 14 0" stroke="#9fe8ff" stroke-width="3" fill="none" stroke-linecap="round"/></g>
          <path class="pp-mouth" d="M71 83 q9 7 18 0" stroke="#9fe8ff" stroke-width="3" fill="none" stroke-linecap="round"/>
          <ellipse class="pp-mouth-open" cx="80" cy="85" rx="6" ry="4" fill="#9fe8ff"/>
          <circle cx="50" cy="90" r="4.5" fill="#ff8fc8" opacity=".55"/><circle cx="110" cy="90" r="4.5" fill="#ff8fc8" opacity=".55"/>
          </g>
          <text class="pp-q" x="128" y="34" font-size="26" font-family="Syne, sans-serif" font-weight="700" fill="#a9a5f3">?</text>
          <text class="pp-z" x="122" y="36" font-size="18" font-family="Syne, sans-serif" font-weight="700" fill="#a9a5f3">z</text>
          </g>
</svg>`;

export function initPip(){
  const root = document.createElement('div');
  root.className = 'pip hidden';
  root.innerHTML = `<div class="pip-bubble" role="status" aria-live="polite"><span class="pip-text"></span></div>
    <button class="pip-btn" type="button" aria-haspopup="dialog" aria-label="Pip, your guide. Press to ask Pip a question. Drag to move; double-tap to send Pip home.">${SVG}<span class="pip-ask" aria-hidden="true">Ask</span></button>`;
  document.body.appendChild(root);
  const bubble = root.querySelector('.pip-bubble'), textEl = root.querySelector('.pip-text'), btn = root.querySelector('.pip-btn');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ids = Object.keys(SECTIONS).filter((id) => id === 'hero' || document.getElementById(id));
  const sectionEl = (id) => (id === 'hero' ? document.querySelector('.hero') : document.getElementById(id));

  let current = null, lastLine = '', typeT = null, hideT = null, enabled = false;
  const pos = {x: 0, y: 0, s: 1, r: 0}, target = {x: 0, y: 0, s: 1, r:0};
  let lastScroll = scrollY, lean = 0;

  function setPose(p) {root.dataset.pose = p;}
  function say(text, mood, {sticky = false} = {}) {
    lastLine = text;
    if (mood) setPose(mood);
    clearInterval(typeT); clearTimeout(hideT);
    bubble.classList.add('show'); root.classList.add('talking');
    // restart the pop animation
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
    if (reduce) {textEl.textContent = text; root.classList.remove('talking');}
    else {
      let i = 0; textEl.textContent = '';
      typeT = setInterval(() => {
        i += 2; textEl.textContent = text.slice(0, i);
        if (i >= text.length) {clearInterval(typeT); root.classList.remove('talking');}
      }, 22);
    }
    const mob = root.classList.contains('mobile');
    const ms = Math.max(mob ? 3800 : 4500, text.length * (mob ? 45 : 55));
    if (!sticky) hideT = setTimeout(() => bubble.classList.remove('show'), ms);
  }

  const chat = initPipChat({onOpenChange: (open) => {
    root.classList.toggle('chatting', open);
    if (open) bubble.classList.remove('show');
  }});
  const sideNow = () => (pos.x + 48 > document.documentElement.clientWidth / 2 ? 'right' : 'left');

  // drag pip (mouse + touch)
  let dragged = null; // where user put him
  try {
    const d = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (d && Number.isFinite(d.x) && Number.isFinite(d.y)) dragged = d;
  } catch {}
  const sizeNow = () => (root.classList.contains('mobile') ? 56 : 96);
  const clamp = (p) => {
    const vw = document.documentElement.clientWidth, vh = innerHeight, sz = sizeNow();
    return {x: Math.min(Math.max(4, p.x), vw - sz - 4), y: Math.min(Math.max(64, p.y), vh - sz - 4)};
  };
  let drag = null, lastTap = 0, tapT = 0;

  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = {id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false};
    btn.setPointerCapture(e.pointerId);
  });
  btn.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return; // small move = still a tap
    if (!drag.moved) {drag.moved = true; root.classList.add('dragging'); bubble.classList.remove('show');}
    dragged = clamp({x: drag.ox + dx, y: drag.oy + dy});
    pos.x = target.x = dragged.x; pos.y = target.y = dragged.y; pos.s = target.s = 1;
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null; root.classList.remove('dragging');
    if (moved) {
      try {localStorage.setItem(POS_KEY, JSON.stringify(dragged));} catch {}
      root.dataset.side = sideNow();
      btn.dataset.justDragged = '1';
      setTimeout(() => delete btn.dataset.justDragged, 0);
    }
  };
  btn.addEventListener('pointerup', endDrag);
  btn.addEventListener('pointercancel', endDrag);

  btn.addEventListener('click', (e) => {
    if (btn.dataset.justDragged) return;
    const now = performance.now();
    // double click -> send pip home
    if (e.detail !== 0 && now - lastTap < 320) {
      clearTimeout(tapT); lastTap = 0; dragged = null;
      try {localStorage.removeItem(POS_KEY);} catch {}
      update(); say('Back to my spot! I`ll follow you again.', 'cheer'); return;
    }
    lastTap = now;
    if (e.detail === 0) {chat.toggle(sideNow()); return;} // keyboard enter
    clearTimeout(tapT); tapT = setTimeout(() => chat.toggle(sideNow()), 260);
  });
  document.addEventListener('pip:say', (e) => {if (enabled && !chat.isOpen()) say(e.detail.text, e.detail.mood);});

  function activeSection() {
    const mid = innerHeight * 0.45; let best = 'hero';
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) return ids[ids.length - 1];
    for (const id of ids) {
      const el = sectionEl(id); if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) best = id;
    }
    return best;
  }

  function computeTarget() {
    const vw = document.documentElement.clientWidth, vh = innerHeight, mobile = vw < 900;
    const size = mobile ? 56 : 96;
    root.classList.toggle('mobile', mobile);
    if (dragged) { // user moved him, so he stays there
      if (!drag) dragged = clamp(dragged);
      target.x = dragged.x; target.y = dragged.y; target.s = 1;
      root.dataset.side = dragged.x + size / 2 > vw / 2 ? 'right' : 'left'; return;
    }
    const id = current || 'hero', cfg = SECTIONS[id];
    // on the moon section pip sits in his dock
    const dock = document.getElementById('pip-dock');
    if (!mobile && id === 'moon' && dock) {
      const r = dock.getBoundingClientRect();
      if (r.top < vh * 0.5 && r.bottom > vh * 0.55) {
        const sc = Math.min(1.7, r.width / size);
        target.x = r.left + r.width / 2 - (size * sc) / 2;
        target.y = Math.max(r.top + 170, Math.min(r.bottom - size * sc * 1.2 - 10, vh * 0.42));
        target.s = sc;
        root.dataset.side = 'dock'; return;
      }
    }
    target.s = 1;
    root.dataset.side = cfg.side;
    const margin = mobile ? -8 : Math.max(12, Math.min(40, (vw - 1240) / 2 - size));
    target.x = cfg.side === 'right' ? vw - size - margin : margin;
    if (mobile) {target.y = vh - size - 10; return;}
    // goes down slowly while you read the section
    const el = sectionEl(id), r = el.getBoundingClientRect();
    const prog = Math.min(1, Math.max(0, (vh * 0.45 - r.top) / Math.max(1, r.height)));
    target.y = vh * (0.3 + 0.45 * prog);
  }

  function update() {
    const id = activeSection();
    if (id !== current) {
      current = id;
      if (enabled && !chat.isOpen()) say(SECTIONS[id].line, SECTIONS[id].pose);
    }
    computeTarget();
  }

  let fc = 0;
  function frame() {
    if ((fc++ & 3) === 0) update(); // check every 4 frames, sections load lazy
    const k = reduce || drag ? 1 : 0.12;
    const v = scrollY - lastScroll; lastScroll = scrollY;
    lean += (Math.max(-12, Math.min(12, v * 0.6)) - lean) * 0.15; // tilt when scrolling
    pos.x += (target.x - pos.x) * k; pos.y += (target.y - pos.y) * k; pos.s += (target.s - pos.s) * k;
    root.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
    root.style.setProperty('--s', pos.s.toFixed(3));
    root.style.setProperty('--lean', `${(reduce ? 0 : lean).toFixed(1)}deg`);
    requestAnimationFrame(frame);
  }

  addEventListener('scroll', update, {passive: true});
  addEventListener('resize', update);
  update(); pos.x = target.x; pos.y = target.y + 120; pos.s = target.s;
  requestAnimationFrame(frame);

  return {
    start() {
      enabled = true; root.classList.remove('hidden');
      current = activeSection(); computeTarget();
      say(SECTIONS[current].line, SECTIONS[current].pose);
    },
    say,
    chat,
  };
}
