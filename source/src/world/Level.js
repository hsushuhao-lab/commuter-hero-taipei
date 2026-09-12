/**
 * 08點上班大作戰：通勤英雄篇 - 五大主場景與無縫 Parallax 卷軸 (Level.js)
 * 起點：象山捷運站 2 號出口 (x = 200)
 * 終點：松德醫院院內大廳打卡機 (x = 17650)
 * 總長度：18,000px
 * 
 * 5 大主場景：
 * 1. Scene 1: 象山捷運站與出口周邊 (0 ~ 3500) - 晨光破曉、遠眺 101、出站階梯
 * 2. Scene 2: 信義街廓／巷弄通勤段 (3500 ~ 7000) - 永和豆漿晨光街區、騎樓平台
 * 3. Scene 3: 公園／綠帶雨景段 (7000 ~ 10500) - 雨中虎林公園、落雨粒子與薄霧
 * 4. Scene 4: 通往松德的坡道段 (10500 ~ 14000) - 陡坡石階、山坡階層平台、捷運寄靈現身
 * 5. Scene 5: 松德院區 (14000 ~ 18000)
 *    - 14000 ~ 14800: 松德院區外部前庭引道
 *    - 14800 ~ 16500: ★ 夢影巨花王 Boss Arena (1700px 連續平整無坑地板) ★
 *    - 16500 ~ 18000: 松德醫院院內挑高大廳 (室內無縫漸變)
 *    - x = 17650: 實體打卡機終點
 */

import { particles } from '../entities/Particles.js';
import { Monster } from '../entities/Monster.js';

export const STAGES = [
  { 
    id: 0, 
    name: 'Scene 1: 象山捷運站與出口周邊', 
    startX: 0, 
    endX: 3500, 
    bg: 'assets/bg_station.jpg', 
    rain: 0, 
    tint: 'rgba(255, 236, 179, 0.08)' 
  },
  { 
    id: 1, 
    name: 'Scene 2: 信義街廓／巷弄通勤段', 
    startX: 3500, 
    endX: 7000, 
    bg: 'assets/bg_lane.jpg', 
    rain: 0, 
    tint: 'rgba(255, 224, 178, 0.05)' 
  },
  { 
    id: 2, 
    name: 'Scene 3: 公園／綠帶雨景段', 
    startX: 7000, 
    endX: 10500, 
    bg: 'assets/bg_hulin_park.jpg', 
    rain: 1.0, 
    tint: 'rgba(129, 212, 250, 0.12)' 
  },
  { 
    id: 3, 
    name: 'Scene 4: 通往松德的坡道段', 
    startX: 10500, 
    endX: 14000, 
    bg: 'assets/bg_slope.jpg', 
    rain: 0.15, 
    tint: 'rgba(176, 190, 197, 0.08)' 
  },
  { 
    id: 4, 
    name: 'Scene 5: 松德院區', 
    startX: 14000, 
    endX: 18000, 
    bg: 'assets/bg_hospital.jpg', 
    interiorBg: 'assets/bg_hospital_interior.jpg', 
    rain: 0, 
    tint: 'rgba(233, 30, 99, 0.08)' 
  }
];

export class Level {
  constructor(platformManager) {
    this.pm = platformManager;
    this.totalLength = 18000;
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
      if (stg.interiorBg) {
        const interiorImg = new Image();
        interiorImg.src = stg.interiorBg;
        this.bgImages['interior'] = interiorImg;
      }
    });
  }

  buildLevelGeometry() {
    this.pm.reset();
    this.monsters = [];

    const groundY = 560;

    // ========================================================
    // --- SCENE 1: 象山捷運站與出口周邊 (0 ~ 3500) ---
    // ========================================================
    // 地面平坦基底
    this.pm.addPlatform(0, groundY, 3550, 40, 'stone');

    // 磚塊高台與捷運站階梯
    this.pm.addPlatform(360, 460, 170, 24, 'brick');
    this.pm.addPlatform(620, 390, 170, 24, 'brick');
    this.pm.addPlatform(880, 320, 180, 24, 'brick');
    this.pm.addPlatform(1150, 410, 170, 24, 'brick');
    this.pm.addPlatform(1420, 340, 180, 24, 'brick');
    this.pm.addPlatform(1690, 430, 170, 24, 'brick');
    this.pm.addPlatform(1960, 350, 180, 24, 'brick');
    this.pm.addPlatform(2240, 420, 170, 24, 'brick');
    this.pm.addPlatform(2520, 340, 180, 24, 'brick');
    this.pm.addPlatform(2800, 420, 170, 24, 'brick');
    this.pm.addPlatform(3080, 350, 180, 24, 'brick');
    this.pm.addPlatform(3340, 430, 170, 24, 'brick');

    // 道具配置：15 枚金幣（達成 15 幣解鎖大招）+ 2 杯咖啡 (+25 HP)
    [220, 410, 630, 900, 1160, 1430, 1700, 1970, 2250, 2530, 2810, 3090, 3250, 3360, 3450].forEach((cx, idx) => {
      const cy = (idx % 2 === 0) ? groundY - 30 : 320;
      this.pm.addItem('coin', cx, cy);
    });
    this.pm.addItem('coffee', 1000, 370);
    this.pm.addItem('coffee', 2350, groundY - 30);

    // 怪物分布：平地、高台、天空
    this.monsters.push(new Monster('red', 480, groundY));
    this.monsters.push(new Monster('blue', 630, 390));     // 高台
    this.monsters.push(new Monster('pink', 900, 320, true)); // 天降
    this.monsters.push(new Monster('yellow', 1160, 410));  // 高台
    this.monsters.push(new Monster('red', 1450, groundY));
    this.monsters.push(new Monster('blue', 1710, 430));
    this.monsters.push(new Monster('pink', 2000, groundY, true));
    this.monsters.push(new Monster('yellow', 2260, 420));
    this.monsters.push(new Monster('blue', 2550, 340));
    this.monsters.push(new Monster('red', 2850, groundY));
    this.monsters.push(new Monster('pink', 3100, 350, true));
    this.monsters.push(new Monster('yellow', 3360, 430));

    // ========================================================
    // --- SCENE 2: 信義街廓／巷弄通勤段 (3500 ~ 7000) ---
    // ========================================================
    this.pm.addPlatform(3500, groundY, 3550, 40, 'stone');

    // 騎樓高台、遮雨棚階梯
    this.pm.addPlatform(3680, 440, 170, 24, 'brick');
    this.pm.addPlatform(3950, 360, 180, 24, 'brick');
    this.pm.addPlatform(4220, 430, 170, 24, 'brick');
    this.pm.addPlatform(4500, 350, 180, 24, 'brick');
    this.pm.addPlatform(4780, 420, 170, 24, 'brick');
    this.pm.addPlatform(5060, 340, 180, 24, 'brick');
    this.pm.addPlatform(5340, 420, 170, 24, 'brick');
    this.pm.addPlatform(5620, 350, 180, 24, 'brick');
    this.pm.addPlatform(5900, 430, 170, 24, 'brick');
    this.pm.addPlatform(6180, 350, 180, 24, 'brick');
    this.pm.addPlatform(6460, 420, 170, 24, 'brick');
    this.pm.addPlatform(6740, 340, 180, 24, 'brick');

    // 道具配置：15 枚金幣（累計 30 幣，觸發怪獸 Phase 2 全體進化）+ 3 杯咖啡
    [3620, 3850, 4080, 4310, 4540, 4770, 5000, 5230, 5460, 5690, 5920, 6150, 6380, 6610, 6840].forEach((cx, idx) => {
      const cy = (idx % 2 === 0) ? groundY - 30 : 360;
      this.pm.addItem('coin', cx, cy);
    });
    this.pm.addItem('coffee', 4250, 390);
    this.pm.addItem('coffee', 5360, groundY - 30);
    this.pm.addItem('coffee', 6480, 380);

    // 怪物分布：平地重怪、高台毒怪、高空俯衝
    this.monsters.push(new Monster('grape', 3700, groundY - 20));
    this.monsters.push(new Monster('red', 3960, 360));
    this.monsters.push(new Monster('obsidian', 4240, groundY)); // 重怪
    this.monsters.push(new Monster('grape', 4510, 350, true));
    this.monsters.push(new Monster('blue', 4800, groundY));
    this.monsters.push(new Monster('yellow', 5080, 340));
    this.monsters.push(new Monster('pink', 5360, groundY, true));
    this.monsters.push(new Monster('ice', 5640, 350));
    this.monsters.push(new Monster('obsidian', 5920, groundY));
    this.monsters.push(new Monster('red', 6200, 350));
    this.monsters.push(new Monster('blue', 6480, groundY));
    this.monsters.push(new Monster('grape', 6760, 340, true));

    // ========================================================
    // --- SCENE 3: 公園／綠帶雨景段 (7000 ~ 10500) ---
    // ========================================================
    this.pm.addPlatform(7000, groundY, 3550, 40, 'stone');

    // 公園木棧步道與懸空青苔石階
    this.pm.addPlatform(7180, 440, 180, 24, 'brick');
    this.pm.addPlatform(7460, 360, 180, 24, 'brick');
    this.pm.addPlatform(7740, 430, 180, 24, 'brick');
    this.pm.addPlatform(8020, 340, 190, 24, 'brick');
    this.pm.addPlatform(8300, 420, 180, 24, 'brick');
    this.pm.addPlatform(8580, 350, 180, 24, 'brick');
    this.pm.addPlatform(8860, 430, 180, 24, 'brick');
    this.pm.addPlatform(9140, 350, 180, 24, 'brick');
    this.pm.addPlatform(9420, 420, 180, 24, 'brick');
    this.pm.addPlatform(9700, 340, 190, 24, 'brick');
    this.pm.addPlatform(9980, 420, 180, 24, 'brick');
    this.pm.addPlatform(10260, 350, 180, 24, 'brick');

    // 道具配置：15 枚金幣（累計 45 幣，觸發主角第二型態覺醒 & 悠遊卡寄靈登場）+ 3 杯咖啡
    [7120, 7350, 7580, 7810, 8040, 8270, 8500, 8730, 8960, 9190, 9420, 9650, 9880, 10110, 10340].forEach((cx, idx) => {
      const cy = (idx % 2 === 0) ? groundY - 30 : 360;
      this.pm.addItem('coin', cx, cy);
    });
    this.pm.addItem('coffee', 7750, 390);
    this.pm.addItem('coffee', 8880, groundY - 30);
    this.pm.addItem('coffee', 10000, 380);

    // 怪物分布：雨中冰怪、高空花仙、水靈狂飆
    this.monsters.push(new Monster('blue', 7200, 440));
    this.monsters.push(new Monster('ice', 7480, groundY));
    this.monsters.push(new Monster('pink', 7760, groundY, true));
    this.monsters.push(new Monster('red', 8040, 340));
    this.monsters.push(new Monster('yellow', 8320, 420));
    this.monsters.push(new Monster('obsidian', 8600, groundY));
    this.monsters.push(new Monster('grape', 8880, 350, true));
    this.monsters.push(new Monster('ice', 9160, 350));
    this.monsters.push(new Monster('blue', 9440, groundY));
    this.monsters.push(new Monster('pink', 9720, 340, true));
    this.monsters.push(new Monster('obsidian', 10000, groundY));
    this.monsters.push(new Monster('yellow', 10280, 350));

    // ========================================================
    // --- SCENE 4: 通往松德的坡道段 (10500 ~ 14000) ---
    // ========================================================
    this.pm.addPlatform(10500, groundY, 3550, 40, 'stone');

    // 登山險峻坡道台階（階梯狀逐層爬升平台，體現真實松德山坡高度變化）
    this.pm.addPlatform(10680, 460, 180, 24, 'brick');
    this.pm.addPlatform(10960, 390, 180, 24, 'brick');
    this.pm.addPlatform(11240, 450, 180, 24, 'brick');
    this.pm.addPlatform(11520, 370, 190, 24, 'brick');
    this.pm.addPlatform(11800, 440, 180, 24, 'brick');
    this.pm.addPlatform(12080, 350, 180, 24, 'brick');
    this.pm.addPlatform(12360, 430, 180, 24, 'brick');
    this.pm.addPlatform(12640, 340, 190, 24, 'brick');
    this.pm.addPlatform(12920, 420, 180, 24, 'brick');
    this.pm.addPlatform(13200, 330, 190, 24, 'brick');
    this.pm.addPlatform(13480, 410, 180, 24, 'brick');
    this.pm.addPlatform(13760, 330, 180, 24, 'brick');

    // 道具配置：15 枚金幣（累計 60 幣，觸發 Boss 60 幣強制狂暴）+ 3 杯咖啡
    [10620, 10850, 11080, 11310, 11540, 11770, 12000, 12230, 12460, 12690, 12920, 13150, 13380, 13610, 13840].forEach((cx, idx) => {
      const cy = (idx % 2 === 0) ? groundY - 30 : 350;
      this.pm.addItem('coin', cx, cy);
    });
    this.pm.addItem('coffee', 11250, 410);
    this.pm.addItem('coffee', 12380, groundY - 30);
    this.pm.addItem('coffee', 13500, 370);

    // 怪物分布：悠遊卡寄靈（車票幽靈）大量出現、山坡重裝怪巡邏
    this.monsters.push(new Monster('transit', 10700, groundY - 30));
    this.monsters.push(new Monster('red', 10980, 390));
    this.monsters.push(new Monster('obsidian', 11260, groundY));
    this.monsters.push(new Monster('transit', 11540, 370, true));
    this.monsters.push(new Monster('yellow', 11820, 440));
    this.monsters.push(new Monster('ice', 12100, groundY));
    this.monsters.push(new Monster('grape', 12380, 430));
    this.monsters.push(new Monster('transit', 12660, 340));
    this.monsters.push(new Monster('blue', 12940, groundY));
    this.monsters.push(new Monster('pink', 13220, 330, true));
    this.monsters.push(new Monster('obsidian', 13500, groundY));
    this.monsters.push(new Monster('transit', 13780, groundY - 30));

    // ========================================================
    // --- SCENE 5: 松德院區 (14000 ~ 18000) ---
    // ========================================================
    // 5.1 院區外部前庭引道 (14000 ~ 14800)
    this.pm.addPlatform(14000, groundY, 820, 40, 'stone');
    this.pm.addPlatform(14180, 440, 180, 24, 'brick');
    this.pm.addPlatform(14460, 360, 180, 24, 'brick');
    this.pm.addPlatform(14700, 430, 170, 24, 'brick');

    this.pm.addItem('coin', 14200, 400);
    this.pm.addItem('coffee', 14480, 320);
    this.pm.addItem('coin', 14720, 390);

    this.monsters.push(new Monster('obsidian', 14220, groundY));
    this.monsters.push(new Monster('transit', 14500, 360));
    this.monsters.push(new Monster('blue', 14740, groundY));

    // 5.2 ★ 夢影巨花王 Boss Arena (14800 ~ 16500) ★
    // 嚴格 1700px 連續平整石板地板，無任何坑洞，Boss 絕不可能掉出！
    this.pm.addPlatform(14800, groundY, 1750, 60, 'stone');

    // 戰術浮動高台（供玩家跳躍閃避地刺與地面衝擊）
    this.pm.addPlatform(15150, 410, 180, 24, 'brick');
    this.pm.addPlatform(15650, 340, 180, 24, 'brick');
    this.pm.addPlatform(16150, 410, 180, 24, 'brick');

    this.pm.addItem('coffee', 15650, 300);

    // 5.3 ★ 松德醫院院內大廳・最終打卡點 (16500 ~ 18000) ★
    // 現代挑高醫院石英磚地面，直通打卡機
    this.pm.addPlatform(16500, groundY, 1550, 60, 'stone');

    // 迎賓花台與大廳展示高台
    this.pm.addPlatform(16750, 440, 180, 24, 'brick');
    this.pm.addPlatform(17050, 370, 180, 24, 'brick');
    this.pm.addPlatform(17350, 440, 180, 24, 'brick');

    this.pm.addItem('coin', 16780, 400);
    this.pm.addItem('coffee', 17080, groundY - 30);
    this.pm.addItem('coin', 17380, 400);

    // ★ 松德醫院院內打卡機（設置於 x = 17650，打敗 Boss 後衝入大廳完成打卡！）★
    this.pm.setClockInMachine(17650, groundY);
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
    // Ambient floating petals in Scene 1 & 5
    if ([0, 4].includes(curStage.id) && Math.random() < 0.25) {
      particles.emitPetals(camera.x, camera.viewportWidth, 1);
    }

    // Update active monsters
    for (let m of this.monsters) {
      // Update when within 700px of camera
      if (Math.abs(m.x - player.x) < 700) {
        m.update(dt, player);
      }
    }
  }

  renderBackgrounds(ctx, camera) {
    const vw = camera.viewportWidth;
    const vh = camera.viewportHeight;
    const overlap = 500; // 500px 柔和跨場景過渡帶，杜絕硬切線

    // 1. Render Main Stage Backgrounds with 500px Crossfade Overlap
    for (let stg of STAGES) {
      const stageStart = stg.startX - overlap;
      const stageEnd = stg.endX + overlap;

      if (camera.x + vw < stageStart || camera.x > stageEnd) continue;

      // Calculate smooth crossfade alpha
      let alpha = 1.0;
      if (camera.x < stg.startX) {
        alpha = Math.max(0, (camera.x + vw - stg.startX + overlap) / (overlap * 2));
      } else if (camera.x + vw > stg.endX) {
        alpha = Math.max(0, (stg.endX + overlap - camera.x) / (overlap * 2));
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

    // 2. Scene 5 Interior Lobby Crossfade (16500 ~ 18000)
    // 當鏡頭接近院內大廳時，平滑過渡至現代室內大廳光感
    if (camera.x + vw >= 16500) {
      const interiorImg = this.bgImages['interior'];
      if (interiorImg && interiorImg.complete && interiorImg.naturalWidth > 0) {
        const interiorAlpha = Math.min(1.0, Math.max(0, (camera.x - 16300) / 600));
        ctx.save();
        ctx.globalAlpha = interiorAlpha;
        const parallaxX = (16500 - camera.x * 0.35) % vw;
        ctx.drawImage(interiorImg, parallaxX - vw, 0, vw * 2, vh);
        ctx.drawImage(interiorImg, parallaxX + vw, 0, vw * 2, vh);
        ctx.fillStyle = 'rgba(255, 249, 196, 0.05)';
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
