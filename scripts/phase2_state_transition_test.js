const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Could not find the embedded runtime script');

global.window = {
  innerWidth: 960,
  innerHeight: 540,
  addEventListener: () => {},
  AudioContext: class {
    constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {}, setTargetAtTime: () => {} }, connect: () => {} }; }
    createOscillator() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, connect: () => {} }; }
    resume() {}
  }
};
global.document = {
  getElementById: () => ({
    getContext: () => ({
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
      fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, arc: () => {}, ellipse: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {}, closePath: () => {},
      drawImage: () => {}, clearRect: () => {}, fillText: () => {}, setLineDash: () => {}, clip: () => {},
      roundRect: () => {}, rect: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }),
    style: {}, addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 })
  })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 256; this.naturalHeight = 256; } };
global.navigator = { maxTouchPoints: 0 };
global.requestAnimationFrame = callback => setTimeout(callback, 16);
global.performance = { now: () => Date.now() };

eval(scriptMatch[1]);
const { Game } = window.CommuterGame;
const game = new Game();
game.startGame();
game.player.hp = 37;
game.player.addCoins(30);
assert.strictEqual(game.player.resonancePhase, 2, '30 coins must trigger Hero Resonance Phase II once');
assert.strictEqual(game.player.maxHp, 200, 'Yu Hero Phase II max HP must be 200');
assert.strictEqual(game.player.hp, 137, 'Hero Phase II must add old max HP, not full-heal');
game.level.triggerPhase2Predator(game.player);

assert(game.level.monsters.length > 0, 'Phase 2 must have active monsters');
for (const monster of game.level.monsters) {
  assert.strictEqual(monster.attackPhase, 2, `${monster.typeKey} attackPhase must be 2`);
  assert.strictEqual(monster.isPhase2, true, `${monster.typeKey} isPhase2 must be true`);
  assert.strictEqual(monster.attackDamage, monster.config.phase2.attackDamage, `${monster.typeKey} damage must be Phase 2 damage`);
  assert.strictEqual(monster.attackCooldown, monster.config.phase2.attackCooldown, `${monster.typeKey} cooldown must be Phase 2 cooldown`);
}

console.log(`PASS: atomic Phase 2 transition synchronized ${game.level.monsters.length} monsters across attackPhase, isPhase2, damage, and cooldown.`);
process.exit(0);
