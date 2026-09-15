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

const SPRITE_FRAME_SIZE = 512;
const SPRITE_FOOT_Y = 448;
const SPRITE_FRAMES_PER_ROW = 8;

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
    this.resonancePhase = 1;

    // Dash (E / touch button)
    this.dashTimer = 0;
    this.dashCooldown = 0;

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
    this.sandraUltRelease = null;

    // v9.5: Sandra 2-Stage Combo Tracking
    this.comboStage = 0; // 0 = idle, 1 = stage 1 active (ready for stage 2)
    this.comboTimer = 0; // 0.32s combo window
    this.meleeDashCancelTimer = 0;
    this.hitConfirmArmorTimer = 0;

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

  getWeaponOrigin() {
    const offsets = {
      yu: { x: 52, y: -64 },
      shakira: { x: 42, y: -58 },
      sandra: { x: 50, y: -54 }
    };
    const offset = offsets[this.id] || offsets.yu;
    return { x: this.x + this.facing * offset.x, y: this.y + offset.y };
  }

  addCoins(amount = 1) {
    this.coins += amount;
    // 15 金幣永久解鎖大招！
    if (this.coins >= 15 && !this.hasUnlockedUlt) {
      this.hasUnlockedUlt = true;
      audio.playPowerup();
      particles.emitCoinSparkle(this.x, this.y - 40);
    }
    if (this.coins >= 30 && this.resonancePhase === 1) this.triggerHeroPhase2();
  }

  triggerHeroPhase2() {
    const oldMaxHp = this.maxHp;
    this.resonancePhase = 2;
    this.maxHp = oldMaxHp * 2;
    this.hp = Math.min(this.maxHp, this.hp + oldMaxHp);
  }

  phaseDamage(baseDamage, multiplier = 1.25) {
    return this.resonancePhase === 2 ? baseDamage * multiplier : baseDamage;
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
    if (this.id === 'sandra' && this.meleeDashCancelTimer > 0) {
      this.isAttacking = false;
      this.attackTimer = 0;
      this.meleeDashCancelTimer = 0;
    }
    this.dashTimer = 0.22;
    this.dashCooldown = 1.0;
    this.invulnerableTimer = 0.22; // v9.7.1: strictly covers active dash movement only
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

  takeDamage(amount, hitContext = null) {
    if (this.invulnerableTimer > 0 || (this.isUlting && (this.ultPhase === 'RELEASE' || this.ultPhase === 'CUTIN')) || this.isDead || this.dashTimer > 0 || this.fallRecoveryTimer > 0 || this.hitConfirmArmorTimer > 0) return false;

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
    this.invulnerableTimer = 0.5;
    this.lastDamageContext = hitContext;
    this.animState = 'hit';
    this.animTimer = 0;
    particles.emitHitSparks(this.x, this.y - 30, '#FF5252', 10);

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
    return true;
  }

  knockback(amount) {
    this.vx = amount;
  }

  triggerSkill() {
    if ((this.isUlting && this.ultPhase !== 'IDLE') || this.isDead) return;
    if (this.skillCooldown > 0) return;

    const weaponOrigin = this.getWeaponOrigin(); // Visual anchor only; calibrated projectile physics is unchanged.
    const spawnX = this.x + this.facing * 35;
    const spawnY = this.y - 35;

    if (this.id === 'yu') {
      // ═════════════════════════════════════════════════════════════════════════
      // 禹志晨：雨傘機關槍 (Suppression Fire / Rapid Needle Bullets)
      // v9.7.1: CD 0.16s, 16 dmg, 射程 480px, 三人最高射速, 偏轉近身 180px 敵彈
      // ═════════════════════════════════════════════════════════════════════════
      this.skillCooldown = this.charConfig.stats.skillCooldown || 0.16;
      this.isAttacking = true;
      this.attackTimer = 0.14;
      this.animState = 'attack';
      this.animTimer = 0;
      audio.playSkill(this.id);

      // 1. Deflect / eliminate enemy bullets in front within 180px
      for (let i = projectiles.projectiles.length - 1; i >= 0; i--) {
        const p = projectiles.projectiles[i];
        if (!p.isPlayer) {
          const dx = p.x - this.x;
          const dy = p.y - spawnY;
          const dist = Math.hypot(dx, dy);
          if (dist <= 180) {
            particles.emitHitSparks(p.x, p.y, '#00E5FF', 6);
            projectiles.projectiles.splice(i, 1);
          }
        }
      }

      // 2. Spawn rapid umbrella needle bullet
      projectiles.spawn({
        isPlayer: true,
        type: 'umbrella_bullet',
        x: spawnX,
        y: spawnY + (Math.random() - 0.5) * 8,
        vx: this.facing * 820,
        vy: (Math.random() - 0.5) * 30,
        maxDistance: 480,
        width: 32,
        height: 18,
        damage: this.phaseDamage(18),
        life: 0.65,
        knockback: true,
        penetrating: false
      });

      // Needle wind particles
      for (let i = 0; i < 3; i++) {
        particles.emit({
          x: spawnX + this.facing * Math.random() * 20,
          y: spawnY + (Math.random() - 0.5) * 15,
          vx: this.facing * (60 + Math.random() * 40),
          vy: (Math.random() - 0.5) * 20,
          size: 4,
          color: '#00E5FF',
          life: 0.2,
          shape: 'spark'
        });
      }
    }
    else if (this.id === 'shakira') {
      // ═════════════════════════════════════════════════════════════════════════
      // 夏奇拉：蛋能雙彈 (Ranged Splash / True Ranged DPS)
      // v9.7.1: 雙發分離蛋彈，直擊 38 dmg (三人最高小招), range 600px, splash 90px (20 dmg), CD 0.42s
      // ═════════════════════════════════════════════════════════════════════════
      this.skillCooldown = this.charConfig.stats.skillCooldown || 0.42;
      this.isAttacking = true;
      this.attackTimer = 0.18;
      this.animState = 'attack';
      this.animTimer = 0;
      audio.playSkill(this.id);

      const directDmg = this.phaseDamage(40);
      const splashRad = 90;
      const splashDmg = this.phaseDamage(22);
      const offsets = [-16, 16]; // 上下分離，無近戰判定
      offsets.forEach((offsetY, idx) => {
        projectiles.spawn({
          isPlayer: true,
          type: 'egg',
          x: spawnX,
          y: spawnY + offsetY,
          vx: this.facing * 600,
          vy: 0,
          maxDistance: 600,
          width: 28,
          height: 22,
          damage: directDmg,
          splashRadius: splashRad,
          splashDamage: splashDmg,
          life: 1.1,
          isMeleeArc: false,
          knockback: true
        });
      });
    }
    else {
      // ═════════════════════════════════════════════════════════════════════════
      // 珊卓澎：平底鍋揮舞・怒火鍋氣 (Hit-and-Run / Melee Arc)
      // v9.7.7: 一段揮舞 550px 110° arc, 70 dmg, 380px knockback, CD 0.38s
      // 靠三人最快移速 (370) 游擊穿梭戰場
      // ═════════════════════════════════════════════════════════════════════════
      this.skillCooldown = this.charConfig.stats.skillCooldown || 0.38;
      this.hitstopTimer = 0.04;
      this.isAttacking = true;
      this.attackTimer = 0.16;
      this.animState = 'attack';
      this.animTimer = 0;
      audio.playSkill(this.id);

      projectiles.spawn({
        isPlayer: true,
        type: 'sandra_orange_drop',
        x: spawnX,
        y: spawnY,
        vx: this.facing * 500,
        vy: 0,
        maxDistance: 550,
        width: 64,
        height: 64,
        damage: this.phaseDamage(60),
        knockback: 380,
        life: 1.1,
        penetrating: true,
        isMeleeArc: true
      });

      // Flame swing arc particles & anger sparks
      for (let i = 0; i < 8; i++) {
        particles.emit({
          x: spawnX + this.facing * Math.random() * 60,
          y: spawnY + (Math.random() - 0.5) * 50,
          vx: this.facing * 50,
          vy: (Math.random() - 0.5) * 40,
          size: 6,
          color: Math.random() < 0.5 ? '#FF5722' : '#FFA726',
          life: 0.25,
          shape: 'spark'
        });
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

    hud.triggerCutin(this.charConfig, this.ultCutinTimer, this.resonancePhase);
    audio.playUltCutin();
  }

  getUltimateTargetX() {
  const game = typeof window !== 'undefined' ? window.activeGame : null;
  const bossReady = game?.boss && !game.boss.isDead && game.boss.entranceTriggered;
  if (bossReady) return game.boss.x;
  const nearest = game?.level?.monsters?.filter(monster => !monster.isDead)
    .sort((left, right) => Math.abs(left.x - this.x) - Math.abs(right.x - this.x))[0];
  if (nearest && Math.abs(nearest.x - this.x) <= 650) return nearest.x;
  return this.x + this.facing * 260;
}

unleashUltimate() {
    audio.playUltRelease(this.id);
    projectiles.clearEnemyProjectiles(); // 清屏消除敵彈

    if (this.id === 'yu') {
      // ═════════════════════════════════════════════════════════════════════════
      // 禹志晨大招：760px 貫穿走廊 (180px 高風壓 corridor)，多段穿透，304 傷害
      // ═════════════════════════════════════════════════════════════════════════
      this.vx = this.facing * 850;
      const corridorLength = 760;
      const waveOffsets = [-60, -20, 20, 60];
      const waveSpeeds = [560, 620, 690];
      const waveDamage = 43;
      for (let wave = 0; wave < 3; wave++) {
        for (let front = 0; front < waveOffsets.length; front++) {
          projectiles.spawn({
            isPlayer: true, type: 'umbrella_wave',
            x: this.x + wave * 18 * this.facing,
            y: this.y - 70 + waveOffsets[front],
            vx: this.facing * waveSpeeds[wave], vy: 0,
            maxDistance: 760, width: 72, height: 44,
            damage: waveDamage, life: 1.35,
            releaseAfter: [0, 0.18, 0.36][wave],
            penetrating: true, corridorZone: true, canClearEnemyBullets: true
          });
        }
      }
    }
    else if (this.id === 'shakira') {
      // ═════════════════════════════════════════════════════════════════════════
      // 夏奇拉大招：半徑 500px 固定戰區，14 顆流星蛋雨 (各 30 dmg = 420 dmg)，回復 30 HP
      // ═════════════════════════════════════════════════════════════════════════
      this.addHp(this.resonancePhase === 2 ? 45 : 30);
      this.shieldTimer = 3.0;
      const targetX = this.getUltimateTargetX();
      const waveOffsets = [
        [-270, -180, -90, 0, 90, 180, 270],
        [-225, -150, -75, 35, 105, 180, 255],
        [-180, -120, -60, 0, 60, 120, 180]
      ];
      const waveSpeeds = [540, 630, 720];
      const eggDmg = 23;
      this.ultZoneCenterX = targetX;
      for (let wave = 0; wave < 3; wave++) {
        for (let index = 0; index < 7; index++) {
          projectiles.spawn({ isPlayer: true, type: 'egg',
            x: targetX + waveOffsets[wave][index], y: this.y - 410 - index * 14,
            vx: 0, vy: waveSpeeds[wave], maxDistance: 560,
            width: 30 + wave * 3, height: 26 + wave * 3, damage: eggDmg,
            monsterDamage: 40,
            splashRadius: 75, splashDamage: this.resonancePhase === 2 ? 22 : 18,
            releaseAfter: [0, 0.26, 0.56][wave], life: 1.5,
            penetrating: false, zoneCenterX: targetX, zoneRadius: 500, bossTargetAssist: true });
        }
      }
      window.activeGame?.camera?.shake(6, 0.12);
    }
    else {
      // ═════════════════════════════════════════════════════════════════════════
      // 珊卓澎 Phase I：主廚旋風鍋，14 道鍋氣 (各 30 dmg = 420 dmg)
      // ═════════════════════════════════════════════════════════════════════════
      this.pullEnemiesInZone(350);
      const waveCount = 14;
      if (this.resonancePhase === 2) {
        const staggerDuration = this.charConfig.ult.phase2StaggerDuration || 0.90;
        this.sandraUltRelease = {
          elapsed: 0,
          nextReleaseAt: staggerDuration / 13,
          released: 1,
          count: this.charConfig.ult.phase2ProjectileCount || 14,
          interval: staggerDuration / 13
        };
        this.releaseSandraFlyingPan(0);
        return;
      }
      const waveDmg = this.charConfig.ult.phase1ProjectileDamage || 30;
      for (let i = 0; i < waveCount; i++) {
        const ang = i * (Math.PI * 2 / waveCount);
        projectiles.spawn({
          isPlayer: true,
          type: 'pan_wave',
          x: this.x,
          y: this.y - 40,
          vx: Math.cos(ang) * 520,
          vy: Math.sin(ang) * 520,
          maxDistance: 420,
          width: 42,
          height: 42,
          damage: waveDmg,
          life: 0.75,
          penetrating: true
        });
      }
    }
  }

  releaseSandraFlyingPan(index) {
    const cfg = this.charConfig.ult;
    const count = cfg.phase2ProjectileCount || 14;
    const spread = (35 * Math.PI) / 180;
    const centered = count <= 1 ? 0 : index / (count - 1) - 0.5;
    const angle = this.facing === 1 ? centered * spread * 2 : Math.PI - centered * spread * 2;
    const speed = cfg.phase2ProjectileSpeed || 700;
    const pan = projectiles.spawn({
      isPlayer: true,
      type: cfg.phase2ProjectileType || 'flying_pan',
      x: this.x + this.facing * 26,
      y: this.y - 62,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      maxDistance: cfg.phase2MaxDistance || 700,
      width: 34,
      height: 28,
      damage: cfg.phase2ProjectileDamage || 40,
      life: 1.2,
      penetrating: true,
      rotates: true,
      rotation: angle,
      vRot: 10,
      attackType: 'sandra_phase2_ultimate'
    });
    if (index === 0) {
      const activeGame = typeof window !== 'undefined' ? window.activeGame : null;
      if (activeGame?.camera) activeGame.camera.shake(5, 0.10);
      particles.emitHitSparks(this.x + this.facing * 35, this.y - 62, '#FFD54F', 12);
    }
    return pan;
  }

  updateSandraUltRelease(dt) {
    const release = this.sandraUltRelease;
    if (!release) return;
    release.elapsed += dt;
    while (release.released < release.count && release.elapsed >= release.nextReleaseAt) {
      this.releaseSandraFlyingPan(release.released);
      release.released++;
      release.nextReleaseAt += release.interval;
    }
    if (release.released >= release.count) this.sandraUltRelease = null;
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
        if (this.id === 'sandra' && this.resonancePhase === 2) this.updateSandraUltRelease(dt);
        this.ultTimer -= dt;
        if (this.ultTimer <= 0) {
          this.ultPhase = 'RECOVERY';
          this.ultRecoveryTimer = 0.15;
          this.invulnerableTimer = 0; // v9.7.1: return immediately to normal damage detection once gameplay resumes
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
    if (this.meleeDashCancelTimer > 0) this.meleeDashCancelTimer -= dt;
    if (this.hitConfirmArmorTimer > 0) this.hitConfirmArmorTimer -= dt;

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
      this.fallRecoveryTimer = 0.8;
      this.x = this.safeCheckpointX || 220;
      this.y = this.safeCheckpointY || 520;
      this.vx = 0;
      this.vy = 0;
      this.invulnerableTimer = 1.0; // 1.0s invulnerability after recovery
      for (let i = projectiles.projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles.projectiles[i];
        if (!projectile.isPlayer && Math.abs(projectile.x - this.x) <= 250) {
          projectiles.projectiles.splice(i, 1);
        }
      }
      const activeGame = typeof window !== 'undefined' ? window.activeGame : null;
      if (activeGame?.level?.monsters) {
        for (const monster of activeGame.level.monsters) {
          if (Math.abs(monster.x - this.x) > 500) continue;
          monster.isTelegraphing = false;
          monster.telegraphTimer = 0;
          monster.attackCooldownTimer = Math.max(monster.attackCooldownTimer, 0.5);
        }
      }
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
      const yuRunDiag = this.id === 'yu' && typeof window !== 'undefined'
        ? (window.YU_RUN_DIAG || new URLSearchParams(window.location?.search || '').get('YU_RUN_DIAG'))
        : null;
      const runStep = yuRunDiag === 'static' ? 0 : Math.floor(this.animTimer * 12) % 6;
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

    const col = this.currentFrame % SPRITE_FRAMES_PER_ROW;
    const row = Math.floor(this.currentFrame / SPRITE_FRAMES_PER_ROW);
    const sx = col * SPRITE_FRAME_SIZE;
    const sy = row * SPRITE_FRAME_SIZE;

    // v9.8.0: logical 512px canvas with one shared foot anchor.
    const drawW = 180;
    const drawH = 180;
    const offsetX = -drawW / 2;
    const offsetY = -(SPRITE_FOOT_Y / SPRITE_FRAME_SIZE) * drawH;

    ctx.drawImage(
      this.spriteSheet,
      sx, sy, SPRITE_FRAME_SIZE, SPRITE_FRAME_SIZE,
      offsetX, offsetY, drawW, drawH
    );

    if (typeof window !== 'undefined' && window.DEBUG_HITBOX) {
      const weaponOffset = this.getWeaponOrigin();
      const localWeaponX = (weaponOffset.x - this.x) * this.facing;
      ctx.save();
      ctx.strokeStyle = '#7CFF6B';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-this.width / 2, -this.height, this.width, this.height);
      ctx.strokeStyle = '#00E5FF';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#FFD54F';
      ctx.beginPath();
      ctx.arc(localWeaponX, weaponOffset.y - this.y, 5, 0, Math.PI * 2);
      ctx.stroke();
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

    // v9.6: Ultimate Wind-up Visual Aura (Character-Specific High-Energy Charge)
    if (this.isUlting && this.ultPhase === 'WINDUP') {
      const now = performance.now();
      const progress = 1.0 - Math.max(0, this.ultWindupTimer) / (this.ultWindupMax || 0.5);
      const pulse = 1 + Math.sin(now * 0.02) * 0.15;
      ctx.save();

      if (this.id === 'yu') {
        // Yu: Blue-white air pressure streamlines & collapsing wind vortex
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 3.5;

        // Inward collapsing wind ring
        const collapseR = 60 * (1.1 - progress * 0.4);
        ctx.beginPath();
        ctx.arc(0, -42, collapseR, 0, Math.PI * 2);
        ctx.stroke();

        // Speed lines converging towards umbrella tip
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + now * 0.008;
          const r1 = 70 * (1 - progress * 0.3);
          const r2 = 30;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r1, -42 + Math.sin(a) * r1);
          ctx.lineTo(Math.cos(a) * r2, -42 + Math.sin(a) * r2);
          ctx.stroke();
        }

        // Glasses glint flare
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(8, -55, 4 + Math.sin(now * 0.03) * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.id === 'shakira') {
        // Shakira: Golden egg light rings & spiral sparkles
        ctx.shadowColor = '#FFD54F';
        ctx.shadowBlur = 22;

        // Dual rotating egg-orbit rings
        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -42, 54 * pulse, 30 * pulse, now * 0.004, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#CE93D8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -42, 30 * pulse, 54 * pulse, -now * 0.004, 0, Math.PI * 2);
        ctx.stroke();

        // Radiating sweet morning star
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath();
        ctx.arc(0, -78, 5 + Math.sin(now * 0.02) * 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sandra: Blazing wok flame vortex leaping up from ground
        ctx.shadowColor = '#FF5722';
        ctx.shadowBlur = 24;

        // Ground fiery rune circle
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, -4, 48 * pulse, 14 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#FFD54F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -4, 32 * pulse, 10 * pulse, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Leaping flame pillars around the chef
        for (let i = 0; i < 5; i++) {
          const flameX = ((i - 2) * 18);
          const flameH = 40 + Math.sin(now * 0.02 + i) * 20;
          ctx.fillStyle = i % 2 === 0 ? '#FF7043' : '#FFA726';
          ctx.beginPath();
          ctx.moveTo(flameX - 8, -4);
          ctx.quadraticCurveTo(flameX, -4 - flameH, flameX + 8, -4);
          ctx.fill();
        }
        if (this.resonancePhase === 2) {
          // Phase II wind-up preview: three readable pan silhouettes orbit Sandra.
          for (let i = 0; i < 3; i++) {
            const orbit = now * 0.004 + i * Math.PI * 2 / 3;
            ctx.save();
            ctx.globalAlpha = 0.35 + progress * 0.35;
            ctx.translate(Math.cos(orbit) * 58, -52 + Math.sin(orbit) * 28);
            ctx.rotate(orbit + Math.PI / 2);
            ctx.fillStyle = '#263238';
            ctx.strokeStyle = '#FFD54F';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#FF7043';
            ctx.fillRect(11, -3, 22, 6);
            ctx.restore();
          }
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
