// Planet-surface set for the model viewers: PBR regolith (Poly Haven "Rocks Ground 09", CC0, desaturated),
// tinted grey for the Moon or rust for Mars, with a few soft craters and scattered rocks.
// The disc fades into the sky colour through scene fog + an alpha falloff.
import * as THREE from 'three';
import { asset } from './common.js';

export const ENV = {
  moon: { sky: 0x050506, tint: 0x8f8d89, rock: 0x6d6b67, sun: [0xffffff, 3.6], hemi: [0x8d96a8, 0x3c3b39, 0.32], env: 0.28, fog: [7, 15] },
  mars: { sky: 0x2a1a12, tint: 0xc0714a, rock: 0x7a4126, sun: [0xffe4c8, 2.8], hemi: [0xd6a37c, 0x5a3424, 0.65], env: 0.35, fog: [6.5, 14] },
  space: { sky: 0x06080c, tint: null, sun: [0xfff6ea, 3.0], hemi: [0x9fb0c8, 0x1a1a1f, 0.35], env: 0.4, fog: null },
};

let texP = null;
function textures() {
  if (texP) return texP;
  const L = new THREE.TextureLoader();
  const load = (f, srgb) => { const t = L.load(asset('textures/ground/' + f)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  texP = { map: load('regolith_albedo.webp', true), normalMap: load('regolith_normal.webp'), roughnessMap: load('regolith_rough.webp') };
  return texP;
}
let alphaTex = null;
function radialAlpha() {
  if (alphaTex) return alphaTex;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 40, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#fff'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return (alphaTex = new THREE.CanvasTexture(c));
}

// height field: flat pad in the middle (the model stands there), soft craters and noise outside
const CRATERS = [[3.1, -1.6, 1.1, 0.16], [-2.6, -2.9, 1.5, 0.2], [-3.4, 2.2, 0.8, 0.1], [2.2, 3.2, 0.6, 0.08], [5.2, 1.2, 1.8, 0.22], [-5.6, -0.4, 1.2, 0.14], [0.6, -5.2, 1.4, 0.18]];
function height(x, z) {
  const r = Math.hypot(x, z), keep = THREE.MathUtils.smoothstep(r, 1.5, 2.6);
  let h = (Math.sin(x * 1.7) * Math.cos(z * 1.3) + Math.sin(x * 0.6 + z * 0.9)) * 0.025;
  for (const [cx, cz, cr, d] of CRATERS) { const q = Math.hypot(x - cx, z - cz) / cr; if (q < 1.6) h += q < 1 ? -d * (1 - q * q) + d * 0.25 * q ** 6 : d * 0.25 * Math.max(0, 1 - (q - 1) / 0.6) ** 2; }
  return h * keep;
}

export class Surface {
  constructor(scene, { y = -1, lite = false } = {}) {
    this.scene = scene; this.y = y; this.group = new THREE.Group(); this.group.position.y = y; scene.add(this.group);
    const seg = lite ? 90 : 150, geo = new THREE.PlaneGeometry(16, 16, seg, seg); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const t = textures();
    this.mat = new THREE.MeshStandardMaterial({ ...t, color: 0x8f8d89, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(1.2, 1.2), alphaMap: radialAlpha(), transparent: true, depthWrite: true });
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.receiveShadow = true; this.group.add(this.mesh);
    // rocks: one instanced mesh
    const rg = new THREE.IcosahedronGeometry(1, 1); const rp = rg.attributes.position;
    for (let i = 0; i < rp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(rp, i); v.multiplyScalar(0.75 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.45); v.y *= 0.6; rp.setXYZ(i, v.x, v.y, v.z); }
    rg.computeVertexNormals();
    this.rockMat = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, color: 0x6d6b67, roughness: 0.95 });
    const n = lite ? 26 : 46; this.rocks = new THREE.InstancedMesh(rg, this.rockMat, n); this.rocks.castShadow = true; this.rocks.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); let s = 3;
    const r01 = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const a = r01() * Math.PI * 2, d = 1.9 + r01() ** 1.5 * 4.5, x = Math.cos(a) * d, z = Math.sin(a) * d, k = 0.025 + r01() ** 3 * 0.16;
      q.setFromEuler(new THREE.Euler(r01() * 3, r01() * 3, r01() * 3)); sc.set(k * (0.8 + r01() * 0.6), k, k * (0.8 + r01() * 0.6));
      m.compose(new THREE.Vector3(x, height(x, z) + k * 0.25, z), q, sc); this.rocks.setMatrixAt(i, m);
    }
    this.group.add(this.rocks);
    this.base = new THREE.Color();
  }
  setKind(kind) {
    const e = ENV[kind]; this.kind = kind; this.group.visible = !!e?.tint;
    if (!e?.tint) return;
    this.base.set(e.tint); this.mat.color.copy(this.base); this.rockMat.color.set(e.rock);
  }
  dispose() { this.scene.remove(this.group); this.mesh.geometry.dispose(); this.mat.dispose(); this.rocks.geometry.dispose(); this.rockMat.dispose(); }
}
