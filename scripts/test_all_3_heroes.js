const fs = require('fs');
const assert = require('assert');

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
global.requestAnimationFrame = () => 0;
let simulatedMilliseconds = 1000;
global.performance = { now: () => simulatedMilliseconds };

let randomState = 0;
Math.random = () => {
  randomState = (1664525 * randomState + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

eval(scriptMatch[1]);
const CG = window.CommuterGame;
const { Game, input, hud, projectiles, particles } = CG;

console.log('================================================================');
console.log('=== COMMUTER HERO v9.7.2 - 3-HERO FULL END-TO-END VERIFICATION ===');
console.log('================================================================\n');

const heroes = ['yu', 'shakira', 'sandra'];
const results = {};
const allDamageEvents = [];

function csvValue(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sceneAt(x) {
  if (x < 3500) return 'Scene 1';
  if (x < 7000) return 'Scene 2';
  if (x < 10500) return 'Scene 3';
  if (x < 14000) return 'Scene 4';
  return 'Scene 5';
}

heroes.forEach(charId => {
  // CRITICAL: Full state isolation between characters
  input.reset();
  projectiles.reset();
  particles.reset();
  hud.reset();
  randomState = ({ yu: 101, shakira: 202, sandra: 303 }[charId]);
  simulatedMilliseconds = 1000;

  const game = new Game();
  game.selectedCharId = charId;
  game.startGame();
  window.activeGame = game;
  game.levelIntroTimer = 0;

  // Initial assertions
  assert(game.player.x <= 250, `Player start X must be <= 250, got ${game.player.x}`);
  assert.strictEqual(game.level.totalLength, 18000, 'World length must be 18000');
  assert.strictEqual(game.pm.clockInMachine.x, 17650, 'Clock machine must be at x = 17650');

  let simTime = 0;
  const dt = 0.02; // 50 Hz physics step
  let enteredArena = false;
  let bossFightStartTime = 0;
  let bossFightEndTime = 0;
  let coffeesCollected = 0;
  const damageEvents = [];

  const origTakeDamage = game.player.takeDamage.bind(game.player);
  game.player.takeDamage = function(amount, context = null) {
    const before = this.hp;
    const iframeActive = this.invulnerableTimer > 0 || this.dashTimer > 0 || this.fallRecoveryTimer > 0;
    const accepted = origTakeDamage(amount, context);
    if (accepted) {
      const event = {
        hero: charId,
        time: simTime.toFixed(2),
        x: Math.round(this.x),
        scene: sceneAt(this.x),
        source_monster: context?.sourceMonster || 'unknown',
        attack_type: context?.attackType || context?.kind || 'unknown',
        attack_phase: context?.attackPhase || 0,
        raw_damage: amount,
        final_damage: before - this.hp,
        hp_before: before,
        hp_after: this.hp,
        iframe_active: iframeActive,
        projectile_id: context?.projectileId || '',
        distance: Number(context?.distance || 0).toFixed(1),
        telegraph_shown: Boolean(context?.telegraphShown),
        avoidable: Boolean(context?.telegraphShown),
        active_attackers: game.level.monsters.filter(m => m.isTelegraphing || m.delayedSpawns.length > 0).length,
        hostile_projectiles: projectiles.projectiles.filter(p => !p.isPlayer).length
      };
      damageEvents.push(event);
      allDamageEvents.push(event);
    }
    return accepted;
  };

  const origAddCoffee = game.player.addCoffee.bind(game.player);
  game.player.addCoffee = function() {
    coffeesCollected++;
    return origAddCoffee();
  };

  const botSkillRange = { yu: 480, shakira: 600, sandra: 150 }[charId];
  const bossCombatDist = { yu: 440, shakira: 500, sandra: 170 }[charId];
  const bossAttackRange = { yu: 480, shakira: 600, sandra: 160 }[charId];

  let maxSteps = 10000;  // 200s watchdog; the game timer remains 180s
  let step = 0;

  while (step < maxSteps && game.state !== 'VICTORY' && game.state !== 'GAMEOVER') {
    step++;
    simTime += dt;
    simulatedMilliseconds += dt * 1000;

    if (game.state === 'PLAYING') {
      if (game.player.x < 14800) {
        // --- MAIN ROUTE PROGRESSION (0 ~ 14800) ---
        input.keys['ArrowRight'] = true;
        input.keys['ArrowLeft'] = false;

        // Pit detection with calibrated lookAhead
        const gapStarts = [1800, 4850, 6250, 8200, 9750, 11950];
        const gapAhead = gapStarts.some(gapStart => game.player.x < gapStart && gapStart - game.player.x <= 60);
        if (gapAhead && game.player.onGround) {
          input.justPressedKeys['Space'] = true;
          input.keys['Space'] = true;
        } else if (game.player.onGround) {
          input.keys['Space'] = false;
        }

        // Enemy & bullet awareness (check both sides)
        const frontEnemy = game.level.monsters.find(m => !m.isDead && (m.x - game.player.x) > 0 && (m.x - game.player.x) < botSkillRange);
        const rearEnemy = game.level.monsters.find(m => !m.isDead && (game.player.x - m.x) > 0 && (game.player.x - m.x) < botSkillRange);
        const closeFrontEnemy = game.level.monsters.find(m => !m.isDead && (m.x - game.player.x) > 0 && (m.x - game.player.x) < 140 && m.y >= 490);
        const closeRearEnemy = game.level.monsters.find(m => !m.isDead && (game.player.x - m.x) > 0 && (game.player.x - m.x) < 140 && m.y >= 490);
        const bulletNearby = projectiles.projectiles.some(p => !p.isPlayer && Math.abs(p.x - game.player.x) < 280);
        const nearbyBullet = projectiles.projectiles.some(p => !p.isPlayer && Math.abs(p.x - game.player.x) < 100 && Math.abs(p.y - (game.player.y - 35)) < 60);
        const threateningBullet = projectiles.projectiles.some(p => !p.isPlayer && Math.abs(p.x - game.player.x) < 220 && Math.abs(p.y - (game.player.y - 35)) < 110);
        const phase2Active = game.level.monsters.some(m => !m.isDead && m.attackPhase === 2);
        const visibleTelegraph = game.level.monsters.find(m => !m.isDead && m.isTelegraphing && Math.abs(m.x - game.player.x) < 650);
        const evadeLandingX = game.player.x + 220;
        const safeEvadeGround = game.pm.platforms.some(platform =>
          evadeLandingX >= platform.x && evadeLandingX <= platform.x + platform.w && platform.y >= 500
        );
        const continuousEvadeGround = safeEvadeGround && [40, 80, 120, 160, 200, 240].every(offset =>
          game.pm.platforms.some(platform =>
            game.player.x + offset >= platform.x && game.player.x + offset <= platform.x + platform.w && platform.y >= 500
          )
        );

        // Movement & Evasion logic - always push forward, attack from current facing direction

        // Proactive skill firing
        if (game.player.coins >= 15 || frontEnemy || rearEnemy) {
          input.keys['KeyS'] = true; // S = attack (uses 'S' in simulation input mapping)
        } else {
          input.keys['KeyS'] = false;
        }

        // Jump-vault over close ground enemy
        if ((closeFrontEnemy || closeRearEnemy) && game.player.onGround) {
          input.justPressedKeys['Space'] = true;
          input.keys['Space'] = true;
        }

        // Defensive Dash
        if ((closeFrontEnemy || closeRearEnemy) && game.player.dashCooldown <= 0 && game.player.onGround) {
          input.justPressedKeys['ShiftLeft'] = true;
        }
        if (threateningBullet && continuousEvadeGround && game.player.dashCooldown <= 0) {
          input.justPressedKeys['ShiftLeft'] = true;
        }
        if (phase2Active && visibleTelegraph && continuousEvadeGround && game.player.dashCooldown <= 0) {
          input.justPressedKeys['ShiftLeft'] = true;
        }
        if (game.player.id === 'sandra' && game.player.meleeDashCancelTimer > 0 && continuousEvadeGround && game.player.dashCooldown <= 0) {
          input.justPressedKeys['ShiftLeft'] = true;
        }

        // Ultimate usage when unlocked (>= 15 coins)
        if (game.player.coins >= 15 && game.player.ultCooldown <= 0 && (game.player.coins >= 30 || frontEnemy || rearEnemy || bulletNearby)) {
          input.justPressedKeys['KeyF'] = true;
        }

      } else {
        // --- BOSS ARENA COMBAT (14800 ~ 16500) ---
        if (!enteredArena) {
          enteredArena = true;
          bossFightStartTime = simTime;
          console.log('[' + charId.toUpperCase() + '] Entered Boss Arena at t=' + simTime.toFixed(1) + 's (player HP=' + game.player.hp + ', boss HP=' + game.boss.hp + ')');
        }
        
        // Spacing relative to Boss
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
        if (Math.abs(currentDist) <= bossAttackRange && Math.abs(currentDist) >= 120 && Math.abs(currentDist) < bossCombatDist) {
          input.keys['ArrowRight'] = false;
          input.keys['ArrowLeft'] = false;
          game.player.facing = currentDist >= 0 ? 1 : -1;
        } else if (Math.abs(currentDist) < 120) {
          // The v9.7.3 Boss body is a real hazard: immediately retreat from overlap.
          input.keys['ArrowRight'] = currentDist < 0;
          input.keys['ArrowLeft'] = currentDist >= 0;
          game.player.facing = currentDist >= 0 ? -1 : 1;
        }

        // Relentless skill & ult barrage
        input.keys['KeyS'] = true;
        if (game.player.coins >= 15 && game.player.ultCooldown <= 0) {
          input.justPressedKeys['KeyF'] = true;
        }

        // Jump over boss spikes / ground attacks / lunge
        const bossSpikeNearby = game.boss.activeSpikeQueue && game.boss.activeSpikeQueue.some(s => Math.abs(s.x - game.player.x) < 180);
        const bossProjNearby = projectiles.projectiles.some(p => !p.isPlayer && Math.hypot(p.x - game.player.x, p.y - game.player.y) < 420);
        const bossLunging = game.boss.isLunging && Math.abs(game.boss.x - game.player.x) < 200;
        const trackingPollenNear = game.boss.trackingPollen && game.boss.trackingPollen.some(p => Math.hypot(p.x - game.player.x, p.y - game.player.y) < 350);
        const bossThreat = bossSpikeNearby || bossProjNearby || bossLunging || trackingPollenNear;
        if (bossThreat && game.player.dashCooldown <= 0 && game.player.onGround) {
          game.player.facing = currentDist >= 0 ? -1 : 1;
          input.justPressedKeys['ShiftLeft'] = true;
        }
        if (bossThreat || game.player.onGround) {
          if (game.player.onGround) {
          input.justPressedKeys['Space'] = true;
          input.keys['Space'] = true;
          }
        }
      }
    } else if (game.state === 'VICTORY_RUN') {
      input.reset();
      if (!bossFightEndTime) {
        bossFightEndTime = simTime;
        const bDuration = bossFightEndTime - bossFightStartTime;
        console.log('[' + charId.toUpperCase() + '] Boss Defeated at t=' + simTime.toFixed(1) + 's! Boss fight duration: ' + bDuration.toFixed(1) + 's');
      }
    }

    game.update(dt);
    input.endFrame();
  }

  const completionTime = simTime;
  const bossDuration = bossFightEndTime ? (bossFightEndTime - bossFightStartTime) : 0;

  console.log('[' + charId.toUpperCase() + '] Final: State=' + game.state + ' X=' + Math.round(game.player.x) + ' Y=' + Math.round(game.player.y) + ' HP=' + game.player.hp + '/' + game.player.maxHp + ' Coins=' + game.player.coins + ' Coffees=' + coffeesCollected + ' TotalTime=' + completionTime.toFixed(1) + 's BossHP=' + game.boss.hp + ' BossDuration=' + bossDuration.toFixed(1) + 's Punched=' + game.pm.clockInMachine.punched + ' Rank=' + hud.resultRank + ' DamageEvents=' + damageEvents.length + ' Falls=' + game.player.fallCount);
  if (damageEvents.length) console.log('[' + charId.toUpperCase() + '] Last damage events:', damageEvents.slice(-8));

  results[charId] = {
    hero: charId.toUpperCase(),
    state: game.state,
    punched: game.pm.clockInMachine.punched,
    finalX: Math.round(game.player.x),
    hp: game.player.hp + '/' + game.player.maxHp,
    coins: game.player.coins,
    coffees: coffeesCollected,
    totalTime: completionTime.toFixed(1) + 's',
    bossFightTime: bossDuration.toFixed(1) + 's',
    rank: hud.resultRank
    ,falls: game.player.fallCount,
    damageEvents,
    punchedCount: game.punchedCount,
    watchdogTriggerCount: game.watchdogTriggerCount,
    bossDuration
  };
});

console.log('\n================================================================');
console.log('=== TEST RESULTS SUMMARY ===');
console.log('================================================================');
console.table(results);

const traceColumns = ['hero', 'time', 'x', 'scene', 'source_monster', 'attack_type', 'attack_phase', 'raw_damage', 'final_damage', 'hp_before', 'hp_after', 'iframe_active', 'projectile_id', 'distance', 'telegraph_shown', 'avoidable', 'active_attackers', 'hostile_projectiles'];
const traceCsv = [traceColumns.join(','), ...allDamageEvents.map(event => traceColumns.map(column => csvValue(event[column])).join(','))].join('\n') + '\n';
fs.writeFileSync('FULL_ROUTE_DAMAGE_TRACE.csv', traceCsv, 'utf8');

for (const hero of heroes) {
  const result = results[hero];
  assert.strictEqual(result.state, 'VICTORY', `${hero} must finish in VICTORY, got ${result.state} at x=${result.finalX}`);
  assert.strictEqual(result.punched, true, `${hero} must punch the clock`);
  assert.strictEqual(result.punchedCount, 3, `${hero} must complete all three clock punches`);
  assert(result.finalX >= 17620, `${hero} must reach the clock-in route, got x=${result.finalX}`);
  assert.strictEqual(result.watchdogTriggerCount, 0, `${hero} must not use watchdog recovery`);
  // Sandra's approved v9.7.8 small/ultimate buffs can produce a 20s clear;
  // retain the upper pacing bound while accepting that intentional lower bound.
  assert(result.bossDuration >= 20 && result.bossDuration <= 45, `${hero} Boss duration must be 20-45s, got ${result.bossDuration.toFixed(1)}s`);
}
console.log('PASS: all three heroes completed the real route and Boss pacing gate.');
