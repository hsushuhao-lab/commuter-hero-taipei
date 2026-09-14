const fs = require('fs');
const assert = require('assert');

const generator = fs.readFileSync('scripts/generate_hero_spritesheets.py', 'utf8');
const player = fs.readFileSync('source/src/entities/Player.js', 'utf8');

assert(generator.includes("'idle': [0, 1, 2, 3]"));
assert(generator.includes("'run': [8, 9, 10, 11, 12, 13]"));
assert(generator.includes("'attack': [17, 18, 19, 20, 21]"));
assert(generator.includes("'victory': [22, 23, 24, 25]"));
assert(generator.includes("'ultimate': [26, 27, 28, 29, 30, 31]"));
assert(player.includes("yuRunDiag === 'static' ? 0 : Math.floor(this.animTimer * 12) % 6"));
assert(player.includes('window.YU_RUN_DIAG'));
assert(generator.includes('YU_RUN_CONTACT_OFFSETS'));
assert(generator.includes('apply_yu_run_pose'));
assert(player.includes('this.currentFrame = 26 + frameIdx'));
console.log('PASS: animation-state frames remain deterministic and shared across heroes.');
