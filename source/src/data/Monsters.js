/**
 * 08點上班大作戰：通勤英雄篇 - 怪物與 Boss 資料庫 (Monsters.js)
 * 數值規範：
 * - 輕怪傷害 4~7 HP
 * - 重怪傷害 6~9 HP
 * - Boss 傷害 6~10 HP
 * - Telegraph 時間：約 0.4 秒 (25 frames @ 60fps)，3 次警示閃爍，80ms 前最亮
 */

export const MONSTER_TYPES = {
  blue: {
    id: 'monster_blue',
    name: '藍滴芽精',
    type: 'fast',
    role: '極速先遣突進兵',
    hp: 78,                // v9.7.1 P1: 55 * 1.42
    speed: 165,
    contactDamage: 12,
    attackDamage: 12,      // v9.7.1 P1: v9.6 baseline (rebalanced from 15 for survivability)
    attackCooldown: 1.2,
    telegraphDuration: 0.40,
    asset: 'assets/monster_blue.png',
    assetP2: 'assets/monster_blue.png', // Strict: retain original image
    color: '#00E5FF',
    desc: '水滴狀藍色流線身體。極速狂奔，瞬發雙重水刃！',
    telegraphType: 'water_slash',
    score: 140,
    phase2: {
      name: '藍滴芽精・捕食獵殺態',
      hp: 120,
      speed: 215,
      attackDamage: 24,     // v9.7.1 P2: P1(12) * 2.0 = 24 (HARD RULE)
      attackCooldown: 0.60, // v9.7.1 P2: density x2 (1.2 / 2 = 0.60)
      asset: 'assets/monster_blue.png',
      desc: '三連高速穿梭水刃與吸附漩渦！'
    }
  },

  red: {
    id: 'monster_red',
    name: '尖鼻小紅苗',
    type: 'light',
    role: '長程重穿刺針手',
    hp: 98,                // v9.7.1 P1: 70 * 1.40
    speed: 115,
    contactDamage: 15,
    attackDamage: 15,      // v9.7.1 P1: v9.6 baseline (rebalanced from 18)
    attackCooldown: 1.4,
    telegraphDuration: 0.40,
    asset: 'assets/monster_red.png',
    assetP2: 'assets/monster_red.png',
    color: '#FF5252',
    desc: '紅色流線身體、尖突長鼻。發射超遠射程貫穿赤紅重刺！',
    telegraphType: 'line_laser',
    score: 130,
    phase2: {
      name: '尖鼻小紅苗・捕食獵殺態',
      hp: 145,
      speed: 165,
      attackDamage: 30,     // v9.7.1 P2: P1(15) * 2.0 = 30 (HARD RULE)
      attackCooldown: 0.70, // v9.7.1 P2: density x2 (1.4 / 2 = 0.70)
      asset: 'assets/monster_red.png',
      desc: '高速三連赤紅重刺衝擊！'
    }
  },

  pink: {
    id: 'monster_pink',
    name: '粉翼花靈',
    type: 'flying',
    role: '高空俯衝轟炸機',
    hp: 92,                // v9.7.1 P1: 65 * 1.42
    speed: 140,
    contactDamage: 12,
    attackDamage: 13,      // v9.7.1 P1: v9.6 baseline (rebalanced from 16)
    attackCooldown: 1.3,
    telegraphDuration: 0.40,
    asset: 'assets/monster_pink.png',
    assetP2: 'assets/monster_pink.png',
    color: '#FF80AB',
    desc: '粉嫩雙翼、精緻花冠。高空高速巡遊，俯衝投擲花粉重爆彈！',
    telegraphType: 'pink_dive',
    score: 150,
    phase2: {
      name: '粉翼花靈・捕食獵殺態',
      hp: 140,
      speed: 185,
      attackDamage: 26,     // v9.7.1 P2: P1(13) * 2.0 = 26 (HARD RULE)
      attackCooldown: 0.65, // v9.7.1 P2: density x2 (1.3 / 2 = 0.65)
      asset: 'assets/monster_pink.png',
      desc: '四連俯衝轟炸與滯留致盲花粉！'
    }
  },

  ice: {
    id: 'monster_ice',
    name: '稜角冰晶怪',
    type: 'medium',
    role: '重型冰霜震波坦',
    hp: 180,               // v9.7.1 P1: 130 * 1.38
    speed: 65,
    contactDamage: 18,
    attackDamage: 17,      // v9.7.1 P1: v9.6 baseline (rebalanced from 21)
    attackCooldown: 1.8,
    telegraphDuration: 0.40,
    asset: 'assets/monster_ice.png',
    assetP2: 'assets/monster_ice.png',
    color: '#40C4FF',
    desc: '淡藍菱形厚重冰晶。重壓釋放大範圍冰霜地裂波！',
    telegraphType: 'ice_circle',
    score: 190,
    phase2: {
      name: '稜角冰晶怪・捕食獵殺態',
      hp: 260,
      speed: 95,
      attackDamage: 34,     // v9.7.1 P2: P1(17) * 2.0 = 34 (HARD RULE)
      attackCooldown: 0.90, // v9.7.1 P2: density x2 (1.8 / 2 = 0.90)
      asset: 'assets/monster_ice.png',
      desc: '五向冰晶地裂暴風雪衝擊！'
    }
  },

  grape: {
    id: 'monster_grape',
    name: '紫葡花結毒姬',
    type: 'ranged',
    role: '三連曲射毒霧法師',
    hp: 126,               // v9.7.1 P1: 90 * 1.40
    speed: 55,
    contactDamage: 13,
    attackDamage: 14,      // v9.7.1 P1: v9.6 baseline (rebalanced from 17)
    attackCooldown: 1.5,
    telegraphDuration: 0.40,
    asset: 'assets/monster_grape.png',
    assetP2: 'assets/monster_grape.png',
    color: '#BA68C8',
    desc: '白色小巧軀體、葡萄串髮球。拋物線毒霧彈幕覆蓋全空域！',
    telegraphType: 'purple_lob',
    score: 170,
    phase2: {
      name: '紫葡花結毒姬・捕食獵殺態',
      hp: 190,
      speed: 85,
      attackDamage: 28,     // v9.7.1 P2: P1(14) * 2.0 = 28 (HARD RULE)
      attackCooldown: 0.75, // v9.7.1 P2: density x2 (1.5 / 2 = 0.75)
      asset: 'assets/monster_grape.png',
      desc: '五連發濃郁劇毒泥沼！'
    }
  },

  yellow: {
    id: 'monster_yellow',
    name: '金花瓣使',
    type: 'ranged',
    role: '廣角重砲散彈手',
    hp: 148,               // v9.7.1 P1: 105 * 1.41
    speed: 50,
    contactDamage: 15,
    attackDamage: 15,      // v9.7.1 P1: v9.6 baseline (rebalanced from 19)
    attackCooldown: 1.7,
    telegraphDuration: 0.40,
    asset: 'assets/monster_yellow.png',
    assetP2: 'assets/monster_yellow.png',
    color: '#FFD700',
    desc: '高貴鵝黃花瓣造型。向前釋放 5 道 75 度廣角金花散射彈幕！',
    telegraphType: 'petal_fan',
    score: 180,
    phase2: {
      name: '金花瓣使・捕食獵殺態',
      hp: 215,
      speed: 80,
      attackDamage: 30,     // v9.7.1 P2: P1(15) * 2.0 = 30 (HARD RULE)
      attackCooldown: 0.85, // v9.7.1 P2: density x2 (1.7 / 2 = 0.85)
      asset: 'assets/monster_yellow.png',
      desc: '八向旋轉金色花瓣全域圓環彈幕！'
    }
  },

  obsidian: {
    id: 'monster_obsidian',
    name: '玄晶葉衛',
    type: 'heavy',
    role: '超重裝黑曜巨獸',
    hp: 336,               // v9.7.1 P1: 240 * 1.40
    speed: 40,
    contactDamage: 24,
    attackDamage: 24,      // v9.7.1 P1: v9.6 baseline (rebalanced from 30 for survivability)
    attackCooldown: 2.1,
    telegraphDuration: 0.40,
    asset: 'assets/monster_obsidian.png',
    assetP2: 'assets/monster_obsidian.png',
    color: '#3949AB',
    desc: '深藍紫厚重黑曜晶體巨怪。重擊撼動地表引發地刺！',
    telegraphType: 'ground_tremor',
    score: 300,
    phase2: {
      name: '玄晶葉衛・捕食獵殺態',
      hp: 480,
      speed: 60,
      attackDamage: 48,     // v9.7.1 P2: P1(24) * 2.0 = 48 (HARD RULE)
      attackCooldown: 1.05, // v9.7.1 P2: density x2 (2.1 / 2 = 1.05)
      asset: 'assets/monster_obsidian.png',
      desc: '三連地刺震波與全場晶簇爆破！'
    }
  },

  transit: {
    id: 'monster_transit',
    name: '車票幽靈',
    disabled: true,
    type: 'ghost',
    role: '穿梭城市之旅途幽靈 (已退役)',
    hp: 85,
    speed: 95,
    contactDamage: 12,
    attackDamage: 16,
    attackCooldown: 1.4,
    telegraphDuration: 0.40,
    asset: 'assets/monster_transit_p1.png',
    assetP2: 'assets/monster_transit_p2.png',
    color: '#00E676',
    desc: '半透明奶白色捷運幽靈。',
    telegraphType: 'transit_beam',
    score: 220,
    phase2: {
      name: '悠遊卡寄靈',
      hp: 140,
      speed: 130,
      attackDamage: 32,
      attackCooldown: 0.70,
      asset: 'assets/monster_transit_p2.png',
      desc: '彩虹捷運光帶纏繞。'
    }
  }
};

export const BOSS_CONFIG = {
  id: 'boss_flower_king',
  name: '夢影巨花王',
  title: '晨霧夢境的支配者',
  maxHp: 3600,          // Phase 1 Max HP = 3600 (v9.7.1)
  phase1Hp: 3600,       // v9.7.1: Phase 1 獨立血條 (3600 HP, 2800 * 1.28)
  phase2Hp: 3050,       // v9.7.2: Phase 2 clear-time recovery target (Total = 6650 HP)
  transformDuration: 2.8, // 2.8s 變身無敵
  width: 260,
  height: 280,
  voiceLines: {
    p1Sleep: '再睡一下……就……一下下……',
    p2Transform: '現在……沒有人能逃離我的夢境！！'
  },
  // Anti-Facetank: vine cleave triggers after 1.2s of continuous close-range fighting
  antiFacetank: {
    distThreshold: 120,     // px - "in your face" distance
    standingDuration: 1.2,  // seconds before cleave triggers
    vineCleaveDamage: 24,   // damage on cleave
    vineCleaveKnockback: 280 // px knockback
  },
  arena: {
    startX: 14800,
    endX: 16500,
    width: 1700,       // 嚴格 1700px 連續平整石板地板
    groundY: 560,
    wallLeft: 14800,
    wallRight: 16500
  },
  phase1: {
    name: '夢影巨花王・夢境安撫態',
    bannerText: 'FINAL BOSS：松德正門前・夢影巨花王！「再睡一下……就……一下下……」',
    attackCooldown: 1.15,   // 9-way spiral petals
    petalDamage: 14,        // v9.7.2: lower Phase 1 burst while Phase 2 keeps Predator pressure
    petalCount: 11,          // 9-way interlaced spiral
    petalSpeed: 345,        // px/s
    vineDamage: 20,         // v9.7.2: lower Phase 1 burst while Phase 2 keeps Predator pressure
    groundSpikeCount: 3,    // 3~4 consecutive ground spikes
    sporeDamage: 14,        // sleep spore damage (11 * 1.27 = 14)
    sporeSlowDuration: 1.5, // seconds of slow on hit
    summonCooldown: 6.0,
    bulletSpeed: 330,
    colorTheme: '#E91E63'
  },
  phase2: {
    name: '夢影巨花王・狂暴盛開態',
    bannerText: 'PHASE 2：狂暴盛開！「現在……沒有人能逃離我的夢境！！」',
    attackCooldown: 0.58,   // v9.7.1: faster attack cadence
    petalDamage: 32,        // v9.7.1: 20 * 1.5 = 30
    petalCount: 18,         // 360° 16-way crimson petal storm
    petalSpeed: 405,        // px/s
    targetedDamage: 32,
    vineDamage: 42,
    summonCooldown: 4.5,
    bulletSpeed: 385,
    chomperDamage: 34,      // Venus Flytrap chomp
    scytheDamage: 34,       // 追擊藤蔓尖刺
    thornsDamage: 30,       // 旋刺龍卷
    miasmaDamage: 20,       // 夢幻花粉毒霧
    colorTheme: '#880E4F'
  }
};

export const MONSTERS = MONSTER_TYPES;
