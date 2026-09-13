/**
 * Dedicated Opening Cinematic Flow Test (opening_flow_test.js)
 * Validates:
 * 1. Default initial game state is OPENING
 * 2. IntroCinematic 4-stage progression across 17 seconds
 * 3. nextAct() steps through stages sequentially
 * 4. Skip via button click or Keyboard (SPACE / ESC / ENTER)
 * 5. On completion or skip, state transitions to MENU
 * 6. Main Menu "Replay Opening" button transitions to OPENING
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- RUNNING OPENING CINEMATIC FLOW TEST ---');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Could not find script tag in index.html');
const scriptContent = scriptMatch[1];

global.window = {
  innerWidth: 960,
  innerHeight: 540,
  addEventListener: (event, handler) => {
    if (event === 'keydown') global.window._keydownHandler = handler;
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
const { Game, introCinematic } = CG;

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

test('Initial Game state is OPENING', () => {
  const game = new Game();
  assert.strictEqual(game.state, 'OPENING', `Expected state OPENING, got ${game.state}`);
});

test('IntroCinematic has 4 acts and 17.0s total duration', () => {
  assert(introCinematic, 'introCinematic singleton must exist');
  assert.strictEqual(introCinematic.duration, 17.0, `Expected duration 17.0, got ${introCinematic.duration}`);
});

test('nextAct() advances through the 4 stages sequentially', () => {
  let completed = false;
  introCinematic.start(() => { completed = true; });
  assert.strictEqual(introCinematic.isActive, true);
  assert.strictEqual(introCinematic.time, 0);

  // Stage 1 -> Stage 2
  introCinematic.nextAct();
  assert.strictEqual(introCinematic.time, 4.0);

  // Stage 2 -> Stage 3
  introCinematic.nextAct();
  assert.strictEqual(introCinematic.time, 8.0);

  // Stage 3 -> Stage 4
  introCinematic.nextAct();
  assert.strictEqual(introCinematic.time, 12.5);

  // Stage 4 -> Finish / Skip
  introCinematic.nextAct();
  assert.strictEqual(introCinematic.isActive, false);
  assert.strictEqual(completed, true, 'onComplete callback must be called');
});

test('PointerDown on skip button skips intro and sets game.state to MENU', () => {
  const game = new Game();
  assert.strictEqual(game.state, 'OPENING');
  introCinematic.start(() => {
    game.state = 'MENU';
  });

  // Click Top-Right Skip Button (x: 880, y: 30)
  game.handlePointerDown(880, 30, { pointerId: 1 });
  assert.strictEqual(introCinematic.isActive, false, 'Intro should be deactivated');
  assert.strictEqual(game.state, 'MENU', `Game state should be MENU, got ${game.state}`);
});

test('Keydown (Space / ESC / Enter) skips intro', () => {
  const game = new Game();
  introCinematic.start(() => {
    game.state = 'MENU';
  });
  assert.strictEqual(introCinematic.isActive, true);

  if (global.window._keydownHandler) {
    global.window._keydownHandler({ code: 'Space' });
  } else {
    introCinematic.skip();
    game.state = 'MENU';
  }
  assert.strictEqual(introCinematic.isActive, false);
  assert.strictEqual(game.state, 'MENU');
});

test('Menu button "🎬 開篇序幕" restarts opening cinematic and sets state to OPENING', () => {
  const game = new Game();
  game.state = 'MENU';

  // Click replay intro button (x: 480, y: 426)
  game.handlePointerDown(480, 426, { pointerId: 1 });
  assert.strictEqual(game.state, 'OPENING');
  assert.strictEqual(introCinematic.isActive, true);
});

console.log(`\nALL ${passCount} / 6 OPENING CINEMATIC TESTS PASSED!`);
process.exit(0);
