/**
 * 08點上班大作戰：通勤英雄篇 - 角色資料庫 (Characters.js)
 * 數值規範：總時間 120 秒、15 枚金幣永久解鎖大招、解鎖後無限施放（僅受冷卻限制）
 */

export const CHARACTERS = {
  yu: {
    id: 'yu',
    name: '禹志晨',
    title: '風之通勤者・準時守護者',
    role: '密集火力 / 雨傘機關槍',
    desc: '任職於松德院區的行政專案管理師。個性沉著細心，隨身攜帶抗風折傘。上班路程即使颳風下雨，也能以抗風折傘進行高頻率機關槍掃射壓制。',
    quote: '「只要步伐夠快，風雨也追不上準時的決心！」',
    portrait: 'assets/hero_yu_portrait.png',
    animSheet: 'assets/hero_yu_anim.png',
    cleanChibi: 'assets/chibi_yu_clean.png',
    skillCard: 'assets/yu_skill_card.png',
    ultCard: 'assets/yu_ult_card.png',
    windupCutin: 'assets/cutin_windup_yu.png',
    colors: {
      primary: '#0288D1',
      secondary: '#4FC3F7',
      accent: '#FFD54F',
      theme: '#29B6F6',
      bgGlow: 'rgba(79, 195, 247, 0.4)'
    },
    stats: {
      maxHp: 100,
      speed: 320,          // v9.7.1: 三人最慢 (Sandra 370 > Shakira 345 > Yu 320)
      jumpForce: -620,
      gravity: 1400,
      skillCooldown: 0.16, // v9.7.1: 三人最高射速機關槍 (0.16s CD)
      ultCooldown: 7.0     // v9.5: 7.0s 760px 貫穿走廊
    },
    skill: {
      name: '雨傘機關槍',
      key: 'S / J',
      cooldown: 0.16,
      damage: 18,           // v9.7.2: Phase I 微升；Phase II 再乘 1.25
      range: 480,           // 射程 480px
      bulletSpeed: 750,
      deflectRadius: 180,   // 傘尖偏轉近身敵彈
      desc: '展開折傘連續高速發射針狀風刃機關槍（CD 0.16s，每發 16 傷），三人最高射速，提供密集火力壓制！'
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
      desc: '蓄勢前搖後展開折傘向前高速貫穿 760px 走廊，撕裂前方敵軍！'
    }
  },

  shakira: {
    id: 'shakira',
    name: '夏奇拉',
    title: '元氣甜心・美乃滋召喚師',
    role: '真正遠程 DPS / 活力輔助',
    desc: '身穿薰衣草紫 T-shirt 的熱血青年，胸前印著金色皇冠與 Oeuf Mayo!。最愛台北早餐店的半熟蛋與流心美乃滋，將早餐能量化為奇幻魔法。',
    quote: '「把美味的元氣，變成前進的力量！元氣加滿，出發～！」',
    portrait: 'assets/hero_shakira_portrait.png',
    animSheet: 'assets/hero_shakira_anim.png',
    cleanChibi: 'assets/chibi_shakira_clean.png',
    skillCard: 'assets/sh_skill_card.png',
    ultCard: 'assets/sh_ult_card.png',
    windupCutin: 'assets/cutin_windup_shakira.png',
    colors: {
      primary: '#8E24AA',
      secondary: '#CE93D8',
      accent: '#FFD54F',
      theme: '#AB47BC',
      bgGlow: 'rgba(206, 147, 216, 0.4)'
    },
    stats: {
      maxHp: 90,
      speed: 345,          // v9.7.1: 第二快 (Sandra 370 > Shakira 345 > Yu 320)
      jumpForce: -640,
      gravity: 1350,
      skillCooldown: 0.42, // v9.5: 0.42s
      ultCooldown: 8.0     // v9.5: 8.0s
    },
    skill: {
      name: '蛋能雙彈',
      key: 'S / J',
      cooldown: 0.42,
      damage: 42,           // v9.7.2: Phase I 微升；Phase II 再乘 1.25
      range: 600,           // 射程 600px
      splashRadius: 90,     // 濺射半徑 90px
      splashDamage: 22,     // v9.7.2: Phase I 微升；Phase II 再乘 1.25
      lifetime: 1.1,
      desc: '雙發分離半熟蛋彈（CD 0.42s，直擊 38 傷，三人最高小招傷害），射程 600px，命中激發 90px 範圍濺射 (20傷)！'
    },
    ult: {
      name: '元氣蛋浪・Oeuf Mayo 星雨',
      key: 'F / K',
      cooldown: 8.0,
      damage: 420,          // 14 顆流星蛋 x 30 dmg
      heal: 30,             // 回復 30 HP
      duration: 2.2,
      zoneRadius: 500,      // 半徑 500px 固定戰區
      windupDuration: 0.55,
      cutinDuration: 0.70,
      desc: '蓄力後於 500px 固定戰區內傾瀉 14 顆流星蛋雨，全區轟炸、回復 30 HP 並獲元氣護盾。'
    }
  },

  sandra: {
    id: 'sandra',
    name: '珊卓澎',
    title: '熱血主廚・平底鍋戰神',
    role: '極速游擊 / Phase II 遠程飛鍋爆發',
    desc: '圍著滿版海鸚鵡 (Puffin) 圍裙的霸氣料理達人。手持厚重鑄鐵平底鍋，以狂暴的熱炒鍋氣與新鮮番茄、青花菜擊飛一切通勤阻礙。',
    quote: '「上班打卡如同熱鍋搶秒，火候到位，沒人能擋我的路！」',
    portrait: 'assets/hero_sandra_portrait.png',
    animSheet: 'assets/hero_sandra_anim.png',
    cleanChibi: 'assets/chibi_sandra_clean.png',
    skillCard: 'assets/sa_skill_card.png',
    ultCard: 'assets/sa_ult_card.png',
    windupCutin: 'assets/cutin_windup_sandra.png',
    colors: {
      primary: '#D84315',
      secondary: '#FF7043',
      accent: '#FFA726',
      theme: '#F4511E',
      bgGlow: 'rgba(255, 112, 67, 0.4)'
    },
    stats: {
      maxHp: 120,
      speed: 370,          // v9.7.1: 三人最快 (Sandra 370 > Shakira 345 > Yu 320)
      jumpForce: -635,
      gravity: 1450,
      skillCooldown: 0.38, // v9.7.1: 0.38s
      ultCooldown: 8.2     // v9.5: 8.2s
    },
    skill: {
      name: '平底鍋揮舞・怒火鍋氣',
      key: 'S / J',
      cooldown: 0.38,
      damage: 56,           // v9.7.2: melee DPS recovery; Phase II 再乘 1.25
      range: 220,           // v9.7.5: expanded mobile-friendly melee reach 220px
      meleeRange: 220,      // v9.7.5: 前方 220px
      fanAngle: 110,        // 扇形 110 度
      knockback: 380,       // 擊退 380px
      desc: 'Phase I 以高速近戰游擊斬出前方 220px 弧形火氣（CD 0.38s），擊退前方敵人。'
    },
    ult: {
      name: '主廚旋風鍋・料理風暴',
      key: 'F / K',
      cooldown: 8.2,
      damage: 420,          // 14 道鍋氣 x 30 dmg
      duration: 2.0,
      coreRadius: 350,      // 核心吸附半徑 350px
      gustRange: 420,       // 14 道鍋氣射程 420px
      phase2Name: '主廚旋風鍋・狂焰飛鍋陣',
      phase2UltDamageMultiplier: 2.0,
      phase2ProjectileType: 'flying_pan',
      phase2ProjectileCount: 14,
      phase2ProjectileSpeed: 700,
      phase2MaxDistance: 700,
      phase2StaggerDuration: 0.70,
      windupDuration: 0.50,
      cutinDuration: 0.65,
      desc: 'Phase I 釋放 14 道鍋氣；Phase II 升級為 14 枚高速遠程旋轉火焰平底鍋。'
    }
  }
};
