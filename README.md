# 《08點上班大作戰：通勤英雄篇》
## —— 象山晨衝・奔向松德（v9.9.0 Dual Mood Preview）——

一款以台北晨間通勤為舞台的 Q 版 2D 橫向動作遊戲。從象山出發，在 08:00 前突破通勤怪獸與雙階段「夢影巨花王」，選擇速度、火力與技能定位各異的三位英雄，最後衝進松德院區完成三人打卡。

> **v9.9.0 開發中：Dual Mood Edition**
> 主畫面已新增 `☕ Chill Mood` 與 `🔥 Hard-Core` 模式入口。Hard-Core 完整繼承已驗收的 v9.8.5 gameplay；本次先完成模式選單與 runtime mode state，Chill 的實際難度 modifiers 尚未套用。

> **🌐 正式公開站**：https://hsushuhao-lab.github.io/commuter-hero-taipei/
>
> **📦 GitHub**：https://github.com/hsushuhao-lab/commuter-hero-taipei

---

## v9.8.5 修補範圍

v9.8.5 僅修正 v9.8.4 正式版的兩個 gameplay / victory-flow 問題，**不重新平衡角色與 Boss**：

- **Shakira 大招可在一般路段完整施放**：Boss 尚未進入 encounter 時，不再把未啟動 Boss 當作大招目標；沒有近距離怪物時，蛋雨會落在角色面向前方的局部戰區。
- **Shakira / 三人 Victory flow 保留完整**：Boss 擊倒後維持 selected hero + 2 companions，共 3 位不同英雄；進入最終 Victory 畫面後仍保留三人打卡／歡呼呈現。
- **舊版檔案已隔離**：歷史 QA、recovery、prompt、audit 與 v9.8.4 release artifacts 移入 `archive/`，不再混在 production root。
- **single authoritative build 不變**：`source/` + `assets/` → `scripts/build_single_file.py` → `index.html` / `dist/index.html`。

目前 runtime status：

```text
V9_8_5_PRODUCTION_VERIFIED
```

PI 已於 2026-09-15 完成 browser 實機驗收：Shakira 大招與三人 Victory flow 兩項 bug 均確認消失，v9.8.5 正式接受並 freeze。

---

## v9.8.4 已接受之角色平衡（v9.8.5 不變）

- **速度定位**：Yu `370` > Sandra `345` > Shakira `320`。
- **小招火力**：Shakira `2×40 = 80` > Sandra `60` > Yu `18`。
- **小招 CD**：Yu `0.10s`；Sandra `0.40s`；Shakira `0.40s`。
- **大招強度**：Sandra `560` > Yu `516` > Shakira `483`。
- **大招 CD**：Sandra `7.5s`；Yu `6.0s`；Shakira `6.0s`。
- **Yu 大招**：3 waves × 4 umbrella-wave fronts，連續風浪式推進。
- **Shakira 大招**：3 waves × 7 eggs，共 21 顆多層次蛋雨。
- **Boss**：P1 HP `3600`、P2 HP `3050`；P1 interval `0.82s` / cap `28`；P2 interval `0.36s` / cap `56`。

---

## 三位英雄

### Yu｜風之通勤者・準時守護者

- 速度：`370`
- 小招：雨傘機關槍，`18` damage，CD `0.10s`
- 大招：三波雨傘風浪，nominal `516`，CD `6.0s`
- 定位：最快移動、最高射速、持續壓制

### Shakira｜元氣甜心・美乃滋召喚師

- 速度：`320`
- 小招：蛋能雙彈，`2×40 = 80`，CD `0.40s`
- 大招：三波 21 顆蛋雨，nominal `483`，CD `6.0s`
- 定位：最高小招 burst、遠程 AoE、heal / shield utility

### Sandra｜熱血主廚・平底鍋戰神

- 速度：`345`
- 小招：平底鍋／鍋氣，`60` damage，CD `0.40s`
- 大招：14 枚高速飛鍋，nominal `560`，CD `7.5s`
- 定位：中速重擊、最高單次大招爆發

---

## Boss：夢影巨花王

- Phase 1 HP：`3600`
- Phase 2 HP：`3050`
- 攻擊：Petal Barrage、Dream Bubble、Vine Whip、Crossfire、Bloom Burst
- 維持 v9.8.4 已接受的 cadence / density、telegraph 與 safe sectors。

---

## QA / Debug

使用：

```text
?qa=1&v=9.8.5
```

並可在 browser console 執行：

```js
debugRuntime()
```

目前 v9.8.5 靜態／build QA：

```text
QA_V9_8_5/STATIC_RELEASE_QA.json
```

PI 實機驗收項目（2026-09-15：全部 PASS）：

1. 選 Shakira，在 Boss encounter 前累積 15 金幣並施放大招，確認 3 waves × 7 eggs 可完整出現。
2. 擊倒 Boss 後確認 Shakira 不消失。
3. Victory Run / 打卡 / 最終歡呼確認 `Yu + Shakira + Sandra` 各出現一次。
4. 確認角色傷害、速度、CD 與 Boss HP / density 未被改動。

---

## Archive policy

- `archive/releases/v9.8.4/`：上一個 PI 已接受正式版的 QA / recovery artifacts。
- `archive/legacy/`：更舊的 QA、audit、prompt、WIP 與歷史資料。
- production root 僅保留現行 source、assets、build、docs 與 `QA_V9_8_5/`。

## Release policy

本專案以 PI 實機驗收優先。Automated/static gate 用於找 regression，但版本正式接受仍以可重現的 browser runtime evidence 與 PI manual QA 為準。