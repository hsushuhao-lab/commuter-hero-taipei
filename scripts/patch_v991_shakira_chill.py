from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    print(f"PASS {label}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    print(f"PASS {label}")
    return updated


# -----------------------------------------------------------------------------
# Characters: requested HP ordering + Shakira wave-ultimate metadata
# -----------------------------------------------------------------------------
characters_path = Path("source/src/data/Characters.js")
characters = characters_path.read_text(encoding="utf-8")
characters = replace_once(characters, "      maxHp: 90,\n      speed: 320,", "      maxHp: 110,\n      speed: 320,", "Shakira HP 90 -> 110")
characters = regex_once(
    characters,
    r"    ult: \{\n      name: '元氣蛋浪・Oeuf Mayo 星雨',.*?\n    \}\n  \},\n\n  sandra:",
    """    ult: {
      name: '元氣蛋浪・Oeuf Mayo 全波浪蛋捲',
      key: 'F / K',
      cooldown: 6.0,
      damage: 483,          // 21 顆波浪蛋 x 23 dmg = 483 nominal
      heal: 30,             // 回復 30 HP
      duration: 2.2,
      waveRange: 920,       // 自角色腳下湧出後向面向方向推進
      waveAmplitude: 72,
      waveFrequency: 7.8,
      windupDuration: 0.55,
      cutinDuration: 0.70,
      desc: '由腳下地面湧出 3 波 × 7 顆蛋捲浪，形成上下起伏的全波浪陣向前推進；回復 30 HP 並獲元氣護盾。'
    }
  },

  sandra:""",
    "Shakira ultimate metadata",
    re.S,
)
characters_path.write_text(characters, encoding="utf-8")


# -----------------------------------------------------------------------------
# Player: replace falling egg-rain with forward ground-emergent egg-wave
# -----------------------------------------------------------------------------
player_path = Path("source/src/entities/Player.js")
player = player_path.read_text(encoding="utf-8")
player = replace_once(
    player,
    "    // v9.5: Shakira Fixed Zone Ult\n    this.ultZoneCenterX = 0;",
    "    // v9.9.1: Shakira forward ground-emergent egg-wave ultimate\n    this.shakiraWaveOriginX = 0;",
    "Shakira ultimate state label",
)

ult_start = player.index("unleashUltimate() {")
prefix = player[:ult_start]
suffix = player[ult_start:]
suffix = regex_once(
    suffix,
    r"    else if \(this\.id === 'shakira'\) \{\n      // ═+\n      // 夏奇拉大招：.*?\n    \}\n    else \{\n      // ═+\n      // 珊卓澎 Phase I",
    """    else if (this.id === 'shakira') {
      // ═════════════════════════════════════════════════════════════════════════
      // 夏奇拉大招：由下湧出的全波浪蛋捲，3 waves × 7 eggs，向前推進
      // ═════════════════════════════════════════════════════════════════════════
      this.addHp(this.resonancePhase === 2 ? 45 : 30);
      this.shieldTimer = 3.0;
      const waveRange = this.charConfig.ult.waveRange || 920;
      const baseAmplitude = this.charConfig.ult.waveAmplitude || 72;
      const baseFrequency = this.charConfig.ult.waveFrequency || 7.8;
      const eggDmg = 23;
      const waveSpeeds = [520, 610, 700];
      const releaseOffsets = [0, 0.22, 0.46];
      this.shakiraWaveOriginX = this.x;

      for (let wave = 0; wave < 3; wave++) {
        for (let index = 0; index < 7; index++) {
          const phase = (index / 7) * Math.PI * 2 + wave * 0.58;
          projectiles.spawn({
            isPlayer: true,
            type: 'egg_wave',
            x: this.x - this.facing * (38 + index * 5),
            y: this.y + 58 + (index % 2) * 10,
            vx: this.facing * waveSpeeds[wave],
            vy: 0,
            maxDistance: waveRange,
            width: 34 + wave * 2,
            height: 28 + wave * 2,
            damage: eggDmg,
            monsterDamage: 40,
            splashRadius: 72,
            splashDamage: this.resonancePhase === 2 ? 22 : 18,
            releaseAfter: releaseOffsets[wave] + index * 0.035,
            life: 2.0,
            penetrating: true,
            waveCenterY: this.y - 48 - wave * 5,
            waveStartY: this.y + 58 + (index % 2) * 10,
            waveAmplitude: baseAmplitude - index * 3,
            waveFrequency: baseFrequency + wave * 0.65,
            wavePhase: phase,
            waveRiseDuration: 0.20 + index * 0.018,
            canClearEnemyBullets: true
          });
        }
      }
      window.activeGame?.camera?.shake(8, 0.18);
    }
    else {
      // ═════════════════════════════════════════════════════════════════════════
      // 珊卓澎 Phase I""",
    "Shakira forward egg-wave release",
    re.S,
)
player = prefix + suffix
player_path.write_text(player, encoding="utf-8")


# -----------------------------------------------------------------------------
# Projectile system: deterministic sine-wave Y motion + dedicated egg-wave art
# -----------------------------------------------------------------------------
projectiles_path = Path("source/src/entities/Projectiles.js")
projectiles = projectiles_path.read_text(encoding="utf-8")
projectiles = replace_once(
    projectiles,
    "    projectile.releaseAfter = p.releaseAfter || 0;\n    projectile.hitTargets = new Set();",
    """    projectile.releaseAfter = p.releaseAfter || 0;
    projectile.age = 0;
    projectile.waveCenterY = p.waveCenterY ?? null;
    projectile.waveStartY = p.waveStartY ?? null;
    projectile.waveAmplitude = p.waveAmplitude || 0;
    projectile.waveFrequency = p.waveFrequency || 0;
    projectile.wavePhase = p.wavePhase || 0;
    projectile.waveRiseDuration = p.waveRiseDuration || 0.20;
    projectile.hitTargets = new Set();""",
    "Projectile wave properties",
)
projectiles = replace_once(
    projectiles,
    """      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.wobble) {""",
    """      p.age += dt;
      p.x += p.vx * dt;
      if (p.type === 'egg_wave' && p.waveCenterY !== null) {
        const riseT = Math.min(1, p.age / Math.max(0.01, p.waveRiseDuration));
        const easedRise = 1 - Math.pow(1 - riseT, 3);
        const startY = p.waveStartY ?? p.startY;
        const centerY = startY + (p.waveCenterY - startY) * easedRise;
        p.y = centerY + Math.sin(p.age * p.waveFrequency + p.wavePhase) * p.waveAmplitude * riseT;
      } else {
        p.y += p.vy * dt;
      }
      if (p.wobble) {""",
    "Egg-wave motion",
)
projectiles = replace_once(
    projectiles,
    """      else if (p.type === 'egg') {
        // Golden soft boiled egg bullet""",
    """      else if (p.type === 'egg_wave') {
        // Shakira v9.9.1: forward Oeuf Mayo wave roll with creamy ribbon wake.
        const dir = p.vx >= 0 ? 1 : -1;
        ctx.scale(dir, 1);
        ctx.shadowColor = '#FFD54F';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(255, 236, 179, 0.78)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.width * 2.0, p.height * 0.30);
        ctx.quadraticCurveTo(-p.width * 1.05, -p.height * 1.15, -p.width * 0.20, 0);
        ctx.stroke();
        ctx.strokeStyle = '#FFF8E1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-p.width * 1.8, p.height * 0.20);
        ctx.quadraticCurveTo(-p.width * 0.95, -p.height * 0.85, -p.width * 0.12, 0);
        ctx.stroke();
        ctx.fillStyle = '#FFFDE7';
        ctx.strokeStyle = '#FFE082';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.width, p.height, -0.10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFA000';
        ctx.beginPath();
        ctx.arc(p.width * 0.10, 0, p.width * 0.52, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (p.type === 'egg') {
        // Golden soft boiled egg bullet""",
    "Egg-wave rendering",
)
projectiles_path.write_text(projectiles, encoding="utf-8")


# -----------------------------------------------------------------------------
# Monsters: Chill mode never enters regular-monster Phase II / Predator Mode.
# Hard-Core path remains byte-for-byte equivalent after the mode guard.
# -----------------------------------------------------------------------------
monster_path = Path("source/src/entities/Monster.js")
monster_bytes = monster_path.read_bytes()
monster = monster_bytes.decode("utf-8")
nl = "\r\n" if "\r\n" in monster else "\n"
monster = replace_once(
    monster,
    f"  triggerAttackPhase2() {{{nl}    if (this.attackPhase === 2 || this.isDead) return;",
    f"  triggerAttackPhase2() {{{nl}    if (typeof window !== 'undefined' && window.__GAME_MODE__ === 'CHILL') return;{nl}    if (this.attackPhase === 2 || this.isDead) return;",
    "Chill guard on monster Phase II",
)
monster = replace_once(
    monster,
    f"    // 30 金幣觸發怪獸二階段全體進化 (Predator Mode){nl}    if (player.coins >= 30 && !this.isPhase2) {{{nl}      this.evolveToPhase2();{nl}    }}",
    f"    // 30 金幣：Hard-Core 觸發怪獸二階段；Chill 永遠維持怪物第一階段。{nl}    const chillMode = typeof window !== 'undefined' && window.__GAME_MODE__ === 'CHILL';{nl}    if (!chillMode && player.coins >= 30 && !this.isPhase2) {{{nl}      this.evolveToPhase2();{nl}    }}",
    "Chill disables monster Phase II trigger",
)
monster_path.write_bytes(monster.encode("utf-8"))


# -----------------------------------------------------------------------------
# Main: version, mode-aware milestone, boss single-hit protection for egg-wave
# -----------------------------------------------------------------------------
main_path = Path("source/src/main.js")
main = main_path.read_text(encoding="utf-8")
main = replace_once(main, 'const GAME_BUILD_VERSION = "v9.9.0";', 'const GAME_BUILD_VERSION = "v9.9.1";', "Runtime version v9.9.1")
main = replace_once(main, "    // v9.9.0 Dual Mood mode selection", "    // v9.9.1 Dual Mood mode selection", "Menu version label")
main = replace_once(
    main,
    """        this.milestoneBanner = '⚡ 通勤共振 II：雙方進入高強度戰鬥！';
        this.milestoneBannerTimer = 2.0;""",
    """        this.milestoneBanner = this.difficultyMode === 'chill'
          ? '🌿 Chill 共振 II：英雄升級，沿途怪物維持第一階段！'
          : '⚡ 通勤共振 II：雙方進入高強度戰鬥！';
        this.milestoneBannerTimer = 2.0;""",
    "Mode-aware 30-coin milestone",
)
main = replace_once(
    main,
    """          if ((proj.type === 'flying_pan' || proj.type === 'sandra_orange_drop' || proj.type === 'wind_blade' || proj.type === 'umbrella_wave') && proj.hitTargets.has('boss')) continue;
          if (proj.type === 'flying_pan' || proj.type === 'sandra_orange_drop' || proj.type === 'wind_blade' || proj.type === 'umbrella_wave') proj.hitTargets.add('boss');""",
    """          const singleHitBossTypes = ['flying_pan', 'sandra_orange_drop', 'wind_blade', 'umbrella_wave', 'egg_wave'];
          if (singleHitBossTypes.includes(proj.type) && proj.hitTargets.has('boss')) continue;
          if (singleHitBossTypes.includes(proj.type)) proj.hitTargets.add('boss');""",
    "Egg-wave boss single-hit gate",
)
main_path.write_text(main, encoding="utf-8")


# -----------------------------------------------------------------------------
# Build metadata
# -----------------------------------------------------------------------------
build_path = Path("scripts/build_single_file.py")
build = build_path.read_text(encoding="utf-8")
build = replace_once(build, 'BUILD_VERSION = "v9.9.0"', 'BUILD_VERSION = "v9.9.1"', "Build version v9.9.1")
build = replace_once(build, '({BUILD_VERSION} Dual Mood Preview)', '({BUILD_VERSION} Dual Mood Balance)', "Build title")
build_path.write_text(build, encoding="utf-8")


# -----------------------------------------------------------------------------
# README current-development note
# -----------------------------------------------------------------------------
readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(readme, "v9.9.0 Dual Mood Preview", "v9.9.1 Dual Mood Balance", "README version")
old_note = "> **v9.9.0 開發中：Dual Mood Edition**\n> 主畫面已新增 `☕ Chill Mood` 與 `🔥 Hard-Core` 模式入口。Hard-Core 完整繼承已驗收的 v9.8.5 gameplay；本次先完成模式選單與 runtime mode state，Chill 的實際難度 modifiers 尚未套用。\n"
new_note = "> **v9.9.1 開發中：Dual Mood Balance**\n> HP 調整為 Sandra `120` / Shakira `110` / Yu `100`。Shakira 大招改為由地面湧出、向前推進的 3×7 全波浪蛋捲；Chill Mode 的一般怪物固定維持第一階段，不進入 30 金幣 Predator Mode。Boss 雙階段仍保留。\n"
readme = replace_once(readme, old_note, new_note, "README v9.9.1 note")
readme = replace_once(readme, "- **Shakira 大招**：3 waves × 7 eggs，共 21 顆多層次蛋雨。", "- **Shakira 大招**：3 waves × 7 eggs，共 21 顆由地面湧出並向前推進的全波浪蛋捲。", "README Shakira ult description")
readme_path.write_text(readme, encoding="utf-8")

print("V9.9.1 PATCH COMPLETE")
