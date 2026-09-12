/**
 * 08點上班大作戰：通勤英雄篇 - 五大主場景與 World-Space 背景合成系統 (Level.js)
 * 起點：象山捷運站 2 號出口 (x = 220)
 * 終點：松德醫院院內大廳打卡機 (x = 17650)
 * 總長度：18,000px
 * 
 * 5 大主場景 (世界座標分段與過渡)：
 * 1. Scene 1: 象山捷運站 2 號出口 (0 ~ 3500) - 晨光微曦、綠色捷運出口、遠眺台北 101
 * 2. Scene 2: 信義街廓／巷弄通勤段 (3500 ~ 7000) - 永和豆漿晨光街景、騎樓店面、生活街區
 * 3. Scene 3: 虎林公園綠帶雨景段 (7000 ~ 10500) - 雨中虎林公園、林蔭棧道、薄霧與水窪
 * 4. Scene 4: 前往松德的坡道段 (10500 ~ 14000) - 松德路登山陡坡、擋土石牆、階層護欄
 * 5. Scene 5: 松德院區 (14000 ~ 18000)
 *    - 14000 ~ 14800: 松德院區外部前庭與引道
 *    - 14800 ~ 16500: ★ 夢影巨花王 Boss Arena (1700px 連續平整無坑地板) ★
 *    - 16500 ~ 18000: 松德醫院挑高明亮室內大廳 (院區管制閘門在 16500)
 *    - x = 17650: 實體上班打卡機
 */

import { particles } from '../entities/Particles.js';
import { Monster } from '../entities/Monster.js';

export const STAGES = [
  { 
    id: 0, 
    name: 'Scene 1: 象山捷運站 2 號出口', 
    subtitle: '晨光微曦・遠眺台北 101',
    startX: 0, 
    endX: 3500, 
    bg: 'assets/bg_station.jpg', 
    rain: 0, 
    skyTop: '#102A45',
    skyBottom: '#FFECB3',
    tint: 'rgba(255, 236, 179, 0.08)' 
  },
  { 
    id: 1, 
    name: 'Scene 2: 信義街廓／巷弄通勤段', 
    subtitle: '信義街巷・晨光永和豆漿',
    startX: 3500, 
    endX: 7000, 
    bg: 'assets/bg_lane.jpg', 
    rain: 0, 
    skyTop: '#1A3048',
    skyBottom: '#FFE0B2',
    tint: 'rgba(255, 224, 178, 0.06)' 
  },
  { 
    id: 2, 
    name: 'Scene 3: 虎林公園綠帶雨景段', 
    subtitle: '雨中虎林公園・晨雨薄霧',
    startX: 7000, 
    endX: 10500, 
    bg: 'assets/bg_hulin_park.jpg', 
    rain: 1.0, 
    skyTop: '#1C2E3D',
    skyBottom: '#80DEEA',
    tint: 'rgba(129, 212, 250, 0.12)' 
  },
  { 
    id: 3, 
    name: 'Scene 4: 前往松德的坡道段', 
    subtitle: '松德路爬坡段・石牆護欄',
    startX: 10500, 
    endX: 14000, 
    bg: 'assets/bg_slope.jpg', 
    rain: 0.15, 
    skyTop: '#263238',
    skyBottom: '#CFD8DC',
    tint: 'rgba(176, 190, 197, 0.08)' 
  },
  { 
    id: 4, 
    name: 'Scene 5: 松德院區', 
    subtitle: '松德正門・夢影巨花王決戰・院內大廳',
    startX: 14000, 
    endX: 18000, 
    bg: 'assets/bg_hospital.jpg', 
    interiorBg: 'assets/bg_hospital_interior.jpg', 
    rain: 0, 
    skyTop: '#37474F',
    skyBottom: '#F8BBD0',
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

  // --- Monster Placement Helpers (Alignment with Platform Top) ---

  spawnMonsterOnGround(type, x) {
    // Locate the solid ground platform at x
    const plat = this.pm.platforms.find(p => p.type === 'stone' && p.x <= x && (p.x + p.w) >= x);
    const y = plat ? plat.y : 560;
    this.monsters.push(new Monster(type, x, y));
  }

  spawnMonsterOnPlatform(type, x, fallbackY = 420) {
    // Locate brick platform at x
    const plat = this.pm.platforms.find(p => p.type === 'brick' && p.x <= x && (p.x + p.w) >= x);
    const y = plat ? plat.y : fallbackY;
    this.monsters.push(new Monster(type, x, y));
  }

  spawnMonsterOnSlope(type, x, terraceY = 440) {
    // Specific terraced hill platform
    const plat = this.pm.platforms.find(p => p.x <= x && (p.x + p.w) >= x && Math.abs(p.y - terraceY) < 30);
    const y = plat ? plat.y : terraceY;
    this.monsters.push(new Monster(type, x, y));
  }

  spawnFlyingMonster(type, x, altitude = 240) {
    // Airborne swooping monster
    this.monsters.push(new Monster(type, x, altitude, true));
  }

  buildLevelGeometry() {
    this.pm.reset();
    this.monsters = [];

    const groundY = 560;

    // =========================================================================
    // ★ MAIN SAFE ROUTE: 100% CONTINUOUS GROUND PATH WITH 50px BOUNDARY OVERLAPS ★
    // =========================================================================
    // S1: 0 ~ 3550
    this.pm.addPlatform(0, groundY, 3550, 40, 'stone');
    // S2: 3500 ~ 7050 (50px overlap with S1)
    this.pm.addPlatform(3500, groundY, 3550, 40, 'stone');
    // S3: 7000 ~ 10550 (50px overlap with S2)
    this.pm.addPlatform(7000, groundY, 3550, 40, 'stone');
    // S4: 10500 ~ 14050 (50px overlap with S3)
    this.pm.addPlatform(10500, groundY, 3550, 40, 'stone');
    // S5 Forecourt: 14000 ~ 14850 (50px overlap with S4)
    this.pm.addPlatform(14000, groundY, 850, 40, 'stone');
    // S5 Boss Arena: 14800 ~ 16550 (50px overlap with Forecourt, flat continuous arena floor)
    this.pm.addPlatform(14800, groundY, 1750, 60, 'stone');
    // S5 Interior Lobby: 16500 ~ 18050 (50px overlap with Arena, flat lobby floor to punch clock)
    this.pm.addPlatform(16500, groundY, 1550, 60, 'stone');

    // =========================================================================
    // --- SCENE 1: 象山捷運站 2 號出口 (0 ~ 3500) ---
    // =========================================================================
    // 捷運出口階梯與高台
    this.pm.addPlatform(360, 460, 180, 24, 'brick');
    this.pm.addPlatform(620, 390, 180, 24, 'brick');
    this.pm.addPlatform(880, 320, 190, 24, 'brick');
    this.pm.addPlatform(1150, 410, 180, 24, 'brick');
    this.pm.addPlatform(1420, 340, 180, 24, 'brick');
    this.pm.addPlatform(1690, 430, 180, 24, 'brick');
    this.pm.addPlatform(1960, 350, 190, 24, 'brick');
    this.pm.addPlatform(2240, 420, 180, 24, 'brick');
    this.pm.addPlatform(2520, 340, 190, 24, 'brick');
    this.pm.addPlatform(2800, 420, 180, 24, 'brick');
    this.pm.addPlatform(3080, 350, 190, 24, 'brick');
    this.pm.addPlatform(3340, 430, 180, 24, 'brick');

    // Collectibles: 20 Coins (Milestone 15 Unlock Ult) + 4 Coffee
    [220, 410, 630, 900, 1160, 1430, 1700, 1970, 2250, 2530, 2810, 3090, 3250, 3360, 3450].forEach((cx, idx) => {
      const cy = (idx % 2 === 0) ? groundY - 35 : 320;
      this.pm.addItem('coin', cx, cy);
    });
    // 5 extra coins on brick platforms
    this.pm.addItem('coin', 360, 420);
    this.pm.addItem('coin', 880, 280);
    this.pm.addItem('coin', 1690, 390);
    this.pm.addItem('coin', 2520, 300);
    this.pm.addItem('coin', 3080, 310);
    // 4 coffee total
    this.pm.addItem('coffee', 1000, 360);
    this.pm.addItem('coffee', 2350, groundY - 35);
    this.pm.addItem('coffee', 620, 350);
    this.pm.addItem('coffee', 2800, 380);

    // Monsters: Ground 45%, Platform 25%, Slope 20%, Flying 10%
    this.spawnMonsterOnGround('red', 480);
    this.spawnMonsterOnPlatform('blue', 620);
    this.spawnFlyingMonster('pink', 900, 220);
    this.spawnMonsterOnPlatform('yellow', 1150);
    this.spawnMonsterOnGround('red', 1450);
    this.spawnMonsterOnPlatform('blue', 1690);
    this.spawnMonsterOnGround('pink', 2000);
    this.spawnMonsterOnPlatform('yellow', 2240);
    this.spawnMonsterOnPlatform('blue', 2520);
    this.spawnMonsterOnGround('red', 2850);
    this.spawnFlyingMonster('pink', 3100, 230);
    this.spawnMonsterOnPlatform('yellow', 3340);

    // =========================================================================
    // --- SCENE 2: 信義街廓／巷弄通勤段 (3500 ~ 7000) ---
    // =========================================================================
    // 騎樓高台、早餐店遮雨棚
    this.pm.addPlatform(3680, 440, 180, 24, 'brick');
    this.pm.addPlatform(3950, 360, 190, 24, 'brick');
    this.pm.addPlatform(4220, 430, 180, 24, 'brick');
    this.pm.addPlatform(4500, 350, 190, 24, 'brick');
    this.pm.addPlatform(4780, 420, 180, 24, 'brick');
    this.pm.addPlatform(5060, 340, 190, 24, 'brick');
    this.pm.addPlatform(5340, 420, 180, 24, 'brick');
    this.pm.addPlatform(5620, 350, 190, 24, 'brick');
    this.pm.addPlatform(5900, 430, 180, 24, 'brick');
    this.pm.addPlatform(6180, 350, 190, 24, 'brick');
    this.pm.addPlatform(6460, 420, 180, 24, 'brick');
    this.pm.addPlatform(6740, 340, 190, 24, 'brick');

    // Collectibles: 20 Coins (Milestone 30 Monster P2) + 5 Coffee
    [3620, 3850, 4080, 4310, 4540, 4770, 5000, 5230, 5460, 5690, 5920, 6150, 6380, 6610, 6840].forEach((cx, idx) => {
      const cy = (idx % 2 === 0) ? groundY - 35 : 350;
      this.pm.addItem('coin', cx, cy);
    });
    // 5 extra coins on elevated platforms
    this.pm.addItem('coin', 3680, 400);
    this.pm.addItem('coin', 4220, 390);
    this.pm.addItem('coin', 5060, 300);
    this.pm.addItem('coin', 5900, 390);
    this.pm.addItem('coin', 6740, 300);
    // 5 coffee total (morning energy boost!)
    this.pm.addItem('coffee', 4250, 380);
    this.pm.addItem('coffee', 5360, groundY - 35);
    this.pm.addItem('coffee', 6480, 370);
    this.pm.addItem('coffee', 3950, 320);
    this.pm.addItem('coffee', 6180, 310);

    // Monsters: Ground, Platform, Flying
    this.spawnMonsterOnGround('grape', 3700);
    this.spawnMonsterOnPlatform('red', 3950);
    this.spawnMonsterOnGround('obsidian', 4240);
    this.spawnFlyingMonster('grape', 4510, 220);
    this.spawnMonsterOnGround('blue', 4800);
    this.spawnMonsterOnPlatform('yellow', 5060);
    this.spawnMonsterOnGround('pink', 5360);
    this.spawnMonsterOnPlatform('ice', 5620);
    this.spawnMonsterOnGround('obsidian', 5920);
    this.spawnMonsterOnPlatform('red', 6180);
    this.spawnMonsterOnGround('blue', 6480);
    this.spawnFlyingMonster('grape', 6760, 230);

    // =========================================================================
    // --- SCENE 3: 虎林公園綠帶雨景段 (7000 ~ 10500) ---
    // =========================================================================
    // 公園木棧高台、涼亭階梯
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

    // Collectibles: 20 Coins (Milestone 45 Hero Form 2) + 5 Coffee
    [7120, 7350, 7580, 7810, 8040, 8270, 8500, 8730, 8960, 9190, 9420, 9650, 9880, 10110, 10340].forEach((cx, idx) => {
      const cy = (idx % 2 === 0) ? groundY - 35 : 350;
      this.pm.addItem('coin', cx, cy);
    });
    // 5 extra coins in the rain
    this.pm.addItem('coin', 7460, 320);
    this.pm.addItem('coin', 8020, 300);
    this.pm.addItem('coin', 8860, 390);
    this.pm.addItem('coin', 9700, 300);
    this.pm.addItem('coin', 10260, 310);
    // 5 coffee total (雨中補給！)
    this.pm.addItem('coffee', 7750, 380);
    this.pm.addItem('coffee', 8880, groundY - 35);
    this.pm.addItem('coffee', 10000, 370);
    this.pm.addItem('coffee', 7460, 320);
    this.pm.addItem('coffee', 9140, 310);

    // Monsters: Rain terrain
    this.spawnMonsterOnPlatform('blue', 7180);
    this.spawnMonsterOnGround('ice', 7480);
    this.spawnMonsterOnGround('pink', 7760);
    this.spawnMonsterOnPlatform('red', 8020);
    this.spawnMonsterOnPlatform('yellow', 8300);
    this.spawnMonsterOnGround('obsidian', 8600);
    this.spawnFlyingMonster('grape', 8880, 220);
    this.spawnMonsterOnPlatform('ice', 9140);
    this.spawnMonsterOnGround('blue', 9440);
    this.spawnFlyingMonster('pink', 9700, 210);
    this.spawnMonsterOnGround('obsidian', 10000);
    this.spawnMonsterOnPlatform('yellow', 10260);

    // =========================================================================
    // --- SCENE 4: 前往松德的坡道段 (10500 ~ 14000) ---
    // =========================================================================
    // 爬坡階梯露台（重現信義至松德爬升坡道地景）
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

    // Collectibles: 20 Coins (Milestone 60 Boss Rage) + 5 Coffee
    [10620, 10850, 11080, 11310, 11540, 11770, 12000, 12230, 12460, 12690, 12920, 13150, 13380, 13610, 13840].forEach((cx, idx) => {
      const cy = (idx % 2 === 0) ? groundY - 35 : 340;
      this.pm.addItem('coin', cx, cy);
    });
    // 5 extra coins on slope terraces
    this.pm.addItem('coin', 10960, 350);
    this.pm.addItem('coin', 11520, 330);
    this.pm.addItem('coin', 12080, 310);
    this.pm.addItem('coin', 12640, 300);
    this.pm.addItem('coin', 13200, 290);
    // 5 coffee total (爬坡補給！)
    this.pm.addItem('coffee', 11250, 400);
    this.pm.addItem('coffee', 12380, groundY - 35);
    this.pm.addItem('coffee', 13500, 360);
    this.pm.addItem('coffee', 10960, 350);
    this.pm.addItem('coffee', 13760, 290);

    // Monsters: Slope terraces (transit 悠遊卡怪物已移除)
    this.spawnMonsterOnGround('obsidian', 10700);
    this.spawnMonsterOnSlope('red', 10960, 390);
    this.spawnMonsterOnGround('obsidian', 11260);
    this.spawnFlyingMonster('grape', 11540, 240);
    this.spawnMonsterOnSlope('yellow', 11800, 440);
    this.spawnMonsterOnGround('ice', 12100);
    this.spawnMonsterOnSlope('grape', 12360, 430);
    this.spawnMonsterOnPlatform('red', 12640);
    this.spawnMonsterOnGround('blue', 12940);
    this.spawnFlyingMonster('pink', 13220, 220);
    this.spawnMonsterOnGround('obsidian', 13500);
    this.spawnMonsterOnGround('yellow', 13780);

    // =========================================================================
    // --- SCENE 5: 松德院區 (14000 ~ 18000) ---
    // =========================================================================
    // 5.1 院區前庭引道 (14000 ~ 14800)
    this.pm.addPlatform(14180, 440, 180, 24, 'brick');
    this.pm.addPlatform(14460, 360, 180, 24, 'brick');
    this.pm.addPlatform(14700, 430, 170, 24, 'brick');

    this.pm.addItem('coin', 14200, 390);
    this.pm.addItem('coffee', 14480, 310);
    this.pm.addItem('coin', 14720, 380);
    this.pm.addItem('coin', 14180, 400);  // extra platform coin
    this.pm.addItem('coffee', 14700, 390); // extra coffee before boss

    this.spawnMonsterOnGround('obsidian', 14220);
    this.spawnMonsterOnPlatform('grape', 14460);
    this.spawnMonsterOnGround('blue', 14740);

    // 5.2 ★ 夢影巨花王 Boss Arena (14800 ~ 16500) ★
    // 嚴格 1700px 連續平整石板地板，無任何坑洞
    this.pm.addPlatform(15150, 410, 180, 24, 'brick');
    this.pm.addPlatform(15650, 340, 180, 24, 'brick');
    this.pm.addPlatform(16150, 410, 180, 24, 'brick');
    this.pm.addItem('coffee', 15650, 290);
    this.pm.addItem('coffee', 15150, 370);  // extra coffee mid-arena
    this.pm.addItem('coin', 16150, 370);    // extra coin on far platform

    // 5.3 ★ 松德醫院挑高大廳・最終打卡點 (16500 ~ 18000) ★
    this.pm.addPlatform(16750, 440, 180, 24, 'brick');
    this.pm.addPlatform(17050, 370, 180, 24, 'brick');
    this.pm.addPlatform(17350, 440, 180, 24, 'brick');

    this.pm.addItem('coin', 16780, 390);
    this.pm.addItem('coffee', 17080, groundY - 35);
    this.pm.addItem('coin', 17380, 390);
    this.pm.addItem('coin', 16600, groundY - 35);   // corridor coin
    this.pm.addItem('coffee', 16750, 400);           // lobby coffee

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

    // Dynamic Weather Transitions (Rain in S3 and taper in S4)
    if (curStage.rain > 0) {
      particles.emitRain(camera.x, camera.viewportWidth, camera.viewportHeight, curStage.rain);
    }
    // Ambient floating petals in S1 & S5
    if ([0, 4].includes(curStage.id) && Math.random() < 0.25) {
      particles.emitPetals(camera.x, camera.viewportWidth, 1);
    }

    // Update active monsters
    for (let m of this.monsters) {
      if (Math.abs(m.x - player.x) < 750) {
        m.update(dt, player);
      }
    }
  }

  renderBackgrounds(ctx, camera) {
    const vw = camera.viewportWidth;
    const vh = camera.viewportHeight;
    const camX = camera.x;
    const overlap = 800; // v9.2: 800px 寬幅無縫過渡帶，消弭硬切線

    // -------------------------------------------------------------
    // 1. Base Sky Atmosphere Gradient (World Coordinates Blended)
    // -------------------------------------------------------------
    const curStage = this.getCurrentStage(camX + vw * 0.5);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
    skyGrad.addColorStop(0, curStage.skyTop || '#102A45');
    skyGrad.addColorStop(1, curStage.skyBottom || '#FFE082');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, vw, vh);

    // -------------------------------------------------------------
    // 2. World-Space Far Layer (Parallax 0.20x per Stage)
    // -------------------------------------------------------------
    for (let stg of STAGES) {
      const stageStart = stg.startX - overlap;
      const stageEnd = stg.endX + overlap;
      if (camX + vw < stageStart || camX > stageEnd) continue;

      // Smooth crossfade alpha across 800px boundary
      let alpha = 1.0;
      if (camX < stg.startX) {
        alpha = Math.max(0, (camX + vw - stg.startX) / overlap);
      } else if (camX + vw > stg.endX) {
        alpha = Math.max(0, (stg.endX + overlap - camX) / overlap);
      }
      alpha = Math.max(0, Math.min(1.0, alpha));

      const img = this.bgImages[stg.id];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;

        // Far layer: Anchored to stage world origin, scrolls at 0.20x
        // Width covers the stage viewport span without repeating or stretching
        const parallaxFactor = 0.20;
        const stageScreenOffset = (stg.startX - camX * parallaxFactor);
        const drawWidth = 1920;
        const drawHeight = vh;

        // Draw image aligned with stage world coordinate
        ctx.drawImage(img, stageScreenOffset % drawWidth - drawWidth, 0, drawWidth, drawHeight);
        ctx.drawImage(img, stageScreenOffset % drawWidth, 0, drawWidth, drawHeight);
        ctx.drawImage(img, stageScreenOffset % drawWidth + drawWidth, 0, drawWidth, drawHeight);

        // Stage atmospheric tint
        ctx.fillStyle = stg.tint;
        ctx.fillRect(0, 0, vw, vh);

        ctx.restore();
      }
    }

    // -------------------------------------------------------------
    // 3. Scene 5 Interior Lobby Crossfade (16500 ~ 18000)
    // -------------------------------------------------------------
    if (camX + vw >= 16400) {
      const interiorImg = this.bgImages['interior'];
      if (interiorImg && interiorImg.complete && interiorImg.naturalWidth > 0) {
        const interiorAlpha = Math.min(1.0, Math.max(0, (camX - 16300) / 700));
        ctx.save();
        ctx.globalAlpha = interiorAlpha;
        const parallaxFactor = 0.20;
        const interiorOffset = (16500 - camX * parallaxFactor);
        const drawWidth = 1920;
        ctx.drawImage(interiorImg, interiorOffset % drawWidth, 0, drawWidth, vh);
        ctx.drawImage(interiorImg, interiorOffset % drawWidth - drawWidth, 0, drawWidth, vh);

        // Warm modern hospital indoor lighting
        ctx.fillStyle = 'rgba(255, 249, 196, 0.08)';
        ctx.fillRect(0, 0, vw, vh);
        ctx.restore();
      }
    }

    // -------------------------------------------------------------
    // 4. World-Space Mid & Near Landmark Props (Parallax 1.0x)
    // -------------------------------------------------------------
    ctx.save();
    // Scene 1: Xiangshan Station Exit 2 Structure & Landmark Signage (x ≈ 80 ~ 380)
    if (camX < 1200) {
      const exitScreenX = 140 - camX;
      // MRT Station Exit 2 Glass & Steel Canopy
      ctx.fillStyle = 'rgba(46, 125, 50, 0.85)'; // Taipei Metro Green
      ctx.fillRect(exitScreenX, 220, 180, 18);
      ctx.fillStyle = '#1B5E20';
      ctx.fillRect(exitScreenX + 8, 238, 16, 280);
      ctx.fillRect(exitScreenX + 156, 238, 16, 280);
      // Metro Logo & Exit 2 Sign
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(exitScreenX + 24, 250, 132, 42);
      ctx.strokeStyle = '#2E7D32';
      ctx.lineWidth = 2;
      ctx.strokeRect(exitScreenX + 24, 250, 132, 42);
      ctx.fillStyle = '#1B5E20';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('捷運象山站 2號出口', exitScreenX + 90, 268);
      ctx.font = '9px sans-serif';
      ctx.fillText('Xiangshan Exit 2', exitScreenX + 90, 282);

      // Start Mini Location Banner (Non-intrusive, placed at start)
      ctx.fillStyle = 'rgba(18, 24, 38, 0.88)';
      ctx.fillRect(exitScreenX - 30, 130, 240, 56);
      ctx.strokeStyle = '#00E676';
      ctx.lineWidth = 2;
      ctx.strokeRect(exitScreenX - 30, 130, 240, 56);
      ctx.fillStyle = '#69F0AE';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏁 START 起點', exitScreenX + 90, 150);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('象山捷運站 2 號出口', exitScreenX + 90, 172);

      // Direction Guide Post: "往松德院區 ▶"
      const guideX = 420 - camX;
      ctx.fillStyle = '#37474F';
      ctx.fillRect(guideX, 420, 8, 100);
      ctx.fillStyle = '#0288D1';
      ctx.fillRect(guideX - 25, 410, 60, 26);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('往松德院區 ▶', guideX + 5, 427);
    }

    // Scene 2: Breakfast shop signposts (x ≈ 4200 ~ 5500)
    if (camX + vw >= 4000 && camX <= 5800) {
      const shopX = 4600 - camX;
      ctx.fillStyle = '#D84315';
      ctx.fillRect(shopX, 360, 110, 36);
      ctx.fillStyle = '#FFF8E1';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('永和豆漿大王', shopX + 55, 382);
    }

    // Scene 3: Hulin Park Wooden Signpost & Rain Ripples (x ≈ 7200)
    if (camX + vw >= 7000 && camX <= 8500) {
      const parkSignX = 7250 - camX;
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(parkSignX, 420, 10, 100);
      ctx.fillStyle = '#3E2723';
      ctx.fillRect(parkSignX - 35, 400, 80, 28);
      ctx.fillStyle = '#81C784';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('虎林生態綠帶', parkSignX + 5, 418);
    }

    // Scene 4: Mountain Road Incline Warning (x ≈ 10800)
    if (camX + vw >= 10600 && camX <= 12000) {
      const warnX = 10850 - camX;
      ctx.fillStyle = '#37474F';
      ctx.fillRect(warnX, 420, 8, 100);
      ctx.fillStyle = '#F57F17';
      ctx.fillRect(warnX - 20, 400, 50, 28);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ 陡坡爬升', warnX + 5, 418);
    }

    // Scene 5: Songde Hospital Entrance Monument (x ≈ 14100)
    if (camX + vw >= 13900 && camX <= 15000) {
      const hospMonuX = 14150 - camX;
      ctx.fillStyle = '#455A64';
      ctx.fillRect(hospMonuX, 420, 140, 100);
      ctx.strokeStyle = '#90A4AE';
      ctx.lineWidth = 2;
      ctx.strokeRect(hospMonuX, 420, 140, 100);
      ctx.fillStyle = '#E91E63';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('臺北市立聯合醫院', hospMonuX + 70, 455);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('松德院區', hospMonuX + 70, 480);
    }

    // Scene 5: Hospital Lobby Reception & Floor Directory (x ≈ 17100)
    if (camX + vw >= 16800 && camX <= 18000) {
      const lobbyDeskX = 17200 - camX;
      // Reception Desk
      ctx.fillStyle = '#ECEFF1';
      ctx.fillRect(lobbyDeskX, 460, 160, 60);
      ctx.strokeStyle = '#B0BEC5';
      ctx.lineWidth = 2;
      ctx.strokeRect(lobbyDeskX, 460, 160, 60);
      ctx.fillStyle = '#0288D1';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('1F 批價掛號 / 晨間打卡處', lobbyDeskX + 80, 495);
    }

    ctx.restore();
  }

  renderMonsters(ctx, camera) {
    for (let m of this.monsters) {
      if (m.x + 80 < camera.x || m.x - 80 > camera.x + camera.viewportWidth) continue;
      m.render(ctx);
    }
  }
}
