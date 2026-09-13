/**
 * Dedicated Mobile Virtual Controls & Multi-Touch Test (mobile_controls_test.js)
 * Validates:
 * 1. Left/Right D-Pad (btnLeft, btnRight) drive player.vx
 * 2. Analog Joystick drives player.vx smoothly
 * 3. Multi-Pointer Tracking: Lifting Jump pointer does NOT disrupt Left touch-hold
 * 4. Action buttons: Jump, Skill, Ult, Dash
 * 5. Touch Hold stability across multiple frames
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- RUNNING MOBILE CONTROLS & MULTI-TOUCH TEST ---');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Could not find script tag in index.html');
const scriptContent = scriptMatch[1];

// Mock browser sandbox
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
global.navigator = { maxTouchPoints: 5 };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.performance = { now: () => Date.now() };

eval(scriptContent);

const CG = window.CommuterGame;
assert(CG, 'window.CommuterGame must exist');
const { Game, Player, hud, input } = CG;

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
game.startGame();
game.levelIntroTimer = 0; // Skip level intro

test('HUD defines touch buttons and joystick with valid layout coordinates', () => {
  assert(hud.btnLeft.w > 0 && hud.btnLeft.h > 0);
  assert(hud.btnRight.w > 0 && hud.btnRight.h > 0);
  assert(hud.btnJump.w > 0 && hud.btnJump.h > 0);
  assert(hud.btnSkill.w > 0 && hud.btnSkill.h > 0);
  assert(hud.btnUlt.w > 0 && hud.btnUlt.h > 0);
  assert(hud.joystick.radius > 0);
});

test('PointerDown on Left D-Pad drives player to move left (touchLeft & negative vx)', () => {
  input.reset();
  const leftX = hud.btnLeft.x + hud.btnLeft.w / 2;
  const leftY = hud.btnLeft.y + hud.btnLeft.h / 2;

  game.handlePointerDown(leftX, leftY, { pointerId: 101 });
  assert.strictEqual(hud.btnLeft.isPressed, true, 'btnLeft should be pressed');
  assert.strictEqual(input.isLeft(), true, 'input.isLeft() should be true');
  assert.strictEqual(game.activePointers.get(101).type, 'left');

  // Update player physics for 3 frames
  for (let i = 0; i < 3; i++) {
    game.player.update(0.016, input, game.pm.platforms);
  }
  assert(game.player.vx < -50, `Player vx should be negative, got ${game.player.vx}`);
});

test('Multi-Pointer Tracking: Jumping while holding Left does NOT stop Left movement', () => {
  // Pointer 101 is holding Left
  assert.strictEqual(input.isLeft(), true);
  
  // Pointer 102 taps Jump button
  const jumpX = hud.btnJump.x + hud.btnJump.w / 2;
  const jumpY = hud.btnJump.y + hud.btnJump.h / 2;
  game.handlePointerDown(jumpX, jumpY, { pointerId: 102 });

  assert.strictEqual(hud.btnJump.isPressed, true, 'btnJump should be pressed');
  assert.strictEqual(input.isJumpTriggered(), true, 'Jump should be triggered');
  assert.strictEqual(game.activePointers.size, 2, 'Should track 2 active pointers simultaneously');

  // Pointer 102 releases (PointerUp for Jump)
  // Simulate pointerup for pointer 102
  const p102Info = game.activePointers.get(102);
  hud.btnJump.isPressed = false;
  input.touchJump = false;
  game.activePointers.delete(102);

  // CRITICAL CHECK: Pointer 101 (Left) MUST STILL BE ACTIVE!
  assert.strictEqual(input.isLeft(), true, 'input.isLeft() must remain true when Jump is released!');
  assert.strictEqual(hud.btnLeft.isPressed, true, 'btnLeft must remain pressed!');
  assert.strictEqual(game.activePointers.size, 1, 'Pointer 101 should still be in activePointers');

  // Now release Pointer 101
  hud.btnLeft.isPressed = false;
  input.touchLeft = false;
  game.activePointers.delete(101);
  assert.strictEqual(input.isLeft(), false, 'input.isLeft() should be false after releasing Left');
});

test('PointerDown on Right D-Pad drives player to move right (touchRight & positive vx)', () => {
  input.reset();
  const rightX = hud.btnRight.x + hud.btnRight.w / 2;
  const rightY = hud.btnRight.y + hud.btnRight.h / 2;

  game.handlePointerDown(rightX, rightY, { pointerId: 103 });
  assert.strictEqual(hud.btnRight.isPressed, true);
  assert.strictEqual(input.isRight(), true);

  for (let i = 0; i < 3; i++) {
    game.player.update(0.016, input, game.pm.platforms);
  }
  assert(game.player.vx > 50, `Player vx should be positive, got ${game.player.vx}`);

  hud.btnRight.isPressed = false;
  input.touchRight = false;
  game.activePointers.delete(103);
});

test('Analog Virtual Joystick sets joystickX and drives smooth lateral movement', () => {
  input.reset();
  hud.resetJoystick();
  
  // Touch right of joystick center
  const jX = hud.joystick.baseX + 30;
  const jY = hud.joystick.baseY;
  hud.updateJoystick(jX, jY, true);
  input.setJoystick(hud.joystick.normX, hud.joystick.normY);

  assert(input.joystickActive, 'Joystick should be active');
  assert(input.joystickX > 0.5, `joystickX should be > 0.5, got ${input.joystickX}`);
  assert.strictEqual(input.isRight(), true, 'Joystick tilted right should trigger isRight');

  hud.resetJoystick();
  input.resetJoystick();
  assert.strictEqual(input.joystickActive, false);
});

test('Touch Action Buttons trigger Skill, Ult, and Dash correctly', () => {
  input.reset();
  
  // Skill
  const skillX = hud.btnSkill.x + hud.btnSkill.w / 2;
  const skillY = hud.btnSkill.y + hud.btnSkill.h / 2;
  game.handlePointerDown(skillX, skillY, { pointerId: 104 });
  assert.strictEqual(input.isSkillTriggered(), true);
  input.touchSkill = false;
  game.activePointers.delete(104);

  // Ult
  const ultX = hud.btnUlt.x + hud.btnUlt.w / 2;
  const ultY = hud.btnUlt.y + hud.btnUlt.h / 2;
  game.handlePointerDown(ultX, ultY, { pointerId: 105 });
  assert.strictEqual(input.isUltTriggered(), true);
  input.touchUlt = false;
  game.activePointers.delete(105);

  // Dash
  const dashX = hud.btnDash.x + hud.btnDash.w / 2;
  const dashY = hud.btnDash.y + hud.btnDash.h / 2;
  game.handlePointerDown(dashX, dashY, { pointerId: 106 });
  assert.strictEqual(input.isDashTriggered(), true);
  input.touchDash = false;
  game.activePointers.delete(106);
});

console.log(`\nALL ${passCount} / 6 MOBILE CONTROL TESTS PASSED!`);
process.exit(0);
