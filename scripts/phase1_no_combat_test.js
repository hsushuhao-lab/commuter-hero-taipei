const assert = require('assert');
const { loadRuntime, createGame } = require('./v9_7_1_test_harness');

const heroes = ['yu', 'shakira', 'sandra'];
const seeds = [101, 202, 303, 404, 505, 606, 707, 808, 909, 1001];
const results = [];

function runTrial(hero, seed) {
  const runtime = loadRuntime(seed);
  const { input } = runtime;
  const game = createGame(runtime, hero);
  const dt = 0.02;
  let simTime = 0;
  let steps = 0;

  while (steps++ < 5000 && game.state !== 'GAMEOVER' && game.player.coins < 30) {
    runtime.advanceTime(dt);
    simTime += dt;
    if (game.state === 'PLAYING' && game.player.x < 14800) {
      input.keys.ArrowRight = true;
      input.keys.ArrowLeft = false;
      input.keys.KeyS = false;
      input.keys.KeyF = false;

      const gapLookAhead = game.player.x + 90;
      const groundAhead = game.pm.platforms.some(platform => platform.type === 'stone' && platform.x <= gapLookAhead && platform.x + platform.w >= gapLookAhead && platform.y >= 540);
      const approachingMonster = game.level.monsters.some(monster => !monster.isDead && monster.x > game.player.x && monster.x - game.player.x < 120 && Math.abs(monster.y - game.player.y) < 90);
      const nearbyBullet = runtime.projectiles.projectiles.some(projectile => !projectile.isPlayer && Math.abs(projectile.x - game.player.x) < 100 && Math.abs(projectile.y - (game.player.y - 35)) < 60);
      if (nearbyBullet && groundAhead && game.player.dashCooldown <= 0) {
        input.justPressedKeys.ShiftLeft = true;
      }
      if (game.player.onGround && (!groundAhead || approachingMonster)) {
        input.justPressedKeys.Space = true;
        input.keys.Space = true;
      } else if (game.player.vy > 0 && !groundAhead && game.player.dashCooldown <= 0) {
        input.justPressedKeys.ShiftLeft = true;
      }
    }
    game.update(dt);
    input.endFrame();
  }

  return {
    hero,
    seed,
    success: game.player.coins >= 30 && !game.player.isDead,
    state: game.state,
    coins: game.player.coins,
    hp: game.player.hp,
    x: Math.round(game.player.x),
    y: Math.round(game.player.y),
    falls: game.player.fallCount,
    seconds: Number(simTime.toFixed(2))
  };
}

for (const hero of heroes) {
  const heroResults = seeds.map(seed => runTrial(hero, seed));
  const successes = heroResults.filter(result => result.success).length;
  results.push(...heroResults);
  console.log(`${hero}: ${successes}/${seeds.length} Phase 1 no-combat trials reached 30 coins`);
}

console.log(JSON.stringify(results));
for (const hero of heroes) {
  const successes = results.filter(result => result.hero === hero && result.success).length;
  assert(successes >= 7, `${hero} requires at least 7/10 no-combat Phase 1 successes; got ${successes}/10`);
}
console.log('PASS: Phase 1 no-combat calibration reached the >=70% target for every hero.');
process.exit(0);
