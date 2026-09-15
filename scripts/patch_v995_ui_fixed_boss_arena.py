from pathlib import Path
import re


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'FAILED {label}: target not found in {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'PASS {label}')


def regex_replace_once(path, pattern, repl, label, flags=re.S):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    new, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f'FAILED {label}: matches={n} in {path}')
    p.write_text(new, encoding='utf-8')
    print(f'PASS {label}')

# ------------------------------------------------------------------
# 1) main.js — restore reliable menu art + fixed Boss battle camera.
# ------------------------------------------------------------------
replace_once('source/src/main.js', 'const GAME_BUILD_VERSION = "v9.9.4";', 'const GAME_BUILD_VERSION = "v9.9.5";', 'runtime version v9.9.5')
replace_once('source/src/main.js', "    this.menuKeyart.src = 'assets/menu_keyart_v994.jpg';", "    this.menuKeyart.src = 'assets/menu_keyart.jpg';", 'restore stable menu keyart')

replace_once(
    'source/src/main.js',
    "    this.finalBossIntroCameraX = 14800;\n\n    // Joystick touch tracking",
    "    this.finalBossIntroCameraX = 14800;\n\n    // v9.9.5: after the intro, the entire Boss fight uses one fixed arena shot.\n    this.bossBattleCameraX = 14800;\n    this.bossBattleZoom = 0.82;\n    this.bossBattleMinX = 14720;\n    this.bossBattleMaxX = 15810;\n\n    // Joystick touch tracking",
    'boss fixed camera config'
)

# Ensure a new run always starts from normal tracking/zoom.
replace_once(
    'source/src/main.js',
    "    this.camera.setTarget(this.player);\n    this.boss = new Boss();",
    "    this.camera.setTarget(this.player);\n    this.camera.setZoom(1.0);\n    this.camera.shakeIntensity = 0;\n    this.camera.shakeDuration = 0;\n    this.camera.shakeOffsetX = 0;\n    this.camera.shakeOffsetY = 0;\n    this.boss = new Boss();",
    'reset camera on new game'
)

# Keep the fixed camera locked after Boss AI updates, cancelling any Boss-induced shake.
replace_once(
    'source/src/main.js',
    "        this.boss.update(dt, this.player, this.camera);\n        // v9.5 BGM Rule: Single boss_theme for entire boss battle (P2 layers intensity via setBossIntensity)",
    "        this.boss.update(dt, this.player, this.camera);\n        if (this.finalBossIntroDone) this.lockBossBattleCamera();\n        // v9.5 BGM Rule: Single boss_theme for entire boss battle (P2 layers intensity via setBossIntensity)",
    'lock camera after boss update'
)

# Restore follow camera exactly when the Boss dies and Victory Run begins.
replace_once(
    'source/src/main.js',
    "      if (this.boss.isDead && !this.player.isDead) {\n        this.state = 'VICTORY_RUN';",
    "      if (this.boss.isDead && !this.player.isDead) {\n        this.camera.setTarget(this.player);\n        this.camera.setZoom(1.0);\n        this.camera.shakeIntensity = 0;\n        this.camera.shakeDuration = 0;\n        this.camera.shakeOffsetX = 0;\n        this.camera.shakeOffsetY = 0;\n        this.state = 'VICTORY_RUN';",
    'restore follow camera for victory run'
)

# Final Battle intro hands off into the fixed Boss shot rather than camera follow.
replace_once(
    'source/src/main.js',
    "      this.state = 'PLAYING';\n      if (typeof window !== 'undefined') window.gameCutsceneActive = false;\n      this.milestoneBanner = '⚔️ FINAL BATTLE：夢影巨花王・決戰開始！';",
    "      this.state = 'PLAYING';\n      this.camera.setTarget(null);\n      this.camera.setZoom(this.bossBattleZoom);\n      this.lockBossBattleCamera();\n      if (typeof window !== 'undefined') window.gameCutsceneActive = false;\n      this.milestoneBanner = '⚔️ FINAL BATTLE：夢影巨花王・決戰開始！';",
    'handoff intro to fixed boss camera'
)

# Insert reusable fixed-arena lock before the intro lifecycle.
lock_method = r'''  lockBossBattleCamera() {
    if (!this.bossArenaLocked || this.boss.isDead) return;

    // One fixed shot for the whole fight: no horizontal/vertical follow and no shake drift.
    this.camera.setTarget(null);
    this.camera.setZoom(this.bossBattleZoom);
    this.camera.x = this.bossBattleCameraX;
    this.camera.y = 0;
    this.camera.shakeIntensity = 0;
    this.camera.shakeDuration = 0;
    this.camera.shakeOffsetX = 0;
    this.camera.shakeOffsetY = 0;

    // Keep both combatants inside the visible fixed frame.
    if (this.player.x < this.bossBattleMinX) {
      this.player.x = this.bossBattleMinX;
      if (this.player.vx < 0) this.player.vx = 0;
    }
    if (this.player.x > this.bossBattleMaxX) {
      this.player.x = this.bossBattleMaxX;
      if (this.player.vx > 0) this.player.vx = 0;
    }
    const bossMinX = this.bossBattleCameraX + 170;
    const bossMaxX = this.bossBattleCameraX + 820;
    this.boss.x = Math.max(bossMinX, Math.min(bossMaxX, this.boss.x));
  }

'''
replace_once('source/src/main.js', '  beginFinalBossIntro() {', lock_method + '  beginFinalBossIntro() {', 'insert boss battle fixed-camera lock')

# Replace the damaged baked-art-only menu with the stable keyart + clean glass UI.
new_menu = r'''  renderMenu() {
    const ctx = this.ctx;

    // v9.9.5: use the known-good production keyart. The v9.9.4 generated JPEG was truncated in packaging.
    if (this.menuKeyart.complete && this.menuKeyart.naturalWidth > 0) {
      ctx.drawImage(this.menuKeyart, 0, 0, this.vw, this.vh);
    } else {
      const fallback = ctx.createLinearGradient(0, 0, 0, this.vh);
      fallback.addColorStop(0, '#6FB9EA');
      fallback.addColorStop(1, '#123B78');
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, this.vw, this.vh);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px "PingFang SC", sans-serif';
      ctx.fillText('08點上班大作戰・通勤英雄篇', this.vw / 2, 105);
    }

    ctx.save();
    // Preserve the original illustrated logo area; clean only the menu zone below it.
    const menuGrad = ctx.createLinearGradient(0, 250, 0, this.vh);
    menuGrad.addColorStop(0, 'rgba(5, 18, 35, 0.18)');
    menuGrad.addColorStop(0.24, 'rgba(5, 18, 35, 0.72)');
    menuGrad.addColorStop(1, 'rgba(5, 12, 28, 0.93)');
    ctx.fillStyle = menuGrad;
    ctx.fillRect(0, 250, this.vw, this.vh - 250);

    // Compact heading — no duplicate game title over the baked logo.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 14px "Arial Black", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 8;
    ctx.fillText('SELECT COMMUTE MOOD', this.vw / 2, 310);
    ctx.shadowBlur = 0;

    const chillSelected = this.difficultyMode === 'chill';
    const hardSelected = this.difficultyMode === 'hardcore';

    // Chill Mood button
    ctx.fillStyle = chillSelected ? 'rgba(28, 210, 194, 0.96)' : 'rgba(20, 165, 158, 0.88)';
    ctx.fillRect(225, 330, 253, 64);
    ctx.strokeStyle = chillSelected ? '#B9FFF8' : 'rgba(220,255,252,0.75)';
    ctx.lineWidth = chillSelected ? 4 : 2;
    ctx.strokeRect(225, 330, 253, 64);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 19px "Arial Black", sans-serif';
    ctx.fillText('☕  Chill Mood', 351.5, 352);
    ctx.font = 'bold 11px "PingFang SC", sans-serif';
    ctx.fillStyle = '#E7FFFC';
    ctx.fillText('簡單・悠閒通勤', 351.5, 376);

    // Hard-Core button
    ctx.fillStyle = hardSelected ? 'rgba(244, 67, 54, 0.97)' : 'rgba(198, 40, 40, 0.88)';
    ctx.fillRect(482, 330, 253, 64);
    ctx.strokeStyle = hardSelected ? '#FFE082' : 'rgba(255,235,238,0.75)';
    ctx.lineWidth = hardSelected ? 4 : 2;
    ctx.strokeRect(482, 330, 253, 64);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 19px "Arial Black", sans-serif';
    ctx.fillText('🔥  Hard-Core', 608.5, 352);
    ctx.font = 'bold 11px "PingFang SC", sans-serif';
    ctx.fillStyle = '#FFEBEE';
    ctx.fillText('困難・原味挑戰', 608.5, 376);

    // Opening / cast introduction
    ctx.fillStyle = 'rgba(233, 30, 99, 0.90)';
    ctx.fillRect(330, 410, 300, 46);
    ctx.strokeStyle = '#FF80AB';
    ctx.lineWidth = 2;
    ctx.strokeRect(330, 410, 300, 46);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px "PingFang SC", sans-serif';
    ctx.fillText('🎬  劇情序幕（人物與怪獸介紹）', this.vw / 2, 433);

    // Utility buttons
    ctx.fillStyle = 'rgba(255,255,255,0.11)';
    ctx.fillRect(330, 466, 148, 40);
    ctx.fillRect(484, 466, 148, 40);
    ctx.strokeStyle = 'rgba(255,255,255,0.60)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(330, 466, 148, 40);
    ctx.strokeRect(484, 466, 148, 40);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px "PingFang SC", sans-serif';
    ctx.fillText('遊戲說明 [H]', 404, 486);
    ctx.fillText('設定集 [TAB]', 558, 486);

    // Live build badge
    ctx.fillStyle = 'rgba(8, 32, 60, 0.82)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(this.vw - 78, 7, 68, 23, 7);
      ctx.fill();
    } else {
      ctx.fillRect(this.vw - 78, 7, 68, 23);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText((window.__GAME_BUILD__ || GAME_BUILD).version, this.vw - 44, 18.5);
    ctx.restore();
  }

'''
regex_replace_once('source/src/main.js', r"  renderMenu\(\) \{.*?\n  renderSelect\(\) \{", new_menu + '  renderSelect() {', 'rebuild stable main menu')

# ------------------------------------------------------------------
# 2) HUD — clean four-column top layout and correct Phase-2 HP label.
# ------------------------------------------------------------------
new_topbar = r'''  renderTopBar(ctx, player, level, vw) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const barX = 16;
    const barY = 10;
    const barH = 72;
    ctx.fillStyle = 'rgba(12, 20, 34, 0.90)';
    ctx.fillRect(barX, barY, vw - 32, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, vw - 32, barH);

    // Column separators keep long Chinese labels from visually colliding.
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    [238, 450, 640, 842].forEach(x => {
      ctx.beginPath();
      ctx.moveTo(x, barY + 8);
      ctx.lineTo(x, barY + barH - 8);
      ctx.stroke();
    });

    // Hero block
    const avatarX = 26;
    const avatarY = 20;
    ctx.fillStyle = player.charConfig.colors.primary;
    ctx.fillRect(avatarX, avatarY, 48, 48);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(avatarX, avatarY, 48, 48);
    if (player.spriteSheet && player.spriteSheet.complete) {
      ctx.drawImage(player.spriteSheet, 0, 0, 512, 512, avatarX, avatarY, 48, 48);
    }

    const heroX = 84;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(player.name, heroX, 29);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '9.5px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(player.charConfig.title, heroX, 43, 142);

    const hpY = 51;
    const hpW = 142;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(heroX, hpY, hpW, 11);
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    ctx.fillStyle = hpRatio > 0.3 ? '#00E676' : '#FF1744';
    ctx.fillRect(heroX, hpY, hpW * hpRatio, 11);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, heroX + hpW / 2, 60);

    // Coins / resonance block
    ctx.textAlign = 'left';
    const coinX = 252;
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 14px "PingFang SC", sans-serif';
    ctx.fillText(`🪙 金幣 ${player.coins}`, coinX, 31);
    let resonance = '15 幣解鎖大招';
    if (player.coins >= 60) resonance = '魔王狂暴共振';
    else if (player.coins >= 30) resonance = '共振 II 已啟動';
    else if (player.coins >= 15) resonance = '大招已解鎖';
    ctx.fillStyle = '#81D4FA';
    ctx.font = '10px "PingFang SC", sans-serif';
    ctx.fillText(`共振｜${resonance}`, coinX, 48, 184);

    const status = [];
    if (player.invulnerableTimer > 0) status.push(`防護 ${player.invulnerableTimer.toFixed(1)}s`);
    if (player.dashCooldown <= 0) status.push('衝刺 READY');
    if (player.isUlting && player.ultPhase === 'WINDUP') status.push('ULT WIND-UP');
    ctx.fillStyle = status.length ? '#69F0AE' : 'rgba(255,255,255,0.48)';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(status.length ? status.join(' ・ ') : '狀態｜NORMAL', coinX, 65, 184);

    // Clock block
    const clockX = 464;
    const timeFormatted = Math.ceil(this.timeRemaining);
    const clockStr = this.getFormattedClockTime();
    ctx.fillStyle = this.timeRemaining < 25 ? '#FF5252' : '#FFFFFF';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(`⏱ ${clockStr}`, clockX, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '10px "PingFang SC", sans-serif';
    ctx.fillText(`打卡倒數 ${timeFormatted} 秒`, clockX, 52);

    // Stage block
    const curStage = level.getCurrentStage(player.x);
    const stageX = 654;
    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 11px "PingFang SC", sans-serif';
    ctx.fillText(curStage.name, stageX, 30, 178);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '9px "PingFang SC", sans-serif';
    ctx.fillText(curStage.subtitle || '', stageX, 45, 178);
    const progressRatio = Math.min(1.0, player.x / level.totalLength);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(stageX, 54, 150, 8);
    ctx.fillStyle = '#4FC3F7';
    ctx.fillRect(stageX, 54, 150 * progressRatio, 8);

    ctx.restore();
  }

'''
regex_replace_once('source/src/ui/HUD.js', r"  renderTopBar\(ctx, player, level, vw\) \{.*?\n  renderBossBar\(ctx, boss, vw\) \{", new_topbar + '  renderBossBar(ctx, boss, vw) {', 'reflow top HUD')
replace_once('source/src/ui/HUD.js', 'const barY = 82;', 'const barY = 94;', 'move boss bar below taller HUD')
replace_once('source/src/ui/HUD.js', '(HP 5200)', '(HP 3050)', 'correct boss phase2 HUD label')
replace_once('source/src/ui/HUD.js', 'const maxHp = boss.phase === 2 ? 5200 : 3600;', 'const maxHp = boss.phase === 2 ? 3050 : 3600;', 'correct boss phase2 HUD fallback')

# ------------------------------------------------------------------
# 3) Level — add a visible staircase cluster inside fixed Boss arena.
# ------------------------------------------------------------------
replace_once(
    'source/src/world/Level.js',
    "    // Scene 5 Boss Arena: 14800 ~ 16550 (100% flat continuous arena floor, 0 gaps)\n    this.pm.addPlatform(14800, groundY, 1750, 60, 'stone');",
    "    // Scene 5 Boss Arena: 14800 ~ 16550 (continuous safe floor).\n    this.pm.addPlatform(14800, groundY, 1750, 60, 'stone');\n\n    // v9.9.5 Fixed-camera battle stairs: four ascending jump steps on the hero side.\n    // They create vertical dodging choices without introducing pits or blocking the Boss half.\n    this.pm.addPlatform(14900, 510, 120, 24, 'brick');\n    this.pm.addPlatform(15020, 470, 120, 24, 'brick');\n    this.pm.addPlatform(15140, 430, 120, 24, 'brick');\n    this.pm.addPlatform(15260, 390, 160, 24, 'brick');",
    'add boss arena jump stairs'
)

# Fix stale Boss phase-2 floating text while here; gameplay HP already remains config-driven 3050.
replace_once('source/src/entities/Boss.js', "this.hp = this.config.phase2Hp || 5200;", "this.hp = this.config.phase2Hp || 3050;", 'boss phase2 hp fallback')
replace_once('source/src/entities/Boss.js', "this.maxHp = this.config.phase2Hp || 5200;", "this.maxHp = this.config.phase2Hp || 3050;", 'boss phase2 max hp fallback')
replace_once('source/src/entities/Boss.js', "'⚡ 狂暴盛開態！HP 5200'", "'⚡ 狂暴盛開態！HP 3050'", 'boss phase2 floating label')

# ------------------------------------------------------------------
# 4) Build + README metadata. Remove the broken v9.9.4 generated JPEG.
# ------------------------------------------------------------------
replace_once('scripts/build_single_file.py', 'BUILD_VERSION = "v9.9.4"', 'BUILD_VERSION = "v9.9.5"', 'build version v9.9.5')
regex_replace_once(
    'scripts/build_single_file.py',
    r"<title>《08點上班大作戰：通勤英雄篇》象山捷運站 → 松德院區 \(\{BUILD_VERSION\}.*?\)</title>",
    '<title>《08點上班大作戰：通勤英雄篇》象山捷運站 → 松德院區 ({BUILD_VERSION} UI Repair + Fixed Boss Arena)</title>',
    'build page title v9.9.5'
)

readme = Path('README.md')
rt = readme.read_text(encoding='utf-8')
rt = rt.replace('v9.9.4', 'v9.9.5', 2)
notice = ("\n> **v9.9.5 UI Repair + Fixed Boss Arena**\n"
          "> 修復 v9.9.4 主畫面 keyart 封裝損毀：回復已驗證 production keyart，重新以玻璃式 UI 排版模式選擇按鈕；HUD 左上角改為四欄式不重疊資訊。Final Battle Intro 後整場 Boss 戰使用固定鏡頭、不跟隨英雄、不震動，並在英雄側新增四階跳躍樓梯；Boss 擊破後才恢復跟隨鏡頭進入三人 Victory Run。\n")
if 'v9.9.5 UI Repair + Fixed Boss Arena' not in rt:
    rt = rt.replace('\n> **🌐 正式公開站**', notice + '\n> **🌐 正式公開站**', 1)
readme.write_text(rt, encoding='utf-8')
print('PASS README v9.9.5')

bad_art = Path('assets/menu_keyart_v994.jpg')
if bad_art.exists():
    bad_art.unlink()
    print('PASS removed broken v9.9.4 menu jpeg')

print('V9.9.5 PATCH COMPLETE')
