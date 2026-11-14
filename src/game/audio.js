// Tiny WebAudio "telemetry" sound kit. No audio files; respects a persistent mute toggle.
const KEY = 'lfis-muted';
let ctx = null;
let muted = localStorage.getItem(KEY) === '1';

function ac() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, dur = 0.08, { type = 'square', vol = 0.05, delay = 0, slide = 0 } = {}) {
  if (muted) return; const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay; const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
export const sfx = {
  key() { tone(1800 + Math.random() * 400, 0.015, { vol: 0.012 }); },
  beep() { tone(880, 0.07); tone(1320, 0.07, { delay: 0.09 }); },
  select() { tone(660, 0.05, { type: 'triangle', vol: 0.06 }); },
  good() { [523, 659, 784].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.06, delay: i * 0.1 })); },
  bad() { tone(220, 0.35, { type: 'sawtooth', vol: 0.05, slide: -120 }); },
  alarm() { for (let i = 0; i < 3; i++) { tone(980, 0.12, { delay: i * 0.25, vol: 0.05 }); tone(740, 0.12, { delay: i * 0.25 + 0.12, vol: 0.05 }); } },
  quake() { tone(55, 0.9, { type: 'sine', vol: 0.12, slide: -20 }); },
  end() { [784, 659, 523, 392].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.06, delay: i * 0.22 })); },
};
export function isMuted() { return muted; }
export function setMuted(m) { muted = m; localStorage.setItem(KEY, m ? '1' : '0'); }
