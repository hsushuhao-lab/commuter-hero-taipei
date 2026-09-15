# 《08點上班大作戰：通勤英雄篇》
## —— 象山晨衝・奔向松德（v9.8.4 PI Candidate）——

一款以台北晨間通勤為舞台的 Q 版 2D 橫向動作遊戲。從象山出發，在 08:00 前突破通勤怪獸與雙階段「夢影巨花王」，選擇速度、火力與技能定位各異的三位英雄，最後衝進松德院區完成三人打卡。

> **🌐 即時公開版**：https://hsushuhao-lab.github.io/commuter-hero-taipei/
>
> **📦 GitHub**：https://github.com/hsushuhao-lab/commuter-hero-taipei

---

## v9.8.4 核心更新

- **速度定位**：Yu `370` > Sandra `345` > Shakira `320`。
- **小招火力**：Shakira `2×40 = 80` > Sandra `60` > Yu `18`。
- **小招 CD**：Yu `0.10s`；Sandra `0.40s`；Shakira `0.40s`。
- **大招強度**：Sandra `560` > Yu `516` > Shakira `483`。
- **大招 CD**：Sandra `7.5s`；Yu `6.0s`；Shakira `6.0s`。
- **Yu 大招**：改為 3 waves × 4 umbrella-wave fronts，呈現連續風浪式推進。
- **Shakira 大招**：改為 3 waves × 7 eggs，共 21 顆多層次蛋雨。
- **Victory Run**：修正 selected hero 重複 render，固定為 1 位主角 + 2 位 companions。
- **HUD**：Pause 移至右側 16px margin，避免擋住資訊。
- **Boss**：P1 interval `0.82s` / cap `28`；P2 interval `0.36s` / cap `56`，提升密度與華麗度，同時保留 telegraph 與 safe gap。

## 目前狀態

本版依 two-strike 規則發布為：

```text
V9_8_4_PI_DECISION_REQUIRED
```

已知限制：Shakira automated full-route 仍可能出現 `GAMEOVER`，因此 v9.8.4 交由 PI 實機試玩決定是否接受、回退或進入下一版調整。

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
- v9.8.4 提升彈幕 cadence / density 與視覺層次，但保留 telegraph 與 safe sectors。

---

## QA / Debug

使用：

```text
?qa=1&v=9.8.4
```

並可在 browser console 執行：

```js
debugRuntime()
```

確認 build identity、角色速度、技能數值、Victory hero count 與 Boss density。

---

## Release policy

本專案以 PI 實機驗收優先。若 automated gate 與實際遊玩體感衝突，以可重現的 runtime evidence 與 PI manual QA 作為下一版調整依據。
