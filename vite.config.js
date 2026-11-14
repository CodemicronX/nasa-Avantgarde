import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { cpSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const media = ['models', 'textures', 'draco', 'img'];
const staticFiles = [...media, 'campaigns', 'data', 'sw.js'];
// hash of the cached media (names + sizes + mtimes) -> service-worker cache version
function mediaVersion() {
  const h = createHash('sha1');
  const walk = (d) => { for (const f of readdirSync(d).sort()) { const p = join(d, f), s = statSync(p); if (s.isDirectory()) walk(p); else h.update(`${p}:${s.size}`); } };
  for (const d of media) { try { walk(d); } catch { /* missing */ } }
  return h.digest('hex').slice(0, 10);
}
// GitHub Pages project site: https://leffstroi.github.io/capX/ (override with BASE_PATH for other hosts).
export default defineConfig({
  base: process.env.BASE_PATH || '/nasa-Avantgarde/',
  worker: { format: 'es' },
  define: { __MEDIA_VER__: JSON.stringify(mediaVersion()) },
  plugins: [{
    name: 'copy-static-files',
    apply: 'build',
    writeBundle({ dir }) {
      for (const file of staticFiles) cpSync(file, resolve(dir, file), { recursive: true });
    },
  }],
  build: {
    target: 'es2022', chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks(id) {
      if (id.includes('node_modules/three/')) return 'three';
      if (id.includes('node_modules/leaflet/')) return 'leaflet';
      if (id.includes('node_modules/gsap/') || id.includes('node_modules/lenis/')) return 'motion';
    } } },
  },
  server: { host: true }, preview: { host: true, port: 4173 },
});
