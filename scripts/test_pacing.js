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

['shakira', 'sandra'].forEach(charId => {
  input.reset(); projectiles.reset(); particles.reset(); hud.reset();
  const game = new Game();
  game.selectedCharId = charId;
  game.startGame();
  game.levelIntroTimer = 0;
  let simTime = 0, dt = 0.02;

  const botSkillRange = { yu: 480, shakira: 600, sandra: 220 }[charId];
  const bossCombatDist = { yu: 180, shakira: 440, sandra: 140 }[charId];

  for (let step = 0; step < 9500; step++) {
    simTime += dt;
    if (game.state === 'VICTORY' || game.state === 'GAMEOVER') break;

    if (game.state === 'PLAYING') {
      if (game.player.x < 14800) {
        const lookAheadX = game.player.x + 50;
        const groundAhead = game.pm.platforms.some(p => p.type === 'stone' && p.x <= lookAheadX && (p.x + p.w) >= lookAheadX && p.y >= 540);
        if (!groundAhead && game.player.onGround && game.player.y >= 520) {
          input.justPressedKeys['Space'] = true;
          input.keys['Space'] = true;
        } else if (game.player.onGround) {
          input.keys['Space'] = false;
        }

        if (!game.player.onGround && game.player.dashCooldown <= 0 && game.player.vy > 0 && !groundAhead) {
          input.justPressedKeys['ShiftLeft'] = true;
        }

        const enemyInFront = game.level.monsters.find(m => !m.isDead && (m.x - game.player.x) > 0 && (m.x - game.player.x) < botSkillRange);
        const closeEnemy = game.level.monsters.find(m => !m.isDead && (m.x - game.player.x) > 0 && (m.x - game.player.x) < 140 && m.y >= 490);
        const veryCloseEnemy = game.level.monsters.find(m => !m.isDead && (m.x - game.player.x) > 0 && (m.x - game.player.x) < 95 && m.y >= 490);
        const bulletNearby = projectiles.projectiles.some(p => !p.isPlayer && Math.abs(p.x - game.player.x) < 280);

        // Movement pacing: don't walk into enemy hitbox while swinging
        if (veryCloseEnemy && game.player.onGround) {
          input.keys['ArrowRight'] = false;
        } else {
          input.keys['ArrowRight'] = true;
        }

        if (enemyInFront || bulletNearby) {
          input.keys['KeyS'] = true;
        } else {
          input.keys['KeyS'] = false;
        }

        if (closeEnemy && game.player.onGround) {
          input.justPressedKeys['Space'] = true;
          input.keys['Space'] = true;
        }

        if (closeEnemy && game.player.hp < 45 && game.player.dashCooldown <= 0 && game.player.onGround) {
          input.justPressedKeys['ShiftLeft'] = true;
        }

        if (game.player.coins >= 15 && game.player.ultCooldown <= 0 && (enemyInFront || bulletNearby)) {
          input.justPressedKeys['KeyF'] = true;
        }
      } else {
        // Boss Arena
        if (!game._arenaEntered) {
          game._arenaEntered = true;
          game.player.hp = game.player.maxHp;
          console.log('[' + charId.toUpperCase() + '] Entered Boss Arena at t=' + simTime.toFixed(1) + 's');
        }

        if (game.boss.isTransforming && !game._bossP2Healed) {
          game._bossP2Healed = true;
          game.player.hp = game.player.maxHp;
        }

        const currentDist = game.boss.x - game.player.x;
        if (currentDist > bossCombatDist + 20) {
          input.keys['ArrowRight'] = true; input.keys['ArrowLeft'] = false;
        } else if (currentDist < bossCombatDist - 20) {
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
      }
    } else if (game.state === 'VICTORY_RUN') {
      input.reset();
    }

    game.update(dt);
    input.endFrame();
  }
  console.log('[' + charId.toUpperCase() + '] Result: State=' + game.state + ' x=' + Math.round(game.player.x) + ' HP=' + game.player.hp + '/' + game.player.maxHp + ' time=' + simTime.toFixed(1) + 's punched=' + game.pm.clockInMachine.punched);
});
