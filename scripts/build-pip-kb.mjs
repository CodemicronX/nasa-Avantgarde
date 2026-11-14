// Builds Pip's knowledge base from the site's own source data, so the chatbot stays in sync with the site.
// Output: supabase/functions/pip-chat/kb.ts  (run: npm run kb; also runs before every build)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const { OBJECTS, PLACE_LABEL } = await import('../site/src/data/objects.js');
const { FACTORS } = await import('../site/src/data/factors.js');
const { PREVENTION, STATS, DECAY, DATA_SOURCES, CHALLENGE_RESOURCES } = await import('../site/src/data/prevention.js');
const { MISSIONS } = await import('../site/src/moon/missions.js');

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const strip = (h) => clean(h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
const docs = [];
const add = (d) => docs.push({ ...d, text: clean(d.text) });

// Russian / alternative names (search aliases) — everything else is matched from the English data itself.
const RU = {
  'vanguard-1': 'авангард вэнгард', 'ed-white-glove': 'эд уайт перчатка джемини', 'luna-15': 'луна-15 луна 15', 'apollo-11-site': 'аполлон-11 аполлон 11 армстронг олдрин база спокойствия море спокойствия флаг',
  'apollo-15-hammer': 'молоток перо галилей аполлон-15 скотт', 'apollo-14-golf': 'гольф мячи шепард аполлон-14', 'mars-2': 'марс-2 марс 2', 'mars-3': 'марс-3 марс 3', skylab: 'скайлэб скайлab',
  'viking-1': 'викинг-1 викинг 1', 'mars-observer': 'марс обсервер', clementine: 'клементина', 'mars-pathfinder': 'патфайндер соджорнер марс пасфайндер', mco: 'марс климат орбитер mars climate orbiter единицы фунты',
  mpl: 'марс полар лендер полярный', mir: 'мир станция', 'beagle-2': 'бигль-2 бигль', mgs: 'марс глобал сервейер', 'fengyun-1c': 'фэнъюнь фенъюн', 'piper-bag': 'сумка инструменты пайпер',
  'iridium-kosmos': 'иридиум космос-2251 столкновение', spirit: 'спирит', envisat: 'энвисат', philae: 'филы комета розетта', schiaparelli: 'скиапарелли', opportunity: 'оппортьюнити оппи',
  beresheet: 'берешит израиль', vikram: 'викрам чандраян-2 чандраян 2', 'hakuto-r': 'хакуто ispace', 'luna-25': 'луна-25 луна 25', 'apollo-11-tapes': 'плёнки записи кассеты аполлон-11',
  'surveyor-1': 'сервейер-1 сервейер 1 сёрвейер', 'surveyor-3': 'сервейер-3 сервейер 3 сёрвейер', 'surveyor-7': 'сервейер-7 сервейер 7 тихо', 'apollo-12-site': 'аполлон-12 аполлон 12 интрепид alsep',
  'apollo-15-lrv': 'луномобиль lrv ровер аполлон-15 машина', 'apollo-16-site': 'аполлон-16 декарт', 'apollo-17-site': 'аполлон-17 таурус литтров сернан', 'viking-2': 'викинг-2 викинг 2',
  phoenix: 'феникс', insight: 'инсайт сейсмометр марсотрясения', ingenuity: 'инджиньюити вертолёт вертолет', 'near-shoemaker': 'нир шумейкер эрос астероид', dawn: 'доун рассвет веста церера',
  kepler: 'кеплер телескоп экзопланеты', 'pioneer-10': 'пионер-10 пионер 10', 'pioneer-11': 'пионер-11 пионер 11',
  luna9: 'луна-9 луна 9', lunokhod1: 'луноход-1 луноход 1 луноход', chandrayaan3: 'чандраян-3 чандраян 3 викрам прагьян',
};
const PLACE_RU = { orbit: 'орбита земли', earth: 'земля', moon: 'луна луне луну луны лунный', mars: 'марс марсе марса марсианский', elsewhere: 'дальний космос', archive: 'архив' };

// ---- museum catalog: all cards, full text ----
const isNasa = (m) => m?.startsWith('nasa:');
const factorTitle = Object.fromEntries(FACTORS.map((f) => [f.id, f.title]));
const sorted = [...OBJECTS].sort((a, b) => a.year - b.year);
const labItems = []; { const seen = new Set();
  sorted.filter((o) => isNasa(o.model)).concat(sorted.filter((o) => !isNasa(o.model) && ['surveyor', 'lrv', 'golf', 'vanguard', 'beagle', 'philae', 'envisat'].includes(o.model.slice(5))))
    .forEach((o) => { if (!seen.has(o.model)) { seen.add(o.model); labItems.push(o); } }); }
const inLab = new Set(labItems.map((o) => o.id));
for (const o of OBJECTS) {
  add({ id: o.id, type: 'card', title: o.name, place: o.place,
    keys: `${o.name} ${o.id.replace(/-/g, ' ')} ${RU[o.id] || ''} ${PLACE_RU[o.place] || ''}`,
    text: `${o.name} (${o.agency}; ${PLACE_LABEL[o.place]}; ${o.date || o.year}). ${o.kind === 'retired' ? 'Retired on purpose / mission ended' : 'Lost or failed'} — status: ${o.status}. Cause category: ${factorTitle[o.factor] || o.factor}. ${o.summary} ${o.story} `
      + (o.facts || []).map(([k, v]) => `${k}: ${v}`).join('; ') + '. '
      + (o.coords ? `Coordinates: ${o.coords[0]}, ${o.coords[1]}. ` : '')
      + `3D: ${isNasa(o.model) ? 'official NASA 3D Resources model' : 'simplified procedural reconstruction'}${inLab.has(o.id) ? ' (also in the 3D Lab)' : ''}. `
      + `Sources: ${(o.sources || []).slice(0, 3).map((s) => `${s.label} <${s.url}>`).join(' | ')}`,
    link: { label: o.name, target: `#catalog?item=${o.id}` }, url: o.sources?.[0]?.url });
}
// ---- one summary per place (answers broad questions like "tell me about the Moon") ----
const PLACE_INTRO = {
  moon: 'The Moon has no air, wind or rain, so hardware left there can last for millions of years. Humans have left landers, rovers, descent stages, experiment packages, laser mirrors and flags there; Apollo 11, 14 and 15 laser retroreflectors (and Lunokhod 1, Chandrayaan-3) are still used to measure the Earth–Moon distance (the Moon drifts away about 3.8 cm per year). Estimates based on NASA records put the human-made material on the Moon at roughly 190 tonnes (about 187,000 kg), from more than 100 crashed or landed objects of many countries; NASA’s NSSDCA keeps the table of impact and landing sites.',
  mars: 'Mars has thin air, dust storms and cold nights; most solar-powered landers there ended when dust covered their panels or winter came, and several landers crashed or went silent during landing.',
  orbit: 'In Earth orbit dead satellites and fragments keep moving at 7–8 km/s; collisions create clouds of debris (see Live Orbit and Numbers).',
  elsewhere: 'In deep space, retired probes sit on asteroids and comets or fly out of the Solar System.',
  earth: 'Some stations were brought down to burn up over the ocean.', archive: 'Some things were lost on Earth, in archives.',
};
for (const [pl, intro] of Object.entries(PLACE_INTRO)) {
  const list = sorted.filter((o) => o.place === pl);
  add({ id: 'place-' + pl, type: 'place', title: `${PLACE_LABEL[pl]} overview`, place: pl, keys: `${PLACE_LABEL[pl]} ${PLACE_RU[pl] || ''} overview всё обзор`,
    text: `${PLACE_LABEL[pl]} — ${intro} The museum has ${list.length} cards here: ` + list.map((o) => `${o.name} (${o.year}, ${o.kind === 'retired' ? 'retired' : 'lost'}): ${o.summary}`).join(' ')
      + (pl === 'moon' ? ` Moon Mission Control also shows: ${MISSIONS.map((m) => `${m.name} (${m.year}, ${m.site})`).join('; ')}.` : ''),
    link: { label: pl === 'moon' ? 'Moon Mission Control' : pl === 'mars' ? 'Mars on the Atlas map' : 'Museum catalog', target: pl === 'moon' ? '#moon' : pl === 'mars' ? '#atlas' : '#catalog' } });
}
// ---- Moon Mission Control missions (slider) ----
for (const m of MISSIONS) {
  add({ id: 'mc-' + m.id, type: 'moon-mission', title: m.name, place: 'moon',
    keys: `${m.name} ${RU[m.id] || ''} ${m.museum ? RU[m.museum] || '' : ''} moon луна`,
    text: `Moon Mission Control pin: ${m.name} (${m.agency}), landed ${m.dateText} at ${m.site} (${m.lat}, ${m.lon}). ${m.kind}. Left on the Moon: ${(m.left || []).join('; ')}. ${m.firsts || ''} Fun fact: ${m.fact || ''} Timeline: ${(m.timeline || []).map((t) => `${t.from}: ${t.text}`).join(' ')} Source: <${m.source}>`,
    link: m.museum ? { label: m.name, target: `#catalog?item=${m.museum}` } : { label: `${m.name} in Moon Mission Control`, target: '#moon' }, url: m.source });
}
// ---- Story chapters ----
const ch = [...rd('src/sections.js').matchAll(/\['([\w-]+)', '(moon|mars)', '([^']*(?:’[^']*)*)', '([^']*(?:’[^']*)*)'\]/g)];
add({ id: 'story', type: 'section', title: 'Scroll Story: Ghosts of exploration', keys: 'story scroll история сюжет глобус ghosts chapters главы',
  text: 'The Story section (#story) is a scroll-driven journey of ten chapters, Moon and Mars only, in chronological order. A 3D globe switches between the Moon and Mars and pins each landing site; each chapter has a button to open its story card. Chapters: '
    + ch.map((m, i) => `${i + 1}. ${m[3]} (${m[2]}, card ${m[1]}): ${m[4]}`).join(' '), link: { label: 'Story', target: '#story' } });
// ---- causes, prevention, numbers ----
add({ id: 'why', type: 'section', title: 'Why missions end', keys: 'why causes reasons почему причины конец миссии заканчиваются',
  text: 'Why missions end (#why): nine cause cards, each with a Details drawer listing the real cases from the museum. ' + FACTORS.map((f) => `${f.title}: ${f.text} Cases: ${f.examples.join(', ')}.`).join(' '),
  link: { label: 'Why missions end', target: '#why' } });
add({ id: 'prevent', type: 'section', title: 'How to prevent it', keys: 'prevent prevention lessons checklist предотвратить уроки чеклист мусор',
  text: 'How to prevent it (#prevent): lessons turned into a checklist; each card has a Checklist drawer. ' + PREVENTION.map((p) => `${p.title} (${p.tag}): ${p.items.join(' ')}`).join(' '),
  link: { label: 'Prevent', target: '#prevent' } });
add({ id: 'numbers', type: 'section', title: 'The debris problem in numbers', keys: 'numbers debris statistics мусор цифры статистика обломки сколько',
  text: 'Numbers (#numbers), from the NASA Orbital Debris Program Office: ' + STATS.map((s) => `${s.value} ${s.label}`).join('; ') + '. How long debris stays up: ' + DECAY.map((d) => `${d.alt}: ${d.time}`).join('; ') + '. Source <https://orbitaldebris.jsc.nasa.gov/faq/>',
  link: { label: 'Numbers', target: '#numbers' } });
add({ id: 'sources', type: 'section', title: 'Sources & credits', keys: 'sources credits источники данные nasa data resources challenge',
  text: 'Sources (#sources): searchable accordions; every fact links to its source. Data sources: ' + DATA_SOURCES.map(([l]) => l).join('; ') + '. Official challenge resources used: ' + CHALLENGE_RESOURCES.map(([l, , ids]) => `${l} (${ids.join(', ')})`).join('; '),
  link: { label: 'Sources', target: '#sources' } });
// ---- 3D Lab ----
add({ id: 'lab', type: 'section', title: '3D Lab', keys: '3d lab model модель лаборатория 3д крутить вращать',
  text: '3D Lab (#lab): pick an object from the list and drag to rotate, scroll or pinch to zoom. Moon objects stand on grey regolith, Mars objects on rusty soil, space objects float in a starfield. Models are cached after the first load. Objects: '
    + labItems.map((o) => `${o.name} (${isNasa(o.model) ? 'NASA model' : 'procedural reconstruction'})`).join('; ') + '. NASA models come from NASA 3D Resources (public domain); procedural ones are coded reconstructions, not official models. Ground texture: Poly Haven "Rocks Ground 09" (CC0).',
  link: { label: '3D Lab', target: '#lab' } });
// ---- Survival Simulator (game) ----
const camps = JSON.parse(rd('public/campaigns/index.json')).campaigns.map((c) => JSON.parse(rd('public/campaigns/' + c.file)));
add({ id: 'game', type: 'section', title: 'Survival Simulator', keys: 'game simulator play survival игра симулятор играть как играть кампания управление',
  text: 'Survival Simulator (#game), a retro mission-control terminal. How to play: pick a campaign (click or keys 1–3); each event is a real problem from the mission; choose a decision with the mouse or number keys (1–3), Enter skips the intro. Gauges: battery, temperature, dust, integrity — if battery or integrity hits 0 the mission ends. Choices marked as the real NASA decision count toward matching the real record; the score combines how long you survived versus the real record, how many real decisions you matched and science return. At the end you see where the spacecraft is now, what is left inside it, and a shareable report link. Sound can be toggled. Gauge numbers are a game model; events, dates and decisions are real and sourced. Campaigns: '
    + camps.map((c) => `${c.title} — ${c.subtitle} (${c.craft}, ${c.year}; ${c.events.length} events; plan: ${c.plan.label} ${c.plan.value} ${c.unit}s; real record: ${c.record.label} ${c.record.value} ${c.unit}s)`).join(' | '),
  link: { label: 'Play the Survival Simulator', target: '#game' } });
for (const c of camps) add({ id: 'game-' + c.id, type: 'campaign', title: c.title, keys: `${c.title} ${c.craft} ${RU[c.id] || RU[c.id.replace(/(\d)$/, '-$1')] || ''} game игра кампания`,
  text: `Simulator campaign "${c.title}": ${c.subtitle} Events: ` + c.events.map((e) => `${e.date || ''} ${e.title} — real decision: ${(e.choices.find((x) => x.real) || {}).label || ''}`).join('; ')
    + `. What really happened: ` + (c.legacy?.timeline || []).map(([d, t]) => `${d}: ${t}`).join(' ') + ` Now: ${c.legacy?.where?.state || ''}`,
  link: { label: c.title, target: '#game' } });
// ---- sections from the page itself (headings + static text) ----
const html = rd('index.html');
for (const m of html.matchAll(/<section([^>]*)>([\s\S]*?)<\/section>/g)) {
  const id = (m[1].match(/id="([\w-]+)"/) || m[1].match(/class="([\w-]+)/) || [])[1]; if (!id) continue;
  const t = strip(m[2]); if (t.length < 40) continue;
  add({ id: 'page-' + id, type: 'page', title: `Page section: ${id}`, keys: `${id} section раздел`, text: `Section #${id} text: ${t.slice(0, 2500)}`, link: id === 'hero' ? null : { label: id, target: '#' + id } });
}
const KEYS_EXTRA = { 'page-moon': 'moon mission control slider year timeline слайдер год луна карта пины рельеф terrain', 'page-orbit': 'live orbit debris satellite sgp4 celestrak орбита мусор спутники обломки',
  'page-atlas': 'atlas map карта атлас пины ghost sites', 'page-catalog': 'catalog museum каталог музей карточки фильтр', 'page-disclosure': 'ai disclosure ии нейросеть как сделан', 'page-hero': 'avantgarde авангард команда team space apps' };
for (const d of docs) if (KEYS_EXTRA[d.id]) d.keys += ' ' + KEYS_EXTRA[d.id];

// ---- always-on overview ----
const OVERVIEW = clean(`SITE: "Abandoned but not Forgotten" by Team Avantgarde for NASA Space Apps Challenge 2026 (https://codemicronx.github.io/nasa-Avantgarde/). Theme: hardware humans left behind on the Moon, Mars, in Earth orbit and deep space, why missions end and how to prevent space junk.
SECTIONS (open them from the "Explore" button top-right): #moon Moon Mission Control — a real LRO-based 3D Moon; drag to spin, tap glowing pins, switch Surface/Terrain (LOLA height colours), and move the YEAR SLIDER from 1966 to today to watch each mission land, work, go silent, get lost or be found again; a mission file panel shows details. #game Survival Simulator — 3 playable campaigns (InSight, Spirit, Surveyor 3): make the real engineers' decisions to keep a spacecraft alive. #story Scroll story — 10 Moon/Mars chapters with a globe that pins each site. #catalog Museum — ${OBJECTS.length} story cards; filter by Retired / Lost & failed, by place and by cause; click a card for the full story, 3D model and sources. #atlas Ghost-site map on real NASA tiles (Moon LRO WAC, Mars Viking/MOLA, Earth GIBS); lavender pins = retired hardware, pink = lost. #lab 3D Lab — rotate ${labItems.length} models. #orbit Live Orbit — real debris clouds (Kosmos 2251, Iridium 33, Fengyun-1C) placed with the SGP4 model from CelesTrak data; hover a dot to identify it, load live elements. #why Why missions end (9 causes). #numbers Debris numbers (NASA ODPO). #prevent Prevention checklist. #disclosure How it was made (AI disclosure). #sources Every fact, linked. Pip (me) is a draggable robot guide; tap ASK to chat.
MUSEUM CARD IDS (id: name, year, place): ${sorted.map((o) => `${o.id}: ${o.name}, ${o.year}, ${o.place}${o.kind === 'retired' ? '' : ', lost'}`).join('; ')}.
COUNTS: ${Object.keys(PLACE_LABEL).map((k) => `${PLACE_LABEL[k]}: ${OBJECTS.filter((o) => o.place === k).length} cards`).join(', ')}. The museum is a curated selection, not a complete list of everything humans left there.
MOON MISSION CONTROL PINS: ${MISSIONS.map((m) => `${m.name} ${m.year}`).join(', ')}.`);

const out = `// AUTO-GENERATED by scripts/build-pip-kb.mjs from the site's source data — do not edit by hand.
export const OVERVIEW = ${JSON.stringify(OVERVIEW)};
export const DOCS: { id: string; type: string; title: string; keys: string; text: string; place?: string; url?: string; link?: { label: string; target: string } | null }[] = ${JSON.stringify(docs)};
`;
fs.mkdirSync(path.join(root, 'supabase/functions/pip-chat'), { recursive: true });
fs.writeFileSync(path.join(root, 'supabase/functions/pip-chat/kb.ts'), out);
console.log(`pip kb: ${docs.length} docs, ${(out.length / 1024).toFixed(0)} KB, overview ${OVERVIEW.length} chars`);
