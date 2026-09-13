/**
 * 08點上班大作戰：通勤英雄篇 - 內建 Style Bible & QA 設定集面板 (StyleBible.js)
 * 按 [TAB] 或點擊右上方按鈕隨時呼叫
 * 五大 Tab：
 * 0. 風格聖經 (世界觀、14400px六大場景、情緒曲線、美術語言)
 * 1. 三位英雄攻擊身份與八大怪獸誌 (英雄小招、Ultimate、怪獸 Phase 2、夢影巨花王)
 * 2. 雙向同步進化與通勤共振 (15/30/60 金幣里程碑機制)
 * 3. 新版美術重製圖冊 V1.0 (Art Bible Sheets 00~07 瀏覽器)
 * 4. 部署與版本紀錄 (V10.0、自給自足零依賴、離線雙擊遊玩規範)
 */

export class StyleBibleUI {
  constructor() {
    this.isOpen = false;
    this.activeTab = 0;
    this.selectedArtSheet = 0; // 0 to 7
    this.tabs = [
      '風格聖經 (Style)',
      '角色型態與怪獸 (Bibles)',
      '雙向同步進化 (Resonance)',
      '新版圖冊 V1.0 (Art Sheets)',
      '版本紀錄 (Release)'
    ];

    // Preload art bible sheets 00 ~ 12
    this.artSheetImgs = [];
    this.artSheetTitles = [
      'Sheet 00: 封面重製與美術企劃總攬',
      'Sheet 01: 禹志晨「雨傘機關槍」攻擊設定',
      'Sheet 02: 夏奇拉「蛋能雙彈」攻擊設定',
      'Sheet 03: 珊卓澎「平底鍋揮舞」攻擊設定',
      'Sheet 04: 怪獸二階段進化 (烈焰紅苗 / 激流藍葉王 / 極凍冰花怪)',
      'Sheet 05: 怪獸二階段進化 (魅影葡後 / 耀陽金花聖使 / 玄曜晶晶泰坦)',
      'Sheet 06: 第八怪獸「車票幽靈 / 悠遊卡寄靈」',
      'Sheet 07: 終點站「松德醫院挑高大廳打卡機與雙階段魔王」',
      'Sheet 08: 禹志晨 大招前搖設定稿 (冷靜逆風展傘・風場疾行)',
      'Sheet 09: 夏奇拉 大招前搖設定稿 (元氣蛋浪召喚・星雨爆發)',
      'Sheet 10: 珊卓澎 大招前搖設定稿 (主廚料理旋風・海鸚風暴)',
      'Sheet 11: 夢影巨花王 最終 Boss 重製設定稿 (夢境安撫態 ➔ 狂暴盛開態)',
      'Sheet 12: 怪獸戰鬥設定圖鑑 (取消外觀二階・攻擊階段 1 / 2 強化)'
    ];

    for (let i = 0; i < 13; i++) {
      const img = new Image();
      img.src = `assets/art_bible_${String(i).padStart(2, '0')}.jpg`;
      this.artSheetImgs.push(img);
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  setTab(idx) {
    this.activeTab = idx;
  }

  nextSheet() {
    this.selectedArtSheet = (this.selectedArtSheet + 1) % 13;
  }

  prevSheet() {
    this.selectedArtSheet = (this.selectedArtSheet + 12) % 13;
  }

  render(ctx, vw, vh) {
    if (!this.isOpen) return;

    ctx.save();
    // Modal Backdrop
    ctx.fillStyle = 'rgba(10, 15, 28, 0.94)';
    ctx.fillRect(0, 0, vw, vh);

    const pad = 36;
    const modalW = vw - pad * 2;
    const modalH = vh - pad * 2;
    const mx = pad;
    const my = pad;

    // Window frame
    ctx.fillStyle = '#171E2E';
    ctx.fillRect(mx, my, modalW, modalH);
    ctx.strokeStyle = '#3949AB';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, modalW, modalH);

    // Title Bar
    ctx.fillStyle = '#0D1322';
    ctx.fillRect(mx, my, modalW, 44);
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('📖《08點上班大作戰：通勤英雄篇》企劃與驗收設定集 V10.0 (按 TAB 關閉)', mx + 16, my + 28);

    // Close button [X]
    ctx.fillStyle = '#FF5252';
    ctx.fillRect(mx + modalW - 36, my + 8, 28, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', mx + modalW - 27, my + 27);

    // Tabs Header (5 Tabs)
    const tabW = modalW / 5;
    for (let i = 0; i < 5; i++) {
      const tx = mx + i * tabW;
      const ty = my + 44;
      ctx.fillStyle = this.activeTab === i ? '#283593' : '#121826';
      ctx.fillRect(tx, ty, tabW, 34);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(tx, ty, tabW, 34);

      ctx.fillStyle = this.activeTab === i ? '#FFF' : '#9E9E9E';
      ctx.font = this.activeTab === i ? 'bold 12px sans-serif' : '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.tabs[i], tx + tabW / 2, ty + 22);
    }
    ctx.textAlign = 'left';

    // Content Area
    const cx = mx + 20;
    const cy = my + 100;
    ctx.fillStyle = '#ECEFF1';

    if (this.activeTab === 0) {
      this.renderStyleBibleTab(ctx, cx, cy, modalW - 40);
    } else if (this.activeTab === 1) {
      this.renderCharacterBibleTab(ctx, cx, cy, modalW - 40);
    } else if (this.activeTab === 2) {
      this.renderResonanceTab(ctx, cx, cy, modalW - 40);
    } else if (this.activeTab === 3) {
      this.renderArtSheetsTab(ctx, cx, cy, modalW - 40, modalH - 120);
    } else {
      this.renderReleaseTab(ctx, cx, cy, modalW - 40);
    }

    ctx.restore();
  }

  renderStyleBibleTab(ctx, x, y, maxW) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#81D4FA';
    ctx.fillText('一、核心世界觀與五大場景路徑 (總長 18,000px)', x, y);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const lines = [
      '• 起點與終點：起點為「象山捷運站 2 號出口」(x=200)，終點為「松德院區內部大廳打卡機」(x=17650)。',
      '• 五大主場景無縫過渡：象山站出口 (0~3500) ➔ 信義街廓巷弄 (3500~7000) ➔ 雨中虎林公園 (7000~10500) ➔',
      '  松德坡道段 (10500~14000) ➔ 松德院區 (14000~18000：前庭 14000~14800、決戰場 14800~16500、大廳 16500~18000)。',
      '• 雙軌美術哲學：五大實景美術（出口、巷弄、公園、坡道、松德）全部導入實際 Gameplay，400~700px 漸變過渡。',
      '• 決戰 Arena：14800~16500px 嚴格連續平整石板地板，零坑洞掉落，雙向封閉技術彈幕對決。'
    ];
    lines.forEach((l, i) => ctx.fillText(l, x, y + 22 + i * 20));

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#81D4FA';
    ctx.fillText('二、Parallax 視差與音效環境規範', x, y + 150);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const lines2 = [
      '• 3-Layer Parallax：遠景 101/象山晨巒 (0.35x) + 中景 5 大主場景 (0.75x~1.0x) + 前景雨滴與花瓣粒子。',
      '• 4 首 Web Audio API 原生即時合成 BGM：City Pop 晨光、雨中綠意、Boss P1 守護態、Boss P2 狂暴態 (166 BPM)。',
      '• 終點打卡演出：擊潰巨花王後進入 VICTORY_RUN，高速奔入松德大廳，向 x=17650 打卡機飛躍打卡顯示動態時間！'
    ];
    lines2.forEach((l, i) => ctx.fillText(l, x, y + 172 + i * 20));
  }

  renderCharacterBibleTab(ctx, x, y, maxW) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText('三大英雄戰鬥身份與攻擊特色', x, y);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const heroes = [
      '1. 禹志晨【雨傘機關槍】：三人最慢，以高射速、低單發傷害的傘針持續壓制前方敵人。',
      '2. 夏奇拉【蛋能雙彈】：第二快，以遠程雙蛋與範圍濺射造成三人最高小招傷害。',
      '3. 珊卓澎【平底鍋揮舞】：三人最快，以短距離弧擊與強力擊退完成游擊。'
    ];
    heroes.forEach((h, i) => ctx.fillText(h, x, y + 22 + i * 22));

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#FF80AB';
    ctx.fillText('八大晨間怪獸與二階段進化 (30 金幣全體怪獸進化)', x, y + 115);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const monsters = [
      '• 尖鼻小紅苗 ➔ 烈焰紅苗 (鮮紅葉片裝甲，長程貫穿赤紅重刺) | 稜角冰晶怪 ➔ 極凍冰花怪 (雙向大範圍冰霜地裂衝擊)',
      '• 藍滴芽精 ➔ 激流藍葉王 (極速瞬發三連水刃穿梭) | 金花瓣使 ➔ 耀陽金花聖使 (旋轉多角花瓣風暴彈幕)',
      '• 紫葡花結毒姬 ➔ 魅影葡後 (大範圍濃郁劇毒拋物線迷霧) | 玄晶葉衛 ➔ 玄曜晶晶泰坦 (巨大晶簇泰坦，全場震地波地刺)',
      '• 粉翼花靈 ➔ 粉翼魅花仙 (透明花瓣大翼展開，閃光花粉致盲俯衝轟炸)',
      '• 第八怪獸：車票幽靈 ➔ 悠遊卡寄靈 (半透明捷運幽靈，短瞬移、彩虹光帶與刷卡雷射雙重狙擊)'
    ];
    monsters.forEach((m, i) => ctx.fillText(m, x, y + 138 + i * 20));
  }

  renderResonanceTab(ctx, x, y, maxW) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#00E676';
    ctx.fillText('通勤共振 (Commuter Resonance) 雙向同步進化機制', x, y);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const steps = [
      '【15 枚金幣】英雄永久解鎖全屏大招：零消耗、解鎖後無限施放僅受冷卻限制！',
      '【30 枚金幣】全體怪獸二階段進化：現存與後續怪獸切換 Phase 2 外觀，速度與傷害同步強化！',
      '【60 枚金幣】Boss 提早進入 Phase 2 狂暴盛開態：稀有掉落物雙倍，難度與爽度推向極致！'
    ];
    steps.forEach((s, i) => ctx.fillText(s, x, y + 24 + i * 24));

    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText('收集品：🪙 金幣 (15/30/60 共振里程碑) | ☕ 外帶咖啡 (固定回復 25 HP，滿血不超過上限)', x, y + 200);
  }

  renderArtSheetsTab(ctx, x, y, w, h) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText('新版美術設計重製企劃 V1.0 - ' + this.artSheetTitles[this.selectedArtSheet], x, y);

    // Left / Right controls instruction
    ctx.fillStyle = '#81D4FA';
    ctx.font = '12px sans-serif';
    ctx.fillText('【點擊此處或點擊縮圖切換第 ' + (this.selectedArtSheet + 1) + ' / 8 張圖冊】', x + 440, y);

    // Draw Main Selected Sheet
    const mainImg = this.artSheetImgs[this.selectedArtSheet];
    const previewW = w - 180;
    const previewH = h - 60;
    const previewX = x;
    const previewY = y + 15;

    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(previewX, previewY, previewW, previewH);
    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(previewX, previewY, previewW, previewH);

    if (mainImg && mainImg.complete && mainImg.naturalWidth > 0) {
      // Fit aspect ratio inside preview box
      const imgAspect = mainImg.naturalWidth / mainImg.naturalHeight;
      let dw = previewW;
      let dh = previewW / imgAspect;
      if (dh > previewH) {
        dh = previewH;
        dw = previewH * imgAspect;
      }
      const dx = previewX + (previewW - dw) / 2;
      const dy = previewY + (previewH - dh) / 2;
      ctx.drawImage(mainImg, dx, dy, dw, dh);
    } else {
      ctx.fillStyle = '#78909C';
      ctx.font = '14px sans-serif';
      ctx.fillText('美術設計圖載入中...', previewX + previewW / 2 - 60, previewY + previewH / 2);
    }

    // Right Thumbnails list (00 ~ 12)
    const thumbX = x + previewW + 10;
    const thumbW = 160;
    const thumbH = Math.floor((previewH - 12 * 4) / 13);

    for (let i = 0; i < 13; i++) {
      const ty = previewY + i * (thumbH + 4);
      const isSel = this.selectedArtSheet === i;
      ctx.fillStyle = isSel ? 'rgba(255, 213, 79, 0.25)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(thumbX, ty, thumbW, thumbH);
      ctx.strokeStyle = isSel ? '#FFD54F' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeRect(thumbX, ty, thumbW, thumbH);

      const tImg = this.artSheetImgs[i];
      if (tImg && tImg.complete && tImg.naturalWidth > 0) {
        ctx.drawImage(tImg, thumbX + 2, ty + 2, thumbH * 1.3, thumbH - 4);
      }

      ctx.fillStyle = isSel ? '#FFD54F' : '#CFD8DC';
      ctx.font = isSel ? 'bold 9px sans-serif' : '9px sans-serif';
      ctx.fillText('Sheet ' + String(i).padStart(2, '0'), thumbX + thumbH * 1.3 + 6, ty + thumbH / 2 + 3);
    }
  }

  renderReleaseTab(ctx, x, y, maxW) {
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#B388FF';
    ctx.fillText('版本與發行資訊 (Version & Release Notes)', x, y);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const notes = [
      '• 交付版本：v9.6.0 Opening Cinematic × Hero Identity × Monster Phase × 3-Min Full Edition',
      '• 核心更新項目：',
      '   1. 盛大 Opening 動畫：黑幕晨光、台北地標剪影蒙太奇、7大怪獸登場卡牌、3大主角立繪切入。',
      '   2. 三主角大招前搖視覺升級：禹志晨(戰術逆風展傘)、夏奇拉(元氣蛋浪星雨)、珊卓澎(料理火焰風暴)。',
      '   3. 一般怪獸取消外觀二階換皮：維持同一外觀，全面啟用 Attack Phase 1 / 2 強化彈幕與傷害。',
      '   4. 最終魔王二階段重製：同種族語言狂暴盛開態，尖銳花瓣、高亮核心光芒、高壓四重招式。',
      '   5. 3分鐘時間制：07:57 出發至 08:00 抵達松德，總倒數 180s，重新校準難度與怪物密度。',
      '   6. 手機操作修復：左下虛擬方向鍵(◀/▶)與搖桿實質驅動平移，支援多點觸控與按下反饋。',
      '   7. 全畫面返回主選單：所有次級畫面皆可返回 Title；結算畫面提供 Retry / Reselect / Home 3 選項。',
      '   8. 離線自給自足：單一 index.html 零外部依賴雙擊即玩，通過 7 大自動化驗證測試。'
    ];
    notes.forEach((n, i) => ctx.fillText(n, x, y + 22 + i * 20));
  }
}

export const styleBibleUI = new StyleBibleUI();
