const fs = require('fs');
const assert = require('assert');

const characters = fs.readFileSync('source/src/data/Characters.js', 'utf8');
const boss = fs.readFileSync('source/src/data/Monsters.js', 'utf8');
const player = fs.readFileSync('source/src/entities/Player.js', 'utf8');
const projectiles = fs.readFileSync('source/src/entities/Projectiles.js', 'utf8');
const bossSource = fs.readFileSync('source/src/entities/Boss.js', 'utf8');
const collision = fs.readFileSync('source/src/main.js', 'utf8');

assert(characters.includes('phase2ProjectileDamage: 40'));
assert(player.includes("type: 'sandra_orange_drop'"));
assert(player.includes("maxDistance: 550"));
assert(player.includes('damage: cfg.phase2ProjectileDamage || 40'));
assert(projectiles.includes('projectile.hitTargets = new Set()'));
assert(collision.includes("proj.hitTargets.has('boss')"));
assert(collision.includes("now + 1200"));
assert(boss.includes('petalCount: 11') && boss.includes('petalCount: 18'));
assert(boss.includes('petalSpeed: 345') && boss.includes('petalSpeed: 405'));
assert(bossSource.includes('launchDreamBubbles') && bossSource.includes('queueVineWhip'));
assert(bossSource.includes('fireCrossfire') && bossSource.includes('triggerBloomBurst'));
assert(bossSource.includes('burstTimer: phase2 && i < 2 ? 1.4 : null'));
assert(projectiles.includes('attackType: "bubble_burst"'));
assert(bossSource.includes('tg.type === "vine_whip"') && bossSource.includes('tg.type === "crossfire"'));
assert(bossSource.includes('tg.type === "bloom_burst"'));
console.log('PASS: v9.8.1 combat balance and Boss pattern contract.');
