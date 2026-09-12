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
      skillCooldown: 0.32, // v9.5: 0.32s 瞬時前方扇形 melee hitbox
      ultCooldown: 7.0     // v9.5: 7.0s 760px 貫穿走廊
    },
    skill: {
      name: '雨傘風壓斬',
      key: 'S / J',
      cooldown: 0.32,
      damage: 58,           // v9.5: 58 dmg (F2: 72)
      range: 210,           // v9.5: 前方 210px 半徑 (F2: 245px)
      arcAngle: 95,         // v9.5: 前方 95 度弧形
      deflectRadius: 230,   // v9.5: 偏轉消彈 230px (F2: 280px)
      counterDamage: 24,    // v9.5: 偏轉反擊風刃 24 dmg (260px)
      desc: '揮動抗風折傘斬出前方 210px 扇形風壓（CD 0.32s，58傷），230px 內偏轉敵彈並反擊 260px 風刃！'
    },
    ult: {
      name: '準時衝刺・逆風傘幕',
      key: 'F / K',
      cooldown: 7.0,
      damage: 304,
      corridorWidth: 760,   // v9.5: 760px 貫穿走廊
      corridorHeight: 180,  // v9.5: 180px 高風壓
      duration: 1.3,
      windupDuration: 0.42,
      cutinDuration: 0.65,
      desc: '蓄勢前搖後展開折傘向前高速貫穿 760px 走廊，1.3 秒無敵並持續撕裂前方敵軍！'
    },
    form2: {
      name: '通勤戰術型態',
      title: '機能守護・風刃貫穿',
      asset: 'assets/hero_yu_form2.png',
      desc: '黑藍機能外套、強化傘骨。風刃傷害提升至 72、射程 245px、反彈半徑 280px、反擊風刃貫穿 2 敵！',
      speedBuff: 45,
      hpBuff: 35,
      skillBuffDesc: '風壓斬傷害 72、射程 245px、反彈半徑 280px、反擊風刃可貫穿 2 敵！'
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
      skillCooldown: 0.42, // v9.5: 0.42s
      ultCooldown: 8.0     // v9.5: 8.0s
    },
    skill: {
      name: '蛋能雙彈',
      key: 'S / J',
      cooldown: 0.42,
      damage: 28,           // v9.5: 2 發各 28 dmg (F2: 34 dmg)
      range: 600,           // v9.5: 射程 600px
      splashRadius: 90,     // v9.5: 濺射半徑 90px (F2: 100px)
      splashDamage: 18,     // v9.5: 濺射傷害 18 dmg
      lifetime: 1.1,
      desc: '雙發分離半熟蛋彈（CD 0.42s，直擊 28 傷），射程 600px，命中激發 90px 範圍濺射 (18傷)！'
    },
    ult: {
      name: '元氣蛋浪・Oeuf Mayo 星雨',
      key: 'F / K',
      cooldown: 8.0,
      damage: 420,          // 14 顆流星蛋 x 30 dmg
      heal: 30,             // v9.5: 回復 30 HP (F2: 40 HP)
      duration: 2.2,
      zoneRadius: 500,      // v9.5: 半徑 500px 固定戰區
      windupDuration: 0.55,
      cutinDuration: 0.70,
      desc: '蓄力後於 500px 固定戰區內傾瀉 14 顆流星蛋雨，全區轟炸、回復 30 HP（二階 40 HP）並獲元氣護盾。'
    },
    form2: {
      name: '晨光蛋浪型態',
      title: '美味療癒・流心環繞',
      asset: 'assets/hero_shakira_form2.png',
      desc: '白金晨光護裝。蛋能直擊提升至 34、濺射 100px。3 枚 Mayo Orbs 環繞防禦吸彈！',
      speedBuff: 35,
      hpBuff: 45,
      skillBuffDesc: '直擊 34、濺射 100px。流心 Mayo Orbs 環繞護體（半徑 75px），低頻吸收敵彈防禦！'
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
      skillCooldown: 0.45, // v9.5: 0.45s
      ultCooldown: 8.2     // v9.5: 8.2s
    },
    skill: {
      name: '爆炒上菜・翻鍋連段',
      key: 'S / J',
      cooldown: 0.45,
      damage: 72,           // v9.5: 第一段近戰 arc 72 dmg
      meleeRange: 150,      // v9.5: 前方 150px
      fanAngle: 110,        // v9.5: 扇形 110 度
      knockback: 520,       // v9.5: 強烈擊飛 520px
      comboWindow: 0.32,    // v9.5: 0.32s 內可接第二段
      combo2Damage: 48,     // v9.5: 第二段地面 shockwave 48 dmg (F2: 88 dmg)
      combo2Range: 290,     // v9.5: 290px (F2: 500px)
      desc: '一段平底鍋揮擊 150px (72傷+520px擊飛)；0.32s 內再按接二段「翻鍋追擊」衝擊波 (290px 48傷)！'
    },
    ult: {
      name: '主廚旋風鍋・料理風暴',
      key: 'F / K',
      cooldown: 8.2,
      damage: 420,          // 14 道鍋氣 x 30 dmg
      duration: 2.0,
      coreRadius: 350,      // v9.5: 核心吸附半徑 350px
      gustRange: 420,       // v9.5: 14 道鍋氣射程 420px
      windupDuration: 0.50,
      cutinDuration: 0.65,
      desc: '蓄火展開法紋後旋起 350px 吸附料理旋風，釋放 14 道 420px 鍋氣烈焰 (各30傷)！'
    },
    form2: {
      name: '滿漢戰鬥主廚型態',
      title: '料理怒火・爆炒龍捲',
      asset: 'assets/hero_sandra_form2.png',
      desc: '主廚頭巾、料理護具。翻鍋二段升級為火龍鍋氣 (500px 88傷)，貫穿前行！',
      speedBuff: 30,
      hpBuff: 60,
      skillBuffDesc: '翻鍋二段升級為火龍鍋氣 (500px 88傷)，貫穿前行！'
    }
  }
};
