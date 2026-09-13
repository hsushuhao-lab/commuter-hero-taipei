const fs = require('fs');

function installBrowserMocks(width = 960, height = 540) {
  global.window = {
    innerWidth: width,
    innerHeight: height,
    addEventListener: () => {},
    AudioContext: class {
      constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
      createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {}, setTargetAtTime: () => {} }, connect: () => {} }; }
      createOscillator() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
      createBiquadFilter() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, Q: { setValueAtTime: () => {} } }, connect: () => {} }; }
      resume() {}
    }
  };
  const context = {
    save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
    fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, arc: () => {}, ellipse: () => {},
    moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {}, closePath: () => {},
    drawImage: () => {}, clearRect: () => {}, fillText: () => {}, setLineDash: () => {}, clip: () => {},
    roundRect: () => {}, rect: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} })
  };
  global.document = {
    getElementById: () => ({
      getContext: () => context,
      style: {},
      addEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width, height })
    })
  };
  global.Image = class { constructor() { this.complete = true; this.naturalWidth = 256; this.naturalHeight = 256; } };
  global.navigator = { maxTouchPoints: 0 };
  global.requestAnimationFrame = callback => setTimeout(callback, 16);
  let simulationMilliseconds = 1000;
  global.performance = { now: () => simulationMilliseconds };
  return dt => { simulationMilliseconds += dt * 1000; };
}

function seedRandom(seed) {
  let state = seed >>> 0;
  Math.random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function loadRuntime(seed = 0x1a2b3c4d) {
  const advanceTime = installBrowserMocks();
  seedRandom(seed);
  const html = fs.readFileSync('index.html', 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('Could not find the embedded runtime script');
  eval(scriptMatch[1]);
  const runtime = window.CommuterGame;
  runtime.advanceTime = advanceTime;
  runtime.input.reset();
  runtime.projectiles.reset();
  runtime.particles.reset();
  runtime.hud.reset();
  return runtime;
}

function createGame(runtime, hero) {
  const game = new runtime.Game();
  game.selectedCharId = hero;
  game.startGame();
  game.levelIntroTimer = 0;
  return game;
}

module.exports = { loadRuntime, createGame };
