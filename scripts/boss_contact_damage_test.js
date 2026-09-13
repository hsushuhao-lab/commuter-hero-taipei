const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Could not find the embedded runtime script');

global.window = { innerWidth: 960, innerHeight: 540, addEventListener: () => {} };
global.document = {
  getElementById: () => ({
    getContext: () => ({
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
      fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, arc: () => {}, ellipse: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {}, closePath: () => {},
      drawImage: () => {}, clearRect: () => {}, fillText: () => {}, setLineDash: () => {}, clip: () => {},
      roundRect: () => {}, rect: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }), style: {}, addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 })
  })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 256; this.naturalHeight = 256; } };
global.navigator = { maxTouchPoints: 0 };
global.requestAnimationFrame = cb => setTimeout(cb, 16);
global.performance = { now: () => Date.now() };

eval(scriptMatch[1]);
const { Game } = window.CommuterGame;
const game = new Game();
game.state = 'PLAYING';
game.level.monsters = [];
game.player.x = 15580;
game.player.y = 560;
game.player.hp = 100;
game.player.invulnerableTimer = 0;
game.player.isDead = false;
game.boss.x = 15650;
game.boss.y = 560;
game.boss.entranceDone = true;
game.boss.entranceTriggered = true;
game.boss.entranceTimer = 0;
game.boss.roarTimer = 0;
game.boss.isDead = false;
game.boss.isTransforming = false;

game.boss.phase = 1;
game.boss.resonanceEnraged = false;
game.handleCollisions();
assert.strictEqual(game.player.hp, 82, 'Phase 1 Boss body contact must deal 18 damage');
assert.strictEqual(game.player.vx, -460, 'Contact must knock a player left when player is left of Boss');
game.handleCollisions();
assert.strictEqual(game.player.hp, 82, 'Player iframe must block the next contact frame');

game.player.invulnerableTimer = 0;
game.boss.phase = 2;
game.boss.resonanceEnraged = false;
game.handleCollisions();
assert.strictEqual(game.player.hp, 54, 'Phase 2 Boss body contact must deal 28 damage');

game.player.invulnerableTimer = 0;
game.boss.resonanceEnraged = true;
game.handleCollisions();
assert(Math.abs(game.player.hp - 23.2) < 1e-9, 'Resonance-enraged Phase 2 contact must deal 30.8 damage');

for (const state of [
  { entranceDone: false, isTransforming: false, isDead: false, roarTimer: 0 },
  { entranceDone: true, isTransforming: true, isDead: false, roarTimer: 0 },
  { entranceDone: true, isTransforming: false, isDead: true, roarTimer: 0 },
  { entranceDone: true, isTransforming: false, isDead: false, roarTimer: 1 }
]) {
  game.player.hp = 100;
  game.player.invulnerableTimer = 0;
  Object.assign(game.boss, state);
  game.handleCollisions();
  assert.strictEqual(game.player.hp, 100, 'Boss cinematic/death state must not cause contact damage');
}

console.log('PASS: Boss body contact damage, knockback, iframe, enrage, entrance, transform, roar, and death guards validated.');
