import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { cpSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const media = ['models', 'textures', 'draco', 'img'];
const staticFiles = [...media, 'campaigns', 'data', 'sw.js'];

function publicAnonJwt() {
  const jwt = process.env.PIP_SUPABASE_ANON_JWT?.trim();
  if (!jwt) return '';
  try {
    if (/^[\w-]+\.[\w-]+\.[\w-]+$/.test(jwt)) {
      const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
      if (claims.role === 'anon' && claims.iss === 'supabase') return jwt;
    }
  } catch { /* Give the same message for a malformed token. */ }
  throw new Error('PIP_SUPABASE_ANON_JWT must be a public Supabase legacy anon JWT.');
}
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
  define: {
    __MEDIA_VER__: JSON.stringify(mediaVersion()),
    __PIP_PUBLIC_ANON_JWT__: JSON.stringify(publicAnonJwt()),
  },
  plugins: [{
    name: 'copy-site-assets',
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
