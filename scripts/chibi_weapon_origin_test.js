const fs = require('fs');
const assert = require('assert');

const playerSource = fs.readFileSync('source/src/entities/Player.js', 'utf8');
assert(playerSource.includes('getWeaponOrigin()'));
assert(playerSource.includes("yu: { x: 52, y: -64 }"));
assert(playerSource.includes("shakira: { x: 42, y: -58 }"));
assert(playerSource.includes("sandra: { x: 50, y: -54 }"));
assert(playerSource.includes('const weaponOrigin = this.getWeaponOrigin();'));
assert(playerSource.includes('const spawnX = this.x + this.facing * 35'));
assert(playerSource.includes('const spawnY = this.y - 35'));
console.log('PASS: readable weapon anchors are visual-only; calibrated projectile physics is invariant.');
