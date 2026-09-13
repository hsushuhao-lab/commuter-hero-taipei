/**
 * Comprehensive Menu Return & State Navigation Test (menu_return_flow_test.js)
 * Validates zero dead-ends across all UI states:
 * 1. OPENING -> MENU (Skip)
 * 2. SELECT -> MENU (Button click & ESC key)
 * 3. PAUSE -> MENU (Button click & M key)
 * 4. PAUSE -> PLAYING (Resume button & ESC key)
 * 5. VICTORY -> MENU, RETRY, RESELECT (Buttons & R/C/M keys)
 * 6. GAMEOVER -> MENU, RETRY, RESELECT (Buttons & R/C/M keys)
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- RUNNING MENU RETURN & STATE NAVIGATION TEST ---');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Could not find script tag in index.html');
const scriptContent = scriptMatch[1];

let keyListeners = [];
global.window = {
  innerWidth: 960,
  innerHeight: 540,
  addEventListener: (event, handler) => {
    if (event === 'keydown') keyListeners.push(handler);
  },
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
const { Game, hud, introCinematic } = CG;

function triggerKey(code) {
  for (const l of keyListeners) {
    l({ code });
  }
}

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

const game = new Game();

test('1. OPENING skips directly to MENU', () => {
  game.state = 'OPENING';
  introCinematic.start(() => { game.state = 'MENU'; });
  introCinematic.skip();
  assert.strictEqual(game.state, 'MENU');
});

test('2. SELECT returns to MENU via "◀ 返回主畫面" button', () => {
  game.state = 'SELECT';
  // Click Back Button (x: 100, y: 48)
  game.handlePointerDown(100, 48, { pointerId: 1 });
  assert.strictEqual(game.state, 'MENU');
});

test('3. SELECT returns to MENU via ESC key', () => {
  game.state = 'SELECT';
  triggerKey('Escape');
  assert.strictEqual(game.state, 'MENU');
});

test('4. PLAYING toggles to PAUSE via btnPause and resumes via ESC', () => {
  game.startGame();
  game.levelIntroTimer = 0;
  assert.strictEqual(game.state, 'PLAYING');

  // Click pause button (x: 30, y: 30)
  game.handlePointerDown(30, 30, { pointerId: 1 });
  assert.strictEqual(game.state, 'PAUSE');

  // Resume via ESC
  triggerKey('Escape');
  assert.strictEqual(game.state, 'PLAYING');
});

test('5. PAUSE returns to MENU via "回主選單" button and M key', () => {
  game.state = 'PAUSE';
  const cx = game.vw / 2;
  const cy = game.vh / 2;
  
  // Click Home button in Pause menu (cx, cy + 110)
  game.handlePointerDown(cx, cy + 110, { pointerId: 1 });
  assert.strictEqual(game.state, 'MENU');

  game.state = 'PAUSE';
  triggerKey('KeyM');
  assert.strictEqual(game.state, 'MENU');
});

test('6. VICTORY offers 3 buttons: Home, Retry, Reselect (pointer & keys)', () => {
  game.state = 'VICTORY';
  hud.isVictory = true;
  hud.timeRemaining = 50;

  // Key M -> MENU
  triggerKey('KeyM');
  assert.strictEqual(game.state, 'MENU');

  // Key C -> SELECT
  game.state = 'VICTORY';
  triggerKey('KeyC');
  assert.strictEqual(game.state, 'SELECT');

  // Key R -> Retry (PLAYING)
  game.state = 'VICTORY';
  triggerKey('KeyR');
  assert.strictEqual(game.state, 'PLAYING');
  assert.strictEqual(hud.timeRemaining, 180, 'Retry must reset timer to 180s');

  // Pointer click on Home button
  game.state = 'VICTORY';
  hud.renderVictoryScreen(game.ctx, game.player, 960, 540);
  const homeBtn = hud.endButtons.home;
  game.handlePointerDown(homeBtn.x + homeBtn.w / 2, homeBtn.y + homeBtn.h / 2, { pointerId: 1 });
  assert.strictEqual(game.state, 'MENU');
});

test('7. GAMEOVER offers 3 buttons: Home, Retry, Reselect (pointer & keys)', () => {
  game.state = 'GAMEOVER';
  hud.isGameOver = true;

  // Key M -> MENU
  triggerKey('KeyM');
  assert.strictEqual(game.state, 'MENU');

  // Key C -> SELECT
  game.state = 'GAMEOVER';
  triggerKey('KeyC');
  assert.strictEqual(game.state, 'SELECT');

  // Key R -> Retry (PLAYING)
  game.state = 'GAMEOVER';
  triggerKey('KeyR');
  assert.strictEqual(game.state, 'PLAYING');
  assert.strictEqual(hud.timeRemaining, 180, 'Retry must reset timer to 180s');

  // Pointer click on Reselect button
  game.state = 'GAMEOVER';
  hud.renderGameOverScreen(game.ctx, 960, 540);
  const reselectBtn = hud.endButtons.reselect;
  game.handlePointerDown(reselectBtn.x + reselectBtn.w / 2, reselectBtn.y + reselectBtn.h / 2, { pointerId: 1 });
  assert.strictEqual(game.state, 'SELECT');
});

console.log(`\nALL ${passCount} / 7 MENU RETURN TESTS PASSED!`);
process.exit(0);
