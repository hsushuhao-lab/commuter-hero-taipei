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
    hp: 55,
    speed: 165,
    contactDamage: 10,
    attackDamage: 12,
    attackCooldown: 1.2,
    telegraphDuration: 0.40,
    asset: 'assets/monster_blue.png',
    assetP2: 'assets/monster_blue_p2.png',
    color: '#00E5FF',
    desc: '水滴狀藍色流線身體。極速狂奔，瞬發超音速雙重水刃直貫全屏！',
    telegraphType: 'water_slash',
    score: 140,
    phase2: {
      name: '激流藍葉王',
      hp: 95,
      speed: 195,
      attackDamage: 18,
      attackCooldown: 0.95,
      asset: 'assets/monster_blue_p2.png',
      desc: '周圍大量水滴與水晶環繞，三連高速穿梭水刃！'
    }
  },

  red: {
    id: 'monster_red',
    name: '尖鼻小紅苗',
    type: 'light',
    role: '長程重穿刺針手',
    hp: 70,
    speed: 115,
    contactDamage: 12,
    attackDamage: 15,
    attackCooldown: 1.4,
    telegraphDuration: 0.40,
    asset: 'assets/monster_red.png',
    assetP2: 'assets/monster_red_p2.png',
    color: '#FF5252',
    desc: '紅色流線身體、尖突長鼻。發射超遠射程貫穿赤紅重刺，橫掃直通路徑！',
    telegraphType: 'line_laser',
    score: 130,
    phase2: {
      name: '烈焰紅苗',
      hp: 110,
      speed: 155,
      attackDamage: 22,
      attackCooldown: 1.1,
      asset: 'assets/monster_red_p2.png',
      desc: '鮮紅葉片裝甲，連續二段火紅殘影突刺！'
    }
  },

  pink: {
    id: 'monster_pink',
    name: '粉翼花靈',
    type: 'flying',
    role: '高空俯衝轟炸機',
    hp: 65,
    speed: 140,
    contactDamage: 10,
    attackDamage: 13,
    attackCooldown: 1.3,
    telegraphDuration: 0.40,
    asset: 'assets/monster_pink.png',
    assetP2: 'assets/monster_pink_p2.png',
    color: '#FF80AB',
    desc: '粉嫩雙翼、精緻花冠。高空高速滑翔巡遊，俯衝連投雙枚花粉重爆彈！',
    telegraphType: 'pink_dive',
    score: 150,
    phase2: {
      name: '粉翼魅花仙',
      hp: 105,
      speed: 175,
      attackDamage: 18,
      attackCooldown: 1.0,
      asset: 'assets/monster_pink_p2.png',
      desc: '透明花瓣大翼展開，閃光花粉致盲緩速干擾！'
    }
  },

  ice: {
    id: 'monster_ice',
    name: '稜角冰晶怪',
    type: 'medium',
    role: '重型冰霜震波坦',
    hp: 130,
    speed: 65,
    contactDamage: 15,
    attackDamage: 17,
    attackCooldown: 1.8,
    telegraphDuration: 0.40,
    asset: 'assets/monster_ice.png',
    assetP2: 'assets/monster_ice_p2.png',
    color: '#40C4FF',
    desc: '淡藍菱形幾何厚重冰晶。重壓釋放雙向滾動大範圍冰霜地裂波，橫掃整個平台！',
    telegraphType: 'ice_circle',
    score: 190,
    phase2: {
      name: '極凍冰花怪',
      hp: 200,
      speed: 85,
      attackDamage: 24,
      attackCooldown: 1.3,
      asset: 'assets/monster_ice_p2.png',
      desc: '晶體更大花朵展開，連續多枚雙向冰晶地裂衝擊！'
    }
  },

  grape: {
    id: 'monster_grape',
    name: '紫葡花結毒姬',
    type: 'ranged',
    role: '三連曲射毒霧法師',
    hp: 90,
    speed: 55,
    contactDamage: 11,
    attackDamage: 14,
    attackCooldown: 1.5,
    telegraphDuration: 0.40,
    asset: 'assets/monster_grape.png',
    assetP2: 'assets/monster_grape_p2.png',
    color: '#BA68C8',
    desc: '白色小巧軀體、葡萄串髮球與粉色大蝴蝶結。三連發拋物線毒霧彈幕，覆蓋全空域！',
    telegraphType: 'purple_lob',
    score: 170,
    phase2: {
      name: '魅影葡後',
      hp: 150,
      speed: 75,
      attackDamage: 20,
      attackCooldown: 1.15,
      asset: 'assets/monster_grape_p2.png',
      desc: '葡萄王冠盛開披風招展，超大範圍濃郁劇毒迷霧！'
    }
  },

  yellow: {
    id: 'monster_yellow',
    name: '金花瓣使',
    type: 'ranged',
    role: '廣角重砲散彈手',
    hp: 105,
    speed: 50,
    contactDamage: 12,
    attackDamage: 15,
    attackCooldown: 1.7,
    telegraphDuration: 0.40,
    asset: 'assets/monster_yellow.png',
    assetP2: 'assets/monster_yellow_p2.png',
    color: '#FFD700',
    desc: '高貴鵝黃花瓣造型。向前釋放 5 道 75 度廣角扇形金花散射彈幕，密不透風！',
    telegraphType: 'petal_fan',
    score: 180,
    phase2: {
      name: '耀陽金花聖使',
      hp: 160,
      speed: 70,
      attackDamage: 21,
      attackCooldown: 1.25,
      asset: 'assets/monster_yellow_p2.png',
      desc: '旋轉金色花瓣雨，難以預測的多角度旋轉花瓣風暴！'
    }
  },

  obsidian: {
    id: 'monster_obsidian',
    name: '玄晶葉衛',
    type: 'heavy',
    role: '超重裝黑曜巨獸',
    hp: 240,
    speed: 38,
    contactDamage: 20,
    attackDamage: 24,
    attackCooldown: 2.1,
    telegraphDuration: 0.40,
    asset: 'assets/monster_obsidian.png',
    assetP2: 'assets/monster_obsidian_p2.png',
    color: '#3949AB',
    desc: '深藍紫厚重黑曜晶體巨怪。重擊撼動全地表並引發巨大尖石地刺，不可硬碰！',
    telegraphType: 'ground_tremor',
    score: 300,
    phase2: {
      name: '玄曜晶晶泰坦',
      hp: 360,
      speed: 50,
      attackDamage: 32,
      attackCooldown: 1.6,
      asset: 'assets/monster_obsidian_p2.png',
      desc: '生長巨大紫色晶簇裝甲，全場震地衝擊波與巨石連續爆破！'
    }
  },

  transit: {
    id: 'monster_transit',
    name: '車票幽靈',
    disabled: true, // v9.5: 悠遊卡怪獸已從遊戲正式排除
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
      attackDamage: 22,
      attackCooldown: 1.1,
      asset: 'assets/monster_transit_p2.png',
      desc: '彩虹捷運光帶纏繞。'
    }
  }
};

export const BOSS_CONFIG = {
  id: 'boss_flower_king',
  name: '夢影巨花王',
  title: '晨霧夢境的支配者',
  maxHp: 2400,          // Phase 1 Max HP = 2400
  phase1Hp: 2400,       // v9.5: Phase 1 獨立血條
  phase2Hp: 3200,       // v9.5: Phase 2 獨立血條 (3200 HP)
  transformDuration: 2.8, // 2.8s 變身無敵
  width: 260,
  height: 280,
  // Anti-Facetank: vine cleave triggers after 1.2s of continuous close-range fighting
  antiFacetank: {
    distThreshold: 120,     // px - "in your face" distance
    standingDuration: 1.2,  // seconds before cleave triggers
    vineCleaveDamage: 18,   // damage on cleave
    vineCleaveKnockback: 250 // px knockback
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
    name: '夢影巨花王・晨霧守護態',
    bannerText: 'FINAL BOSS：松德正門前・夢影巨花王！「再睡一下……就一下下……」',
    attackCooldown: 1.35,   // 9-way spiral petals
    petalDamage: 15,
    petalCount: 9,          // 9-way interlaced spiral
    petalSpeed: 320,        // px/s
    vineDamage: 19,
    groundSpikeCount: 3,    // 3~4 consecutive ground spikes
    sporeDamage: 10,        // sleep spore damage
    sporeSlowDuration: 1.5, // seconds of slow on hit
    summonCooldown: 5.5,
    bulletSpeed: 320,
    colorTheme: '#E91E63'
  },
  phase2: {
    name: '夢影巨花王・狂暴盛開態',
    bannerText: 'PHASE 2：夢境狂暴盛開！「既然不讓我睡，那你也別想上班！」',
    attackCooldown: 0.85,
    petalDamage: 20,
    petalCount: 16,         // 360° 16-way crimson petal storm
    petalSpeed: 360,        // px/s
    targetedDamage: 26,
    vineDamage: 26,
    summonCooldown: 4.2,
    bulletSpeed: 360,
    chomperDamage: 22,      // Venus Flytrap chomp
    scytheDamage: 22,       // 死神鐮刀
    thornsDamage: 18,       // 旋刺龍卷
    miasmaDamage: 12,       // 暗影瘴氣
    colorTheme: '#880E4F'
  }
};

export const MONSTERS = MONSTER_TYPES;
