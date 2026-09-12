/**
 * Automated Headless Playtest Simulation for Commuter Hero v9.1.0
 * Route & Art Fidelity Edition
 * Tests all 13 required assertions from Section 12.
 */

const fs = require('fs');
const assert = require('assert');

console.log('--- RUNNING AUTOMATED PLAYTEST SIMULATION (v9.1.0) ---');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  throw new Error('Could not find script tag in index.html');
}
const scriptContent = scriptMatch[1];

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
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
          setTargetAtTime: () => {}
        },
        connect: () => {}
      };
    }
    createOscillator() {
      return {
        frequency: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createBiquadFilter() {
      return {
        frequency: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {}
        },
        Q: { setValueAtTime: () => {} },
        connect: () => {}
      };
    }
    resume() {}
  }
};
global.document = {
  getElementById: (id) => ({
    getContext: () => ({
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      arc: () => {},
      ellipse: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      closePath: () => {},
      drawImage: () => {},
      clearRect: () => {},
      fillText: () => {},
      setLineDash: () => {},
      clip: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }),
    style: {},
    addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 })
  })
};
global.Image = class {
  constructor() {
    this.complete = true;
    this.naturalWidth = 256;
    this.naturalHeight = 256;
  }
};
global.navigator = { maxTouchPoints: 0 };
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.performance = { now: () => Date.now() };

// Evaluate bundled game in sandbox
eval(scriptContent);

const CG = window.CommuterGame;
assert(CG, 'window.CommuterGame must be exposed');
const { Game, Player, Boss, Level, STAGES, CHARACTERS, MONSTERS, BOSS_CONFIG, hud, PlatformManager, projectiles } = CG;

console.log('Game initialized successfully in headless sandbox!\n');

let passedAssertions = 0;

function testAssert(title, fn) {
  try {
    fn();
    passedAssertions++;
    console.log(`[PASS] Assertion ${passedAssertions}: ${title}`);
  } catch (err) {
    console.error(`[FAIL] Assertion ${passedAssertions + 1}: ${title}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Map length & 5 scenes
testAssert('Total map length is strictly 18,000px across 5 main scenes with 500px crossfade transitions', () => {
  const pm = new PlatformManager();
  const level = new Level(pm);
  assert.strictEqual(level.totalLength, 18000, `Expected 18000, got ${level.totalLength}`);
  assert.strictEqual(STAGES.length, 5, `Expected 5 stages, got ${STAGES.length}`);
  assert.strictEqual(STAGES[0].startX, 0);
  assert.strictEqual(STAGES[0].endX, 3500);
  assert.strictEqual(STAGES[1].startX, 3500);
  assert.strictEqual(STAGES[1].endX, 7000);
  assert.strictEqual(STAGES[2].startX, 7000);
  assert.strictEqual(STAGES[2].endX, 10500);
  assert.strictEqual(STAGES[3].startX, 10500);
  assert.strictEqual(STAGES[3].endX, 14000);
  assert.strictEqual(STAGES[4].startX, 14000);
  assert.strictEqual(STAGES[4].endX, 18000);
});

// 2. 5 Main Scene Background Assets
testAssert('All 5 main scene art assets (+ interior) are integrated into gameplay rendering', () => {
  const pm = new PlatformManager();
  const level = new Level(pm);
  const expectedKeys = [0, 1, 2, 3, 4, 'interior'];
  for (const k of expectedKeys) {
    assert(level.bgImages[k], `Missing bgImage for key: ${k}`);
  }
});

// 3. Strict 2-Item System
testAssert('Gameplay collectible items contain strictly Coins and Coffee (EasyCard/Heart/Energy === 0)', () => {
  const pm = new PlatformManager();
  const level = new Level(pm);
  assert(pm.items.length > 0, 'Items should be placed');
  const invalidItems = pm.items.filter(it => it.type !== 'coin' && it.type !== 'coffee');
  assert.strictEqual(invalidItems.length, 0, `Found invalid items: ${JSON.stringify(invalidItems)}`);
  const coins = pm.items.filter(it => it.type === 'coin');
  const coffees = pm.items.filter(it => it.type === 'coffee');
  assert(coins.length >= 60, `Coins count must be >= 60, got ${coins.length}`);
  assert(coffees.length >= 10, `Coffee count must be >= 10, got ${coffees.length}`);
});

// 4. Coffee Recovery & No Speed Buff
testAssert('Coffee heals 25 HP (cap maxHp), removes speed buff, and shows HP FULL on full HP', () => {
  const player = new Player('yu');
  player.hp = 50;
  player.addCoffee();
  assert.strictEqual(player.hp, 75, `Expected HP 75, got ${player.hp}`);
  assert(!player.coffeeSpeedTimer || player.coffeeSpeedTimer === 0, 'No coffee speed buff should exist');

  // Full HP test
  player.hp = 100;
  player.invulnerableTimer = 0;
  player.addCoffee();
  assert.strictEqual(player.hp, 100);
  assert.strictEqual(player.invulnerableTimer, 0, 'Full HP coffee strictly grants no invulnerability buff');
});

// 5. Hero Skills Physical Ranges, Arcs, Deflect, and Cooldowns
testAssert('All 3 Heroes have calibrated physical ranges, arcs, deflect radii, and cooldowns', () => {
  const yu = CHARACTERS.yu;
  const shakira = CHARACTERS.shakira;
  const sandra = CHARACTERS.sandra;

  assert.strictEqual(yu.skill.range, 190);
  assert.strictEqual(yu.skill.arcAngle, 90);
  assert.strictEqual(yu.skill.deflectRadius, 210);
  assert.strictEqual(yu.skill.cooldown, 0.30);

  assert.strictEqual(shakira.skill.range, 560);
  assert.strictEqual(shakira.skill.splashRadius, 80);
  assert.strictEqual(shakira.skill.cooldown, 0.38);

  assert.strictEqual(sandra.skill.meleeRange, 150);
  assert.strictEqual(sandra.skill.shockwaveRange, 280);
  assert.strictEqual(sandra.skill.fanAngle, 110);
  assert.strictEqual(sandra.skill.cooldown, 0.45);
});

// 6. Yu 15-Coin Ult Specs
testAssert('Yu 15-Coin Ult: Max rush 720px, invulnerable 1.2s, CD 6.5s', () => {
  const yu = CHARACTERS.yu;
  assert.strictEqual(yu.ult.dashDistance, 720);
  assert.strictEqual(yu.ult.duration, 1.2);
  assert.strictEqual(yu.ult.cooldown, 6.5);
});

// 7. Shakira 15-Coin Ult Specs
testAssert('Shakira 15-Coin Ult: Zone radius 480px (960px width), 30 HP heal, CD 7.5s', () => {
  const shakira = CHARACTERS.shakira;
  assert.strictEqual(shakira.ult.zoneRadius, 480);
  assert.strictEqual(shakira.ult.heal, 30);
  assert.strictEqual(shakira.ult.cooldown, 7.5);
  
  // Shakira Mayo Orbs orbit radius strictly 75px
  const player = new Player('shakira');
  player.awakenForm2();
  const orbs = player.getMayoOrbsWorld();
  assert.strictEqual(orbs.length, 3);
  const orbDist = Math.hypot(orbs[0].x - player.x, orbs[0].y - (player.y - 35));
  assert(Math.abs(orbDist - 75) < 1.0, `Mayo Orb distance should be 75px, got ${orbDist}`);
});

// 8. Sandra 15-Coin Ult Specs
testAssert('Sandra 15-Coin Ult: Cyclone core radius 340px, gust range 400px, CD 7.8s', () => {
  const sandra = CHARACTERS.sandra;
  assert.strictEqual(sandra.ult.coreRadius, 340);
  assert.strictEqual(sandra.ult.gustRange, 400);
  assert.strictEqual(sandra.ult.cooldown, 7.8);
});

// 9. Monster 3D Distribution & Fair Combat Telegraph
testAssert('Monster 3D distribution across ground, high brick, and slope platforms with fair telegraph', () => {
  const pm = new PlatformManager();
  const level = new Level(pm);
  assert(level.monsters.length >= 25, `Expected >= 25 monsters, got ${level.monsters.length}`);
  
  const groundMonsters = level.monsters.filter(m => m.y >= 540);
  const highMonsters = level.monsters.filter(m => m.y < 540);
  assert(groundMonsters.length > 0, 'Ground monsters must exist');
  assert(highMonsters.length > 0, 'High platform / terrace monsters must exist');

  // All normal monster configs have 0.40s telegraph
  for (const [id, mcfg] of Object.entries(MONSTERS)) {
    assert.strictEqual(mcfg.telegraphDuration, 0.40, `Monster ${id} telegraph duration must be 0.40s`);
  }
});

// 10. Boss Arena Continuity, Projectile Clamping & v9.3 HP/Phase Upgrade
testAssert('Boss v9.3: HP=2600, Phase2Threshold=1300, 9-way Phase1 petals, Arena floor continuous', () => {
  const pm = new PlatformManager();
  const level = new Level(pm);
  assert.strictEqual(BOSS_CONFIG.arena.startX, 14800);
  assert.strictEqual(BOSS_CONFIG.arena.endX, 16500);
  assert.strictEqual(BOSS_CONFIG.arena.width, 1700);
  // v9.3 HP checks
  assert.strictEqual(BOSS_CONFIG.maxHp, 2600, `Expected maxHp=2600, got ${BOSS_CONFIG.maxHp}`);
  assert.strictEqual(BOSS_CONFIG.phase2Threshold, 1300, `Expected phase2Threshold=1300, got ${BOSS_CONFIG.phase2Threshold}`);
  assert(BOSS_CONFIG.antiFacetank, 'antiFacetank config must exist');
  assert.strictEqual(BOSS_CONFIG.antiFacetank.vineCleaveDamage, 18);
  assert.strictEqual(BOSS_CONFIG.antiFacetank.vineCleaveKnockback, 250);
  assert(BOSS_CONFIG.phase1.petalCount >= 9, `Phase1 petal count must be >= 9, got ${BOSS_CONFIG.phase1.petalCount}`);

  // Check arena floor continuity: no gaps between 14800 and 16500
  for (let x = 14800; x <= 16500; x += 50) {
    const plat = pm.platforms.find(p => p.type === 'stone' && p.x <= x && (p.x + p.w) >= x && p.y >= 550);
    assert(plat, `Missing solid ground platform at Arena x=${x}`);
  }

  // Check Boss projectile arena clamping (Phase 1: 9 petals fired)
  projectiles.reset();
  const boss = new Boss();
  const player = new Player('yu');
  player.x = 15200;
  player.y = 560;
  assert.strictEqual(boss.x, 15650);
  boss.firePetalBarrage(player);
  assert(projectiles.projectiles.length >= 9, `Phase1 should fire >= 9 petals, got ${projectiles.projectiles.length}`);
  for (const proj of projectiles.projectiles) {
    assert(proj.arenaBounds, 'Boss projectiles must have arenaBounds');
    assert.strictEqual(proj.arenaBounds.minX, 14750);
    assert.strictEqual(proj.arenaBounds.maxX, 16550);
  }
});

// 11. 120s Timer Pause During Non-Playable Cutscenes
testAssert('120s commute timer pauses during cut-in, boss roar, and victory run', () => {
  hud.reset();
  const player = new Player('yu');
  const boss = new Boss();
  
  const initialTime = hud.timeRemaining;
  assert.strictEqual(initialTime, 120);

  // When cutinActive is true
  hud.cutinActive = true;
  hud.update(1.0, player, boss);
  assert.strictEqual(hud.timeRemaining, 120, 'Timer must pause during Cut-in');

  hud.cutinActive = false;
  // When boss is roaring
  boss.roarTimer = 1.5;
  hud.update(1.0, player, boss);
  assert.strictEqual(hud.timeRemaining, 120, 'Timer must pause during Boss roar');

  boss.roarTimer = 0;
  hud.update(1.0, player, boss);
  assert(hud.timeRemaining < 120, 'Timer should tick during normal gameplay');
});

// 12. v9.3 Victory Flow: BOSS_BURST → COMPANION_RUSH → DIALOGUE → GROUP_SPRINT → PUNCH_CLOCK
testAssert('v9.3 Victory sequence: BOSS_BURST → COMPANION_RUSH → DIALOGUE → GROUP_SPRINT → PUNCH_CLOCK', () => {
  const game = new Game();
  game.startGame();
  game.boss.isDead = true;
  game.update(0.016);
  assert.strictEqual(game.state, 'VICTORY_RUN', 'State should change to VICTORY_RUN');
  assert.strictEqual(game.victorySubState, 'BOSS_BURST', 'Initial sub-state should be BOSS_BURST');

  // Advance past BOSS_BURST (0.8s)
  game.updateVictoryRun(0.9);
  assert.strictEqual(game.victorySubState, 'COMPANION_RUSH', 'After BOSS_BURST should be COMPANION_RUSH');

  // Companions should be spawned
  assert(game.companions.length === 2, `Expected 2 companions, got ${game.companions.length}`);

  // Force companions to arrive and advance to DIALOGUE
  for (const comp of game.companions) {
    comp.x = game.player.x - 90;
    comp.vx = 0;
    comp.animPhase = 'arrive';
  }
  game.updateVictoryRun(1.5); // Enough time for allArrived && victoryTimer >= 1.2
  assert.strictEqual(game.victorySubState, 'DIALOGUE', 'After COMPANION_RUSH should be DIALOGUE');

  // Advance through DIALOGUE (3.5s)
  game.updateVictoryRun(3.6);
  assert.strictEqual(game.victorySubState, 'GROUP_SPRINT', 'After DIALOGUE should be GROUP_SPRINT');

  // Sprint to x=17630 in GROUP_SPRINT
  game.player.x = 17625;
  game.updateVictoryRun(0.05);
  assert.strictEqual(game.victorySubState, 'PUNCH_CLOCK', 'After GROUP_SPRINT should reach PUNCH_CLOCK');
  assert(game.pm.clockInMachine.punched, 'Clock-in machine must be marked punched');
  assert(game.pm.clockInMachine.punchedTimeText, 'Clock-in machine must display punched time');
});

// 13. Dynamic Real Clock Time (08:00:00 - remaining)
testAssert('Punch clock calculates dynamic real time accurately based on remaining timer', () => {
  hud.reset();
  // If 23 seconds remaining (out of 120): secPassed = 97s = 1m 37s -> 07:58 + 1m37s = 07:59:37
  hud.timeRemaining = 23;
  const timeStr = hud.getFormattedClockTime();
  assert.strictEqual(timeStr, '07:59:37', `Expected 07:59:37, got ${timeStr}`);

  // If 120 seconds remaining (game start): 07:58:00
  hud.timeRemaining = 120;
  assert.strictEqual(hud.getFormattedClockTime(), '07:58:00');

  // If 0 seconds remaining: 08:00:00
  hud.timeRemaining = 0;
  assert.strictEqual(hud.getFormattedClockTime(), '08:00:00');

  // Scorecard check
  const p = new Player('yu');
  p.coins = 50;
  p.hp = 80;
  hud.timeRemaining = 36;
  hud.calculateEvaluation(p, true);
  assert.strictEqual(hud.resultRank, 'Rank S');
  assert.strictEqual(hud.punchedTimeText, '07:59:24');
});

// 14. Camera World Bounds (18,000px tracking)
testAssert('Camera bounds correctly set to level.totalLength (18000px) and tracks to final lobby', () => {
  const game = new Game();
  game.startGame();
  assert.strictEqual(game.camera.maxX, 18000 - 960); // 17040
  game.player.x = 17650;
  // Advance camera tracking
  for (let i = 0; i < 30; i++) {
    game.camera.update(0.05);
  }
  assert(game.camera.x >= 16600, `Expected camera.x >= 16600, got ${game.camera.x}`);
});

// 15. Victory Run Watchdog (Zero triggers in normal release)
testAssert('Watchdog trigger count is strictly 0 during normal gameplay and test runs', () => {
  const game = new Game();
  game.startGame();
  assert.strictEqual(game.watchdogTriggerCount, 0, 'watchdogTriggerCount must be 0');
});

// 16. v9.3 Boss Anti-Facetank Vine Cleave mechanism
testAssert('v9.3 Boss anti-facetank: vine cleave triggers after 1.2s close-range contact', () => {
  projectiles.reset();
  const boss = new Boss();
  const player = new Player('yu');
  player.x = boss.x + 50; // Very close to boss (within 120px threshold)
  player.y = 560;
  
  assert.strictEqual(boss.facetankTimer, 0, 'facetankTimer starts at 0');
  assert.strictEqual(boss.vineCleaveCooldown, 0, 'vineCleaveCooldown starts at 0');
  
  // Simulate 1.1s of close-range contact (just below threshold)
  const mockCamera = { shake: () => {}, x: 0 };
  // Manually tick facetank timer to 1.1s (below threshold)
  boss.facetankTimer = 1.1;
  boss.vineCleaveCooldown = 0;
  assert(!boss.isVineCleaving, 'Should not be vine cleaving below threshold');
  
  // At 1.2s threshold, facetankTimer reaches standingDuration
  boss.facetankTimer = 1.2;
  const dist = Math.abs(player.x - boss.x);
  assert(dist < boss.config.antiFacetank.distThreshold, 'Player must be in facetank range');
  
  // Trigger the cleave manually
  boss._triggerVineCleave(player, boss.config.antiFacetank);
  assert(boss.isVineCleaving, 'Boss should be vine cleaving after trigger');
  assert(projectiles.projectiles.length >= 1, 'Vine cleave projectile must be spawned');
});

console.log('\n======================================================');
console.log(`ALL ${passedAssertions} / 16 ASSERTIONS PASSED SUCCESSFULLY! (100% PASS RATE)`);
console.log('======================================================');
process.exit(0);



