// Data-driven campaign engine. Campaign JSON lives in /public/campaigns/*.json.
// The engine is deterministic: replaying the same list of choice ids reproduces the same run,
// which lets a report be shared as a URL hash.
import { asset } from '../three/common.js';

const cache = {};
export async function loadIndex() {
  if (cache.index) return cache.index;
  const idx = await (await fetch(asset('campaigns/index.json'))).json();
  cache.index = await Promise.all(idx.campaigns.map(async (c) => ({ ...c, data: await loadCampaign(c.id, c.file) })));
  return cache.index;
}
export async function loadCampaign(id, file = `${id}.json`) {
  if (!cache[id]) cache[id] = await (await fetch(asset('campaigns/' + file))).json();
  return cache[id];
}

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export class Game {
  constructor(campaign) {
    this.c = campaign;
    this.g = { ...campaign.start.gauges };
    this.env = { light: 1, tilt: 0, frost: 0, storm: 0, ...(campaign.start.env || {}) };
    this.sol = campaign.start.sol || 0;
    this.i = 0; // index of current event
    this.history = []; // {event, choice}
    this.facts = [];
    this.science = 0; // science-return points from choices (game model)
    this.ending = null;
  }
  get event() { return this.c.events[this.i]; }
  get total() { return this.c.events.length; }
  // called when an event begins: advances time, applies drift & environment
  enter() {
    const e = this.event; if (!e) return null;
    this.sol = e.sol;
    if (e.drift) this.apply(e.drift);
    this.env.storm = e.storm ? 1 : 0;
    if (e.env) Object.assign(this.env, e.env);
    if (e.night) this.env.light = Math.min(this.env.light, 0.1);
    this.updateTemp();
    return e;
  }
  apply(eff) {
    for (const [k, v] of Object.entries(eff)) if (k in this.g && k !== 'temp') this.g[k] = clamp(this.g[k] + v);
  }
  // Temperature is a derived game-model value: colder when power, light or the season drop.
  updateTemp() {
    const base = this.c.start.gauges.temp ?? -20;
    const dark = this.c.body === 'moon' ? 150 : 70; // airless Moon cools far more at night
    const t = base - (1 - this.env.light) * dark - this.env.storm * 12 - this.env.frost * 25 - (this.g.battery < 25 ? (25 - this.g.battery) * 1.2 : 0);
    this.g.temp = Math.round(Math.max(-170, t));
  }
  choose(choiceId) {
    const e = this.event; const ch = e.choices.find((c) => c.id === choiceId) || e.choices[0];
    this.history.push({ event: e, choice: ch });
    if (ch.effects) this.apply(ch.effects);
    this.science += ch.science || 0;
    if (ch.env) Object.assign(this.env, ch.env);
    this.updateTemp();
    if (ch.fact && !this.facts.some((f) => f.title === ch.fact.title)) this.facts.push({ ...ch.fact, event: e.title });
    let end = null;
    if (ch.fail) end = ch.fail;
    else if (this.g.battery <= 0) end = 'battery';
    else if (this.g.integrity <= 0) end = 'integrity';
    else if (e.final) end = 'real_end';
    if (end) this.finish(end);
    return { choice: ch, ending: this.ending };
  }
  next() { if (this.ending) return null; this.i++; return this.enter(); }
  finish(id) {
    const def = this.c.endings[id] || this.c.endings.battery || { title: 'Signal lost', text: '' };
    this.ending = { id, ...def, sol: def.sol ?? this.sol, success: id === 'real_end' };
  }
  get matches() { return this.history.filter((h) => h.choice.real).length; }
  score() {
    const rec = this.c.record.value || 1; const sols = this.ending?.sol ?? this.sol;
    const survival = Math.min(1, sols / rec);
    const match = this.matches / this.total;
    const pts = Math.max(0, Math.round(survival * 700 + match * 200 + this.facts.length * 25 + this.science * 10));
    const vsPlan = this.c.plan.value ? sols / this.c.plan.value : 1;
    let rank = 'Trainee operator';
    if (survival >= 1) rank = 'Flight director'; else if (survival >= 0.7) rank = 'Senior controller'; else if (survival >= 0.4) rank = 'Console operator';
    return { pts, sols, survival, match, vsPlan, rank };
  }
  // share token: campaign id + choice ids
  token() {
    const o = { c: this.c.id, ch: this.history.map((h) => h.choice.id) };
    return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  static parseToken(t) {
    try { const s = t.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return null; }
  }
  static replay(campaign, choiceIds) {
    const g = new Game(campaign); g.enter();
    for (const id of choiceIds) { if (g.ending) break; g.choose(id); if (!g.ending) g.next(); }
    return g;
  }
}

// Persistent archive of unlocked science facts (localStorage).
const AKEY = 'lfis-archive';
export const archive = {
  all() { try { return JSON.parse(localStorage.getItem(AKEY)) || {}; } catch { return {}; } },
  add(campaignId, facts) { const a = this.all(); a[campaignId] = Array.from(new Set([...(a[campaignId] || []), ...facts.map((f) => f.title)])); localStorage.setItem(AKEY, JSON.stringify(a)); return a; },
  best(campaignId, sols) { const k = 'lfis-best-' + campaignId; const b = +localStorage.getItem(k) || 0; if (sols != null && sols > b) localStorage.setItem(k, sols); return Math.max(b, sols || 0); },
};
