export const PREVENTION = [
  { id: 'verify', icon: 'shield', short: 'Check every interface, then test it the way it will fly.', title: 'Verify, test, and test again', tag: 'Engineering',
    items: [
      'Independently check every interface between teams and software modules (the Mars Climate Orbiter board’s central lesson).',
      '“Test as you fly”: run end-to-end simulations with realistic sensor data, including saturated or out-of-range values (Schiaparelli inquiry).',
      'Review every command and software upload before it is sent; keep a way to roll it back (Mars Global Surveyor).',
    ],
    sources: [['MCO Mishap Investigation Board report', 'https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf'], ['ESA Schiaparelli inquiry', 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/Schiaparelli_landing_investigation_completed']] },
  { id: 'units', icon: 'ruler', short: 'Metric everywhere, with units written into the data itself.', title: 'One system of units', tag: 'Standards',
    items: [
      'Use SI (metric) units across the whole project and state units explicitly in every data file and interface document.',
      'Make units part of the data type in software, so a mismatch fails at build time instead of at Mars.',
    ],
    sources: [['NASA NPD 8010.2 — Use of the SI (Metric) System of Measurement in NASA Programs', 'https://nodis3.gsfc.nasa.gov/displayDir.cfm?t=NPD&c=8010&s=2F']] },
  { id: 'redundancy', icon: 'layers', short: 'Backups for everything — and keep talking all the way down.', title: 'Redundancy & telemetry', tag: 'Design',
    items: [
      'Send telemetry during entry, descent and landing — Mars Polar Lander sent none, so nobody could say for certain what happened.',
      'Fly backup computers, sensors and radios, and design a safe mode that keeps the spacecraft pointed at the Sun and Earth.',
      'Make the antenna work even if a deployment step fails (the Beagle 2 lesson).',
    ],
    sources: [['NASA Science — Mars Polar Lander / Deep Space 2', 'https://science.nasa.gov/mission/mars-polar-lander-deep-space-2/'], ['Bridges et al. 2017 — Beagle 2', 'https://doi.org/10.1098/rsos.170785']] },
  { id: 'eva', icon: 'tether', short: 'Tether every tool. Check every tether.', title: 'Tethers & spacewalk procedures', tag: 'Human spaceflight',
    items: [
      'Tether every tool and bag to the suit or the station — the basic rule of EVA work.',
      'Use checklists that confirm each tether before opening a bag or letting go of an item.',
      'Train in neutral-buoyancy pools with the same tools, gloves and bags used in orbit.',
    ],
    sources: [['NASA — Spacewalks', 'https://www.nasa.gov/international-space-station/space-station-spacewalks/']] },
  { id: 'mitigation', icon: 'doc', short: 'Rules that make dead satellites leave orbit in years, not centuries.', title: 'Debris mitigation rules', tag: 'Policy',
    items: [
      '25-year guideline: spacecraft in low Earth orbit should leave orbit within 25 years after the mission ends (U.S. Government Orbital Debris Mitigation Standard Practices).',
      '5-year rule: in 2022 the U.S. FCC adopted a rule requiring LEO satellites it licenses to deorbit within 5 years of ending their mission.',
      'Passivation: vent leftover propellant and discharge batteries so dead objects cannot explode later.',
      'Move geostationary satellites to a graveyard orbit above the GEO belt at end of life.',
    ],
    sources: [['U.S. Government ODMSP (2019)', 'https://orbitaldebris.jsc.nasa.gov/library/usg_orbital_debris_mitigation_standard_practices_november_2019.pdf'], ['FCC — 5-year rule for deorbiting satellites', 'https://www.fcc.gov/document/fcc-adopts-new-5-year-rule-deorbiting-satellites-0'], ['NASA ODPO FAQ', 'https://orbitaldebris.jsc.nasa.gov/faq/']] },
  { id: 'deorbit', icon: 'deorbit', short: 'Save fuel for one last burn toward an empty ocean.', title: 'Planned deorbiting', tag: 'Operations',
    items: [
      'Keep enough fuel at the end of the mission for a final burn into the atmosphere.',
      'Steer large objects into the remote South Pacific, as was done with Mir in 2001, instead of letting them fall at random like Skylab in 1979.',
      'Design for demise: choose materials that burn up completely on re-entry.',
    ],
    sources: [['NOAA — Point Nemo', 'https://oceanservice.noaa.gov/facts/point-nemo.html']] },
  { id: 'adr', icon: 'target', short: 'Nets, harpoons and magnets that catch junk already up there.', title: 'Active debris removal', tag: 'New technology',
    items: [
      'ClearSpace-1 (ESA-procured mission) — designed to capture and deorbit a defunct object.',
      'ELSA-d (Astroscale, launched 2021) — demonstrated magnetic capture of a client satellite in orbit.',
      'ADRAS-J (Astroscale, 2024) — approached and inspected a discarded Japanese H-IIA upper stage at close range.',
      'RemoveDEBRIS (University of Surrey, 2018) — tested a net and a harpoon on targets in orbit.',
    ],
    sources: [['ESA — ClearSpace-1', 'https://www.esa.int/Space_Safety/ClearSpace-1'], ['Astroscale — ELSA-d', 'https://astroscale.com/missions/elsa-d/'], ['Astroscale — ADRAS-J', 'https://astroscale.com/missions/adras-j/'], ['Surrey Space Centre — RemoveDEBRIS', 'https://www.surrey.ac.uk/surrey-space-centre/missions/removedebris']] },
  { id: 'tracking', icon: 'radar', short: 'Know where everything is, and share it with everyone.', title: 'Tracking & sharing orbits', tag: 'Space situational awareness',
    items: [
      'Space-Track.org publishes the U.S. Space Force catalog of tracked objects.',
      'CelesTrak redistributes orbital elements openly — this site uses them for its live globe.',
      'Commercial radar networks such as LeoLabs track objects in low Earth orbit.',
      'Collision avoidance: the ISS manoeuvres when the risk of a hit exceeds 1 in 10,000 (NASA ODPO).',
    ],
    sources: [['Space-Track.org', 'https://www.space-track.org/'], ['CelesTrak', 'https://celestrak.org/'], ['LeoLabs', 'https://leolabs.space/'], ['NASA ODPO FAQ', 'https://orbitaldebris.jsc.nasa.gov/faq/']] },
  { id: 'archive', icon: 'archive', short: 'Keep the data readable forever, in more than one place.', title: 'Archive the data forever', tag: 'Data',
    items: [
      'Deposit raw and processed data in long-term public archives such as NASA’s Planetary Data System and NSSDCA.',
      'Migrate data off ageing media and formats before the readers disappear (the Apollo 11 tapes lesson).',
      'Keep several copies in different places, with documentation that explains how to read them.',
      'Open data enables discovery: citizens and scientists found Beagle 2 and Vikram in public orbiter images.',
    ],
    sources: [['NASA Planetary Data System', 'https://pds.nasa.gov/'], ['NASA NSSDCA', 'https://nssdc.gsfc.nasa.gov/'], ['Apollo 11 tapes final report', 'https://ntrs.nasa.gov/citations/20110011709']] },
];

// Figures from NASA ODPO FAQ (accessed Nov 2026)
export const STATS = [
  { icon: 'eye', value: '≈50,000', label: 'large, trackable objects orbiting Earth', src: 'NASA ODPO' },
  { icon: 'list', value: '34,000+', label: 'objects catalogued by the U.S. Space Surveillance Network (Aug 2026)', src: 'NASA ODPO' },
  { icon: 'dust', value: '≈100 million', label: 'estimated millimetre-sized debris pieces', src: 'NASA ODPO' },
  { icon: 'speed', value: '7–8 km/s', label: 'speed of debris in low Earth orbit', src: 'NASA ODPO' },
  { icon: 'burst', value: '≈10 km/s', label: 'average relative impact speed', src: 'NASA ODPO' },
  { icon: 'dodge', value: '41', label: 'ISS debris-avoidance manoeuvres since 1999', src: 'NASA ODPO' },
];
export const DECAY = [
  { alt: 'below 600 km', time: 'several years', w: 8 },
  { alt: '≈800 km', time: 'centuries', w: 55 },
  { alt: 'above 1,000 km', time: '1,000+ years', w: 100 },
];

export const DATA_SOURCES = [
  ['NASA Orbital Debris Program Office (ODPO) — FAQ & statistics', 'https://orbitaldebris.jsc.nasa.gov/faq/'],
  ['NASA ODPO — Orbital Debris Quarterly News', 'https://orbitaldebris.jsc.nasa.gov/quarterly-news/'],
  ['CelesTrak — NORAD GP element sets (live debris & satellites)', 'https://celestrak.org/NORAD/elements/'],
  ['NASA NSSDCA — NASA Space Science Data Coordinated Archive (mission records)', 'https://nssdc.gsfc.nasa.gov/'],
  ['NASA NSSDCA — Anthropogenic impacts & spacecraft on the Moon', 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html'],
  ['NASA Solar System Treks — Moon LRO WAC mosaic & Mars Viking MDIM 2.1 / MOLA tiles', 'https://trek.nasa.gov/'],
  ['NASA GIBS — Blue Marble shaded relief & bathymetry tiles', 'https://nasa-gibs.github.io/gibs-api-docs/'],
  ['NASA 3D Resources — GLB models (public domain)', 'https://github.com/nasa/NASA-3D-Resources'],
  ['NASA Image and media usage guidelines', 'https://www.nasa.gov/nasa-brand-center/images-and-media/'],
  ['Lunar Reconnaissance Orbiter Camera (LROC) — impact site images', 'https://www.lroc.im-ldi.com/'],
  ['The Planetary Society — Mars landing sites map (2020)', 'https://planetary.s3.amazonaws.com/assets/images/charts-diagrams/2020/20200603_map-mars-landing-sites-2020-detailed_ver1-3.pdf'],
  ['satellite.js — SGP4 orbit propagation', 'https://github.com/shashwatak/satellite-js'],
];

// The NASA Data & Resources listed on the official 2026 challenge page ("Resources" tab), and where each one appears in this project.
export const CHALLENGE_RESOURCES = [
  ['NASA Space Science Data Coordinated Archive (NSSDCA)', 'https://nssdc.gsfc.nasa.gov/', ['apollo-11-site', 'apollo-12-site', 'apollo-15-lrv']],
  ['Apollo Lunar Modules (descent stages)', 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C', ['apollo-11-site', 'apollo-12-site', 'apollo-16-site', 'apollo-17-site']],
  ['Lunar Roving Vehicles (LRVs)', 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C', ['apollo-15-lrv']],
  ['ALSEP scientific packages', 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C', ['apollo-12-site']],
  ['Surveyor landers', 'https://science.nasa.gov/mission/surveyor-3/', ['surveyor-1', 'surveyor-3', 'surveyor-7']],
  ['Sojourner rover (Mars Pathfinder)', 'https://science.nasa.gov/mission/mars-pathfinder/', ['mars-pathfinder']],
  ['Spirit & Opportunity', 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/', ['spirit', 'opportunity']],
  ['Viking 1 & 2 landers', 'https://science.nasa.gov/mission/viking-1/', ['viking-1', 'viking-2']],
  ['Phoenix & InSight landers', 'https://science.nasa.gov/mission/insight/', ['phoenix', 'insight']],
  ['Dawn spacecraft', 'https://science.nasa.gov/mission/dawn/', ['dawn']],
  ['NEAR Shoemaker', 'https://science.nasa.gov/mission/near-shoemaker/', ['near-shoemaker']],
  ['Pioneer 10 & 11', 'https://science.nasa.gov/mission/pioneer-10/', ['pioneer-10', 'pioneer-11']],
  ['Ingenuity helicopter', 'https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/', ['ingenuity']],
  ['Kepler Space Telescope', 'https://science.nasa.gov/mission/kepler/', ['kepler']],
];
