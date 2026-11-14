// Interactive model viewer (OrbitControls) that can react to mission state.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeStage, asset } from './common.js';
import { buildProcedural } from './procedural.js';

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Surface, ENV } from './ground.js';

const LITE = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
// parsed GLTF scenes, shared by every viewer (each viewer clones once and keeps its copy)
const gltfCache = new Map();
let loader = null;
function getLoader() {
  if (!loader) { const d = new DRACOLoader(); d.setDecoderPath(asset('draco/')); loader = new GLTFLoader(); loader.setDRACOLoader(d); }
  return loader;
}
export function loadGLBScene(src, onProgress) {
  if (!gltfCache.has(src)) {
    const p = new Promise((res, rej) => getLoader().load(asset(src), (g) => res(g.scene), (e) => onProgress?.(e.total ? e.loaded / e.total : 0), rej));
    p.catch(() => gltfCache.delete(src)); gltfCache.set(src, p);
  }
  return gltfCache.get(src);
}
export const isCached = (src) => gltfCache.has(src);
/** Low-priority background preload: one model at a time, only when the browser is idle. */
export function preloadModels(srcs) {
  const queue = srcs.filter((s) => s && !gltfCache.has(s));
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
  const next = () => { const s = queue.shift(); if (!s) return; idle(() => loadGLBScene(s).catch(() => {}).finally(next), { timeout: 4000 }); };
  next();
}

const DUST = new THREE.Color(0xa65a2e), FROST = new THREE.Color(0xdde7ee);

export class ModelViewer {
  constructor(container, { ground = 'none', autoRotate = true } = {}) {
    this.container = container;
    this.stage = makeStage(container, { maxDpr: LITE ? 1.5 : 2 });
    const { scene, camera, renderer } = this.stage;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMappingExposure = 1.05;
    // soft reflections so foil and metal read as metal (each WebGL context needs its own copy)
    const pm = new THREE.PMREMGenerator(renderer); this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    scene.environment = this.envTex;
    this.hemi = new THREE.HemisphereLight(0xfff1dd, 0x3a2a20, 0.4); scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.position.set(4.5, 3.2, 2.6); this.sun.castShadow = true;
    const sc = this.sun.shadow; sc.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048); sc.camera.left = sc.camera.bottom = -3.2; sc.camera.right = sc.camera.top = 3.2; sc.camera.near = 0.5; sc.camera.far = 16; sc.bias = -0.0004; sc.normalBias = 0.02; sc.radius = 2.5;
    scene.add(this.sun);
    this.pivot = new THREE.Group(); scene.add(this.pivot);
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true; this.controls.autoRotate = autoRotate; this.controls.autoRotateSpeed = 0.8;
    this.controls.minDistance = 1.6; this.controls.maxDistance = 9; camera.far = 100; camera.updateProjectionMatrix();
    camera.position.set(3.2, 1.2, 3.2); this.controls.target.set(0, -0.15, 0);
    // portrait viewers (phones): step back so the whole model fits the narrow frame
    const asp = (container.clientWidth || 1) / (container.clientHeight || 1);
    if (asp < 1) camera.position.multiplyScalar(Math.min(1.7, 1 / Math.max(asp, 0.55)));
    this.surface = new Surface(scene, { y: -1, lite: LITE });
    // faint star field, only for hardware shown in space
    const sp = new Float32Array(1500 * 3); for (let i = 0; i < 1500; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(40); sp.set([v.x, v.y, v.z], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd6e6, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false })); scene.add(this.stars);
    this.objects = new Map(); // spec key -> prepared object (never rebuilt on reselect)
    this.setGround(ground);
    this.state = { dust: 0, light: 1, tilt: 0, frost: 0, storm: 0 };
    this.shake = 0;
    this.makeParticles();
    this.stage.tick.push((dt, t) => this.update(dt, t));
  }
  /** 'moon' | 'mars' | 'none' (deep space backdrop) */
  setGround(kind) {
    const k = ENV[kind] ? kind : 'space', e = ENV[k], scene = this.stage.scene;
    this.groundKind = k; this.env = e;
    scene.background = new THREE.Color(e.sky);
    scene.fog = e.fog ? new THREE.Fog(e.sky, e.fog[0], e.fog[1]) : null;
    scene.environmentIntensity = e.env;
    this.sun.color.set(e.sun[0]); this.baseSun = e.sun[1];
    this.hemi.color.set(e.hemi[0]); this.hemi.groundColor.set(e.hemi[1]); this.baseHemi = e.hemi[2];
    this.surface.setKind(k); this.ground = k === 'space' ? null : this.surface; this.stars.visible = k === 'space';
    this.controls.maxPolarAngle = this.ground ? Math.PI * 0.47 : Math.PI;
    if (this.state) this.applyState();
  }
  makeParticles() {
    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 10; pos[i * 3 + 1] = Math.random() * 5 - 1; pos[i * 3 + 2] = (Math.random() - .5) * 10; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd08a52, size: 0.04, transparent: true, opacity: 0 }));
    this.stage.scene.add(this.particles);
  }
  async load(spec, ground) {
    if (ground) this.setGround(ground);
    const key = spec.src || 'proc:' + spec.proc, token = (this.token = Symbol());
    let entry = this.objects.get(key);
    if (!entry) {
      let loading = null;
      if (spec.src && !isCached(spec.src)) { // progress only on the very first download
        loading = document.createElement('div'); loading.className = 'loading'; loading.textContent = 'LOADING MODEL…'; this.container.appendChild(loading);
      }
      let obj;
      try { obj = spec.src ? (await loadGLBScene(spec.src, (f) => { if (loading) loading.textContent = `LOADING MODEL… ${Math.round(f * 100)}%`; })).clone(true) : buildProcedural(spec.proc); }
      catch (e) { console.warn('model load failed, using procedural', e); obj = buildProcedural(spec.fallback || 'lander'); }
      loading?.remove();
      // normalise size & centre; stand it on the surface (bounding-box min.y = ground level)
      const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
      const s = 2.2 / Math.max(size.x, size.y, size.z || 1); obj.scale.multiplyScalar(s);
      obj.position.sub(c.multiplyScalar(s));
      const mats = [];
      obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => { if (mat.color) mats.push({ mat, base: mat.color.clone(), rough: mat.roughness ?? .5 }); }); } });
      const b2 = new THREE.Box3().setFromObject(obj);
      entry = { obj, mats, minY: b2.min.y, centerY: obj.position.y }; this.objects.set(key, entry);
    }
    if (token !== this.token) return entry.obj; // a newer selection won
    this.pivot.clear();
    entry.obj.position.y = this.ground ? entry.centerY - entry.minY - 1 + 0.002 : entry.centerY;
    this.mats = entry.mats; this.pivot.add(entry.obj); this.model = entry.obj; this.applyState();
    return entry.obj;
  }
  setState(s) { Object.assign(this.state, s); this.applyState(); }
  quake() { this.shake = 1.4; }
  applyState() {
    const { dust, light, frost, storm } = this.state;
    const d = Math.min(1, Math.max(0, dust / 100)) * 0.85, f = Math.min(1, frost);
    for (const { mat, base, rough } of this.mats || []) {
      mat.color.copy(base).lerp(DUST, d).lerp(FROST, f * 0.7);
      if ('roughness' in mat) mat.roughness = Math.min(1, rough + d * 0.6);
    }
    this.sun.intensity = this.baseSun * light * (1 - storm * 0.55);
    this.hemi.intensity = this.baseHemi * (0.3 + 0.7 * light) * (1 - storm * 0.4) + storm * 0.3;
    this.hemi.color.set(storm > 0.2 ? 0xffb07a : f > 0.3 ? 0xbfd4ff : this.env.hemi[0]);
    this.particles.material.opacity = Math.min(0.85, storm * 0.9 + d * 0.15);
    if (this.ground) this.surface.mat.color.copy(this.surface.base).lerp(FROST, f * 0.25).multiplyScalar(0.35 + 0.65 * light);
  }
  update(dt, t) {
    this.controls.update();
    const targetTilt = THREE.MathUtils.degToRad(this.state.tilt || 0);
    this.pivot.rotation.z += (targetTilt - this.pivot.rotation.z) * Math.min(1, dt * 2);
    if (this.shake > 0) { this.shake -= dt; const a = this.shake * 0.05; this.pivot.position.set((Math.random() - .5) * a, (Math.random() - .5) * a, (Math.random() - .5) * a); } else this.pivot.position.set(0, 0, 0);
    const p = this.particles.geometry.attributes.position; const speed = 0.4 + this.state.storm * 3;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i) + dt * speed; if (x > 5) x = -5; p.setX(i, x); }
    p.needsUpdate = true;
  }
  dispose() { this.surface.dispose(); this.envTex?.dispose(); this.stage.dispose(); }
}
