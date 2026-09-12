/**
 * 08點上班大作戰：通勤英雄篇 - 開場角色與怪獸介紹動畫 (Intro.js)
 * 內容：
 * 1. 幕一：松德通勤三大英雄 (禹志晨、夏奇拉、珊卓澎)
 * 2. 幕二：晨霧異變・七大花系阻截怪獸
 * 3. 幕三：決戰松德大門前・夢影巨花王 (Phase 1 守護態 & Phase 2 狂暴深淵態)
 * 支援點擊/按鍵跳過，隨時可於主選單重播。
 */

import { CHARACTERS } from '../data/Characters.js';
import { MONSTER_TYPES, BOSS_CONFIG } from '../data/Monsters.js';
import { audio } from '../engine/Audio.js';

export class IntroCinematic {
  constructor() {
    this.isActive = false;
    this.time = 0;
    this.duration = 24.0; // 總時長 24 秒
    this.act = 1; // 1: Heroes, 2: Monsters, 3: Boss
    this.onComplete = null;

    // Preload intro assets
    this.bgStation = new Image();
    this.bgStation.src = 'assets/bg_station.jpg';
    this.bgHospital = new Image();
    this.bgHospital.src = 'assets/bg_hospital.jpg';
    this.bossP1 = new Image();
    this.bossP1.src = 'assets/boss_flower_phase1.png';
    this.bossP2 = new Image();
    this.bossP2.src = 'assets/boss_flower_phase2.png';

    // Hero portraits
    this.heroImgs = {
      yu: new Image(),
      shakira: new Image(),
      sandra: new Image()
    };
    this.heroImgs.yu.src = 'assets/hero_yu_portrait.png';
    this.heroImgs.shakira.src = 'assets/hero_shakira_portrait.png';
    this.heroImgs.sandra.src = 'assets/hero_sandra_portrait.png';

    // Monster images
    this.monsterImgs = {};
    for (let k of Object.keys(MONSTER_TYPES)) {
      const img = new Image();
      img.src = MONSTER_TYPES[k].asset;
      this.monsterImgs[k] = img;
    }
  }

  start(onComplete) {
    this.isActive = true;
    this.time = 0;
    this.onComplete = onComplete;
    audio.ensureContext();
    audio.playBgm('city_pop');
  }

  skip() {
    this.isActive = false;
    if (this.onComplete) this.onComplete();
  }

  nextAct() {
    if (this.time < 9.0) {
      this.time = 9.0;
    } else if (this.time < 17.0) {
      this.time = 17.0;
    } else {
      this.skip();
    }
  }

  update(dt) {
    if (!this.isActive) return;
    this.time += dt;

    if (this.time >= this.duration) {
      this.skip();
    }
  }

  render(ctx, vw, vh) {
    if (!this.isActive) return;

    ctx.save();

    // Dark backdrop with subtle ambient drift
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, vw, vh);

    if (this.time < 9.0) {
      this.renderActHeroes(ctx, vw, vh);
    } else if (this.time < 17.0) {
      this.renderActMonsters(ctx, vw, vh);
    } else {
      this.renderActBoss(ctx, vw, vh);
    }

    // Top Right Skip Button
    this.renderSkipButton(ctx, vw);

    // Bottom Progress Bar
    this.renderProgressBar(ctx, vw, vh);

    ctx.restore();
  }

  // --- ACT 1: 三大通勤英雄 ---
  renderActHeroes(ctx, vw, vh) {
    const heroKeys = ['yu', 'shakira', 'sandra'];
    const subTime = this.time % 3.0;
    const heroIdx = Math.min(2, Math.floor(this.time / 3.0));
    const hKey = heroKeys[heroIdx];
    const char = CHARACTERS[hKey];
    const portrait = this.heroImgs[hKey];

    // Background station subtle pan
    if (this.bgStation.complete) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      const panX = -(this.time * 25) % 100;
      ctx.drawImage(this.bgStation, panX, 0, vw + 100, vh);
      ctx.restore();
    }

    // Dynamic diagonal color streak
    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.rotate(-0.06);
    ctx.fillStyle = char.colors.primary;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(-vw, -120, vw * 2, 240);
    ctx.fillStyle = char.colors.secondary;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(-vw, -140, vw * 2, 16);
    ctx.fillRect(-vw, 124, vw * 2, 16);
    ctx.restore();

    // Slide-in slide animation for portrait
    const slideProgress = Math.min(1.0, subTime * 2.5);
    const portraitX = -200 + slideProgress * 280;
    const portraitY = 90;

    if (portrait && portrait.complete && portrait.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = char.colors.accent;
      ctx.shadowBlur = 20;
      ctx.drawImage(portrait, portraitX, portraitY, 260, 360);
      ctx.restore();
    }

    // Text Information block
    const textX = 390;
    const textAlpha = Math.min(1.0, Math.max(0, (subTime - 0.2) * 3));
    ctx.save();
    ctx.globalAlpha = textAlpha;

    // Header Badge
    ctx.fillStyle = char.colors.accent;
    ctx.fillRect(textX, 85, 170, 24);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`通勤英雄第 ${heroIdx + 1} 位`, textX + 10, 102);

    // Hero Name
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 36px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.shadowColor = char.colors.primary;
    ctx.shadowBlur = 15;
    ctx.fillText(char.name, textX, 150);

    // Title
    ctx.fillStyle = char.colors.secondary;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`【${char.title}】`, textX, 185);

    // Role & Stats
    ctx.fillStyle = '#CFD8DC';
    ctx.font = '14px sans-serif';
    ctx.fillText(`定位：${char.role}`, textX, 220);
    ctx.fillText(`小招：${char.skill.name}（零冷卻・無限連續發射！）`, textX, 248);
    ctx.fillText(`大招：${char.ult.name}（6枚金幣解鎖・無敵全屏壓制）`, textX, 276);

    // Quote
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'italic bold 15px sans-serif';
    ctx.fillText(char.quote, textX, 330);

    // Lore Description
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '13px sans-serif';
    ctx.fillText(char.desc, textX, 370, 520);

    ctx.restore();
  }

  // --- ACT 2: 七大晨間花系怪獸 ---
  renderActMonsters(ctx, vw, vh) {
    const mTime = this.time - 9.0; // 0 to 8.0s
    ctx.save();

    // Header Title
    ctx.fillStyle = '#FF5252';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF1744';
    ctx.shadowBlur = 12;
    ctx.fillText('⚠️ 晨霧異變・七大阻截怪獸全面來襲！(30幣全體進化二階段)', vw / 2, 50);

    ctx.fillStyle = '#B0BEC5';
    ctx.font = '13px sans-serif';
    ctx.fillText('七大花系阻截怪獸・攻擊力與射程全面進化・30幣後進化至二階段！', vw / 2, 75);

    const monsterList = [
      'blue', 'red', 'pink', 'ice', 'grape', 'yellow', 'obsidian'
    ];

    // Render 7 monster showcase cards horizontally (wider cards now)
    const cardW = 120;
    const cardH = 340;
    const startX = (vw - (cardW * 7 + 6 * 10)) / 2;
    const cardY = 95;

    monsterList.forEach((mKey, idx) => {
      const cfg = MONSTER_TYPES[mKey];
      const img = this.monsterImgs[mKey];
      const cx = startX + idx * (cardW + 10);

      // Card pop-in stagger animation
      const appearTime = idx * 0.45;
      const progress = Math.min(1.0, Math.max(0, (mTime - appearTime) * 3));
      const offsetY = (1.0 - progress) * 40;

      ctx.save();
      ctx.globalAlpha = progress;
      ctx.translate(cx, cardY + offsetY);

      // Card Base
      ctx.fillStyle = 'rgba(18, 24, 38, 0.92)';
      ctx.fillRect(0, 0, cardW, cardH);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, cardW, cardH);

      // Top color tag
      ctx.fillStyle = cfg.color;
      ctx.fillRect(0, 0, cardW, 6);

      // Monster Sprite (Clean borderless, facing right)
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 10;
        const spriteSize = 74;
        ctx.drawImage(img, (cardW - spriteSize) / 2, 20, spriteSize, spriteSize);
        ctx.restore();
      }

      // Name & Role
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(cfg.name, cardW / 2, 115);

      ctx.fillStyle = cfg.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(cfg.role || cfg.type, cardW / 2, 134);

      // Stats
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ECEFF1';
      ctx.font = '10px monospace';
      ctx.fillText(`HP: ${cfg.hp}`, 12, 160);
      ctx.fillText(`速度: ${cfg.speed}`, 12, 178);
      ctx.fillText(`攻擊: ${cfg.attackDamage}`, 12, 196);
      ctx.fillText(`射程: 800px+`, 12, 214);

      // Desc
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '9px sans-serif';
      const descSnippet = cfg.desc.substring(0, 36) + '...';
      ctx.fillText(descSnippet, 10, 240, cardW - 20);

      ctx.restore();
    });

    ctx.restore();
  }

  // --- ACT 3: 松德大門前・終極魔王預告 ---
  renderActBoss(ctx, vw, vh) {
    const bTime = this.time - 17.0; // 0 to 7.0s
    ctx.save();

    // Background Songde Hospital
    if (this.bgHospital.complete) {
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.drawImage(this.bgHospital, 0, 0, vw, vh);
      ctx.restore();
    }

    // Warning Header
    ctx.fillStyle = '#FF1744';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF1744';
    ctx.shadowBlur = 16;
    ctx.fillText('⚡ 決戰地點：松德院區大門前！終極支配者現身！', vw / 2, 45);

    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('擊敗魔王二階段狂暴變身・衝向松德打卡機完成 07:58:24 準時打卡！', vw / 2, 75);

    // Two Forms Side by Side
    const colW = 380;
    const colH = 340;
    const startX = (vw - (colW * 2 + 40)) / 2;
    const colY = 95;

    // --- Form 1: 晨霧守護態 ---
    ctx.save();
    ctx.translate(startX, colY);
    ctx.fillStyle = 'rgba(18, 24, 38, 0.90)';
    ctx.fillRect(0, 0, colW, colH);
    ctx.strokeStyle = '#E91E63';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, colW, colH);

    ctx.fillStyle = '#E91E63';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('【PHASE 1：晨霧守護態】', colW / 2, 30);

    if (this.bossP1.complete && this.bossP1.naturalWidth > 0) {
      ctx.drawImage(this.bossP1, colW / 2 - 90, 45, 180, 180);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFF';
    ctx.font = '13px sans-serif';
    ctx.fillText('• 巨大蓮花王冠、翠綠皇袍藤蔓、心靈水晶核心', 20, 245);
    ctx.fillText('• 7 路扇形擴散花瓣散彈 + 破土突刺藤蔓', 20, 275);
    ctx.fillText('• 支配晨間大霧，召喚先遣怪獸護衛', 20, 305);
    ctx.restore();

    // --- Form 2: 狂暴深淵裂變態 ---
    ctx.save();
    ctx.translate(startX + colW + 40, colY);
    ctx.fillStyle = 'rgba(28, 12, 28, 0.92)';
    ctx.fillRect(0, 0, colW, colH);
    ctx.strokeStyle = '#880E4F';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, colW, colH);

    ctx.fillStyle = '#FF4081';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF4081';
    ctx.shadowBlur = 10;
    ctx.fillText('【PHASE 2：狂暴深淵裂變態】', colW / 2, 30);

    if (this.bossP2.complete && this.bossP2.naturalWidth > 0) {
      ctx.drawImage(this.bossP2, colW / 2 - 90, 45, 180, 180);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#FF80AB';
    ctx.font = '13px sans-serif';
    ctx.fillText('• 花瓣裂變為暗紅黑曜荊棘龍刃、多重複眼現形', 20, 245);
    ctx.fillText('• 16 路超高速狂暴螺旋彈幕輪盤 + 正對玩家瞄準針', 20, 275);
    ctx.fillText('• 三連發追蹤地裂藤蔓 + 雙怪同時空降召喚！', 20, 305);
    ctx.restore();

    ctx.restore();
  }

  renderSkipButton(ctx, vw) {
    ctx.save();
    const bx = vw - 140;
    const by = 18;
    const bw = 120;
    const bh = 34;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('略過 [SPACE] ⏩', bx + bw / 2, by + bh / 2);
    ctx.restore();
  }

  renderProgressBar(ctx, vw, vh) {
    ctx.save();
    const ratio = Math.min(1.0, this.time / this.duration);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, vh - 6, vw, 6);
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(0, vh - 6, vw * ratio, 6);
    ctx.restore();
  }
}

export const introCinematic = new IntroCinematic();
