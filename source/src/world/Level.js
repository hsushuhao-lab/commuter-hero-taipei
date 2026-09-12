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
  { id: 4, name: '第五關：松德院區廣場', startX: 4800, endX: 5850, bg: 'assets/bg_hospital.jpg', rain: 0, tint: 'rgba(255, 249, 196, 0.06)' },
  { id: 5, name: '最終關：夢境巨花王 Arena', startX: 5800, endX: 7200, bg: 'assets/boss_arena_full.png', rain: 0, tint: 'rgba(240, 98, 146, 0.15)' }
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

    // --- STAGE 1: 象山站 2 號出口 (0 ~ 1200) ---
    // Continuous ground with step-ups
    this.pm.addPlatform(0, groundY, 1300, 40, 'stone');
    // Elevated platforms
    this.pm.addPlatform(350, 440, 160, 24, 'brick');
    this.pm.addPlatform(620, 360, 180, 24, 'brick');
    this.pm.addPlatform(900, 430, 170, 24, 'brick');

    // Collectibles
    this.pm.addItem('coin', 220, groundY - 30);
    this.pm.addItem('coin', 430, 400);
    this.pm.addItem('coffee', 710, 320);
    this.pm.addItem('coin', 980, 390);

    // Monsters
    this.monsters.push(new Monster('red', 500, groundY));
    this.monsters.push(new Monster('blue', 820, groundY));

    // --- STAGE 2: 信義路 150 巷 (1200 ~ 2400) ---
    this.pm.addPlatform(1280, groundY, 1200, 40, 'stone');
    this.pm.addPlatform(1450, 420, 180, 24, 'brick');
    this.pm.addPlatform(1740, 350, 150, 24, 'brick');
    this.pm.addPlatform(1980, 430, 160, 24, 'brick');
    this.pm.addPlatform(2200, 370, 160, 24, 'brick');

    this.pm.addItem('coin', 1520, 380);
    this.pm.addItem('easycard', 1810, 310);
    this.pm.addItem('coin', 2050, 390);
    this.pm.addItem('heart', 2280, 330);

    this.monsters.push(new Monster('grape', 1600, groundY - 40));
    this.monsters.push(new Monster('ice', 1900, groundY));
    this.monsters.push(new Monster('yellow', 2250, groundY));

    // --- STAGE 3: 雨中虎林公園 (2400 ~ 3600) ---
    this.pm.addPlatform(2450, groundY, 1200, 40, 'stone');
    this.pm.addPlatform(2600, 430, 170, 24, 'brick');
    this.pm.addPlatform(2880, 360, 190, 24, 'brick');
    this.pm.addPlatform(3180, 420, 160, 24, 'brick');
    this.pm.addPlatform(3400, 350, 180, 24, 'brick');

    this.pm.addItem('coin', 2680, 390);
    this.pm.addItem('coin', 2970, 320);
    this.pm.addItem('coffee', 3260, 380);
    this.pm.addItem('coin', 3490, 310);

    this.monsters.push(new Monster('blue', 2750, groundY));
    this.monsters.push(new Monster('pink', 3050, groundY - 60));
    this.monsters.push(new Monster('obsidian', 3350, groundY));

    // --- STAGE 4: 松德山城坡道 (3600 ~ 4800) ---
    this.pm.addPlatform(3620, groundY, 1250, 40, 'stone');
    this.pm.addPlatform(3800, 430, 160, 24, 'brick');
    this.pm.addPlatform(4060, 350, 170, 24, 'brick');
    this.pm.addPlatform(4320, 420, 180, 24, 'brick');
    this.pm.addPlatform(4580, 340, 170, 24, 'brick');

    this.pm.addItem('easycard', 3880, 390);
    this.pm.addItem('coin', 4140, 310);
    this.pm.addItem('heart', 4410, 380);
    this.pm.addItem('coin', 4660, 300);

    this.monsters.push(new Monster('red', 3950, groundY));
    this.monsters.push(new Monster('yellow', 4200, groundY));
    this.monsters.push(new Monster('obsidian', 4500, groundY));
    this.monsters.push(new Monster('pink', 4720, groundY - 60));

    // --- STAGE 5: 松德院區廣場 (4800 ~ 5800) ---
    this.pm.addPlatform(4820, groundY, 1050, 40, 'stone');
    this.pm.addPlatform(5020, 430, 180, 24, 'brick');
    this.pm.addPlatform(5300, 360, 200, 24, 'brick');

    this.pm.addItem('coin', 5110, 390);
    this.pm.addItem('coffee', 5400, 320);

    // Songde Entrance Clock-In Machine before Arena!
    this.pm.setClockInMachine(5650, groundY);

    this.monsters.push(new Monster('grape', 5150, groundY - 40));
    this.monsters.push(new Monster('ice', 5450, groundY));

    // --- STAGE 6: 夢境巨花王 ARENA (5800 ~ 7200) ---
    // 嚴格規範：1400px 連續、100% 平整、無洞地板！
    this.pm.addPlatform(5800, groundY, 1400, 60, 'stone');

    // Two tactical floating platforms for combat maneuvering
    this.pm.addPlatform(6150, 410, 190, 24, 'brick');
    this.pm.addPlatform(6600, 410, 190, 24, 'brick');

    this.pm.addItem('heart', 6245, 370);
    this.pm.addItem('coin', 6695, 370);
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
