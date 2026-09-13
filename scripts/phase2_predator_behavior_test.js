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
    createBiquadFilter() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, Q: { setValueAtTime: () => {} } }, connect: () => {} }; }
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
const { Game, Monster } = window.CommuterGame;

const player = { x: 2000, y: 560, vx: 320, coins: 30, isDead: false };
const interceptor = new Monster('red', 1000, 560);
assert.strictEqual(typeof interceptor.assignPredatorRole, 'function', 'Predator role assignment must be explicit');
interceptor.assignPredatorRole('interceptor');
assert.strictEqual(interceptor.predatorRole, 'interceptor');
assert(interceptor.getPredatorTargetX(player) > player.x, 'Interceptor target must lead the player');

interceptor.triggerAttackPhase2();
const beforeX = interceptor.x;
interceptor.update(0.016, player, [{ x: 0, y: 560, w: 3000 }]);
const maxOneFrameTravel = interceptor.speed * 1.45 * 0.016 + 2;
assert(interceptor.x - beforeX <= maxOneFrameTravel, 'Predator catch-up must not teleport during re-entry');
assert(interceptor.x < player.x, 'Predator must remain a pursuer until it naturally catches up');

const game = new Game();
game.startGame();
game.player.x = 3000;
game.player.coins = 30;
game.level.triggerPhase2Predator(game.player);
const roles = new Set(game.level.monsters.map(monster => monster.predatorRole));
assert(roles.has('rear_pursuer'), 'Phase 2 must contain an explicit rear ground pursuer');
assert(roles.has('front_blocker'), 'Phase 2 must contain an explicit front ground blocker');
assert(roles.has('air_harasser'), 'Phase 2 must contain an explicit air harasser');
assert(roles.has('flanker'), 'Phase 2 must contain an explicit flank role');
assert(game.level.monsters.some(monster => monster.x < game.player.x && monster.predatorRole === 'rear_pursuer'));
assert(game.level.monsters.some(monster => monster.x > game.player.x && monster.predatorRole === 'front_blocker'));
assert(game.level.monsters.some(monster => monster.predatorRole === 'flanker' && Math.abs(monster.getPredatorTargetX(game.player) - game.player.x) === 240));

console.log(`PASS: Predator roles and no-teleport pursuit validated across ${game.level.monsters.length} Phase 2 monsters.`);
process.exit(0);
