/**
 * 08點上班大作戰：通勤英雄篇 - 角色資料庫 (Characters.js)
 * 數值規範：總時間 120 秒、15 枚金幣永久解鎖大招、解鎖後無限施放（僅受冷卻限制）
 */

export const CHARACTERS = {
  yu: {
    id: 'yu',
    name: '禹志晨',
    title: '風之通勤者・準時守護者',
    role: '敏捷前鋒 / 風壓突破',
    desc: '任職於松德院區的行政專案管理師。個性沉著細心，隨身攜帶抗風折傘。上班路程即使颳風下雨，也能以驚人的步伐逆風前行。',
    quote: '「只要步伐夠快，風雨也追不上準時的決心！」',
    portrait: 'assets/hero_yu_portrait.png',
    animSheet: 'assets/hero_yu_anim.png',
    cleanChibi: 'assets/chibi_yu_clean.png',
    skillCard: 'assets/yu_skill_card.png',
    ultCard: 'assets/yu_ult_card.png',
    colors: {
      primary: '#0288D1',
      secondary: '#4FC3F7',
      accent: '#FFD54F',
      theme: '#29B6F6',
      bgGlow: 'rgba(79, 195, 247, 0.4)'
    },
    stats: {
      maxHp: 100,
      speed: 340,
      jumpForce: -620,
      gravity: 1400,
      skillCooldown: 2.2, // 秒
      ultCooldown: 9.0    // 秒
    },
    skill: {
      name: '雨傘風壓斬',
      key: 'S / J',
      cooldown: 2.2,
      damage: 35,
      range: 220,
      desc: '揮動折傘斬出青藍風刃，消弭前方敵彈並擊退敵人。'
    },
    ult: {
      name: '準時衝刺・逆風傘幕',
      key: 'F / K',
      cooldown: 9.0,
      damage: 180,
      duration: 1.8,
      desc: '展開抗風折傘高速貫穿突進，釋放 7 道大型風刃與金色雷光，清空全屏彈幕並賦予 1.8 秒無敵。'
    }
  },

  shakira: {
    id: 'shakira',
    name: '夏奇拉',
    title: '元氣甜心・美乃滋召喚師',
    role: '遠程彈幕 / 活力輔助',
    desc: '身穿薰衣草紫 T-shirt 的熱血青年，胸前印著金色皇冠與 Oeuf Mayo!。最愛台北早餐店的半熟蛋與流心美乃滋，將早餐能量化為奇幻魔法。',
    quote: '「把美味的元氣，變成前進的力量！元氣加滿，出發～！」',
    portrait: 'assets/hero_shakira_portrait.png',
    animSheet: 'assets/hero_shakira_anim.png',
    cleanChibi: 'assets/chibi_shakira_clean.png',
    skillCard: 'assets/sh_skill_card.png',
    ultCard: 'assets/sh_ult_card.png',
    colors: {
      primary: '#8E24AA',
      secondary: '#CE93D8',
      accent: '#FFD54F',
      theme: '#AB47BC',
      bgGlow: 'rgba(206, 147, 216, 0.4)'
    },
    stats: {
      maxHp: 90,
      speed: 320,
      jumpForce: -640,
      gravity: 1350,
      skillCooldown: 1.8,
      ultCooldown: 10.0
    },
    skill: {
      name: '美乃滋噴射・蛋能彈',
      key: 'S / J',
      cooldown: 1.8,
      damage: 30,
      range: 360,
      desc: '連發兩枚金色流心蛋彈，命中濺射出美乃滋星爆，射程三人中最遠。'
    },
    ult: {
      name: '元氣蛋浪・Oeuf Mayo 星雨',
      key: 'F / K',
      cooldown: 10.0,
      damage: 160,
      heal: 30,
      duration: 2.2,
      desc: '張開巨大星環，漫天傾瀉金色流星蛋雨與蛋白光環，全屏轟炸、回復 30 HP 並獲 3 秒元氣護盾。'
    }
  },

  sandra: {
    id: 'sandra',
    name: '珊卓澎',
    title: '熱血主廚・平底鍋戰神',
    role: '近戰重擊 / 火力壓制',
    desc: '圍著滿版海鸚鵡 (Puffin) 圍裙的霸氣料理達人。手持厚重鑄鐵平底鍋，以狂暴的熱炒鍋氣與新鮮番茄、青花菜擊飛一切通勤阻礙。',
    quote: '「上班打卡如同熱鍋搶秒，火候到位，沒人能擋我的路！」',
    portrait: 'assets/hero_sandra_portrait.png',
    animSheet: 'assets/hero_sandra_anim.png',
    cleanChibi: 'assets/chibi_sandra_clean.png',
    skillCard: 'assets/sa_skill_card.png',
    ultCard: 'assets/sa_ult_card.png',
    colors: {
      primary: '#D84315',
      secondary: '#FF7043',
      accent: '#FFA726',
      theme: '#F4511E',
      bgGlow: 'rgba(255, 112, 67, 0.4)'
    },
    stats: {
      maxHp: 120,
      speed: 310,
      jumpForce: -610,
      gravity: 1450,
      skillCooldown: 2.5,
      ultCooldown: 8.5
    },
    skill: {
      name: '爆炒上菜・鐵鍋重擊',
      key: 'S / J',
      cooldown: 2.5,
      damage: 48,
      range: 170,
      knockback: 420,
      desc: '揮出帶有熾熱火花的鑄鐵鍋重擊，伴隨番茄青花菜殘影，產生強大擊退力與地面衝擊波。'
    },
    ult: {
      name: '主廚旋風鍋・海鷗料理風暴',
      key: 'F / K',
      cooldown: 8.5,
      damage: 210,
      duration: 2.0,
      desc: '雙手握鍋旋轉掀起料理龍捲，向四周釋放 14 道火炎旋轉鍋氣，將敵群吸向中心後劇烈震退擊破！'
    }
  }
};
