import * as THREE from 'three';

export const BASE = import.meta.env.BASE_URL;
export const asset = (p) => BASE + p.replace(/^\//, '');

/** Create a renderer that sizes to its container and only renders while visible. */
export function makeStage(container, { alpha = true, fov = 40, near = 0.01, far = 1000, maxDpr = 2, antialias = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);
  const stage = { renderer, scene, camera, container, visible: true, tick: [], disposed: false };
  const resize = () => {
    const w = container.clientWidth || 300, h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(container);
  const io = new IntersectionObserver(([e]) => { stage.visible = e.isIntersecting; }, { rootMargin: '100px' });
  io.observe(container);
  const clock = { last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(); const d = (n - this.last) / 1000; this.last = n; this.elapsedTime += d; return d; } };
  const loop = () => {
    if (stage.disposed) return;
    requestAnimationFrame(loop);
    if (!stage.visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(clock.getDelta(), 0.1);
    for (const f of stage.tick) f(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  };
  loop();
  stage.dispose = () => { stage.disposed = true; ro.disconnect(); io.disconnect(); renderer.dispose(); renderer.domElement.remove(); };
  return stage;
}

export function latLonToVec3(lat, lon, r = 1) {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

const texCache = {};
export function loadTexture(path) {
  if (!texCache[path]) {
    texCache[path] = new THREE.TextureLoader().load(asset(path));
    texCache[path].colorSpace = THREE.SRGBColorSpace;
    texCache[path].anisotropy = 4;
  }
  return texCache[path];
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
