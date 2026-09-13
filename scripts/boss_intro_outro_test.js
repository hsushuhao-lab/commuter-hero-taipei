/**
 * Dedicated Boss Entrance, True Two-Phase & Outro Test (boss_intro_outro_test.js)
 * Validates:
 * 1. Boss entrance cinematic: ground tremor, announcement banner, camera shake at x >= 14750
 * 2. True Two-Phase HP: P1 HP = 2800, P2 HP = 3600 (Total 6400 HP)
 * 3. Consistent race language & voice lines for Phase 1 and Phase 2
 * 4. Phase transition animation: 2.8s invulnerable transformation freeze
 * 5. Outro sequence: Boss defeat -> companions arrive -> dialogue -> triple punch -> Rank evaluation
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- RUNNING BOSS ENTRANCE, TWO-PHASE & OUTRO TEST ---');

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
const { Game, Boss, Player, BOSS_CONFIG, hud } = CG;

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

test('1. Boss HP & Two-Phase Specifications: P1 HP = 3600, P2 HP = 5200 (Total 8800)', () => {
  assert.strictEqual(BOSS_CONFIG.phase1Hp, 3600);
  assert.strictEqual(BOSS_CONFIG.phase2Hp, 5200);
  assert.strictEqual(BOSS_CONFIG.transformDuration, 2.8);

  const boss = new Boss();
  assert.strictEqual(boss.hp, 3600);
  assert.strictEqual(boss.maxHp, 3600);
  assert.strictEqual(boss.phase, 1);
});

test('2. Boss Voice Lines & Phase Identity', () => {
  const boss = new Boss();
  assert(boss.config.voiceLines.p1Sleep.includes('再睡一下'), 'P1 line should include 再睡一下');
  assert(boss.config.voiceLines.p2Transform.includes('夢境'), 'P2 line should include 夢境');
});

test('3. Boss Entrance Trigger at x >= 14750 (Camera Shake & Banner)', () => {
  const game = new Game();
  game.startGame();
  game.levelIntroTimer = 0;

  // Move player right before arena
  game.player.x = 14740;
  game.update(0.016);
  assert.strictEqual(game.bossEntranceDone, false);

  // Cross into arena threshold (x >= 14750)
  game.player.x = 14760;
  game.update(0.016);
  assert.strictEqual(game.bossEntranceDone, true, 'Boss entrance should be triggered');
  assert(game.milestoneBanner && game.milestoneBanner.includes('巨花王現身'), 'Milestone banner should announce Boss entrance');
  assert(game.camera.shakeTimer > 0, 'Camera should shake during boss entrance');
});

test('4. True Two-Phase Transition & Invulnerability (2.8s freeze)', () => {
  const boss = new Boss();
  assert.strictEqual(boss.phase, 1);
  assert.strictEqual(boss.hp, 3600);

  // Deplete Phase 1 HP
  boss.takeDamage(3600);
  assert.strictEqual(boss.phase, 1);
  assert.strictEqual(boss.isTransforming, true, 'Boss must enter isTransforming state');
  assert.strictEqual(boss.hp, 0);

  // While transforming, boss is invulnerable
  boss.takeDamage(500);
  assert.strictEqual(boss.hp, 0, 'Boss must not take damage while transforming');

  // Advance transform timer by 2.9 seconds
  boss.update(2.9, new Player('yu'), { shake: () => {}, x: 0 });
  assert.strictEqual(boss.isTransforming, false, 'Transformation should complete');
  assert.strictEqual(boss.phase, 2, 'Boss must advance to Phase 2');
  assert.strictEqual(boss.hp, 5200, 'Phase 2 HP must be 5200');
  assert.strictEqual(boss.maxHp, 5200, 'Phase 2 maxHp must be 5200');
});

test('5. Complete Outro Flow: Boss Defeat -> Companions -> Triple Punch -> 180s Evaluation', () => {
  const game = new Game();
  game.startGame();
  game.levelIntroTimer = 0;
  hud.timeRemaining = 55; // 55s remaining in 180s system

  // Defeat boss in Phase 2
  game.boss.phase = 2;
  game.boss.hp = 0;
  game.boss.isDead = true;

  game.update(0.016);
  assert.strictEqual(game.state, 'VICTORY_RUN');
  assert.strictEqual(game.victorySubState, 'BOSS_BURST');

  // Advance to COMPANION_RUSH
  game.updateVictoryRun(0.9);
  assert.strictEqual(game.victorySubState, 'COMPANION_RUSH');
  assert.strictEqual(game.companions.length, 2);

  // Advance to DIALOGUE
  for (const c of game.companions) { c.x = game.player.x - 80; c.animPhase = 'arrive'; }
  game.updateVictoryRun(1.5);
  assert.strictEqual(game.victorySubState, 'DIALOGUE');

  // Advance to GROUP_SPRINT
  game.updateVictoryRun(3.6);
  assert.strictEqual(game.victorySubState, 'GROUP_SPRINT');

  // Run to punch clock
  game.player.x = 17625;
  game.updateVictoryRun(0.05);
  assert.strictEqual(game.victorySubState, 'PUNCH_PLAYER');
  game.updateVictoryRun(0.05);
  assert.strictEqual(game.punchedCount, 1);
  game.updateVictoryRun(0.6);
  assert.strictEqual(game.victorySubState, 'PUNCH_COMPANION_1');
  game.updateVictoryRun(0.05);
  assert.strictEqual(game.punchedCount, 2);
  game.updateVictoryRun(0.6);
  assert.strictEqual(game.victorySubState, 'PUNCH_COMPANION_2');
  game.updateVictoryRun(0.05);
  assert.strictEqual(game.punchedCount, 3, 'All 3 heroes must punch clock sequentially');

  // Evaluation check in 180s system
  hud.calculateEvaluation(game.player, true);
  assert.strictEqual(hud.resultRank, 'Rank S', 'Remaining 55s with 0 falls must be Rank S');
  assert(hud.punchedTimeText.startsWith('07:5'), `Punched time must be in 07:5x range, got ${hud.punchedTimeText}`);
});

console.log(`\nALL ${passCount} / 5 BOSS & OUTRO TESTS PASSED!`);
process.exit(0);
