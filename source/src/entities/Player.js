/**
 * 08點上班大作戰：通勤英雄篇 - 玩家英雄實體 (Player.js)
 * 嚴格遵循規格：
 * - 24x10px Feet Sensor 精準對齊平台頂面
 * - 100ms Coyote Time / 150ms Jump Buffer
 * - 60ms Hitstop
 * - 32-frame 動畫狀態機 (256x256 frame)
 * - 15 枚金幣永久解鎖大招，解鎖後不扣幣、無限施放僅受冷卻限制
 * - 3 角色獨立小招與大招演出
 */

import { CHARACTERS } from '../data/Characters.js';
import { audio } from '../engine/Audio.js';
import { particles } from './Particles.js';
import { projectiles } from './Projectiles.js';
import { hud } from '../ui/HUD.js';

export class Player {
  constructor(charId = 'yu') {
    this.charConfig = CHARACTERS[charId] || CHARACTERS.yu;
    this.id = this.charConfig.id;
    this.name = this.charConfig.name;

    // Position & Physics
    this.x = 220;
    this.y = 520;
    this.vx = 0;
    this.vy = 0;
    this.width = 48;
    this.height = 76;
    this.facing = 1; // 1 = right, -1 = left

    // Feet Sensor: 24x10px located at bottom center
    this.sensorWidth = 24;
    this.sensorHeight = 10;

    // Ground & Coyote Time
    this.onGround = false;
    this.lastGroundTime = performance.now();
    this.COYOTE_TIME_MS = 100;

    // Jump parameters
    this.speed = this.charConfig.stats.speed;
    this.jumpForce = this.charConfig.stats.jumpForce;
    this.gravity = this.charConfig.stats.gravity;

    // Health & Stats
    this.maxHp = this.charConfig.stats.maxHp;
    this.hp = this.maxHp;
    this.invulnerableTimer = 0;
    this.shieldTimer = 0; // Shakira ult shield
    this.isDead = false;

    // Collectibles & Evolution (Commuter Resonance)
    this.coins = 0;
    this.hasUnlockedUlt = false; // 15 金幣永久解鎖
    this.form2Active = false;    // 45 金幣覺醒第二型態

    // Dash (E / touch button)
    this.dashTimer = 0;
    this.dashCooldown = 0;

    // Shakira Form 2 Orbiting Mayo Orbs
    this.mayoOrbs = [];

    // Cooldowns
    this.skillCooldown = 0;
    this.ultCooldown = 0;

    // Active Action States
    this.isAttacking = false;
    this.attackTimer = 0;
    this.isUlting = false;
    this.ultTimer = 0;
    this.ultCutinTimer = 0; // Cut-in freeze/slowdown

    // v9.5: Ultimate Wind-up State Machine (INPUT -> CUTIN -> WINDUP -> RELEASE -> RECOVERY)
    this.ultPhase = 'IDLE'; // 'IDLE', 'CUTIN', 'WINDUP', 'RELEASE', 'RECOVERY'
    this.ultWindupTimer = 0;
    this.ultWindupMax = 0;
    this.ultRecoveryTimer = 0;

    // v9.5: Sandra 2-Stage Combo Tracking
    this.comboStage = 0; // 0 = idle, 1 = stage 1 active (ready for stage 2)
    this.comboTimer = 0; // 0.32s combo window

    // v9.5: Shakira Fixed Zone Ult
    this.ultZoneCenterX = 0;

    // v9.5: Fall Recovery System
    this.fallRecoveryTimer = 0;
    this.safeCheckpointX = 220;
    this.safeCheckpointY = 520;
    this.fallCount = 0;

    // Hitstop
    this.hitstopTimer = 0;

    // Animation System (32 frames)
    this.animState = 'idle'; // idle, run, jump_takeoff, jump_apex, jump_fall, land, hit, attack, ultimate, victory
    this.animTimer = 0;
    this.currentFrame = 0;
    this.spriteSheet = null; // Image element

    this.loadSpriteSheet();
  }

  loadSpriteSheet() {
    this.spriteSheet = new Image();
    this.spriteSheet.src = this.charConfig.animSheet;
  }

  switchCharacter(charId) {
    if (!CHARACTERS[charId]) return;
    this.charConfig = CHARACTERS[charId];
    this.id = this.charConfig.id;
    this.name = this.charConfig.name;
    this.maxHp = this.charConfig.stats.maxHp;
    this.hp = Math.min(this.hp, this.maxHp);
    this.speed = this.charConfig.stats.speed;
    this.jumpForce = this.charConfig.stats.jumpForce;
    this.gravity = this.charConfig.stats.gravity;
    this.form2Active = false;
    this.mayoOrbs = [];
    this.loadSpriteSheet();
  }

  getFeetSensor() {
    return {
      x: this.x - this.sensorWidth / 2,
      y: this.y - this.sensorHeight,
      w: this.sensorWidth,
      h: this.sensorHeight
    };
  }

  addCoins(amount = 1) {
    this.coins += amount;
    // 15 金幣永久解鎖大招！
    if (this.coins >= 15 && !this.hasUnlockedUlt) {
      this.hasUnlockedUlt = true;
      audio.playPowerup();
      particles.emitCoinSparkle(this.x, this.y - 40);
    }
    // 45 金幣主角覺醒第二型態！
    if (this.coins >= 45 && !this.form2Active) {
      this.awakenForm2();
    }
  }

  awakenForm2() {
    this.form2Active = true;
    audio.playPowerup();

    if (this.id === 'yu') {
      this.speed += 45;
      this.maxHp += 35;
      this.hp += 35;
    } else if (this.id === 'shakira') {
      this.speed += 35;
      this.maxHp += 45;
      this.hp += 45;
      // 3 枚流心 Mayo Orbs 圍繞護衛
      this.mayoOrbs = [
        { angle: 0 },
        { angle: (Math.PI * 2) / 3 },
        { angle: (Math.PI * 4) / 3 }
      ];
    } else if (this.id === 'sandra') {
      this.speed += 30;
      this.maxHp += 60;
      this.hp += 60;
    }

    // Huge golden awakening burst
    for (let i = 0; i < 40; i++) {
      particles.emit({
        x: this.x + (Math.random() * 60 - 30),
        y: this.y - Math.random() * 80,
        vx: (Math.random() - 0.5) * 200,
        vy: -Math.random() * 200 - 50,
        size: 8,
        color: this.charConfig.colors.accent,
        life: 1.5,
        shape: 'star'
      });
    }
  }

  addHp(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    particles.emit({
      x: this.x,
      y: this.y - 40,
      vy: -40,
      size: 6,
      color: '#4CAF50',
      life: 0.6,
      shape: 'star'
    });
  }

  addCoffee() {
    // v9.2: 咖啡固定回復 25 HP，上限依角色當前 maxHp，不提供移速 Buff 或無敵 Buff
    if (this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 25);
      audio.playPowerup();
      // Green-gold steam particles
      for (let i = 0; i < 8; i++) {
        particles.emit({
          x: this.x + (Math.random() * 24 - 12),
          y: this.y - 35 + (Math.random() * 20 - 10),
          vy: -40 - Math.random() * 30,
          vx: (Math.random() - 0.5) * 40,
          size: 6,
          color: Math.random() < 0.5 ? '#00E676' : '#FFD54F',
          life: 0.8,
          shape: 'star'
        });
      }
    } else {
      // 若 HP 已滿：顯示「HP FULL」，不產生其他隱藏 buff
      audio.playPowerup();
      particles.emitFloatingText(this.x, this.y - 50, 'HP FULL', '#FFD54F');
      for (let i = 0; i < 6; i++) {
        particles.emit({
          x: this.x + (Math.random() * 20 - 10),
          y: this.y - 35,
          vy: -35,
          size: 5,
          color: '#FFE082',
          life: 0.6,
          shape: 'spark'
        });
      }
    }
  }

  performDash() {
    if (this.dashCooldown > 0 || this.isDead) return false;
    this.dashTimer = 0.22;
    this.dashCooldown = 2.0;
    this.invulnerableTimer = 0.35;
    this.vx = this.facing * 850;
    audio.playPowerup();

    // Transit cyan particle line
    for (let i = 0; i < 15; i++) {
      particles.emit({
        x: this.x - this.facing * i * 15,
        y: this.y - 35,
        vx: -this.facing * 50,
        vy: (Math.random() - 0.5) * 40,
        size: 6,
        color: '#00E5FF',
        life: 0.4,
        shape: 'spark'
      });
    }
    return true;
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0 || (this.isUlting && this.ultPhase === 'RELEASE') || this.isDead || this.dashTimer > 0 || this.fallRecoveryTimer > 0) return false;

    // v9.5: Wind-up provides 50% damage reduction
    if (this.isUlting && this.ultPhase === 'WINDUP') {
      amount *= 0.5;
    }

    // Shakira ult shield absorbs hit
    if (this.shieldTimer > 0) {
      this.shieldTimer = 0;
      audio.playHit();
      particles.emitHitSparks(this.x, this.y - 30, '#CE93D8', 12);
      return false;
    }

    this.hp -= amount;
    audio.playHit();
    this.hitstopTimer = 0.06; // 60ms Hitstop
    this.invulnerableTimer = 1.2; // 1.2s 無敵幀
    this.animState = 'hit';
    this.animTimer = 0;
    particles.emitHitSparks(this.x, this.y - 30, '#FF5252', 10);

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
    return true;
  }

  triggerSkill() {
    if ((this.isUlting && this.ultPhase !== 'IDLE') || this.isDead) return;
    if (this.skillCooldown > 0 && this.comboStage === 0) return;

    const spawnX = this.x + this.facing * 35;
    const spawnY = this.y - 35;

    if (this.id === 'yu') {
      // ═════════════════════════════════════════════════════════════════════════
      // 禹志晨：雨傘風壓斬 (Parry / Melee Arc / Deflect)
      // v9.5: 前方瞬時扇形 melee hitbox，半徑 210px (F2: 245px), 95°, 58 dmg (F2: 72), CD 0.32s
      // 偏轉消除 230px (F2: 280px) 敵彈，偏轉成功生成 260px 反擊風刃 (24 dmg, F2 貫穿 2 敵)
      // ═════════════════════════════════════════════════════════════════════════
      const isF2 = this.form2Active;
      const charCooldown = this.charConfig.stats.skillCooldown || 0.32;
      this.skillCooldown = charCooldown;
      this.isAttacking = true;
      this.attackTimer = 0.16;
      this.animState = 'attack';
      this.animTimer = 0;
      audio.playSkill(this.id);

      const arcRadius = isF2 ? 245 : 210;
      const arcDmg = isF2 ? 72 : 58;
      const deflectRad = isF2 ? 280 : 230;

      // 1. Deflect / eliminate enemy bullets in front within 230px / 280px
      let deflectedCount = 0;
      for (let i = projectiles.projectiles.length - 1; i >= 0; i--) {
        const p = projectiles.projectiles[i];
        if (!p.isPlayer) {
          const dx = p.x - this.x;
          const dy = p.y - spawnY;
          const dist = Math.hypot(dx, dy);
          if (dist <= deflectRad && dx * this.facing > 0) {
            const angle = Math.atan2(dy, dx * this.facing);
            if (Math.abs(angle) <= (95 * Math.PI / 360)) {
              particles.emitHitSparks(p.x, p.y, '#00E5FF', 10);
              projectiles.projectiles.splice(i, 1);
              deflectedCount++;
            }
          }
        }
      }

      // If deflected at least 1 bullet, spawn counter wind-blade! (range 260px, damage 24)
      if (deflectedCount >= 1) {
        audio.playPowerup();
        particles.emitFloatingText(this.x + this.facing * 50, this.y - 60, 'PARRY! 反擊風刃', '#00E5FF');
        projectiles.spawn({
          id: 'yu_counter_' + Date.now(),
          isPlayer: true,
          type: 'wind_blade',
          x: spawnX,
          y: spawnY,
          vx: this.facing * 650,
          vy: 0,
          maxDistance: 260,
          width: 48,
          height: 48,
          damage: 24,
          life: 0.45,
          penetrating: isF2,
          maxPenetrations: isF2 ? 2 : 1
        });
      }

      // 2. Instantaneous Melee Arc Hitbox
      this.hitstopTimer = 0.05; // 45~60ms hitstop
      projectiles.spawn({
        id: 'yu_arc_' + Date.now(),
        isPlayer: true,
        type: 'wind_blade',
        x: spawnX,
        y: spawnY,
        vx: this.facing * 500,
        vy: 0,
        maxDistance: arcRadius,
        width: isF2 ? 65 : 50,
        height: isF2 ? 65 : 50,
        damage: arcDmg,
        life: 0.12,
        penetrating: true,
        isMeleeArc: true,
        canClearEnemyBullets: true
      });

      // Visual arc slash particles
      for (let i = -3; i <= 3; i++) {
        const ang = (i / 3) * (95 * Math.PI / 360);
        particles.emit({
          x: this.x + Math.cos(ang) * arcRadius * 0.7 * this.facing,
          y: spawnY + Math.sin(ang) * arcRadius * 0.7,
          vx: this.facing * 80,
          vy: Math.sin(ang) * 40,
          size: 6,
          color: '#00E5FF',
          life: 0.25,
          shape: 'spark'
        });
      }
    } 
    else if (this.id === 'shakira') {
      // ═════════════════════════════════════════════════════════════════════════
      // 夏奇拉：蛋能雙彈 (Ranged Splash / Strictly NO melee hitbox)
      // v9.5: 雙發分離蛋彈，直擊 28 (F2: 34), range 600px, splash 90px (F2: 100px), splash dmg 18, CD 0.42s
      // ═════════════════════════════════════════════════════════════════════════
      const isF2 = this.form2Active;
      const charCooldown = this.charConfig.stats.skillCooldown || 0.42;
      this.skillCooldown = charCooldown;
      this.isAttacking = true;
      this.attackTimer = 0.18;
      this.animState = 'attack';
      this.animTimer = 0;
      audio.playSkill(this.id);

      const directDmg = isF2 ? 34 : 28;
      const splashRad = isF2 ? 100 : 90;
      const offsets = [-16, 16]; // 上下分離，無近戰判定
      offsets.forEach((offsetY, idx) => {
        projectiles.spawn({
          id: 'sh_egg_' + Date.now() + '_' + idx,
          isPlayer: true,
          type: 'egg',
          x: spawnX,
          y: spawnY + offsetY,
          vx: this.facing * 600,
          vy: 0,
          maxDistance: 600,
          width: isF2 ? 34 : 26,
          height: isF2 ? 28 : 20,
          damage: directDmg,
          splashRadius: splashRad,
          splashDamage: 18,
          life: 1.1,
          isMeleeArc: false // Strictly ranged
        });
      });
    } 
    else {
      // ═════════════════════════════════════════════════════════════════════════
      // 珊卓澎：爆炒上菜 (2-Stage Melee Combo / Knockback)
      // v9.5: 一段 150px 110° arc, 72 dmg, 520px knockback, 70ms hitstop
      // 0.32s 內再按接二段「翻鍋追擊」衝擊波 (290px 48 dmg, F2: 500px 88 dmg 貫穿)
      // ═════════════════════════════════════════════════════════════════════════
      const isF2 = this.form2Active;

      if (this.comboStage === 1 && this.comboTimer > 0) {
        // ── 二段：翻鍋追擊 (Ground shockwave) ──
        this.comboStage = 0;
        this.comboTimer = 0;
        this.skillCooldown = 0.45;
        this.isAttacking = true;
        this.attackTimer = 0.22;
        this.animState = 'attack';
        this.animTimer = 0;
        audio.playSkill(this.id);

        const waveRange = isF2 ? 500 : 290;
        const waveDmg = isF2 ? 88 : 48;

        projectiles.spawn({
          id: 'sa_combo2_' + Date.now(),
          isPlayer: true,
          type: 'pan_wave',
          x: spawnX,
          y: this.y - 15,
          vx: this.facing * 560,
          vy: 0,
          maxDistance: waveRange,
          width: isF2 ? 72 : 56,
          height: isF2 ? 60 : 44,
          damage: waveDmg,
          knockback: 380,
          life: 0.55,
          penetrating: isF2,
          isGroundWave: true
        });

        // Fiery ground particles
        for (let i = 0; i < 12; i++) {
          particles.emit({
            x: spawnX + this.facing * i * 22,
            y: this.y - 10,
            vx: this.facing * 40,
            vy: -Math.random() * 60 - 20,
            size: 5,
            color: '#FF5722',
            life: 0.4,
            shape: 'star'
          });
        }
      } else {
        // ── 一段：近戰揮擊 (Melee arc, 150px, 110°, 72 dmg, 520px knockback) ──
        this.comboStage = 1;
        this.comboTimer = 0.32; // 0.32s 內可接二段
        this.skillCooldown = 0.12; // 暫時冷卻，等待接段
        this.hitstopTimer = 0.07; // 70ms hitstop
        this.isAttacking = true;
        this.attackTimer = 0.18;
        this.animState = 'attack';
        this.animTimer = 0;
        audio.playSkill(this.id);

        projectiles.spawn({
          id: 'sa_combo1_' + Date.now(),
          isPlayer: true,
          type: 'pan_wave',
          x: spawnX,
          y: spawnY,
          vx: this.facing * 480,
          vy: 0,
          maxDistance: 150,
          width: isF2 ? 68 : 52,
          height: isF2 ? 68 : 52,
          damage: 72,
          knockback: 520,
          life: 0.15,
          penetrating: true,
          isMeleeArc: true
        });

        // Flame swing arc particles
        for (let i = 0; i < 8; i++) {
          particles.emit({
            x: spawnX + this.facing * Math.random() * 80,
            y: spawnY + (Math.random() - 0.5) * 60,
            vx: this.facing * 60,
            vy: (Math.random() - 0.5) * 50,
            size: 6,
            color: '#FFA726',
            life: 0.3,
            shape: 'spark'
          });
        }
      }
    }
  }

  triggerUltimate() {
    // 15 金幣永久解鎖，解鎖後不扣幣！只受冷卻限制！
    if (this.coins < 15 || this.ultCooldown > 0 || (this.isUlting && this.ultPhase !== 'IDLE') || this.isDead) return;

    const ultCfg = this.charConfig.ult;
    this.ultCooldown = this.charConfig.stats.ultCooldown || 7.0;
    this.isUlting = true;
    this.ultPhase = 'CUTIN';
    this.ultCutinTimer = ultCfg.cutinDuration || 0.65;
    this.animState = 'ultimate';
    this.animTimer = 0;

    hud.triggerCutin(this.charConfig, this.ultCutinTimer);
    audio.playUltCutin();
  }

  unleashUltimate() {
    audio.playUltRelease(this.id);
    projectiles.clearEnemyProjectiles(); // 清屏消除敵彈

    const isF2 = this.form2Active;

    if (this.id === 'yu') {
      // ═════════════════════════════════════════════════════════════════════════
      // 禹志晨大招：760px 貫穿走廊 (180px 高風壓 corridor)，多段穿透，per-target hit cooldown，1.3s 無敵
      // ═════════════════════════════════════════════════════════════════════════
      this.vx = this.facing * 850;
      const corridorLength = 760;
      const bladeCount = isF2 ? 10 : 8;
      const bladeDmg = isF2 ? 46 : 38;
      for (let i = 0; i < bladeCount; i++) {
        projectiles.spawn({
          id: 'yu_ult_' + i + '_' + Date.now(),
          isPlayer: true,
          type: 'wind_blade',
          x: this.x + i * 40 * this.facing,
          y: this.y - 70 + (i % 4) * 18 - 25,
          vx: this.facing * (550 + i * 25),
          vy: (Math.random() - 0.5) * 30,
          maxDistance: corridorLength,
          width: isF2 ? 60 : 48,
          height: isF2 ? 60 : 48,
          damage: bladeDmg,
          life: 0.85,
          penetrating: true,
          corridorZone: true,
          canClearEnemyBullets: true
        });
      }
    } 
    else if (this.id === 'shakira') {
      // ═════════════════════════════════════════════════════════════════════════
      // 夏奇拉大招：半徑 500px 固定戰區，14 顆流星蛋雨 (各 30 dmg)，回復 30/40 HP
      // 500px 戰區外完全不可被命中
      // ═════════════════════════════════════════════════════════════════════════
      this.addHp(isF2 ? 40 : 30);
      this.shieldTimer = isF2 ? 4.0 : 3.0;
      this.ultZoneCenterX = this.x; // 鎖定當前施放戰區中心
      const eggCount = 14;
      const eggDmg = 30;
      for (let i = 0; i < eggCount; i++) {
        const spawnOffsetX = (Math.random() - 0.5) * 960; // 500px 半徑固定戰區
        projectiles.spawn({
          id: 'sh_ult_' + i + '_' + Date.now(),
          isPlayer: true,
          type: 'egg',
          x: this.ultZoneCenterX + spawnOffsetX,
          y: this.y - 340 - (i % 4) * 25,
          vx: (Math.random() - 0.5) * 50,
          vy: 560 + (i % 3) * 35,
          maxDistance: 520,
          width: 32,
          height: 28,
          damage: eggDmg,
          splashRadius: 60,
          life: 0.9,
          penetrating: true,
          zoneCenterX: this.ultZoneCenterX,
          zoneRadius: 500
        });
      }
    } 
    else {
      // ═════════════════════════════════════════════════════════════════════════
      // 珊卓澎大招：主廚旋風鍋，核心吸附 350px，14 道鍋氣 max range 420px (各 30 dmg)
      // Boss 只受輕微 pull
      // ═════════════════════════════════════════════════════════════════════════
      this.pullEnemiesInZone(350);
      const waveCount = 14;
      const waveDmg = 30;
      for (let i = 0; i < waveCount; i++) {
        const ang = i * (Math.PI * 2 / waveCount);
        projectiles.spawn({
          id: 'sa_ult_' + i + '_' + Date.now(),
          isPlayer: true,
          type: 'pan_wave',
          x: this.x,
          y: this.y - 40,
          vx: Math.cos(ang) * 520,
          vy: Math.sin(ang) * 520,
          maxDistance: 420,
          width: isF2 ? 56 : 42,
          height: isF2 ? 56 : 42,
          damage: waveDmg,
          life: 0.75,
          penetrating: true
        });
      }
      if (isF2) {
        projectiles.spawn({
          id: 'sa_ult_dragon_' + Date.now(),
          isPlayer: true,
          type: 'pan_wave',
          x: this.x + this.facing * 50,
          y: this.y - 40,
          vx: this.facing * 580,
          vy: 0,
          maxDistance: 500,
          width: 80,
          height: 80,
          damage: 85,
          life: 0.85,
          penetrating: true
        });
      }
    }
  }

  pullEnemiesInZone(radius) {
    if (typeof window === 'undefined' || !window.activeGame) return;
    const g = window.activeGame;
    if (g.level && g.level.monsters) {
      for (let m of g.level.monsters) {
        if (!m.isDead && Math.hypot(m.x - this.x, m.y - this.y) < radius) {
          m.x += (this.x - m.x) * 0.45;
          m.vx = 0;
        }
      }
    }
    if (g.boss && !g.boss.isDead && Math.hypot(g.boss.x - this.x, g.boss.y - this.y) < radius) {
      g.boss.x += (this.x - g.boss.x) * 0.05; // Boss only slightly pulled
    }
  }

  getMayoOrbsWorld() {
    if (!this.form2Active || !this.mayoOrbs || this.mayoOrbs.length === 0) return [];
    const radius = 75; // 嚴格 75px 環繞半徑
    return this.mayoOrbs.map(orb => ({
      x: this.x + Math.cos(orb.angle) * radius,
      y: (this.y - 40) + Math.sin(orb.angle) * radius,
      radius: 14
    }));
  }

  update(dt, input, platforms) {
    if (this.isDead) return;

    // Hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // v9.5: Fall Recovery Cooldown Freeze
    if (this.fallRecoveryTimer > 0) {
      this.fallRecoveryTimer -= dt;
      return;
    }

    // v9.5: Ultimate State Machine (INPUT -> CUTIN -> WINDUP -> RELEASE -> RECOVERY)
    if (this.isUlting) {
      if (this.ultPhase === 'CUTIN') {
        this.vx = 0;
        this.ultCutinTimer -= dt;
        if (this.ultCutinTimer <= 0) {
          this.ultCutinTimer = 0;
          this.ultPhase = 'WINDUP';
          const cfg = this.charConfig.ult;
          this.ultWindupTimer = cfg.windupDuration || 0.45;
          this.ultWindupMax = this.ultWindupTimer;
        }
        return; // Freeze movement during cut-in
      } else if (this.ultPhase === 'WINDUP') {
        this.vx = 0; // Movement locked during wind-up
        this.ultWindupTimer -= dt;

        // Character-specific Wind-up World Visual Effects
        const windupProgress = 1.0 - Math.max(0, this.ultWindupTimer) / (this.ultWindupMax || 0.5);
        if (this.id === 'yu') {
          // Yu: swirling cyan wind ring
          for (let i = 0; i < 2; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r = 50 * (1.0 - windupProgress * 0.5);
            particles.emit({
              x: this.x + Math.cos(ang) * r,
              y: this.y - 40 + Math.sin(ang) * r,
              vx: -Math.cos(ang) * 90,
              vy: -Math.sin(ang) * 90,
              size: 4,
              color: '#00E5FF',
              life: 0.25,
              shape: 'spark'
            });
          }
        } else if (this.id === 'shakira') {
          // Shakira: 3 glowing eggs orbiting tight + golden mayo ring
          for (let i = 0; i < 3; i++) {
            const ang = (performance.now() * 0.015) + (i * Math.PI * 2 / 3);
            const r = 35 + Math.sin(performance.now() * 0.01) * 8;
            particles.emit({
              x: this.x + Math.cos(ang) * r,
              y: this.y - 40 + Math.sin(ang) * r,
              vx: 0,
              vy: -15,
              size: 5,
              color: '#FFD54F',
              life: 0.15,
              shape: 'star'
            });
          }
        } else if (this.id === 'sandra') {
          // Sandra: pan flames gather, ground rune expands
          particles.emit({
            x: this.x + (Math.random() * 40 - 20),
            y: this.y - 10,
            vx: (Math.random() - 0.5) * 30,
            vy: -Math.random() * 50 - 20,
            size: 5,
            color: '#FF5722',
            life: 0.3,
            shape: 'spark'
          });
        }

        if (this.ultWindupTimer <= 0) {
          this.ultWindupTimer = 0;
          this.ultPhase = 'RELEASE';
          this.invulnerableTimer = this.charConfig.ult.duration || 1.3;
          this.ultTimer = this.charConfig.ult.duration || 1.3;
          this.unleashUltimate();
        }
        return; // Movement locked during wind-up
      } else if (this.ultPhase === 'RELEASE') {
        this.ultTimer -= dt;
        if (this.ultTimer <= 0) {
          this.ultPhase = 'RECOVERY';
          this.ultRecoveryTimer = 0.15;
        }
      } else if (this.ultPhase === 'RECOVERY') {
        this.ultRecoveryTimer -= dt;
        if (this.ultRecoveryTimer <= 0) {
          this.ultPhase = 'IDLE';
          this.isUlting = false;
        }
      }
    }

    // Cooldown updates
    if (this.skillCooldown > 0) this.skillCooldown -= dt;
    if (this.ultCooldown > 0) this.ultCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;

    // Sandra Combo Window Countdown
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboStage = 0;
        this.comboTimer = 0;
        this.skillCooldown = 0.45;
      }
    }

    // v9.3: Boss Spore Slow effect timer
    if (this._sporeSlowTimer > 0) {
      this._sporeSlowTimer -= dt;
      if (this._sporeSlowTimer <= 0) {
        this._sporeSlowTimer = 0;
        this._sporeSlowFactor = 1.0;
      }
      // Visual: occasional purple wisps while slowed
      if (Math.random() < 0.15) {
        particles.emit({
          x: this.x + (Math.random() * 20 - 10),
          y: this.y - 50 - Math.random() * 30,
          vx: (Math.random() - 0.5) * 20,
          vy: -15,
          size: 4,
          color: '#CE93D8',
          life: 0.4,
          shape: 'circle',
          fade: true
        });
      }
    }

    // Update Shakira Mayo Orbs rotation
    if (this.mayoOrbs && this.mayoOrbs.length > 0) {
      for (let orb of this.mayoOrbs) {
        orb.angle += dt * 3.5;
      }
    }

    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.isAttacking = false;
    }
    if (this.isUlting) {
      this.ultTimer -= dt;
      if (this.ultTimer <= 0) this.isUlting = false;
    }

    // Handle Dash Input
    if (input.isDashTriggered && input.isDashTriggered()) {
      this.performDash();
    }

    // Handle Movement Input (Coffee strictly provides NO speed buff)
    // Apply spore slow effect if active
    const sporeSlow = (this._sporeSlowTimer > 0 && this.dashTimer <= 0) ? (this._sporeSlowFactor || 1.0) : 1.0;
    const speedMult = this.dashTimer > 0 ? 2.2 : 1.0;
    const curSpeed = this.speed * speedMult * sporeSlow;

    if (this.dashTimer <= 0) {
      if (input.isLeft()) {
        const mag = (input.joystickActive && input.joystickX < -0.18) ? Math.min(1.0, Math.abs(input.joystickX)) : 1.0;
        this.vx = -curSpeed * Math.max(0.65, mag);
        this.facing = -1;
      } else if (input.isRight()) {
        const mag = (input.joystickActive && input.joystickX > 0.18) ? Math.min(1.0, input.joystickX) : 1.0;
        this.vx = curSpeed * Math.max(0.65, mag);
        this.facing = 1;
      } else {
        this.vx *= 0.75; // Friction
        if (Math.abs(this.vx) < 10) this.vx = 0;
      }
    }

    // Jump Input with Coyote Time and Jump Buffer
    const now = performance.now();
    const canCoyote = this.onGround || (now - this.lastGroundTime <= this.COYOTE_TIME_MS);

    if (input.isJumpTriggered() && canCoyote) {
      this.vy = this.jumpForce;
      this.onGround = false;
      this.lastGroundTime = 0;
      input.consumeJumpBuffer();
      audio.playJump();
      particles.emitDust(this.x, this.y, 6);
    }

    // Apply Gravity
    this.vy += this.gravity * dt;
    if (this.vy > 900) this.vy = 900;

    // Movement Step
    const prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounds check
    if (this.x < 30) this.x = 30;

    // Feet Sensor Collision with Platforms
    this.onGround = false;
    const feet = this.getFeetSensor();

    for (let plat of platforms) {
      // Check if player feet sensor intersects platform top
      if (feet.x + feet.w > plat.x && feet.x < plat.x + plat.w) {
        // If falling or moving downward, and previously above platform top
        if (this.vy >= 0 && prevY <= plat.y + 4 && this.y >= plat.y - 4) {
          // Snap player feet exactly to platform top
          this.y = plat.y;
          this.vy = 0;
          this.onGround = true;
          this.lastGroundTime = performance.now();

          // Play land animation if just fell from significant distance
          if (this.animState === 'jump_fall') {
            this.animState = 'land';
            this.animTimer = 0;
            particles.emitDust(this.x, this.y, 4);
          }

          // v9.5: Update safe checkpoint when securely on stone ground (not near edges)
          if (plat.type === 'stone' && plat.y <= 565) {
            if (this.x > plat.x + 50 && this.x < (plat.x + plat.w - 50)) {
              this.safeCheckpointX = this.x;
              this.safeCheckpointY = plat.y;
            }
          }
          break;
        }
      }
    }

    // v9.5: FALL_RECOVERY System - If fallen off cliff / platform (y > 630)
    if (this.y > 630) {
      this.fallCount++;
      this.hp = Math.max(1, this.hp - 18);
      if (this.hp <= 0) {
        this.hp = 0;
        this.isDead = true;
      }
      this.fallTimePenalty = (this.fallTimePenalty || 0) + 1.0;
      if (typeof hud !== 'undefined' && hud && hud.timeRemaining) {
        hud.timeRemaining = Math.max(0, hud.timeRemaining - 1.0);
      } else if (typeof window !== 'undefined' && window.hud && window.hud.timeRemaining) {
        window.hud.timeRemaining = Math.max(0, window.hud.timeRemaining - 1.0);
      }
      this.fallRecoveryTimer = 0.45; // 0.45s fade
      this.x = this.safeCheckpointX || 220;
      this.y = this.safeCheckpointY || 520;
      this.vx = 0;
      this.vy = 0;
      this.invulnerableTimer = 1.0; // 1.0s invulnerability after recovery
      audio.playHit();
      particles.emitFloatingText(this.x, this.y - 50, '⚠️ 掉落重置！-18 HP / -1s', '#FF5252');
      particles.emitDust(this.x, this.y, 16);
      return;
    }

    // Attack / Ult Input
    if (input.isSkillTriggered()) {
      this.triggerSkill();
    }
    if (input.isUltTriggered()) {
      this.triggerUltimate();
    }

    // Update Animation State
    this.updateAnimation(dt);
  }

  updateAnimation(dt) {
    this.animTimer += dt;

    if (this.animState === 'victory') {
      // 3 frames victory pose
      this.currentFrame = 25 + (Math.floor(this.animTimer * 6) % 3);
      return;
    }

    if (this.isUlting) {
      // 6 frames @ 10fps
      this.animState = 'ultimate';
      const frameIdx = Math.min(5, Math.floor(this.animTimer * 10));
      this.currentFrame = 26 + frameIdx;
      return;
    }

    if (this.isAttacking) {
      // 5 frames @ 14fps
      this.animState = 'attack';
      const frameIdx = Math.min(4, Math.floor(this.animTimer * 14));
      this.currentFrame = 17 + frameIdx;
      return;
    }

    if (this.animState === 'hit') {
      const frameIdx = Math.min(1, Math.floor(this.animTimer * 10));
      this.currentFrame = 6 + frameIdx;
      if (this.animTimer >= 0.2) this.animState = 'idle';
      return;
    }

    if (this.animState === 'land') {
      const frameIdx = Math.min(1, Math.floor(this.animTimer * 14));
      this.currentFrame = 4 + frameIdx;
      if (this.animTimer >= 0.14) this.animState = 'idle';
      return;
    }

    if (!this.onGround) {
      if (this.vy < -150) {
        this.animState = 'jump_takeoff';
        this.currentFrame = 14;
      } else if (this.vy >= -150 && this.vy <= 150) {
        this.animState = 'jump_apex';
        this.currentFrame = 15;
      } else {
        this.animState = 'jump_fall';
        this.currentFrame = 16;
      }
      return;
    }

    // Ground movement
    if (Math.abs(this.vx) > 20) {
      this.animState = 'run';
      // 6 frames loop @ 12fps
      const runStep = Math.floor(this.animTimer * 12) % 6;
      this.currentFrame = 8 + runStep;
    } else {
      this.animState = 'idle';
      // 4 frames loop @ 5fps
      const idleStep = Math.floor(this.animTimer * 5) % 4;
      this.currentFrame = idleStep;
    }
  }

  render(ctx) {
    if (!this.spriteSheet || !this.spriteSheet.complete) return;

    // Blink when invulnerable
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    // Render 256x256 sprite centered at feet (FEET_Y = 232)
    const FRAME_SIZE = 256;
    const col = this.currentFrame % 8;
    const row = Math.floor(this.currentFrame / 8);
    const sx = col * FRAME_SIZE;
    const sy = row * FRAME_SIZE;

    const drawW = 120; // 實際顯示寬度
    const drawH = 120; // 實際顯示高度
    const offsetX = -drawW / 2;
    const offsetY = -drawH + 10; // 腳底對齊平台頂

    ctx.drawImage(
      this.spriteSheet,
      sx, sy, FRAME_SIZE, FRAME_SIZE,
      offsetX, offsetY, drawW, drawH
    );

    // Form 2 Awakened Aura
    if (this.form2Active) {
      const time = performance.now() * 0.005;
      const pulse = 1 + Math.sin(time) * 0.12;
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.2;
      if (this.id === 'yu') {
        // Cyan tactical energy rings
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -42, 38 * pulse, 52 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.id === 'shakira') {
        // Golden dawn light aura
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -42, 40 * pulse, 50 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Sandra flaming aura
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, -42, 42 * pulse, 54 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Shakira active shield bubble
    if (this.shieldTimer > 0) {
      ctx.strokeStyle = 'rgba(206, 147, 216, 0.85)';
      ctx.fillStyle = 'rgba(255, 215, 64, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -45, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Shakira Form 2 Orbiting Mayo Orbs
    if (this.form2Active && this.mayoOrbs && this.mayoOrbs.length > 0) {
      ctx.save();
      for (let orb of this.mayoOrbs) {
        const ox = Math.cos(orb.angle) * 55;
        const oy = -42 + Math.sin(orb.angle) * 55;
        // Outer white egg white
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ox, oy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner golden yolk
        ctx.fillStyle = '#FFA000';
        ctx.beginPath();
        ctx.arc(ox, oy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // v9.5: Ultimate Wind-up Visual Aura
    if (this.isUlting && this.ultPhase === 'WINDUP') {
      const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.15;
      ctx.save();
      ctx.strokeStyle = '#FFD54F';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, -42, 52 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}
