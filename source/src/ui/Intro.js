/**
 * 08點上班大作戰：通勤英雄篇 - 盛大 Opening 開場動畫 (Intro.js)
 * v9.6.0 規格：
 * - 幕一 (0.0s~4.0s)：黑幕晨光 ➔ 標題浮現 ➔ 07:57:00 打卡倒數警報
 * - 幕二 (4.0s~8.0s)：台北地標剪影 ➔ 捷運列車狂飆蒙太奇 ➔ 晨霧阻截警報
 * - 幕三 (8.0s~12.5s)：晨霧異變・七大花系阻截怪獸集結（外觀恆定 + Attack Phase 1/2 雙階彈幕強化）
 * - 幕四 (12.5s~17.0s)：三大通勤英雄集結出擊（禹志晨、夏奇拉、珊卓澎）➔ 氣勢切入主選單
 * 支援全程點擊、SPACE、ENTER、ESC 跳過，亦可於主選單隨時點擊重播。
 */

import { CHARACTERS } from '../data/Characters.js';
import { MONSTER_TYPES } from '../data/Monsters.js';
import { audio } from '../engine/Audio.js';

export class IntroCinematic {
  constructor() {
    this.isActive = false;
    this.time = 0;
    this.duration = 17.0; // 總時長 17 秒
    this.onComplete = null;

    // Background & Asset Preload
    this.bgStation = new Image();
    this.bgStation.src = 'assets/bg_station.jpg';
    this.bgHospital = new Image();
    this.bgHospital.src = 'assets/bg_hospital.jpg';

    // Hero portraits
    this.heroImgs = {
      yu: new Image(),
      shakira: new Image(),
      sandra: new Image()
    };
    this.heroImgs.yu.src = 'assets/hero_yu_portrait.png';
    this.heroImgs.shakira.src = 'assets/hero_shakira_portrait.png';
    this.heroImgs.sandra.src = 'assets/hero_sandra_portrait.png';

    // Hero Windup Cut-ins
    this.windupImgs = {
      yu: new Image(),
      shakira: new Image(),
      sandra: new Image()
    };
    this.windupImgs.yu.src = 'assets/cutin_windup_yu.png';
    this.windupImgs.shakira.src = 'assets/cutin_windup_shakira.png';
    this.windupImgs.sandra.src = 'assets/cutin_windup_sandra.png';

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
    if (this.onComplete) {
      const cb = this.onComplete;
      this.onComplete = null;
      cb();
    }
  }

  nextAct() {
    if (this.time < 4.0) {
      this.time = 4.0;
    } else if (this.time < 8.0) {
      this.time = 8.0;
    } else if (this.time < 12.5) {
      this.time = 12.5;
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

    if (this.time < 4.0) {
      this.renderAct1Title(ctx, vw, vh);
    } else if (this.time < 8.0) {
      this.renderAct2Montage(ctx, vw, vh);
    } else if (this.time < 12.5) {
      this.renderAct3Monsters(ctx, vw, vh);
    } else {
      this.renderAct4Heroes(ctx, vw, vh);
    }

    // Top Right Skip Button
    this.renderSkipButton(ctx, vw);

    // Bottom Progress Bar
    this.renderProgressBar(ctx, vw, vh);

    ctx.restore();
  }

  // ── ACT 1: 黑幕晨光 ➔ 標題浮現 ➔ 07:57:00 倒數警報 (0.0 ~ 4.0s) ──
  renderAct1Title(ctx, vw, vh) {
    const t = this.time;
    // Twilight background transitioning into warm morning golden mist
    const bgGrad = ctx.createLinearGradient(0, 0, 0, vh);
    bgGrad.addColorStop(0, '#040711');
    bgGrad.addColorStop(0.65, '#151928');
    bgGrad.addColorStop(1, '#3B231A');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, vw, vh);

    // Morning golden sun rays raycasting from upper center
    ctx.save();
    const rayAlpha = Math.min(0.45, t * 0.15);
    ctx.globalAlpha = rayAlpha;
    ctx.fillStyle = '#FFE082';
    for (let i = 0; i < 9; i++) {
      const angle = -Math.PI / 2 + (i - 4) * 0.22 + Math.sin(t * 0.8 + i) * 0.04;
      ctx.beginPath();
      ctx.moveTo(vw / 2, -50);
      ctx.lineTo(vw / 2 + Math.cos(angle - 0.08) * 900, Math.sin(angle - 0.08) * 900);
      ctx.lineTo(vw / 2 + Math.cos(angle + 0.08) * 900, Math.sin(angle + 0.08) * 900);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Digital Urgent Clock Display (07:56:58 -> 07:57:00)
    const clockAlpha = Math.min(1.0, Math.max(0, (t - 0.4) * 2));
    ctx.save();
    ctx.globalAlpha = clockAlpha;
    ctx.fillStyle = 'rgba(20, 24, 36, 0.85)';
    ctx.strokeStyle = '#FF5252';
    ctx.lineWidth = 2;
    const cw = 280;
    const ch = 52;
    const cx = (vw - cw) / 2;
    const cy = 110;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx, cy, cw, ch, 8);
    else ctx.rect(cx, cy, cw, ch);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FF5252';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ 通勤警戒鐘響起・距離遲到僅剩 3 分鐘！', vw / 2, cy + 20);

    const clockSec = t < 2.0 ? '58' : (t < 3.0 ? '59' : '00');
    const clockMin = clockSec === '00' ? '57' : '56';
    ctx.fillStyle = '#FFEB3B';
    ctx.font = 'bold 24px monospace';
    ctx.shadowColor = '#FF5252';
    ctx.shadowBlur = 10;
    ctx.fillText(`07:${clockMin}:${clockSec} AM`, vw / 2, cy + 44);
    ctx.restore();

    // Main Game Title: 08點上班大作戰
    const titleAlpha = Math.min(1.0, Math.max(0, (t - 1.0) * 1.5));
    const titleScale = Math.min(1.0, 0.85 + (t - 1.0) * 0.15);
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.translate(vw / 2, vh / 2 + 35);
    ctx.scale(titleScale, titleScale);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title Golden Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.font = '900 62px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('08點上班大作戰', 4, 4);

    // Title Main Glow
    ctx.fillStyle = '#FFF8E1';
    ctx.shadowColor = '#FFB300';
    ctx.shadowBlur = 28;
    ctx.fillText('08點上班大作戰', 0, 0);

    // Subtitle Badge
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00E5FF';
    ctx.fillStyle = '#80D8FF';
    ctx.font = 'bold 24px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('【通勤英雄篇】TAIPEI COMMUTER HEROES', 0, 56);

    // Punchy Tagline
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('捷運信義線狂暴通勤路・08:00:00 前抵達松德院區！', 0, 96);
    ctx.restore();
  }

  // ── ACT 2: 台北地標剪影 ➔ 捷運列車狂飆蒙太奇 (4.0 ~ 8.0s) ──
  renderAct2Montage(ctx, vw, vh) {
    const t = this.time - 4.0; // 0 to 4.0s

    // Background Station Pan
    if (this.bgStation.complete) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      const pan = (t * 40) % 150;
      ctx.drawImage(this.bgStation, -pan, 0, vw + 200, vh);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0B132B';
      ctx.fillRect(0, 0, vw, vh);
    }

    // Sky gradient with dawn glow
    const skyGrad = ctx.createLinearGradient(0, 0, 0, vh);
    skyGrad.addColorStop(0, 'rgba(11, 19, 43, 0.85)');
    skyGrad.addColorStop(0.7, 'rgba(28, 37, 65, 0.85)');
    skyGrad.addColorStop(1, 'rgba(74, 44, 42, 0.9)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, vw, vh);

    // Taipei 101 & Xiangshan Silhouette on horizon
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 30, 0.95)';
    // Mountain ridge
    ctx.beginPath();
    ctx.moveTo(0, vh - 90);
    ctx.quadraticCurveTo(180, vh - 220, 360, vh - 130);
    ctx.quadraticCurveTo(580, vh - 260, 780, vh - 140);
    ctx.quadraticCurveTo(890, vh - 190, vw, vh - 110);
    ctx.lineTo(vw, vh);
    ctx.lineTo(0, vh);
    ctx.fill();

    // Taipei 101 tower silhouette
    const twX = 720;
    const twBaseY = vh - 110;
    ctx.fillRect(twX - 18, twBaseY - 260, 36, 260);
    for (let seg = 0; seg < 7; seg++) {
      const segY = twBaseY - 70 - seg * 24;
      const segW = 44 - seg * 2;
      ctx.fillRect(twX - segW / 2, segY, segW, 20);
    }
    // Spire
    ctx.fillRect(twX - 3, twBaseY - 290, 6, 30);
    ctx.fillStyle = '#FF5252';
    ctx.beginPath();
    ctx.arc(twX, twBaseY - 290, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Fast Commuter MRT Train Zooming Across (from left to right)
    const trainProgress = ((t * 0.9) % 1.6);
    const trainX = -450 + trainProgress * (vw + 800);
    const trainY = vh - 170;
    const trainW = 420;
    const trainH = 75;

    ctx.save();
    // Train motion blur speed trails
    ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.fillRect(trainX - 120, trainY + 12, 120, trainH - 24);

    // Train Body
    ctx.fillStyle = '#ECEFF1';
    ctx.strokeStyle = '#00B0FF';
    ctx.lineWidth = 3;
    if (ctx.roundRect) ctx.roundRect(trainX, trainY, trainW, trainH, 10);
    else ctx.rect(trainX, trainY, trainW, trainH);
    ctx.fill();
    ctx.stroke();

    // Blue Line Stripe
    ctx.fillStyle = '#0288D1';
    ctx.fillRect(trainX, trainY + trainH - 22, trainW, 14);

    // Glowing Windows
    ctx.fillStyle = '#FFF9C4';
    ctx.shadowColor = '#FFEB3B';
    ctx.shadowBlur = 10;
    for (let w = 0; w < 6; w++) {
      ctx.fillRect(trainX + 35 + w * 60, trainY + 15, 42, 28);
    }

    // High-beam Headlights
    ctx.fillStyle = 'rgba(255, 255, 200, 0.7)';
    ctx.beginPath();
    ctx.moveTo(trainX + trainW, trainY + 30);
    ctx.lineTo(trainX + trainW + 280, trainY - 20);
    ctx.lineTo(trainX + trainW + 280, trainY + 90);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Emergency Broadcast Alert Banner (Top Center)
    ctx.save();
    ctx.fillStyle = 'rgba(213, 0, 0, 0.92)';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2.5;
    const bannerW = 680;
    const bannerH = 72;
    const bx = (vw - bannerW) / 2;
    const by = 48;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bannerW, bannerH, 8);
    else ctx.rect(bx, by, bannerW, bannerH);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF1744';
    ctx.shadowBlur = 10;
    ctx.fillText('🚨【台北捷運信義線・突發通勤警報】🚨', vw / 2, by + 28);

    ctx.fillStyle = '#FFF9C4';
    ctx.font = 'bold 15px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('晨霧花系怪獸大群佔據象山至松德路廊！全體通勤英雄進入一級備戰！', vw / 2, by + 54);
    ctx.restore();
  }

  // ── ACT 3: 晨霧異變・七大花系阻截怪獸集結 (8.0 ~ 12.5s) ──
  renderAct3Monsters(ctx, vw, vh) {
    const t = this.time - 8.0; // 0 to 4.5s
    ctx.save();

    // Dark high-tech grid backdrop
    ctx.fillStyle = '#080C14';
    ctx.fillRect(0, 0, vw, vh);

    // Header Title
    ctx.fillStyle = '#FF5252';
    ctx.font = 'bold 26px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF1744';
    ctx.shadowBlur = 16;
    ctx.fillText('⚠️ 晨霧異變・七大阻截怪獸全面甦醒！', vw / 2, 42);

    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 14px sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('【外觀造型恆定】・【全面實裝 Attack Phase 1 / 2 雙階彈幕強化】', vw / 2, 70);

    const monsterList = [
      'blue', 'red', 'pink', 'ice', 'grape', 'yellow', 'obsidian'
    ];

    const cardW = 124;
    const cardH = 345;
    const startX = (vw - (cardW * 7 + 6 * 10)) / 2;
    const cardY = 92;

    monsterList.forEach((mKey, idx) => {
      const cfg = MONSTER_TYPES[mKey];
      const img = this.monsterImgs[mKey];
      const cx = startX + idx * (cardW + 10);

      // Card pop-in stagger animation
      const appearDelay = idx * 0.12;
      const progress = Math.min(1.0, Math.max(0, (t - appearDelay) * 3));
      const offsetY = (1.0 - progress) * 30;

      ctx.save();
      ctx.globalAlpha = progress;
      ctx.translate(cx, cardY + offsetY);

      // Card background
      ctx.fillStyle = 'rgba(15, 20, 32, 0.94)';
      ctx.fillRect(0, 0, cardW, cardH);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, cardW, cardH);

      // Top color indicator tag
      ctx.fillStyle = cfg.color;
      ctx.fillRect(0, 0, cardW, 6);

      // Monster Sprite (Single authentic appearance)
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur = 12;
        const spriteSize = 72;
        ctx.drawImage(img, (cardW - spriteSize) / 2, 18, spriteSize, spriteSize);
        ctx.restore();
      }

      // Name & Subtitle
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(cfg.name, cardW / 2, 110);

      ctx.fillStyle = cfg.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(cfg.role || cfg.type, cardW / 2, 128);

      // Attack Phase Badges
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(8, 140, cardW - 16, 22);
      ctx.fillStyle = '#E0E0E0';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('P1: 標準阻截模式', 12, 155);

      ctx.fillStyle = 'rgba(255, 179, 0, 0.2)';
      ctx.fillRect(8, 168, cardW - 16, 22);
      ctx.fillStyle = '#FFD54F';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('⚡ P2: 密集狂暴彈幕', 12, 183);

      // Stats
      ctx.fillStyle = '#90A4AE';
      ctx.font = '10px monospace';
      ctx.fillText(`HP: ${cfg.hp}`, 12, 212);
      ctx.fillText(`ATK: ${cfg.attackDamage}`, 12, 230);
      ctx.fillText(`SPD: ${cfg.speed}`, 12, 248);

      // Attack Feature description
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = '9px sans-serif';
      let atkFeature = '直線連發彈幕';
      if (mKey === 'ice') atkFeature = '5向廣角暴風雪';
      else if (mKey === 'grape') atkFeature = '5連落點毒霧沼';
      else if (mKey === 'blue') atkFeature = '3連水刃+漩渦';
      else if (mKey === 'yellow') atkFeature = '8向金環大爆炸';
      else if (mKey === 'obsidian') atkFeature = '3段破土玄晶刺';
      else if (mKey === 'pink') atkFeature = '超音速俯衝轟炸';
      ctx.fillText(`特色: ${atkFeature}`, 12, 275, cardW - 20);

      ctx.restore();
    });

    ctx.restore();
  }

  // ── ACT 4: 三大通勤英雄集結出擊 (12.5 ~ 17.0s) ──
  renderAct4Heroes(ctx, vw, vh) {
    const t = this.time - 12.5; // 0 to 4.5s
    ctx.save();

    // Dark indigo backdrop with dynamic energy rays
    ctx.fillStyle = '#060A14';
    ctx.fillRect(0, 0, vw, vh);

    // Header Title
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 26px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00B0FF';
    ctx.shadowBlur = 18;
    ctx.fillText('🔥 松德院區準時特攻隊・三大通勤英雄出擊！', vw / 2, 40);

    const heroes = ['yu', 'shakira', 'sandra'];
    const cardW = 280;
    const cardH = 375;
    const startX = (vw - (cardW * 3 + 2 * 25)) / 2;
    const cardY = 65;

    heroes.forEach((hId, idx) => {
      const char = CHARACTERS[hId];
      const portrait = this.heroImgs[hId];
      const windup = this.windupImgs[hId];
      const cx = startX + idx * (cardW + 25);

      const delay = idx * 0.15;
      const progress = Math.min(1.0, Math.max(0, (t - delay) * 2.5));
      const offsetY = (1.0 - progress) * 40;

      ctx.save();
      ctx.globalAlpha = progress;
      ctx.translate(cx, cardY + offsetY);

      // Hero Card Base
      ctx.fillStyle = 'rgba(16, 22, 38, 0.94)';
      ctx.fillRect(0, 0, cardW, cardH);
      ctx.strokeStyle = char.colors.primary;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, 0, cardW, cardH);

      // Accent top banner
      ctx.fillStyle = char.colors.primary;
      ctx.fillRect(0, 0, cardW, 8);

      // Hero Portrait / Wind-up Storyboard
      const displayImg = (windup && windup.complete && windup.naturalWidth > 0) ? windup : portrait;
      if (displayImg && displayImg.complete && displayImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = char.colors.accent;
        ctx.shadowBlur = 14;
        ctx.drawImage(displayImg, (cardW - 190) / 2, 18, 190, 190);
        ctx.restore();
      }

      // Name & Title
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px "PingFang SC", sans-serif';
      ctx.shadowColor = char.colors.primary;
      ctx.shadowBlur = 12;
      ctx.fillText(char.name, cardW / 2, 232);

      ctx.fillStyle = char.colors.accent;
      ctx.font = 'bold 12px sans-serif';
      ctx.shadowBlur = 0;
      ctx.fillText(`【${char.title}】`, cardW / 2, 254);

      // Role
      ctx.fillStyle = '#CFD8DC';
      ctx.font = '12px sans-serif';
      ctx.fillText(`定位：${char.role}`, cardW / 2, 276);

      // Ult Move Highlight
      ctx.fillStyle = char.colors.secondary;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`奧義：${char.ult.name}`, cardW / 2, 300);

      // Catchphrase Quote
      ctx.fillStyle = '#FFE082';
      ctx.font = 'italic bold 11px sans-serif';
      ctx.fillText(char.quote, cardW / 2, 335, cardW - 24);

      ctx.restore();
    });

    // Bottom Final Call to Action
    ctx.save();
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 18px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF6F00';
    ctx.shadowBlur = 12;
    ctx.fillText('「打卡倒數計時 180 秒，全速向松德大門衝刺！！」', vw / 2, vh - 22);
    ctx.restore();

    ctx.restore();
  }

  renderSkipButton(ctx, vw) {
    ctx.save();
    const bx = vw - 150;
    const by = 16;
    const bw = 135;
    const bh = 36;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('略過 [SPACE/ESC] ⏩', bx + bw / 2, by + bh / 2);
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
