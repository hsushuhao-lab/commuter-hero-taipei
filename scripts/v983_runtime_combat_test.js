const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script, 'Expected bundled game runtime');

const context = () => ({ save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, fillRect() {}, strokeRect() {}, beginPath() {}, arc() {}, ellipse() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, closePath() {}, drawImage() {}, clearRect() {}, fillText() {}, setLineDash() {}, clip() {}, roundRect() {}, rect() {}, createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) });
global.window = { innerWidth: 960, innerHeight: 540, addEventListener() {} };
global.document = { getElementById: () => ({ getContext: context, style: {}, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) }) };
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 512; this.naturalHeight = 512; } };
global.navigator = { maxTouchPoints: 0 };
global.requestAnimationFrame = () => 0;
global.performance = { now: () => 1000 };
eval(script);

const { Game, Player, projectiles } = window.CommuterGame;
const game = new Game();
game.startGame();
game.levelIntroTimer = 0;
game.boss.entranceDone = true;
game.boss.entranceTriggered = false;
game.boss.phase = 2;
game.boss.isTransforming = false;
game.boss.isDead = false;
game.boss.hp = 10000;
game.boss.maxHp = 10000;
game.player.x = 15500;
game.player.y = 540;
window.activeGame = game;

const shakira = new Player('shakira');
shakira.x = 15500;
shakira.y = 540;
shakira.addCoins(30);
game.player = shakira;
projectiles.reset();
const originalTakeDamage = game.boss.takeDamage.bind(game.boss);
shakira.unleashUltimate();
assert.strictEqual(projectiles.projectiles.length, 14, 'Shakira must create two waves of seven eggs');
assert(projectiles.projectiles.every(projectile => projectile.damage === 50), 'Shakira P2 eggs must use 50 direct damage');
assert.strictEqual(projectiles.projectiles.filter(projectile => projectile.releaseAfter > 0).length, 7, 'Shakira second wave must be staggered');
for (let step = 0; step < 100; step += 1) {
  projectiles.update(0.016);
  game.handleCollisions();
}
const shakiraDamage = 10000 - game.boss.hp;
assert(shakiraDamage >= 450 && shakiraDamage <= 550, `Shakira P2 Boss damage must be 450-550, got ${shakiraDamage}`);

const yu = new Player('yu');
yu.x = 15500;
yu.y = 540;
yu.addCoins(30);
game.player = yu;
game.boss.hp = 10000;
game.boss.multiHitGate.clear();
projectiles.reset();
yu.unleashUltimate();
assert.strictEqual(projectiles.projectiles.length, 8, 'Yu must release eight blades');
assert(projectiles.projectiles.every(projectile => projectile.damage === 65), 'Yu P2 blades must use 65 damage');
for (let step = 0; step < 100; step += 1) {
  projectiles.update(0.016);
  game.handleCollisions();
}
const yuDamage = 10000 - game.boss.hp;
assert(yuDamage >= 480 && yuDamage <= 560, `Yu P2 Boss damage must be 480-560, got ${yuDamage}`);

game.player = yu;
game.companions = [];
game._prepareVictoryCompanions();
assert.deepStrictEqual(new Set(window.__VISIBLE_HERO_IDS__).size, 3, 'Victory run must show exactly three unique heroes');
game._finishVictory();
assert.strictEqual(game.state, 'VICTORY', 'Victory cleanup must enter final result state');
assert.strictEqual(game.companions.length, 0, 'Final result must render no world companions');
assert.strictEqual(window.__VISIBLE_HERO_IDS__.length, 0, 'Final result must report no world runners');

console.log(`PASS: v9.8.3 runtime combat verified (Yu=${yuDamage}, Shakira=${shakiraDamage}).`);
