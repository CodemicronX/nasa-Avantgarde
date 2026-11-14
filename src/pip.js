import {initPipChat} from './pip-chat.js';
const POS_KEY = 'pip-pos-v1';
const SECTIONS = {
  hero: { side: 'right', pose: 'wave', line: 'Hi, I`m Pip! I look after the machines people left in space. Scroll down and let`s go explore the space!'},
  moon: {side: 'left', pose: 'point', line: 'This is the real Moon, mapped by NASA`s LRO. Drag it, tap a glowing pin, and move the time slider!'},
  game: {side: 'right', pose: 'think', line: 'Your turn at mission control! Can you keep the spacecraft alive as long as NASA`s engineers did?'},
  story: {side:'right', pose: 'cheer', line: 'Story time! Moon and Mars only - watch the globe switch worlds and pin each landing site.'},
  catalog: {side: 'left', pose:'point', line:'Welcome to the museum of left-behind things. Tap any card to open its story file.'},
  atlas: {side:'right', pose: 'think', line:'These pins sit on real NASA maps. Can you find Tranquility Base, where Apollo 11 landed??'},
  lab: {side: 'left', pose: 'cheer', line: '3D lab!! Spin the hardware like a real engineer. Some models come straight from NASA.'},
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
      <g class="pp-arm-r"><path class="pp-wave" d="M118 118 q20 8 22 28" stroke="#b4aef2" stroke-width="9" fill="none" stroke-linecap="round"/></g>
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
  const waveHand = root.querySelector('.pp-wave');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sections = new Map(Object.keys(SECTIONS).map((id) => [id,
    id === 'hero' ? document.querySelector('.hero') : document.getElementById(id),
  ]).filter(([, section]) => section));
  const dock = document.getElementById('pip-dock');
  const pos = {x: 0, y: 0, scale: 1};
  const target = {x: 0, y: 0, scale: 1};
  let current = null, talkT, hideT, wave, enabled = false, docked = false;

  function setPose(pose) {
    root.dataset.pose = pose;
    if (pose === 'wave' && !reducedMotion.matches && wave?.playState !== 'running') {
      wave = waveHand.animate({transform: ['rotate(0deg)', 'rotate(14deg)', 'rotate(-14deg)', 'rotate(0deg)'],
        easing: 'ease-in-out'}, {duration: 750, iterations: 2});
    }
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      wave?.cancel();
      root.classList.remove('talking');
    }
    scheduleFrame();
  });

  function hideSpeech() {
    clearTimeout(talkT);
    clearTimeout(hideT);
    bubble.classList.remove('show');
    root.classList.remove('talking');
  }

  function say(text, mood, {sticky = false} = {}) {
    if (mood) setPose(mood);
    clearTimeout(talkT);
    clearTimeout(hideT);
    textEl.textContent = text;
    bubble.classList.add('show');
    if (!reducedMotion.matches) {
      root.classList.add('talking');
      talkT = setTimeout(() => root.classList.remove('talking'), text.length * 11);
    }
    const mob = root.classList.contains('mobile');
    const ms = Math.max(mob ? 3800 : 4500, text.length * (mob ? 45 : 55));
    if (!sticky) hideT = setTimeout(() => bubble.classList.remove('show'), ms);
  }

  const chat = initPipChat({onOpenChange: (open) => {
    root.classList.toggle('chatting', open);
    if (open) hideSpeech();
  }});
  const sizeNow = () => (root.classList.contains('mobile') ? 56 : 96);
  const sideNow = () => (pos.x + sizeNow() * pos.scale / 2 > document.documentElement.clientWidth / 2 ? 'right' : 'left');

  // drag pip (mouse + touch)
  let dragged = null; // where user put him
  try {
    const d = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (d && Number.isFinite(d.x) && Number.isFinite(d.y)) dragged = d;
  } catch {}
  const clamp = (p, size = sizeNow()) => {
    const maxX = Math.max(4, document.documentElement.clientWidth - size - 4);
    const maxY = Math.max(4, innerHeight - size - 4);
    return {x: Math.min(Math.max(4, p.x), maxX), y: Math.min(Math.max(64, p.y), maxY)};
  };
  let drag = null, lastTap = -Infinity, tapT;

  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag) return;
    drag = {id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false};
    btn.setPointerCapture(e.pointerId);
  });
  btn.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 7) return; // small move = still a tap
    if (!drag.moved) {
      drag.moved = true;
      lastTap = -Infinity;
      clearTimeout(tapT);
      root.classList.add('dragging');
      hideSpeech();
    }
    dragged = clamp({x: drag.ox + dx, y: drag.oy + dy}, sizeNow() * pos.scale);
    Object.assign(pos, dragged);
    scheduleFrame();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null; root.classList.remove('dragging');
    if (moved) {
      try {localStorage.setItem(POS_KEY, JSON.stringify(dragged));} catch {}
      btn.dataset.justDragged = '1';
      setTimeout(() => delete btn.dataset.justDragged, 0);
    }
    scheduleUpdate();
  };
  btn.addEventListener('pointerup', endDrag);
  btn.addEventListener('pointercancel', endDrag);
  btn.addEventListener('lostpointercapture', endDrag);

  btn.addEventListener('click', (e) => {
    if (btn.dataset.justDragged) return;
    if (e.detail === 0) {chat.toggle(sideNow()); return;}
    const now = performance.now();
    // double click -> send pip home
    if (now - lastTap < 320) {
      clearTimeout(tapT); lastTap = -Infinity; dragged = null;
      try {localStorage.removeItem(POS_KEY);} catch {}
      scheduleUpdate();
      if (!chat.isOpen()) say('Back to my spot! I`ll follow you again.', 'cheer');
      return;
    }
    lastTap = now;
    tapT = setTimeout(() => chat.toggle(sideNow()), 320);
  });
  document.addEventListener('pip:say', (e) => {
    if (enabled && !drag && !chat.isOpen() && (!e.detail.section || e.detail.section === current)) {
      say(e.detail.text, e.detail.mood);
    }
  });

  function activeSection() {
    const mid = innerHeight * 0.45;
    if (sections.has('sources') && scrollY + innerHeight >= document.documentElement.scrollHeight - 4) return 'sources';
    const active = sections.get(current)?.getBoundingClientRect();
    // Small scroll and layout shifts at a boundary should keep the current section.
    if (active && active.top <= mid + 24 && active.bottom > mid - 24) return current;
    for (const [id, section] of sections) {
      const {top, bottom} = section.getBoundingClientRect();
      if (top <= mid && bottom > mid) return id;
    }
    return current || 'hero';
  }

  function computeTarget() {
    const vw = document.documentElement.clientWidth, vh = innerHeight, mobile = vw < 900;
    const size = mobile ? 56 : 96;
    root.classList.toggle('mobile', mobile);
    if (dragged) {
      docked = false;
      Object.assign(target, clamp(dragged, size), {scale: 1});
      return;
    }
    if (vw > 1100 && current === 'moon' && dock) {
      const r = dock.getBoundingClientRect();
      const tolerance = docked ? 24 : 0;
      if (r.top < vh * 0.5 + tolerance && r.bottom > vh * 0.55 - tolerance) {
        const scale = Math.min(1.7, r.width / size);
        const x = r.left + (r.width - size * scale) / 2;
        const y = Math.min(r.bottom - size * scale - 64, Math.max(r.top + 144, vh * 0.48));
        docked = true;
        Object.assign(target, clamp({x, y}, size * scale), {scale});
        return;
      }
    }
    const side = mobile ? 'right' : SECTIONS[current].side;
    docked = false;
    const margin = mobile ? 12 : Math.max(12, Math.min(40, (vw - 1240) / 2 - size));
    const x = side === 'right' ? vw - size - margin : margin;
    const y = mobile ? vh - size - 10 : vh * 0.57;
    Object.assign(target, clamp({x, y}, size), {scale: 1});
  }

  function update() {
    if (drag) return;
    const id = activeSection();
    if (id !== current) {
      current = id;
      if (enabled && !chat.isOpen()) say(SECTIONS[id].line, SECTIONS[id].pose);
      else root.dataset.pose = SECTIONS[id].pose;
    }
    computeTarget();
  }

  function paint() {
    root.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
    root.style.setProperty('--s', pos.scale.toFixed(3));
    root.style.setProperty('--pip-x', `${pos.x.toFixed(1)}px`);
    const side = sideNow();
    if (root.dataset.side !== side) root.dataset.side = side;
  }

  let dirty = false, frameId = 0, lastFrame = 0;
  function scheduleFrame() {
    if (!frameId) frameId = requestAnimationFrame(frame);
  }
  function scheduleUpdate() {
    dirty = true;
    scheduleFrame();
  }

  function frame(now) {
    frameId = 0;
    if (dirty) {
      dirty = false;
      update();
    }
    let moving = false;
    if (!drag) {
      // Use elapsed time so the travel speed is independent of the display refresh rate.
      const dt = lastFrame ? Math.min(now - lastFrame, 50) : 16;
      const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-dt / 180);
      for (const key of ['x', 'y', 'scale']) {
        const distance = target[key] - pos[key];
        const limit = key === 'scale' ? Infinity : dt * 1.4;
        if (Math.abs(distance) < 0.01 || reducedMotion.matches) {
          pos[key] = target[key];
        } else {
          pos[key] += Math.sign(distance) * Math.min(Math.abs(distance) * blend, limit);
          moving = true;
        }
      }
    }
    paint();
    lastFrame = moving ? now : 0;
    if (moving) scheduleFrame();
  }

  addEventListener('scroll', scheduleUpdate, {passive: true});
  addEventListener('resize', scheduleUpdate);
  const layout = new ResizeObserver(scheduleUpdate);
  for (const section of sections.values()) layout.observe(section);
  if (dock) layout.observe(dock);
  update(); Object.assign(pos, target); paint();

  return {
    start() {
      current = activeSection(); computeTarget();
      Object.assign(pos, target); paint();
      enabled = true; root.classList.remove('hidden');
      say(SECTIONS[current].line, SECTIONS[current].pose);
    },
    say,
    chat,
  };
}
