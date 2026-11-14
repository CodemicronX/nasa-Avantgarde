// Small PBR material kit for procedural spacecraft: crinkled Kapton foil, aluminium,
// solar cells with a silver grid, white thermal paint, wire mesh. Textures are drawn on canvases
// once and shared (no downloads).
import * as THREE from 'three';

const cache = {};
function canvasTex(key, size, draw, { repeat = 1, color = false } = {}) {
  if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return (cache[key] = t);
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// crinkles: random facets with varied brightness -> bump map
function crinkle(g, n) {
  g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * n, y = rnd() * n, r = 6 + rnd() * 26, v = 60 + rnd() * 140 | 0;
    g.fillStyle = `rgb(${v},${v},${v})`; g.globalAlpha = 0.35; g.beginPath();
    const k = 3 + (rnd() * 3 | 0); for (let j = 0; j < k; j++) { const a = j / k * 6.283 + rnd(); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * (0.4 + rnd())); }
    g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
}
export const foil = (tint = 0xd8a542) => new THREE.MeshStandardMaterial({ name: 'kapton foil', color: tint, metalness: 1, roughness: 0.32, bumpMap: canvasTex('crinkle', 256, crinkle, { repeat: 2 }), bumpScale: 1.4 });
export const silverFoil = () => foil(0xd9dde2);
export const alu = (rough = 0.38) => new THREE.MeshStandardMaterial({ name: 'aluminium', color: 0xc4c8cc, metalness: 1, roughness: rough });
export const darkAlu = () => new THREE.MeshStandardMaterial({ name: 'anodised', color: 0x2a2b2e, metalness: 0.7, roughness: 0.45 });
export const paint = (c = 0xe9e6de) => new THREE.MeshStandardMaterial({ name: 'thermal paint', color: c, metalness: 0, roughness: 0.78 });
export const black = () => new THREE.MeshStandardMaterial({ name: 'black', color: 0x141414, metalness: 0.2, roughness: 0.6 });
export const mirror = () => new THREE.MeshStandardMaterial({ name: 'radiator mirror', color: 0xe8ecf0, metalness: 1, roughness: 0.08 });
export const cells = (cols = 8, rows = 6) => {
  const map = canvasTex(`cells${cols}x${rows}`, 512, (g, n) => {
    g.fillStyle = '#0b1530'; g.fillRect(0, 0, n, n);
    const cw = n / cols, ch = n / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const v = 20 + rnd() * 18 | 0; g.fillStyle = `rgb(${v * .5 | 0},${v * .8 | 0},${v * 2.2 | 0})`; g.fillRect(i * cw + 3, j * ch + 3, cw - 6, ch - 6);
      g.strokeStyle = 'rgba(200,205,215,.55)'; g.lineWidth = 1; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(i * cw + 3, j * ch + k * ch / 5); g.lineTo(i * cw + cw - 3, j * ch + k * ch / 5); g.stroke(); }
    }
    g.strokeStyle = '#c9ccd2'; g.lineWidth = 3; for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, n); g.stroke(); } for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(n, j * ch); g.stroke(); }
  }, { color: true });
  return new THREE.MeshStandardMaterial({ name: 'solar panel', map, color: 0xffffff, metalness: 0.55, roughness: 0.22 });
};
export const mesh = (c = 0xa9a7a0) => new THREE.MeshStandardMaterial({
  name: 'wire mesh', color: c, metalness: 0.9, roughness: 0.45, side: THREE.DoubleSide, alphaTest: 0.5,
  alphaMap: canvasTex('mesh', 256, (g, n) => { g.fillStyle = '#000'; g.fillRect(0, 0, n, n); g.strokeStyle = '#fff'; g.lineWidth = 9; const s = n / 8;
    for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s + n, n); g.stroke(); g.beginPath(); g.moveTo(i * s + n, 0); g.lineTo(i * s, n); g.stroke(); } }, { repeat: 1 }),
});
export const webbing = () => new THREE.MeshStandardMaterial({ name: 'nylon webbing', color: 0x8ea3b4, metalness: 0, roughness: 0.9, side: THREE.DoubleSide });
export const fiberglass = () => new THREE.MeshStandardMaterial({ name: 'fiberglass', color: 0x8b98a3, metalness: 0.05, roughness: 0.6, side: THREE.DoubleSide });
export const glass = () => new THREE.MeshStandardMaterial({ name: 'lens', color: 0x10141a, metalness: 0.9, roughness: 0.05 });
