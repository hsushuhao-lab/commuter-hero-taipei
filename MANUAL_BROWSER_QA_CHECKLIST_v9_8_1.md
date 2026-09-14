# v9.8.1 Manual Browser QA Checklist

版本：v9.8.1
Local checkpoint：4ce4edd
試玩分支：codex/v9.8.1-release

本文件是 PI 試玩驗收清單。完成前狀態維持 `MANUAL_BROWSER_QA_REQUIRED`，不代表 production verified。

## 測試方式

1. 從 GitHub 取得 `codex/v9.8.1-release` 分支的 `index.html`，或在 repo root 執行 `py -m http.server 8000`。
2. 使用 Chrome 或 Edge 開啟 `http://localhost:8000/`，不要使用 `file://`。
3. 逐項填寫 PASS / FAIL，並記錄瀏覽器、裝置與任何 console error。

## Desktop 1280 x 720

- [ ] Opening 13.5 秒正常
- [ ] Skip 與 Character Select 正常
- [ ] Yu 往右跑不是 moonwalk，往左鏡像正確
- [ ] Shakira 與 Sandra 方向、技能與角色一致
- [ ] Boss P1：Petal Fan、Dream Bubble、Vine Whip 可見且有預警
- [ ] Boss P2：Petal Storm、Bubble Bloom、Triple Vine、Crossfire、Bloom Burst 可見
- [ ] Bubble 分裂前有預警，safe gap / safe sector 可辨識
- [ ] Sandra P2 大招不會一招擊殺 Boss
- [ ] Boss death、三次打卡、勝利流程正常
- [ ] DevTools：0 uncaught exception、0 fatal asset-load error

## Mobile 375 x 667

- [ ] Opening、選角與 Q 版角色無裁切
- [ ] 左下 joystick 可實際控制
- [ ] Jump / Dash / Skill / Ult 不互相遮擋
- [ ] Pause、Retry、Home 可用
- [ ] Boss telegraph 可看懂，彈幕不完全遮滿畫面
- [ ] Victory 畫面正常

## Tablet 768 x 1024

- [ ] HUD、選角、Boss arena、Q 版動畫與 Victory 排版正常

## PI 結果

- 瀏覽器 / 裝置：
- 測試日期：
- 結果：PENDING
- Console errors：
- 備註：
