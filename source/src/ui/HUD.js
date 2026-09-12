/**
 * 08點上班大作戰：通勤英雄篇 - HUD 與 UI 系統 (HUD.js)
 * 嚴格遵循數值與版面規格：
 * - 120 秒通勤倒數計時
 * - 15 枚金幣永久解鎖大招，HUD 顯示 LOCKED / READY / COOLDOWN
 * - 角色 Q 版動態頭像與血條
 * - Boss 寬幅血條 (Phase 1 / Phase 2)
 * - Anime Cut-in 大招特寫演出
 * - 手機虛擬觸控按鈕
 */

import { STAGES } from '../world/Level.js';

export class HUD {
  constructor() {
    this.totalGameTime = 120; // 120 秒倒數
    this.timeRemaining = 120;
    this.score = 0;
    
    // Anime Cut-in State
    this.cutinActive = false;
    this.cutinTimer = 0;
    this.cutinChar = null;

    // Victory & Result
    this.isVictory = false;
    this.isGameOver = false;
    this.resultStamp = '';
    this.resultRank = '';

    // Mobile virtual joystick & action buttons
    this.joystick = {
      baseX: 110,
      baseY: 435,
      radius: 56,
      knobX: 110,
      knobY: 435,
      knobRadius: 26,
      active: false
    };
    this.btnJump = { x: 860, y: 430, w: 70, h: 70 };
    this.btnSkill = { x: 770, y: 430, w: 65, h: 65 };
    this.btnUlt = { x: 860, y: 340, w: 70, h: 70 };
    this.btnDash = { x: 770, y: 340, w: 65, h: 65 };
    this.btnBible = { x: 890, y: 20, w: 50, h: 32 };
  }

  updateJoystick(touchX, touchY, active) {
    const j = this.joystick;
    j.active = active;
    if (!active) {
      this.resetJoystick();
      return;
    }
    const dx = touchX - j.baseX;
    const dy = touchY - j.baseY;
    const dist = Math.hypot(dx, dy);
    const maxR = j.radius;
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);

    j.knobX = j.baseX + Math.cos(angle) * clampedDist;
    j.knobY = j.baseY + Math.sin(angle) * clampedDist;

    j.normX = (clampedDist / maxR) * Math.cos(angle);
    j.normY = (clampedDist / maxR) * Math.sin(angle);
  }

  resetJoystick() {
    const j = this.joystick;
    j.active = false;
    j.knobX = j.baseX;
    j.knobY = j.baseY;
    j.normX = 0;
    j.normY = 0;
  }

  reset() {
    this.timeRemaining = this.totalGameTime;
    this.score = 0;
    this.cutinActive = false;
    this.cutinTimer = 0;
    this.cutinChar = null;
    this.isVictory = false;
    this.isGameOver = false;
    this.resultStamp = '';
    this.resultRank = '';
  }

  triggerCutin(charConfig, duration = 0.65) {
    this.cutinActive = true;
    this.cutinDuration = duration;
    this.cutinTimer = duration;
    this.cutinChar = charConfig;
  }

  getFormattedClockTime() {
    const timeFormatted = Math.max(0, this.timeRemaining);
    const secPassed = Math.max(0, 120 - Math.ceil(timeFormatted));
    const displayMin = 58 + Math.floor(secPassed / 60);
    const displaySec = secPassed % 60;
    if (displayMin >= 60) {
      return `08:${String(displayMin - 60).padStart(2, '0')}:${String(displaySec).padStart(2, '0')}`;
    }
    return `07:${String(displayMin).padStart(2, '0')}:${String(displaySec).padStart(2, '0')}`;
  }

  calculateEvaluation(player, bossDefeated) {
    const timeLeft = this.timeRemaining;
    const falls = player.fallCount || 0;
    let stamp = 'Late';
    let rank = 'Rank B';

    // v9.5 Rank Specification:
    // S: 剩餘 >= 25s 且 Fall <= 1
    // A: 剩餘 >= 15s
    // B: 剩餘 >= 5s
    // D: < 5s 或大量跌落 / 失敗
    if (!bossDefeated || player.isDead || timeLeft <= 0) {
      stamp = 'Late';
      rank = 'Rank D';
    } else if (timeLeft >= 25 && falls <= 1) {
      stamp = 'Perfect';
      rank = 'Rank S';
    } else if (timeLeft >= 15) {
      stamp = 'Great';
      rank = 'Rank A';
    } else if (timeLeft >= 5 && falls <= 3) {
      stamp = 'On Time';
      rank = 'Rank B';
    } else {
      stamp = 'Overtime';
      rank = 'Rank D';
    }

    this.resultStamp = stamp;
    this.resultRank = rank;
    this.punchedTimeText = this.getFormattedClockTime();
  }

  update(dt, player, boss) {
    if (this.isVictory || this.isGameOver) return;

    // Pause timer during cutscenes, intro, boss roar, and cut-in
    const isCutscenePaused = this.cutinActive || 
                             (boss && boss.roarTimer > 0) || 
                             window.gameCutsceneActive || 
                             window.gamePaused;

    if (!isCutscenePaused) {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.isGameOver = true;
        this.calculateEvaluation(player, boss ? boss.isDead : false);
      }
    }

    if (player.isDead) {
      this.isGameOver = true;
      this.calculateEvaluation(player, boss ? boss.isDead : false);
    }

    if (this.cutinActive) {
      this.cutinTimer -= dt;
      if (this.cutinTimer <= 0) {
        this.cutinActive = false;
      }
    }
  }

  triggerVictory(player) {
    this.isVictory = true;
    this.calculateEvaluation(player, true);
  }

  render(ctx, player, boss, level, camera) {
    const vw = camera.viewportWidth;
    const vh = camera.viewportHeight;

    // --- 1. Top HUD Bar ---
    this.renderTopBar(ctx, player, level, vw);

    // --- 2. Boss Health Bar (When in Arena 14800 ~ 16500) ---
    if (player.x >= 14600 && !boss.isDead) {
      this.renderBossBar(ctx, boss, vw);
    }

    // --- 3. Anime Cut-in Overlay ---
    if (this.cutinActive && this.cutinChar) {
      this.renderCutinOverlay(ctx, vw, vh);
    }

    // --- 4. Mobile Touch Controls ---
    this.renderMobileTouchUI(ctx, player, vw, vh);

    // --- 5. Victory / Game Over Screen ---
    if (this.isVictory) {
      this.renderVictoryScreen(ctx, player, vw, vh);
    } else if (this.isGameOver) {
      this.renderGameOverScreen(ctx, vw, vh);
    }
  }

  renderTopBar(ctx, player, level, vw) {
    ctx.save();

    // Top translucent bar
    ctx.fillStyle = 'rgba(18, 24, 38, 0.86)';
    ctx.fillRect(16, 10, vw - 32, 64);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 10, vw - 32, 64);

    // 1. Hero Avatar & Info
    const avatarX = 26;
    const avatarY = 16;
    ctx.fillStyle = player.charConfig.colors.primary;
    ctx.fillRect(avatarX, avatarY, 50, 50);
    ctx.strokeStyle = player.form2Active ? '#FFD54F' : '#fff';
    ctx.lineWidth = player.form2Active ? 2.5 : 1.5;
    ctx.strokeRect(avatarX, avatarY, 50, 50);

    if (player.spriteSheet && player.spriteSheet.complete) {
      // Idle frame 0
      ctx.drawImage(player.spriteSheet, 0, 0, 256, 256, avatarX, avatarY, 50, 50);
    }

    // Name & Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(player.name + (player.form2Active ? ' ★覺醒II' : ''), avatarX + 58, avatarY + 16);
    ctx.fillStyle = player.form2Active ? '#FFD54F' : 'rgba(255,255,255,0.7)';
    ctx.font = '11px sans-serif';
    ctx.fillText(player.form2Active ? player.charConfig.form2.title : player.charConfig.title, avatarX + 58, avatarY + 30);

    // HP Bar
    const hpX = avatarX + 58;
    const hpY = avatarY + 36;
    const hpW = 135;
    const hpH = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    const hpRatio = Math.max(0, player.hp / player.maxHp);
    ctx.fillStyle = hpRatio > 0.3 ? '#00E676' : '#FF1744';
    ctx.fillRect(hpX, hpY, hpW * hpRatio, hpH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${Math.ceil(player.hp)}/${player.maxHp}`, hpX + 42, hpY + 8);

    // 2. Commute Resonance & Coins (🪙 x / 15 / 30 / 45 / 60)
    const coinX = 275;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`🪙 金幣: ${player.coins}`, coinX, 32);

    // Milestone text
    let milestoneText = '🔒 15幣 大招解鎖';
    if (player.coins >= 60) milestoneText = '🔥 魔王狂暴 (雙倍掉落)';
    else if (player.coins >= 45) milestoneText = '🌟 英雄覺醒II (戰力全面強化)';
    else if (player.coins >= 30) milestoneText = '👹 怪獸二階段 (烈焰紅苗等)';
    else if (player.coins >= 15) milestoneText = '⚔️ 大招已永久解鎖！';

    ctx.fillStyle = '#81D4FA';
    ctx.font = '11px sans-serif';
    ctx.fillText(`共振: ${milestoneText}`, coinX, 48);

    // Active Buffs Row
    let buffX = coinX;
    ctx.font = 'bold 10px sans-serif';
    if (player.invulnerableTimer > 0) {
      ctx.fillStyle = '#FFD54F';
      ctx.fillText(`🛡️防護${player.invulnerableTimer.toFixed(1)}s `, buffX, 64);
      buffX += 58;
    }
    if (player.dashCooldown <= 0) {
      ctx.fillStyle = '#69F0AE';
      ctx.fillText(`⚡衝刺可 `, buffX, 64);
      buffX += 50;
    }
    // v9.5: ULT WIND-UP indicator
    if (player.isUlting && player.ultPhase === 'WINDUP') {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 11px sans-serif';
      ctx.shadowColor = '#FFA000';
      ctx.shadowBlur = 8;
      ctx.fillText(`⚡ ULT WIND-UP`, buffX, 64);
      ctx.shadowBlur = 0;
      buffX += 95;
    }

    // 3. Commute Clock Countdown (120s)
    const clockX = 490;
    const timeFormatted = Math.ceil(this.timeRemaining);
    const clockStr = this.getFormattedClockTime();

    ctx.fillStyle = this.timeRemaining < 25 ? '#FF5252' : '#FFF';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`⏱️ ${clockStr}`, clockX, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '11px sans-serif';
    ctx.fillText(`上班打卡倒數: ${timeFormatted} 秒`, clockX, 50);

    // 4. Stage Title & Progress
    const curStage = level.getCurrentStage(player.x);
    const stageX = 680;
    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(curStage.name, stageX, 34);

    const progressRatio = Math.min(1.0, player.x / level.totalLength);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(stageX, 42, 120, 8);
    ctx.fillStyle = '#4FC3F7';
    ctx.fillRect(stageX, 42, 120 * progressRatio, 8);

    // 5. QA / Style Bible Button
    const btn = this.btnBible;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAB 設定', btn.x + btn.w / 2, btn.y + 20);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  renderBossBar(ctx, boss, vw) {
    ctx.save();
    const barW = 460;
    const barH = 14;
    const barX = (vw - barW) / 2;
    const barY = 82;

    // Boss Name & Phase (v9.5 True Two-Phase)
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    let title = '【PHASE 1：晨霧守護態】松德院區門前・夢影巨花王 (HP 2400)';
    let barColor = '#E91E63';

    if (boss.isTransforming) {
      title = '🌹【變身中・100%無敵】PHASE 2：夢境狂暴盛開！';
      barColor = '#FF1744';
    } else if (boss.phase === 2) {
      title = '🌹【PHASE 2：狂暴盛開態】松德院區門前・夢影巨花王 (HP 3200)';
      barColor = '#C2185B';
    }

    ctx.fillStyle = boss.isTransforming ? '#FF1744' : (boss.phase === 2 ? '#FF4081' : '#FF80AB');
    ctx.fillText(title, vw / 2, barY - 6);

    // Health Bar Container
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // HP Fill
    const ratio = Math.max(0, boss.hp / (boss.maxHp || 2400));
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * ratio, barH);

    // Numeric HP
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp || 2400}`, vw / 2, barY + 11);

    ctx.restore();
  }

  renderCutinOverlay(ctx, vw, vh) {
    ctx.save();
    const totalDuration = this.cutinDuration || 0.65;
    const progress = Math.max(0, Math.min(1, this.cutinTimer / totalDuration));
    const char = this.cutinChar;

    // Full screen dark flash (quick in, hold, quick out)
    const darkAlpha = progress > 0.8 ? (progress - 0.8) / 0.2 * 0.65 : 0.65;
    ctx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
    ctx.fillRect(0, 0, vw, vh);

    // Dynamic diagonal color slash
    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.rotate(-0.08);
    const bannerH = 200;
    // Slide in from left: slideX goes 0 → full coverage
    const slideX = Math.min(1.0, progress * 3.0) * vw;
    ctx.fillStyle = char.colors.primary;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-vw, -bannerH / 2, slideX, bannerH);
    ctx.fillStyle = char.colors.secondary;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(-vw, -bannerH / 2 + 10, slideX, 8);
    ctx.fillRect(-vw, bannerH / 2 - 18, slideX, 8);
    ctx.restore();

    // Character portrait image (ultCard) — slides in from left
    const portraitSlide = Math.max(0, Math.min(1, (progress - 0.05) * 4));
    const portraitX = -300 + portraitSlide * 290;
    if (char.ultCard) {
      const ultImg = char._ultCardImg;
      if (ultImg && ultImg.complete && ultImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = portraitSlide;
        ctx.drawImage(ultImg, portraitX, vh / 2 - 180, 240, 320);
        ctx.restore();
      }
    }
    // Fallback: draw colored glow box where portrait would be
    if (!char._ultCardImg || !char._ultCardImg.complete) {
      ctx.save();
      ctx.globalAlpha = portraitSlide * 0.8;
      ctx.fillStyle = char.colors.primary;
      ctx.shadowColor = char.colors.accent;
      ctx.shadowBlur = 30;
      ctx.fillRect(portraitX, vh / 2 - 160, 200, 280);
      ctx.restore();
    }

    // Text: character name + ult name (slides in from right)
    const textSlide = Math.max(0, Math.min(1, (progress - 0.1) * 3.5));
    ctx.save();
    ctx.globalAlpha = textSlide;
    ctx.translate(vw / 2, vh / 2);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 40px "PingFang SC", "Microsoft JhengHei", sans-serif`;
    ctx.textAlign = 'left';
    ctx.shadowColor = char.colors.accent;
    ctx.shadowBlur = 16;
    ctx.fillText(char.name, 20, -30);

    ctx.fillStyle = '#FFD54F';
    ctx.font = `bold 26px "PingFang SC", sans-serif`;
    ctx.shadowBlur = 10;
    ctx.fillText(`【${char.ult.name}】`, 20, 14);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 0;
    ctx.fillText(char.quote, 20, 50);
    ctx.restore();

    // Bright edge flash lines (speed lines effect)
    if (progress < 0.3) {
      const flashAlpha = (1.0 - progress / 0.3) * 0.6;
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.strokeStyle = char.colors.accent;
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(vw / 2, vh / 2);
        ctx.lineTo(vw / 2 + Math.cos(angle) * vw, vh / 2 + Math.sin(angle) * vh);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  renderMobileTouchUI(ctx, player, vw, vh) {
    ctx.save();

    // 1. Virtual Joystick (Left Hand)
    const j = this.joystick;
    ctx.save();
    // Outer Base Ring
    ctx.fillStyle = j.active ? 'rgba(2, 136, 209, 0.35)' : 'rgba(18, 24, 38, 0.45)';
    ctx.strokeStyle = j.active ? '#00E5FF' : 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(j.baseX, j.baseY, j.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Directional Guide Arrows (◀  ▶)
    ctx.fillStyle = j.active ? '#00E5FF' : 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀', j.baseX - j.radius + 15, j.baseY);
    ctx.fillText('▶', j.baseX + j.radius - 15, j.baseY);

    // Inner Knob (Follows touch/drag)
    const knobGrad = ctx.createRadialGradient(j.knobX - 4, j.knobY - 4, 2, j.knobX, j.knobY, j.knobRadius);
    knobGrad.addColorStop(0, j.active ? '#4FC3F7' : '#B0BEC5');
    knobGrad.addColorStop(1, j.active ? '#0288D1' : '#37474F');
    ctx.fillStyle = knobGrad;
    ctx.strokeStyle = j.active ? '#E0F7FA' : '#ECEFF1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(j.knobX, j.knobY, j.knobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Knob Center Dot
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(j.knobX, j.knobY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Action Buttons (Right Hand)
    const drawBtn = (btn, label, active) => {
      ctx.fillStyle = active ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(btn.x + btn.w / 2, btn.y + btn.h / 2, btn.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    };

    drawBtn(this.btnJump, '跳躍', false);
    drawBtn(this.btnSkill, '小招', player.skillCooldown > 0);
    drawBtn(this.btnDash, player.dashCooldown > 0 ? '冷卻' : '衝刺', player.dashCooldown > 0 || player.dashTimer > 0);

    // Ult Button with Lock / Ready / Cooldown Sweep (15 coins)
    const ub = this.btnUlt;
    const isUltUnlocked = player.hasUnlockedUlt || player.coins >= 15;
    ctx.fillStyle = isUltUnlocked ? 'rgba(2, 136, 209, 0.6)' : 'rgba(60, 60, 60, 0.6)';
    ctx.strokeStyle = isUltUnlocked ? '#00E5FF' : '#9E9E9E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ub.x + ub.w / 2, ub.y + ub.h / 2, ub.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isUltUnlocked ? '大招' : '🔒', ub.x + ub.w / 2, ub.y + ub.h / 2);

    ctx.restore();
  }

  renderVictoryScreen(ctx, player, vw, vh) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    ctx.fillRect(0, 0, vw, vh);

    const cx = vw / 2;
    const cy = vh / 2;

    // Golden light rays from center top
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI / 2 + (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx + Math.cos(angle) * vw, Math.sin(angle) * vh);
      ctx.lineTo(cx + Math.cos(angle + 0.15) * vw, Math.sin(angle + 0.15) * vh);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Victory Window
    ctx.fillStyle = '#1A237E';
    ctx.fillRect(cx - 280, cy - 200, 560, 400);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 280, cy - 200, 560, 400);

    // Inner accent border
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 272, cy - 192, 544, 384);

    // Chibi portrait on left side (accessible via window.activeGame.chibiImages)
    const chibiImages = (typeof window !== 'undefined' && window.activeGame) ? window.activeGame.chibiImages : null;
    const chibImg = chibiImages && chibiImages[player.id];
    if (chibImg && chibImg.complete && chibImg.naturalWidth > 0) {
      ctx.save();
      ctx.drawImage(chibImg, cx - 258, cy - 185, 110, 143);
      // Character color glow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = player.charConfig ? player.charConfig.colors.theme : '#FFD700';
      ctx.fillRect(cx - 258, cy - 185, 110, 143);
      ctx.restore();
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 準時抵達松德院區！上班大成功！', cx + 55, cy - 155);

    // Punch Stamp
    ctx.save();
    ctx.translate(cx + 160, cy - 40);
    ctx.rotate(-0.15);
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 4;
    ctx.strokeRect(-80, -40, 160, 80);
    ctx.fillStyle = 'rgba(76,175,80,0.15)';
    ctx.fillRect(-80, -40, 160, 80);
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.punchedTimeText || this.getFormattedClockTime(), 0, -5);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('ON TIME PUNCHED ✓', 0, 20);
    ctx.restore();

    // Stats
    ctx.fillStyle = '#fff';
    ctx.font = '13px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'left';
    const statsX = cx - 140;
    ctx.fillText(`英雄：${player.name}${player.form2Active ? '【覺醒 II】' : ''}`, statsX, cy - 90);
    ctx.fillText(`全程路線：象山捷運站 ➔ 松德院區 (18,000px)`, statsX, cy - 68);
    ctx.fillText(`剩餘時間：${Math.ceil(this.timeRemaining)} 秒 | 剩餘體力：${Math.ceil(player.hp)} / ${player.maxHp}`, statsX, cy - 46);
    ctx.fillText(`收集金幣：${player.coins} 枚 | 墜崖失誤：${player.fallCount || 0} 次`, statsX, cy - 24);
    ctx.fillText(`雙階巨花王：完整討伐確認 (Phase 1 2400 + Phase 2 3200)`, statsX, cy - 2);

    // Rank — large centered
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF6F00';
    ctx.shadowBlur = 16;
    ctx.fillText(this.resultRank, cx + 55, cy + 80);
    ctx.shadowBlur = 0;

    // Restart instruction
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('按 [Space] 或 點擊此處 再次挑戰', cx, cy + 165);

    ctx.restore();
  }

  renderGameOverScreen(ctx, vw, vh) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, vw, vh);

    const cx = vw / 2;
    const cy = vh / 2;

    ctx.fillStyle = '#B71C1C';
    ctx.fillRect(cx - 200, cy - 120, 400, 240);
    ctx.strokeStyle = '#FF5252';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 200, cy - 120, 400, 240);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('上班遲到！打卡失敗', cx, cy - 60);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('08:00:01 - 超過上班時限或體力耗盡', cx, cy - 15);
    ctx.fillText('不要氣餒，明天再戰！', cx, cy + 15);

    ctx.fillStyle = '#FFEB3B';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('按 [Space] 或 點擊此處 重試', cx, cy + 75);

    ctx.restore();
  }
}

export const hud = new HUD();
