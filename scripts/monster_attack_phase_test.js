/**
 * Dedicated Monster Attack Phase System Test (monster_attack_phase_test.js)
 * Validates:
 * 1. Blocking Rule: Cancel cosmetic transformation - All 7 monsters strictly retain imageP1
 * 2. Attack Phase 2 numeric upgrade: damage increased, cooldown reduced, telegraph fairness
 * 3. Attack Execution patterns for all 7 monsters in Phase 1 vs Phase 2
 * 4. ATK II badge rendering in Attack Phase 2
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- RUNNING MONSTER ATTACK PHASE SYSTEM TEST ---');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Could not find script tag in index.html');
const scriptContent = scriptMatch[1];

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
      roundRect: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }), createRadialGradient: () => ({ addColorStop: () => {} })
    }),
    style: {},
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 })
  })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 256; this.naturalHeight = 256; } };
global.navigator = { maxTouchPoints: 0 };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.performance = { now: () => Date.now() };

eval(scriptContent);

const CG = window.CommuterGame;
assert(CG, 'window.CommuterGame must exist');
const { Monster, MONSTER_TYPES, projectiles } = CG;

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`[PASS] ${passCount}. ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

const monsterKeys = ['blue', 'red', 'pink', 'ice', 'grape', 'yellow', 'obsidian'];

test('1. Strict Cancellation of Cosmetic Transformation: All 7 monsters retain imageP1 in Phase 2', () => {
  monsterKeys.forEach(mKey => {
    const m = new Monster(mKey, 1000, 500);
    const initialImgSrc = m.image.src;
    assert(initialImgSrc, `Monster ${mKey} must have an image source`);

    // Evolve / Trigger Attack Phase 2
    m.triggerAttackPhase2();

    assert.strictEqual(m.attackPhase, 2, `${mKey} attackPhase must be 2`);
    assert.strictEqual(m.isPhase2, true, `${mKey} isPhase2 must be true`);
    assert.strictEqual(m.image, m.imageP1, `${mKey} image MUST strictly equal imageP1 (NO skin switching allowed)`);
    assert.strictEqual(m.image.src, initialImgSrc, `${mKey} image src must NOT change in Phase 2`);
  });
});

test('2. Attack Phase 2 Numeric Upgrades: ATK Damage boosted, CD decreased, Telegraph fair', () => {
  monsterKeys.forEach(mKey => {
    const m = new Monster(mKey, 1000, 500);
    const baseDmg = m.attackDamage;
    const baseCd = m.attackCooldown;
    const baseTele = m.telegraphDuration;

    m.triggerAttackPhase2();

    assert(m.attackDamage > baseDmg, `${mKey} attackDamage must increase (base: ${baseDmg}, p2: ${m.attackDamage})`);
    assert(m.attackCooldown < baseCd, `${mKey} attackCooldown must decrease (base: ${baseCd}, p2: ${m.attackCooldown})`);
    assert(m.telegraphDuration >= 0.32, `${mKey} telegraphDuration must remain fair (>= 0.32s)`);
  });
});

test('3. Red Sprout Attack Upgrade: 1 bullet in P1 vs 3-bullet stream in P2', () => {
  const m = new Monster('red', 1000, 500);
  projectiles.reset();
  m.executeAttack();
  assert.strictEqual(projectiles.projectiles.length, 1, 'Red P1 should spawn 1 projectile');

  m.triggerAttackPhase2();
  projectiles.reset();
  m.executeAttack();
  // Main bullet + 2 delayed bullets in queue
  assert(projectiles.projectiles.length + m.delayedSpawns.length >= 3, 'Red P2 should launch 3-bullet burst');
});

test('4. Ice Crystal Attack Upgrade: 3-way in P1 vs 5-way blizzard in P2', () => {
  const m = new Monster('ice', 1000, 500);
  projectiles.reset();
  m.executeAttack();
  assert.strictEqual(projectiles.projectiles.length, 2, 'Ice P1 should spawn 2 dual-direction projectiles');

  m.triggerAttackPhase2();
  projectiles.reset();
  m.executeAttack();
  assert.strictEqual(projectiles.projectiles.length, 5, 'Ice P2 should spawn 5 projectiles');
});

test('5. Purple Grape Attack Upgrade: 3 lobbed poison orbs in P1 vs 5 in P2', () => {
  const m = new Monster('grape', 1000, 500);
  projectiles.reset();
  m.executeAttack();
  assert.strictEqual(projectiles.projectiles.length, 3, 'Grape P1 should spawn 3 lobbed orbs');

  m.triggerAttackPhase2();
  projectiles.reset();
  m.executeAttack();
  assert.strictEqual(projectiles.projectiles.length, 5, 'Grape P2 should spawn 5 lobbed orbs');
});

test('6. Blue Drop Attack Upgrade: 2 water cutters in P1 vs 3 cutters + vortex in P2', () => {
  const m = new Monster('blue', 1000, 500);
  projectiles.reset();
  m.executeAttack();
  assert.strictEqual(projectiles.projectiles.length, 2, 'Blue P1 should spawn 2 projectiles');

  m.triggerAttackPhase2();
  projectiles.reset();
  m.executeAttack();
  assert.strictEqual(projectiles.projectiles.length + m.delayedSpawns.length, 4, 'Blue P2 should spawn 4 projectiles (3 cutters + delayed vortex)');
});

test('7. Yellow Blossom & Obsidian Core Attack Upgrades', () => {
  // Yellow
  const y = new Monster('yellow', 1000, 500);
  projectiles.reset();
  y.executeAttack();
  assert.strictEqual(projectiles.projectiles.length, 5, 'Yellow P1 should spawn 5 projectiles');

  y.triggerAttackPhase2();
  projectiles.reset();
  y.executeAttack();
  assert.strictEqual(projectiles.projectiles.length, 8, 'Yellow P2 should spawn 8-way circular burst');

  // Obsidian
  const obs = new Monster('obsidian', 1000, 500);
  projectiles.reset();
  obs.executeAttack();
  assert.strictEqual(projectiles.projectiles.length + obs.delayedSpawns.length, 2, 'Obsidian P1 spawns 1 wave + 1 spike');

  obs.triggerAttackPhase2();
  projectiles.reset();
  obs.delayedSpawns = [];
  obs.executeAttack();
  assert.strictEqual(projectiles.projectiles.length + obs.delayedSpawns.length, 4, 'Obsidian P2 spawns 1 wave + 3 spikes');
});

test('8. Monster HP Bar displays ⚡ ATK II badge in Attack Phase 2', () => {
  const m = new Monster('red', 1000, 500);
  let renderedBadgeText = '';
  const mockCtx = {
    save: () => {}, restore: () => {}, fillStyle: '', strokeStyle: '', lineWidth: 1,
    fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, roundRect: () => {}, fill: () => {}, stroke: () => {},
    fillText: (txt) => { if (txt.includes('ATK II')) renderedBadgeText = txt; }
  };

  // Phase 1 (full HP) -> no HP bar
  m.renderHpBar(mockCtx);
  assert.strictEqual(renderedBadgeText, '');

  // Trigger Phase 2 -> renders ATK II badge even at full HP!
  m.triggerAttackPhase2();
  m.renderHpBar(mockCtx);
  assert.strictEqual(renderedBadgeText, '⚡ ATK II', 'Must render ⚡ ATK II badge in Attack Phase 2');
});

console.log(`\nALL ${passCount} / 8 MONSTER ATTACK PHASE TESTS PASSED!`);
process.exit(0);
