const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('Could not find the embedded runtime script');

global.window = { innerWidth: 960, innerHeight: 540, addEventListener: () => {} };
global.document = {
  getElementById: () => ({
    getContext: () => ({
      save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
      fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, arc: () => {}, ellipse: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {}, closePath: () => {},
      drawImage: () => {}, clearRect: () => {}, fillText: () => {}, setLineDash: () => {}, clip: () => {},
      roundRect: () => {}, rect: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }), style: {}, addEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 })
  })
};
global.Image = class { constructor() { this.complete = true; this.naturalWidth = 256; this.naturalHeight = 256; } };
global.navigator = { maxTouchPoints: 0 };
global.requestAnimationFrame = cb => setTimeout(cb, 16);
global.performance = { now: () => Date.now() };

eval(scriptMatch[1]);
const { Player, projectiles } = window.CommuterGame;

const phase1 = new Player('sandra');
projectiles.reset();
phase1.unleashUltimate();
assert.strictEqual(projectiles.projectiles.length, 14, 'Phase 1 Sandra Ult must release 14 projectiles');
assert(projectiles.projectiles.every(p => p.type === 'pan_wave' && p.damage === 30), 'Phase 1 Ult must stay 30 damage pan waves');
assert.strictEqual(projectiles.projectiles.reduce((sum, p) => sum + p.damage, 0), 420, 'Phase 1 nominal damage must be 420');

const phase2 = new Player('sandra');
phase2.addCoins(30);
assert.strictEqual(phase2.resonancePhase, 2);
assert.strictEqual(phase2.charConfig.skill.damage, 56, 'Sandra small skill damage must remain 56');
assert.strictEqual(phase2.charConfig.skill.range, 160, 'Sandra small skill range must remain 160');
assert.strictEqual(phase2.charConfig.skill.cooldown, 0.38, 'Sandra small skill cooldown must remain 0.38');
projectiles.reset();
phase2.unleashUltimate();
assert.strictEqual(projectiles.projectiles.length, 1, 'Phase 2 Ult must stagger rather than release all pans in one frame');
assert.strictEqual(projectiles.projectiles[0].type, 'flying_pan');
assert.strictEqual(projectiles.projectiles[0].damage, 60);
phase2.updateSandraUltRelease(0.06);
assert(projectiles.projectiles.length > 1 && projectiles.projectiles.length < 14, 'Phase 2 pans must release over multiple frames');
for (let i = 0; i < 12; i++) phase2.updateSandraUltRelease(0.06);
assert.strictEqual(projectiles.projectiles.length, 14, 'Phase 2 Ult must release all 14 pans');
assert(projectiles.projectiles.every(p => p.type === 'flying_pan'), 'Phase 2 projectiles must use flying_pan');
assert(projectiles.projectiles.every(p => p.damage === 60), 'Phase 2 each pan must deal 60 damage');
assert(projectiles.projectiles.every(p => p.maxDistance >= 650), 'Phase 2 pans must reach at least 650px');
assert(projectiles.projectiles.every(p => p.rotates === true && p.vRot >= 9), 'Phase 2 pans must rotate');
assert.strictEqual(projectiles.projectiles.reduce((sum, p) => sum + p.damage, 0), 840, 'Phase 2 nominal damage must be 840');

const projectileSource = fs.readFileSync('source/src/entities/Projectiles.js', 'utf8');
assert(projectileSource.includes("p.type === 'flying_pan'"), 'flying_pan renderer branch must exist');
assert(projectileSource.includes('p.type === \'flying_pan\' && Math.random()'), 'flying_pan flame trail branch must exist');
console.log('PASS: Sandra Phase I/II Ultimate damage, staggered flying pans, renderer branch, range, rotation, and unchanged small skill validated.');
