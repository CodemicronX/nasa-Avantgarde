import {initPipChat} from './pip-chat.js';
const POS_KEY = 'pip-pos-v1';
const SECTIONS = {
  hero: { side: 'right', pose: 'wave', line: 'Hi, I`m Pip! I look after the machines people left in space. Scroll down and let`s go explore the space!'},
  moon: {side: 'left', pose: 'point', line: 'This is the real Moon, mapped by NASA`s LRO. Drag it, tap a glowing pin, and move the time slider!'},
  game: {side: 'right', pose: 'think', line: 'Your turn at mission control! Can you keep the spacecraft alive as long as NASA`s engineers did?'},
  story: {side:'right', pose: 'cheer', line: 'Story time! Moon and Mars only - watch the globe switch worlds and pin each landing site.'},
  catalog: {side: 'left', pose:'point', line:'Welcome to the museum of left-behind things. Tap any card to open its story file.'},
  atlas: {side:'right', pose: 'think', line:'These pins sit on real NASA maps. Can you find Tranquility Base, where Apollo 11 landed??'},
  lab: {side: 'left', pose: 'jump', line: '3D lab!! Spin the hardware like a real engineer. Some models come straight from NASA.'},
  
