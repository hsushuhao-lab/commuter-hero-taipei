from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one match, found {count}: {old!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


root = Path(__file__).resolve().parents[1]
characters = root / 'source/src/data/Characters.js'
player = root / 'source/src/entities/Player.js'
main = root / 'source/src/main.js'
build = root / 'scripts/build_single_file.py'
readme = root / 'README.md'

# Yu balance values: keep Yu fastest, but reduce the previous mobility/fire-rate advantage.
replace_once(characters,
    "      speed: 370,          // v9.8.4: fastest commuter",
    "      speed: 358,          // v9.9.8: tuned fastest commuter")
replace_once(characters,
    "      skillCooldown: 0.10, // v9.7.1: 三人最高射速機關槍 (0.16s CD)",
    "      skillCooldown: 0.25, // v9.9.8: slower suppression cadence")
replace_once(characters,
    "      cooldown: 0.10,",
    "      cooldown: 0.25,")
replace_once(characters,
    "      desc: '展開折傘連續高速發射針狀風刃機關槍（CD 0.16s，每發 16 傷），三人最高射速，提供密集火力壓制！'",
    "      desc: '展開折傘連續發射針狀風刃機關槍（CD 0.25s，每發 18 傷），以中高頻率提供持續壓制。'")

# Make Characters.js the Yu small-skill source of truth instead of duplicating runtime constants.
replace_once(player,
    "      // v9.7.1: CD 0.16s, 16 dmg, 射程 480px, 三人最高射速, 偏轉近身 180px 敵彈",
    "      // v9.9.8: config-driven Yu skill; CD/damage/range/speed/deflect all come from Characters.js")
replace_once(player,
    "      this.skillCooldown = this.charConfig.stats.skillCooldown || 0.16;",
    "      const skill = this.charConfig.skill;\n      this.skillCooldown = skill.cooldown;")
replace_once(player,
    "          if (dist <= 180) {",
    "          if (dist <= skill.deflectRadius) {")
replace_once(player,
    "        vx: this.facing * 820,",
    "        vx: this.facing * skill.bulletSpeed,")
replace_once(player,
    "        maxDistance: 480,",
    "        maxDistance: skill.range,")
replace_once(player,
    "        damage: this.phaseDamage(18),",
    "        damage: this.phaseDamage(skill.damage),")

# New version starts from the frozen v9.9.7 baseline and returns to PI review status.
replace_once(main,
    'const GAME_BUILD_VERSION = "v9.9.7";',
    'const GAME_BUILD_VERSION = "v9.9.8";')
replace_once(main,
    'const GAME_BUILD = Object.freeze({ version: GAME_BUILD_VERSION, status: "PI_ACCEPTED_FROZEN", sha: "source-dev", builtAt: "source" });',
    'const GAME_BUILD = Object.freeze({ version: GAME_BUILD_VERSION, status: "PI_REVIEW_REQUIRED", sha: "source-dev", builtAt: "source" });')

replace_once(build, 'BUILD_VERSION = "v9.9.7"', 'BUILD_VERSION = "v9.9.8"')
replace_once(build,
    '<title>《08點上班大作戰：通勤英雄篇》象山捷運站 → 松德院區 ({BUILD_VERSION} Reference Menu Match)</title>',
    '<title>《08點上班大作戰：通勤英雄篇》象山捷運站 → 松德院區 ({BUILD_VERSION} Yu Balance + Config Cleanup)</title>')
replace_once(build, '      status: "PI_ACCEPTED_FROZEN",', '      status: "PI_REVIEW_REQUIRED",')

replace_once(readme,
    '## —— 象山晨衝・奔向松德（v9.9.7 Reference Menu Match）——',
    '## —— 象山晨衝・奔向松德（v9.9.8 Yu Balance + Config Cleanup）——')
closeout = '> **✅ PROJECT CLOSEOUT — 2026-09-16**：PI 已完成實機驗收並正式接受 v9.9.7。狀態：`PI_ACCEPTED_FROZEN`。本版為最終穩定基線；除非另開新版本，首頁、美術、gameplay、Boss、HUD、balance 與 Victory 均不再變更。'
addition = closeout + "\n\n> **v9.9.8 Yu Balance + Config Cleanup**：以已凍結的 v9.9.7 為基線另開新版；Yu 移動速度 `370 → 358`、雨傘機關槍 CD `0.10s → 0.25s`。Yu 小招的 cooldown / damage / range / bullet speed / deflect radius 改由 `Characters.js` 單一設定來源驅動；Shakira、Sandra、Boss、Menu、HUD 與 Victory 不變。狀態回到 `PI_REVIEW_REQUIRED`。"
replace_once(readme, closeout, addition)

# Update only the current Yu summary, preserving historical v9.8.4 balance notes above it.
text = readme.read_text(encoding='utf-8')
marker = '### Yu｜風之通勤者・準時守護者'
pos = text.index(marker)
head, tail = text[:pos], text[pos:]
tail = tail.replace('- 速度：`370`', '- 速度：`358`', 1)
tail = tail.replace('- 小招：雨傘機關槍，`18` damage，CD `0.10s`', '- 小招：雨傘機關槍，`18` damage，CD `0.25s`', 1)
tail = tail.replace('- 定位：最快移動、最高射速、持續壓制', '- 定位：仍為最快移動；降低射速後偏向穩定持續壓制', 1)
readme.write_text(head + tail, encoding='utf-8')

print('v9.9.8 Yu balance + config cleanup patch applied')
