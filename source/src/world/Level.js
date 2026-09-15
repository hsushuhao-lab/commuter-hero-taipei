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
import { projectiles } from '../entities/Projectiles.js';

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
    this.phase2PredatorTriggered = false;
    this.telegraphStaggerTimer = 0;

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
    const m = new Monster(type, x, y);
    if (plat) {
      m.patrolBounds = { minX: plat.x + 30, maxX: plat.x + plat.w - 30 };
    }
    this.monsters.push(m);
    return m;
  }

  spawnMonsterOnPlatform(type, x, fallbackY = 420) {
    // Locate brick platform at x
    const plat = this.pm.platforms.find(p => p.type === 'brick' && p.x <= x && (p.x + p.w) >= x);
    const y = plat ? plat.y : fallbackY;
    const m = new Monster(type, x, y);
    if (plat) {
      m.patrolBounds = { minX: plat.x + 25, maxX: plat.x + plat.w - 25 };
    }
    this.monsters.push(m);
    return m;
  }

  spawnMonsterOnSlope(type, x, terraceY = 440) {
    // Specific terraced hill platform
    const plat = this.pm.platforms.find(p => p.x <= x && (p.x + p.w) >= x && Math.abs(p.y - terraceY) < 30);
    const y = plat ? plat.y : terraceY;
    const m = new Monster(type, x, y);
    if (plat) {
      m.patrolBounds = { minX: plat.x + 25, maxX: plat.x + plat.w - 25 };
    }
    this.monsters.push(m);
    return m;
  }

  spawnFlyingMonster(type, x, altitude = 240) {
    // Airborne swooping monster
    const monster = new Monster(type, x, altitude, true);
    this.monsters.push(monster);
    return monster;
  }

  buildLevelGeometry() {
    this.pm.reset();
    this.monsters = [];

    const groundY = 560;

    // =========================================================================
    // ★ v9.5 CLIFF ROUTE: 6 REAL GAPS IN SCENES 1–4, 100% FLAT ARENA & LOBBY ★
    // Gaps:
    // Gap 1 (S1): 1800 ~ 1940 (width 140px, Easy)
    // Gap 2 (S2): 4850 ~ 5010 (width 160px, Normal)
    // Gap 3 (S2): 6250 ~ 6425 (width 175px, Normal)
    // Gap 4 (S3): 8200 ~ 8385 (width 185px, Normal)
    // Gap 5 (S3): 9750 ~ 9945 (width 195px, Hard)
    // Gap 6 (S4): 11950 ~ 12160 (width 210px, Hard)
    // Reset Zones: S1 (2900~3500), S2 (6500~7000), S3 (9100~9650), S4 (13300~14000)
    // =========================================================================

    // Scene 1: 0 ~ 1800, Gap 1 (1800~1940), 1940 ~ 3500
    this.pm.addPlatform(0, groundY, 1800, 40, 'stone');
    this.pm.addPlatform(1940, groundY, 1560, 40, 'stone');

    // Scene 2: 3500 ~ 4850, Gap 2 (4850~5010), 5010 ~ 6250, Gap 3 (6250~6425), 6425 ~ 7000
    this.pm.addPlatform(3500, groundY, 1350, 40, 'stone');
    this.pm.addPlatform(5010, groundY, 1240, 40, 'stone');
    this.pm.addPlatform(6425, groundY, 575, 40, 'stone');

    // Scene 3: 7000 ~ 8200, Gap 4 (8200~8385), 8385 ~ 9750, Gap 5 (9750~9945), 9945 ~ 10500
    this.pm.addPlatform(7000, groundY, 1200, 40, 'stone');
    this.pm.addPlatform(8385, groundY, 1365, 40, 'stone');
    this.pm.addPlatform(9945, groundY, 555, 40, 'stone');

    // Scene 4: 10500 ~ 11950, Gap 6 (11950~12160), 12160 ~ 14000
    this.pm.addPlatform(10500, groundY, 1450, 40, 'stone');
    this.pm.addPlatform(12160, groundY, 1840, 40, 'stone');

    // Scene 5 Forecourt: 14000 ~ 14850 (flat continuous floor)
    this.pm.addPlatform(14000, groundY, 850, 40, 'stone');

    // Scene 5 Boss Arena: 14800 ~ 16550 (100% flat continuous arena floor, 0 gaps)
    this.pm.addPlatform(14800, groundY, 1750, 60, 'stone');

    // Scene 5 Interior Lobby: 16500 ~ 18050 (100% flat continuous lobby floor, 0 gaps)
    this.pm.addPlatform(16500, groundY, 1550, 60, 'stone');

    // =========================================================================
    // --- SCENE 1: 象山捷運站 2 號出口 (0 ~ 3500) ---
    // Platforms reduced by 41.7% (from 12 to 7). Ground Reset Zone: 2900 ~ 3500
    // =========================================================================
    this.pm.addPlatform(400, 460, 180, 24, 'brick');
    this.pm.addPlatform(700, 390, 180, 24, 'brick');
    this.pm.addPlatform(1050, 430, 180, 24, 'brick');
    this.pm.addPlatform(1380, 350, 180, 24, 'brick');
    this.pm.addPlatform(2100, 440, 180, 24, 'brick');
    this.pm.addPlatform(2400, 370, 180, 24, 'brick');
    this.pm.addPlatform(2700, 440, 180, 24, 'brick');

    // S1 Collectibles: 20 Coins + 2 Coffee (Coffee only on jump platforms)
    [220, 410, 630, 900, 1160, 1430, 1650, 2000, 2250, 2530, 2810, 2980, 3150, 3300, 3450].forEach(cx => {
      this.pm.addItem('coin', cx, groundY - 35);
    });
    this.pm.addItem('coin', 400, 420);
    this.pm.addItem('coin', 700, 350);
    this.pm.addItem('coin', 1380, 310);
    this.pm.addItem('coin', 2100, 400);
    this.pm.addItem('coin', 2700, 400);

    // S1 Coffee (reduced to 2 cups; both require an active jump)
    this.pm.addItem('coffee', 1050, 390);
    this.pm.addItem('coffee', 2400, 330);

    // S1 Monsters
    this.spawnMonsterOnGround('red', 500);
    this.spawnMonsterOnPlatform('blue', 700);
    this.spawnFlyingMonster('pink', 950, 220);
    this.spawnMonsterOnPlatform('yellow', 1050);
    this.spawnMonsterOnGround('red', 1450);
    this.spawnMonsterOnGround('pink', 2150);
    this.spawnMonsterOnPlatform('yellow', 2400);
    this.spawnMonsterOnPlatform('blue', 2700);
    this.spawnMonsterOnGround('red', 3100);
    this.spawnFlyingMonster('pink', 3350, 230);

    // =========================================================================
    // --- SCENE 2: 信義街廓／巷弄通勤段 (3500 ~ 7000) ---
    // Platforms reduced by 41.7% (from 12 to 7). Ground Reset Zone: 6500 ~ 7000
    // =========================================================================
    this.pm.addPlatform(3750, 430, 180, 24, 'brick');
    this.pm.addPlatform(4100, 360, 180, 24, 'brick');
    this.pm.addPlatform(4450, 430, 180, 24, 'brick');
    this.pm.addPlatform(5200, 440, 180, 24, 'brick');
    this.pm.addPlatform(5550, 360, 180, 24, 'brick');
    this.pm.addPlatform(5900, 430, 180, 24, 'brick');
    this.pm.addPlatform(6100, 360, 140, 24, 'brick');

    // S2 Collectibles: 20 Coins + 3 Coffee (Coffee only on jump platforms)
    [3620, 3850, 4080, 4310, 4540, 4750, 5050, 5250, 5480, 5700, 5950, 6180, 6460, 6680, 6880].forEach(cx => {
      this.pm.addItem('coin', cx, groundY - 35);
    });
    this.pm.addItem('coin', 3750, 390);
    this.pm.addItem('coin', 4450, 390);
    this.pm.addItem('coin', 5200, 400);
    this.pm.addItem('coin', 5900, 390);
    this.pm.addItem('coin', 6100, 320);

    // S2 Coffee (reduced to 3 cups; all require an active jump)
    this.pm.addItem('coffee', 4100, 320);
    this.pm.addItem('coffee', 5550, 320);
    this.pm.addItem('coffee', 6200, 320);

    // S2 Monsters
    this.spawnMonsterOnGround('grape', 3700);
    this.spawnMonsterOnPlatform('red', 4100);
    this.spawnMonsterOnGround('obsidian', 4400);
    this.spawnFlyingMonster('grape', 4650, 220);
    this.spawnMonsterOnGround('blue', 5250);
    this.spawnMonsterOnPlatform('yellow', 5550);
    this.spawnMonsterOnGround('pink', 5850);
    this.spawnMonsterOnGround('obsidian', 6650);
    this.spawnFlyingMonster('grape', 6850, 230);

    // =========================================================================
    // --- SCENE 3: 虎林公園綠帶雨景段 (7000 ~ 10500) ---
    // Platforms reduced by 41.7% (from 12 to 7). Ground Reset Zone: 9100 ~ 9650
    // =========================================================================
    this.pm.addPlatform(7250, 430, 180, 24, 'brick');
    this.pm.addPlatform(7550, 360, 180, 24, 'brick');
    this.pm.addPlatform(7850, 430, 180, 24, 'brick');
    this.pm.addPlatform(8550, 440, 180, 24, 'brick');
    this.pm.addPlatform(8850, 360, 180, 24, 'brick');
    this.pm.addPlatform(9980, 440, 170, 24, 'brick');
    this.pm.addPlatform(10220, 370, 170, 24, 'brick');

    // S3 Collectibles: 20 Coins + 3 Coffee (Coffee only on jump platforms)
    [7120, 7350, 7580, 7810, 8100, 8420, 8650, 8880, 9150, 9350, 9550, 9700, 9980, 10180, 10380].forEach(cx => {
      this.pm.addItem('coin', cx, groundY - 35);
    });
    this.pm.addItem('coin', 7250, 390);
    this.pm.addItem('coin', 7850, 390);
    this.pm.addItem('coin', 8550, 400);
    this.pm.addItem('coin', 9980, 400);
    this.pm.addItem('coin', 10220, 330);

    // S3 Coffee (reduced to 3 cups; all require an active jump)
    this.pm.addItem('coffee', 7550, 320);
    this.pm.addItem('coffee', 8550, 400);
    this.pm.addItem('coffee', 8850, 320);

    // S3 Monsters
    this.spawnMonsterOnGround('ice', 7350);
    this.spawnMonsterOnPlatform('blue', 7550);
    this.spawnMonsterOnGround('pink', 7850);
    this.spawnFlyingMonster('grape', 8100, 220);
    this.spawnMonsterOnGround('obsidian', 8550);
    this.spawnMonsterOnPlatform('yellow', 8850);
    this.spawnMonsterOnGround('blue', 9300);
    this.spawnFlyingMonster('pink', 9600, 210);
    this.spawnMonsterOnPlatform('yellow', 9980);
    this.spawnMonsterOnGround('obsidian', 10100);

    // =========================================================================
    // --- SCENE 4: 前往松德的坡道段 (10500 ~ 14000) ---
    // Platforms reduced by 41.7% (from 12 to 7). Ground Reset Zone: 13300 ~ 14000
    // =========================================================================
    this.pm.addPlatform(10750, 450, 180, 24, 'brick');
    this.pm.addPlatform(11050, 380, 180, 24, 'brick');
    this.pm.addPlatform(11350, 440, 180, 24, 'brick');
    this.pm.addPlatform(11650, 360, 180, 24, 'brick');
    this.pm.addPlatform(12350, 430, 180, 24, 'brick');
    this.pm.addPlatform(12680, 360, 180, 24, 'brick');
    this.pm.addPlatform(13000, 430, 180, 24, 'brick');

    // S4 Collectibles: 20 Coins + 2 Coffee (Coffee only on jump platforms)
    [10620, 10850, 11080, 11310, 11540, 11770, 11900, 12200, 12450, 12700, 12950, 13200, 13450, 13680, 13900].forEach(cx => {
      this.pm.addItem('coin', cx, groundY - 35);
    });
    this.pm.addItem('coin', 10750, 410);
    this.pm.addItem('coin', 11350, 400);
    this.pm.addItem('coin', 11650, 320);
    this.pm.addItem('coin', 12350, 390);
    this.pm.addItem('coin', 13000, 390);

    // S4 Coffee (reduced to 2 cups; both require an active jump)
    this.pm.addItem('coffee', 11050, 340);
    this.pm.addItem('coffee', 12680, 320);

    // S4 Monsters
    this.spawnMonsterOnGround('obsidian', 10800);
    this.spawnMonsterOnPlatform('red', 11050);
    this.spawnMonsterOnGround('obsidian', 11350);
    this.spawnFlyingMonster('grape', 11500, 240);
    this.spawnMonsterOnPlatform('yellow', 11650);
    this.spawnMonsterOnGround('ice', 12350);
    this.spawnMonsterOnPlatform('red', 12680);
    this.spawnMonsterOnGround('blue', 12950);
    this.spawnFlyingMonster('pink', 13200, 220);
    this.spawnMonsterOnGround('obsidian', 13500);
    this.spawnMonsterOnGround('yellow', 13800);

    // =========================================================================
    // --- SCENE 5: 松德院區 (14000 ~ 18000) ---
    // =========================================================================
    // 5.1 院區前庭引道 (14000 ~ 14800)
    this.pm.addPlatform(14180, 440, 180, 24, 'brick');
    this.pm.addPlatform(14460, 360, 180, 24, 'brick');
    this.pm.addPlatform(14700, 430, 170, 24, 'brick');

    this.pm.addItem('coin', 14200, 390);
    this.pm.addItem('coffee', 14460, 320);
    this.pm.addItem('coin', 14720, 380);
    this.pm.addItem('coin', 14180, 400);  // extra platform coin

    this.spawnMonsterOnGround('obsidian', 14220);
    this.spawnMonsterOnPlatform('grape', 14460);
    this.spawnMonsterOnGround('blue', 14740);

    // 5.2 ★ 夢影巨花王 Boss Arena (14800 ~ 16500) ★
    // 嚴格 1700px 連續平整石板地板，0 坑洞
    this.pm.addPlatform(15150, 410, 180, 24, 'brick');
    this.pm.addPlatform(15650, 340, 180, 24, 'brick');
    this.pm.addPlatform(16150, 410, 180, 24, 'brick');
    this.pm.addItem('coffee', 15650, 300);
    this.pm.addItem('coin', 16150, 370);    // extra coin on far platform

    // 5.3 ★ 松德醫院挑高大廳・最終打卡點 (16500 ~ 18000) ★
    this.pm.addPlatform(16750, 440, 180, 24, 'brick');
    this.pm.addPlatform(17050, 370, 180, 24, 'brick');
    this.pm.addPlatform(17350, 440, 180, 24, 'brick');

    this.pm.addItem('coin', 16780, 390);
    this.pm.addItem('coffee', 17050, 330);
    this.pm.addItem('coin', 17380, 390);
    this.pm.addItem('coin', 16600, groundY - 35);   // corridor coin

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

    // Check 30 coins trigger -> Predator Mode (Attack Phase II)
    if (player && player.coins >= 30 && !this.phase2PredatorTriggered) {
      this.triggerPhase2Predator(player);
    }

    this.telegraphStaggerTimer = Math.max(0, this.telegraphStaggerTimer - dt);
    const phase2 = player.coins >= 30;
    const attackerLimit = phase2 ? 3 : 2;
    const rangedLimit = phase2 ? 2 : 1;
    const projectilePressureLimit = 3;
    const hostileProjectileCount = projectiles.projectiles.filter(p => !p.isPlayer).length;
    const visible = this.monsters
      .filter(m => !m.isDead && m.x >= camera.x - 100 && m.x <= camera.x + camera.viewportWidth + 100)
      .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x));
    const permitted = new Set(visible.filter(m => m.isTelegraphing));
    let rangedCount = [...permitted].filter(m => m.config.type === 'ranged' || m.config.type === 'flying').length;
    for (const monster of visible) {
      if (permitted.size >= attackerLimit) break;
      const ranged = monster.config.type === 'ranged' || monster.config.type === 'flying';
      if (ranged && (rangedCount >= rangedLimit || hostileProjectileCount >= projectilePressureLimit)) continue;
      permitted.add(monster);
      if (ranged) rangedCount++;
    }

    // Update active monsters
    for (let m of this.monsters) {
      const nearPlayer = Math.abs(m.x - player.x) < 750;
      const rearReentry = m.attackPhase === 2 && m.isPursuer && player.x - m.x > 750 && player.x - m.x < 1400;
      if (nearPlayer || rearReentry) {
        m.attackPermission = permitted.has(m);
        m.telegraphStartAllowed = this.telegraphStaggerTimer <= 0;
        const wasTelegraphing = m.isTelegraphing;
        m.update(dt, player, this.pm.platforms);
        if (!wasTelegraphing && m.isTelegraphing) this.telegraphStaggerTimer = 0.25;
      }
    }
    
    // Cleanup dead monsters and those extremely far behind (allow rear pursuer buffer)
    this.monsters = this.monsters.filter(m => !m.isDead && m.x > camera.x - 1600);
  }

  triggerPhase2Predator(player) {
    this.phase2PredatorTriggered = true;

    // Spawn Phase 2 Predator Reinforcements (rear, front, air, and intercept pressure)
    // Rear pursuers: spawn behind player to prevent easy continuous retreat
    const rearX = Math.max(100, player.x - 420);
    this.spawnMonsterOnGround('obsidian', rearX);
    this.spawnFlyingMonster('grape', Math.max(100, player.x - 300), 220);

    // Front ground blocker and aerial harassment
    this.spawnMonsterOnGround('blue', player.x + 420);
    this.spawnFlyingMonster('pink', player.x + 450, 210);

    // S3 Reinforcements (7000 ~ 10500)
    this.spawnMonsterOnPlatform('red', 7850);
    this.spawnMonsterOnGround('ice', 8900);
    this.spawnFlyingMonster('grape', 9200, 210);
    this.spawnMonsterOnPlatform('obsidian', 9980);
    this.spawnMonsterOnGround('blue', 10300);

    // S4 Reinforcements (10500 ~ 14000)
    this.spawnMonsterOnPlatform('blue', 10750);
    this.spawnMonsterOnPlatform('red', 11350);
    this.spawnFlyingMonster('grape', 11800, 230);
    this.spawnMonsterOnPlatform('yellow', 12350);
    this.spawnMonsterOnGround('ice', 12700);
    this.spawnMonsterOnPlatform('red', 13000);
    this.spawnFlyingMonster('pink', 13600, 220);

    // S5 Forecourt Reinforcements (14000 ~ 14800)
    this.spawnMonsterOnPlatform('obsidian', 14180);
    this.spawnMonsterOnGround('ice', 14500);
    this.spawnFlyingMonster('grape', 14650, 210);

    // Assign a tactical role and apply one authoritative transition after all monsters exist.
    let flankSide = -1;
    for (let m of this.monsters) {
      if (m.isDead) continue;
      if (m.config.type === 'flying') {
        m.assignPredatorRole('air_harasser');
      } else if (m.x < player.x - 180) {
        m.assignPredatorRole('rear_pursuer');
      } else if (m.x > player.x + 180) {
        m.assignPredatorRole('front_blocker');
      } else {
        m.assignPredatorRole('flanker', flankSide);
        flankSide *= -1;
      }
      m.triggerAttackPhase2();
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
    // 2.5 Continuous Transition Fog & Horizon Alignment (Zones 1~5)
    // -------------------------------------------------------------
    const TRANSITION_ZONES = [
      { start: 3300, end: 3700, fogColor: 'rgba(255, 230, 190, 0.14)' },  // S1 -> S2
      { start: 6800, end: 7200, fogColor: 'rgba(129, 212, 250, 0.16)' },  // S2 -> S3
      { start: 10300, end: 10700, fogColor: 'rgba(176, 190, 197, 0.15)' }, // S3 -> S4
      { start: 13800, end: 14200, fogColor: 'rgba(233, 30, 99, 0.12)' },   // S4 -> S5
      { start: 16200, end: 16800, fogColor: 'rgba(255, 249, 196, 0.15)' }  // Arena -> Lobby
    ];

    for (const tz of TRANSITION_ZONES) {
      if (camX + vw >= tz.start && camX <= tz.end) {
        const tStartScreen = Math.max(0, tz.start - camX);
        const tEndScreen = Math.min(vw, tz.end - camX);
        const width = tEndScreen - tStartScreen;
        if (width > 0) {
          const fogGrad = ctx.createLinearGradient(tStartScreen, 0, tEndScreen, 0);
          fogGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          fogGrad.addColorStop(0.5, tz.fogColor);
          fogGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.save();
          ctx.fillStyle = fogGrad;
          ctx.fillRect(tStartScreen, 0, width, vh);
          ctx.restore();
        }
      }
    }

    // v9.9.3 Boss Arena Atmospheric Enhancement includes the 150px left soft-boundary strip.
    if (camX + vw >= 14650 && camX <= 16500) {
      ctx.save();
      const arenaScreenLeft = Math.max(0, 14650 - camX);
      const arenaScreenRight = Math.min(vw, 16500 - camX);
      const arenaW = arenaScreenRight - arenaScreenLeft;
      if (arenaW > 0) {
        // Dark crimson ominous sky wash
        ctx.fillStyle = 'rgba(40, 5, 20, 0.18)';
        ctx.fillRect(arenaScreenLeft, 0, arenaW, vh);
        // Ground crimson pulse
        const pulse = 0.04 + 0.02 * Math.sin(Date.now() * 0.003);
        ctx.fillStyle = `rgba(233, 30, 99, ${pulse})`;
        ctx.fillRect(arenaScreenLeft, vh * 0.5, arenaW, vh * 0.5);

        // Soft-boundary mist: same Boss palette, visually communicates that combat pressure continues here.
        const softLeft = Math.max(0, 14650 - camX);
        const softRight = Math.min(vw, 14800 - camX);
        if (softRight > softLeft) {
          const softGrad = ctx.createLinearGradient(softLeft, 0, softRight, 0);
          softGrad.addColorStop(0, 'rgba(136, 14, 79, 0.30)');
          softGrad.addColorStop(0.55, 'rgba(233, 30, 99, 0.18)');
          softGrad.addColorStop(1, 'rgba(40, 5, 20, 0.18)');
          ctx.fillStyle = softGrad;
          ctx.fillRect(softLeft, 0, softRight - softLeft, vh);
        }
      }
      ctx.restore();
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
