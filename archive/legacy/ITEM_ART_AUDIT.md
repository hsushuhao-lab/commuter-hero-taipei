# 《08點上班大作戰：通勤英雄篇》
## ITEM ART & SYSTEM AUDIT (道具美術品質與純化系統審計報告)

**Version**: v9.2.0 Complete Commute Edition  
**Inspection Focus**: 道具極簡化 (Strictly 2-Item Rule: Coin & Coffee Only) 與高質感美術重繪檢驗  
**Status**: 100% VERIFIED  

---

### 一、道具系統純化準則 (Strict 2-Item Rule)

在 v9.2.0 中，遊戲內可拾取道具（Collectibles）已全面肅清雜項，**嚴格只保留兩大核心象徵道具**：
1. **通勤共振金幣 (Commuter Resonance Coin)**
2. **晨光精力咖啡 (Commuter Morning Coffee)**

#### 已徹底清除之歷史死碼與舊道具清單
* ❌ **悠遊卡拾取物 (EasyCard Pickup)**：已自 `PlatformManager`、`Player` 中移除。（保留「悠遊卡寄靈 Transit Ghost」為純敵人怪獸，不再具備拾取道具功能）
* ❌ **愛心道具 (Heart Pickup)**：已移除，所有治療機制由咖啡專責提供。
* ❌ **雨滴拾取物 (Raindrop Pickup)**：已移除，轉化為 Scene 3 虎林公園之純背景與技能氣候粒子。
* ❌ **料理火花拾取物 (Cooking Spark Pickup)**：已移除，轉化為珊卓澎炒鍋擊中怪物之打擊粒子。
* ❌ **Player.js 殘留變數清理**: `easyCards`, `waterShieldTimer`, `raindrops`, `cookingSparkTimer` 全數自建構函式與儲存狀態中清除。

---

### 二、通勤金幣 (Coin) 美術重繪與視覺規格

| 視覺屬性 | 舊版 (v9.0~v9.1) | v9.2.0 重繪正式版本 |
| :--- | :--- | :--- |
| **渲染尺寸** | 28 × 28px (過小、類似佔位黃點) | **48 × 48px** (厚實、顯眼且具重量感) |
| **圖騰設計** | 粗糙星形貼圖 | **外圍雙層拋光金屬倒角邊框**，中央雕刻 **「08」** 晨間通勤時計符號 |
| **動態幀數** | 靜態縮放 | **6 幀偽 3D 水平旋轉動態 (Front -> 3/4 -> Edge -> 3/4 Back)** |
| **光影特效** | 無 | 旋轉切角時帶有 **高光亮斑 (Specular Glint)** 與 **外圍金黃柔光光暈 (Gold Outer Glow)** |
| **機制規則** | 消耗解鎖或隨機增益 | **里程碑推動計數器 (不消耗)**：<br>• 15 幣：永久解鎖主角大招<br>• 30 幣：怪獸進化至 Phase 2<br>• 45 幣：主角覺醒第二型態<br>• 60 幣：Boss 狂暴盛開 |

---

### 三、晨光咖啡 (Coffee) 美術重繪與回復機制

| 視覺屬性 | 舊版 (v9.0~v9.1) | v9.2.0 重繪正式版本 |
| :--- | :--- | :--- |
| **渲染尺寸** | 32 × 32px | **46 × 56px** (符合真實外帶紙杯標準 4:5 比例) |
| **造形細節** | 泛用馬克杯圖示 | **深摩卡拿鐵雙層外帶紙杯**、深黑防溢杯蓋、牛皮紙隔熱杯套（印有 08 AM 通勤標識） |
| **動態效果** | 靜態浮動 | 杯口持續冒出 **3 縷半透明上升嫋嫋熱咖啡蒸氣動畫** (`yOffset` 正弦波微動) |
| **拾取反饋** | 普通綠十字 | 蒸氣化為 **綠金交織之晨光微粒**，若角色滿血則飄出 **「HP FULL」** 浮動標籤 |
| **回復數值** | 混亂或帶速度 Buff | **固定回復 25 HP** (上限為當前角色 maxHp)，**嚴格不提供移速 Buff 或無敵 Buff** |

---

### 四、自動化單元測試審計數據

* **道具陣列類型掃描**: `PlatformManager.items` 共配置 75 枚 Coin、14 杯 Coffee。
* **無效道具命中率**: `0 / 89` (100% 僅存在 `coin` 與 `coffee`)。
* **滿血拾取驗證**: 當 `player.hp === player.maxHp` 時拾取咖啡，`player.hp` 維持不變，移速計時器 `coffeeSpeedTimer === 0`，不產生任何隱藏加成。
