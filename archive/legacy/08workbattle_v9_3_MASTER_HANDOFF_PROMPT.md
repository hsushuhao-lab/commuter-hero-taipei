# 《08點上班大作戰：通勤英雄篇》
# v9.3 MASTER HANDOFF PROMPT
## —— 終極魔王難度強化 × 全體夥伴通關互動 × 打卡機前狂歡歡呼版 ——

> **給接手的下一任 AI AGENT / 開發者：**
> 你現在接手的是已經完成 18,000px 完整全景路線貫通的 GitHub 專案。請仔細閱讀本 Hand-off Prompt，直接在既有穩固架構上實施本次升級。

---

### 📌 專案當前狀態 (Current Project State)

* **Repository**: `https://github.com/hsushuhao-lab/commuter-hero-taipei.git`
* **Current Branch**: `main`
* **Base Version**: `v9.2.0 Complete Commute Edition`
* **Base Commit**: `76733f960718488e0e3714a005dcd3cba97174f0`
* **Live Demo**: `https://hsushuhao-lab.github.io/commuter-hero-taipei/`
* **已經完成的基石（嚴禁破壞）**：
  1. 象山捷運站 2 號出口 (`x ≈ 220`) 到松德醫院大廳打卡機 (`x = 17,650`) 的 18,000px 全路徑 100% 可達，無隱形坑洞，邊界 50px 重疊。
  2. 攝影機邊界已動態鎖定世界末端：`camera.maxX = 17,040px`，終點視野清楚置中。
  3. 五大主場景已建立 World-Space Composition 三層視差與 800px 無感過渡帶。
  4. 道具純化為「通勤金幣（48px 旋轉 08 徽章）」與「晨光咖啡（56px 紙杯，+25 HP，冒熱氣）」。
  5. 支援離線零依賴單一 HTML 封裝：`python scripts/build_single_file.py`。
  6. 既有自動化測試：`node scripts/playtest_simulation.js` (15/15 PASS)、`node scripts/end_to_end_route_test.js` (3/3 英雄全通關)。

---

### 🎯 本次升級核心任務 (v9.3 Core Objectives)

本次升級的**兩大最核心重點**：
1. **最後魔王 BOSS「夢影巨花王」難度全面上升**：拒絕幾秒無腦站樁秒殺，大幅強化戰鬥張力與操作要求。
2. **通關時全體夥伴人物互動，衝至打卡機前集體歡呼！**：營造熱血溫馨的通勤夥伴情誼，打造最高潮的打卡大勝利！

---

### ⚔️ 任務一：最後魔王 BOSS 難度全面升級 (Boss Difficulty Escalation)

#### 1. 當前問題診斷
v9.2 由於三位主角火力大幅提升（禹志晨 52 傷、夏奇拉雙彈 48 傷、珊卓澎近戰+鍋氣 110 傷），導致 1500 HP 的 Boss 在玩家持續近身攻擊下，大約 3~8 秒就被融化秒殺，缺少史詩級最終決戰的壓迫感與戰術閃避樂趣。

#### 2. 數值與機制強化需求
* **生命值提升**：
  - Boss 總 HP 由 `1,500` 提升至 **`2,400 ~ 2,800`**。
  - 第一階段 (Phase 1)：`2,800 ~ 1,400` HP。
  - 第二階段 (Phase 2 狂暴盛開態)：`< 1,400` HP（或收集 60 幣觸發）。
* **新增核心機制：防站樁反擊護盾 / 霸體風壓 (Anti-Facetank Mechanism)**：
  - 當主角在 Boss 貼身距離（`dist < 120px`）連續輸出超過 1.2 秒時，Boss 必定觸發「藤蔓橫掃擊退（Vine Cleave）」，強制擊退玩家 250px 並造成 18 點傷害，迫使玩家必須進行走位與跳躍拉扯。
* **第一階段 (Phase 1) 彈幕與技能升級**：
  - **九方擴散花瓣彈幕 (9-Way Petal Barrage)**：由原本 7 向升級為 9 向交錯彈幕，彈速提升至 320 px/s，彈道帶有微幅螺旋旋轉。
  - **突刺地刺藤蔓 (Ground Thorn Wave)**：在地面預警 0.45 秒紅線後，從擂台地面連續刺出 3~4 道荊棘藤蔓，迫使玩家必須抓準時機小跳或跳上擂台半空磚台。
  - **瞌睡孢子霧 (Sleep Spore Mist)**：Boss 定期釋放 2 團慢速飄移的紫色孢子，觸碰會造成短暫減速與 10 點傷害。
* **第二階段 (Phase 2) 高速狂暴態 (Crimson Bloom Berserk)**：
  - BGM 轉為高 BPM 狂暴熱血合成器曲。
  - **全方位花瓣暴風雨 (360° Petal Cyclone)**：週期性向全擂台發射 16 向深紅花瓣，並帶有 0.35s 快速 Telegraph 預警。
  - **狂暴雙重召喚 (Minion Vanguard)**：召喚 2 隻狂暴紫晶怪與 1 隻飛行怪協助包夾。
  - **巨型捕蠅草夾擊 (Floral Chomp)**：突進式前咬攻擊，迫使玩家必須向後跳躍或使用大招無敵幀化解。
* **戰鬥時間目標標定**：
  - 三位角色在真人熟練操作下，擊敗 Boss 的預期時長應為 **25 ~ 35 秒**（上限嚴格保持在 ≤ 45 秒），提供充實且驚險的戰鬥操作體驗。

---

### 🎉 任務二：通關時夥伴互動與打卡機前歡呼 (Trio Interaction & Punch-Clock Cheering)

#### 1. 空間與角色敘事
當夢影巨花王被擊潰、x=16500 院區大門結界粉碎後，不能只是單一操作角色自顧自地跑進去，**必須展現三人組通勤小隊的羈絆與互動**！

#### 2. 九拍通關互動流程升級 (Nine-Beat Interactive Victory Sequence)
* **Beat 1: 巨花王解體與彈幕淨空 (0.0s ~ 0.8s)**
  - 巨花王花瓣爆碎，全螢幕敵彈清除。
* **Beat 2: 夥伴會合登場 (0.8s ~ 1.5s)**
  - 當前玩家操作的主角站在前方，另外兩位隊友從畫面左側（或後方）驚喜快步跟上會合！
  - 頭頂浮現角色專屬對話互動氣泡（Speech Bubble）：
    - **禹志晨**：「呼……眼鏡差點歪掉，但路通了！」
    - **夏奇拉**：「太棒了！大家快跟上，還差幾十秒！」
    - **珊卓澎**：「平底鍋都快炒焦啦，最後衝刺衝啊——！」
* **Beat 3: 衝破醫院正門進入大廳 (1.5s ~ 3.5s)**
  - 三位角色結伴同行，以高速（1100 px/s）齊步衝入松德醫院大理石室內大廳！
  - 地面伴隨三道青藍、粉金、烈火色系的衝刺拖尾粒子。
* **Beat 4: 抵達打卡機前剎車聚攏 (x = 17,630px)**
  - 三人在打卡機前一字排開、依序剎車聚攏！
  - 彼此相視點頭或相互擊掌（High-Five）互動動作。
* **Beat 5: 集體打卡與專屬動作**
  - 主角拍下打卡鐘，打卡機亮起綠色超亮光芒（LED 顯示動態計算時間 `07:59:xx`）。
  - 打卡音效與機械印章聲響起，相機微幅地震動回饋。
* **Beat 6: 全體雙手舉起大歡呼！(Unified Victory Cheering)**
  - **三位角色同時切換至『歡呼／慶祝 Victory Pose』**！
  - 禹志晨高舉收好的折傘微笑鬆一口氣；
  - 夏奇拉雙手高舉比出勝利 V 手勢、雀躍蹦跳；
  - 珊卓澎單手舉起平底鍋豪邁大笑！
  - 頭頂浮現超大金色浮動文字：**『08:00 準時壓線！打卡成功！！』**
* **Beat 7: 大廳慶祝紙花雨與彩帶爆發**
  - 挑高大廳天花板傾瀉滿天五彩紙花、金幣星光與晨光金芒。
* **Beat 8 & 9: 結算卡與三人合照立繪**
  - 彈出最終評級卡（Rank S / A / B），結算卡上展示三人的 Q 版合體過關姿勢或對話評語。

---

### 📋 接手開發者的修改指南 (File Edit Guidance)

1. **`source/src/entities/Boss.js`**：
   - 調整 `BOSS_CONFIG`：HP 提升至 2400~2800，Phase 2 閥值調整至 1200~1400。
   - 增加貼身防無腦站樁反擊 `checkProximityCleave(player, dt)`。
   - 升級 Phase 1 與 Phase 2 彈幕發射函數（9 向花瓣、地面刺藤）。
2. **`source/src/main.js`**：
   - 升級 `updateVictoryRun(dt)`：
     - 在 Boss 死亡後，生成或啟動另外兩位夥伴 Chibi 在玩家身邊跟隨。
     - 加入互動對話氣泡與對白計時。
     - 抵達 x=17630 時，三人齊步停下並同時觸發打卡與歡呼動畫。
3. **`source/src/entities/Player.js` & `source/src/entities/Particles.js`**：
   - 支援頭頂對話氣泡渲染 (`emitSpeechBubble` 或 `drawDialogue`)。
   - 確保三位角色皆具備高精度歡呼幀 (`victory` 動畫幀)。
4. **`source/src/world/Platforms.js`**：
   - 打卡機本體（`prop_clock_machine.png`）周圍加入打卡時的綠色波紋與三人歡呼特效。
5. **單一檔案打包與測試腳本**：
   - 修改完原始碼後，必須執行 `python scripts/build_single_file.py` 更新 `index.html`。
   - 更新並執行 `node scripts/playtest_simulation.js` 與 `node scripts/end_to_end_route_test.js`。
   - 確保所有測試 100% 通過，且 `watchdogTriggerCount === 0`。

---

### 🚀 驗收清單與交付標準 (Release Checklist)

接手完成後，請務必確認並回報：
- [ ] Boss HP 與彈幕機制成功強化，戰鬥時間提升至約 20~35 秒，具備走位與跳躍閃避挑戰。
- [ ] 貼身站樁時 Boss 會發動反擊擊退，不再能原地無腦連按小招速通。
- [ ] 巨花王擊敗後，另外兩位隊友登場，三人有語音/對話氣泡互動。
- [ ] 三人齊步衝刺穿過大門，抵達松德醫院打卡機（x=17650）。
- [ ] 三人於打卡機前同時擺出專屬慶祝動作，歡呼慶祝「08:00 準時打卡成功」。
- [ ] 18,000px 全路線無死角，攝影機正常追蹤至 17,040px。
- [ ] `watchdogTriggerCount === 0`（完全不觸發超時補償）。
- [ ] `index.html` (23.5 MB+) 保持單一離線雙擊即玩，資產 100% 內嵌。
- [ ] 提交 Commit 並 Push 至 GitHub `main` 分支。
