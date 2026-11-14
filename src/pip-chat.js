// "Ask Pip": a tiny chat box. Answers come from an AI model (Google Gemini, or OpenRouter) through our own
// Supabase Edge Function (the API key never reaches the browser). The function grounds every answer in a knowledge
// base generated from this site's data (scripts/build-pip-kb.mjs) and returns link chips that open cards/sections.
// If the AI is unavailable, Pip answers from a small built-in fact list instead.
import { scrollToEl } from './motion.js';
const ENDPOINT = 'https://uweztfmeuyvfkdnltxcr.supabase.co/functions/v1/pip-chat';
const MAX = 300;

const KB = [
  { k: ['apollo 11', 'аполлон 11', 'аполлона 11', 'аполлоне 11', 'armstrong', 'армстронг', 'tranquil', 'спокойств', 'flag', 'флаг'], en: 'Apollo 11 landed in the Sea of Tranquility on 20 July 1969. The flag was blown over by the engine blast at lift-off, but the descent stage and a laser mirror are still there.', ru: 'Аполлон-11 сел в Море Спокойствия 20 июля 1969 года. Флаг сдуло струёй двигателя при взлёте, но посадочная ступень и лазерный отражатель до сих пор там.' },
  { k: ['mirror', 'laser', 'retroreflect', 'зеркал', 'лазер', 'отражател'], en: 'Laser mirrors left by Apollo 11, 14 and 15 still bounce light back to Earth. They show the Moon drifts away about 3.8 cm every year!', ru: 'Лазерные отражатели Аполлонов 11, 14 и 15 до сих пор возвращают свет на Землю. Благодаря им мы знаем, что Луна удаляется примерно на 3,8 см в год!' },
  { k: ['surveyor', 'сервейер', 'сёрвейер', 'apollo 12', 'аполлон 12'], en: 'Surveyor 3 landed in 1967, and in 1969 Apollo 12 astronauts walked over and took parts of it home. It is the only robot on the Moon ever visited by people.', ru: 'Сервейер-3 сел в 1967 году, а в 1969-м астронавты Аполлона-12 подошли к нему и забрали детали на Землю. Это единственный робот на Луне, которого навещали люди.' },
  { k: ['lunokhod', 'луноход'], en: 'Lunokhod 1 was the first rover on another world (1970). It was lost for decades until NASA’s LRO spotted it in 2010.', ru: 'Луноход-1 стал первым планетоходом в истории (1970). Его потеряли на десятилетия, пока зонд NASA LRO не нашёл его в 2010 году.' },
  { k: ['luna 9', 'луна-9', 'луна 9'], en: 'Luna 9 made the first soft landing on the Moon in February 1966 and sent the first photos from the surface.', ru: 'Луна-9 первой мягко села на Луну в феврале 1966 года и передала первые снимки с поверхности.' },
  { k: ['chandrayaan', 'чандраян'], en: 'Chandrayaan-3 landed near the Moon’s south pole in 2023. In 2024 NASA’s LRO pinged the tiny laser mirror on its lander.', ru: 'Чандраян-3 сел у южного полюса Луны в 2023 году. В 2024-м зонд NASA LRO «достучался» лазером до маленького отражателя на его посадочном модуле.' },
  { k: ['rover', 'lrv', 'ровер', 'луномобил'], en: 'Apollo 15, 16 and 17 each left a Lunar Roving Vehicle on the Moon. They were designed for about 13 km/h.', ru: 'Аполлоны 15, 16 и 17 оставили на Луне по луноходу LRV. Их скорость по проекту — около 13 км/ч.' },
  { k: ['opportunity', 'оппортьюнити', 'spirit', 'спирит'], en: 'Spirit and Opportunity landed on Mars in 2004. Opportunity drove 45 km and worked until a dust storm in 2018!', ru: 'Спирит и Оппортьюнити сели на Марс в 2004 году. Оппортьюнити проехал 45 км и работал до пылевой бури 2018 года!' },
  { k: ['viking', 'викинг'], en: 'Viking 1 landed on Mars in 1976 and worked until November 1982, when a wrong command cut its radio link.', ru: 'Викинг-1 сел на Марс в 1976 году и работал до ноября 1982-го, когда ошибочная команда оборвала связь.' },
  { k: ['insight', 'инсайт', 'marsquake', 'марсотряс'], en: 'InSight listened for marsquakes and recorded more than 1,300 of them before dust covered its solar panels in 2022.', ru: 'InSight слушал марсотрясения и записал больше 1300 толчков, пока пыль не закрыла его солнечные панели в 2022 году.' },
  { k: ['ingenuity', 'инджинью', 'helicopter', 'вертол'], en: 'Ingenuity was the first helicopter on another planet. It flew 72 times on Mars before a damaged blade ended its mission in 2024.', ru: 'Ingenuity — первый вертолёт на другой планете. Он совершил 72 полёта на Марсе, пока повреждённая лопасть не завершила миссию в 2024 году.' },
  { k: ['pioneer', 'пионер'], en: 'Pioneer 10 sent its last signal in 2003 from about 12 billion km away. It is still flying out of the solar system.', ru: 'Пионер-10 прислал последний сигнал в 2003 году с расстояния около 12 млрд км. Он всё ещё летит прочь из Солнечной системы.' },
  { k: ['why', 'почему', 'end', 'stop', 'конч', 'законч', 'перестал'], en: 'Missions end because of dust on solar panels, freezing nights, worn-out parts or a lost radio link. The hardware stays where it stopped.', ru: 'Миссии заканчиваются из-за пыли на панелях, холодных ночей, износа деталей или потери связи. А сами аппараты остаются там, где остановились.' },
];
const isRu = (t) => /[а-яё]/i.test(t);
// what the user is looking at right now — sent with the question so "what is this?" works
function context() {
  const ctx = {};
  const modal = document.getElementById('modal');
  if (modal && !modal.hidden && modal.dataset.card) ctx.card = modal.dataset.card;
  const mid = innerHeight / 2;
  for (const s of document.querySelectorAll('main > section')) { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) { ctx.section = s.id || s.classList[0]; break; } }
  const y = document.getElementById('mc-year'); if (y && ctx.section === 'moon') ctx.year = parseInt(y.value, 10);
  return ctx;
}
function go(target, closeChat) {
  if (/^https:\/\//.test(target)) { window.open(target, '_blank', 'noopener'); return; }
  const m = target.match(/^#catalog\?item=([\w-]+)$/);
  if (m) { const b = document.createElement('button'); b.hidden = true; b.dataset.open = m[1]; document.body.appendChild(b); b.click(); b.remove(); return; }
  const el = document.querySelector(target.split('?')[0]); if (!el) return;
  if (matchMedia('(max-width: 640px)').matches) closeChat();
  scrollToEl(el);
}
function offline(q) {
  const t = ' ' + q.toLowerCase().replace(/[-‑–_.,!?]/g, ' ').replace(/\s+/g, ' ') + ' ', ru = isRu(q);
  const hit = KB.find((x) => x.k.some((k) => t.includes(k)));
  if (hit) return ru ? hit.ru : hit.en;
  return ru ? 'Хороший вопрос! Мой ИИ-канал сейчас не отвечает, но спросите меня про Аполлон-11, Луноход-1, Сервейер-3, Оппортьюнити или InSight — про них я знаю!'
            : 'Great question! My AI radio is quiet right now, but ask me about Apollo 11, Lunokhod 1, Surveyor 3, Opportunity or InSight — I know those!';
}

export function initPipChat({ onOpenChange } = {}) {
  const box = document.createElement('section');
  box.className = 'pipchat'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Ask Pip');
  box.innerHTML = `
    <header class="pipchat-h"><b>Ask Pip</b><span class="pipchat-tag">AI</span><button type="button" class="pipchat-x" aria-label="Close chat">×</button></header>
    <div class="pipchat-log" aria-live="polite"></div>
    <div class="pipchat-chips"></div>
    <form class="pipchat-f"><label class="sr-only" for="pipchat-q">Your question for Pip</label>
      <input id="pipchat-q" maxlength="${MAX}" autocomplete="off" placeholder="Ask about the Moon or Mars…" />
      <button type="submit" aria-label="Send">➤</button></form>
    <p class="pipchat-note">Answers are AI-generated and can be wrong. Check the Sources section.</p>`;
  document.body.appendChild(box);
  const log = box.querySelector('.pipchat-log'), form = box.querySelector('form'), input = box.querySelector('input'), send = form.querySelector('button'), chips = box.querySelector('.pipchat-chips');
  const history = [];
  let busy = false, greeted = false;

  const add = (role, text, cls = '') => { const p = document.createElement('p'); p.className = `pm pm-${role} ${cls}`; p.textContent = text; log.appendChild(p); log.scrollTop = log.scrollHeight; return p; };
  const addLinks = (links) => {
    if (!Array.isArray(links) || !links.length) return;
    const row = document.createElement('div'); row.className = 'pm-links';
    for (const l of links.slice(0, 3)) {
      if (!l || typeof l.label !== 'string' || typeof l.target !== 'string' || !/^(#[\w-]+(\?item=[\w-]+)?|https:\/\/\S+)$/.test(l.target)) continue;
      const ext = l.target.startsWith('https://');
      const b = document.createElement(ext ? 'a' : 'button');
      if (ext) { b.href = l.target; b.target = '_blank'; b.rel = 'noopener'; } else { b.type = 'button'; b.addEventListener('click', () => go(l.target, () => setOpen(false))); }
      b.className = 'pm-link'; b.textContent = (ext ? '↗ ' : '→ ') + l.label.slice(0, 60); row.appendChild(b);
    }
    if (row.children.length) { log.appendChild(row); log.scrollTop = log.scrollHeight; }
  };
  ['What is still on the Moon?', 'Почему Оппортьюнити замолчал?', 'How do I play the game?'].forEach((q) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.addEventListener('click', () => ask(q)); chips.appendChild(b);
  });

  async function ask(raw) {
    const q = String(raw || '').trim().slice(0, MAX);
    if (!q || busy) return;
    busy = true; send.disabled = true; chips.hidden = true;
    add('user', q); input.value = '';
    const wait = add('pip', '…', 'typing');
    let answer = '', fallback = false, links = null;
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 28000);
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, history: history.slice(-6), ctx: context() }), signal: ctl.signal });
      clearTimeout(to);
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.answer) { answer = d.answer; links = d.links; }
      else if (r.status === 429 || d.error === 'rate_limited') answer = isRu(q) ? 'Уф, слишком много вопросов подряд! Дайте моим антеннам минутку остыть.' : 'Whoa, lots of questions! Give my antennas a minute to cool down.';
      else fallback = true;
    } catch { fallback = true; }
    if (fallback) answer = offline(q);
    wait.classList.remove('typing'); wait.textContent = answer;
    if (fallback) wait.classList.add('offline');
    addLinks(links);
    history.push({ role: 'user', text: q }, { role: 'model', text: answer });
    busy = false; send.disabled = false; log.scrollTop = log.scrollHeight;
    input.focus({ preventScroll: true });
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });

  // keep the box above the on-screen keyboard on phones
  const vv = window.visualViewport;
  const fit = () => { if (!vv) return; const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop); box.style.setProperty('--kb', `${kb}px`); };
  vv?.addEventListener('resize', fit); vv?.addEventListener('scroll', fit);

  let opener = null;
  function setOpen(open, side = 'right') {
    if (open === !box.hidden) return;
    box.hidden = !open; box.dataset.side = side;
    if (open) {
      opener = document.activeElement;
      if (!greeted) { greeted = true; add('pip', document.documentElement.lang?.startsWith('ru') ? 'Привет! Я Пип. Спросите меня про машины, оставленные на Луне и Марсе.' : 'Hi! I’m Pip. Ask me about the machines people left on the Moon and Mars. You can write in any language!'); }
      fit(); setTimeout(() => input.focus({ preventScroll: true }), 50);
    } else opener?.focus?.({ preventScroll: true });
    onOpenChange?.(open);
  }
  box.querySelector('.pipchat-x').addEventListener('click', () => setOpen(false));
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } });
  return { open: (side) => setOpen(true, side), close: () => setOpen(false), toggle: (side) => setOpen(box.hidden, side), isOpen: () => !box.hidden, el: box };
}
