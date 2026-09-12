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
      speed: 350,
      jumpForce: -620,
      gravity: 1400,
      skillCooldown: 0.35, // 0.35s 靈敏折傘揮擊
      ultCooldown: 7.0     // 7.0s 逆風衝刺
    },
    skill: {
      name: '雨傘風壓斬',
      key: 'S / J',
      cooldown: 0.35,
      damage: 38,
      range: 150,           // 前方 150px
      arcAngle: 80,         // 前方 80 度弧形
      deflectRadius: 175,   // 敵彈反彈判定半徑 175px
      desc: '揮動抗風折傘斬出前方 150px 弧形風刃（CD 0.35s），175px 半徑內抵消前方敵彈！'
    },
    ult: {
      name: '準時衝刺・逆風傘幕',
      key: 'F / K',
      cooldown: 7.0,
      damage: 160,
      duration: 1.2,
      dashDistance: 650,    // 最多突進 650px
      desc: '展開抗風折傘向前高速突進最多 650px，1.2 秒無敵並消弭路徑敵彈，釋放密集風刃！'
    },
    form2: {
      name: '通勤戰術型態',
      title: '機能守護・風刃貫穿',
      asset: 'assets/hero_yu_form2.png',
      desc: '黑藍機能外套、強化傘骨。風壓斬反彈判定半徑擴展至 200px，斬擊自帶穿透風暴！',
      speedBuff: 45,
      hpBuff: 35,
      skillBuffDesc: '雨傘風壓斬反彈判定半徑擴展至 200px，自帶穿透風暴！'
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
      speed: 330,
      jumpForce: -640,
      gravity: 1350,
      skillCooldown: 0.45,
      ultCooldown: 8.0
    },
    skill: {
      name: '美乃滋噴射・蛋能雙彈',
      key: 'S / J',
      cooldown: 0.45,
      damage: 24,
      range: 500,           // 最大飛行 500px
      splashRadius: 60,     // 命中爆炸 55~65px
      lifetime: 1.0,
      desc: '連發兩枚半熟蛋能量彈（CD 0.45s），最大射程 500px，命中爆散出 60px 美乃滋濺射！'
    },
    ult: {
      name: '元氣蛋浪・Oeuf Mayo 星雨',
      key: 'F / K',
      cooldown: 8.0,
      damage: 150,
      heal: 30,
      duration: 2.2,
      zoneRadius: 450,      // 角色中心 800~900px gameplay zone
      desc: '以自身為中心 900px 戰區傾瀉流星蛋雨，全區轟炸、回復 30 HP（二階 40 HP）並獲元氣護盾。'
    },
    form2: {
      name: '晨光蛋浪型態',
      title: '美味療癒・流心環繞',
      asset: 'assets/hero_shakira_form2.png',
      desc: '白金晨光能量護裝。召喚 3~5 枚流心 Mayo Orbs 環繞防禦（半徑 75px），自動反擊並吸收子彈！',
      speedBuff: 35,
      hpBuff: 45,
      skillBuffDesc: '流心 Mayo Orbs 永久環繞護體（半徑 75px），自動吸收敵彈並撞擊近身怪物！'
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
      speed: 320,
      jumpForce: -610,
      gravity: 1450,
      skillCooldown: 0.55,
      ultCooldown: 8.5
    },
    skill: {
      name: '爆炒上菜・鐵鍋重擊',
      key: 'S / J',
      cooldown: 0.55,
      damage: 46,
      meleeRange: 140,      // 前方 125~145px 平底鍋本體
      shockwaveRange: 240,  // 鍋氣衝擊波延伸至 230~250px
      fanAngle: 105,        // 扇形範圍 105 度
      knockback: 420,
      desc: '平底鍋重擊前方 140px 並激發 240px 扇形鍋氣烈焰（CD 0.55s），造成強大擊退！'
    },
    ult: {
      name: '主廚旋風鍋・料理風暴',
      key: 'F / K',
      cooldown: 8.5,
      damage: 190,
      duration: 2.0,
      coreRadius: 320,      // 旋風核心半徑 300~330px
      gustRange: 370,       // 14 道鍋氣最大飛行 350~380px
      desc: '旋起半徑 320px 料理旋風，釋放 14 道最遠飛行 370px 的火炎旋轉鍋氣，牽引並震退敵群！'
    },
    form2: {
      name: '滿漢戰鬥主廚型態',
      title: '料理怒火・爆炒龍捲',
      asset: 'assets/hero_sandra_form2.png',
      desc: '主廚頭巾、料理護具。平底鍋常駐火環，爆炒火龍波貫穿前方 450px 小怪！',
      speedBuff: 30,
      hpBuff: 60,
      skillBuffDesc: '平底鍋常駐火環，爆炒火龍波貫穿前方 450px 小怪！'
    }
  }
};
