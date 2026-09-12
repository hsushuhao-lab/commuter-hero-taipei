# 《08點上班大作戰：通勤英雄篇》部署與執行手冊 (DEPLOYMENT GUIDE)
**專案版本：v9.1.0 Route & Art Fidelity Edition**

> **🌐 即時公開試玩網址 (Live URL)**：[https://hsushuhao-lab.github.io/commuter-hero-taipei/](https://hsushuhao-lab.github.io/commuter-hero-taipei/)  
> **📦 GitHub 專案倉庫**：[https://github.com/hsushuhao-lab/commuter-hero-taipei](https://github.com/hsushuhao-lab/commuter-hero-taipei)

---

## 🖥️ 一、本機離線雙擊執行 (最推薦方式)

本專案經過純靜態單檔自給自足優化，**無需安裝任何環境或工具**：

1. 開啟檔案總管，進入專案目錄：
   ```
   c:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO
   ```
2. **直接用滑鼠雙擊 `index.html`**。
3. 任何現代瀏覽器（Google Chrome, Microsoft Edge, Safari, Firefox）即可直接開啟遊玩。
4. 全程無網路請求、無外部字型或音訊加載，保證 100% 離線可用！

---

## 🌐 二、本機 HTTP 伺服器啟動 (可選)

如欲在區網內透過手機 Wi-Fi 連線測試，可使用 Python 快速架設本機伺服器：

```bash
# 進入發行目錄
cd c:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO

# 啟動 Python 輕量伺服器
python -m http.server 8080
```
開啟瀏覽器訪問：
```
http://localhost:8080
```
或手機連入相同區域網路，訪問電腦的區域 IP：
```
http://[Your-PC-IP]:8080
```

---

## ☁️ 三、公開網頁部署 (Netlify / GitHub Pages / Vercel)

### 1. Netlify 拖曳即部署 (Zero-Config Drag & Drop)
1. 登入 [Netlify App](https://app.netlify.com/)。
2. 將 `08workbattle-v8_0-COMMUTER-HERO/` 目錄，或打包產出的 `WEB-SHARE.zip` 解壓縮資料夾，直接拖曳至 Netlify 網頁的「Drop site here」區域。
3. 系統將於 3 秒內自動完成部署，並產生專屬公開試玩 URL（如 `https://commuter-hero-taipei.netlify.app`）。

### 2. GitHub Pages 部署
1. 將本專案推送至 GitHub Repository。
2. 於倉庫進入 **Settings** → **Pages**。
3. 在 **Branch** 選擇 `main` 分支與 `/root` 或 `/dist` 目錄，點擊 **Save**。
4. 稍候 1 分鐘即可取得 GitHub Pages 公開網址。

### 3. Vercel 部署
1. 安裝或執行 Vercel CLI：
   ```bash
   npx vercel --prod
   ```
2. 依照提示確認目錄，即可瞬間完成靜態網站全球 CDN 部署。

---

## 📱 四、跨平台與螢幕相容性驗證

- **桌機螢幕**：以標準 16:9 比例置中縮放，支援 1920×1080、2K、4K 抗鋸齒平滑渲染。
- **行動裝置**：
  - 當手機為直向螢幕時，自動顯示「📱 ↻ 請旋轉手機為橫向螢幕」提示遮罩。
  - 旋轉為橫向後，自動啟用半透明虛擬觸控按鍵（左側方向鍵、右側跳躍/小招/大招按鈕），支援多點觸控。
