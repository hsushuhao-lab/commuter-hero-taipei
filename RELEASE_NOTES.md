# 《08點上班大作戰：通勤英雄篇》Release Notes

## v9.8.5 — PRODUCTION VERIFIED / FROZEN
**日期：2026-09-15**

v9.8.5 是以 PI 已接受的 v9.8.4 為基準之最小修補版；未重新平衡角色、Boss 或美術。

### 修正
- Shakira 大招可於 Boss encounter 前完整施放；無鄰近怪物時落於角色面向前方局部戰區。
- Shakira 大招維持 3 waves × 7 eggs，共 21 eggs。
- Boss 擊倒後保留 selected hero + 2 companions；三人完成 Victory Run、打卡與最終歡呼。
- 舊版 QA、recovery、prompt、audit 與舊規格文件集中到 `archive/`。

### 已接受平衡（v9.8.5 不變）
- Speed: Yu 370 > Sandra 345 > Shakira 320
- Small attack: Shakira 80 > Sandra 60 > Yu 18
- Small attack CD: Yu 0.10s; Sandra 0.40s; Shakira 0.40s
- Ultimate nominal: Sandra 560 > Yu 516 > Shakira 483
- Ultimate CD: Sandra 7.5s; Yu 6.0s; Shakira 6.0s
- Boss: P1 HP 3600; P2 HP 3050; P1 interval 0.82s / cap 28; P2 interval 0.36s / cap 56

### PI acceptance
2026-09-15：PI browser 實機驗收確認兩項回報 bug 均已消失，正式接受 v9.8.5。

`V9_8_5_PRODUCTION_VERIFIED`

後續功能或玩法調整請另開下一版本，不直接改寫本 freeze。
