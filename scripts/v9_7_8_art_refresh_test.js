const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const refreshed = [
  'hero_yu_portrait.png','hero_shakira_portrait.png','hero_sandra_portrait.png',
  'hero_yu_anim.png','hero_shakira_anim.png','hero_sandra_anim.png',
  'monster_red.png','monster_ice.png','monster_grape.png','monster_blue.png',
  'monster_yellow.png','monster_obsidian.png','monster_pink.png',
  'boss_flower_phase1_v9_7_4.png','boss_flower_phase2_v9_7_7.png'
];
for (const name of refreshed) {
  const live = path.join(root,'assets',name);
  const source = path.join(root,'source','assets',name);
  if (!fs.existsSync(live) || !fs.existsSync(source)) throw new Error(`missing refreshed asset ${name}`);
  const a=crypto.createHash('sha256').update(fs.readFileSync(live)).digest('hex');
  const b=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  if (a!==b) throw new Error(`asset/source mismatch ${name}`);
}
const main=fs.readFileSync(path.join(root,'source','src','main.js'),'utf8');
if (main.includes('chibi_sandra_v9_7_5.png')) throw new Error('Sandra still uses superseded chibi asset');
console.log('PASS: all hero, monster and Boss production assets are refreshed and mirrored.');
