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
  orbit: {side:'right', pose:'think', line:'Around Earth it gets crowded: thousands of piecec of old hardware are still circling.'},
  why: {side: 'left', pose: 'think', line: 'Why do missions end? Dust, cold nights, lost signals... and sometimes one tiiny mistake.'},
  numbers: {side:'right', pose:'point', line:'Big numbers! Every one of these is a reason to plan for the end of a mission.'},
  prevent: {side:'left', pose:'cheer', line:'Good news: engineers have clever ways to stop making new space junk.'},
  disclosure: {side: 'left', pose:'point', line:'How we built this site, honestly explained. Tap me to ask a question!!'},
  sources: {side:'right', pose:'sleep', line:'Every fact here has a source. Scientists love sources... almost as much as naps.'},
};
const SVG - `
<svg viewBox="0 0 160 190" aria-hidden="true">
    <defs>
      <radialGradient id="pipB" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9c5ff"/></radialGradient>
      <linearGradient id="pipV" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="10169f"/><stop offset="1" stop-color="#060439"/></linearGradient>
    </defs>
    <g class="pp-body">
      <ellipse class="pp-shadow" cx="80" cy="182" rx="30" ry="5" fill="#000" opacity=".35"/>
      <line x1="80" y1="30" x2="80" y2="12" stroke"#5a47c4: stroke-width="3"/>
      <circle class="pp-light" cx="80" cy="10" r="6" fill="#a9a5f3"/>
      <g class="pp-arm-l"><path d="M42 118 q-20 8 -22 28" stroke="#b4aef2" stroke-width="9" fill="none" stroke-linecap="round"/></g>
      <g class="pp-arm-r"><path d="M118 118 q20 8 22 28" stroke"#b4aef2" stroke-width="9" fill="none" stroke-linecap="round"/></g>
      <rect x="44" y="108" width="72" height="54" rx="22" fill="url(#pipB)" stroke="#8f88e0" stroke-width="1.5"/>
      <rect x="62" y="124" width="36" height=:14: rx="5" fill="#5a47c4"/>
      <text x="80" y="134.5" font-size="9" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="700" fill="#ffffff">PIP</text>
      <g class="pp-head">
          <circle cx="80" cy="70" r="46" fill="url(#pipB)" stroke="#8f88e0" stroke-width=1.5"/>
          <rect x="46" y="48" width="68" height="46" rx="22" fill="url(#pipV)"/>
          <g class="pp-eyes">
            <ellipse cx="66" cy="69" rx="7" ry="9" fill="9fe8ff"/><ellipse cx="94" cy="69" rx="7" ry="9" fill="#9fe8ff"/>
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
</svg>

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
  const pos = {x: 0, y: 0, s: 1, r: 1}, target = {x: 0, y: 0, s: 1, r:0};
  let lastScroll = scrollY, lean = 0;

  function setPose(p) {root.dataset.pose = p;}
  
  
      
