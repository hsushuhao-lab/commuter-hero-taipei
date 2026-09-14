/**
 * 08點上班大作戰 v9.5.0 - Test 5: Audio Three-Theme State Machine Test
 */
const fs = require('fs');
const assert = require('assert');

// Mock browser environment with AudioContext
let bgmPlayHistory = [];
let bgmIntensityHistory = [];
let bgmStopCount = 0;

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
      stroke: () => {}, fill: () => {}, drawImage: () => {}, clearRect: () => {},
      fillText: () => {}, setLineDash: () => {}
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
const { audio, Game } = CG;

console.log('====================================================');
console.log('=== TEST 5: AUDIO THREE-THEME TEST (v9.5.0)      ===');
console.log('====================================================\n');

// Wrap audio methods to track state changes
const origPlayBgm = audio.playBgm.bind(audio);
audio.playBgm = function(name) {
  bgmPlayHistory.push({ action: 'play', name, time: Date.now() });
  return origPlayBgm(name);
};

const origSetBossIntensity = audio.setBossIntensity ? audio.setBossIntensity.bind(audio) : () => {};
audio.setBossIntensity = function(level) {
  bgmIntensityHistory.push({ level, time: Date.now() });
  return origSetBossIntensity(level);
};

const origFadeToVictory = audio.fadeToVictory ? audio.fadeToVictory.bind(audio) : () => {};
audio.fadeToVictory = function(duration) {
  bgmPlayHistory.push({ action: 'fadeToVictory', duration, time: Date.now() });
  return origFadeToVictory(duration);
};

const game = new Game();
game.startGame();
 game.levelIntroTimer = 0;

// 1. Scene 1 to Scene 4 Route Simulation (x: 0 -> 14650)
console.log('[1/4] Simulating Scenes 1 to 4 Commute Route (x: 0 ~ 14650)...');
let unexpectedSwitches = 0;

// Step through Route coordinates
const routePoints = [
  { x: 100, scene: 'Scene 1: 象山站' },
  { x: 2500, scene: 'Scene 1: 象山站 (Mid)' },
  { x: 4000, scene: 'Scene 2: 中強公園' },
  { x: 6000, scene: 'Scene 2: 巷弄' },
  { x: 7500, scene: 'Scene 3: 虎林公園 (Rain Park)' },
  { x: 9000, scene: 'Scene 3: 虎林公園 (Mid Rain)' },
  { x: 10400, scene: 'Scene 3: 虎林公園 (Exit)' },
  { x: 11000, scene: 'Scene 4: 松德坡道' },
  { x: 13500, scene: 'Scene 4: 松德坡道 (Approach)' },
  { x: 14500, scene: 'Scene 4: 松德前庭' }
];

routePoints.forEach(pt => {
  game.player.x = pt.x;
  game.update(0.016);
  if (audio.currentBgmType !== 'commute_theme') {
    unexpectedSwitches++;
    console.error('  ERROR: Unexpected BGM "' + audio.currentBgmType + '" at ' + pt.scene + ' (x=' + pt.x + ')');
  }
});

console.log('  Route audio tracked: currentBgmType = ' + audio.currentBgmType);
console.log('  Unexpected BGM switches along route: ' + unexpectedSwitches);
assert.strictEqual(unexpectedSwitches, 0, 'Must have 0 unexpected BGM switches across Scenes 1-4');
assert.strictEqual(audio.currentBgmType, 'commute_theme', 'Must remain on commute_theme');
console.log('  ✓ Scenes 1–4 strictly maintain commute_theme without interruption.');

// 2. Boss Arena Entrance (x = 14800)
console.log('\n[2/4] Entering Boss Arena (x = 14800)...');
const bgmHistoryBeforeBoss = bgmPlayHistory.length;
game.player.x = 14800;
game.update(0.016);

console.log('  Boss Arena BGM: ' + audio.currentBgmType);
assert.strictEqual(audio.currentBgmType, 'boss_theme', 'Arena BGM must switch to boss_theme');
console.log('  ✓ Arena BGM successfully switched to boss_theme.');

// 3. Boss Phase 2 Transition (Intensity Layering without BGM restart)
console.log('\n[3/4] Triggering Boss Phase 2 Transition...');
const bgmPlaysBeforeP2 = bgmPlayHistory.filter(h => h.name === 'boss_theme').length;
const intensitiesBeforeP2 = bgmIntensityHistory.length;

// Advance past 2.0s entrance animation
let ent = 0;
while (ent < 2.2) {
  game.boss.update(0.05, game.player, game.camera);
  ent += 0.05;
}

// Bring boss to 0 HP in Phase 1
game.boss.takeDamage(3600, 'test_burst');
assert.strictEqual(game.boss.isTransforming, true, 'Boss must be transforming');

console.log('  Intensity adjustments recorded: ' + (bgmIntensityHistory.length - intensitiesBeforeP2));
const bgmPlaysAfterP2 = bgmPlayHistory.filter(h => h.name === 'boss_theme').length;
const bgmRestarted = bgmPlaysAfterP2 > bgmPlaysBeforeP2;
console.log('  Boss BGM restarted anew: ' + bgmRestarted);
assert.strictEqual(bgmRestarted, false, 'Phase 2 MUST NOT restart boss_theme track');
assert(bgmIntensityHistory.length > intensitiesBeforeP2, 'audio.setBossIntensity(2) must be called for Phase 2');
assert.strictEqual(audio.currentBgmType, 'boss_theme', 'BGM must remain boss_theme during Phase 2');
console.log('  ✓ Boss Phase 2 uses audio.setBossIntensity(2) on same track without restarting.');

// 4. Boss Defeat & Victory Theme Transition
console.log('\n[4/4] Triggering Boss Defeat & Victory Run...');
// Complete transform
let t = 0;
while (t < 2.9) {
  game.boss.update(0.05, game.player, game.camera);
  t += 0.05;
}
assert.strictEqual(game.boss.phase, 2, 'Boss must now be in Phase 2');

// Defeat Boss in Phase 2
game.boss.takeDamage(3200, 'test_kill');
assert.strictEqual(game.boss.isDead, true, 'Boss must be dead');

// Step game to trigger VICTORY_RUN transition
game.update(0.016);
assert.strictEqual(game.state, 'VICTORY_RUN', 'Game state must transition to VICTORY_RUN');

console.log('  Victory BGM: ' + audio.currentBgmType);
assert.strictEqual(audio.currentBgmType, 'victory_theme', 'Audio must transition to victory_theme on Boss defeat');
console.log('  ✓ Victory theme seamlessly engaged upon boss defeat.');

console.log('\n====================================================');
console.log('>>> TEST 5 PASS: AUDIO THREE-THEME FULLY VALIDATED');
console.log('====================================================\n');
