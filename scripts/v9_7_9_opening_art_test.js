const fs = require('fs');
const assert = require('assert');

const intro = fs.readFileSync('source/src/ui/Intro.js', 'utf8');
const generator = fs.readFileSync('scripts/generate_hero_spritesheets.py', 'utf8');
const main = fs.readFileSync('source/src/main.js', 'utf8');
const build = fs.readFileSync('scripts/build_single_file.py', 'utf8');

const requiredShots = [
  'renderShot1TaipeiDawn',
  'renderShot2HeroBeats',
  'renderShot3CommuteMontage',
  'renderShot4MonsterAmbush',
  'renderShot5BossTease',
  'renderShot6HeroRunLogo'
];

assert(intro.includes('this.duration = 13.5'), 'Opening must last exactly 13.5 seconds');
for (const shot of requiredShots) {
  assert(intro.includes(`${shot}(`), `Missing six-shot renderer: ${shot}`);
}

for (const asset of ['intro_yu_chibi.png', 'intro_shakira_chibi.png', 'intro_sandra_chibi.png']) {
  assert(intro.includes(`assets/${asset}`), `Opening must preload approved art: ${asset}`);
  assert(fs.existsSync(`source/assets/${asset}`), `Missing source asset: ${asset}`);
  assert(fs.existsSync(`assets/${asset}`), `Missing runtime asset: ${asset}`);
}

for (const banned of ['renderAct3Monsters', 'renderAct4Heroes', 'ATK:', 'SPD:', 'P1: 標準阻截模式', '突發通勤警報']) {
  assert(!intro.includes(banned), `Opening still contains presentation/debug content: ${banned}`);
}

assert(intro.includes("'07:57｜象山'"), 'Opening must establish Taipei morning and Xiangshan');
assert(intro.includes("'晨霧異變'"), 'Monster ambush needs its one-line title');
assert(intro.includes("'夢影巨花王'"), 'Boss tease needs its title');
assert(intro.includes("'按任意鍵開始'"), 'Final logo needs a start prompt');
assert(intro.includes('reducedMotion'), 'Opening must include a reduced-motion path');
assert(main.includes("classList.toggle('opening-active'"), 'Runtime must expose Opening state for portrait presentation');
assert(build.includes('body.opening-active #orientationWarning'), 'Portrait rotation warning must not cover the Opening');

assert(generator.includes('apply_joint_motion'), 'Spritesheet generator must articulate limbs locally');
assert(generator.includes('LIMB_CONTROL_POINTS'), 'Spritesheet generator must define per-hero joint control points');
assert(generator.includes("'character_Q01.png'"), 'Yu gameplay art must come from Q01');
assert(generator.includes("'character_Q02.png'"), 'Shakira gameplay art must come from Q02');
assert(generator.includes("'character_Q03.png'"), 'Sandra gameplay art must come from Q03');

console.log('PASS: v9.7.9 six-shot opening and articulated Q-hero asset contract.');
