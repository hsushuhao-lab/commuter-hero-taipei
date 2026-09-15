from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'FAILED {label}: target not found in {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'PASS {label}')


# Runtime version.
replace_once(
    'source/src/main.js',
    'const GAME_BUILD_VERSION = "v9.9.2";',
    'const GAME_BUILD_VERSION = "v9.9.3";',
    'runtime version v9.9.3'
)

# Boss must remain active while the hero retreats inside the locked soft-boundary zone.
replace_once(
    'source/src/main.js',
    "      // Check Boss Arena trigger (Arena entrance at x >= 14700)\n      if (this.player.x >= 14700 && !this.boss.isDead) {\n",
    "      // v9.9.3: once locked, Boss AI remains active across the entire soft-boundary zone.\n      // The hero can retreat to bossRetreatMinX, but cannot make the Boss freeze by stepping left of 14700.\n      if ((this.bossArenaLocked || this.player.x >= 14700) && !this.boss.isDead) {\n",
    'boss tracks hero through soft boundary'
)
replace_once(
    'source/src/main.js',
    "      } else if (this.player.x < 14700) {\n        // v9.5 BGM Rule: Scenes 1–4 strictly keep commute_theme (no rainy_park or city_pop switch)\n",
    "      } else if (!this.bossArenaLocked && this.player.x < 14700) {\n        // v9.5 BGM Rule: Scenes 1–4 strictly keep commute_theme (no rainy_park or city_pop switch)\n",
    'boss music stays active in soft boundary'
)

# Boss may physically reposition closer to the soft-boundary area while pursuing the hero.
boss_path = Path('source/src/entities/Boss.js')
boss_text = boss_path.read_text(encoding='utf-8')
old_min = 'const minX = this.config.arena.startX + 200;'
count = boss_text.count(old_min)
if count != 2:
    raise SystemExit(f'FAILED boss chase minX: expected 2 matches, got {count}')
boss_text = boss_text.replace(old_min, 'const minX = this.config.arena.startX - 80;')
boss_path.write_text(boss_text, encoding='utf-8')
print('PASS boss chase minX expanded into soft boundary')

# Extend Boss arena atmospheric wash across the 150px soft-boundary retreat strip.
replace_once(
    'source/src/world/Level.js',
    "    // Boss Arena Atmospheric Enhancement (14800 ~ 16500)\n    if (camX + vw >= 14800 && camX <= 16500) {\n      ctx.save();\n      const arenaScreenLeft = Math.max(0, 14800 - camX);\n",
    "    // v9.9.3 Boss Arena Atmospheric Enhancement includes the 150px left soft-boundary strip.\n    if (camX + vw >= 14650 && camX <= 16500) {\n      ctx.save();\n      const arenaScreenLeft = Math.max(0, 14650 - camX);\n",
    'soft boundary arena color coverage'
)
replace_once(
    'source/src/world/Level.js',
    "        ctx.fillStyle = `rgba(233, 30, 99, ${pulse})`;\n        ctx.fillRect(arenaScreenLeft, vh * 0.5, arenaW, vh * 0.5);\n",
    "        ctx.fillStyle = `rgba(233, 30, 99, ${pulse})`;\n        ctx.fillRect(arenaScreenLeft, vh * 0.5, arenaW, vh * 0.5);\n\n        // Soft-boundary mist: same Boss palette, visually communicates that combat pressure continues here.\n        const softLeft = Math.max(0, 14650 - camX);\n        const softRight = Math.min(vw, 14800 - camX);\n        if (softRight > softLeft) {\n          const softGrad = ctx.createLinearGradient(softLeft, 0, softRight, 0);\n          softGrad.addColorStop(0, 'rgba(136, 14, 79, 0.30)');\n          softGrad.addColorStop(0.55, 'rgba(233, 30, 99, 0.18)');\n          softGrad.addColorStop(1, 'rgba(40, 5, 20, 0.18)');\n          ctx.fillStyle = softGrad;\n          ctx.fillRect(softLeft, 0, softRight - softLeft, vh);\n        }\n",
    'soft boundary gradient mask'
)

# Yu ultimate: water-flow shockwave trail.
replace_once(
    'source/src/entities/Projectiles.js',
    "      // Particle trails\n      if (p.isPlayer && p.type === 'wind_blade' && Math.random() < 0.4) {\n",
    "      // Particle trails\n      if (p.isPlayer && p.type === 'umbrella_wave' && Math.random() < 0.82) {\n        const foam = Math.random() < 0.55 ? '#E1F5FE' : '#80DEEA';\n        particles.emit({\n          x: p.x - p.vx * 0.028 + (Math.random() - 0.5) * 22,\n          y: p.y + (Math.random() - 0.5) * Math.max(18, p.height * 0.8),\n          vx: -p.vx * (0.08 + Math.random() * 0.05),\n          vy: -30 - Math.random() * 55,\n          size: 3 + Math.random() * 6,\n          color: foam,\n          life: 0.25 + Math.random() * 0.22,\n          shape: Math.random() < 0.65 ? 'circle' : 'spark',\n          fade: true,\n          visualOnly: true\n        });\n      }\n      if (p.isPlayer && p.type === 'wind_blade' && Math.random() < 0.4) {\n",
    'Yu water shockwave spray trail'
)

replace_once(
    'source/src/entities/Projectiles.js',
    "      else if (p.type === 'umbrella_wave') {\n        const dir = p.vx >= 0 ? 1 : -1;\n        ctx.scale(dir, 1);\n        ctx.fillStyle = 'rgba(79,195,247,0.72)'; ctx.strokeStyle = '#E0F7FA'; ctx.lineWidth = 4;\n        ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 16;\n        ctx.beginPath(); ctx.arc(0, 0, p.width, -0.7, 0.7); ctx.lineTo(-p.width * 0.55, 0); ctx.closePath(); ctx.fill(); ctx.stroke();\n        ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(-12, 0, p.width * 0.72, -0.55, 0.55); ctx.stroke();\n        ctx.beginPath(); ctx.arc(-24, 0, p.width * 0.5, -0.4, 0.4); ctx.stroke();\n      }\n",
    "      else if (p.type === 'umbrella_wave') {\n        // v9.9.3 Yu ultimate: layered water-flow impact wave, not a rigid crescent blade.\n        const dir = p.vx >= 0 ? 1 : -1;\n        ctx.scale(dir, 1);\n        ctx.save();\n        ctx.globalCompositeOperation = 'lighter';\n        ctx.shadowColor = '#00E5FF';\n        ctx.shadowBlur = 22;\n\n        // Main surge body: curling water crest with a broad impact front.\n        const waterGrad = ctx.createLinearGradient(-p.width * 1.25, 0, p.width * 0.9, 0);\n        waterGrad.addColorStop(0, 'rgba(3,169,244,0.16)');\n        waterGrad.addColorStop(0.50, 'rgba(41,182,246,0.58)');\n        waterGrad.addColorStop(1, 'rgba(128,222,234,0.92)');\n        ctx.fillStyle = waterGrad;\n        ctx.beginPath();\n        ctx.moveTo(-p.width * 1.20, p.height * 0.48);\n        ctx.bezierCurveTo(-p.width * 0.70, p.height * 0.95, p.width * 0.05, p.height * 0.70, p.width * 0.72, p.height * 0.18);\n        ctx.bezierCurveTo(p.width * 0.98, -p.height * 0.08, p.width * 0.72, -p.height * 0.92, p.width * 0.28, -p.height * 0.72);\n        ctx.bezierCurveTo(-p.width * 0.08, -p.height * 0.56, -p.width * 0.18, -p.height * 0.12, -p.width * 0.50, p.height * 0.08);\n        ctx.bezierCurveTo(-p.width * 0.78, p.height * 0.28, -p.width * 0.96, p.height * 0.30, -p.width * 1.20, p.height * 0.48);\n        ctx.closePath();\n        ctx.fill();\n\n        // White foam crest and inner stream lines give the attack a fluid direction.\n        ctx.strokeStyle = 'rgba(240,253,255,0.96)';\n        ctx.lineWidth = 5;\n        ctx.lineCap = 'round';\n        ctx.beginPath();\n        ctx.moveTo(-p.width * 0.55, -p.height * 0.05);\n        ctx.bezierCurveTo(-p.width * 0.12, -p.height * 0.62, p.width * 0.44, -p.height * 0.80, p.width * 0.76, -p.height * 0.24);\n        ctx.stroke();\n        ctx.globalAlpha = 0.72;\n        ctx.strokeStyle = '#B3E5FC';\n        ctx.lineWidth = 3;\n        for (let lane = 0; lane < 3; lane++) {\n          const y = (lane - 1) * p.height * 0.25;\n          ctx.beginPath();\n          ctx.moveTo(-p.width * (1.10 - lane * 0.08), y + p.height * 0.22);\n          ctx.bezierCurveTo(-p.width * 0.45, y - p.height * 0.22, p.width * 0.12, y + p.height * 0.16, p.width * 0.62, y - p.height * 0.10);\n          ctx.stroke();\n        }\n        ctx.restore();\n\n        // Spray droplets at the leading edge.\n        ctx.fillStyle = '#E1F5FE';\n        for (let d = 0; d < 4; d++) {\n          const dx = p.width * (0.55 + d * 0.10);\n          const dy = -p.height * (0.20 + (d % 2) * 0.28);\n          ctx.beginPath();\n          ctx.arc(dx, dy, 2.5 + d * 0.7, 0, Math.PI * 2);\n          ctx.fill();\n        }\n      }\n",
    'Yu water shockwave render'
)

# Replace the ugly green triangle with an organic vine/thorn strike.
replace_once(
    'source/src/entities/Projectiles.js',
    "      else if (p.type === 'vine') {\n        // Vine thorn thrust\n        ctx.fillStyle = '#2E7D32';\n        ctx.strokeStyle = '#1B5E20';\n        ctx.lineWidth = 2;\n        ctx.beginPath();\n        ctx.moveTo(0, -p.height);\n        ctx.lineTo(p.width * 0.5, 0);\n        ctx.lineTo(-p.width * 0.5, 0);\n        ctx.closePath();\n        ctx.fill();\n        ctx.stroke();\n      }\n",
    "      else if (p.type === 'vine') {\n        // v9.9.3 Organic thorn-vine strike: curved stalk + barbs + luminous tip.\n        const h = Math.max(34, p.height);\n        const w = Math.max(16, p.width);\n        ctx.save();\n        ctx.shadowColor = p.bossGlow ? (p.attackPhase === 2 ? '#FF2BD6' : '#00F5D4') : '#66BB6A';\n        ctx.shadowBlur = p.bossGlow ? 20 : 10;\n        ctx.lineCap = 'round';\n\n        // Main curved stalk.\n        ctx.strokeStyle = p.attackPhase === 2 ? '#6A1B9A' : '#2E7D32';\n        ctx.lineWidth = Math.max(7, w * 0.24);\n        ctx.beginPath();\n        ctx.moveTo(-w * 0.08, h * 0.44);\n        ctx.bezierCurveTo(-w * 0.26, h * 0.18, w * 0.24, -h * 0.18, 0, -h * 0.48);\n        ctx.stroke();\n\n        // Bright inner sap line.\n        ctx.strokeStyle = p.attackPhase === 2 ? '#EA80FC' : '#9CCC65';\n        ctx.lineWidth = Math.max(2, w * 0.07);\n        ctx.beginPath();\n        ctx.moveTo(-w * 0.06, h * 0.42);\n        ctx.bezierCurveTo(-w * 0.20, h * 0.17, w * 0.18, -h * 0.17, 0, -h * 0.46);\n        ctx.stroke();\n\n        // Alternating natural barbs instead of a flat triangle silhouette.\n        for (let b = 0; b < 4; b++) {\n          const by = h * 0.24 - b * h * 0.17;\n          const side = b % 2 === 0 ? -1 : 1;\n          ctx.strokeStyle = p.attackPhase === 2 ? '#CE93D8' : '#81C784';\n          ctx.lineWidth = 3;\n          ctx.beginPath();\n          ctx.moveTo(side * w * 0.02, by);\n          ctx.quadraticCurveTo(side * w * 0.26, by - h * 0.03, side * w * 0.36, by - h * 0.12);\n          ctx.stroke();\n        }\n\n        // Tapered luminous thorn tip.\n        ctx.fillStyle = p.attackPhase === 2 ? '#F3E5F5' : '#E8F5E9';\n        ctx.beginPath();\n        ctx.moveTo(0, -h * 0.66);\n        ctx.quadraticCurveTo(w * 0.14, -h * 0.49, 0, -h * 0.42);\n        ctx.quadraticCurveTo(-w * 0.14, -h * 0.49, 0, -h * 0.66);\n        ctx.fill();\n        ctx.restore();\n      }\n",
    'organic vine attack render'
)

# Build metadata.
replace_once(
    'scripts/build_single_file.py',
    'BUILD_VERSION = "v9.9.2"',
    'BUILD_VERSION = "v9.9.3"',
    'build version v9.9.3'
)
replace_once(
    'scripts/build_single_file.py',
    'Boss Arena + Neon Hard-Core',
    'Arena Chase + Water Shockwave',
    'build title v9.9.3'
)

# README summary.
readme = Path('README.md')
rt = readme.read_text(encoding='utf-8')
rt = rt.replace('v9.9.2', 'v9.9.3', 2)
insert_after = '> **v9.9.3 開發中：Dual Mood Edition**\n'
if insert_after in rt:
    rt = rt.replace(
        insert_after,
        insert_after + '> 本版將 Boss arena 的左側軟邊界納入相同色調遮罩；Boss AI 在英雄退入軟邊界時仍持續追擊。Boss 綠色三角藤刺改為有機藤蔓／荊棘造型；Yu 大招保留原判定與傷害，但視覺改為多層水流衝擊波與泡沫水花。\n',
        1
    )
else:
    rt = rt.replace('\n一款以台北晨間通勤為舞台', '\n\n> **v9.9.3**：soft-boundary arena mask + persistent Boss chase + organic vine attack + Yu water shockwave VFX。\n\n一款以台北晨間通勤為舞台', 1)
readme.write_text(rt, encoding='utf-8')
print('PASS README v9.9.3')

print('V9.9.3 PATCH COMPLETE')