// SGP4 propagation off the main thread. Main asks for a frame ~3x per second while the globe is visible.
import * as sat from 'satellite.js';

const R = 6371;
let lastSpecial = {};
let groups = [], special = [], hidden = new Set(), stride = 1, total = 0;

function parse(data) {
  groups = []; total = 0;
  for (const [key, g] of Object.entries(data.groups)) {
    const recs = [];
    g.tle.forEach(([name, l1, l2], i) => { if (i % stride) return; try { recs.push({ name, rec: sat.twoline2satrec(l1, l2) }); } catch { /* bad TLE */ } });
    groups.push({ key, label: g.label, recs, tracked: g.tle.length, offset: total }); total += recs.length;
  }
  if (data.special && Object.keys(data.special).length) lastSpecial = data.special;
  special = [];
  for (const [name, l] of Object.entries(lastSpecial)) { try { special.push({ name, rec: sat.twoline2satrec(l[1], l[2]) }); } catch { /* skip */ } }
  return {
    groups: groups.map((g) => ({ key: g.key, label: g.label, offset: g.offset, n: g.recs.length, tracked: g.tracked, names: g.recs.map((r) => r.name), ids: g.recs.map((r) => r.rec.satnum) })),
    special: special.map((s) => s.name), total,
  };
}

function frame() {
  const now = new Date(), gmst = sat.gstime(now);
  const pos = new Float32Array(total * 3), counts = {};
  for (const g of groups) {
    let n = 0; const off = hidden.has(g.key);
    for (let i = 0; i < g.recs.length; i++) {
      const pv = sat.propagate(g.recs[i].rec, now), p = pv && pv.position;
      if (!p || isNaN(p.x)) continue; n++;
      if (off) continue; // stays at 0,0,0 = hidden inside the Earth
      const j = (g.offset + i) * 3; pos[j] = p.y / R; pos[j + 1] = p.z / R; pos[j + 2] = p.x / R;
    }
    counts[g.key] = n;
  }
  const sp = special.map((s) => { const pv = sat.propagate(s.rec, now); if (!pv?.position) return null; const p = pv.position; return [p.y / R, p.z / R, p.x / R, sat.eciToGeodetic(p, gmst).height]; });
  postMessage({ type: 'frame', pos, counts, sp, gmst }, [pos.buffer]);
}

function parseTle(txt) {
  const l = txt.split(/\r?\n/).filter((x) => x.trim()), out = [];
  for (let i = 0; i + 2 < l.length + 1; i += 3) if (l[i + 2]) out.push([l[i].trim(), l[i + 1], l[i + 2]]);
  return out;
}

self.onmessage = async ({ data: m }) => {
  try {
    if (m.type === 'load') {
      stride = m.stride || 1;
      const data = m.data || await (await fetch(m.url)).json();
      postMessage({ type: 'meta', meta: parse(data), fetched: data.fetched || null, raw: m.wantRaw ? data : undefined });
      frame();
    } else if (m.type === 'live') {
      const out = { groups: {}, special: m.special || {}, fetched: new Date().toISOString() };
      for (const [g, label] of m.groups) {
        const tle = parseTle(await (await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=tle`)).text());
        if (!tle.length) throw new Error('empty');
        out.groups[g] = { label, tle };
      }
      postMessage({ type: 'meta', meta: parse(out), fetched: out.fetched, raw: out, live: true });
      frame();
    } else if (m.type === 'hidden') { hidden = new Set(m.keys); frame(); }
    else if (m.type === 'tick') frame();
  } catch (e) { postMessage({ type: 'error', op: m.type, message: String(e?.message || e) }); }
};
