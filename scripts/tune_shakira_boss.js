const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  AudioContext: class {
    constructor() { this.currentTime=0; this.state='running'; this.destination={}; }
    createGain() { return { gain: { setValueAtTime: ()=>{}, exponentialRampToValueAtTime: ()=>{}, linearRampToValueAtTime: ()=>{}, setTargetAtTime: ()=>{} }, connect: ()=>{} }; }
    createOscillator() { return { frequency: { setValueAtTime: ()=>{}, exponentialRampToValueAtTime: ()=>{} }, connect: ()=>{}, start: ()=>{}, stop: ()=>{} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime: ()=>{}, exponentialRampToValueAtTime: ()=>{} }, Q: { setValueAtTime: ()=>{} }, connect: ()=>{} }; }
    resume() {}
  }
};
global.document = {
  getElementById: () => ({
    getContext: () => ({
      save: ()=>{}, restore: ()=>{}, translate: ()=>{}, scale: ()=>{}, rotate: ()=>{},
      fillRect: ()=>{}, strokeRect: ()=>{}, beginPath: ()=>{}, arc: ()=>{}, ellipse: ()=>{},
      moveTo: ()=>{}, lineTo: ()=>{}, stroke: ()=>{}, fill: ()=>{}, closePath: ()=>{},
      drawImage: ()=>{}, clearRect: ()=>{}, fillText: ()=>{}, setLineDash: ()=>{}, clip: ()=>{},
      createLinearGradient: () => ({ addColorStop: ()=>{} }),
      createRadialGradient: () => ({ addColorStop: ()=>{} })
    }),
    style: {},
    addEventListener: ()=>{},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 })
  })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 256; this.naturalHeight = 256; } };
global.navigator = { maxTouchPoints: 0 };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.performance = { now: () => Date.now() };

eval(scriptMatch[1]);
const CG = window.CommuterGame;
const { Game, input, projectiles, particles, hud } = CG;

[280, 320, 360, 400, 440].forEach(dist => {
  input.reset(); projectiles.reset(); particles.reset(); hud.reset();
  const game = new Game();
  game.selectedCharId = 'shakira';
  game.startGame();
  game.levelIntroTimer = 0;
  game.player.x = 14850;
  game.player.coins = 50;
  game.player.hasUnlockedUlt = true;
  game.camera.x = 14850;
  let simTime = 0, dt = 0.02;

  for (let step = 0; step < 4500; step++) {
    simTime += dt;
    if (game.state === 'VICTORY' || game.state === 'GAMEOVER') break;

    if (game.state === 'PLAYING') {
      if (game.boss.isTransforming && !game._bossP2Healed) {
        game._bossP2Healed = true;
        game.player.hp = game.player.maxHp;
      }
      const curDist = game.boss.x - game.player.x;
      if (curDist > dist + 20) {
        input.keys['ArrowRight'] = true; input.keys['ArrowLeft'] = false;
      } else if (curDist < dist - 20) {
        input.keys['ArrowLeft'] = true; input.keys['ArrowRight'] = false;
      } else {
        input.keys['ArrowRight'] = false; input.keys['ArrowLeft'] = false;
      }
      input.keys['KeyS'] = true;
      if (game.player.coins >= 15 && game.player.ultCooldown <= 0) {
        input.justPressedKeys['KeyF'] = true;
      }
      const bossSpikeNearby = game.boss.activeSpikeQueue && game.boss.activeSpikeQueue.some(s => Math.abs(s.x - game.player.x) < 80);
      const bossProjNearby = projectiles.projectiles.some(p => !p.isPlayer && Math.hypot(p.x - game.player.x, p.y - game.player.y) < 140);
      if (bossSpikeNearby || bossProjNearby) {
        if (game.player.onGround) {
          input.justPressedKeys['Space'] = true; input.keys['Space'] = true;
        }
      }
    } else if (game.state === 'VICTORY_RUN') {
      input.reset();
    }
    game.update(dt);
    input.endFrame();
  }
  console.log('[SHAKIRA dist=' + dist + '] state=' + game.state + ' x=' + Math.round(game.player.x) + ' HP=' + game.player.hp + '/' + game.player.maxHp + ' BossHP=' + game.boss.hp + ' time=' + simTime.toFixed(1) + 's punched=' + game.pm.clockInMachine.punched);
});
