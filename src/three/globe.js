// Textured planet with a target marker; used by the scroll story and the hero.
// Switching bodies crossfades between two texture layers.
import * as THREE from 'three';
import { makeStage, latLonToVec3, loadTexture } from './common.js';

const TEX = { earth: 'textures/earth.jpg', moon: 'textures/moon.jpg', mars: 'textures/mars.jpg' };
const HALO = { moon: 0xa9a5f3, mars: 0xc58cff, earth: 0x9cc8ff };

export class PlanetGlobe {
  constructor(container, { radius = 1, distance = 3.2, fit = false, body = null, maxDpr = 2 } = {}) {
    this.stage = makeStage(container, { maxDpr });
    const { scene, camera } = this.stage;
    camera.position.set(0, 0, distance);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2e0, 2.2); sun.position.set(-3, 2, 4); scene.add(sun);
    this.group = new THREE.Group(); scene.add(this.group);
    const geo = new THREE.SphereGeometry(radius, 96, 64);
    this.mat = new THREE.MeshStandardMaterial({ color: 0x8a7c6c, roughness: 0.95, metalness: 0 });
    this.sphere = new THREE.Mesh(geo, this.mat); this.group.add(this.sphere);
    // crossfade layer: same sphere, a hair larger, fades in the new texture
    this.fadeMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, transparent: true, opacity: 0, depthWrite: false });
    this.fadeSphere = new THREE.Mesh(geo, this.fadeMat); this.fadeSphere.scale.setScalar(1.002); this.fadeSphere.visible = false; this.group.add(this.fadeSphere);
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.04, 64, 32), new THREE.MeshBasicMaterial({ color: 0xa9a5f3, transparent: true, opacity: 0.16, side: THREE.BackSide }));
    scene.add(this.halo);
    this.marker = new THREE.Group();
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.055, 32), new THREE.MeshBasicMaterial({ color: 0xa9a5f3, side: THREE.DoubleSide, transparent: true }));
    const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gx = gc.getContext('2d'), gg = gx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.25, 'rgba(169,165,243,.85)'); gg.addColorStop(0.6, 'rgba(90,71,196,.35)'); gg.addColorStop(1, 'rgba(90,71,196,0)');
    gx.fillStyle = gg; gx.fillRect(0, 0, 64, 64);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(0.22); this.glow = glow;
    this.marker.add(dot, glow, this.ring); this.group.add(this.marker); this.marker.visible = false;
    this.radius = radius; this.target = null; this.spin = 0.05; this.body = null; this.fade = null;
    this.fitR = radius * 1.12;
    if (fit) {
      const cam = camera;
      cam.position.z = this.fitDistance();
      this.stage.tick.push((dt) => { cam.position.z += (this.fitDistance() - cam.position.z) * Math.min(1, dt * 3); });
    }
    this.stage.tick.push((dt, t) => {
      if (this.target) { this.group.quaternion.slerp(this.target, Math.min(1, dt * 2.2)); }
      else this.group.rotation.y += dt * this.spin;
      const s = 1 + (t * 1.5 % 1) * 1.5; this.ring.scale.set(s, s, s); this.ring.material.opacity = 1 - (t * 1.5 % 1); this.glow.scale.setScalar(0.2 + Math.sin(t * 3) * 0.03);
      if (this.fade) {
        this.fade.k = Math.min(1, this.fade.k + dt / 0.7);
        const e = this.fade.k * this.fade.k * (3 - 2 * this.fade.k);
        this.fadeMat.opacity = e; this.halo.material.color.lerpColors(this.fade.from, this.fade.to, e);
        if (this.fade.k >= 1) { this.mat.map = this.fadeMat.map; this.mat.color.set(0xffffff); this.mat.needsUpdate = true; this.fadeSphere.visible = false; this.fadeMat.opacity = 0; this.fade = null; }
      }
    });
    if (body) this.setBody(body, true);
  }
  // camera distance at which a sphere of radius fitR fits entirely inside the canvas
  fitDistance(margin = 1.06) {
    const cam = this.stage.camera, hv = THREE.MathUtils.degToRad(cam.fov / 2), hh = Math.atan(Math.tan(hv) * cam.aspect);
    return (this.fitR / Math.sin(Math.min(hv, hh))) * margin;
  }
  setBody(body, instant = false) {
    if (body === this.body) return; const first = !this.body; this.body = body;
    const tex = loadTexture(TEX[body] || TEX.moon), haloTo = new THREE.Color(HALO[body] || 0xa9a5f3);
    if (instant || first || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.fade = null; this.fadeSphere.visible = false; this.mat.map = tex; this.mat.color.set(0xffffff); this.mat.needsUpdate = true; this.halo.material.color.copy(haloTo); return;
    }
    if (this.fade) { this.mat.map = this.fadeMat.map; this.mat.needsUpdate = true; } // finish a fade in progress
    this.fadeMat.map = tex; this.fadeMat.needsUpdate = true; this.fadeMat.opacity = 0; this.fadeSphere.visible = true;
    this.fade = { k: 0, from: this.halo.material.color.clone(), to: haloTo };
  }
  focus(lat, lon) {
    const p = latLonToVec3(lat, lon, this.radius);
    this.marker.position.copy(p); this.marker.lookAt(p.clone().multiplyScalar(2)); this.marker.visible = true;
    // rotate group so p faces the camera (+z), tilted a little
    const from = p.clone().normalize(), to = new THREE.Vector3(0, 0.25, 1).normalize();
    this.target = new THREE.Quaternion().setFromUnitVectors(from, to);
  }
  free() { this.target = null; this.marker.visible = false; }
}
