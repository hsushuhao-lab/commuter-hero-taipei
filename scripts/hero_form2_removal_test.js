const fs = require('fs');
const assert = require('assert');

const runtimeSourceFiles = [
  'source/src/data/Characters.js',
  'source/src/entities/Player.js',
  'source/src/ui/HUD.js',
  'source/src/ui/StyleBible.js'
];

const forbiddenRuntimeMarkers = [
  { label: 'Form 2 state', pattern: /form2/i },
  { label: 'Form 2 label', pattern: /form\s*2/i },
  { label: 'second-form label', pattern: /第二型態/ },
  { label: 'hero awakening label', pattern: /英雄覺醒II/ },
  { label: '45-coin awakening', pattern: /45\s*(?:枚|\/\s*60|金幣|coins?)/i }
];

for (const file of runtimeSourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const marker of forbiddenRuntimeMarkers) {
    assert(!marker.pattern.test(content), `${file} still contains ${marker.label}`);
  }
}

for (const file of ['index.html', 'dist/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(scriptMatch, `${file} must contain the embedded runtime script`);
  // Legacy art files may remain in the asset dictionary as non-runtime source material.
  const runtimeCode = scriptMatch[1].replace(/const ASSETS = \{[\s\S]*?\};/, '');
  for (const marker of forbiddenRuntimeMarkers) {
    assert(!marker.pattern.test(runtimeCode), `${file} runtime code still contains ${marker.label}`);
  }
}

const hud = fs.readFileSync('source/src/ui/HUD.js', 'utf8');
assert(hud.includes('player.coins >= 30'), 'HUD must retain the Phase 2 coin milestone');
assert(hud.includes('player.coins >= 60'), 'HUD must retain the Boss-rage coin milestone');

console.log('PASS: no active hero Form 2 state, label, or 45-coin awakening marker remains in runtime source or bundled runtime code.');
