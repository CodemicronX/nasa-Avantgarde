// Live debris globe: CelesTrak TLEs propagated with satellite.js (SGP4) in a Web Worker,
// drawn as ONE THREE.Points buffer that is refreshed ~3 times per second while visible.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeStage, loadTexture } from './common.js';
import { LITE, writeLiveCache } from './orbit-data.js';

const EARTH_R = 6371;
const HZ = 3;
export const GROUP_COLORS = { 'fengyun-1c-debris': 0xffb547, 'cosmos-2251-debris': 0xff6a3d, 'iridium-33-debris': 0xb8d36b };

export class DebrisGlobe {
  constructor(container, tip, boot) {
    this.boot = boot;
    this.stage = makeStage(container, { maxDpr: 1.5, antialias: !LITE }); this.tip = tip;
    const { scene, camera, renderer } = this.stage;
    camera.position.set(0, 1.2, 3.6);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xfff0dd, 2.4); sun.position.set(5, 2, 4); scene.add(sun);
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(1, LITE ? 48 : 80, LITE ? 32 : 56), new THREE.MeshStandardMaterial({ map: loadTexture('textures/earth.jpg'), roughness: 0.9 }));
    scene.add(this.earth);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.025, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0.1, side: THREE.BackSide })));
    this.controls = new OrbitControls(camera, renderer.domElement); this.controls.enableDamping = true; this.controls.minDistance = 1.4; this.controls.maxDistance = 8; this.controls.autoRotate = true; this.controls.autoRotateSpeed = 0.35;
    this.groups = {}; this.order = []; this.special = []; this.points = null;
    this.raycaster = new THREE.Raycaster(); this.raycaster.params.Points.threshold = 0.02; this.mouse = new THREE.Vector2(-9, -9); this.moved = false;
    renderer.domElement.addEventListener('pointermove', (e) => { const r = renderer.domElement.getBoundingClientRect(); this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); this.mx = e.clientX - r.left; this.my = e.clientY - r.top; this.moved = true; });
    renderer.domElement.addEventListener('pointerleave', () => { this.mouse.set(-9, -9); this.tip.hidden = true; });
    this.last = 0; this.pending = false;
    this.stage.tick.push((dt, t) => {
      this.controls.update();
      if (this.points && !this.pending && t - this.last > 1 / HZ) { this.last = t; this.pending = true; this.worker.postMessage({ type: 'tick' }); }
      if (this.moved) { this.moved = false; this.hover(); }
    });
    this.worker = boot.worker;
    this.worker.onmessage = ({ data: m }) => this.onWorker(m);
    this.worker.onerror = (e) => { e.preventDefault?.(); this.reject?.(new Error('worker failed')); };
  }
  call(msg) { return new Promise((res, rej) => { this.resolve = res; this.reject = rej; this.worker.postMessage(msg); }); }
  onWorker(m) {
    if (m.type === 'meta') { this.build(m.meta, m); }
    else if (m.type === 'frame') { this.applyFrame(m); if (this.resolve) { const r = this.resolve; this.resolve = this.reject = null; r(); } }
    else if (m.type === 'error') { this.pending = false; if (this.reject) { const r = this.reject; this.resolve = this.reject = null; r(new Error(m.message)); } }
  }
  /** First paint: the worker was started early (cached live elements if fresh, else the HTTP-cached snapshot). */
  loadSnapshot() {
    const { cached, early } = this.boot;
    return new Promise((res, rej) => {
      this.resolve = res; this.reject = rej;
      if (this.boot.failed()) return rej(this.boot.failed());
      early.splice(0).forEach((m) => this.onWorker(m));
    }).then(() => { this.sourceLabel = cached ? `CelesTrak live (cached), ${cached.fetched.slice(0, 16).replace('T', ' ')} UTC` : `CelesTrak snapshot, ${(this.fetched || '').slice(0, 10)}`; });
  }
  loadLive() {
    const groups = Object.keys(GROUP_COLORS).map((k) => [k, this.groups[k]?.label || k]);
    return this.call({ type: 'live', groups, special: this.specialTle || {} }).then(() => { this.sourceLabel = `CelesTrak live, ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`; });
  }
  build(meta, m) {
    this.fetched = m.fetched;
    if (m.live && m.raw) writeLiveCache(m.raw);
    const prevVis = Object.fromEntries(Object.entries(this.groups).map(([k, g]) => [k, g.visible]));
    if (this.points) { this.stage.scene.remove(this.points); this.points.geometry.dispose(); this.points.material.dispose(); }
    this.groups = {}; this.order = [];
    const col = new Float32Array(meta.total * 3), c = new THREE.Color();
    for (const g of meta.groups) {
      c.setHex(GROUP_COLORS[g.key] || 0xffffff);
      for (let i = 0; i < g.n; i++) col.set([c.r, c.g, c.b], (g.offset + i) * 3);
      this.groups[g.key] = { label: g.label, offset: g.offset, n: g.n, tracked: g.tracked, names: g.names, ids: g.ids, visible: prevVis[g.key] ?? true, count: g.tracked };
      this.order.push(this.groups[g.key]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(meta.total * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12); // fixed: avoids recomputing every update
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: LITE ? 0.018 : 0.014, vertexColors: true, sizeAttenuation: true }));
    this.stage.scene.add(this.points);
    this.special.forEach((s) => this.stage.scene.remove(s.mesh));
    this.special = meta.special.map((name) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), new THREE.MeshBasicMaterial({ color: name.startsWith('ISS') ? 0xffffff : 0xff3d1f })); mesh.visible = false; this.stage.scene.add(mesh); return { name, mesh, alt: 0 }; });
    const hid = Object.entries(this.groups).filter(([, g]) => !g.visible).map(([k]) => k);
    if (hid.length) this.worker.postMessage({ type: 'hidden', keys: hid });
  }
  applyFrame(m) {
    this.pending = false;
    if (!this.points || m.pos.length !== this.points.geometry.attributes.position.array.length) return;
    const a = this.points.geometry.attributes.position; a.array.set(m.pos); a.needsUpdate = true;
    this.earth.rotation.y = m.gmst - Math.PI / 2; // align texture (lon 0) with Greenwich
    m.sp.forEach((p, i) => { const s = this.special[i]; if (!s) return; if (p) { s.mesh.position.set(p[0], p[1], p[2]); s.alt = p[3]; s.mesh.visible = true; } });
    for (const [k, n] of Object.entries(m.counts)) if (this.groups[k]) this.groups[k].count = this.groups[k].tracked === this.groups[k].n ? n : Math.round(n * this.groups[k].tracked / Math.max(1, this.groups[k].n));
    this.onUpdate?.();
  }
  setVisible(key, v) {
    const g = this.groups[key]; if (!g) return; g.visible = v;
    if (!v && this.points) { const a = this.points.geometry.attributes.position; a.array.fill(0, g.offset * 3, (g.offset + g.n) * 3); a.needsUpdate = true; }
    this.worker.postMessage({ type: 'hidden', keys: Object.entries(this.groups).filter(([, x]) => !x.visible).map(([k]) => k) });
  }
  hover() {
    if (this.mouse.x < -2) return;
    this.raycaster.setFromCamera(this.mouse, this.stage.camera);
    const sp = this.raycaster.intersectObjects(this.special.map((s) => s.mesh));
    if (sp.length) { const s = this.special.find((x) => x.mesh === sp[0].object); return this.showTip(`${s.name} · ${Math.round(s.alt)} km altitude`); }
    if (this.points) {
      const hit = this.raycaster.intersectObject(this.points).find((h) => h.point.lengthSq() > 0.5);
      if (hit) { const g = this.order.find((x) => hit.index >= x.offset && hit.index < x.offset + x.n); if (g) { const i = hit.index - g.offset; const d = hit.point.length() * EARTH_R - EARTH_R; return this.showTip(`${g.names[i]} · NORAD ${g.ids[i]} · ~${Math.round(d)} km`); } }
    }
    this.tip.hidden = true;
  }
  showTip(t) { this.tip.hidden = false; this.tip.textContent = t; this.tip.style.left = this.mx + 14 + 'px'; this.tip.style.top = this.my + 10 + 'px'; }
}
