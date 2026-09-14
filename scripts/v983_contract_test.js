const assert = require('assert');
const fs = require('fs');

const generator = fs.readFileSync('scripts/generate_hero_spritesheets.py', 'utf8');
const player = fs.readFileSync('source/src/entities/Player.js', 'utf8');
const main = fs.readFileSync('source/src/main.js', 'utf8');
const hud = fs.readFileSync('source/src/ui/HUD.js', 'utf8');
const boss = fs.readFileSync('source/src/entities/Boss.js', 'utf8');
const projectiles = fs.readFileSync('source/src/entities/Projectiles.js', 'utf8');

assert(generator.includes('SHAKIRA_RUN_KEYFRAME_FILES'), 'Shakira must declare dedicated run keyframes');
assert(generator.includes('load_shakira_run_keyframe'), 'Shakira must load dedicated run keyframes');
assert(generator.includes('char_key == "shakira" and anim_name == "run"'), 'Production Shakira run must bypass shared wobble');
assert(main.includes('this._finishVictory()'), 'Victory completion must use a cleanup transition');
assert(main.includes("if (this.state !== 'VICTORY_RUN' || hud.isVictory) return;"), 'Victory banner must be blocked outside VICTORY_RUN');
assert(!hud.includes("ctx.fillText('TAB 設定'"), 'Visible TAB settings HUD label must be removed');
assert(hud.includes("ctx.fillText('⏸ 暫停'"), 'Pause control must remain visible');
assert(player.includes('const bladeDmg = this.resonancePhase === 2 ? 65 : 50;'), 'Yu ultimate must use explicit P1/P2 damage');
assert(player.includes('const targetX = this.getUltimateTargetX();'), 'Shakira ultimate must target an active combat target');
assert(player.includes('const waveOffsets = [-240, -160, -80, 0, 80, 160, 240];'), 'Shakira ultimate must use two deterministic seven-egg waves');
assert(boss.includes('const count = phase2 ? 10 : 6;'), 'Boss bubble density must increase');
assert(boss.includes('const count = phase2 ? 3 : 2;'), 'Boss vine family count must preserve fair cap');
assert(boss.includes('this.patternTimer = this.phase === 2 ? 0.44 : 0.95;'), 'Boss scheduler cadence must be denser');
assert(projectiles.includes('attackPhase === 2 ? 48 : 24'), 'Boss projectile cap must be 24/48');

console.log('PASS: v9.8.3 source contracts are present.');
