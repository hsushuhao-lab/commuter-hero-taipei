/**
 * 08點上班大作戰：通勤英雄篇 - 魔王：夢影巨花王 (Boss.js) - v9.4.0
 * v9.4 核心升級：
 * - HP 2,600 (Phase 1: 2600~1300 | Phase 2: <1300 or 60幣觸發)
 * - Anti-Facetank 防站樁：玩家距離 <120px 連續 1.2 秒 → 藤蔓橫掃擊退 (18dmg / 250px)
 * - Phase 1: 9 向交錯螺旋花瓣 (320 px/s)、突刺地刺藤蔓 (3~4 道連續)、瞌睡孢子霧 (慢速漂浮)
 * - Phase 2: 16 向深紅花瓣暴風雨、狂暴雙重召喚、捕蠅草巨顎夾擊
 * - Phase 2 NEW: 死神鐮刀迴旋鏢(fireAbyssalScythe)、旋刺龍卷(triggerSpinningThorns)、暗影瘴氣(castShadowMiasma)
 * - Phase 2 順序AI：花瓣→鐮刀→旋刺→瘴氣→巨顎 循環
 * - 登場動畫：Boss 從地底升起 + 60顆上升綠色花瓣 + roar
 * - Phase 2 變身動畫：2.5s 凍結 + 深紅光環脈衝 + 100顆擴散粒子
 */

import { BOSS_CONFIG } from '../data/Monsters.js';
import { audio } from '../engine/Audio.js';
import { particles } from './Particles.js';
import { projectiles } from './Projectiles.js';
import { Monster } from './Monster.js';

export class Boss {
  constructor() {
    this.config = BOSS_CONFIG;
    this.x = 15650; // Arena right side (14800 ~ 16500)
    this.y = this.config.arena.groundY;
    this.width = this.config.width;
    this.height = this.config.height;

    this.hp = this.config.maxHp;
    this.maxHp = this.config.maxHp;
    this.phase = 1; // 1 or 2
    this.phase2Triggered = false;

    this.vx = 0;
    this.facing = -1;
    this.bobTimer = 0;

    // AI & Attack Timers
    this.attackTimer = 1.5;
    this.summonTimer = 7.0;
    this.vineTimer = 3.0;
    this.sporeTimer = 5.0;    // Sleep spore clouds
    this.chomperTimer = 8.0;  // Phase 2 Venus Flytrap chomp

    // Anti-Facetank tracking
    this.facetankTimer = 0;   // How long player has been in close range
    this.vineCleaveCooldown = 0; // Cooldown after cleave so it doesn't spam

    // Vine Cleave state
    this.isVineCleaving = false;
    this.vineCleaveTimer = 0;

    // Spore projectiles in world (tracked separately for slow effect)
    this.spores = [];

    // Telegraph
    this.isTelegraphing = false;
    this.telegraphTimer = 0;
    this.telegraphType = 'none';

    // Ground spike telegraph markers
    this.groundSpikeWarnings = [];

    // State
    this.isDead = false;
    this.hitTimer = 0;
    this.roarTimer = 0;

    // ── Entrance Animation ────────────────────────────────────────────
    this.entranceTimer = 0;         // Counts down from 2.0 while boss rises
    this.entranceDone = false;      // Set true once rise is complete
    this.entranceTriggered = false; // Set true the first time player reaches x>=14700

    // ── Phase 2 Transform Animation ───────────────────────────────────
    this.phase2TransformTimer = 0;  // Counts down from 2.5 during transform freeze
    this.phase2ScaleAnim = 0.0;     // Normalised 0→1 progress for easing

    // ── Phase 2 Exclusive Attacks ─────────────────────────────────────
    this.spinningThorns = [];       // Orbiting thorn projectile data array
    this.scytheTimer = 4.5;         // 死神鐮刀 cooldown
    this.thornTimer = 6.0;          // 旋刺龍卷 cooldown
    this.miasmaTimer = 5.5;         // 暗影瘴氣 cooldown
    this.phase2AttackSequence = 0;  // 0=petal,1=scythe,2=thorns,3=miasma,4=chomp (mod 5)

    // Assets
    this.imgPhase1 = new Image();
    this.imgPhase1.src = 'assets/boss_flower_phase1.png';
    this.imgPhase2 = new Image();
    this.imgPhase2.src = 'assets/boss_flower_phase2.png';

    // Minions array passed from level
    this.minions = [];
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;
    this.hitTimer = 0.12;
    audio.playHit();
    particles.emitHitSparks(this.x, this.y - 120, '#E91E63', 8);

    // Check Phase 2 Trigger (< 1300 HP = 50%)
    if (this.hp <= this.config.phase2Threshold && !this.phase2Triggered) {
      this.triggerPhase2();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.deathSequenceTimer = 2.2;
      audio.playBossRoar();
      // Massive explosion
      for (let i = 0; i < 80; i++) {
        particles.emit({
          x: this.x + (Math.random() * 220 - 110),
          y: this.y - Math.random() * 220,
          vx: (Math.random() * 2 - 1) * 320,
          vy: (Math.random() * 2 - 1) * 320,
          size: Math.random() * 10 + 4,
          color: Math.random() < 0.5 ? '#FF80AB' : (Math.random() < 0.5 ? '#E040FB' : '#FFD700'),
          life: 2.2,
          shape: 'petal'
        });
      }
    }
  }

  triggerPhase2() {
    this.phase = 2;
    this.phase2Triggered = true;
    this.roarTimer = 2.5;             // Extended freeze to match transform duration
    this.phase2TransformTimer = 2.5;  // Visual transform animation timer
    this.phase2ScaleAnim = 0.0;

    audio.playBossRoar();
    audio.playBgm('boss_p2'); // 高速狂暴 BGM!

    // ── Expanding ring of 100 crimson petals ─────────────────────────
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      // Two rings: inner fast burst + outer slow drift
      const isOuter = i >= 50;
      const speed = isOuter ? (120 + Math.random() * 80) : (280 + Math.random() * 120);
      const ringDelay = isOuter ? 0.08 : 0; // slight stagger (handled via initial distance offset)
      particles.emit({
        x: this.x + Math.cos(angle) * (isOuter ? 30 : 10),
        y: (this.y - 120) + Math.sin(angle) * (isOuter ? 30 : 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: isOuter ? (Math.random() * 5 + 3) : (Math.random() * 8 + 5),
        color: isOuter ? '#B71C1C' : '#FF1744',
        life: 2.0 + Math.random() * 0.5,
        shape: 'petal',
        rotates: true,
        vRot: 4 + Math.random() * 3
      });
    }

    // ── Flashing light burst (large bright circle particles) ─────────
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      particles.emit({
        x: this.x + Math.cos(a) * 60,
        y: (this.y - 120) + Math.sin(a) * 60,
        vx: Math.cos(a) * 50,
        vy: Math.sin(a) * 50,
        size: 18 + Math.random() * 10,
        color: '#FF80AB',
        life: 0.5,
        shape: 'circle',
        fade: true
      });
    }

    // ── Floating dramatic text ────────────────────────────────────────
    particles.emitFloatingText(this.x, this.y - 220, '🌹 PHASE 2：狂暴深淵裂變態！', '#FF1744');
  }

  update(dt, player, camera) {
    if (this.isDead) {
      if (this.deathSequenceTimer > 0) {
        this.deathSequenceTimer -= dt;
        if (Math.random() < 0.4) {
          particles.emit({
            x: this.x + (Math.random() * 200 - 100),
            y: this.y - Math.random() * 200,
            vx: (Math.random() - 0.5) * 120,
            vy: -Math.random() * 150,
            size: 6,
            color: '#FFD700',
            life: 1.0,
            shape: 'star'
          });
        }
      }
      return;
    }

    // 60 金幣提早觸發 Boss Phase 2 狂暴盛開態！(Commuter Resonance)
    if (player && player.coins >= (this.config.coinsEnrageThreshold || 60) && !this.phase2Triggered) {
      this.triggerPhase2();
    }

    this.bobTimer += dt * (this.phase === 2 ? 3.5 : 2.0);
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.roarTimer > 0) {
      this.roarTimer -= dt;
      camera.shake(12, 0.1);
      return; // Roar freeze
    }

    // Vine Cleave state (forcefully pushes player back after triggering)
    if (this.isVineCleaving) {
      this.vineCleaveTimer -= dt;
      if (this.vineCleaveTimer <= 0) {
        this.isVineCleaving = false;
      }
      return; // Frozen during cleave animation
    }

    if (this.vineCleaveCooldown > 0) this.vineCleaveCooldown -= dt;

    // ═══════════════════════════════════════════════════════
    // Boss Entrance Animation
    // ═══════════════════════════════════════════════════════
    if (!this.entranceDone) {
      if (!this.entranceTriggered && player && player.x >= 14700) {
        // First time player enters the arena — trigger entrance
        this.entranceTriggered = true;
        this.entranceTimer = 2.0;
        audio.playBossRoar();
        // Emit 60 upward green petals from boss position
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2;
          particles.emit({
            x: this.x + Math.cos(a) * (20 + Math.random() * 40),
            y: this.y - 60 - Math.random() * 80,
            vx: Math.cos(a) * (80 + Math.random() * 120),
            vy: -(150 + Math.random() * 200),
            size: Math.random() * 7 + 4,
            color: Math.random() < 0.5 ? '#66BB6A' : '#A5D6A7',
            life: 1.8 + Math.random() * 0.5,
            shape: 'petal',
            rotates: true,
            vRot: 3 + Math.random() * 3
          });
        }
      }

      if (this.entranceTriggered && this.entranceTimer > 0) {
        this.entranceTimer -= dt;
        // Lerp boss from groundY+300 (below ground) up to groundY
        const progress = 1.0 - Math.max(0, this.entranceTimer) / 2.0;
        // Use smoothstep for natural deceleration
        const smooth = progress * progress * (3 - 2 * progress);
        this._entranceYOffset = (1.0 - smooth) * 300;
        return; // Freeze AI during entrance
      } else if (this.entranceTriggered) {
        this.entranceDone = true;
        this._entranceYOffset = 0;
      }
    }

    // ═══════════════════════════════════════════════════════
    // Phase 2 Transform Animation tick (independent of roarTimer)
    // ═══════════════════════════════════════════════════════
    if (this.phase2TransformTimer > 0) {
      this.phase2TransformTimer -= dt;
      // progress 0→1 over the 2.5s window
      const p = 1.0 - Math.max(0, this.phase2TransformTimer) / 2.5;
      this.phase2ScaleAnim = p; // Used in render for sinusoidal scale
    }

    // Facing player
    this.facing = player.x < this.x ? -1 : 1;

    // Floating animation
    const floatY = Math.sin(this.bobTimer) * (this.phase === 2 ? 18 : 10);
    this.y = this.config.arena.groundY + floatY;

    // Clamp inside flat arena bounds
    const minX = this.config.arena.startX + 200;
    const maxX = this.config.arena.endX - 150;
    this.x = Math.max(minX, Math.min(maxX, this.x));

    // Slow repositioning towards player
    const arenaMid = (this.config.arena.startX + this.config.arena.endX) / 2;
    const desiredX = player.x + (player.x < arenaMid ? 360 : -360);
    this.x += (desiredX - this.x) * dt * (this.phase === 2 ? 0.8 : 0.4);

    // ═══════════════════════════════════════════════════════
    // Anti-Facetank: Vine Cleave detection
    // ═══════════════════════════════════════════════════════
    const distToPlayer = Math.abs(player.x - this.x);
    const af = this.config.antiFacetank;
    if (distToPlayer < af.distThreshold && this.vineCleaveCooldown <= 0) {
      this.facetankTimer += dt;
      if (this.facetankTimer >= af.standingDuration) {
        // Trigger Vine Cleave!
        this._triggerVineCleave(player, af);
        this.facetankTimer = 0;
        this.vineCleaveCooldown = 3.0; // 3 second cooldown before next potential cleave
      }
    } else {
      // Player moved away — reset timer
      this.facetankTimer = Math.max(0, this.facetankTimer - dt * 1.5);
    }

    // ═══════════════════════════════════════════════════════
    // AI Attack Loop
    // ═══════════════════════════════════════════════════════
    const currentConfig = this.phase === 2 ? this.config.phase2 : this.config.phase1;
    this.attackTimer -= dt;
    this.vineTimer -= dt;
    this.summonTimer -= dt;
    this.sporeTimer -= dt;

    if (this.phase === 1) {
      // ── Phase 1 attack rotation ──────────────────────────────────────
      // Standard Petal Attack (9-way spiral)
      if (this.attackTimer <= 0) {
        this.attackTimer = currentConfig.attackCooldown;
        this.firePetalBarrage(player);
      }

      // Vine Ground Thrust (3-4 consecutive spikes)
      if (this.vineTimer <= 0) {
        this.vineTimer = 4.5;
        this.triggerVineThrust(player);
      }

      // Monster Minion Summoning
      if (this.summonTimer <= 0) {
        this.summonTimer = currentConfig.summonCooldown;
        this.summonMinions();
      }

      // Sleep Spore Clouds
      if (this.sporeTimer <= 0) {
        this.sporeTimer = 6.5;
        this.launchSpores(player);
      }
    } else {
      // ── Phase 2 sequenced attack rotation (mod 5) ────────────────────
      // Shared timers for P2 exclusive attacks
      this.scytheTimer -= dt;
      this.thornTimer -= dt;
      this.miasmaTimer -= dt;
      this.chomperTimer -= dt;

      if (this.attackTimer <= 0) {
        const seq = this.phase2AttackSequence % 5;
        this.phase2AttackSequence++;

        switch (seq) {
          case 0: // 花瓣暴風雨 — Petal Barrage
            this.attackTimer = currentConfig.attackCooldown;
            this.firePetalBarrage(player);
            break;
          case 1: // 死神鐮刀 — Abyssal Scythe (boomerang)
            this.attackTimer = 4.5;
            this.scytheTimer = 4.5;
            this.fireAbyssalScythe(player);
            break;
          case 2: // 旋刺龍卷 — Spinning Thorns
            this.attackTimer = 6.0;
            this.thornTimer = 6.0;
            this.triggerSpinningThorns();
            break;
          case 3: // 暗影瘴氣 — Shadow Miasma
            this.attackTimer = 5.5;
            this.miasmaTimer = 5.5;
            this.castShadowMiasma(player);
            break;
          case 4: // 捕蠅草巨顎 — Venus Chomp
            this.attackTimer = 5.5;
            this.chomperTimer = 5.5;
            this.triggerVenusChomper(player);
            break;
        }
      }

      // Vine Ground Thrust (triple, Phase 2)
      if (this.vineTimer <= 0) {
        this.vineTimer = 3.0;
        this.triggerVineThrust(player);
      }

      // Monster Minion Summoning
      if (this.summonTimer <= 0) {
        this.summonTimer = currentConfig.summonCooldown;
        this.summonMinions();
      }

      // Sleep Spore Clouds (faster in Phase 2)
      if (this.sporeTimer <= 0) {
        this.sporeTimer = 4.0;
        this.launchSpores(player);
      }
    }

    // Update spore cloud projectiles
    this._updateSpores(dt, player);
  }

  // ══════════════════════════════════════════════════════════════════
  // Anti-Facetank: Vine Cleave – instant burst, knockback 250px
  // ══════════════════════════════════════════════════════════════════
  _triggerVineCleave(player, af) {
    this.isVineCleaving = true;
    this.vineCleaveTimer = 0.35;

    // Visual: dramatic vine whip burst
    for (let i = 0; i < 20; i++) {
      particles.emit({
        x: this.x + (this.facing * Math.random() * 100),
        y: this.y - 80 - Math.random() * 60,
        vx: this.facing * (Math.random() * 300 + 150),
        vy: (Math.random() - 0.5) * 120,
        size: Math.random() * 5 + 3,
        color: Math.random() < 0.5 ? '#388E3C' : '#81C784',
        life: 0.5,
        shape: 'slash'
      });
    }

    audio.playHit();

    // Deal damage and knockback via projectile with very large radius
    projectiles.spawn({
      isPlayer: false,
      type: 'vine',
      x: this.x + this.facing * 70,
      y: this.y - 100,
      vx: 0,
      vy: 0,
      width: 130,
      height: 180,
      damage: af.vineCleaveDamage,
      life: 0.25,
      isCleave: true,
      cleaveKnockback: af.vineCleaveKnockback,
      cleaveFacing: this.facing
    });

    particles.emitFloatingText(this.x, this.y - 180, '💥 藤蔓橫掃！', '#FF5722');
  }

  // ══════════════════════════════════════════════════════════════════
  // 9-Way Interlaced Spiral Petals (Phase 1) / 16-Way Crimson Storm (Phase 2)
  // ══════════════════════════════════════════════════════════════════
  firePetalBarrage(player) {
    const pX = this.x;
    const pY = this.y - 120;
    const arenaB = { minX: this.config.arena.startX - 50, maxX: this.config.arena.endX + 50 };

    if (this.phase === 1) {
      // 9-way interlaced spiral petals at 320 px/s
      const baseAngle = Math.atan2(player.y - pY, player.x - pX);
      const count = this.config.phase1.petalCount || 9; // 9 directions
      const spread = (Math.PI * 2) / count; // Even distribution for spiral feel
      // Spiral offset using bob timer
      const spiralOffset = this.bobTimer * 0.5;

      for (let i = 0; i < count; i++) {
        const ang = baseAngle + (i - Math.floor(count / 2)) * 0.22 + spiralOffset * (i % 2 === 0 ? 1 : -1) * 0.08;
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(ang) * 320,
          vy: Math.sin(ang) * 320,
          maxDistance: 680,
          arenaBounds: arenaB,
          width: 24,
          height: 16,
          color: '#E91E63',
          damage: this.config.phase1.petalDamage,
          life: 2.2,
          rotates: true,
          vRot: 3 + i * 0.3
        });
      }
    } else {
      // Phase 2: 16-way 360° crimson petal storm with 0.35s warning flash
      // The warning is handled visually by a brief camera shake and glow
      for (let i = 0; i < 16; i++) {
        const ang = this.bobTimer * 2.5 + i * (Math.PI * 2 / 16);
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(ang) * 360,
          vy: Math.sin(ang) * 360,
          maxDistance: 680,
          arenaBounds: arenaB,
          width: 26,
          height: 18,
          color: '#AD1457',
          damage: this.config.phase2.petalDamage,
          life: 2.4,
          rotates: true,
          vRot: 4
        });
      }
      // Targeted burst needle directly at player (3-way)
      const directAngle = Math.atan2(player.y - pY, player.x - pX);
      for (let j = -1; j <= 1; j++) {
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(directAngle + j * 0.15) * 420,
          vy: Math.sin(directAngle + j * 0.15) * 420,
          maxDistance: 680,
          arenaBounds: arenaB,
          width: 22,
          height: 14,
          color: '#FF1744',
          damage: this.config.phase2.targetedDamage,
          life: 2.0
        });
      }

      // Phase 2 warning glow burst (visual only)
      for (let i = 0; i < 8; i++) {
        particles.emit({
          x: pX + (Math.random() - 0.5) * 60,
          y: pY + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 80,
          vy: (Math.random() - 0.5) * 80,
          size: 5 + Math.random() * 4,
          color: '#FF1744',
          life: 0.35,
          shape: 'circle'
        });
      }
    }
    audio.playTelegraph();
  }

  // ══════════════════════════════════════════════════════════════════
  // Ground Spike Vine Thrust (Phase 1: 3-4 consecutive / Phase 2: triple)
  // ══════════════════════════════════════════════════════════════════
  triggerVineThrust(player) {
    const targetX = Math.max(this.config.arena.startX + 50, Math.min(this.config.arena.endX - 50, player.x));
    const groundY = this.config.arena.groundY;

    if (this.phase === 1) {
      // 0.45s red line warning, then 3-4 consecutive spikes
      const spikeCount = 3 + (Math.random() < 0.4 ? 1 : 0); // 3 or 4 spikes

      // Emit warning red lines for all spikes first
      for (let k = 0; k < spikeCount; k++) {
        const spikeX = targetX + k * 80 * (player.x < this.x ? -1 : 1);
        const clampedX = Math.max(this.config.arena.startX + 40, Math.min(this.config.arena.endX - 40, spikeX));

        // Red warning line particles at ground level
        for (let j = 0; j < 6; j++) {
          particles.emit({
            x: clampedX,
            y: groundY - 5 - j * 8,
            vx: (Math.random() - 0.5) * 20,
            vy: -15,
            size: 3,
            color: '#FF1744',
            life: 0.45,
            shape: 'rect'
          });
        }

        // After 0.45s warning, fire the spike
        setTimeout(() => {
          const cx = Math.max(this.config.arena.startX + 40, Math.min(this.config.arena.endX - 40, spikeX));
          particles.emitDust(cx, groundY, 6, '#2E7D32');
          setTimeout(() => {
            projectiles.spawn({
              isPlayer: false,
              type: 'vine',
              x: cx,
              y: groundY,
              vx: 0,
              vy: -460,
              width: 36,
              height: 80,
              damage: this.config.phase1.vineDamage,
              life: 0.38
            });
            audio.playHit();
            particles.emitDust(cx, groundY, 10, '#388E3C');
          }, 450);
        }, k * 150); // Stagger each spike by 150ms
      }
    } else {
      // Phase 2: triple consecutive vines tracking player's stride
      [-80, 0, 80].forEach((offset, idx) => {
        setTimeout(() => {
          const vx = Math.max(this.config.arena.startX + 40, Math.min(this.config.arena.endX - 40, targetX + offset));
          particles.emitDust(vx, groundY, 6, '#C2185B');
          setTimeout(() => {
            projectiles.spawn({
              isPlayer: false,
              type: 'vine',
              x: vx,
              y: groundY,
              vx: 0,
              vy: -500,
              width: 38,
              height: 85,
              damage: this.config.phase2.vineDamage,
              life: 0.40
            });
            audio.playHit();
            particles.emitDust(vx, groundY, 14, '#880E4F');
          }, 240);
        }, idx * 120);
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Sleep Spore Clouds – Slow purple drift spores (both phases)
  // ══════════════════════════════════════════════════════════════════
  launchSpores(player) {
    const sporeCount = this.phase === 2 ? 3 : 2;
    const arenaB = { minX: this.config.arena.startX, maxX: this.config.arena.endX };

    for (let i = 0; i < sporeCount; i++) {
      // Spore starts from boss body and drifts slowly across arena
      const startX = this.x + (Math.random() * 80 - 40);
      const startY = this.y - 140 - Math.random() * 40;
      const targetX = player.x + (Math.random() * 120 - 60);
      const angle = Math.atan2((player.y - 80) - startY, targetX - startX);
      const speed = 90 + Math.random() * 40; // slow drift

      // Spore is tracked by Boss for collision, not by projectiles system
      this.spores.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 22,
        life: 3.5,
        maxLife: 3.5,
        damage: this.config.phase1.sporeDamage,
        slowDuration: this.config.phase1.sporeSlowDuration,
        hasHit: false,
        pulseTimer: 0
      });

      // Visual spore particle cloud
      particles.emit({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 18,
        color: 'rgba(179, 136, 255, 0.7)',
        life: 3.5,
        shape: 'circle',
        gravity: -5,
        fade: true
      });
    }
    audio.playTelegraph();
  }

  _updateSpores(dt, player) {
    for (let i = this.spores.length - 1; i >= 0; i--) {
      const s = this.spores[i];
      s.life -= dt;
      s.pulseTimer += dt;

      if (s.life <= 0) {
        this.spores.splice(i, 1);
        continue;
      }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy -= 15 * dt; // Gentle float upward over time
      s.vx *= 0.98;    // Slight drag

      // Clamp inside arena
      s.x = Math.max(this.config.arena.startX + 10, Math.min(this.config.arena.endX - 10, s.x));

      // Collision with player
      if (!s.hasHit && player && !player.isDead) {
        const dist = Math.hypot(s.x - player.x, s.y - (player.y - 35));
        if (dist < s.radius + 20) {
          s.hasHit = true;
          player.takeDamage(s.damage);
          // Apply slow effect
          if (player.speed > 0) {
            player._sporeSlowTimer = s.slowDuration;
            player._sporeSlowFactor = 0.45; // 45% speed
          }
          particles.emitHitSparks(s.x, s.y, '#CE93D8', 10);
          particles.emitFloatingText(s.x, s.y - 30, '💤 孢子遲緩！', '#CE93D8');
          this.spores.splice(i, 1);
          continue;
        }
      }

      // Emit trailing purple wisps
      if (Math.random() < 0.3) {
        particles.emit({
          x: s.x + (Math.random() * 12 - 6),
          y: s.y + (Math.random() * 12 - 6),
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          size: 4 + Math.random() * 4,
          color: `rgba(${180 + Math.floor(Math.random()*60)}, ${100 + Math.floor(Math.random()*50)}, 255, 0.6)`,
          life: 0.4,
          shape: 'circle',
          fade: true
        });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2: Venus Flytrap Chomp – lunge forward, bite
  // ══════════════════════════════════════════════════════════════════
  triggerVenusChomper(player) {
    // Telegraph: crimson flash + 0.4s warning
    audio.playBossRoar();
    for (let i = 0; i < 15; i++) {
      particles.emit({
        x: this.x + this.facing * (40 + i * 8),
        y: this.y - 100,
        vx: this.facing * 60,
        vy: (Math.random() - 0.5) * 80,
        size: 6 + Math.random() * 5,
        color: Math.random() < 0.5 ? '#880E4F' : '#FF1744',
        life: 0.5,
        shape: 'petal',
        rotates: true,
        vRot: 5
      });
    }

    setTimeout(() => {
      if (this.isDead) return;
      // Lunge: move rapidly toward player position
      const lungeTargetX = player.x;
      const lerpFactor = 0.7;
      const lungeX = this.x + (lungeTargetX - this.x) * lerpFactor;
      this.x = Math.max(this.config.arena.startX + 200, Math.min(this.config.arena.endX - 150, lungeX));

      // Chomp projectile: wide, short-lived
      projectiles.spawn({
        isPlayer: false,
        type: 'vine',
        x: this.x + this.facing * 80,
        y: this.y - 80,
        vx: this.facing * 200,
        vy: 0,
        width: 70,
        height: 100,
        damage: this.config.phase2.chomperDamage,
        life: 0.3
      });

      particles.emitHitSparks(this.x + this.facing * 80, this.y - 80, '#FF1744', 20);
      audio.playHit();
    }, 400);
  }

  summonMinions() {
    // Count active boss minions
    const activeMinions = this.minions.filter(m => !m.isDead && m.x >= this.config.arena.startX);
    if (activeMinions.length >= 5) return;

    const spawnY = this.config.arena.groundY - 10;
    if (this.phase === 1) {
      // Spawn 1 light/fast monster (red, blue, or pink)
      const types = ['red', 'blue', 'pink'];
      const type = types[Math.floor(Math.random() * types.length)];
      const m = new Monster(type, this.x - 140, spawnY);
      this.minions.push(m);
      particles.emitDust(this.x - 140, spawnY, 10, '#AB47BC');
    } else {
      // Phase 2: Berserk dual summon – Amethyst monster + Flying monster!
      const types = ['ice', 'yellow', 'obsidian', 'pink', 'grape'];
      const t1 = types[Math.floor(Math.random() * types.length)];
      const t2 = 'grape'; // Berserk ranged attacker
      const m1 = new Monster(t1, this.x - 180, spawnY);
      const m2 = new Monster(t2, this.x - 90, spawnY - 50, true);
      this.minions.push(m1, m2);
      particles.emitDust(this.x - 180, spawnY, 14, '#880E4F');
      // Extra burst particles for berserk feel
      for (let i = 0; i < 12; i++) {
        particles.emit({
          x: this.x - 140,
          y: spawnY - 40,
          vx: (Math.random() - 0.5) * 200,
          vy: -Math.random() * 150 - 40,
          size: 5 + Math.random() * 4,
          color: Math.random() < 0.5 ? '#8E24AA' : '#E91E63',
          life: 0.8,
          shape: 'star'
        });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2 EXCLUSIVE: 死神鐮刀 – Abyssal Scythe boomerang (3 projectiles)
  // Fires at angles -0.5, 0, +0.5 from player; curves back after 0.8s
  // ══════════════════════════════════════════════════════════════════
  fireAbyssalScythe(player) {
    const pX = this.x;
    const pY = this.y - 120;
    const baseAngle = Math.atan2(player.y - pY, player.x - pX);
    const offsets = [-0.5, 0, 0.5];
    const speed = 300;

    audio.playBossRoar();
    particles.emitFloatingText(this.x, this.y - 180, '☠ 死神鐮刀！', '#4A148C');

    offsets.forEach((offset, idx) => {
      const ang = baseAngle + offset;
      const proj = projectiles.spawn({
        isPlayer: false,
        type: 'petal',
        x: pX,
        y: pY,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        width: 30,
        height: 30,
        color: '#4A148C',
        damage: this.config.phase2.petalDamage + 4,
        life: 2.5,
        rotates: true,
        vRot: 6,
        isBoomerang: true,
        boomerangReturning: false,
        boomerangTimer: 0.8
      });

      // After 0.8s, reverse velocity to curve back toward player direction
      setTimeout(() => {
        if (!proj || proj.life <= 0) return;
        const returnAngle = Math.atan2(player.y - proj.y, player.x - proj.x);
        proj.vx = Math.cos(returnAngle) * (speed * 0.85);
        proj.vy = Math.sin(returnAngle) * (speed * 0.85);
        proj.boomerangReturning = true;
      }, 800);
    });

    // Visual: deep purple arc burst
    for (let i = 0; i < 18; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 1.2;
      particles.emit({
        x: pX + Math.cos(a) * 30,
        y: pY + Math.sin(a) * 30,
        vx: Math.cos(a) * (180 + Math.random() * 80),
        vy: Math.sin(a) * (180 + Math.random() * 80),
        size: 6 + Math.random() * 4,
        color: Math.random() < 0.5 ? '#4A148C' : '#7B1FA2',
        life: 0.6,
        shape: 'petal',
        rotates: true,
        vRot: 5
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2 EXCLUSIVE: 旋刺龍卷 – Spinning Thorns (12 orbiting projectiles)
  // Orbit at radius 120, angular speed 4.0 rad/s, drift outward, last 2.0s
  // ══════════════════════════════════════════════════════════════════
  triggerSpinningThorns() {
    audio.playBossRoar();
    particles.emitFloatingText(this.x, this.y - 180, '🌀 旋刺龍卷！', '#006064');

    const count = 12;
    for (let i = 0; i < count; i++) {
      const startAngle = (i / count) * Math.PI * 2;
      this.spinningThorns.push({
        angle: startAngle,
        radius: 120,
        angularSpeed: 4.0,      // rad/s orbit speed
        driftSpeed: 28,          // px/s outward drift
        life: 2.0,
        maxLife: 2.0,
        damage: (this.config.phase2.vineDamage || 14),
        hasHit: false,
        pulseTimer: 0,
        size: 14
      });
    }

    // Spawn visual burst
    for (let i = 0; i < count * 2; i++) {
      const a = (i / (count * 2)) * Math.PI * 2;
      particles.emit({
        x: this.x + Math.cos(a) * 60,
        y: (this.y - 80) + Math.sin(a) * 60,
        vx: Math.cos(a) * 140,
        vy: Math.sin(a) * 140,
        size: 5 + Math.random() * 4,
        color: Math.random() < 0.5 ? '#00BCD4' : '#004D40',
        life: 0.5,
        shape: 'petal',
        rotates: true,
        vRot: 8
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Update spinning thorn orbit positions, collision, cleanup
  // ══════════════════════════════════════════════════════════════════
  _updateSpinningThorns(dt, player) {
    for (let i = this.spinningThorns.length - 1; i >= 0; i--) {
      const t = this.spinningThorns[i];
      t.life -= dt;
      t.pulseTimer += dt;

      if (t.life <= 0) {
        this.spinningThorns.splice(i, 1);
        continue;
      }

      // Orbit and outward drift
      t.angle += t.angularSpeed * dt;
      t.radius += t.driftSpeed * dt;

      // World position
      const wx = this.x + Math.cos(t.angle) * t.radius;
      const wy = (this.y - 80) + Math.sin(t.angle) * t.radius;

      // Trail particle
      if (Math.random() < 0.5) {
        particles.emit({
          x: wx,
          y: wy,
          vx: (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 30,
          size: 4 + Math.random() * 3,
          color: Math.random() < 0.5 ? '#00BCD4' : '#4CAF50',
          life: 0.25,
          shape: 'circle',
          fade: true
        });
      }

      // Collision with player
      if (!t.hasHit && player && !player.isDead) {
        const dist = Math.hypot(wx - player.x, wy - (player.y - 35));
        if (dist < t.size + 22) {
          t.hasHit = true;
          player.takeDamage(t.damage);
          particles.emitHitSparks(wx, wy, '#00BCD4', 10);
          particles.emitFloatingText(wx, wy - 30, '🌀 旋刺！', '#00BCD4');
          this.spinningThorns.splice(i, 1);
          continue;
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2 EXCLUSIVE: 暗影瘴氣 – Shadow Miasma (4 large spore zones)
  // radius 45, damage 12/hit, slow 2.0s, random arena positions
  // ══════════════════════════════════════════════════════════════════
  castShadowMiasma(player) {
    const arenaStart = this.config.arena.startX;
    const arenaEnd = this.config.arena.endX;
    const groundY = this.config.arena.groundY;
    const count = 4;

    audio.playTelegraph();
    particles.emitFloatingText(this.x, this.y - 180, '💀 暗影瘴氣！', '#4A148C');

    for (let i = 0; i < count; i++) {
      // Place at semi-random arena positions (avoid boss position)
      const rangeWidth = arenaEnd - arenaStart - 200;
      const spawnX = arenaStart + 100 + Math.random() * rangeWidth;
      const spawnY = groundY - 80 - Math.random() * 60;

      // Add to spores array with enhanced miasma properties
      this.spores.push({
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * 30,  // Very slow drift
        vy: -8 - Math.random() * 12,      // Slight upward float
        radius: 45,                         // Much larger than normal (22)
        life: 4.5,
        maxLife: 4.5,
        damage: 12,
        slowDuration: 2.0,
        hasHit: false,
        pulseTimer: 0,
        isMiasma: true                      // Flag for different render color
      });

      // Spawn visual cloud burst at location
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * Math.PI * 2;
        particles.emit({
          x: spawnX + Math.cos(a) * 20,
          y: spawnY + Math.sin(a) * 20,
          vx: Math.cos(a) * (40 + Math.random() * 40),
          vy: Math.sin(a) * (40 + Math.random() * 40) - 20,
          size: 10 + Math.random() * 8,
          color: Math.random() < 0.5 ? 'rgba(74, 20, 140, 0.7)' : 'rgba(30, 0, 60, 0.8)',
          life: 0.8,
          shape: 'circle',
          fade: true
        });
      }
    }
  }

  render(ctx) {
    // Render spore clouds (includes Shadow Miasma zones)
    this._renderSpores(ctx);

    // Render spinning thorns
    this._renderSpinningThorns(ctx);

    // Render ground spike warnings
    this._renderGroundSpikeWarnings(ctx);

    if (this.isDead && (!this.deathSequenceTimer || this.deathSequenceTimer <= 0)) return;

    // ── Entrance Y offset: boss rises from below ──────────────────────
    const entranceOffset = this._entranceYOffset || 0;

    ctx.save();
    ctx.translate(this.x, this.y + entranceOffset);
    ctx.scale(this.facing, 1);

    if (this.isDead) {
      ctx.globalAlpha = Math.max(0, this.deathSequenceTimer / 2.2);
      ctx.filter = 'brightness(2.2) drop-shadow(0 0 24px #FFD700)';
    } else if (this.hitTimer > 0) {
      ctx.filter = 'brightness(1.9) drop-shadow(0 0 16px #E91E63)';
    } else if (this.isVineCleaving) {
      ctx.filter = 'brightness(1.5) drop-shadow(0 0 20px #4CAF50)';
    }

    // Arena shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 90, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Phase 2 Transform: pulsing crimson outer ring ─────────────────
    if (this.phase2TransformTimer > 0) {
      const ringTime = this.bobTimer * 6;
      const ringRadius = 130 + Math.sin(ringTime) * 20;
      ctx.save();
      ctx.globalAlpha = Math.min(1.0, (this.phase2TransformTimer / 2.5) * 1.2);
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#FF1744';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, -110, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      // Second inner ring pulsing opposite phase
      ctx.strokeStyle = '#880E4F';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -110, 110 + Math.sin(ringTime + Math.PI) * 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ── Boss Image (with transform scale anim) ────────────────────────
    const activeImg = (this.phase === 2 && this.imgPhase2.complete && this.imgPhase2.naturalWidth > 0)
      ? this.imgPhase2
      : this.imgPhase1;

    // Compute transform scale: sinusoidal 0.5→1.3→1.0 over phase2TransformTimer
    let transformScale = 1.0;
    if (this.phase2TransformTimer > 0) {
      // phase2ScaleAnim goes 0→1 as timer counts down 2.5→0
      const t = this.phase2ScaleAnim; // 0=start, 1=end
      // Sinusoidal: starts at 0.5, peaks at 1.3 around t=0.5, settles at 1.0
      transformScale = 0.5 + Math.sin(t * Math.PI) * 0.8 + (1.0 - Math.sin(t * Math.PI) * 0.5) * t * 0.5;
      transformScale = Math.max(0.5, Math.min(1.35, transformScale));
      // Additional high-frequency shimmer
      transformScale += Math.sin(this.bobTimer * 6) * 0.15;
    }

    if (activeImg.complete && activeImg.naturalWidth > 0) {
      const dw = this.width * transformScale;
      const dh = this.height * transformScale;
      ctx.drawImage(activeImg, -dw / 2, -dh, dw, dh);
    } else {
      // Fallback
      ctx.save();
      ctx.scale(transformScale, transformScale);
      ctx.fillStyle = this.phase === 2 ? '#880E4F' : '#E91E63';
      ctx.beginPath();
      ctx.arc(0, -110, 85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Phase 2 Core Luminous Glow
    if (this.phase === 2) {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.45)';
      ctx.beginPath();
      ctx.arc(0, -120, 35 + Math.sin(this.bobTimer * 2) * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Anti-facetank warning indicator: pulse red aura when player is in danger zone
    if (this.facetankTimer > 0.5 && this.vineCleaveCooldown <= 0) {
      const warnAlpha = Math.min(0.7, (this.facetankTimer / 1.2) * 0.7);
      ctx.fillStyle = `rgba(255, 23, 68, ${warnAlpha})`;
      ctx.beginPath();
      ctx.arc(0, -110, 100 + Math.sin(this.bobTimer * 8) * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  _renderSpores(ctx) {
    for (const s of this.spores) {
      const alpha = (s.life / s.maxLife) * 0.75;
      const pulse = 1 + Math.sin(s.pulseTimer * 4) * 0.15;
      ctx.save();
      ctx.globalAlpha = alpha;

      if (s.isMiasma) {
        // Shadow Miasma: dark purple-black large zone
        ctx.fillStyle = 'rgba(30, 0, 60, 0.55)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(74, 20, 140, 0.9)';
        ctx.lineWidth = 4;
        ctx.stroke();
        // Inner core
        ctx.fillStyle = 'rgba(74, 20, 140, 0.4)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // Outer haze ring
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = 'rgba(100, 0, 200, 0.3)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * pulse * 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Normal sleep spore
        ctx.fillStyle = 'rgba(149, 96, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 150, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Inner glow
        ctx.fillStyle = 'rgba(220, 180, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * pulse * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ── Render orbiting spinning thorn positions ──────────────────────────
  _renderSpinningThorns(ctx) {
    for (const t of this.spinningThorns) {
      const wx = this.x + Math.cos(t.angle) * t.radius;
      const wy = (this.y - 80) + Math.sin(t.angle) * t.radius;
      const alpha = (t.life / t.maxLife) * 0.9;
      const pulse = 1 + Math.sin(t.pulseTimer * 8) * 0.2;

      ctx.save();
      ctx.globalAlpha = alpha;
      // Thorn spike: teal circle with dark green outline
      ctx.fillStyle = '#00BCD4';
      ctx.shadowColor = '#00BCD4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(wx, wy, t.size * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#004D40';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  _renderGroundSpikeWarnings(ctx) {
    for (const w of this.groundSpikeWarnings) {
      const flash = Math.sin(w.timer * 40) > 0;
      if (flash) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 23, 68, 0.5)';
        ctx.fillRect(w.x - 10, w.y - 40, 20, 40);
        ctx.restore();
      }
    }
  }
}
