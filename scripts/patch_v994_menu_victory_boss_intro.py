from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if new in text:
        print(f'SKIP {label}: already applied')
        return text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly 1 old block, found {count}')
    print(f'PATCH {label}')
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# main.js
# -----------------------------------------------------------------------------
main_path = 'source/src/main.js'
main = read(main_path)

main = replace_once(
    main,
    "import { introCinematic } from './ui/Intro.js';\n",
    "import { introCinematic } from './ui/Intro.js';\nimport { MENU_KEYART_V994 } from './data/MenuArtV994.js';\n",
    'main menu art import'
)
main = main.replace('const GAME_BUILD_VERSION = "v9.9.3";', 'const GAME_BUILD_VERSION = "v9.9.4";', 1)
main = main.replace(
    "this.state = 'OPENING'; // OPENING, MENU, INTRO, SELECT, PLAYING, PAUSE, VICTORY_RUN, VICTORY, GAMEOVER",
    "this.state = 'OPENING'; // OPENING, MENU, INTRO, SELECT, PLAYING, FINAL_BOSS_INTRO, PAUSE, VICTORY_RUN, VICTORY, GAMEOVER",
    1
)

main = replace_once(
    main,
    "    // v9.9.2: Once the boss encounter starts, the hero may retreat only a short distance.\n    this.bossArenaLocked = false;\n    this.bossRetreatMinX = BOSS_CONFIG.arena.startX - 150;\n",
    "    // v9.9.2: Once the boss encounter starts, the hero may retreat only a short distance.\n    this.bossArenaLocked = false;\n    this.bossRetreatMinX = BOSS_CONFIG.arena.startX - 150;\n\n    // v9.9.4: fixed-camera final battle intro; player input and fight logic pause here.\n    this.finalBossIntroDuration = 3.2;\n    this.finalBossIntroTimer = 0;\n    this.finalBossIntroCameraX = BOSS_CONFIG.arena.startX - 60;\n",
    'boss intro constructor state'
)

main = replace_once(
    main,
    "    // Assets for Menu\n    this.menuKeyart = new Image();\n    this.menuKeyart.src = 'assets/menu_keyart.jpg';\n",
    "    // v9.9.4 generated production menu art: text/UI is baked into the clean key art.\n    this.menuKeyart = new Image();\n    this.menuKeyart.src = MENU_KEYART_V994;\n",
    'generated menu art source'
)

main = replace_once(
    main,
    "    this.bossEntranceDone = false;  // reset boss entrance for new game\n    this.bossArenaLocked = false;\n    this.bossRetreatMinX = BOSS_CONFIG.arena.startX - 150;\n    this.joystickPointerId = null;\n",
    "    this.bossEntranceDone = false;  // reset boss entrance for new game\n    this.bossArenaLocked = false;\n    this.bossRetreatMinX = BOSS_CONFIG.arena.startX - 150;\n    this.finalBossIntroTimer = 0;\n    this.finalBossIntroCameraX = BOSS_CONFIG.arena.startX - 60;\n    if (typeof window !== 'undefined') window.gameCutsceneActive = false;\n    this.joystickPointerId = null;\n",
    'boss intro reset'
)

main = replace_once(
    main,
    "    if (this.state === 'PAUSE') {\n      return;\n    }\n\n    if (this.state === 'PLAYING') {\n",
    "    if (this.state === 'PAUSE') {\n      return;\n    }\n\n    // v9.9.4 FINAL BATTLE intro: fixed camera, no player input, no combat.\n    if (this.state === 'FINAL_BOSS_INTRO') {\n      this.finalBossIntroTimer = Math.max(0, this.finalBossIntroTimer - dt);\n      this.player.vx = 0;\n      this.player.facing = 1;\n      this.player.animState = 'idle';\n      if (typeof this.player.updateAnimation === 'function') this.player.updateAnimation(dt);\n\n      // Keep the arena framing absolutely fixed throughout the title-card animation.\n      this.camera.setTarget(null);\n      this.camera.x = this.finalBossIntroCameraX;\n      this.camera.y = 0;\n      this.camera.shakeIntensity = 0;\n      this.camera.shakeDuration = 0;\n      this.camera.shakeOffsetX = 0;\n      this.camera.shakeOffsetY = 0;\n\n      // Allow only the boss's rise animation; do not let normal attack AI start early.\n      if (!this.boss.entranceDone) this.boss.update(dt, this.player, this.camera);\n      projectiles.update(dt);\n      particles.update(dt);\n      this.pm.update(dt, this.player);\n\n      if (this.finalBossIntroTimer <= 0) {\n        this.state = 'PLAYING';\n        if (typeof window !== 'undefined') window.gameCutsceneActive = false;\n        this.camera.setTarget(this.player);\n        this.milestoneBanner = '⚔️ FINAL BATTLE：夢影巨花王・最終決戰！';\n        this.milestoneBannerTimer = 1.8;\n      }\n      return;\n    }\n\n    if (this.state === 'PLAYING') {\n",
    'fixed camera final boss update state'
)

old_boss_trigger = """      // v9.9.3: once locked, Boss AI remains active across the entire soft-boundary zone.
      // The hero can retreat to bossRetreatMinX, but cannot make the Boss freeze by stepping left of 14700.
      if ((this.bossArenaLocked || this.player.x >= 14700) && !this.boss.isDead) {
        // Show boss entrance banner and shake camera (first time only)
        if (!this.bossEntranceDone && this.player.x >= 14750) {
          this.bossEntranceDone = true;
          this.camera.shake(12, 1.5);
          this.milestoneBanner = '🌹 決戰松德！夢影巨花王現身！';
          this.milestoneBannerTimer = 3.5;
        }
        this.boss.update(dt, this.player, this.camera);
        // v9.5 BGM Rule: Single boss_theme for entire boss battle (P2 layers intensity via setBossIntensity)
        if (audio.currentBgmType !== 'boss_theme') {
          audio.playBgm('boss_theme');
        }
      } else if (!this.bossArenaLocked && this.player.x < 14700) {
"""
new_boss_trigger = """      // v9.9.4: entering the arena launches a fixed-camera FINAL BATTLE title-card.
      // v9.9.3 soft-boundary chase remains unchanged after the cinematic completes.
      if ((this.bossArenaLocked || this.player.x >= 14700) && !this.boss.isDead) {
        if (!this.bossEntranceDone && this.player.x >= 14750) {
          this.bossEntranceDone = true;
          this.state = 'FINAL_BOSS_INTRO';
          this.finalBossIntroTimer = this.finalBossIntroDuration;
          this.finalBossIntroCameraX = BOSS_CONFIG.arena.startX - 60;
          this.player.x = Math.max(this.player.x, BOSS_CONFIG.arena.startX + 120);
          this.player.vx = 0;
          this.camera.setTarget(null);
          this.camera.x = this.finalBossIntroCameraX;
          this.camera.y = 0;
          this.camera.shakeIntensity = 0;
          this.camera.shakeDuration = 0;
          this.camera.shakeOffsetX = 0;
          this.camera.shakeOffsetY = 0;
          if (typeof window !== 'undefined') window.gameCutsceneActive = true;
          if (audio.currentBgmType !== 'boss_theme') audio.playBgm('boss_theme');
          projectiles.clear();
          return;
        }
        this.boss.update(dt, this.player, this.camera);
        // v9.5 BGM Rule: Single boss_theme for entire boss battle (P2 layers intensity via setBossIntensity)
        if (audio.currentBgmType !== 'boss_theme') {
          audio.playBgm('boss_theme');
        }
      } else if (!this.bossArenaLocked && this.player.x < 14700) {
"""
main = replace_once(main, old_boss_trigger, new_boss_trigger, 'boss entrance no-shake cinematic trigger')

main = main.replace(
    "  window.__VISIBLE_HERO_IDS__ = [this.player.id, ...this.companions.map(comp => comp.id)];\n  hud.triggerVictory(this.player);",
    "  // v9.9.4 final result card is selected-hero only; world celebration still keeps all three.\n  window.__VISIBLE_HERO_IDS__ = [this.player.id];\n  hud.triggerVictory(this.player);",
    1
)
main = main.replace(
    "        window.__VISIBLE_HERO_IDS__ = [this.player.id, ...this.companions.map(comp => comp.id)];\n        hud.render(this.ctx, this.player, this.boss, this.level, this.camera);",
    "        window.__VISIBLE_HERO_IDS__ = [this.player.id];\n        hud.render(this.ctx, this.player, this.boss, this.level, this.camera);",
    1
)

main = replace_once(
    main,
    "      // Level Entrance 3.0s Intro Banner\n      if (this.state === 'PLAYING' && this.levelIntroTimer > 0) {\n        this.renderLevelIntroBanner();\n      }\n\n      // 4. Cinematic Victory Run Rendering (companions + speech bubbles)\n",
    "      // Level Entrance 3.0s Intro Banner\n      if (this.state === 'PLAYING' && this.levelIntroTimer > 0) {\n        this.renderLevelIntroBanner();\n      }\n\n      // v9.9.4 fixed-camera FINAL BATTLE title-card. Draw last so touch controls are hidden.\n      if (this.state === 'FINAL_BOSS_INTRO') {\n        this.renderFinalBossIntro();\n      }\n\n      // 4. Cinematic Victory Run Rendering (companions + speech bubbles)\n",
    'boss intro render hook'
)

# Replace the old menu renderer (which duplicated title/button text over the art) with
# a clean baked-art renderer. Click regions stay unchanged in pointer handling.
menu_start = main.index('  renderMenu() {')
menu_end = main.index('  renderSelect() {', menu_start)
new_menu = """  renderMenu() {
    const ctx = this.ctx;
    // v9.9.4: the generated key art already contains the logo and menu typography.
    // Do not redraw duplicate title/button copy over it.
    if (this.menuKeyart.complete && this.menuKeyart.naturalWidth > 0) {
      ctx.drawImage(this.menuKeyart, 0, 0, this.vw, this.vh);
    } else {
      const fallback = ctx.createLinearGradient(0, 0, 0, this.vh);
      fallback.addColorStop(0, '#79C9F7');
      fallback.addColorStop(1, '#102A45');
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, this.vw, this.vh);
    }

    // The generated key art contains an older painted version tag. Cover only that
    // small corner and render the authoritative runtime version without obscuring art.
    ctx.save();
    ctx.fillStyle = 'rgba(7, 18, 30, 0.78)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(this.vw - 76, 8, 64, 25, 8);
      ctx.fill();
    } else {
      ctx.fillRect(this.vw - 76, 8, 64, 25);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 7;
    ctx.fillText((window.__GAME_BUILD__ || GAME_BUILD).version, this.vw - 44, 20.5);
    ctx.restore();
  }

  renderFinalBossIntro() {
    const ctx = this.ctx;
    const elapsed = this.finalBossIntroDuration - this.finalBossIntroTimer;
    const progress = Math.max(0, Math.min(1, elapsed / this.finalBossIntroDuration));
    const appear = Math.min(1, progress / 0.22);
    const exit = progress > 0.82 ? Math.max(0, (1 - progress) / 0.18) : 1;
    const alpha = Math.min(appear, exit);
    const barH = 62;

    ctx.save();
    // Arena remains visible beneath a restrained crimson vignette.
    const vignette = ctx.createRadialGradient(this.vw / 2, this.vh / 2, 90, this.vw / 2, this.vh / 2, 560);
    vignette.addColorStop(0, 'rgba(90, 0, 35, 0.08)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.vw, this.vh);

    // Cinematic letterbox. No camera shake is used anywhere in this entrance.
    ctx.fillStyle = '#02040A';
    ctx.fillRect(0, 0, this.vw, barH);
    ctx.fillRect(0, this.vh - barH, this.vw, barH);

    ctx.globalAlpha = alpha;
    const centerY = this.vh / 2;
    const lineW = 310 * Math.min(1, progress / 0.35);
    ctx.strokeStyle = '#FF2B78';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FF2B78';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(this.vw / 2 - lineW, centerY - 58);
    ctx.lineTo(this.vw / 2 + lineW, centerY - 58);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.vw / 2 - lineW, centerY + 74);
    ctx.lineTo(this.vw / 2 + lineW, centerY + 74);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 17px "Arial Black", sans-serif';
    ctx.letterSpacing = '5px';
    ctx.fillText('FINAL BATTLE', this.vw / 2, centerY - 34);

    ctx.fillStyle = '#FFE6EE';
    ctx.font = '900 43px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.shadowColor = '#FF1744';
    ctx.shadowBlur = 24;
    ctx.fillText('最 終 決 戰', this.vw / 2, centerY + 6);

    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FF80AB';
    ctx.font = 'bold 18px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('夢影巨花王', this.vw / 2, centerY + 43);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.90)';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${this.player.name}  VS  夢影巨花王`, this.vw / 2, this.vh - 29);
    ctx.restore();
  }

"""
main = main[:menu_start] + new_menu + main[menu_end:]

# debugRuntime: distinguish world celebration (3 heroes) from final result card (1 hero)
main = main.replace(
    "victory: { selectedPlayerRenderCount: 1, companionRenderCount: 2, totalHeroRenders: 3, duplicateSelectedPlayer: false }",
    "victory: { worldHeroRenders: 3, resultHeroRenders: 1, resultSelectedOnly: true, duplicateSelectedPlayer: false }",
    1
)

write(main_path, main)

# -----------------------------------------------------------------------------
# HUD.js: selected hero only on final result card
# -----------------------------------------------------------------------------
hud_path = 'source/src/ui/HUD.js'
hud = read(hud_path)
start_marker = '    // Final group pose: approved Yu, Shakira, Sandra chibis exactly once each.'
end_marker = "\n    ctx.fillStyle = '#FFD700';\n    ctx.font = 'bold 24px"
start = hud.index(start_marker)
end = hud.index(end_marker, start)
selected_block = """    // v9.9.4 final result card: ONLY the hero selected for this run.
    const chibiImages = (typeof window !== 'undefined' && window.activeGame) ? window.activeGame.chibiImages : null;
    const selectedId = player.id;
    const selectedColors = { yu: '#4FC3F7', shakira: '#FFD54F', sandra: '#FF7043' };
    const selectedImg = chibiImages && chibiImages[selectedId];
    const selectedColor = selectedColors[selectedId] || player.charConfig.colors.accent || '#FFD700';
    if (typeof window !== 'undefined') window.__VISIBLE_HERO_IDS__ = [selectedId];

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.fillRect(cx - 264, cy - 191, 122, 155);
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = selectedColor;
    ctx.shadowBlur = 12;
    ctx.strokeRect(cx - 264, cy - 191, 122, 155);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('本局通勤英雄', cx - 203, cy - 198);

    if (selectedImg && selectedImg.complete && selectedImg.naturalWidth > 0) {
      ctx.drawImage(selectedImg, cx - 255, cy - 176, 104, 135);
    } else if (player.spriteSheet && player.spriteSheet.complete && player.spriteSheet.naturalWidth > 0) {
      ctx.drawImage(player.spriteSheet, 0, 0, 512, 512, cx - 255, cy - 176, 104, 135);
    } else {
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(cx - 203, cy - 122, 38, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
"""
hud = hud[:start] + selected_block + hud[end:]
write(hud_path, hud)

# -----------------------------------------------------------------------------
# build_single_file.py: add art data modules + version/title
# -----------------------------------------------------------------------------
build_path = 'scripts/build_single_file.py'
build = read(build_path)
build = build.replace('BUILD_VERSION = "v9.9.3"', 'BUILD_VERSION = "v9.9.4"', 1)
build = replace_once(
    build,
    "module_order = [\n    os.path.join(src_dir, 'data', 'Characters.js'),\n    os.path.join(src_dir, 'data', 'Monsters.js'),\n",
    "module_order = [\n    os.path.join(src_dir, 'data', 'MenuArtV994Chunk0.js'),\n    os.path.join(src_dir, 'data', 'MenuArtV994Chunk1.js'),\n    os.path.join(src_dir, 'data', 'MenuArtV994.js'),\n    os.path.join(src_dir, 'data', 'Characters.js'),\n    os.path.join(src_dir, 'data', 'Monsters.js'),\n",
    'bundle generated menu art modules'
)
build = build.replace(
    '({BUILD_VERSION} Arena Chase + Water Shockwave)',
    '({BUILD_VERSION} Final Battle Cinematic + Generated Menu Art)',
    1
)
write(build_path, build)

# -----------------------------------------------------------------------------
# README top release note only
# -----------------------------------------------------------------------------
readme_path = 'README.md'
readme = read(readme_path)
readme = readme.replace(
    '## —— 象山晨衝・奔向松德（v9.9.3 Boss Arena + Neon Hard-Core）——',
    '## —— 象山晨衝・奔向松德（v9.9.4 Final Battle Cinematic）——',
    1
)
readme = readme.replace(
    '> **v9.9.3**：soft-boundary arena mask + persistent Boss chase + organic vine attack + Yu water shockwave VFX。',
    '> **v9.9.4**：全新主選單生成美術正式整合；最終結算只顯示 selected hero；Boss 首次進場取消震動，改為固定鏡頭 FINAL BATTLE 動畫。',
    1
)
readme = readme.replace(
    '> **v9.9.3 開發中：Boss Arena + Neon Hard-Core**',
    '> **v9.9.4 開發中：Generated Menu Art + Final Battle Cinematic**',
    1
)
write(readme_path, readme)

print('V9.9.4 PATCH COMPLETE')
