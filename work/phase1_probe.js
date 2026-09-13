const { loadRuntime, createGame } = require('../scripts/v9_7_1_test_harness');

const heroes = ['yu', 'shakira', 'sandra'];
const seeds = [101, 202, 303, 404, 505, 606, 707, 808, 909, 1001];

for (const hero of heroes) {
  for (const seed of seeds) {
    const runtime = loadRuntime(seed);
    const { input } = runtime;
    const game = createGame(runtime, hero);
    game.level.monsters = [];
    let steps = 0;
    while (steps++ < 5000 && game.state !== 'GAMEOVER' && game.player.coins < 30) {
      if (game.state === 'PLAYING' && game.player.x < 14800) {
        input.keys.ArrowRight = true;
        input.keys.ArrowLeft = false;
        input.keys.KeyS = false;
        input.keys.KeyF = false;
        const gapLookAhead = game.player.x + 250;
        const groundAhead = game.pm.platforms.some(platform => platform.type === 'stone' && platform.x <= gapLookAhead && platform.x + platform.w >= gapLookAhead && platform.y >= 540);
        if (game.player.onGround) {
          input.justPressedKeys.Space = true;
          input.keys.Space = true;
        } else if (game.player.vy > 0 && !groundAhead && game.player.dashCooldown <= 0) {
          input.justPressedKeys.ShiftLeft = true;
        }
      }
      game.update(0.02);
      input.endFrame();
    }
    if (game.player.coins < 30) console.log(JSON.stringify({ hero, seed, state: game.state, hp: game.player.hp, x: Math.round(game.player.x), y: Math.round(game.player.y), fallCount: game.player.fallCount }));
  }
}
