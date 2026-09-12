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
      skillCooldown: 0, // 零冷卻！無限連續發射
      ultCooldown: 9.0    // 秒
    },
    skill: {
      name: '雨傘風壓斬',
      key: 'S / J',
      cooldown: 0,
      damage: 35,
      range: 850,
      desc: '揮動折傘斬出青藍風刃，零冷卻無限連發！消弭前方敵彈並破空穿透。'
    },
    ult: {
      name: '準時衝刺・逆風傘幕',
      key: 'F / K',
      cooldown: 9.0,
      damage: 180,
      duration: 1.8,
      desc: '展開抗風折傘高速貫穿突進，釋放 7 道大型風刃與金色雷光，清空全屏彈幕並賦予 1.8 秒無敵。'
    },
    form2: {
      name: '通勤戰術型態',
      title: '機能守護・風刃貫穿',
      asset: 'assets/hero_yu_form2.png',
      desc: '黑藍機能型外套護片、強化傘骨、淡藍能量線。風壓斬面積提升 100%，反制飛行彈幕，無敵突進貫穿全場！',
      speedBuff: 45,
      hpBuff: 35,
      skillBuffDesc: '雨傘風壓斬範圍 +100%，可反彈敵方投射物！'
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
      skillCooldown: 0,
      ultCooldown: 10.0
    },
    skill: {
      name: '美乃滋噴射・蛋能彈',
      key: 'S / J',
      cooldown: 0,
      damage: 28,
      range: 900,
      desc: '零冷卻無限連發雙子流心蛋彈，射速極高，命中濺射出美乃滋星爆！'
    },
    ult: {
      name: '元氣蛋浪・Oeuf Mayo 星雨',
      key: 'F / K',
      cooldown: 10.0,
      damage: 160,
      heal: 30,
      duration: 2.2,
      desc: '張開巨大星環，漫天傾瀉金色流星蛋雨與蛋白光環，全屏轟炸、回復 30 HP 並獲 3 秒元氣護盾。'
    },
    form2: {
      name: '晨光蛋浪型態',
      title: '美味療癒・流心環繞',
      asset: 'assets/hero_shakira_form2.png',
      desc: '白金晨光能量護裝。召喚 3~5 枚流心 Mayo Orbs 環繞防禦，自動反擊並吸收子彈！',
      speedBuff: 35,
      hpBuff: 45,
      skillBuffDesc: '流心 Mayo Orbs 永久環繞護體，自動吸收敵彈！'
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
      skillCooldown: 0,
      ultCooldown: 8.5
    },
    skill: {
      name: '爆炒上菜・鐵鍋重擊',
      key: 'S / J',
      cooldown: 0,
      damage: 42,
      range: 800,
      knockback: 450,
      desc: '零冷卻無限狂轟鑄鐵鍋氣烈焰，伴隨番茄青花菜殘影與強烈衝擊波！'
    },
    ult: {
      name: '主廚旋風鍋・海鷗料理風暴',
      key: 'F / K',
      cooldown: 8.5,
      damage: 210,
      duration: 2.0,
      desc: '雙手握鍋旋轉掀起料理龍捲，向四周釋放 14 道火炎旋轉鍋氣，將敵群吸向中心後劇烈震退擊破！'
    },
    form2: {
      name: '滿漢戰鬥主廚型態',
      title: '料理怒火・爆炒龍捲',
      asset: 'assets/hero_sandra_form2.png',
      desc: '主廚頭巾、料理護具、強化鑄鐵鍋。平底鍋常駐金橙烈焰光環，爆炒引發巨型火炎龍捲！',
      speedBuff: 30,
      hpBuff: 60,
      skillBuffDesc: '平底鍋常駐金橙烈焰，爆炒攻擊範圍翻倍！'
    }
  }
};
