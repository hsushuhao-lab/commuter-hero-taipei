/**
 * 08點上班大作戰 v9.5.0 - Test 4: Monster Stability & Numeric Safety Test
 */
const fs = require('fs');
const assert = require('assert');

// Mock canvas that detects any NaN or Infinite arguments passed to transforms or draw calls
let canvasNanTransformCount = 0;
function assertFinite(...args) {
  for (const a of args) {
    if (typeof a === 'number' && !Number.isFinite(a)) {
      canvasNanTransformCount++;
    }
  }
}

global.window = { innerWidth: 960, innerHeight: 540, addEventListener: () => {} };
global.document = {
  getElementById: () => ({
    getContext: () => ({
      save: () => {},
      restore: () => {},
      translate: (x, y) => assertFinite(x, y),
      scale: (sx, sy) => assertFinite(sx, sy),
      fillRect: (x, y, w, h) => assertFinite(x, y, w, h),
      strokeRect: (x, y, w, h) => assertFinite(x, y, w, h),
      beginPath: () => {},
      closePath: () => {},
      arc: (x, y, r) => assertFinite(x, y, r),
      ellipse: (x, y, rx, ry) => assertFinite(x, y, rx, ry),
      moveTo: (x, y) => assertFinite(x, y),
      lineTo: (x, y) => assertFinite(x, y),
      bezierCurveTo: (...args) => assertFinite(...args),
      quadraticCurveTo: (...args) => assertFinite(...args),
      stroke: () => {},
      fill: () => {},
      drawImage: (img, ...args) => assertFinite(...args),
      clearRect: () => {},
      fillText: () => {},
      setLineDash: () => {}
    }),
    style: {}
  })
};
global.Image = class {
  constructor() {
    this.complete = true;
    this.naturalWidth = 64;
    this.naturalHeight = 64;
  }
};
global.performance = { now: () => Date.now() };

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
eval(scriptMatch[1]);

const CG = window.CommuterGame;
const { Monster, MONSTER_TYPES, Level, PlatformManager, Player } = CG;

console.log('====================================================');
console.log('=== TEST 4: MONSTER STABILITY & SAFETY (v9.5.0)  ===');
console.log('====================================================\n');

// 1. Type validation and Fallback to 'red'
console.log('[1/4] Verifying Type Validation and Safe Fallbacks...');
let invalidTypeCount = 0;
const testKeys = ['transit', 'unknown_xyz', null, undefined, '', 'ghost_monster'];
testKeys.forEach(badKey => {
  const m = new Monster(badKey, 500, 560);
  if (!MONSTER_TYPES[m.typeKey]) {
    invalidTypeCount++;
  }
  assert.strictEqual(m.typeKey, 'red', 'Invalid typeKey "' + badKey + '" must safely fallback to "red"');
  assert(m.imageP1 && m.imageP2, 'Fallback monster must have valid preloaded imageP1 and imageP2');
});
assert.strictEqual(invalidTypeCount, 0, 'Invalid type count must be 0');
console.log('  ✓ All invalid/stale types safely fallback to "red".');

// 2. Preloaded P1/P2 images for all registered monster types
console.log('\n[2/4] Verifying Preloaded P1 & P2 Assets for all Types...');
let brokenSpriteCount = 0;
for (const [key, cfg] of Object.entries(MONSTER_TYPES)) {
  if (key === 'transit') continue;
  const m = new Monster(key, 600, 560);
  assert(m.imageP1 && m.imageP1.src, 'Type ' + key + ' must have valid imageP1');
  const validP1 = m.imageP1 && (m.imageP1.src.startsWith('data:image/') || m.imageP1.src.includes('monster_'));
  const validP2 = m.imageP2 && (m.imageP2.src.startsWith('data:image/') || m.imageP2.src.includes('monster_'));
  if (!validP1 || !validP2) {
    brokenSpriteCount++;
  }
}
assert.strictEqual(brokenSpriteCount, 0, 'Broken sprite count must be 0');
console.log('  ✓ All monster types have verified P1 and P2 preloaded image assets.');

// 3. Patrol Bounds and Platform Edge Turnaround (No suicidal monsters)
console.log('\n[3/4] Verifying Patrol Bounds & Cliff Turnaround...');
const pm = new PlatformManager();
const level = new Level(pm);

// Spawn monster on a platform bounded from 1940 to 3500
const platMonster = new Monster('red', 1980, 560);
platMonster.patrolBounds = { minX: 1960, maxX: 2200 };

// Player is to the left (x=1800, within 650px alert range), so monster faces left
const testPlayer = { x: 1800, y: 560, isDead: false, coins: 0 };
let hasReversed = false;
let minObservedX = platMonster.x;

for (let step = 0; step < 60; step++) {
  platMonster.update(0.016, testPlayer, pm.platforms);
  if (platMonster.x < minObservedX) minObservedX = platMonster.x;
  if (platMonster.vx > 0) hasReversed = true;
}
assert(minObservedX >= 1960, 'Monster must not cross min patrol boundary (1960), got minX=' + minObservedX);
assert(hasReversed, 'Monster vx must reverse direction after hitting left bound');
console.log('  ✓ Monster patrol bounds and edge turnaround verified (no cliff suicides).');

// 4. 600-Second Equivalent Simulation (Numeric Safety & Stale Attacks)
console.log('\n[4/4] Running 600s Equivalent Stability Simulation...');
const player = new Player('yu');
player.x = 2000;
player.y = 560;

const ctx = document.getElementById('gameCanvas').getContext('2d');
let nanCount = 0;
let staleAttacksCount = 0;

// Populate level monsters across all scenes
const monsters = level.monsters;
console.log('  Simulating ' + monsters.length + ' level monsters across 600 simulated seconds...');

// 600 seconds simulation: 12000 frames @ 0.05s
const totalSteps = 6000; // 6000 steps * 0.1s = 600s
const dt = 0.1;

for (let step = 0; step < totalSteps; step++) {
  // Slowly advance player along route
  player.x = 500 + (step / totalSteps) * 14000;

  for (let i = 0; i < monsters.length; i++) {
    const m = monsters[i];
    m.update(dt, player, pm.platforms);

    // Check finite numbers
    if (!Number.isFinite(m.x) || !Number.isFinite(m.y) || !Number.isFinite(m.vx) || !Number.isFinite(m.vy) || !Number.isFinite(m.hp)) {
      nanCount++;
    }

    // Check for stale delayed spawns after death
    if (m.isDead && m.delayedSpawns && m.delayedSpawns.length > 0) {
      staleAttacksCount++;
    }

    // Every 50 steps, render active monsters near player
    if (step % 50 === 0 && Math.abs(m.x - player.x) < 600) {
      m.render(ctx);
    }
  }
}

console.log('  Simulation Results:');
console.log('    NaN / Infinite variables: ' + nanCount);
console.log('    Invalid typeKeys: ' + invalidTypeCount);
console.log('    Broken sprites: ' + brokenSpriteCount);
console.log('    Stale attacks: ' + staleAttacksCount);
console.log('    Canvas NaN transform calls: ' + canvasNanTransformCount);

assert.strictEqual(nanCount, 0, 'NaN count must be 0');
assert.strictEqual(invalidTypeCount, 0, 'Invalid type count must be 0');
assert.strictEqual(brokenSpriteCount, 0, 'Broken sprite count must be 0');
assert.strictEqual(staleAttacksCount, 0, 'Stale attacks count must be 0');
assert.strictEqual(canvasNanTransformCount, 0, 'Canvas NaN transforms must be 0');

console.log('\n====================================================');
console.log('>>> TEST 4 PASS: MONSTER STABILITY FULLY VALIDATED');
console.log('====================================================\n');
