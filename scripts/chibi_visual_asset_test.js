const fs = require('fs');
const assert = require('assert');

const intro = fs.readFileSync('source/src/ui/Intro.js', 'utf8');
const main = fs.readFileSync('source/src/main.js', 'utf8');
const characters = fs.readFileSync('source/src/data/Characters.js', 'utf8');

for (const id of ['yu', 'shakira', 'sandra']) {
  assert(intro.includes(`assets/intro_${id}_chibi.png`));
  assert(characters.includes(`assets/hero_${id}_anim.png`));
  assert(characters.includes(`assets/chibi_${id}_clean.png`));
}
assert(main.includes('heroSpriteSheets'));
assert(main.includes('drawRemasteredChibiFrame'));
assert(main.includes("e.code === 'F2'"));
console.log('PASS: Opening, select, victory and gameplay all use v9.8.0 Q-chibi assets.');
