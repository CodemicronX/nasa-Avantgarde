import { scrollToEl } from '../motion.js';
// Survival Simulator UI: menu → intro → HUD (3D craft + gauges + events) → report & legacy.
import { Game, loadIndex, loadCampaign, archive } from './engine.js';
import { sfx, isMuted, setMuted } from './audio.js';
import { ModelViewer } from '../three/viewer.js';
import { asset, webglAvailable } from '../three/common.js';
import { createMap } from '../atlas.js';

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GAUGES = [
  ['battery', 'Battery', '%', (v) => v < 25],
  ['temp', 'Temperature', '°C', (v) => v < -90],
  ['dust', 'Panel dust', '%', (v) => v > 60],
  ['integrity', 'System integrity', '%', (v) => v < 35],
];
const unitLabel = (c, n) => `${c.unit === 'sol' ? 'Sol' : 'Day'} ${n}`;
const units = (c) => (c.unit === 'sol' ? 'sols' : 'Earth days');
const srcLink = (s) => (s ? `<span class="src-link">Source: <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></span>` : '');

export class SimulatorUI {
  constructor({ consoleEl, body, title, btnSound, btnMenu, live }) {
    Object.assign(this, { consoleEl, body, title, btnSound, btnMenu, live });
    this.viewer = null; this.map = null; this.timers = [];
    this.syncSound();
    btnSound.addEventListener('click', () => { setMuted(!isMuted()); this.syncSound(); if (!isMuted()) sfx.beep(); });
    btnMenu.addEventListener('click', () => this.menu());
    this.consoleEl.addEventListener('keydown', (e) => this.onKey(e));
  }
  syncSound() { const m = isMuted(); this.btnSound.setAttribute('aria-pressed', String(!m)); this.btnSound.textContent = m ? '🔇 MUTED' : '🔊 SOUND'; }
  say(t) { this.live.textContent = ''; setTimeout(() => { this.live.textContent = t; }, 50); }
  clear() {
    this.timers.forEach(clearTimeout); this.timers = [];
    if (this.viewer) { this.viewer.dispose(); this.viewer = null; }
    if (this.map) { this.map.map.remove(); this.map = null; }
    this.atmosphere({ storm: 0 });
    this.body.innerHTML = '';
  }
  atmosphere({ storm = 0, night = 0 } = {}) {
    this.consoleEl.style.setProperty('--haze', storm ? 0.42 : 0);
    this.consoleEl.classList.toggle('flicker', !!storm && !reduced);
    this.consoleEl.classList.toggle('night', !!night);
  }
  onKey(e) {
    if (e.target.closest('input, textarea')) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) { const b = this.body.querySelectorAll('.choices .choice:not([disabled]), .camp-grid .camp')[n - 1]; if (b) { e.preventDefault(); b.click(); } }
    if (e.key === 'Enter' && this.skipIntro) { e.preventDefault(); this.skipIntro(); }
  }

  // ---------------- MENU ----------------
  async menu() {
    this.clear(); this.btnMenu.hidden = true; this.consoleEl.dataset.state = 'menu';
    this.title.textContent = 'MISSION CONTROL TERMINAL · SELECT CAMPAIGN';
    const list = await loadIndex(); const arc = archive.all();
    const unlocked = Object.values(arc).reduce((a, b) => a + b.length, 0);
    this.body.innerHTML = `
      <p class="t-h glow">&gt; SELECT A MISSION_</p>
      <p class="t-sub">Three real NASA spacecraft. Three real last chapters. Your job: keep each one alive as long as the real engineers did. Use the mouse or the number keys <kbd>1</kbd>–<kbd>3</kbd>.</p>
      <div class="camp-grid">${list.map(({ id, status, data: c }) => {
        const best = archive.best(id);
        return `<button class="camp" data-id="${id}" aria-label="Start campaign: ${esc(c.title)}">
          ${c.cover?.src ? `<img src="${asset(c.cover.src)}" alt="" loading="lazy" />` : `<div class="camp-art ${c.body}" aria-hidden="true"></div>`}
          ${c.cover?.credit ? `<span class="credit">${esc(c.cover.credit)}</span>` : ''}
          <div class="c-body"><span class="tag">${esc(c.difficulty || '')} · ${esc(c.body.toUpperCase())} · ${esc(c.year)}${status === 'short' ? ' · short' : ''}</span>
          <h3>${esc(c.title)}</h3><p>${esc(c.subtitle)}</p>
          <span class="tag">Plan: ${c.plan.value} ${units(c)} · Record: ${c.record.value} ${units(c)}</span><br/>
          ${best ? `<span class="best">Your best: ${best} ${units(c)}</span>` : ''}</div></button>`; }).join('')}
      </div>
      ${unlocked ? `<p class="t-sub" style="margin-top:1.2rem">Science archive: ${unlocked} hidden fact${unlocked > 1 ? 's' : ''} unlocked so far.</p>` : ''}`;
    this.body.querySelectorAll('.camp').forEach((b, i) => b.addEventListener('click', () => { sfx.select(); this.start(list[i].data); }));
  }

  // ---------------- INTRO ----------------
  start(c) {
    this.clear(); this.c = c; this.btnMenu.hidden = false; this.consoleEl.dataset.state = 'intro';
    this.title.textContent = `MISSION CONTROL · ${c.craft.toUpperCase()}`;
    this.body.innerHTML = `<div class="intro-lines" id="intro"></div><div class="next-row"><button class="tbtn big solid" id="go">▶ TAKE THE CONSOLE</button><button class="tbtn big" id="skip">SKIP ⏭</button></div>`;
    const box = this.body.querySelector('#intro'); const lines = c.intro || [];
    this.say(`${c.title}. ${lines.join(' ')}`);
    let li = 0, ci = 0, p = null; let done = false;
    const finish = () => { done = true; this.timers.forEach(clearTimeout); box.innerHTML = lines.map((l) => `<p>${esc(l)}</p>`).join(''); this.skipIntro = null; };
    const type = () => {
      if (done) return;
      if (li >= lines.length) { p?.classList.remove('caret'); this.skipIntro = null; return; }
      if (!p) { p = document.createElement('p'); p.className = 'caret'; box.appendChild(p); }
      p.textContent = lines[li].slice(0, ++ci); if (ci % 3 === 0) sfx.key();
      if (ci >= lines[li].length) { p.classList.remove('caret'); p = null; li++; ci = 0; this.timers.push(setTimeout(type, 380)); }
      else this.timers.push(setTimeout(type, 16));
    };
    if (reduced) finish(); else type();
    this.skipIntro = finish;
    this.body.querySelector('#skip').onclick = finish;
    this.body.querySelector('#go').onclick = () => { this.skipIntro = null; this.play(new Game(c)); };
    this.body.querySelector('#go').focus({ preventScroll: true });
  }

  // ---------------- HUD ----------------
  play(game) {
    this.clear(); this.game = game; const c = game.c; this.consoleEl.dataset.state = 'play';
    this.body.innerHTML = `
      <div class="hud">
        <div class="hud-left">
          <div class="panel">
            <p class="panel-title"><span>Spacecraft · live 3D</span><span id="env-label"></span></p>
            <div class="craft-view" id="craft" role="img" aria-label="3D model of ${esc(c.craft)}"></div>
            <p class="credit">${esc(c.model.credit || '')} · drag to rotate</p>
          </div>
          <div class="panel" style="margin-top:1rem">
            <p class="panel-title"><span>Telemetry (game model)</span><span id="progress"></span></p>
            <div class="sol-counter"><b id="sol"></b><span id="sol-sub"></span></div>
            <div class="gauges" id="gauges">${GAUGES.map(([k, l]) => `<div class="gauge" data-k="${k}"><div class="g-top"><span>${l}</span><span class="g-val"></span></div><div class="bar" role="meter" aria-label="${l}" aria-valuemin="${k === 'temp' ? -170 : 0}" aria-valuemax="${k === 'temp' ? 40 : 100}"><i></i></div></div>`).join('')}</div>
            <ul class="telemetry" id="tele" style="margin-top:.8rem"></ul>
          </div>
        </div>
        <div class="hud-right"><div class="panel event-card" id="event"></div></div>
      </div>`;
    const craft = this.body.querySelector('#craft');
    if (webglAvailable()) {
      this.viewer = new ModelViewer(craft, { ground: c.body === 'moon' ? 'moon' : 'mars', autoRotate: !reduced });
      this.viewer.load(c.model.src ? { src: c.model.src, fallback: c.model.rover ? 'lander' : 'lander' } : { proc: c.model.proc });
    } else craft.innerHTML = '<p class="credit" style="padding:1rem">3D is not available in this browser; the game works without it.</p>';
    game.enter(); this.renderEvent();
  }
  describeCraft() {
    const g = this.game.g, e = this.game.env;
    const parts = [`${this.game.c.craft}`, `panels ${g.dust > 60 ? 'heavily' : g.dust > 30 ? 'partly' : 'lightly'} covered in dust`];
    if (e.storm) parts.push('a dust storm is blowing'); if (e.light < 0.3) parts.push('it is dark'); if (e.frost > 0.3) parts.push('frost on the hardware'); if (e.tilt) parts.push(`tilted ${e.tilt}°`);
    return '3D model: ' + parts.join(', ') + '.';
  }
  renderGauges() {
    const { g, env, c } = this.game;
    GAUGES.forEach(([k, , u, warn]) => {
      const el = this.body.querySelector(`.gauge[data-k="${k}"]`); if (!el) return; const v = g[k];
      el.querySelector('.g-val').textContent = `${v}${u}`;
      const pct = k === 'temp' ? ((v + 170) / 210) * 100 : v;
      el.querySelector('i').style.width = Math.max(0, Math.min(100, pct)) + '%';
      el.querySelector('.bar').setAttribute('aria-valuenow', v);
      el.classList.toggle('warn', warn(v));
    });
    this.body.querySelector('#sol').textContent = unitLabel(c, this.game.sol);
    this.body.querySelector('#sol-sub').textContent = `plan ${c.plan.value} · record ${c.record.value}`;
    this.body.querySelector('#progress').textContent = `EVENT ${Math.min(this.game.i + 1, this.game.total)}/${this.game.total}`;
    this.body.querySelector('#env-label').textContent = env.storm ? 'DUST STORM' : env.light < 0.3 ? 'NIGHT' : env.frost > 0.3 ? 'WINTER' : env.tilt ? 'TILTED ' + env.tilt + '°' : 'NOMINAL';
    this.viewer?.setState({ dust: g.dust ?? 0, light: env.light, tilt: env.tilt || 0, frost: env.frost || 0, storm: env.storm || 0 });
    this.body.querySelector('#craft').setAttribute('aria-label', this.describeCraft());
    this.atmosphere({ storm: env.storm, night: env.light < 0.3 });
  }
  renderEvent() {
    const e = this.game.event; const c = this.game.c; this.renderGauges();
    const tele = this.body.querySelector('#tele');
    tele.innerHTML = (e.telemetry || []).map((t) => `<li class="${t.startsWith('!') ? 'alert' : ''}">${esc(t.replace(/^!+\s*/, ''))}</li>`).join('');
    const box = this.body.querySelector('#event');
    box.innerHTML = `<span class="event-date">${esc(unitLabel(c, e.sol))} · ${esc(e.date || '')}</span><h3 tabindex="-1">${esc(e.title)}</h3><p>${esc(e.text)}</p>
      <p class="panel-title" style="margin-top:1rem"><span>Your decision</span><span>${e.choices.length > 1 ? `keys 1–${e.choices.length}` : 'key 1'}</span></p>
      <div class="choices">${e.choices.map((ch, i) => `<button class="choice" data-id="${ch.id}"><span class="k">[${i + 1}]</span>${esc(ch.label)}</button>`).join('')}</div><div id="result"></div>`;
    box.querySelector('h3').focus({ preventScroll: true });
    this.say(`${unitLabel(c, e.sol)}. ${e.title}. ${e.text} ${e.choices.length} options.`);
    if (e.storm) sfx.alarm(); else sfx.beep();
    if (/marsquake|quake/i.test(e.title + e.text) || e.quake) { this.viewer?.quake(); sfx.quake(); }
    box.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => this.decide(b.dataset.id)));
  }
  decide(id) {
    const box = this.body.querySelector('#event'); box.querySelectorAll('.choice').forEach((b) => { b.disabled = true; if (b.dataset.id === id) b.classList.add('picked'); });
    const e = this.game.event; const { choice: ch, ending } = this.game.choose(id);
    this.renderGauges();
    const res = box.querySelector('#result');
    const ok = ch.real;
    res.innerHTML = `<div class="outcome ${ok ? '' : 'bad'}">
        <div class="verdict ${ok ? 'ok' : 'no'}">${ok ? '✓ Same decision as NASA' : '✗ Not what NASA did'}</div>
        <p>${esc(ch.outcome || '')}</p>${ch.science ? `<p class="sci ${ch.science > 0 ? 'up' : 'down'}">Science return (game model): ${ch.science > 0 ? '+' : ''}${ch.science}</p>` : ''}
        ${ch.image ? `<figure><img src="${asset(ch.image.src)}" alt="${esc(ch.image.alt || ch.image.caption || '')}" loading="lazy" /><figcaption class="credit">${esc(ch.image.credit || '')}</figcaption></figure>` : ''}
        ${srcLink(ch.source)}</div>
      ${ch.fact ? `<div class="fact"><b>🔓 Science unlocked: ${esc(ch.fact.title)}</b>${esc(ch.fact.text)}<br/>${srcLink(ch.fact.source)}</div>` : ''}
      <div class="next-row"><button class="tbtn big solid" id="next">${ending ? '▶ MISSION REPORT' : '▶ NEXT EVENT'}</button></div>`;
    ok ? sfx.good() : sfx.bad();
    this.say(`${ok ? 'Same decision as NASA.' : 'Not what NASA did.'} ${ch.outcome || ''} ${ch.fact ? 'Science unlocked: ' + ch.fact.title + '. ' + ch.fact.text : ''}`);
    const nx = res.querySelector('#next'); nx.focus({ preventScroll: true });
    nx.onclick = () => { if (ending) this.report(this.game); else { this.game.next(); this.renderEvent(); } };
  }

  // ---------------- REPORT & LEGACY ----------------
  report(game, { shared = false } = {}) {
    this.clear(); this.game = game; const c = game.c; const end = game.ending; const s = game.score();
    this.btnMenu.hidden = false; this.consoleEl.dataset.state = 'report';
    this.title.textContent = 'OFFICIAL MISSION CONTROL REPORT';
    if (!shared) { archive.add(c.id, game.facts); archive.best(c.id, s.sols); }
    end.success ? sfx.end() : sfx.bad();
    const max = Math.max(c.record.value, s.sols) * 1.05;
    const pos = (v) => (v / max) * 100;
    const deviated = game.history.length - game.matches;
    const L = c.legacy || {}; const W = L.where || {};
    const token = game.token(); const url = `${location.origin}${location.pathname}#report=${token}`;
    this.body.innerHTML = `<div class="report">
      <div class="report-head">
        <div class="stamp ${end.success ? 'ok' : ''}">${end.success ? 'MISSION COMPLETE' : 'SIGNAL LOST'}</div>
        <p class="t-h">${esc(end.title)}</p>
        <p class="t-sub" style="margin:0">${esc(c.craft)} · ended on ${esc(unitLabel(c, s.sols))}${shared ? ' · shared report' : ''}</p>
      </div>
      <p style="color:#cfcdf5">${esc(end.text)}${end.success && deviated ? ` (You took ${deviated} different decision${deviated > 1 ? 's' : ''} from NASA along the way and still made it.)` : ''}</p>
      <div class="score-row">
        <div class="panel"><b>${s.sols}</b><span>${units(c)} survived</span></div>
        <div class="panel"><b>${Math.round(s.vsPlan * 100)}%</b><span>of the plan (${c.plan.value} ${units(c)})</span></div>
        <div class="panel"><b>${game.matches}/${game.history.length}</b><span>decisions matching NASA</span></div>
        <div class="panel"><b>${game.science > 0 ? '+' : ''}${game.science}</b><span>science return (game model)</span></div>
        <div class="panel"><b>${game.facts.length}</b><span>hidden facts unlocked</span></div>
        <div class="panel"><b>${s.pts}</b><span>score · ${esc(s.rank)}</span></div>
      </div>
      <p class="panel-title"><span>Your run vs the plan and the real record</span></p>
      <div class="compare-bar" role="img" aria-label="You survived ${s.sols} ${units(c)}; the plan was ${c.plan.value}; the real record is ${c.record.value}.">
        <i style="width:${pos(s.sols)}%"></i>
        <div class="mark plan" style="left:${pos(c.plan.value)}%"><span>PLAN ${c.plan.value}</span></div>
        <div class="mark" style="left:${pos(c.record.value)}%"><span>NASA ${c.record.value}</span></div>
      </div>
      <h4 class="r-h">Real history vs your decisions</h4>
      <div class="table-wrap"><table class="diff"><thead><tr><th scope="col">${c.unit === 'sol' ? 'Sol' : 'Day'}</th><th scope="col">Event</th><th scope="col">Your call</th><th scope="col">What NASA did</th></tr></thead><tbody>
        ${c.events.map((e) => { const h = game.history.find((x) => x.event.id === e.id); const real = e.choices.find((x) => x.real);
          return `<tr><td>${e.sol}</td><td>${esc(e.title)}</td><td class="${h ? (h.choice.real ? 'm' : 'x') : ''}">${h ? (h.choice.real ? '✓ ' : '✗ ') + esc(h.choice.label) : '— (mission already over)'}</td><td>${esc(real?.label || '')}</td></tr>`; }).join('')}
      </tbody></table></div>
      ${c.epilogue ? `<div class="fact"><b>Epilogue</b>${esc(c.epilogue)}</div>` : ''}
      ${game.facts.length ? `<h4 class="r-h">Science you unlocked</h4>${game.facts.map((f) => `<div class="fact"><b>${esc(f.title)}</b>${esc(f.text)}<br/>${srcLink(f.source)}</div>`).join('')}` : ''}

      <h4 class="r-h">Legacy · where is it now?</h4>
      <div class="legacy-grid">
        <div><div class="legacy-map" id="legacy-map" aria-label="Map centred on the final resting place of ${esc(c.craft)}"></div>
          <p class="credit">${esc(W.label || '')} · ${W.coords ? `${W.coords[0].toFixed(4)}°, ${W.coords[1].toFixed(4)}° (planetocentric, east-positive)` : ''} · ${srcLink(W.coordSource)}</p></div>
        <div>${W.image ? `<figure class="legacy-img"><img src="${asset(W.image.src)}" alt="${esc(W.image.caption || '')}" loading="lazy" /><figcaption class="credit">${esc(W.image.caption || '')} ${esc(W.image.credit || '')} ${W.image.url ? `<a href="${esc(W.image.url)}" target="_blank" rel="noopener">source</a>` : ''}</figcaption></figure>` : ''}
          <div class="panel" style="margin-top:.6rem"><p class="panel-title"><span>Current state</span></p><p style="margin:0;color:#cfcdf5;font-size:.9rem">${esc(W.state || '')}</p></div></div>
      </div>
      <div class="legacy-grid">
        <div class="panel"><p class="panel-title"><span>Timeline (real)</span></p><ul class="timeline">${(L.timeline || []).map(([d, t]) => `<li><b>${esc(d)}</b>${esc(t)}</li>`).join('')}</ul></div>
        <div class="panel"><p class="panel-title"><span>What’s left inside</span></p>${(L.inside || []).map((x) => `<div style="margin-bottom:.7rem"><b style="color:#ffd08a">${esc(x.title)}</b><p style="margin:.2rem 0;color:#cfcdf5;font-size:.88rem">${esc(x.text)}</p>${srcLink(x.source)}</div>`).join('')}</div>
      </div>
      ${(L.sources || []).length ? `<p class="panel-title" style="margin-top:1rem"><span>Campaign sources</span></p><ul class="srcs dark">${L.sources.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a></li>`).join('')}</ul>` : ''}
      <p class="panel-title" style="margin-top:1.2rem"><span>Share this report</span></p>
      <div class="share-box"><input id="share" readonly value="${esc(url)}" aria-label="Shareable report link" /><button class="tbtn" id="copy">COPY LINK</button></div>
      <div class="next-row"><button class="tbtn big solid" id="again">⟲ REPLAY ${esc(c.title.split(':')[0].toUpperCase())}</button><button class="tbtn big" id="menu2">CHOOSE ANOTHER MISSION</button><a class="tbtn big" href="#atlas" data-atlas="${c.body}">SEE IT ON THE ATLAS</a></div>
    </div>`;
    if (!shared) history.replaceState(null, '', '#report=' + token);
    this.say(`Mission report. ${end.title}. You survived ${s.sols} ${units(c)}. The plan was ${c.plan.value} and the real record is ${c.record.value}. ${game.matches} of ${game.history.length} decisions matched NASA.`);
    this.body.querySelector('#copy').onclick = async () => { const i = this.body.querySelector('#share'); try { await navigator.clipboard.writeText(i.value); } catch { i.select(); document.execCommand('copy'); } this.body.querySelector('#copy').textContent = 'COPIED ✓'; };
    this.body.querySelector('#again').onclick = () => this.start(c);
    this.body.querySelector('#menu2').onclick = () => this.menu();
    this.body.querySelector('[data-atlas]').onclick = () => document.dispatchEvent(new CustomEvent('atlas:show', { detail: { body: c.body, id: c.id } }));
    if (W.coords) {
      const el = this.body.querySelector('#legacy-map');
      requestAnimationFrame(() => { this.map = createMap(el, c.body, { markers: [{ id: null, name: W.label, coords: W.coords, summary: W.state, found: false }], center: W.coords, zoom: c.body === 'moon' ? 7 : 6, big: true }); setTimeout(() => this.map?.map.invalidateSize(), 300); });
    }
    scrollToEl(this.body, !reduced);
  }
  async openShared(token) {
    const t = Game.parseToken(token); if (!t) return false;
    try { const c = await loadCampaign(t.c); const g = Game.replay(c, t.ch || []); if (!g.ending) return false; this.report(g, { shared: true }); return true; } catch { return false; }
  }
}
