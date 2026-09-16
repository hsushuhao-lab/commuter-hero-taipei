from pathlib import Path
import re

main_path = Path('source/src/main.js')
readme_path = Path('README.md')
main = main_path.read_text(encoding='utf-8')
readme = readme_path.read_text(encoding='utf-8')

main = main.replace('const GAME_BUILD_VERSION = "v9.9.6";', 'const GAME_BUILD_VERSION = "v9.9.7";', 1)

pattern = re.compile(r"  getMenuButtonRects\(\) \{.*?\n  renderSelect\(\) \{", re.S)
replacement = r'''  getMenuButtonRects() {
    // v9.9.7: geometry matched to the PI-approved 1536x864 reference composition.
    return Object.freeze({
      chill:    { x: 276, y: 414, w: 202, h: 54 },
      hardcore: { x: 486, y: 414, w: 202, h: 54 },
      story:    { x: 232, y: 476, w: 190, h: 40 },
      help:     { x: 430, y: 476, w: 140, h: 40 },
      settings: { x: 578, y: 476, w: 154, h: 40 }
    });
  }

  renderMenu() {
    const ctx = this.ctx;
    const menuButtons = this.getMenuButtonRects();

    // Keep the verified keyart clean; all interactive labels remain runtime-drawn.
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

    // Reference image keeps the cast fully visible; only a light lower vignette is added.
    const lowerShade = ctx.createLinearGradient(0, 382, 0, this.vh);
    lowerShade.addColorStop(0, 'rgba(3, 12, 27, 0.00)');
    lowerShade.addColorStop(0.55, 'rgba(3, 12, 27, 0.10)');
    lowerShade.addColorStop(1, 'rgba(3, 10, 24, 0.30)');
    ctx.fillStyle = lowerShade;
    ctx.fillRect(0, 382, this.vw, this.vh - 382);

    const roundedPath = (rect, radius = 14) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
      else ctx.rect(rect.x, rect.y, rect.w, rect.h);
    };

    const drawChevron = (x, y) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 5);
      ctx.lineTo(x + 2, y);
      ctx.lineTo(x - 3, y + 5);
      ctx.stroke();
      ctx.restore();
    };

    const drawIconDisk = (x, y, icon, diskFill) => {
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.45)';
      ctx.shadowBlur = 5;
      ctx.fillStyle = diskFill;
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.font = 'bold 16px "PingFang SC", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(icon, x, y + 0.5);
      ctx.restore();
    };

    const drawReferenceButton = (rect, options) => {
      const {
        c1, c2, border, glow, title, subtitle = '', icon = '', diskFill = 'rgba(255,255,255,0.14)',
        selected = false, compact = false
      } = options;

      ctx.save();
      const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.shadowColor = glow;
      ctx.shadowBlur = selected ? 24 : 14;
      roundedPath(rect, rect.h >= 50 ? 16 : 13);
      ctx.fill();

      // Bright outer neon border + subtle inner highlight, matching the reference card treatment.
      ctx.shadowBlur = selected ? 18 : 9;
      ctx.strokeStyle = border;
      ctx.lineWidth = selected ? 3.4 : 2.2;
      roundedPath(rect, rect.h >= 50 ? 16 : 13);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      const inner = { x: rect.x + 3, y: rect.y + 3, w: rect.w - 6, h: rect.h - 6 };
      roundedPath(inner, rect.h >= 50 ? 13 : 10);
      ctx.stroke();

      if (icon) {
        drawIconDisk(rect.x + (compact ? 24 : 28), rect.y + rect.h / 2, icon, diskFill);
      }

      const textLeftOffset = icon ? (compact ? 16 : 22) : 0;
      const textX = rect.x + rect.w / 2 + textLeftOffset;
      ctx.shadowColor = 'rgba(0,0,0,0.72)';
      ctx.shadowBlur = 5;
      ctx.fillStyle = '#FFFFFF';
      if (compact) {
        ctx.font = 'bold 12px "PingFang SC", "Microsoft JhengHei", sans-serif';
        ctx.fillText(title, textX, rect.y + rect.h / 2 + 0.5);
      } else {
        ctx.font = '900 18px "Arial Black", "PingFang SC", sans-serif';
        ctx.fillText(title, textX, rect.y + 20);
        ctx.shadowBlur = 2;
        ctx.fillStyle = 'rgba(255,255,255,0.93)';
        ctx.font = 'bold 10.5px "PingFang SC", sans-serif';
        ctx.fillText(subtitle, textX, rect.y + 39);
      }
      ctx.shadowBlur = 0;
      drawChevron(rect.x + rect.w - 14, rect.y + rect.h / 2);
      ctx.restore();
    };

    const chillSelected = this.difficultyMode === 'chill';
    const hardSelected = this.difficultyMode === 'hardcore';

    // Row 1 — exact reference proportions: compact cyan and coral-red cards.
    drawReferenceButton(menuButtons.chill, {
      c1: chillSelected ? 'rgba(24, 232, 226, 0.96)' : 'rgba(16, 194, 205, 0.90)',
      c2: chillSelected ? 'rgba(3, 137, 169, 0.94)' : 'rgba(6, 102, 139, 0.90)',
      border: '#B7FFFC', glow: '#00F5FF',
      title: 'Chill Mood', subtitle: '簡單・悠閒通勤', icon: '♪',
      diskFill: 'rgba(126, 42, 215, 0.80)', selected: chillSelected
    });
    drawReferenceButton(menuButtons.hardcore, {
      c1: hardSelected ? 'rgba(255, 90, 74, 0.98)' : 'rgba(236, 64, 70, 0.92)',
      c2: hardSelected ? 'rgba(190, 22, 48, 0.96)' : 'rgba(144, 19, 47, 0.92)',
      border: '#FFE0D8', glow: '#FF405A',
      title: 'Hard-Core', subtitle: '困難・原味挑戰', icon: '🔥',
      diskFill: 'rgba(255, 92, 39, 0.72)', selected: hardSelected
    });

    // Row 2 — three cards on one line with the same visual rhythm as the approved reference.
    drawReferenceButton(menuButtons.story, {
      c1: 'rgba(239, 50, 173, 0.94)', c2: 'rgba(154, 21, 116, 0.92)',
      border: '#FFB4F2', glow: '#FF2DBB', title: '劇情序幕（人物與怪獸介紹）',
      icon: '🎬', diskFill: 'rgba(77, 83, 194, 0.70)', compact: true
    });
    drawReferenceButton(menuButtons.help, {
      c1: 'rgba(30, 61, 104, 0.92)', c2: 'rgba(8, 29, 63, 0.94)',
      border: '#D7ECFF', glow: '#6DBBFF', title: '遊戲說明 [H]',
      icon: '📖', diskFill: 'rgba(255,255,255,0.16)', compact: true
    });
    drawReferenceButton(menuButtons.settings, {
      c1: 'rgba(30, 61, 104, 0.92)', c2: 'rgba(8, 29, 63, 0.94)',
      border: '#D7ECFF', glow: '#6DBBFF', title: '設定集 [TAB]',
      icon: '⚙', diskFill: 'rgba(255,255,255,0.16)', compact: true
    });

    // Live build badge in the same top-right position as the approved composition.
    const badge = { x: this.vw - 78, y: 7, w: 68, h: 23 };
    ctx.fillStyle = 'rgba(8, 32, 60, 0.88)';
    ctx.shadowColor = 'rgba(109, 187, 255, 0.45)';
    ctx.shadowBlur = 8;
    roundedPath(badge, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    roundedPath(badge, 7);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px monospace';
    ctx.fillText((window.__GAME_BUILD__ || GAME_BUILD).version, this.vw - 44, 18.5);
    ctx.restore();
  }

  renderSelect() {'''

main, count = pattern.subn(replacement, main, count=1)
if count != 1:
    raise SystemExit(f'Expected one menu block, replaced {count}')

if '## —— 象山晨衝・奔向松德（v9.9.6' in readme:
    readme = readme.replace('## —— 象山晨衝・奔向松德（v9.9.6 Final Menu Polish）——', '## —— 象山晨衝・奔向松德（v9.9.7 Reference Menu Match）——', 1)
elif '## —— 象山晨衝・奔向松德（v9.9.5' in readme:
    readme = readme.replace('## —— 象山晨衝・奔向松德（v9.9.5 Boss Arena + Neon Hard-Core）——', '## —— 象山晨衝・奔向松德（v9.9.7 Reference Menu Match）——', 1)

note = '> **v9.9.7 Reference Menu Match**：依 PI 核准主畫面參考圖重繪首頁 runtime UI；兩列按鈕改為參考圖比例、霓虹玻璃漸層、圖示圓章與右側箭頭。背景 keyart 與 v9.9.6 gameplay / Boss / HUD / Victory 全部維持不變。\n\n'
anchor = '一款以台北晨間通勤為舞台的 Q 版 2D 橫向動作遊戲。'
if note not in readme and anchor in readme:
    readme = readme.replace(anchor, note + anchor, 1)

main_path.write_text(main, encoding='utf-8')
readme_path.write_text(readme, encoding='utf-8')
print('v9.9.7 reference menu patch applied')
