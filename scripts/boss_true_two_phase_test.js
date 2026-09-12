/**
 * 08點上班大作戰 v9.5.0 - Test 2: Boss True Two-Phase Test
 */
const fs = require('fs');
const assert = require('assert');

// Setup mock environment
global.window = { innerWidth: 960, innerHeight: 540, addEventListener: () => {} };
global.document = {
  getElementById: () => ({
    getContext: () => ({
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
      fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, arc: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {},
      drawImage: () => {}, clearRect: () => {}, fillText: () => {}, setLineDash: () => {}
    }),
    style: {}
  })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 64; } };
global.performance = { now: () => Date.now() };

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
eval(scriptMatch[1]);

const CG = window.CommuterGame;
const { Boss, Player } = CG;

console.log('====================================================');
console.log('=== TEST 2: BOSS TRUE TWO-PHASE TEST (v9.5.0)    ===');
console.log('====================================================\n');

const boss = new Boss();
const player = new Player('yu');
player.x = 15500; player.y = 560;

// 1. Initial Phase 1 assertions
console.log('[1/6] Verifying Phase 1 Initial HP...');
assert.strictEqual(boss.phase, 1, 'Boss must start in Phase 1');
assert.strictEqual(boss.hp, 2400, 'Phase 1 HP must be exactly 2400, got ' + boss.hp);
assert.strictEqual(boss.maxHp, 2400, 'Phase 1 maxHp must be 2400, got ' + boss.maxHp);
console.log('  ✓ Phase 1 HP = 2400 verified.');

// 2. Entrance Animation and Invulnerability
console.log('\n[2/7] Verifying Boss Entrance Animation & Invulnerability...');
player.x = 15500;
boss.update(0.016, player, { x: 15000, viewportWidth: 960, shake: () => {} });
assert.strictEqual(boss.entranceTriggered, true, 'Entrance should trigger when player is in arena');
assert.strictEqual(boss.entranceDone, false, 'Entrance should be running (entranceTimer > 0)');
assert.strictEqual(boss.takeDamage(100, 'inst_entrance'), false, 'Boss must be invulnerable during entrance rise');
assert.strictEqual(boss.hp, 2400, 'HP must remain 2400 during entrance');

// Advance past 2.0s entrance
let entranceElapsed = 0;
while (entranceElapsed < 2.1) {
  boss.update(0.05, player, { x: 15000, viewportWidth: 960, shake: () => {} });
  entranceElapsed += 0.05;
}
assert.strictEqual(boss.entranceDone, true, 'Boss entrance should be completed');
console.log('  ✓ Entrance animation & entrance invulnerability verified.');

// 3. 60 coins does NOT skip Phase 1 (Directive Section D)
console.log('\n[3/7] Verifying 60 Coins Does NOT Skip Phase 1...');
player.coins = 65;
boss.update(0.016, player, { x: 15000, viewportWidth: 960, shake: () => {} });
assert.strictEqual(boss.phase, 1, 'Boss must remain in Phase 1 even when coins >= 60');
assert.strictEqual(boss.resonanceEnraged, true, '60 coins must grant resonanceEnraged buff only');
console.log('  ✓ 60 coins resonance buff verified without skipping Phase 1.');

// 4. Overkill damage must NOT pierce Phase 1 into Phase 2
console.log('\n[4/7] Verifying Overkill Damage Does NOT Pierce into Phase 2...');
boss.takeDamage(2390, 'instance_1');
assert.strictEqual(boss.hp, 10, 'Boss HP should be 10 after 2390 damage');

// Massive 500 overkill blow
boss.takeDamage(500, 'instance_2');
assert.strictEqual(boss.isTransforming, true, 'Boss must enter isTransforming state');
assert.strictEqual(boss.hp, 0, 'Phase 1 HP must clamp to 0, not carry negative overkill');
assert.strictEqual(boss.isDead, false, 'Boss must NOT die at end of Phase 1');
console.log('  ✓ Phase 1 overkill does not leak into Phase 2.');

// 5. Transform Invulnerability (2.8s freeze)
console.log('\n[5/7] Verifying 2.8s Transform Invulnerability...');
assert(Math.abs(boss.transformTimer - 2.8) < 0.05, 'Transform duration must be 2.8s, got ' + boss.transformTimer);
const dmgResult = boss.takeDamage(100, 'instance_during_transform');
assert.strictEqual(dmgResult, false, 'takeDamage() during transform MUST be rejected/return false');
assert.strictEqual(boss.hp, 0, 'HP must remain 0 during transform');
console.log('  ✓ 100% Transform invulnerability verified.');

// 5. Transition to Phase 2 HP = 3200
console.log('\n[5/6] Verifying Phase 2 Transition & HP 3200...');
let elapsed = 0;
while (elapsed < 2.9) {
  boss.update(0.05, player, { x: 15000, viewportWidth: 960, shake: () => {} });
  elapsed += 0.05;
}
assert.strictEqual(boss.isTransforming, false, 'Transform state must finish');
assert.strictEqual(boss.phase, 2, 'Boss must now be in Phase 2');
assert.strictEqual(boss.hp, 3200, 'Phase 2 HP must be exactly 3200, got ' + boss.hp);
assert.strictEqual(boss.maxHp, 3200, 'Phase 2 maxHp must be 3200, got ' + boss.maxHp);
assert.strictEqual(boss.isDead, false, 'Boss must remain alive');
console.log('  ✓ Phase 2 HP = 3200/3200 verified.');

// 6. Only Phase 2 HP <= 0 triggers real death
console.log('\n[6/6] Verifying True Death Only Occurs at Phase 2 HP <= 0...');
boss.takeDamage(3199, 'p2_attack_1');
assert.strictEqual(boss.isDead, false, 'Boss must not die at 1 HP remaining in Phase 2');
boss.takeDamage(100, 'p2_attack_2');
assert.strictEqual(boss.hp, 0, 'Boss HP must be 0');
assert.strictEqual(boss.isDead, true, 'Boss must be marked isDead = true only after Phase 2 HP <= 0');
console.log('  ✓ Boss death verified only after Phase 2 defeat.');

console.log('\n====================================================');
console.log('>>> TEST 2 PASS: BOSS TRUE TWO-PHASE FULLY VALIDATED');
console.log('====================================================\n');
