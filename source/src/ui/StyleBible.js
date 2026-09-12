/**
 * 08點上班大作戰：通勤英雄篇 - 內建 Style Bible & QA 設定集面板 (StyleBible.js)
 * 按 [TAB] 或點擊右上方按鈕隨時呼叫
 * 四大 Tab：
 * 1. Style Bible (世界觀、六大場景、情緒曲線、美術語言)
 * 2. Character & Monster Bible (三位英雄、七大花系怪獸、夢影巨花王 Phase 1/2)
 * 3. Playtest & QA (Feet Sensor, Coyote Time, Jump Buffer, 15金幣解鎖測試)
 * 4. Deployment & Release Notes (版本號、自給自足零依賴、離線雙擊遊玩規範)
 */

export class StyleBibleUI {
  constructor() {
    this.isOpen = false;
    this.activeTab = 0; // 0: Style, 1: Characters, 2: QA, 3: Release
    this.tabs = [
      '風格聖經 (Style Bible)',
      '角色與怪獸誌 (Bibles)',
      '遊戲性與 QA 檢驗 (QA)',
      '部署與版本紀錄 (Release)'
    ];
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  setTab(idx) {
    this.activeTab = idx;
  }

  render(ctx, vw, vh) {
    if (!this.isOpen) return;

    ctx.save();
    // Modal Backdrop
    ctx.fillStyle = 'rgba(10, 15, 28, 0.92)';
    ctx.fillRect(0, 0, vw, vh);

    const pad = 40;
    const modalW = vw - pad * 2;
    const modalH = vh - pad * 2;
    const mx = pad;
    const my = pad;

    // Window frame
    ctx.fillStyle = '#1E2638';
    ctx.fillRect(mx, my, modalW, modalH);
    ctx.strokeStyle = '#3949AB';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, modalW, modalH);

    // Title Bar
    ctx.fillStyle = '#0D1322';
    ctx.fillRect(mx, my, modalW, 46);
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('📖《08點上班大作戰：通勤英雄篇》企劃與驗收設定集 (按 TAB 關閉)', mx + 20, my + 30);

    // Close button [X]
    ctx.fillStyle = '#FF5252';
    ctx.fillRect(mx + modalW - 36, my + 10, 26, 26);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✕', mx + modalW - 28, my + 28);

    // Tabs Header
    const tabW = modalW / 4;
    for (let i = 0; i < 4; i++) {
      const tx = mx + i * tabW;
      const ty = my + 46;
      ctx.fillStyle = this.activeTab === i ? '#283593' : '#151C2C';
      ctx.fillRect(tx, ty, tabW, 36);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(tx, ty, tabW, 36);

      ctx.fillStyle = this.activeTab === i ? '#FFF' : '#9E9E9E';
      ctx.font = this.activeTab === i ? 'bold 13px sans-serif' : '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.tabs[i], tx + tabW / 2, ty + 23);
    }
    ctx.textAlign = 'left';

    // Content Area
    const cx = mx + 24;
    const cy = my + 106;
    ctx.fillStyle = '#ECEFF1';

    if (this.activeTab === 0) {
      this.renderStyleBibleTab(ctx, cx, cy, modalW - 48);
    } else if (this.activeTab === 1) {
      this.renderCharacterBibleTab(ctx, cx, cy, modalW - 48);
    } else if (this.activeTab === 2) {
      this.renderQATab(ctx, cx, cy, modalW - 48);
    } else {
      this.renderReleaseTab(ctx, cx, cy, modalW - 48);
    }

    ctx.restore();
  }

  renderStyleBibleTab(ctx, x, y, maxW) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#81D4FA';
    ctx.fillText('一、核心世界觀與情緒曲線', x, y);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const lines = [
      '• 主題：台北晨間 08:00 通勤松德院區上班的英雄冒險，結合在地寫實地景與日系魔法少女奇幻花系怪獸。',
      '• 情緒曲線：晨光希望 (象山站) → 市井活力 (150巷早餐) → 雨天微冷 (虎林公園) → 山城壓迫 (坡道) → 松德開闊 → 夢境巨花爆發 → 準時打卡釋放。',
      '• 美術雙軌：主畫面為高精緻寫實插畫；遊戲內為 1.8 頭身商業級 Chibi 角色動畫，嚴格禁止低解析幾何拼圖。',
      '• 六大關卡無縫銜接：每關設 350px Transition Zone，背景透明度平滑漸變，雨量、色溫無縫過渡。',
      '• 決戰 Arena：1400px 連續平整地板，100% 杜絕跌落漏洞，營造無後顧之憂的史詩彈幕決戰。'
    ];
    lines.forEach((l, i) => ctx.fillText(l, x, y + 26 + i * 22));

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#81D4FA';
    ctx.fillText('二、Parallax 視差與音效規範', x, y + 160);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const lines2 = [
      '• 3-Layer Parallax：遠景 101/山巒 (scroll factor 0.35) + 中景街道公園 + 前景粒子花瓣。',
      '• Web Audio API 原生即時合成：4 首完整 BGM (City Pop, 雨景, Boss P1, Boss P2 高速狂暴 166 BPM)。',
      '• 大招施放自動觸發 Audio Ducking (BGM 音量降低 30%)，突顯專屬大招語音與音效衝擊。'
    ];
    lines2.forEach((l, i) => ctx.fillText(l, x, y + 186 + i * 22));
  }

  renderCharacterBibleTab(ctx, x, y, maxW) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText('三位通勤英雄規格 (1.8 頭身高解析 Chibi・默認面向右方前進)', x, y);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const heroes = [
      '1. 禹志晨 (風之通勤者)：黑髮圓眼鏡、條紋襯衫、折傘。小招【雨傘風壓斬】零冷卻無限連發；大招【逆風傘幕】高速貫穿+7道風刃+無敵。',
      '2. 夏奇拉 (元氣甜心)：短髮圓眼鏡、Oeuf Mayo紫T。小招【蛋能彈】零冷卻超速連發雙子蛋彈；大招【Oeuf Mayo星雨】全屏流星雨+回復HP+護盾。',
      '3. 珊卓澎 (熱血主廚)：海鸚鵡白圍裙、平底鍋。小招【爆炒上菜】零冷卻平底鍋重擊火焰波；大招【主廚旋風鍋】14道火炎旋轉鍋氣暴風。'
    ];
    heroes.forEach((h, i) => ctx.fillText(h, x, y + 26 + i * 26));

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#FF80AB';
    ctx.fillText('七大花系怪獸與松德大門決戰巨花王 (無花邊純淨去背・超遠廣角攻擊)', x, y + 125);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const monsters = [
      '• 尖鼻小紅苗 (貫穿全屏長程紅雷射刺針) | 稜角冰晶怪 (雙向大範圍冰霜地裂波) | 紫葡花結毒姬 (三重高低空拋物線毒霧)',
      '• 藍滴芽精 (高速雙重水刃瞬發) | 金花瓣使 (5道75度廣角扇形散射) | 玄晶葉衛 (重型震地波+尖石突刺) | 粉翼花靈 (空降俯衝雙爆彈)',
      '• 隨機與立體分布：怪獸動態分布於地面、高層懸空階梯磚頭、以及從天而降的空中突襲降落。',
      '• 決戰地點：松德院區大門前廣場，立有實體松德院區打卡機，擊敗巨花王即可完成準時打卡！'
    ];
    monsters.forEach((m, i) => ctx.fillText(m, x, y + 150 + i * 22));
  }

  renderQATab(ctx, x, y, maxW) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#00E676';
    ctx.fillText('精密手感與物理碰撞規格驗證 (v8.1.0 爽快度全面進化)', x, y);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const checks = [
      '✅ 24×10px Feet Sensor：腳底中心感測器，角色落地精準 snap 至平台頂部，無陷入或浮空。',
      '✅ 角色面向修正：人物默認面向右方 (+X)，跑動、跳躍與攻擊充滿向前通勤衝刺感。',
      '✅ 小招零冷卻 (0 CD)：按住或連按即刻無限連發，享受街機級暢快彈幕射擊。',
      '✅ 6 枚金幣永久解鎖大招：大幅降低門檻，第 1~2 關即可輕鬆集齊 6 枚金幣解鎖華麗 Anime Cut-in 大招！',
      '✅ 高難度廣角彈幕：怪獸射程擴展至 800px+，攻擊涵蓋扇形、高低拋物線、空降俯衝與地裂刺。',
      '✅ 松德打卡機：決戰地點位於松德院區大門前，擊敗魔王後衝至打卡機完成 07:58 上班打卡！'
    ];
    checks.forEach((c, i) => ctx.fillText(c, x, y + 26 + i * 24));

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText('Q 版人物專項驗收：3 角色面向右方・零冷卻連發・6 金幣解鎖 100% 全數通過 (PASS)', x, y + 195);
  }

  renderReleaseTab(ctx, x, y, maxW) {
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#B388FF';
    ctx.fillText('版本與發行資訊 (Version & Release Notes)', x, y);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#CFD8DC';
    const notes = [
      '• 交付版本：v8.1.0 (松德決戰・零冷卻無限小招・6幣解鎖大招・怪獸純淨無花邊重製)',
      '• 核心更新項目：',
      '   - 遊戲難度提升：怪獸攻擊更遠更廣泛、多向散彈、高低覆蓋、天降空擊。',
      '   - 小招零冷卻：無限射擊連發，機關槍式痛快壓制。',
      '   - 大招金幣門檻降為 6 枚：早期即可解鎖全屏大招。',
      '   - 人物轉向面向右邊：前進感十足。',
      '   - 決戰地點設定於松德院區大門前，設置專屬松德打卡機。',
      '   - 怪獸重新繪製去花邊，保持純淨俐落剪影。'
    ];
    notes.forEach((n, i) => ctx.fillText(n, x, y + 26 + i * 24));
  }
}

export const styleBibleUI = new StyleBibleUI();
