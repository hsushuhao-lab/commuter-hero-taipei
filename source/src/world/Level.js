/**
 * 08點上班大作戰：通勤英雄篇 - 六大關卡與無縫 Parallax 卷軸 (Level.js)
 * 規格遵循：
 * 1. 象山站 2 號出口 (0 ~ 1200)
 * 2. 信義路 150 巷永和豆漿 (1200 ~ 2400)
 * 3. 雨中虎林公園 (2400 ~ 3600) - 降雨粒子與冷色溫
 * 4. 通往松德山城坡道 (3600 ~ 4800) - 石牆坡道
 * 5. 松德院區廣場 (4800 ~ 5800) - 開闊院區與打卡點
 * 6. 夢境巨花王 Arena (5800 ~ 7200) - 嚴格 1400px 平整決戰場
 * - 350px 漸變無縫 Transition Zones (色溫、雨量、Alpha 混合)
 */

import { particles } from '../entities/Particles.js';
import { Monster } from '../entities/Monster.js';

export const STAGES = [
  { id: 0, name: '第一關：象山站 2 號出口', startX: 0, endX: 1250, bg: 'assets/bg_station.jpg', rain: 0, tint: 'rgba(255, 236, 179, 0.08)' },
  { id: 1, name: '第二關：信義路 150 巷永和豆漿', startX: 1200, endX: 2450, bg: 'assets/bg_lane.jpg', rain: 0, tint: 'rgba(255, 224, 178, 0.05)' },
  { id: 2, name: '第三關：雨中虎林公園', startX: 2400, endX: 3650, bg: 'assets/bg_hulin_park.jpg', rain: 1.0, tint: 'rgba(129, 212, 250, 0.12)' },
  { id: 3, name: '第四關：通往松德山城坡道', startX: 3600, endX: 4850, bg: 'assets/bg_slope.jpg', rain: 0.1, tint: 'rgba(176, 190, 197, 0.08)' },
  { id: 4, name: '第五關：松德院區林蔭步道', startX: 4800, endX: 5850, bg: 'assets/bg_hospital.jpg', rain: 0, tint: 'rgba(255, 249, 196, 0.06)' },
  { id: 5, name: '最終關：松德院區大門前・決戰巨花王', startX: 5800, endX: 7200, bg: 'assets/bg_hospital.jpg', rain: 0, tint: 'rgba(233, 30, 99, 0.10)' }
];

export class Level {
  constructor(platformManager) {
    this.pm = platformManager;
    this.totalLength = 7200;
    this.monsters = [];
    this.bgImages = {};

    this.loadBackgrounds();
    this.buildLevelGeometry();
  }

  loadBackgrounds() {
    STAGES.forEach(stg => {
      const img = new Image();
      img.src = stg.bg;
      this.bgImages[stg.id] = img;
    });
  }

  buildLevelGeometry() {
    this.pm.reset();
    this.monsters = [];

    const groundY = 560;

    // ==========================================
    // --- STAGE 1: 象山站 2 號出口 (0 ~ 1200) ---
    // ==========================================
    this.pm.addPlatform(0, groundY, 1300, 40, 'stone');

    // 階梯磚頭平台 (Stair bricks)
    this.pm.addPlatform(320, 460, 140, 24, 'brick');
    this.pm.addPlatform(480, 390, 150, 24, 'brick');
    this.pm.addPlatform(660, 320, 160, 24, 'brick');
    this.pm.addPlatform(880, 410, 170, 24, 'brick');
    this.pm.addPlatform(1070, 340, 150, 24, 'brick');

    // 豐厚金幣與道具（迅速滿足 6 枚大招門檻）
    this.pm.addItem('coin', 220, groundY - 30);
    this.pm.addItem('coin', 390, 420);
    this.pm.addItem('easycard', 550, 350); // +3 coins!
    this.pm.addItem('coffee', 740, 280);   // speed boost!
    this.pm.addItem('coin', 950, 370);
    this.pm.addItem('coin', 1140, 300);

    // 怪物隨機分布：地面、階梯磚頭、天上降落
    this.monsters.push(new Monster('red', 420, groundY));
    this.monsters.push(new Monster('blue', 550, 390)); // 階梯上
    this.monsters.push(new Monster('pink', 740, 320, true)); // 天上降落
    this.monsters.push(new Monster('yellow', 960, 410)); // 階梯上
    this.monsters.push(new Monster('ice', 1150, groundY));

    // ==========================================
    // --- STAGE 2: 信義路 150 巷永和豆漿 (1200 ~ 2400) ---
    // ==========================================
    this.pm.addPlatform(1280, groundY, 1200, 40, 'stone');

    // 連續雙層階梯磚頭
    this.pm.addPlatform(1400, 450, 150, 24, 'brick');
    this.pm.addPlatform(1580, 370, 160, 24, 'brick');
    this.pm.addPlatform(1760, 430, 150, 24, 'brick');
    this.pm.addPlatform(1940, 340, 170, 24, 'brick');
    this.pm.addPlatform(2140, 410, 160, 24, 'brick');
    this.pm.addPlatform(2320, 330, 150, 24, 'brick');

    this.pm.addItem('coin', 1470, 410);
    this.pm.addItem('easycard', 1660, 330); // +3 coins!
    this.pm.addItem('heart', 1830, 390);
    this.pm.addItem('coin', 2020, 300);
    this.pm.addItem('coffee', 2220, 370);
    this.pm.addItem('coin', 2390, 290);

    this.monsters.push(new Monster('grape', 1500, groundY - 30));
    this.monsters.push(new Monster('red', 1660, 370)); // 磚頭上
    this.monsters.push(new Monster('blue', 1850, groundY));
    this.monsters.push(new Monster('grape', 2020, 340, true)); // 天空降落
    this.monsters.push(new Monster('obsidian', 2240, groundY)); // 重怪
    this.monsters.push(new Monster('yellow', 2390, 330)); // 高台

    // ==========================================
    // --- STAGE 3: 雨中虎林公園 (2400 ~ 3600) ---
    // ==========================================
    this.pm.addPlatform(2450, groundY, 1200, 40, 'stone');

    // 公園高低木質磚塊階梯
    this.pm.addPlatform(2580, 440, 160, 24, 'brick');
    this.pm.addPlatform(2760, 360, 170, 24, 'brick');
    this.pm.addPlatform(2950, 420, 160, 24, 'brick');
    this.pm.addPlatform(3140, 330, 180, 24, 'brick');
    this.pm.addPlatform(3340, 410, 160, 24, 'brick');
    this.pm.addPlatform(3520, 340, 160, 24, 'brick');

    this.pm.addItem('coin', 2660, 400);
    this.pm.addItem('easycard', 2840, 320);
    this.pm.addItem('coffee', 3030, 380);
    this.pm.addItem('coin', 3220, 290);
    this.pm.addItem('heart', 3420, 370);

    this.monsters.push(new Monster('blue', 2660, 440)); // 階梯上
    this.monsters.push(new Monster('pink', 2840, groundY, true)); // 天空空降
    this.monsters.push(new Monster('ice', 3000, groundY));
    this.monsters.push(new Monster('red', 3220, 330)); // 高台射擊手
    this.monsters.push(new Monster('yellow', 3420, 410));
    this.monsters.push(new Monster('obsidian', 3550, groundY));

    // ==========================================
    // --- STAGE 4: 松德山城坡道 (3600 ~ 4800) ---
    // ==========================================
    this.pm.addPlatform(3620, groundY, 1250, 40, 'stone');

    // 山城坡道多段石階
    this.pm.addPlatform(3750, 450, 150, 24, 'brick');
    this.pm.addPlatform(3930, 380, 160, 24, 'brick');
    this.pm.addPlatform(4120, 440, 150, 24, 'brick');
    this.pm.addPlatform(4300, 350, 170, 24, 'brick');
    this.pm.addPlatform(4490, 420, 160, 24, 'brick');
    this.pm.addPlatform(4680, 340, 170, 24, 'brick');

    this.pm.addItem('coin', 3820, 410);
    this.pm.addItem('easycard', 4010, 340);
    this.pm.addItem('heart', 4200, 400);
    this.pm.addItem('coin', 4380, 310);
    this.pm.addItem('coffee', 4570, 380);
    this.pm.addItem('coin', 4760, 300);

    this.monsters.push(new Monster('red', 3820, 450)); // 階梯上
    this.monsters.push(new Monster('blue', 4010, groundY));
    this.monsters.push(new Monster('pink', 4200, 380, true)); // 空降俯衝
    this.monsters.push(new Monster('grape', 4380, 350)); // 懸空射手
    this.monsters.push(new Monster('obsidian', 4550, groundY));
    this.monsters.push(new Monster('ice', 4740, 340));

    // ==========================================
    // --- STAGE 5: 松德院區林蔭步道 (4800 ~ 5800) ---
    // ==========================================
    this.pm.addPlatform(4820, groundY, 1050, 40, 'stone');

    this.pm.addPlatform(4980, 440, 160, 24, 'brick');
    this.pm.addPlatform(5180, 370, 180, 24, 'brick');
    this.pm.addPlatform(5400, 430, 170, 24, 'brick');
    this.pm.addPlatform(5600, 350, 180, 24, 'brick');

    this.pm.addItem('coin', 5060, 400);
    this.pm.addItem('easycard', 5260, 330);
    this.pm.addItem('coffee', 5480, 390);
    this.pm.addItem('heart', 5680, 310);

    this.monsters.push(new Monster('yellow', 5060, 440));
    this.monsters.push(new Monster('pink', 5260, 370, true)); // 天降
    this.monsters.push(new Monster('grape', 5450, groundY - 30));
    this.monsters.push(new Monster('obsidian', 5620, groundY));

    // ==========================================
    // --- STAGE 6: 決戰松德院區大門前 (5800 ~ 7200) ---
    // ==========================================
    // 嚴格規範：1400px 連續、100% 平整、無洞地板！
    this.pm.addPlatform(5800, groundY, 1400, 60, 'stone');

    // 戰術浮動階梯平台
    this.pm.addPlatform(6080, 410, 180, 24, 'brick');
    this.pm.addPlatform(6350, 340, 180, 24, 'brick');
    this.pm.addPlatform(6620, 410, 180, 24, 'brick');

    this.pm.addItem('heart', 6160, 370);
    this.pm.addItem('coin', 6430, 300);
    this.pm.addItem('heart', 6700, 370);

    // ★ 松德院區打卡機（圖片自行生成，設立於決戰地點松德院區大門右側）★
    this.pm.setClockInMachine(7050, groundY);
  }

  getCurrentStage(x) {
    for (let stg of STAGES) {
      if (x >= stg.startX && x <= stg.endX) {
        return stg;
      }
    }
    return STAGES[STAGES.length - 1];
  }

  update(dt, player, camera) {
    const curStage = this.getCurrentStage(player.x);

    // Dynamic Weather Transitions
    if (curStage.rain > 0) {
      particles.emitRain(camera.x, camera.viewportWidth, camera.viewportHeight, curStage.rain);
    }
    // Ambient floating petals in stage 1, 5, 6
    if ([0, 4, 5].includes(curStage.id) && Math.random() < 0.25) {
      particles.emitPetals(camera.x, camera.viewportWidth, 1);
    }

    // Update active monsters
    for (let m of this.monsters) {
      // Update when within 600px of camera
      if (Math.abs(m.x - player.x) < 700) {
        m.update(dt, player);
      }
    }
  }

  renderBackgrounds(ctx, camera) {
    const vw = camera.viewportWidth;
    const vh = camera.viewportHeight;

    // 3-Layer Parallax Scrolling
    for (let stg of STAGES) {
      // Stage visibility range including 350px seamless transition overlap
      const stageStart = stg.startX - 350;
      const stageEnd = stg.endX + 350;

      if (camera.x + vw < stageStart || camera.x > stageEnd) continue;

      // Calculate smooth cross-fade alpha
      let alpha = 1.0;
      if (camera.x < stg.startX) {
        alpha = Math.max(0, (camera.x + vw - stg.startX + 350) / 700);
      } else if (camera.x + vw > stg.endX) {
        alpha = Math.max(0, (stg.endX + 350 - camera.x) / 700);
      }
      alpha = Math.max(0, Math.min(1.0, alpha));

      const img = this.bgImages[stg.id];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;

        // Far layer (parallax scroll factor 0.35)
        const parallaxX = (stg.startX - camera.x * 0.35) % vw;
        ctx.drawImage(img, parallaxX - vw, 0, vw * 2, vh);
        ctx.drawImage(img, parallaxX + vw, 0, vw * 2, vh);

        // Color temperature atmosphere tint
        ctx.fillStyle = stg.tint;
        ctx.fillRect(0, 0, vw, vh);

        ctx.restore();
      }
    }
  }

  renderMonsters(ctx, camera) {
    for (let m of this.monsters) {
      if (m.x + 80 < camera.x || m.x - 80 > camera.x + camera.viewportWidth) continue;
      m.render(ctx);
    }
  }
}
