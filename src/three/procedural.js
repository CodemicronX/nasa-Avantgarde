// Procedural reconstructions for objects without an official NASA GLB.
import * as THREE from 'three';

import * as P from './pbr.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.3, ...o });
const gold = () => P.foil();
const silver = () => P.alu();
const panel = () => P.cells();
const white = () => P.paint();

function cyl(r1, r2, h, mat, seg = 24) { return new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); }
function box(x, y, z, mat) { return new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat); }
function rod(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a); const m = cyl(r, r, d.length(), mat, 8);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}

const builders = {
  vanguard() {
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), silver()));
    const dirs = [[1, 0.3, 0], [-1, 0.3, 0], [0, 0.3, 1], [0, 0.3, -1], [0.7, -0.6, 0.7], [-0.7, -0.6, -0.7]];
    dirs.forEach((d) => { const v = new THREE.Vector3(...d).normalize(); g.add(rod(v.clone().multiplyScalar(0.45), v.clone().multiplyScalar(1.5), 0.012, silver())); });
    for (let i = 0; i < 6; i++) { const p = box(0.12, 0.12, 0.02, panel()); const v = new THREE.Vector3().setFromSphericalCoords(0.5, Math.PI / 2 + (i % 2 ? .5 : -.5), i * Math.PI / 3); p.position.copy(v); p.lookAt(v.clone().multiplyScalar(2)); g.add(p); }
    return g;
  },
  lander() {
    const g = new THREE.Group(); const body = cyl(0.55, 0.65, 0.45, gold(), 8); body.position.y = 0.6; g.add(body);
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), silver()); tank.position.y = 0.95; g.add(tank);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const foot = new THREE.Vector3(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05);
      g.add(rod(new THREE.Vector3(Math.cos(a) * .5, .5, Math.sin(a) * .5), foot, 0.03, silver())); const pad = cyl(.12, .12, .03, silver()); pad.position.copy(foot); g.add(pad); }
    const p = box(1.2, 0.02, 0.5, panel()); p.position.set(0, 0.86, 0.75); p.rotation.x = -0.4; g.add(p);
    const n = cyl(.06, .16, .2, M(0x333333)); n.position.y = .3; g.add(n); return g;
  },
  orbiter() {
    const g = new THREE.Group(); g.add(box(0.8, 0.9, 0.8, gold()));
    [-1, 1].forEach((s) => { const p = box(1.6, 0.03, 0.7, panel()); p.position.x = s * 1.25; g.add(p); g.add(rod(new THREE.Vector3(s * .4, 0, 0), new THREE.Vector3(s * .45, 0, 0), .02, silver())); });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 12, 0, Math.PI * 2, 0, 0.6), white()); dish.material.side = THREE.DoubleSide; dish.position.y = .9; dish.rotation.x = Math.PI; g.add(dish); return g;
  },
  mco() { const g = builders.orbiter(); g.children.forEach((c) => { if (c.geometry?.parameters?.width === 1.6) { c.scale.set(1.3, 1, 1); } }); return g; },
  beagle() {
    const g = new THREE.Group(); const base = cyl(0.5, 0.55, 0.22, gold(), 32); g.add(base);
    for (let i = 0; i < 5; i++) { const petal = cyl(0.33, 0.33, 0.03, panel(), 32); const a = i * (Math.PI * 2 / 5); const deployed = i < 3;
      petal.position.set(Math.cos(a) * (deployed ? .8 : .35), deployed ? .02 : .3, Math.sin(a) * (deployed ? .8 : .35)); if (!deployed) { petal.rotation.z = Math.cos(a) * 1.2; petal.rotation.x = Math.sin(a) * -1.2; } g.add(petal); }
    return g;
  },
  schiaparelli() {
    const g = new THREE.Group(); const shield = cyl(0.2, 1.0, 0.3, M(0xb55a2c), 48); g.add(shield);
    const top = cyl(0.8, 0.85, 0.25, white(), 48); top.position.y = .27; g.add(top); return g;
  },
  envisat() {
    const g = new THREE.Group(); g.add(box(2.2, 0.9, 0.9, gold()));
    const p = box(0.05, 3.2, 1.1, panel()); p.position.set(-1.8, 0.6, 0); p.rotation.z = 0.3; g.add(p);
    const sar = box(1.6, 0.06, 0.5, white()); sar.position.set(0.3, -0.6, 0); g.add(sar); return g;
  },
  philae() {
    const g = new THREE.Group(); const b = cyl(0.55, 0.55, 0.5, M(0x2b2b2b), 6); b.position.y = .55; g.add(b);
    const top = cyl(.55, .55, .02, panel(), 6); top.position.y = .81; g.add(top);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; g.add(rod(new THREE.Vector3(Math.cos(a) * .3, .35, Math.sin(a) * .3), new THREE.Vector3(Math.cos(a) * .9, 0, Math.sin(a) * .9), .03, silver())); }
    return g;
  },
  debris() {
    const g = new THREE.Group();
    for (let i = 0; i < 26; i++) { const geo = new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.22, 0); const m = new THREE.Mesh(geo, i % 3 ? silver() : gold());
      m.position.set((Math.random() - .5) * 2.4, (Math.random() - .5) * 1.4, (Math.random() - .5) * 2.4); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.add(m); }
    return g;
  },
  golf() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 3), white()); b.position.y = .4; g.add(b); const b2 = b.clone(); b2.position.set(1, .4, .4); g.add(b2); return g; },
  tape() {
    const g = new THREE.Group(); const reel = cyl(0.9, 0.9, 0.06, M(0x6b6b6b, { metalness: .8 }), 48); reel.rotation.x = Math.PI / 2; g.add(reel);
    const tape = cyl(0.65, 0.65, 0.05, M(0x3a2a1a), 48); tape.rotation.x = Math.PI / 2; tape.position.z = .01; g.add(tape);
    const hub = cyl(0.2, 0.2, 0.1, silver(), 24); hub.rotation.x = Math.PI / 2; g.add(hub); return g;
  },
  // Apollo Lunar Roving Vehicle, built in metres from the NSSDCA / Boeing figures:
  // 3.1 m long, 2.3 m wheelbase, 1.83 m track, 81.8 cm wheels of zinc-coated steel mesh with titanium chevrons.
  lrv() {
    const g = new THREE.Group(), al = P.alu(0.42), dark = P.darkAlu(), tube = (a, b, r = 0.018, m = al) => rod(new THREE.Vector3(...a), new THREE.Vector3(...b), r, m);
    const W = 0.409, track = 0.915, base = 1.15, deckY = 0.62;
    // chassis: three hinged aluminium sections, open frame with floor panels
    const deck = box(2.3, 0.06, 1.1, al); deck.position.y = deckY; g.add(deck);
    [-0.53, 0.53].forEach((z) => { const rail = box(2.5, 0.07, 0.05, al); rail.position.set(0, deckY + 0.02, z); g.add(rail); });
    // wheels + fenders + suspension
    const meshMat = P.mesh(0xb7b3a8); meshMat.alphaMap = meshMat.alphaMap.clone(); meshMat.alphaMap.repeat.set(7, 1); meshMat.alphaMap.needsUpdate = true;
    const chev = P.alu(0.3), fender = P.fiberglass();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * base, z = sz * track, w = new THREE.Group(); w.position.set(x, W, z);
      const tyre = cyl(W, W, 0.23, meshMat, 40); tyre.material = meshMat; tyre.rotation.x = Math.PI / 2; w.add(tyre);
      // titanium chevrons: thin strips lying flat on the tread
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, c = box(0.012, 0.045, 0.2, chev); c.position.set(Math.cos(a) * (W + 0.006), Math.sin(a) * (W + 0.006), 0); c.rotation.z = a; c.rotateX(0.5 * (i % 2 ? 1 : -1)); w.add(c); }
      const drum = cyl(W * 0.9, W * 0.9, 0.2, P.darkAlu(), 32); drum.rotation.x = Math.PI / 2; w.add(drum); // inner bump-stop frame
      const hub = cyl(0.11, 0.11, 0.26, dark, 20); hub.rotation.x = Math.PI / 2; w.add(hub);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(W * 0.62, 0.012, 6, 32), al); rim.position.z = sz * 0.11; w.add(rim);
      g.add(w);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(W + 0.07, W + 0.07, 0.3, 32, 1, true, Math.PI * 0.68, Math.PI * 0.64), fender);
      f.rotation.x = Math.PI / 2; f.position.set(x, W, z); g.add(f);
      g.add(tube([x - sx * 0.45, deckY - 0.03, sz * 0.5], [x, W, z - sz * 0.13], 0.025));
      g.add(tube([x - sx * 0.45, deckY - 0.18, sz * 0.5], [x, W - 0.05, z - sz * 0.13], 0.022));
    }
    // two seats: tubular frames with nylon webbing, side by side, behind the console
    const web = P.webbing();
    for (const z of [-0.3, 0.3]) {
      const seat = box(0.5, 0.03, 0.46, web); seat.position.set(-0.15, deckY + 0.2, z); g.add(seat);
      const back = box(0.03, 0.42, 0.46, web); back.position.set(-0.42, deckY + 0.42, z); back.rotation.z = 0.18; g.add(back);
      g.add(tube([-0.4, deckY, z - 0.22], [-0.4, deckY + 0.2, z - 0.22])); g.add(tube([-0.4, deckY, z + 0.22], [-0.4, deckY + 0.2, z + 0.22]));
      g.add(tube([0.1, deckY, z - 0.22], [0.1, deckY + 0.2, z - 0.22])); g.add(tube([0.1, deckY, z + 0.22], [0.1, deckY + 0.2, z + 0.22]));
      g.add(tube([-0.45, deckY + 0.6, z + 0.25], [0.05, deckY + 0.32, z + 0.25], 0.014));
      const foot = box(0.12, 0.02, 0.36, web); foot.position.set(0.55, deckY + 0.06, z); foot.rotation.z = -0.5; g.add(foot);
    }
    // control & display console with the T-handle hand controller
    const con = box(0.12, 0.42, 0.42, dark); con.position.set(0.42, deckY + 0.5, 0); con.rotation.z = -0.25; g.add(con);
    const face = box(0.01, 0.34, 0.34, P.black()); face.position.set(0.49, deckY + 0.52, 0); face.rotation.z = -0.25; g.add(face);
    g.add(tube([0.42, deckY, 0], [0.42, deckY + 0.3, 0], 0.03, dark));
    g.add(tube([0.12, deckY + 0.2, 0], [0.12, deckY + 0.42, 0], 0.012, dark)); const t = box(0.03, 0.03, 0.12, P.black()); t.position.set(0.12, deckY + 0.43, 0); g.add(t);
    // forward chassis: batteries and electronics under white thermal covers and mirror radiators
    const bat = box(0.55, 0.22, 0.95, P.paint(0xe6e3da)); bat.position.set(0.98, deckY + 0.14, 0); g.add(bat);
    [-0.25, 0.25].forEach((z) => { const r = box(0.48, 0.012, 0.36, P.mirror()); r.position.set(0.98, deckY + 0.26, z); g.add(r); });
    // rear: tool pallet / sample bag carrier
    const pal = box(0.5, 0.45, 0.95, al); pal.position.set(-1.05, deckY + 0.24, 0); g.add(pal);
    const bags = box(0.42, 0.3, 0.8, P.paint(0xcfd2d6)); bags.position.set(-1.05, deckY + 0.6, 0); g.add(bags);
    // communications: umbrella high-gain mesh dish (left) and helical low-gain antenna (right), TV camera on top
    g.add(tube([1.0, deckY + 0.26, -0.42], [1.05, deckY + 1.15, -0.42], 0.02));
    // umbrella mesh dish (ribs + fine mesh), pointed up toward Earth
    const dishM = new THREE.MeshStandardMaterial({ name: 'dish mesh', color: 0xdcdad3, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 8, 0, Math.PI * 2, Math.PI - 0.6, 0.6), dishM); dish.position.set(1.05, deckY + 1.05 + 0.5 * Math.cos(0.6), -0.42); dish.rotation.z = 0.45; g.add(dish);
    const feed = cyl(0.012, 0.012, 0.35, al, 6); feed.position.set(1.05, deckY + 1.25, -0.42); feed.rotation.z = 0.45; g.add(feed);
    g.add(tube([1.0, deckY + 0.26, 0.42], [1.0, deckY + 1.05, 0.42], 0.015));
    const helix = new THREE.Mesh(new THREE.TubeGeometry(new (class extends THREE.Curve { getPoint(t, v = new THREE.Vector3()) { return v.set(Math.cos(t * 40) * 0.035, t * 0.55, Math.sin(t * 40) * 0.035); } })(), 160, 0.005, 5), al);
    helix.position.set(1.0, deckY + 1.05, 0.42); g.add(helix);
    const camMast = tube([1.2, deckY + 0.26, 0.05], [1.2, deckY + 0.95, 0.05], 0.02); g.add(camMast);
    const cam = box(0.22, 0.14, 0.14, P.paint(0xf1efe8)); cam.position.set(1.22, deckY + 1.02, 0.05); g.add(cam);
    const lens = cyl(0.04, 0.05, 0.1, P.glass(), 16); lens.rotation.z = Math.PI / 2; lens.position.set(1.37, deckY + 1.02, 0.05); g.add(lens);
    g.add(tube([0.75, deckY + 0.05, -0.55], [0.75, deckY + 0.55, -0.55], 0.012)); // hand hold
    g.add(tube([0.75, deckY + 0.05, 0.55], [0.75, deckY + 0.55, 0.55], 0.012));
    return g;
  },
  // Surveyor: triangular aluminium tube frame (~3 m tall), three legs with crushable footpads,
  // solar panel + planar-array antenna on the mast, two thermal compartments, spherical tanks, TV camera.
  surveyor() {
    const g = new THREE.Group(), al = P.alu(0.4), tube = (a, b, r = 0.025) => rod(new THREE.Vector3(...a), new THREE.Vector3(...b), r, al);
    const tri = [0, 1, 2].map((i) => { const a = i * Math.PI * 2 / 3 + Math.PI / 2; return [Math.cos(a), Math.sin(a)]; });
    const ring = (r, y) => tri.map(([c, s]) => [c * r, y, s * r]);
    const lo = ring(0.55, 0.55), hi = ring(0.35, 1.25);
    for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; g.add(tube(lo[i], lo[j])); g.add(tube(hi[i], hi[j])); g.add(tube(lo[i], hi[i])); g.add(tube(lo[i], hi[j], 0.015)); }
    // legs with shock absorbers and footpads
    tri.forEach(([c, s], i) => {
      const foot = [c * 1.5, 0.08, s * 1.5]; g.add(tube(lo[i], foot, 0.035)); g.add(tube([c * 0.4, 0.95, s * 0.4], foot, 0.02));
      const pad = cyl(0.17, 0.12, 0.1, P.paint(0xdedbd2), 24); pad.position.set(...foot); pad.position.y = 0.05; g.add(pad);
      const crush = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.12), P.foil()); crush.position.set(c * 0.6, 0.48, s * 0.6); g.add(crush);
    });
    // thermal compartments: white boxes with mirror tops
    [[0.5, 0.95, 0.25, 0.5], [-0.42, 0.95, -0.32, -0.6]].forEach(([x, y, z, ry]) => { const b = box(0.48, 0.3, 0.38, P.paint()); b.position.set(x, y, z); b.rotation.y = ry; g.add(b); const m = box(0.48, 0.012, 0.38, P.mirror()); m.position.set(x, y + 0.16, z); m.rotation.y = ry; g.add(m); });
    // propellant tanks (three pairs) and main retro attach ring
    tri.forEach(([c, s]) => { const t = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), P.alu(0.25)); t.position.set(c * 0.3, 0.78, s * 0.3); g.add(t); const t2 = t.clone(); t2.scale.setScalar(0.8); t2.position.set(-s * 0.3, 0.78, c * 0.3); g.add(t2); });
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 36), al); ringM.rotation.x = Math.PI / 2; ringM.position.y = 0.6; g.add(ringM);
    tri.forEach(([c, s]) => { const v = cyl(0.04, 0.07, 0.14, P.black(), 12); v.position.set(c * 0.45, 0.47, s * 0.45); g.add(v); });
    // mast with solar panel and planar array antenna
    g.add(tube([0, 1.25, 0], [0, 2.75, 0], 0.03));
    const sp = box(0.86, 0.02, 0.98, P.cells(6, 7)); sp.position.set(0, 2.78, 0.22); sp.rotation.x = -0.55; g.add(sp);
    const ant = box(0.9, 0.025, 0.9, P.paint(0xd8d6cf)); ant.position.set(0.15, 2.55, -0.38); ant.rotation.x = 0.75; g.add(ant);
    // TV camera with its mirror hood
    const cam = cyl(0.07, 0.07, 0.5, P.paint(0xf0eee8), 18); cam.position.set(0.2, 1.48, 0.5); cam.rotation.x = 0.3; g.add(cam);
    const hood = cyl(0.1, 0.08, 0.14, P.mirror(), 18); hood.position.set(0.2, 1.75, 0.58); g.add(hood);
    // omni antennas on booms
    g.add(tube([0.35, 1.25, 0], [1.0, 1.9, 0.1], 0.012)); g.add(tube([-0.35, 1.25, 0], [-1.0, 1.85, -0.2], 0.012));
    return g;
  },
};

export function buildProcedural(key) { const f = builders[key] || builders.debris; const g = f(); g.userData.procedural = true; return g; }
