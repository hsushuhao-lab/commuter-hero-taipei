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
    hp: 45,
    speed: 70,
    contactDamage: 5,
    attackDamage: 6,
    attackCooldown: 2.4,
    telegraphDuration: 0.42,
    asset: 'assets/monster_red.png',
    color: '#FF5252',
    desc: '紅色身體、尖突長鼻、頭頂綠葉。會鎖定玩家並進行直線刺擊。',
    telegraphType: 'line_laser',
    score: 100
  },

  ice: {
    id: 'monster_ice',
    name: '稜角冰晶怪',
    type: 'medium',
    hp: 70,
    speed: 55,
    contactDamage: 6,
    attackDamage: 7,
    attackCooldown: 2.8,
    telegraphDuration: 0.44,
    asset: 'assets/monster_ice.png',
    color: '#40C4FF',
    desc: '淡藍菱形幾何晶體身體，頂著黃色小花。會躍起重壓引發冰霜衝擊波。',
    telegraphType: 'ice_circle',
    score: 150
  },

  grape: {
    id: 'monster_grape',
    name: '紫葡花結毒姬',
    type: 'ranged',
    hp: 50,
    speed: 40,
    contactDamage: 4,
    attackDamage: 6,
    attackCooldown: 2.6,
    telegraphDuration: 0.45,
    asset: 'assets/monster_grape.png',
    color: '#BA68C8',
    desc: '白色小巧軀體、紅複眼、葡萄串髮球與粉色大蝴蝶結。漂浮在空中並噴吐毒霧泡泡。',
    telegraphType: 'purple_lob',
    score: 130
  },

  blue: {
    id: 'monster_blue',
    name: '藍滴芽精',
    type: 'fast',
    hp: 40,
    speed: 110,
    contactDamage: 4,
    attackDamage: 5,
    attackCooldown: 2.0,
    telegraphDuration: 0.38,
    asset: 'assets/monster_blue.png',
    color: '#00E5FF',
    desc: '水滴狀藍色流線身體、頂部帶有白花苞。動作靈敏，能切出高速水刃。',
    telegraphType: 'water_slash',
    score: 110
  },

  yellow: {
    id: 'monster_yellow',
    name: '金花瓣使',
    type: 'ranged',
    hp: 55,
    speed: 45,
    contactDamage: 5,
    attackDamage: 6,
    attackCooldown: 3.0,
    telegraphDuration: 0.42,
    asset: 'assets/monster_yellow.png',
    color: '#FFD700',
    desc: '鵝黃花瓣造型，動作優雅高貴。會朝向前方釋放扇形花瓣彈幕。',
    telegraphType: 'petal_fan',
    score: 140
  },

  obsidian: {
    id: 'monster_obsidian',
    name: '玄晶葉衛',
    type: 'heavy',
    hp: 120,
    speed: 35,
    contactDamage: 8,
    attackDamage: 9,
    attackCooldown: 3.2,
    telegraphDuration: 0.48,
    asset: 'assets/monster_obsidian.png',
    color: '#3949AB',
    desc: '深藍紫厚重黑曜晶體巨怪，背負闊綠葉片。高 HP、重型地面震波，擔當守門角色。',
    telegraphType: 'ground_tremor',
    score: 220
  },

  pink: {
    id: 'monster_pink',
    name: '粉翼花靈',
    type: 'flying',
    hp: 42,
    speed: 85,
    contactDamage: 4,
    attackDamage: 5,
    attackCooldown: 2.2,
    telegraphDuration: 0.40,
    asset: 'assets/monster_pink.png',
    color: '#FF80AB',
    desc: '粉嫩羽翼、頭戴精緻花冠。以波浪形軌跡在空中滑行，發動花粉閃光俯衝。',
    telegraphType: 'pink_dive',
    score: 120
  }
};

export const BOSS_CONFIG = {
  id: 'boss_flower_king',
  name: '夢影巨花王',
  title: '晨霧夢境的支配者',
  maxHp: 1000,
  phase1Threshold: 1000,
  phase2Threshold: 500, // <= 500 觸發 Phase 2 狂暴盛開態
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
    attackCooldown: 2.2,
    petalDamage: 6,
    vineDamage: 8,
    summonCooldown: 9.0,
    bulletSpeed: 200,
    colorTheme: '#E91E63'
  },
  phase2: {
    name: '夢影巨花王・狂暴盛開態',
    bannerText: 'PHASE 2：夢境狂暴盛開！',
    attackCooldown: 1.5,
    petalDamage: 8,
    vineDamage: 10,
    summonCooldown: 6.5,
    bulletSpeed: 260,
    colorTheme: '#880E4F'
  }
};
