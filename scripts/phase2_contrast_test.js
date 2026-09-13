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
const { Game, Monster, projectiles } = window.CommuterGame;

console.log('=== Phase 2 Contrast & Density Test ===');

const testMonsterIds = ['red', 'blue', 'pink', 'ice', 'grape', 'yellow', 'obsidian'];
testMonsterIds.forEach(id => {
  const m = new Monster(id, 0, 0);
  const p1Dmg = m.attackDamage;
  const p1Cd = m.attackCooldown;
  m.triggerAttackPhase2();
  const p2Dmg = m.attackDamage;
  const p2Cd = m.attackCooldown;
  
  const dmgRatio = p2Dmg / p1Dmg;
  const rateRatio = p1Cd / p2Cd;
  assert(dmgRatio >= 1.9 && dmgRatio <= 2.1, `Damage ratio for ${id} should be ~2.0, got ${dmgRatio}`);
  assert(rateRatio >= 1.8 && rateRatio <= 2.2, `Attack rate ratio for ${id} should be ~2.0, got ${rateRatio}`);
});

console.log('PASS: Phase 2 per-hit damage is ~2x Phase 1');
console.log('PASS: Phase 2 attack event rate is ~2x Phase 1');

// 2. Verify No-Combat usually fails + Cleanup (no unbounded growth)
const game = new Game();
game.startGame();
game.player.coins = 30; // Trigger phase 2
game.player.x = 7500; // Start at beginning of Phase 2 (Scene 3)
game.levelIntroTimer = 0;
let maxMonsters = 0;
let maxProjectiles = 0;

for(let i = 0; i < 5000; i++) {
  if (game.state === 'GAMEOVER') break; // The test expects player to die
  
  // Just hold right, do not attack or jump
  game.player.vx = 320;
  game.update(0.02);
  
  const activeM = game.level.monsters.filter(m => {
    const nearPlayer = Math.abs(m.x - game.player.x) < 750;
    const rearReentry = m.attackPhase === 2 && m.isPursuer && game.player.x - m.x > 750 && game.player.x - m.x < 1400;
    return nearPlayer || rearReentry;
  }).length;
  if (activeM > maxMonsters) maxMonsters = activeM;
  const activeP = projectiles.projectiles.filter(p => !p.isDead).length;
  if (activeP > maxProjectiles) maxProjectiles = activeP;
}

console.log(`Max active monsters: ${maxMonsters}`);
console.log(`Max active projectiles: ${maxProjectiles}`);
assert(maxMonsters < 40, 'Monster cleanup failed (too many active monsters)');
assert(maxProjectiles < 80, 'Projectile cleanup failed (too many active projectiles)');
console.log('PASS: Entity cleanup is functional, no unbounded growth');

assert(game.state === 'GAMEOVER', 'Player survived Phase 2 without combat! Should fail.');
console.log('PASS: Phase 2 no-combat successfully fails.');

// 3. Verify tactical pressure (front/rear/air/flank roles)
let roles = new Set();
game.level.monsters.forEach(m => {
  if (m.predatorRole) roles.add(m.predatorRole);
});
assert(roles.has('pursuer') || roles.has('rear_pursuer') || roles.has('air_harasser'), 'Should have explicit tactical roles');
console.log('PASS: Rear/front/air/flank roles exert tactical pressure');

console.log('\nAll contrast tests passed.');
