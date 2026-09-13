/**
 * 08點上班大作戰 v9.5.0 - Test 6: Group Ending & Sequential Triple Punch Test
 */
const fs = require('fs');
const assert = require('assert');

global.window = { innerWidth: 960, innerHeight: 540, addEventListener: () => {} };
global.document = {
  getElementById: () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
    getContext: () => ({
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
      fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, closePath: () => {},
      arc: () => {}, ellipse: () => {}, moveTo: () => {}, lineTo: () => {},
      bezierCurveTo: () => {}, quadraticCurveTo: () => {},
      stroke: () => {}, fill: () => {}, drawImage: () => {}, clearRect: () => {},
      fillText: () => {}, setLineDash: () => {}
    }),
    style: {}
  })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 64; this.naturalHeight = 64; } };
global.performance = { now: () => Date.now() };

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
eval(scriptMatch[1]);

const CG = window.CommuterGame;
const { Game } = CG;

console.log('====================================================');
console.log('=== TEST 6: GROUP ENDING & TRIPLE PUNCH (v9.5.0) ===');
console.log('====================================================\n');

const game = new Game();
game.startGame(); // Player is 'yu' by default

// Teleport to arena and trigger boss defeat
game.player.x = 15500;
game.boss.entranceDone = true;
game.boss.phase = 2;
game.boss.hp = 0;
game.boss.isDead = true;

// Step game to trigger VICTORY_RUN
game.update(0.016);
assert.strictEqual(game.state, 'VICTORY_RUN', 'State must become VICTORY_RUN');
assert.strictEqual(game.victorySubState, 'BOSS_BURST', 'Initial victory substate must be BOSS_BURST');
console.log('[1/4] Boss Defeat triggered -> VICTORY_RUN / BOSS_BURST.');

// 1. Advance through BOSS_BURST into COMPANION_RUSH
console.log('\n[2/4] Testing Companion Rush & Meet Up...');
let dt = 0.05;
let t = 0;
while (t < 0.9 && game.victorySubState === 'BOSS_BURST') {
  game.update(dt);
  t += dt;
}
assert.strictEqual(game.victorySubState, 'COMPANION_RUSH', 'Must transition to COMPANION_RUSH');
assert(game.companions && game.companions.length === 2, 'Two companions must be spawned (non-selected heroes)');
console.log('  Companions spawned: ' + game.companions.map(c => c.id).join(', '));
assert(!game.companions.some(c => c.id === game.player.id), 'Companions must not include selected player');

// Advance through COMPANION_RUSH and DIALOGUE
while (game.victorySubState === 'COMPANION_RUSH' || game.victorySubState === 'DIALOGUE') {
  game.update(dt);
}
assert.strictEqual(game.victorySubState, 'GROUP_SPRINT', 'Must transition to GROUP_SPRINT');
console.log('  ✓ Companions arrived and completed dialogue.');

// 2. Test Group Sprint in formation
console.log('\n[3/4] Testing Three Heroes Group Sprint into Hospital...');
let sprintFrames = 0;
while (game.victorySubState === 'GROUP_SPRINT') {
  game.update(dt);
  sprintFrames++;
  if (sprintFrames === 5) {
    // Assert all three characters are moving rightward
    assert(game.player.vx > 0, 'Player must be sprinting rightward');
    assert(game.companions[0].vx > 0, 'Companion 1 must be sprinting rightward');
    assert(game.companions[1].vx > 0, 'Companion 2 must be sprinting rightward');
    console.log('  Sprint positions: Player=' + Math.round(game.player.x) + 
                ', Comp1=' + Math.round(game.companions[0].x) + 
                ', Comp2=' + Math.round(game.companions[1].x));
  }
}
console.log('  ✓ Three heroes ran together across hospital lobby.');

// 3. Test Sequential Triple Punch
console.log('\n[4/4] Testing Sequential Clock-In (1/3 -> 2/3 -> 3/3)...');
assert.strictEqual(game.victorySubState, 'PUNCH_PLAYER', 'Substate must be PUNCH_PLAYER');
game.update(dt); // Execute player punch
assert.strictEqual(game.punchedCount, 1, 'Player punch must set punchedCount = 1');
console.log('  ✓ Punch 1/3: Player punched clock.');

// Advance to Companion 1 punch
while (game.victorySubState === 'PUNCH_PLAYER') {
  game.update(dt);
}
assert.strictEqual(game.victorySubState, 'PUNCH_COMPANION_1', 'Substate must be PUNCH_COMPANION_1');
game.update(dt); // Execute comp1 punch
assert.strictEqual(game.punchedCount, 2, 'Companion 1 punch must set punchedCount = 2');
console.log('  ✓ Punch 2/3: Companion 1 punched clock.');

// Advance to Companion 2 punch
while (game.victorySubState === 'PUNCH_COMPANION_1') {
  game.update(dt);
}
assert.strictEqual(game.victorySubState, 'PUNCH_COMPANION_2', 'Substate must be PUNCH_COMPANION_2');
game.update(dt); // Execute comp2 punch
assert.strictEqual(game.punchedCount, 3, 'Companion 2 punch must set punchedCount = 3');
assert.strictEqual(game.pm.clockInMachine.punchedCount, 3, 'Clock machine punchedCount must be exactly 3');
console.log('  ✓ Punch 3/3: Companion 2 punched clock.');
console.log('  ★ Final clockInMachine punchedCount = ' + game.pm.clockInMachine.punchedCount + ' (3 / 3 PUNCHED)');

// Advance into Group Celebration
while (game.victorySubState === 'PUNCH_COMPANION_2') {
  game.update(dt);
}
assert.strictEqual(game.victorySubState, 'VICTORY_CELEBRATE', 'Must enter VICTORY_CELEBRATE');
assert.strictEqual(game.player.animState, 'victory', 'Player must be in victory pose');
assert.strictEqual(game.companions[0].animPhase, 'celebrate', 'Companion 1 must celebrate');
assert.strictEqual(game.companions[1].animPhase, 'celebrate', 'Companion 2 must celebrate');
console.log('  ✓ Group cheer and victory poses active for all three heroes.');

console.log('\n====================================================');
console.log('>>> TEST 6 PASS: GROUP ENDING FULLY VALIDATED');
console.log('====================================================\n');
