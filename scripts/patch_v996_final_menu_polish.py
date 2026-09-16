from pathlib import Path

MAIN = Path('source/src/main.js')
README = Path('README.md')

main = MAIN.read_text(encoding='utf-8')

old_version = 'const GAME_BUILD_VERSION = "v9.9.5";'
assert old_version in main, 'Expected v9.9.5 source version not found'
main = main.replace(old_version, 'const GAME_BUILD_VERSION = "v9.9.6";', 1)

menu_flow_start = main.index("    // Main Menu Flow\n    if (this.state === 'MENU') {")
menu_flow_end = main.index("\n    // Character Select Flow", menu_flow_start)
new_menu_flow = r'''    // Main Menu Flow
    if (this.state === 'MENU') {
      // v9.9.6: visual rectangles and pointer hitboxes share one source of truth.
      const menuButtons = this.getMenuButtonRects();
      const hitRect = (b) => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;

      if (hitRect(menuButtons.chill)) {
        this.selectGameMode('chill');
      }
      else if (hitRect(menuButtons.hardcore)) {
        this.selectGameMode('hardcore');
      }
      else if (hitRect(menuButtons.story)) {
        this.state = 'OPENING';
        introCinematic.start(() => {
          this.state = 'MENU';
        });
        audio.playCoin();
      }
      else if (hitRect(menuButtons.help)) {
        this.instructionsOpen = true;
      }
      else if (hitRect(menuButtons.settings)) {
        styleBibleUI.toggle();
      }
      return;
    }
'''
main = main[:menu_flow_start] + new_menu_flow + main[menu_flow_end:]

render_start = main.index("  renderMenu() {\n")
render_end = main.index("  renderSelect() {\n", render_start)
new_render_menu = r'''  getMenuButtonRects() {
    // v9.9.6 Final Menu Polish: exactly two compact lower-center rows.
    return Object.freeze({
      chill:    { x: 215, y: 414, w: 258, h: 54 },
      hardcore: { x: 487, y: 414, w: 258, h: 54 },
      story:    { x: 201, y: 476, w: 268, h: 40 },
      help:     { x: 479, y: 476, w: 132, h: 40 },
      settings: { x: 621, y: 476, w: 138, h: 40 }
    });
  }

  renderMenu() {
    const ctx = this.ctx;
    const menuButtons = this.getMenuButtonRects();

    // Keep the v9.9.5 verified production keyart as the sole background artwork.
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Only shade the lower strip so hero faces and upper torsos remain visually dominant.
    const lowerShade = ctx.createLinearGradient(0, 360, 0, this.vh);
    lowerShade.addColorStop(0, 'rgba(4, 14, 32, 0.00)');
    lowerShade.addColorStop(0.42, 'rgba(4, 14, 32, 0.28)');
    lowerShade.addColorStop(1, 'rgba(3, 9, 24, 0.78)');
    ctx.fillStyle = lowerShade;
    ctx.fillRect(0, 360, this.vw, this.vh - 360);

    const roundedPath = (rect, radius = 14) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
      else ctx.rect(rect.x, rect.y, rect.w, rect.h);
    };

    const drawMenuButton = (rect, options) => {
      const {
        fill,
        border,
        glow,
        title,
        subtitle = '',
        selected = false,
        titleFont = '900 18px "Arial Black", "PingFang SC", sans-serif',
        subtitleFont = 'bold 11px "PingFang SC", sans-serif'
      } = options;

      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = selected ? 22 : 11;
      ctx.fillStyle = fill;
      roundedPath(rect, rect.h >= 50 ? 16 : 13);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = border;
      ctx.lineWidth = selected ? 3 : 1.8;
      roundedPath(rect, rect.h >= 50 ? 16 : 13);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.72)';
      ctx.shadowBlur = 5;
      ctx.font = titleFont;
      const titleY = subtitle ? rect.y + rect.h * 0.38 : rect.y + rect.h / 2;
      ctx.fillText(title, rect.x + rect.w / 2, titleY);
      if (subtitle) {
        ctx.shadowBlur = 2;
        ctx.fillStyle = 'rgba(255,255,255,0.90)';
        ctx.font = subtitleFont;
        ctx.fillText(subtitle, rect.x + rect.w / 2, rect.y + rect.h * 0.72);
      }
      ctx.restore();
    };

    const chillSelected = this.difficultyMode === 'chill';
    const hardSelected = this.difficultyMode === 'hardcore';

    // Row 1 — commute mood. Large buttons, low enough to keep the cast unobstructed.
    drawMenuButton(menuButtons.chill, {
      fill: chillSelected ? 'rgba(17, 203, 194, 0.92)' : 'rgba(7, 139, 151, 0.78)',
      border: chillSelected ? '#C9FFFA' : 'rgba(138,255,247,0.86)',
      glow: '#00FFF0',
      title: '☕  Chill Mood',
      subtitle: '簡單・悠閒通勤',
      selected: chillSelected
    });
    drawMenuButton(menuButtons.hardcore, {
      fill: hardSelected ? 'rgba(244, 67, 54, 0.93)' : 'rgba(180, 45, 53, 0.80)',
      border: hardSelected ? '#FFE0B2' : 'rgba(255,145,145,0.90)',
      glow: '#FF3D5A',
      title: '🔥  Hard-Core',
      subtitle: '困難・原味挑戰',
      selected: hardSelected
    });

    // Row 2 — story / help / settings on one line only.
    drawMenuButton(menuButtons.story, {
      fill: 'rgba(206, 39, 125, 0.82)',
      border: 'rgba(255,128,171,0.92)',
      glow: '#FF3EA5',
      title: '🎬 劇情序幕（人物與怪獸介紹）',
      titleFont: 'bold 13px "PingFang SC", sans-serif'
    });
    drawMenuButton(menuButtons.help, {
      fill: 'rgba(8, 31, 67, 0.78)',
      border: 'rgba(126, 201, 255, 0.72)',
      glow: '#3BA7FF',
      title: '📖 遊戲說明 [H]',
      titleFont: 'bold 12px "PingFang SC", sans-serif'
    });
    drawMenuButton(menuButtons.settings, {
      fill: 'rgba(8, 31, 67, 0.78)',
      border: 'rgba(126, 201, 255, 0.72)',
      glow: '#3BA7FF',
      title: '⚙ 設定集 [TAB]',
      titleFont: 'bold 12px "PingFang SC", sans-serif'
    });

    // Live build badge remains isolated from the key art and menu rows.
    ctx.fillStyle = 'rgba(8, 32, 60, 0.82)';
    const badge = { x: this.vw - 78, y: 7, w: 68, h: 23 };
    roundedPath(badge, 7);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText((window.__GAME_BUILD__ || GAME_BUILD).version, this.vw - 44, 18.5);
    ctx.restore();
  }

'''
main = main[:render_start] + new_render_menu + main[render_end:]

# Guard against accidentally retaining the old three-level menu coordinates/structure.
assert "getMenuButtonRects()" in main
assert "chill:    { x: 215, y: 414, w: 258, h: 54 }" in main
assert "story:    { x: 201, y: 476, w: 268, h: 40 }" in main
assert "if (hitRect(menuButtons.chill))" in main
assert "if (hitRect(menuButtons.settings))" in main
assert "ctx.fillRect(330, 410, 300, 46);" not in main
assert "ctx.fillRect(330, 466, 148, 40);" not in main

MAIN.write_text(main, encoding='utf-8')

readme = README.read_text(encoding='utf-8')
readme = readme.replace(
    '## —— 象山晨衝・奔向松德（v9.9.5 Boss Arena + Neon Hard-Core）——',
    '## —— 象山晨衝・奔向松德（v9.9.6 Final Menu Polish）——',
    1
)
readme = readme.replace(
    '> **v9.9.5**：soft-boundary arena mask + persistent Boss chase + organic vine attack + Yu water shockwave VFX。',
    '> **v9.9.6**：首頁 Menu 最終整理為 lower-center 兩列 compact layout；Row 1 為 Chill Mood / Hard-Core，Row 2 為劇情序幕 / 遊戲說明 / 設定集，視覺矩形與 click hitboxes 共用同一座標來源。v9.9.5 gameplay / Boss arena / HUD / Victory / balance 全數鎖定不變。',
    1
)
needle = '> **v9.9.5 UI Repair + Fixed Boss Arena**\n> 修復 v9.9.4 主畫面 keyart 封裝損毀：回復已驗證 production keyart，重新以玻璃式 UI 排版模式選擇按鈕；HUD 左上角改為四欄式不重疊資訊。Final Battle Intro 後整場 Boss 戰使用固定鏡頭、不跟隨英雄、不震動，並在英雄側新增四階跳躍樓梯；Boss 擊破後才恢復跟隨鏡頭進入三人 Victory Run。\n'
assert needle in readme, 'v9.9.5 README section not found'
readme = readme.replace(
    needle,
    needle + '\n> **v9.9.6 Final Menu Polish**\n> 主畫面只保留兩列 runtime Canvas 按鈕並整體下移，減少對三位英雄臉部與上半身遮蔽；難度、劇情、說明與設定的 pointer hitboxes 直接讀取與繪圖相同的 `getMenuButtonRects()`，避免視覺與點擊區錯位。背景繼續使用 v9.9.5 已驗證 `menu_keyart.jpg`。\n',
    1
)
README.write_text(readme, encoding='utf-8')

print('v9.9.6 Final Menu Polish patch applied')
