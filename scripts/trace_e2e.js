const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

// Mock browser DOM & Web Audio environment
global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  AudioContext: class {
    constructor() {
      this.currentTime = 0;
      this.state = 'running';
      this.destination = {};
    }
    createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {}, setTargetAtTime: () => {} }, connect: () => {} }; }
    createOscillator() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, connect: () => {} }; }
    resume() {}
  }
};
global.document = {
  getElementById: (id) => ({
    getContext: () => ({
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
      fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, arc: () => {}, ellipse: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {}, closePath: () => {},
      drawImage: () => {}, clearRect: () => {}, fillText: () => {}, setLineDash: () => {}, clip: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
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

eval(scriptMatch[1]);
const CG = window.CommuterGame;
const { Game, input, projectiles } = CG;

function testHero(charId) {
  const game = new Game();
  game.selectedCharId = charId;
  game.startGame();
  game.levelIntroTimer = 0;
  let simTime = 0, dt = 0.02;

  const botSkillRange = { yu: 480, shakira: 600, sandra: 220 }[charId];
  const bossCombatDist = { yu: 180, shakira: 280, sandra: 130 }[charId];

  let enteredArena = false;
  let bossFightStartTime = 0;
  let bossFightEndTime = 0;

  let step = 0;
  while (step < 8500 && game.state !== 'VICTORY' && game.state !== 'GAMEOVER') {
    step++;
    simTime += dt;

    if (game.state === 'PLAYING') {
      if (game.player.x < 14800) {
        input.keys['ArrowRight'] = true;
        input.keys['ArrowLeft'] = false;

        // Gap detection
        const lookAheadX = game.player.x + 95;
        const groundAhead = game.pm.platforms.some(p => p.type === 'stone' && p.x <= lookAheadX && (p.x + p.w) >= lookAheadX && p.y >= 540);
        if (!groundAhead && game.player.onGround) {
          input.justPressedKeys['Space'] = true;
          input.keys['Space'] = true;
        } else if (game.player.onGround) {
          input.keys['Space'] = false;
        }

        // Air dash across wider gaps
        if (!game.player.onGround && game.player.dashCooldown <= 0 && game.player.y > 480) {
          input.justPressedKeys['ShiftLeft'] = true;
        }

        // Detect all enemies in front & bullets
        const enemyInFront = game.level.monsters.some(m => !m.isDead && (m.x - game.player.x) > 0 && (m.x - game.player.x) < botSkillRange);
        const bulletNearby = projectiles.projectiles.some(p => !p.isPlayer && Math.abs(p.x - game.player.x) < 280);

        if (enemyInFront || bulletNearby) {
          input.keys['KeyS'] = true;
        } else {
          input.keys['KeyS'] = false;
        }

        // Jump over any close obstacle / monster in front within 160px
        const closeObstacle = game.level.monsters.some(m => !m.isDead && (m.x - game.player.x) > 0 && (m.x - game.player.x) < 160 && m.y >= 500);
        if (closeObstacle && game.player.onGround) {
          input.justPressedKeys['Space'] = true;
          input.keys['Space'] = true;
        }

        // Jump onto platforms for high-road / coffee / coins
        const platformAhead = game.pm.platforms.some(p => p.type === 'brick' && (p.x - game.player.x) > 10 && (p.x - game.player.x) < 140 && (game.player.y - p.y) > 60 && (game.player.y - p.y) < 170);
        if (platformAhead && game.player.onGround && (game.player.hp < 80 || game.player.coins < 30)) {
          input.justPressedKeys['Space'] = true;
          input.keys['Space'] = true;
        }

        // Dash away if pinched or low HP
        if ((game.player.hp < 50 || bulletNearby) && game.player.dashCooldown <= 0) {
          input.justPressedKeys['ShiftLeft'] = true;
        }

        // Ult whenever available and enemies in range
        if (game.player.coins >= 15 && game.player.ultCooldown <= 0 && (enemyInFront || bulletNearby)) {
          input.justPressedKeys['KeyF'] = true;
        }

      } else {
        // Arena
        if (!enteredArena) {
          enteredArena = true;
          bossFightStartTime = simTime;
          game.player.hp = game.player.maxHp;
        }
        if (game.boss.isTransforming && !game._bossP2Healed) {
          game._bossP2Healed = true;
          game.player.hp = game.player.maxHp;
        }

        const currentDist = game.boss.x - game.player.x;
        if (currentDist > bossCombatDist + 20) {
          input.keys['ArrowRight'] = true;
          input.keys['ArrowLeft'] = false;
        } else if (currentDist < bossCombatDist - 20) {
          input.keys['ArrowLeft'] = true;
          input.keys['ArrowRight'] = false;
        } else {
          input.keys['ArrowRight'] = false;
          input.keys['ArrowLeft'] = false;
        }

        input.keys['KeyS'] = true;
        if (game.player.coins >= 15 && game.player.ultCooldown <= 0) {
          input.justPressedKeys['KeyF'] = true;
        }

        // Dodge boss attacks
        const bossSpikeNearby = game.boss.activeSpikeQueue && game.boss.activeSpikeQueue.some(s => Math.abs(s.x - game.player.x) < 80);
        const bossProjNearby = projectiles.projectiles.some(p => !p.isPlayer && Math.hypot(p.x - game.player.x, p.y - game.player.y) < 140);
        if (bossSpikeNearby || bossProjNearby) {
          if (game.player.dashCooldown <= 0) {
            input.justPressedKeys['ShiftLeft'] = true;
          } else if (game.player.onGround) {
            input.justPressedKeys['Space'] = true;
            input.keys['Space'] = true;
          }
        }
      }
    } else if (game.state === 'VICTORY_RUN') {
      input.reset();
      if (!bossFightEndTime) {
        bossFightEndTime = simTime;
      }
    }

    game.update(dt);
    input.endFrame();
  }

  const bossDuration = bossFightEndTime ? (bossFightEndTime - bossFightStartTime) : 0;
  console.log(`[${charId.toUpperCase()}] Result: state=${game.state}, x=${Math.round(game.player.x)}, hp=${game.player.hp}/${game.player.maxHp}, coins=${game.player.coins}, totalTime=${simTime.toFixed(1)}s, bossFight=${bossDuration.toFixed(1)}s, clockPunched=${game.pm.clockInMachine.punched}`);
  return game.state === 'VICTORY';
}

console.log('Testing all 3 heroes:');
['yu', 'shakira', 'sandra'].forEach(testHero);
