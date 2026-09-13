
const fs = require('fs');
const assert = require('assert');

global.window = { innerWidth: 960, innerHeight: 540, addEventListener: () => {} };
global.document = {
  getElementById: () => ({
    getContext: () => ({
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
      fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, arc: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {},
      drawImage: () => {}, clearRect: () => {}, fillText: () => {}, setLineDash: () => {}
    }),
    style: {}
  })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 64; } };
global.performance = { now: () => Date.now() };

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
eval(scriptMatch[1]);

const CG = window.CommuterGame;
const { Player, projectiles } = CG;

console.log('=== TEST 1: HERO ATTACK IDENTITY TEST (v9.5.0) ===\n');

// 1. Yu Zichen
console.log('[1/4] Testing Yu Zichen (Parry / Dash / Corridor)...');
const yu = new Player('yu');
yu.x = 500; yu.y = 560; yu.facing = 1;
projectiles.reset();

projectiles.spawn({
  id: 'enemy_bullet_1',
  isPlayer: false,
  type: 'petal',
  x: 620,
  y: 525,
  vx: -400,
  vy: 0,
  damage: 15,
  width: 20,
  life: 1.0
});

assert.strictEqual(projectiles.projectiles.length, 1);
yu.triggerSkill();

const enemyBulletsRemaining = projectiles.projectiles.filter(p => !p.isPlayer);
const playerProjectiles = projectiles.projectiles.filter(p => p.isPlayer);
assert.strictEqual(enemyBulletsRemaining.length, 0, 'Yu parry should deflect enemy bullet');
assert(playerProjectiles.length >= 1, 'Yu parry should spawn counter wind-blade');
assert.strictEqual(playerProjectiles[0].type, 'wind_blade');
assert(yu.charConfig.stats.skillCooldown <= 0.35);
console.log('  ✓ Yu Parry + Deflect mechanics verified.');

// 2. Shakira
console.log('\n[2/4] Testing Shakira (Ranged Splash / Sustain)...');
const shakira = new Player('shakira');
shakira.x = 500; shakira.y = 560; shakira.facing = 1;
projectiles.reset();

shakira.triggerSkill();
const shakiraBullets = projectiles.projectiles.filter(p => p.isPlayer);
assert.strictEqual(shakiraBullets.length, 2, 'Shakira must spawn 2 egg bullets');
assert.notStrictEqual(shakiraBullets[0].y, shakiraBullets[1].y);
assert(shakiraBullets[0].type === 'egg' || shakiraBullets[0].type === 'egg_bullet', 'Shakira projectile type must be egg');
assert(shakiraBullets[0].splashRadius >= 90);
assert(shakiraBullets[0].maxDistance >= 600);
assert.strictEqual(shakiraBullets.some(p => p.isMeleeArc), false, 'Shakira projectiles must strictly have NO melee hitbox');
console.log('  ✓ Shakira Dual Ranged Splash verified.');

// 3. Sandra Peng
console.log('\n[3/4] Testing Sandra Peng (Melee Combo / Knockback)...');
const sandra = new Player('sandra');
sandra.x = 500; sandra.y = 560; sandra.facing = 1;
projectiles.reset();

sandra.triggerSkill();
assert.strictEqual(sandra.comboStage, 1);
assert.strictEqual(sandra.isAttacking, true);
assert(sandra.comboTimer > 0 && sandra.comboTimer <= 0.35);

// Stage 2: Ground Shockwave追擊 (within 0.32s window)
sandra.triggerSkill();
const combo1 = projectiles.projectiles.find(p => p.id && p.id.startsWith('sa_combo1_'));
assert(combo1, 'Sandra stage 1 must spawn melee arc swing');
assert.strictEqual(combo1.damage, 72, 'Sandra stage 1 damage must be 72');

const combo2 = projectiles.projectiles.find(p => p.id && p.id.startsWith('sa_combo2_'));
assert(combo2, 'Sandra stage 2 must spawn ground shockwave');
assert.strictEqual(combo2.damage, 48, 'Sandra stage 2 damage must be 48');
assert(combo2.maxDistance >= 280, 'Sandra stage 2 max distance must be >= 280px');
console.log('  ✓ Sandra 2-stage Melee Combo + Shockwave verified.');

// 4. Distinction
console.log('\n[4/4] Verifying Distinct Attack Primitives...');
assert.notStrictEqual(yu.charConfig.skill.cooldown, shakira.charConfig.skill.cooldown, 'Yu and Shakira cooldowns must differ');
assert.notStrictEqual(yu.charConfig.skill.damage, sandra.charConfig.skill.damage, 'Yu and Sandra damages must differ');
assert.notStrictEqual(shakira.charConfig.skill.range, sandra.charConfig.skill.range, 'Shakira and Sandra ranges must differ');
console.log('  ✓ Distinct attack primitives verified.');

console.log('\n>>> TEST 1 PASS: HERO ATTACK IDENTITY FULLY VALIDATED\n');
