/**
 * 08點上班大作戰：通勤英雄篇 - 怪物與 Boss 資料庫 (Monsters.js)
 * 數值規範：
 * - 輕怪傷害 4~7 HP
 * - 重怪傷害 6~9 HP
 * - Boss 傷害 6~10 HP
 * - Telegraph 時間：約 0.4 秒 (25 frames @ 60fps)，3 次警示閃爍，80ms 前最亮
 */

export const MONSTER_TYPES = {
  red: {
    id: 'monster_red',
    name: '尖鼻小紅苗',
    type: 'light',
    hp: 60,
    speed: 95,
    contactDamage: 7,
    attackDamage: 9,
    attackCooldown: 1.5,
    telegraphDuration: 0.30,
    asset: 'assets/monster_red.png',
    color: '#FF5252',
    desc: '紅色流線身體、尖突長鼻。發動超遠射程高速貫通刺針，威脅性極高。',
    telegraphType: 'line_laser',
    score: 120
  },

  ice: {
    id: 'monster_ice',
    name: '稜角冰晶怪',
    type: 'medium',
    hp: 95,
    speed: 65,
    contactDamage: 8,
    attackDamage: 10,
    attackCooldown: 1.9,
    telegraphDuration: 0.32,
    asset: 'assets/monster_ice.png',
    color: '#40C4FF',
    desc: '淡藍菱形幾何晶體身體。重壓釋放雙向大範圍冰霜地裂波，橫掃整個平台。',
    telegraphType: 'ice_circle',
    score: 180
  },

  grape: {
    id: 'monster_grape',
    name: '紫葡花結毒姬',
    type: 'ranged',
    hp: 75,
    speed: 60,
    contactDamage: 6,
    attackDamage: 9,
    attackCooldown: 1.6,
    telegraphDuration: 0.32,
    asset: 'assets/monster_grape.png',
    color: '#BA68C8',
    desc: '白色軀體、葡萄串髮球與粉色大蝴蝶結。三連發拋物線毒霧彈幕，覆蓋全空域。',
    telegraphType: 'purple_lob',
    score: 160
  },

  blue: {
    id: 'monster_blue',
    name: '藍滴芽精',
    type: 'fast',
    hp: 55,
    speed: 140,
    contactDamage: 6,
    attackDamage: 8,
    attackCooldown: 1.3,
    telegraphDuration: 0.26,
    asset: 'assets/monster_blue.png',
    color: '#00E5FF',
    desc: '水滴狀藍色身體。高速雙重水刃瞬發，直貫全屏，考驗玩家跳躍時機。',
    telegraphType: 'water_slash',
    score: 140
  },

  yellow: {
    id: 'monster_yellow',
    name: '金花瓣使',
    type: 'ranged',
    hp: 80,
    speed: 65,
    contactDamage: 7,
    attackDamage: 9,
    attackCooldown: 1.8,
    telegraphDuration: 0.32,
    asset: 'assets/monster_yellow.png',
    color: '#FFD700',
    desc: '鵝黃花瓣造型。向前釋放 5 道廣角扇形金花散射彈幕，密不透風。',
    telegraphType: 'petal_fan',
    score: 170
  },

  obsidian: {
    id: 'monster_obsidian',
    name: '玄晶葉衛',
    type: 'heavy',
    hp: 170,
    speed: 45,
    contactDamage: 12,
    attackDamage: 14,
    attackCooldown: 2.2,
    telegraphDuration: 0.36,
    asset: 'assets/monster_obsidian.png',
    color: '#3949AB',
    desc: '深藍紫厚重黑曜晶體巨怪。重擊撼動全地表並引發尖石地刺，不可硬碰。',
    telegraphType: 'ground_tremor',
    score: 280
  },

  pink: {
    id: 'monster_pink',
    name: '粉翼花靈',
    type: 'flying',
    hp: 60,
    speed: 125,
    contactDamage: 6,
    attackDamage: 8,
    attackCooldown: 1.4,
    telegraphDuration: 0.28,
    asset: 'assets/monster_pink.png',
    color: '#FF80AB',
    desc: '粉嫩羽翼花冠精靈。高空滑翔巡邏並向下俯衝投擲三重花粉爆彈。',
    telegraphType: 'pink_dive',
    score: 150
  }
};

export const BOSS_CONFIG = {
  id: 'boss_flower_king',
  name: '夢影巨花王',
  title: '晨霧夢境的支配者',
  maxHp: 1200,
  phase1Threshold: 1200,
  phase2Threshold: 600, // <= 600 觸發 Phase 2 狂暴盛開態
  width: 220,
  height: 250,
  arena: {
    startX: 5800,
    endX: 7200,
    width: 1400,       // 嚴格 1400px 連續平整地板
    groundY: 560,
    wallLeft: 5800,
    wallRight: 7200
  },
  phase1: {
    attackCooldown: 1.6,
    petalDamage: 8,
    vineDamage: 10,
    summonCooldown: 6.0,
    bulletSpeed: 270,
    colorTheme: '#E91E63'
  },
  phase2: {
    name: '夢影巨花王・狂暴盛開態',
    bannerText: 'PHASE 2：夢境狂暴盛開！',
    attackCooldown: 0.95,
    petalDamage: 11,
    vineDamage: 15,
    summonCooldown: 4.2,
    bulletSpeed: 330,
    colorTheme: '#880E4F'
  }
};
