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
    role: '極速突進刺客',
    hp: 55,
    speed: 165,
    contactDamage: 10,
    attackDamage: 12,
    attackCooldown: 1.2,
    telegraphDuration: 0.24,
    asset: 'assets/monster_blue.png',
    color: '#00E5FF',
    desc: '水滴狀藍色流線身體。極速狂奔，瞬發超音速雙重水刃直貫全屏！',
    telegraphType: 'water_slash',
    score: 140
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
    telegraphDuration: 0.28,
    asset: 'assets/monster_red.png',
    color: '#FF5252',
    desc: '紅色流線身體、尖突長鼻。發射超遠射程貫穿赤紅重刺，橫掃直通路徑！',
    telegraphType: 'line_laser',
    score: 130
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
    telegraphDuration: 0.26,
    asset: 'assets/monster_pink.png',
    color: '#FF80AB',
    desc: '粉嫩雙翼、精緻花冠。高空高速滑翔巡遊，俯衝連投雙枚花粉重爆彈！',
    telegraphType: 'pink_dive',
    score: 150
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
    telegraphDuration: 0.32,
    asset: 'assets/monster_ice.png',
    color: '#40C4FF',
    desc: '淡藍菱形幾何厚重冰晶。重壓釋放雙向滾動大範圍冰霜地裂波，橫掃整個平台！',
    telegraphType: 'ice_circle',
    score: 190
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
    telegraphDuration: 0.30,
    asset: 'assets/monster_grape.png',
    color: '#BA68C8',
    desc: '白色小巧軀體、葡萄串髮球與粉色大蝴蝶結。三連發拋物線毒霧彈幕，覆蓋全空域！',
    telegraphType: 'purple_lob',
    score: 170
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
    telegraphDuration: 0.30,
    asset: 'assets/monster_yellow.png',
    color: '#FFD700',
    desc: '高貴鵝黃花瓣造型。向前釋放 5 道 75 度廣角扇形金花散射彈幕，密不透風！',
    telegraphType: 'petal_fan',
    score: 180
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
    telegraphDuration: 0.35,
    asset: 'assets/monster_obsidian.png',
    color: '#3949AB',
    desc: '深藍紫厚重黑曜晶體巨怪。重擊撼動全地表並引發巨大尖石地刺，不可硬碰！',
    telegraphType: 'ground_tremor',
    score: 300
  }
};

export const BOSS_CONFIG = {
  id: 'boss_flower_king',
  name: '夢影巨花王',
  title: '晨霧夢境的支配者',
  maxHp: 1500,
  phase1Threshold: 1500,
  phase2Threshold: 750, // <= 750 觸發 Phase 2 狂暴盛開態
  width: 250,
  height: 270,
  arena: {
    startX: 5800,
    endX: 7200,
    width: 1400,       // 嚴格 1400px 連續平整地板
    groundY: 560,
    wallLeft: 5800,
    wallRight: 7200
  },
  phase1: {
    name: '夢影巨花王・晨霧守護態',
    bannerText: 'FINAL BOSS：松德大門前・夢影巨花王！',
    attackCooldown: 1.4,
    petalDamage: 14,
    vineDamage: 18,
    summonCooldown: 5.5,
    bulletSpeed: 290,
    colorTheme: '#E91E63'
  },
  phase2: {
    name: '夢影巨花王・狂暴深淵裂變態',
    bannerText: 'PHASE 2：深淵狂暴裂變！魔王真身現形！',
    attackCooldown: 0.85,
    petalDamage: 19,
    targetedDamage: 25,
    vineDamage: 26,
    summonCooldown: 3.6,
    bulletSpeed: 350,
    colorTheme: '#880E4F'
  }
};
