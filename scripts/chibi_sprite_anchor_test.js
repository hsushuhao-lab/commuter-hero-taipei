const fs = require('fs');
const assert = require('assert');

const repo = process.cwd();
const layoutPath = `${repo}/assets/chibi_sprite_layout_v9_8_0.json`;
assert(fs.existsSync(layoutPath), 'v9.8.0 sprite layout manifest must exist');
const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));

assert.strictEqual(layout.frameSize, 512);
assert.strictEqual(layout.framesPerRow, 8);
assert.strictEqual(layout.frameCount, 32);
assert.strictEqual(layout.footY, 448);
assert.strictEqual(layout.bodyCenterX, 256);

for (const id of ['yu', 'shakira', 'sandra']) {
  assert(fs.existsSync(`${repo}/assets/hero_${id}_anim.png`), `${id} remastered sheet must exist`);
  assert(fs.existsSync(`${repo}/source/assets/hero_${id}_anim.png`), `${id} source sheet must exist`);
}

const playerSource = fs.readFileSync(`${repo}/source/src/entities/Player.js`, 'utf8');
assert(playerSource.includes('SPRITE_FRAME_SIZE = 512'));
assert(playerSource.includes('SPRITE_FOOT_Y = 448'));
console.log('PASS: v9.8.0 512px frame and unified foot-anchor contract.');
