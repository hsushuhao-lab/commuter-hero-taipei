const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const runtime = html.match(/<script>([\s\S]*?)<\/script>/);
if (!runtime) throw new Error('Could not find the embedded runtime script');

const context = () => ({
  save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, fillRect() {}, strokeRect() {},
  beginPath() {}, arc() {}, ellipse() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, closePath() {},
  drawImage() {}, clearRect() {}, fillText() {}, setLineDash() {}, clip() {}, roundRect() {}, rect() {},
  createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} })
});
global.window = { innerWidth: 960, innerHeight: 540, addEventListener() {} };
global.document = {
  getElementById: () => ({ getContext: context, style: {}, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 256; this.naturalHeight = 256; } };
global.navigator = { maxTouchPoints: 0 };
global.requestAnimationFrame = () => 0;
global.performance = { now: () => 1000 };

eval(runtime[1]);
const { Game, Player, projectiles } = window.CommuterGame;

// Given: a clean Phase II Boss arena with only Sandra's single ultimate.
const game = new Game();
game.startGame();
game.player = new Player('sandra');
game.player.addCoins(30);
game.player.x = 16500;
game.player.y = 540;
game.boss.x = 16800;
game.boss.y = 540;
game.boss.phase = 2;
game.boss.hp = 3050;
game.boss.maxHp = 3050;
projectiles.reset();

// When: all fourteen staggered pans are released and each crosses the Boss once.
game.player.unleashUltimate();
for (let step = 0; step < 18; step++) game.player.updateSandraUltRelease(0.06);
assert.strictEqual(projectiles.projectiles.length, 14, 'Sandra Phase II must release exactly 14 pans');
for (const pan of projectiles.projectiles) {
  pan.x = game.boss.x + game.boss.width / 2;
  pan.y = game.boss.y - game.boss.height / 2;
}
game.handleCollisions();
game.handleCollisions();

// Then: runtime collision applies the intended one-hit-per-pan cap.
const before = 3050;
const after = game.boss.hp;
const delta = before - after;
assert(delta >= 500 && delta <= 600, `Sandra Phase II ult damage must be 500-600, got ${delta}`);
assert(after >= 2450, `Boss must retain at least 2450 HP, got ${after}`);
assert.strictEqual(delta, 560, `One full Sandra Phase II ultimate must deal 560, got ${delta}`);
console.log(`PASS: Sandra P2 isolated Boss damage ${before} -> ${after}; delta=${delta} (${(delta / before * 100).toFixed(1)}%).`);
