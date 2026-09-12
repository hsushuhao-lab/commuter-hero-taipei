/**
 * 08點上班大作戰：通勤英雄篇 - 六大關卡與無縫 Parallax 卷軸 (Level.js)
 * 起點：象山捷運站 2 號出口 (x = 200)
 * 終點：松德醫院院內打卡機 (x = 13800)
 * 總長度：14,400px
 * 
 * 6 大場景：
 * 1. 象山捷運站 2 號出口 (0 ~ 2400)
 * 2. 信義路 150 巷永和豆漿晨光街區 (2400 ~ 4800)
 * 3. 雨中虎林公園青綠步道 (4800 ~ 7200) - 降雨與水滴
 * 4. 通往松德山城微雨石壁坡道 (7200 ~ 9600) - 捷運幽靈登場
 * 5. 松德院區正門廣場・決戰巨花王 (9600 ~ 12400) - 10600~12000 平整決戰場
 * 6. 松德醫院院內挑高明亮大廳・準時打卡機 (12400 ~ 14400)
 */

import { particles } from '../entities/Particles.js';
import { Monster } from '../entities/Monster.js';

export const STAGES = [
  { id: 0, name: '第一關：象山捷運站 2 號出口', startX: 0, endX: 2450, bg: 'assets/bg_station.jpg', rain: 0, tint: 'rgba(255, 236, 179, 0.08)' },
  { id: 1, name: '第二關：信義路 150 巷晨光街區', startX: 2400, endX: 4850, bg: 'assets/bg_lane.jpg', rain: 0, tint: 'rgba(255, 224, 178, 0.05)' },
  { id: 2, name: '第三關：雨中虎林公園步道', startX: 4800, endX: 7250, bg: 'assets/bg_hulin_park.jpg', rain: 1.0, tint: 'rgba(129, 212, 250, 0.12)' },
  { id: 3, name: '第四關：通往松德山城微雨坡道', startX: 7200, endX: 9650, bg: 'assets/bg_slope.jpg', rain: 0.15, tint: 'rgba(176, 190, 197, 0.08)' },
  { id: 4, name: '第五關：松德院區正門廣場・決戰巨花王', startX: 9600, endX: 12450, bg: 'assets/bg_hospital.jpg', rain: 0, tint: 'rgba(233, 30, 99, 0.10)' },
  { id: 5, name: '第六關：松德醫院院內大廳・準時打卡處', startX: 12400, endX: 14400, bg: 'assets/bg_hospital_interior.jpg', rain: 0, tint: 'rgba(255, 249, 196, 0.05)' }
];

export class Level {
  constructor(platformManager) {
    this.pm = platformManager;
    this.totalLength = 14400;
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

    // ========================================================
    // --- STAGE 1: 象山捷運站 2 號出口 (0 ~ 2400) ---
    // ========================================================
    this.pm.addPlatform(0, groundY, 2500, 40, 'stone');

    // 階梯磚頭平台 (Stair bricks)
    this.pm.addPlatform(350, 460, 160, 24, 'brick');
    this.pm.addPlatform(560, 390, 160, 24, 'brick');
    this.pm.addPlatform(780, 320, 180, 24, 'brick');
    this.pm.addPlatform(1000, 410, 170, 24, 'brick');
    this.pm.addPlatform(1220, 340, 170, 24, 'brick');
    this.pm.addPlatform(1440, 420, 160, 24, 'brick');
    this.pm.addPlatform(1660, 350, 180, 24, 'brick');
    this.pm.addPlatform(1890, 430, 170, 24, 'brick');
    this.pm.addPlatform(2120, 360, 180, 24, 'brick');

    // 收集品分布（迅速累積金幣滿足 15 枚永久解鎖大招）
    this.pm.addItem('coin', 220, groundY - 30);
    this.pm.addItem('coin', 410, 420);
    this.pm.addItem('easycard', 620, 350); // +3
    this.pm.addItem('coffee', 840, 280);
    this.pm.addItem('raindrop', 1060, 370);
    this.pm.addItem('coin', 1280, 300);
    this.pm.addItem('cookingspark', 1500, 380);
    this.pm.addItem('easycard', 1720, 310); // +3
    this.pm.addItem('heart', 1950, 390);
    this.pm.addItem('coin', 2180, 320);

    // 怪物分布：地面、階梯、天空降落
    this.monsters.push(new Monster('red', 450, groundY));
    this.monsters.push(new Monster('blue', 620, 390)); // 階梯上
    this.monsters.push(new Monster('pink', 850, 320, true)); // 天降
    this.monsters.push(new Monster('yellow', 1060, 410));
    this.monsters.push(new Monster('ice', 1300, groundY));
    this.monsters.push(new Monster('blue', 1510, 420));
    this.monsters.push(new Monster('red', 1730, groundY));
    this.monsters.push(new Monster('pink', 1960, 350, true));
    this.monsters.push(new Monster('yellow', 2190, 360));

    // ========================================================
    // --- STAGE 2: 信義路 150 巷永和豆漿晨光街區 (2400 ~ 4800) ---
    // ========================================================
    this.pm.addPlatform(2450, groundY, 2450, 40, 'stone');

    this.pm.addPlatform(2560, 450, 160, 24, 'brick');
    this.pm.addPlatform(2780, 370, 170, 24, 'brick');
    this.pm.addPlatform(3000, 430, 160, 24, 'brick');
    this.pm.addPlatform(3220, 340, 180, 24, 'brick');
    this.pm.addPlatform(3440, 420, 170, 24, 'brick');
    this.pm.addPlatform(3660, 350, 170, 24, 'brick');
    this.pm.addPlatform(3880, 430, 160, 24, 'brick');
    this.pm.addPlatform(4100, 360, 180, 24, 'brick');
    this.pm.addPlatform(4320, 440, 160, 24, 'brick');
    this.pm.addPlatform(4540, 370, 170, 24, 'brick');

    this.pm.addItem('coin', 2620, 410);
    this.pm.addItem('easycard', 2840, 330); // +3 (達到 15+ 解鎖大招！)
    this.pm.addItem('heart', 3060, 390);
    this.pm.addItem('raindrop', 3280, 300);
    this.pm.addItem('coffee', 3500, 380);
    this.pm.addItem('coin', 3720, 310);
    this.pm.addItem('cookingspark', 3940, 390);
    this.pm.addItem('easycard', 4160, 320); // +3
    this.pm.addItem('coin', 4380, 400);
    this.pm.addItem('heart', 4600, 330);

    this.monsters.push(new Monster('grape', 2640, groundY - 30));
    this.monsters.push(new Monster('red', 2850, 370));
    this.monsters.push(new Monster('blue', 3070, groundY));
    this.monsters.push(new Monster('grape', 3290, 340, true));
    this.monsters.push(new Monster('obsidian', 3520, groundY)); // 重怪
    this.monsters.push(new Monster('yellow', 3730, 350));
    this.monsters.push(new Monster('pink', 3950, 430, true));
    this.monsters.push(new Monster('ice', 4170, 360));
    this.monsters.push(new Monster('blue', 4390, groundY));
    this.monsters.push(new Monster('obsidian', 4620, groundY));

    // ========================================================
    // --- STAGE 3: 雨中虎林公園青綠步道 (4800 ~ 7200) ---
    // ========================================================
    this.pm.addPlatform(4850, groundY, 2450, 40, 'stone');

    this.pm.addPlatform(4960, 440, 170, 24, 'brick');
    this.pm.addPlatform(5180, 360, 180, 24, 'brick');
    this.pm.addPlatform(5400, 430, 170, 24, 'brick');
    this.pm.addPlatform(5620, 340, 190, 24, 'brick');
    this.pm.addPlatform(5840, 420, 170, 24, 'brick');
    this.pm.addPlatform(6060, 350, 180, 24, 'brick');
    this.pm.addPlatform(6280, 430, 170, 24, 'brick');
    this.pm.addPlatform(6500, 350, 180, 24, 'brick');
    this.pm.addPlatform(6720, 420, 170, 24, 'brick');
    this.pm.addPlatform(6940, 360, 180, 24, 'brick');

    this.pm.addItem('raindrop', 5020, 400);
    this.pm.addItem('easycard', 5240, 320); // +3
    this.pm.addItem('coffee', 5460, 390);
    this.pm.addItem('coin', 5680, 300);
    this.pm.addItem('raindrop', 5900, 380);
    this.pm.addItem('cookingspark', 6120, 310);
    this.pm.addItem('easycard', 6340, 390); // +3 (達到 30+ 觸發怪獸二階段全體進化！)
    this.pm.addItem('heart', 6560, 310);
    this.pm.addItem('coin', 6780, 380);
    this.pm.addItem('raindrop', 7000, 320); // 3 滴雨滴獲取水盾！

    this.monsters.push(new Monster('blue', 5030, 440));
    this.monsters.push(new Monster('pink', 5250, groundY, true));
    this.monsters.push(new Monster('ice', 5470, groundY));
    this.monsters.push(new Monster('red', 5690, 340));
    this.monsters.push(new Monster('yellow', 5910, 420));
    this.monsters.push(new Monster('grape', 6130, 350, true));
    this.monsters.push(new Monster('obsidian', 6350, groundY));
    this.monsters.push(new Monster('ice', 6570, 350));
    this.monsters.push(new Monster('red', 6790, groundY));
    this.monsters.push(new Monster('pink', 7010, 360, true));

    // ========================================================
    // --- STAGE 4: 松德山城微雨坡道 (7200 ~ 9600) ---
    // ========================================================
    this.pm.addPlatform(7250, groundY, 2450, 40, 'stone');

    this.pm.addPlatform(7360, 450, 170, 24, 'brick');
    this.pm.addPlatform(7580, 370, 180, 24, 'brick');
    this.pm.addPlatform(7800, 430, 170, 24, 'brick');
    this.pm.addPlatform(8020, 340, 190, 24, 'brick');
    this.pm.addPlatform(8240, 420, 170, 24, 'brick');
    this.pm.addPlatform(8460, 350, 180, 24, 'brick');
    this.pm.addPlatform(8680, 430, 170, 24, 'brick');
    this.pm.addPlatform(8900, 360, 180, 24, 'brick');
    this.pm.addPlatform(9120, 430, 170, 24, 'brick');
    this.pm.addPlatform(9340, 360, 180, 24, 'brick');

    this.pm.addItem('easycard', 7420, 410); // +3
    this.pm.addItem('coin', 7640, 330);
    this.pm.addItem('cookingspark', 7860, 390);
    this.pm.addItem('easycard', 8080, 300); // +3
    this.pm.addItem('heart', 8300, 380);
    this.pm.addItem('coffee', 8520, 310);
    this.pm.addItem('easycard', 8740, 390); // +3
    this.pm.addItem('raindrop', 8960, 320);
    this.pm.addItem('coin', 9180, 390);
    this.pm.addItem('easycard', 9400, 320); // +3 (達到 45+ 覺醒主角第二型態！)

    // 第八怪獸「車票幽靈 / 悠遊卡寄靈」在此高頻出現
    this.monsters.push(new Monster('transit', 7430, groundY - 30));
    this.monsters.push(new Monster('red', 7650, 370));
    this.monsters.push(new Monster('blue', 7870, groundY));
    this.monsters.push(new Monster('obsidian', 8100, groundY));
    this.monsters.push(new Monster('transit', 8320, 340, true));
    this.monsters.push(new Monster('yellow', 8530, 350));
    this.monsters.push(new Monster('grape', 8750, 430));
    this.monsters.push(new Monster('ice', 8970, groundY));
    this.monsters.push(new Monster('pink', 9190, 360, true));
    this.monsters.push(new Monster('transit', 9410, groundY - 30));

    // ========================================================
    // --- STAGE 5: 松德院區正門廣場・決戰巨花王 (9600 ~ 12400) ---
    // ========================================================
    // 前導引道 (9600 ~ 10600)
    this.pm.addPlatform(9600, groundY, 1050, 40, 'stone');
    this.pm.addPlatform(9750, 440, 170, 24, 'brick');
    this.pm.addPlatform(9980, 360, 180, 24, 'brick');
    this.pm.addPlatform(10210, 420, 170, 24, 'brick');
    this.pm.addPlatform(10430, 350, 180, 24, 'brick');

    this.pm.addItem('easycard', 9800, 400); // +3
    this.pm.addItem('coffee', 10030, 320);
    this.pm.addItem('cookingspark', 10260, 380);
    this.pm.addItem('easycard', 10480, 310); // +3 (達到 60+ 觸發 Boss 提早狂暴 Phase 2)

    this.monsters.push(new Monster('obsidian', 9830, groundY));
    this.monsters.push(new Monster('transit', 10050, 360));
    this.monsters.push(new Monster('grape', 10270, 420));
    this.monsters.push(new Monster('blue', 10490, groundY));

    // ★ 決戰巨花王 Arena (10600 ~ 12000)：嚴格 1400px 平整無坑洞石板地板 ★
    this.pm.addPlatform(10600, groundY, 1450, 60, 'stone');

    // 戰術浮動高台（閃避 Boss 地刺與地面衝擊）
    this.pm.addPlatform(10880, 410, 180, 24, 'brick');
    this.pm.addPlatform(11200, 340, 180, 24, 'brick');
    this.pm.addPlatform(11520, 410, 180, 24, 'brick');

    this.pm.addItem('heart', 10920, 370);
    this.pm.addItem('easycard', 11240, 300);
    this.pm.addItem('cookingspark', 11560, 370);

    // 後廊通往醫院大門 (12000 ~ 12450)
    this.pm.addPlatform(12000, groundY, 500, 40, 'stone');

    // ========================================================
    // --- STAGE 6: 松德醫院院內挑高明亮大廳・最終打卡點 (12400 ~ 14400) ---
    // ========================================================
    // 醫院挑高大理石光潔地面
    this.pm.addPlatform(12400, groundY, 2050, 60, 'stone');

    // 迎賓花台與景觀台
    this.pm.addPlatform(12650, 450, 180, 24, 'brick');
    this.pm.addPlatform(12920, 380, 180, 24, 'brick');
    this.pm.addPlatform(13200, 450, 180, 24, 'brick');
    this.pm.addPlatform(13480, 380, 180, 24, 'brick');

    // 勝利凱旋步道金幣與能量補給
    this.pm.addItem('coin', 12700, 410);
    this.pm.addItem('easycard', 12970, 340);
    this.pm.addItem('coffee', 13150, groundY - 30);
    this.pm.addItem('coin', 13250, 410);
    this.pm.addItem('easycard', 13530, 340);
    this.pm.addItem('heart', 13680, groundY - 30);

    // ★ 松德醫院院內打卡機（終點：x = 13800，打敗 Boss 後奔入大廳打卡！）★
    this.pm.setClockInMachine(13800, groundY);
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
    // Ambient floating petals in stage 0, 4, 5
    if ([0, 4, 5].includes(curStage.id) && Math.random() < 0.25) {
      particles.emitPetals(camera.x, camera.viewportWidth, 1);
    }

    // Update active monsters
    for (let m of this.monsters) {
      // Update when within 750px of camera
      if (Math.abs(m.x - player.x) < 750) {
        m.update(dt, player);
      }
    }
  }

  renderBackgrounds(ctx, camera) {
    const vw = camera.viewportWidth;
    const vh = camera.viewportHeight;

    // 3-Layer Parallax Scrolling across 14400px
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
