from pathlib import Path
import re

MAIN = Path('source/src/main.js')
BUILD = Path('scripts/build_single_file.py')
README = Path('README.md')

text = MAIN.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    text = text.replace(old, new, 1)
    print('PASS', label)


replace_once(
    'const GAME_BUILD_VERSION = "v9.8.5";',
    'const GAME_BUILD_VERSION = "v9.9.0";',
    'runtime version',
)
replace_once(
    'status: "PRODUCTION_VERIFIED"',
    'status: "PI_REVIEW_REQUIRED"',
    'runtime status',
)
replace_once(
    "    this.selectedCharId = 'yu';\n    this.instructionsOpen = false;",
    "    this.selectedCharId = 'yu';\n"
    "    // v9.9.0 Dual Mood: v9.8.5 is the immutable Hard-Core baseline.\n"
    "    this.difficultyMode = 'hardcore';\n"
    "    if (typeof window !== 'undefined') window.__GAME_MODE__ = 'HARDCORE';\n"
    "    this.instructionsOpen = false;",
    'mode state',
)

old_menu_flow = """    // Main Menu Flow
    if (this.state === 'MENU') {
      // 1. Start Game Button
      if (mx >= 350 && mx <= 610 && my >= 340 && my <= 392) {
        this.state = 'SELECT';
        audio.playCoin();
      }
      // 2. Watch Opening Button
      else if (mx >= 350 && mx <= 610 && my >= 402 && my <= 452) {
        this.state = 'OPENING';
        introCinematic.start(() => {
          this.state = 'MENU';
        });
        audio.playCoin();
      }
      // 3. Game Instructions
      else if (mx >= 350 && mx <= 470 && my >= 462 && my <= 505) {
        this.instructionsOpen = true;
      }
      // 4. Style Bible Button
      else if (mx >= 490 && mx <= 610 && my >= 462 && my <= 505) {
        styleBibleUI.toggle();
      }
      return;
    }
"""
new_menu_flow = """    // Main Menu Flow
    if (this.state === 'MENU') {
      // v9.9.0: select commute mood before character select.
      if (mx >= 225 && mx <= 465 && my >= 330 && my <= 392) {
        this.selectGameMode('chill');
      }
      else if (mx >= 495 && mx <= 735 && my >= 330 && my <= 392) {
        this.selectGameMode('hardcore');
      }
      // Watch Opening Button
      else if (mx >= 350 && mx <= 610 && my >= 402 && my <= 452) {
        this.state = 'OPENING';
        introCinematic.start(() => {
          this.state = 'MENU';
        });
        audio.playCoin();
      }
      // Game Instructions
      else if (mx >= 350 && mx <= 470 && my >= 462 && my <= 505) {
        this.instructionsOpen = true;
      }
      // Style Bible Button
      else if (mx >= 490 && mx <= 610 && my >= 462 && my <= 505) {
        styleBibleUI.toggle();
      }
      return;
    }
"""
replace_once(old_menu_flow, new_menu_flow, 'menu click flow')

old_start = """  startGame() {
    this.state = 'PLAYING';"""
new_start = """  selectGameMode(mode) {
    this.difficultyMode = mode === 'chill' ? 'chill' : 'hardcore';
    if (typeof window !== 'undefined') {
      window.__GAME_MODE__ = this.difficultyMode === 'chill' ? 'CHILL' : 'HARDCORE';
    }
    this.state = 'SELECT';
    audio.playCoin();
  }

  startGame() {
    if (typeof window !== 'undefined') {
      window.__GAME_MODE__ = this.difficultyMode === 'chill' ? 'CHILL' : 'HARDCORE';
    }
    this.state = 'PLAYING';"""
replace_once(old_start, new_start, 'mode selection method')

old_button = """    // 1. Start Game Button
    ctx.fillStyle = '#0288D1';
    ctx.fillRect(350, 340, 260, 52);
    ctx.strokeStyle = '#B3E5FC';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(350, 340, 260, 52);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('出發上班！開始遊戲', this.vw / 2, 366);
"""
new_button = """    // v9.9.0 Dual Mood mode selection
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SELECT COMMUTE MOOD', this.vw / 2, 315);

    const chillSelected = this.difficultyMode === 'chill';
    ctx.fillStyle = chillSelected ? 'rgba(38, 166, 154, 0.96)' : 'rgba(38, 166, 154, 0.80)';
    ctx.fillRect(225, 330, 240, 62);
    ctx.strokeStyle = '#B2DFDB';
    ctx.lineWidth = chillSelected ? 3 : 2;
    ctx.strokeRect(225, 330, 240, 62);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('☕ Chill Mood', 345, 354);
    ctx.fillStyle = '#E0F2F1';
    ctx.font = '12px sans-serif';
    ctx.fillText('簡單・悠閒通勤', 345, 378);

    const hardSelected = this.difficultyMode === 'hardcore';
    ctx.fillStyle = hardSelected ? 'rgba(198, 40, 40, 0.96)' : 'rgba(198, 40, 40, 0.80)';
    ctx.fillRect(495, 330, 240, 62);
    ctx.strokeStyle = '#FFCDD2';
    ctx.lineWidth = hardSelected ? 3 : 2;
    ctx.strokeRect(495, 330, 240, 62);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('🔥 Hard-Core', 615, 354);
    ctx.fillStyle = '#FFEBEE';
    ctx.font = '12px sans-serif';
    ctx.fillText('困難・v9.8.5 原味挑戰', 615, 378);
"""
replace_once(old_button, new_button, 'dual mode cards')

select_anchor = "    ctx.fillText('寫實立繪與高解析 Q 版 Chibi 對比・每位英雄具備專屬小招與 Anime 大招', this.vw / 2, 75);"
select_badge = select_anchor + "\n\n    ctx.textAlign = 'right';\n    ctx.fillStyle = this.difficultyMode === 'chill' ? '#80CBC4' : '#FF8A80';\n    ctx.font = 'bold 12px sans-serif';\n    ctx.fillText(this.difficultyMode === 'chill' ? '☕ CHILL MOOD' : '🔥 HARD-CORE', 925, 28);\n    ctx.textAlign = 'center';"
replace_once(select_anchor, select_badge, 'character select mode badge')

MAIN.write_text(text, encoding='utf-8')

build = BUILD.read_text(encoding='utf-8')
if build.count('BUILD_VERSION = "v9.8.5"') != 1:
    raise SystemExit('build version anchor mismatch')
if build.count('status: "PRODUCTION_VERIFIED",') != 1:
    raise SystemExit('build status anchor mismatch')
build = build.replace('BUILD_VERSION = "v9.8.5"', 'BUILD_VERSION = "v9.9.0"', 1)
build = build.replace('status: "PRODUCTION_VERIFIED",', 'status: "PI_REVIEW_REQUIRED",', 1)
build = build.replace('({BUILD_VERSION} Gameplay Polish)', '({BUILD_VERSION} Dual Mood Preview)', 1)
BUILD.write_text(build, encoding='utf-8')
print('PASS build metadata')

readme = README.read_text(encoding='utf-8')
if 'v9.8.5 正式版' not in readme:
    raise SystemExit('README version anchor mismatch')
readme = readme.replace('v9.8.5 正式版', 'v9.9.0 Dual Mood Preview', 1)
marker = '一款以台北晨間通勤為舞台的 Q 版 2D 橫向動作遊戲。從象山出發，在 08:00 前突破通勤怪獸與雙階段「夢影巨花王」，選擇速度、火力與技能定位各異的三位英雄，最後衝進松德院區完成三人打卡。\n'
note = '\n> **v9.9.0 開發中：Dual Mood Edition**\n> 主畫面已新增 `☕ Chill Mood` 與 `🔥 Hard-Core` 模式入口。Hard-Core 完整繼承已驗收的 v9.8.5 gameplay；本次先完成模式選單與 runtime mode state，Chill 的實際難度 modifiers 尚未套用。\n'
if marker not in readme:
    raise SystemExit('README intro anchor mismatch')
readme = readme.replace(marker, marker + note, 1)
README.write_text(readme, encoding='utf-8')
print('PASS README')
