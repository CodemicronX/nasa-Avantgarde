// Mission data for "Abandoned but not Forgotten".
// Landing dates are UTC. Coordinates: NASA NSSDCA (LRO-derived) unless noted.
// Status timeline: each entry applies from `from` (year) until the next entry.
// Status keys: active | visited | silent | lost | working | found

export const STATUS = {
  future:  { label: "Not landed yet",       color: "#5b6b86" },
  active:  { label: "Active",               color: "#3ee08f" },
  visited: { label: "Visited by astronauts", color: "#ffd166" },
  silent:  { label: "Silent, still there",  color: "#ff8a4c" },
  lost:    { label: "Lost (location unknown)", color: "#ff5d73" },
  working: { label: "Still helping science", color: "#5cc8ff" },
  found:   { label: "Found again",          color: "#c38bff" },
};

export const MISSIONS = [
  {
    id: "luna9", name: "Luna 9", agency: "USSR", flag: "☭",
    date: "1966-02-03", dateText: "3 Feb 1966", year: 1966,
    lat: 7.08, lon: -64.37, coordNote: "approximate (NSSDCA). A 2026 machine-learning study (Pinault et al., npj Space Exploration) proposed a possible site near 7.03° N, 64.33° W; it still needs confirming with sharper images",
    site: "Oceanus Procellarum (Ocean of Storms)",
    kind: "Robotic lander",
    left: ["The 99 kg ball-shaped landing capsule, with its four petals opened"],
    firsts: "First spacecraft to make a soft landing on the Moon and send pictures from its surface.",
    fact: "Before Luna 9, some scientists worried a lander might sink into deep Moon dust. It didn't!",
    source: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunarussr.html",
    timeline: [
      { from: 1966, status: "active", text: "Landed and sent the first photos from the lunar surface until its batteries ran out on 6 Feb 1966." },
      { from: 1967, status: "silent", text: "Batteries empty. The little capsule is still out there, but nobody has spotted it for sure yet." },
    ],
    pip: {
      active: "Luna 9 just landed! First photos ever FROM the Moon. Say cheese, Ocean of Storms!",
      silent: "Luna 9 is quiet now. It's like a lost ball in the garden – we know it's somewhere around here!",
    },
  },
  {
    id: "surveyor1", museum: "surveyor-1", name: "Surveyor 1", agency: "NASA (USA)", flag: "★",
    date: "1966-06-02", dateText: "2 Jun 1966", year: 1966,
    lat: -2.4745, lon: -43.3398, site: "Inside a crater north of Flamsteed, Oceanus Procellarum",
    kind: "Robotic lander",
    left: ["The Surveyor 1 lander with its TV camera"],
    firsts: "First American soft landing on the Moon.",
    fact: "It sent back more than 11,000 pictures to help NASA choose safe places for Apollo astronauts.",
    source: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-045A",
    timeline: [
      { from: 1966, status: "active", text: "Landed softly and took thousands of pictures of the ground around it." },
      { from: 1967, status: "silent", text: "Last contact on 7 Jan 1967. LRO later photographed it from orbit." },
    ],
    pip: {
      active: "Surveyor 1 is testing the ground for future astronauts. Safety inspector of the Moon!",
      silent: "Surveyor 1 finished its job. LRO still spots it from orbit – hi, old friend!",
    },
  },
  {
    id: "surveyor3", museum: "surveyor-3", name: "Surveyor 3", agency: "NASA (USA)", flag: "★",
    date: "1967-04-20", dateText: "20 Apr 1967", year: 1967,
    lat: -3.0162, lon: -23.418, site: "Oceanus Procellarum, on a 14° slope inside a small crater",
    kind: "Robotic lander",
    left: ["The Surveyor 3 lander (minus parts taken home by Apollo 12)"],
    firsts: "First spacecraft to dig in lunar soil with a scoop, and the only robot ever visited by astronauts on the Moon.",
    fact: "Its engines didn't switch off in time, so it bounced before landing. In 1969 the Apollo 12 crew walked over and took its camera back to Earth.",
    source: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1967-035A",
    timeline: [
      { from: 1967, status: "active", text: "Bounced, landed, dug trenches up to 18 cm deep and sent 6,326 pictures until early May 1967." },
      { from: 1968, status: "silent", text: "Lunar night ended the mission. It waited alone for two and a half years." },
      { from: 1969, status: "visited", text: "Apollo 12 astronauts Pete Conrad and Alan Bean walked to it and brought its TV camera and other parts home." },
      { from: 1970, status: "silent", text: "Still standing next to the Apollo 12 site, about 180 m away. LRO has photographed both together." },
    ],
    pip: {
      active: "Surveyor 3 bounced like a basketball before landing. Boing, boing… nailed it!",
      silent: "Surveyor 3 is waiting. Guess who's coming to visit in 1969? Move the slider and see!",
      visited: "Visitors! Apollo 12 astronauts walked over and took Surveyor 3's camera home. Best house call ever.",
    },
  },
  {
    id: "apollo11", museum: "apollo-11-site", name: "Apollo 11", agency: "NASA (USA)", flag: "★",
    date: "1969-07-20", dateText: "20 Jul 1969", year: 1969,
    lat: 0.67416, lon: 23.47314, site: "Tranquility Base, Mare Tranquillitatis (Sea of Tranquility)",
    kind: "Crewed landing · Neil Armstrong, Buzz Aldrin (Michael Collins in orbit)",
    left: [
      "Descent stage of the lunar module Eagle, with a plaque: “We came in peace for all mankind”",
      "Laser Ranging Retroreflector (mirror for Earth's lasers)",
      "Passive seismometer (moonquake detector)",
      "US flag (Aldrin saw it blown over by the engine blast at lift-off; LRO images show no flag shadow there)",
      "A silicon disc with goodwill messages from leaders of 73 countries, and an Apollo 1 mission patch",
    ],
    firsts: "First humans to walk on the Moon.",
    fact: "Scientists on Earth still fire lasers at the Apollo 11 mirror to measure the Moon's distance – it is slowly moving away, about 3.8 cm a year.",
    source: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C",
    timeline: [
      { from: 1969, status: "visited", text: "Armstrong and Aldrin walked here for about 2.5 hours and set up experiments." },
      { from: 1970, status: "working", text: "The seismometer stopped in Aug 1969, but the laser mirror still works today. No batteries needed!" },
    ],
    pip: {
      visited: "One small step! Armstrong and Aldrin are here. I'm trying very hard not to scream with excitement.",
      working: "Apollo 11's mirror is still on duty. Scientists bounce lasers off it like the Moon's best disco ball!",
    },
  },
  {
    id: "apollo12", museum: "apollo-12-site", name: "Apollo 12", agency: "NASA (USA)", flag: "★",
    date: "1969-11-19", dateText: "19 Nov 1969", year: 1969,
    lat: -3.0128, lon: -23.4219, site: "Oceanus Procellarum, ~180 m from Surveyor 3",
    kind: "Crewed landing · Pete Conrad, Alan Bean (Richard Gordon in orbit)",
    left: [
      "Descent stage of the lunar module Intrepid",
      "ALSEP science station (seismometer and other instruments)",
      "US flag (LRO images from 2012 show it still casts a shadow)",
    ],
    firsts: "First precision landing – right next to a robot that had landed 2.5 years earlier.",
    fact: "After the crew left, the ascent stage was crashed into the Moon on purpose. The seismometer felt the first artificial moonquake.",
    source: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C",
    timeline: [
      { from: 1969, status: "visited", text: "Conrad and Bean landed within walking distance of Surveyor 3." },
      { from: 1970, status: "active", text: "The ALSEP science station sent data about moonquakes and the solar wind." },
      { from: 1977, status: "silent", text: "All ALSEP stations were switched off on 30 Sep 1977. The flag is still standing." },
    ],
    pip: {
      visited: "Apollo 12 parked right next to Surveyor 3. That's what I call parallel parking!",
      active: "Apollo 12's science station is listening for moonquakes. Shhh… the Moon is talking.",
      silent: "Apollo 12's station was switched off in 1977. Goodnight, Intrepid!",
    },
  },
  {
    id: "lunokhod1", name: "Lunokhod 1", agency: "USSR (Luna 17)", flag: "☭",
    date: "1970-11-17", dateText: "17 Nov 1970", year: 1970,
    lat: 38.3158, lon: -35.005, site: "Mare Imbrium (Sea of Rains)",
    kind: "Robotic rover",
    left: ["The Luna 17 landing platform", "The Lunokhod 1 rover with a French-made laser reflector"],
    firsts: "First remote-controlled rover to drive on another world.",
    fact: "It drove 10.5 km over 322 days. Then it was lost for almost 40 years until NASA's LRO camera found it in 2010.",
    source: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunarussr.html",
    timeline: [
      { from: 1970, status: "active", text: "Rolled off its lander and started driving, steered by a team on Earth." },
      { from: 1972, status: "lost", text: "Last heard from on 14 Sep 1971. Nobody knew exactly where it had parked." },
      { from: 2010, status: "found", text: "LRO photos showed the rover and its tracks. On 22 Apr 2010 a laser from Earth bounced off its reflector again!" },
      { from: 2011, status: "working", text: "Its reflector is used again for laser ranging experiments from Earth." },
    ],
    pip: {
      active: "Lunokhod 1 is driving! It's like a remote-control car… with a 384,000 km remote.",
      lost: "Where is Lunokhod 1? It went quiet in 1971 and nobody knows exactly where it parked. Moon hide-and-seek!",
      found: "FOUND IT! LRO spotted Lunokhod 1 after almost 40 years. Best game of hide-and-seek ever.",
      working: "Lunokhod 1's mirror is back to work, helping measure the Moon. Retired? Never!",
    },
  },
  {
    id: "apollo15", museum: "apollo-15-lrv", name: "Apollo 15", agency: "NASA (USA)", flag: "★",
    date: "1971-07-30", dateText: "30 Jul 1971", year: 1971,
    lat: 26.13239, lon: 3.6333, site: "Hadley–Apennine, at the foot of the Apennine mountains",
    kind: "Crewed landing · David Scott, James Irwin (Alfred Worden in orbit)",
    left: [
      "Descent stage of the lunar module Falcon",
      "Lunar Roving Vehicle – the first Moon car",
      "ALSEP science station and a laser retroreflector",
      "“Fallen Astronaut” statuette and a plaque honouring 14 astronauts and cosmonauts who died",
      "The falcon feather that Scott dropped with a hammer to show they fall at the same speed",
    ],
    firsts: "First mission to use a Lunar Roving Vehicle.",
    fact: "David Scott dropped a hammer and a feather at the same time. With no air, they hit the ground together – just like Galileo predicted!",
    source: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C",
    timeline: [
      { from: 1971, status: "visited", text: "Scott and Irwin drove the first Moon car and explored for three days." },
      { from: 1972, status: "active", text: "The ALSEP station sent science data back to Earth." },
      { from: 1977, status: "working", text: "ALSEP switched off on 30 Sep 1977, but the laser reflector still works today." },
    ],
    pip: {
      visited: "Apollo 15 brought a CAR to the Moon! Top speed about 13 km/h. Even I could catch it.",
      active: "Apollo 15's station is still sending data. And the hammer and feather are still lying where they fell!",
      working: "The rover is parked forever, but Apollo 15's mirror still bounces lasers back to Earth.",
    },
  },
  {
    id: "apollo17", museum: "apollo-17-site", name: "Apollo 17", agency: "NASA (USA)", flag: "★",
    date: "1972-12-11", dateText: "11 Dec 1972", year: 1972,
    lat: 20.1911, lon: 30.7723, site: "Taurus–Littrow valley",
    kind: "Crewed landing · Eugene Cernan, Harrison Schmitt (Ronald Evans in orbit)",
    left: [
      "Descent stage of the lunar module Challenger, with a plaque",
      "Lunar Roving Vehicle",
      "ALSEP science station",
      "US flag (still standing in LRO images)",
    ],
    firsts: "Last time humans walked on the Moon. Schmitt was the first scientist (a geologist) on the Moon.",
    fact: "Gene Cernan's footprints are the last human footprints on the Moon. With no wind, they could last a very long time.",
    source: "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096C",
    timeline: [
      { from: 1972, status: "visited", text: "Cernan and Schmitt explored the valley for three days and left on 14 Dec 1972." },
      { from: 1973, status: "active", text: "The ALSEP station kept sending science data." },
      { from: 1977, status: "silent", text: "Switched off on 30 Sep 1977. Nobody has walked on the Moon since." },
    ],
    pip: {
      visited: "Apollo 17 – the last footprints on the Moon (so far!). Maybe the next ones will be yours?",
      active: "Apollo 17's station is still working while the astronauts are long back home.",
      silent: "Apollo 17 went quiet in 1977. The footprints are still there, waiting for new neighbours.",
    },
  },
  {
    id: "chandrayaan3", name: "Chandrayaan-3", agency: "ISRO (India)", flag: "✦",
    date: "2023-08-23", dateText: "23 Aug 2023", year: 2023,
    lat: -69.373, lon: 32.319, site: "Near the lunar south pole, near Manzinus crater",
    kind: "Robotic lander (Vikram) and rover (Pragyan)",
    left: ["Vikram lander", "Pragyan rover", "NASA's tiny Laser Retroreflector Array (5 cm wide) on Vikram"],
    firsts: "First landing near the lunar south pole.",
    fact: "On 12 Dec 2023, NASA's LRO hit Vikram's tiny NASA mirror with a laser from 100 km away – the first time a spacecraft did this at the Moon.",
    source: "https://science.nasa.gov/missions/lro/laser-instrument-on-nasas-lro-successfully-pings-indian-moon-lander/",
    timeline: [
      { from: 2023, status: "active", text: "Vikram and Pragyan worked for about two weeks, then went to sleep for the freezing lunar night." },
      { from: 2024, status: "working", text: "They did not wake up, but NASA's mirror on Vikram is now a permanent marker near the south pole." },
    ],
    pip: {
      active: "Chandrayaan-3 landed near the south pole! Brrr, it's chilly down there.",
      working: "Vikram is asleep, but its NASA mirror is wide awake. LRO said hi with a laser!",
    },
  },
];

export const TODAY_YEAR = new Date().getFullYear();

export function statusAt(m, year) {
  if (year < m.year) return { status: "future", text: `Lands in ${m.year}.` };
  let cur = m.timeline[0];
  for (const t of m.timeline) if (year >= t.from) cur = t;
  return cur;
}

export const JOKES = [
  "Why did the astronaut break up with the Moon? It needed space.",
  "How does the Moon cut its hair? Eclipse it!",
  "What do you call a tick on the Moon? A luna-tick!",
  "Did you hear about the restaurant on the Moon? Great food, no atmosphere.",
  "What do astronauts eat their lunch from? Satellite dishes!",
];
