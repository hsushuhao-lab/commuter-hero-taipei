from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'FAILED {label}: target not found in {path}')
    text = text.replace(old, new, 1)
    p.write_text(text, encoding='utf-8')
    print(f'PASS {label}')


# 1) Runtime version + arena lock state.
replace_once(
    'source/src/main.js',
    'const GAME_BUILD_VERSION = "v9.9.1";',
    'const GAME_BUILD_VERSION = "v9.9.2";',
    'runtime version v9.9.2'
)

replace_once(
    'source/src/main.js',
    "    // v9.4: Boss entrance cinematic tracking\n    this.bossEntranceDone = false;\n",
    "    // v9.4: Boss entrance cinematic tracking\n    this.bossEntranceDone = false;\n    // v9.9.2: Once the boss encounter starts, the hero may retreat only a short distance.\n    this.bossArenaLocked = false;\n    this.bossRetreatMinX = BOSS_CONFIG.arena.startX - 150;\n",
    'boss arena lock state'
)

replace_once(
    'source/src/main.js',
    "    this.bossEntranceDone = false;  // reset boss entrance for new game\n",
    "    this.bossEntranceDone = false;  // reset boss entrance for new game\n    this.bossArenaLocked = false;\n    this.bossRetreatMinX = BOSS_CONFIG.arena.startX - 150;\n",
    'boss arena lock reset'
)

replace_once(
    'source/src/main.js',
    "      // Check Boss Arena trigger (Arena entrance at x >= 14700)\n      if (this.player.x >= 14700 && !this.boss.isDead) {\n",
    "      // v9.9.2 Boss Arena containment: entering the encounter locks the rear boundary.\n      if (!this.boss.isDead && this.player.x >= 14700) this.bossArenaLocked = true;\n      if (this.bossArenaLocked && !this.boss.isDead && this.player.x < this.bossRetreatMinX) {\n        this.player.x = this.bossRetreatMinX;\n        if (this.player.vx < 0) this.player.vx = 0;\n      }\n\n      // Check Boss Arena trigger (Arena entrance at x >= 14700)\n      if (this.player.x >= 14700 && !this.boss.isDead) {\n",
    'boss rear boundary enforcement'
)

replace_once(
    'source/src/main.js',
    "        const damage = boss.phase === 2 ? 28 * (boss.resonanceEnraged ? 1.10 : 1.0) : 18;\n",
    "        const hardCoreBossDamage = this.difficultyMode === 'hardcore' ? 1.10 : 1.0;\n        const damage = (boss.phase === 2 ? 28 * (boss.resonanceEnraged ? 1.10 : 1.0) : 18) * hardCoreBossDamage;\n",
    'hardcore boss contact damage'
)

# 2) Boss projectiles: centralized Hard-Core-only +10% damage, neon aura/trails.
replace_once(
    'source/src/entities/Projectiles.js',
    "    const sourceMonster = p.sourceMonster || source.sourceMonster;\n",
    "    const sourceMonster = p.sourceMonster || source.sourceMonster;\n    const hardCoreBossDamage = (!p.isPlayer && sourceMonster === 'boss_flower' &&\n      typeof window !== 'undefined' && window.__GAME_MODE__ === 'HARDCORE') ? 1.10 : 1.0;\n",
    'hardcore boss projectile multiplier'
)

replace_once(
    'source/src/entities/Projectiles.js',
    "      damage: p.damage || 10,\n",
    "      damage: (p.damage || 10) * hardCoreBossDamage,\n",
    'apply boss projectile damage multiplier'
)

replace_once(
    'source/src/entities/Projectiles.js',
    "      telegraphShown: p.telegraphShown ?? source.telegraphShown ?? false\n",
    "      telegraphShown: p.telegraphShown ?? source.telegraphShown ?? false,\n      bossGlow: !p.isPlayer && sourceMonster === 'boss_flower'\n",
    'boss glow projectile flag'
)

replace_once(
    'source/src/entities/Projectiles.js',
    "      if (p.rotates) p.rotation += p.vRot * dt;\n\n      // Max physical distance culling\n",
    "      if (p.rotates) p.rotation += p.vRot * dt;\n\n      // v9.9.2 Boss attacks leave fluorescent trails without changing collision geometry.\n      if (p.bossGlow && Math.random() < 0.72) {\n        const glowColor = p.attackPhase === 2\n          ? (Math.random() < 0.5 ? '#FF2BD6' : '#7C4DFF')\n          : (Math.random() < 0.5 ? '#00F5D4' : '#FF4FD8');\n        particles.emit({\n          x: p.x - p.vx * 0.018,\n          y: p.y - p.vy * 0.018,\n          vx: -p.vx * 0.035 + (Math.random() - 0.5) * 24,\n          vy: -p.vy * 0.035 + (Math.random() - 0.5) * 24,\n          size: 3 + Math.random() * 5,\n          color: glowColor,\n          life: 0.24 + Math.random() * 0.18,\n          shape: Math.random() < 0.55 ? 'spark' : 'circle',\n          fade: true,\n          visualOnly: true\n        });\n      }\n\n      // Max physical distance culling\n",
    'boss fluorescent projectile trails'
)

replace_once(
    'source/src/entities/Projectiles.js',
    "      ctx.translate(p.x, p.y);\n\n      if (p.type === 'wind_blade') {\n",
    "      ctx.translate(p.x, p.y);\n\n      // v9.9.2 Fluorescent boss-attack aura. Purely visual; hitboxes remain unchanged.\n      if (p.bossGlow) {\n        const aura = p.attackPhase === 2 ? '#FF2BD6' : '#00F5D4';\n        ctx.save();\n        ctx.globalCompositeOperation = 'lighter';\n        ctx.globalAlpha = 0.42;\n        ctx.shadowColor = aura;\n        ctx.shadowBlur = p.attackPhase === 2 ? 28 : 22;\n        ctx.strokeStyle = aura;\n        ctx.lineWidth = 3;\n        ctx.beginPath();\n        ctx.arc(0, 0, Math.max(12, Math.max(p.width, p.height) * 0.72), 0, Math.PI * 2);\n        ctx.stroke();\n        ctx.globalAlpha = 0.18;\n        ctx.beginPath();\n        ctx.arc(0, 0, Math.max(18, Math.max(p.width, p.height) * 1.05), 0, Math.PI * 2);\n        ctx.stroke();\n        ctx.restore();\n        ctx.shadowColor = aura;\n        ctx.shadowBlur = p.attackPhase === 2 ? 24 : 18;\n      }\n\n      if (p.type === 'wind_blade') {\n",
    'boss fluorescent projectile aura'
)

# 3) Boss direct lunge + attack field reach. Keep Chill unchanged.
replace_once(
    'source/src/entities/Boss.js',
    "  takeDamage(amount, attackInstanceId = null) {\n",
    "  getOutgoingDamageMultiplier() {\n    return (typeof window !== 'undefined' && window.__GAME_MODE__ === 'HARDCORE') ? 1.10 : 1.0;\n  }\n\n  takeDamage(amount, attackInstanceId = null) {\n",
    'boss outgoing damage helper'
)

replace_once(
    'source/src/entities/Boss.js',
    "          player.takeDamage(26);\n",
    "          player.takeDamage(26 * this.getOutgoingDamageMultiplier(), {\n            kind: 'boss_lunge', sourceMonster: 'boss_flower', attackPhase: this.phase, telegraphShown: true\n          });\n",
    'hardcore boss lunge damage'
)

# Existing projectile arena bounds were slightly inside the arena entrance; extend them to the locked retreat line.
boss_path = Path('source/src/entities/Boss.js')
boss_text = boss_path.read_text(encoding='utf-8')
boss_text = boss_text.replace('this.config.arena.startX - 50', 'this.config.arena.startX - 200')
boss_text = boss_text.replace('this.config.arena.startX - 60', 'this.config.arena.startX - 200')
boss_path.write_text(boss_text, encoding='utf-8')
print('PASS boss projectile retreat coverage')

# Add an extra neon telegraph layer to all recorded boss patterns.
replace_once(
    'source/src/entities/Boss.js',
    "    if (window.__RUNTIME_QA__) console.info(\"[BOSS PATTERN]\", phase, name);\n  }\n",
    "    if (window.__RUNTIME_QA__) console.info(\"[BOSS PATTERN]\", phase, name);\n    // v9.9.2: every named attack gets a fluorescent pre-flash for readability and spectacle.\n    const neon = this.phase === 2 ? '#FF2BD6' : '#00F5D4';\n    for (let i = 0; i < 10; i++) {\n      const angle = (i / 10) * Math.PI * 2;\n      particles.emit({\n        x: this.x + Math.cos(angle) * 70,\n        y: this.y - 120 + Math.sin(angle) * 50,\n        vx: Math.cos(angle) * 80,\n        vy: Math.sin(angle) * 60,\n        size: 5 + Math.random() * 5,\n        color: neon,\n        life: 0.38,\n        shape: 'spark',\n        fade: true,\n        visualOnly: true\n      });\n    }\n  }\n",
    'boss fluorescent telegraph flash'
)

# 4) Build metadata and README.
replace_once(
    'scripts/build_single_file.py',
    'BUILD_VERSION = "v9.9.1"',
    'BUILD_VERSION = "v9.9.2"',
    'build version v9.9.2'
)
replace_once(
    'scripts/build_single_file.py',
    '({BUILD_VERSION} Dual Mood Balance)',
    '({BUILD_VERSION} Boss Arena + Neon Hard-Core)',
    'build title v9.9.2'
)

replace_once(
    'README.md',
    "## —— 象山晨衝・奔向松德（v9.9.1 Dual Mood Balance）——\n\n一款以台北晨間通勤為舞台的 Q 版 2D 橫向動作遊戲。從象山出發，在 08:00 前突破通勤怪獸與雙階段「夢影巨花王」，選擇速度、火力與技能定位各異的三位英雄，最後衝進松德院區完成三人打卡。\n\n> **v9.9.1 開發中：Dual Mood Balance**\n> HP 調整為 Sandra `120` / Shakira `110` / Yu `100`。Shakira 大招改為由地面湧出、向前推進的 3×7 全波浪蛋捲；Chill Mode 的一般怪物固定維持第一階段，不進入 30 金幣 Predator Mode。Boss 雙階段仍保留。\n",
    "## —— 象山晨衝・奔向松德（v9.9.2 Boss Arena + Neon Hard-Core）——\n\n一款以台北晨間通勤為舞台的 Q 版 2D 橫向動作遊戲。從象山出發，在 08:00 前突破通勤怪獸與雙階段「夢影巨花王」，選擇速度、火力與技能定位各異的三位英雄，最後衝進松德院區完成三人打卡。\n\n> **v9.9.2 開發中：Boss Arena + Neon Hard-Core**\n> 延續 v9.9.1 的 HP、Shakira 全波浪蛋捲與 Chill 怪物第一階段設定。本版新增 Boss Arena 後退邊界：正式進入 Boss 戰後只能在戰區內小幅後退，無法退出戰區遠距離磨 Boss。Hard-Core 的 Boss 對英雄傷害統一小幅提高 10%，Chill 不變；Boss 投射物與招式預警追加螢光光暈、殘影與粒子。\n",
    'README v9.9.2 release note'
)

print('V9.9.2 PATCH COMPLETE')
