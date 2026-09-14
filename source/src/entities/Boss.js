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

function baseAngleOffset(i, count, baseAngle, spiralOffset) {
  return baseAngle + (i - Math.floor(count / 2)) * 0.22 + spiralOffset * (i % 2 === 0 ? 1 : -1) * 0.08;
}

function normalizeAngle(ang) {
  return (ang + Math.PI * 3) % (Math.PI * 2) - Math.PI;
}

export class Boss {
  constructor() {
    this.config = BOSS_CONFIG;
    this.x = 15650; // Arena right side (14800 ~ 16500)
    this.y = this.config.arena.groundY;
    this.width = this.config.width;
    this.height = this.config.height;

    this.hp = this.config.phase1Hp || 3600;
    this.maxHp = this.config.phase1Hp || 3600;
    this.phase = 1; // 1 or 2
    this.phase2Triggered = false;

    // v9.5: True Two-Phase State
    this.isTransforming = false;
    this.transformTimer = 0;
    this.resonanceEnraged = false; // 60 coins buff only, does NOT skip P1!
    this.isRaging = false;         // Phase 2 <30% HP rage state
    this.multiHitGate = new Map(); // 100ms multi-hit throttle per attackInstanceId

    this.vx = 0;
    this.facing = -1;
    this.bobTimer = 0;

    // AI & Attack Timers
    this.attackTimer = 1.5;
    this.summonTimer = 7.0;
    this.vineTimer = 3.0;
    this.sporeTimer = 5.0;
    this.bubbleTimer = 2.6;
    this.vineWhipTimer = 2.8;
    this.patternStep = 0;
    this.patternTimer = 1.0;    // Sleep spore clouds
    this.chomperTimer = 8.0;  // Phase 2 Venus Flytrap chomp

    // Anti-Facetank tracking
    this.facetankTimer = 0;   // How long player has been in close range
    this.vineCleaveCooldown = 0; // Cooldown after cleave so it doesn't spam

    // Vine Cleave state
    this.isVineCleaving = false;
    this.vineCleaveTimer = 0;

    // Boss Lunge / Dash state
    this.isLunging = false;
    this.lungeTimer = 0;
    this.lungeVx = 0;

    // Spore & Tracking Pollen projectiles in world
    this.spores = [];
    this.trackingPollen = [];

    // Active dt-driven telegraph queue
    this.activeTelegraphs = [];
    this.activeBoomerangs = [];
    this.activeSpikeQueue = [];

    // Ground spike telegraph markers
    this.groundSpikeWarnings = [];

    // State
    this.isDead = false;
    this.hitTimer = 0;
    this.roarTimer = 0;
    this.deathSequenceTimer = 0;

    // ── Entrance Animation ────────────────────────────────────────────
    this.entranceTimer = 0;         // Counts down from 2.0 while boss rises
    this.entranceDone = false;      // Set true once rise is complete
    this.entranceTriggered = false; // Set true the first time player reaches x>=14700

    // ── Phase 2 Transform Animation ───────────────────────────────────
    this.phase2TransformTimer = 0;  // Counts down from 2.8 during transform freeze
    this.phase2ScaleAnim = 0.0;     // Normalised 0→1 progress for easing

    // ── Phase 2 Exclusive Attacks ─────────────────────────────────────
    this.spinningThorns = [];       // Orbiting thorn projectile data array
    this.scytheTimer = 4.5;         // 死神鐮刀 cooldown
    this.thornTimer = 6.0;          // 旋刺龍卷 cooldown
    this.miasmaTimer = 5.5;         // 暗影瘴氣 cooldown
    this.phase2AttackSequence = 0;  // 0=petal,1=scythe,2=thorns,3=miasma,4=chomp (mod 5)

    // Assets
    this.imgPhase1 = new Image();
    this.imgPhase1.src = 'assets/boss_flower_phase1_v9_7_4.png';
    this.imgPhase2 = new Image();
    this.imgPhase2.src = 'assets/boss_flower_phase2_v9_7_7.png';

    // Minions array passed from level
    this.minions = [];
  }

  takeDamage(amount, attackInstanceId = null) {
    // 100% Invulnerable during transform, entrance, or when dead
    if (this.isDead || this.isTransforming || (this.entranceTriggered && this.entranceTimer > 0)) {
      return false;
    }

    // v9.5 Multi-hit gate: same attackInstanceId hits Boss at most once per 100ms
    if (attackInstanceId) {
      const now = performance.now ? performance.now() : Date.now();
      const lastHit = this.multiHitGate.get(attackInstanceId) || 0;
      if (now - lastHit < 100) {
        return false;
      }
      this.multiHitGate.set(attackInstanceId, now);
      if (this.multiHitGate.size > 80) {
        for (const [id, t] of this.multiHitGate.entries()) {
          if (now - t > 1000) this.multiHitGate.delete(id);
        }
      }
    }

    this.hp -= amount;
    this.hitTimer = 0.12;
    audio.playHit();
    particles.emitHitSparks(this.x, this.y - 120, '#E91E63', 8);

    // Phase 1 HP reaches <= 0 -> Trigger 2.8s Transform! (NO overkill leak!)
    if (this.phase === 1 && this.hp <= 0) {
      this.hp = 0;
      this.startTransform();
      return true;
    }

    // Phase 2 HP reaches <= 0 -> Real Boss Death!
    if (this.phase === 2 && this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.deathSequenceTimer = 2.2;
      audio.playBossRoar();
      if (audio.fadeToVictory) {
        audio.fadeToVictory(0.6);
      } else {
        audio.playBgm('victory_theme');
      }

      // Massive celebration explosion
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
    return true;
  }

  startTransform() {
    if (this.isTransforming) return;
    this.isTransforming = true;
    this.transformTimer = this.config.transformDuration || 2.8;
    this.roarTimer = this.transformTimer;
    this.phase2TransformTimer = this.transformTimer;
    this.phase2ScaleAnim = 0.0;

    // Clear all projectiles, spores, active telegraphs, and tracking pollen
    projectiles.clear();
    this.spores = [];
    this.trackingPollen = [];
    this.spinningThorns = [];
    this.activeTelegraphs = [];

    audio.playBossRoar();
    // In Phase 2: audio.setBossIntensity(2) on same boss_theme track!
    if (audio.setBossIntensity) {
      audio.setBossIntensity(2);
    }

    // Expanding ring of 100 crimson petals
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * Math.PI * 2;
      const isOuter = i >= 50;
      const speed = isOuter ? (120 + Math.random() * 80) : (280 + Math.random() * 120);
      particles.emit({
        x: this.x + Math.cos(angle) * (isOuter ? 30 : 10),
        y: (this.y - 120) + Math.sin(angle) * (isOuter ? 30 : 10),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: isOuter ? (Math.random() * 5 + 3) : (Math.random() * 8 + 5),
        color: isOuter ? '#B71C1C' : '#FF1744',
        life: 2.5 + Math.random() * 0.5,
        shape: 'petal',
        rotates: true,
        vRot: 4 + Math.random() * 3
      });
    }

    // Flashing light burst
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      particles.emit({
        x: this.x + Math.cos(a) * 60,
        y: (this.y - 120) + Math.sin(a) * 60,
        vx: Math.cos(a) * 50,
        vy: Math.sin(a) * 50,
        size: 20 + Math.random() * 10,
        color: '#FF80AB',
        life: 0.8,
        shape: 'circle',
        fade: true
      });
    }

    particles.emitFloatingText(this.x, this.y - 220, '🌹 PHASE 2：夢境狂暴盛開！', '#FF1744');
  }

  triggerPhase2() {
    // Legacy method alias
    this.startTransform();
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

    projectiles.setSourceContext({
      sourceMonster: 'boss_flower',
      attackPhase: this.phase,
      attackType: 'boss',
      telegraphShown: true
    });
    try {
    // v9.5: 60 金幣不再跳過 Phase 1，只提供共振強化難度 (Commuter Resonance Buff)
    if (player && player.coins >= (this.config.coinsEnrageThreshold || 60) && !this.resonanceEnraged) {
      this.resonanceEnraged = true;
      particles.emitFloatingText(this.x, this.y - 240, '⚡ 共振強化：難度激化！', '#FFD700');
    }

    this.bobTimer += dt * (this.phase === 2 ? 3.5 : 2.0);
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.roarTimer > 0 && !this.isTransforming) {
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
        projectiles.clear();
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
        const smooth = progress * progress * (3 - 2 * progress);
        this._entranceYOffset = (1.0 - smooth) * 300;
        return; // Freeze AI during entrance
      } else if (this.entranceTriggered) {
        this.entranceDone = true;
        this._entranceYOffset = 0;
      }
    }

    // ═══════════════════════════════════════════════════════
    // Phase 2 Transform Animation & 100% Invulnerability
    // ═══════════════════════════════════════════════════════
    if (this.isTransforming) {
      this.transformTimer -= dt;
      this.phase2TransformTimer = this.transformTimer;
      camera.shake(14, 0.1);
      const p = 1.0 - Math.max(0, this.transformTimer) / (this.config.transformDuration || 2.8);
      this.phase2ScaleAnim = p;

      // Crimson swirl particles during transform
      if (Math.random() < 0.6) {
        particles.emit({
          x: this.x + (Math.random() - 0.5) * 160,
          y: this.y - 80 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 100,
          vy: -80 - Math.random() * 100,
          size: Math.random() * 8 + 4,
          color: Math.random() < 0.5 ? '#FF1744' : '#880E4F',
          life: 0.8,
          shape: 'petal',
          rotates: true
        });
      }

      if (this.transformTimer <= 0) {
        this.isTransforming = false;
        this.phase = 2;
        this.phase2Triggered = true;
        this.hp = this.config.phase2Hp || 5200;
        this.maxHp = this.config.phase2Hp || 5200;
        this.roarTimer = 0;
        this.attackTimer = 1.2;
        particles.emitFloatingText(this.x, this.y - 240, '⚡ 狂暴盛開態！HP 5200', '#FF1744');
      }
      return; // 100% frozen during transform!
    }

    // Update active dt-driven telegraph queue
    for (let i = this.activeTelegraphs.length - 1; i >= 0; i--) {
      const tg = this.activeTelegraphs[i];
      tg.timer -= dt;
      if (tg.timer <= 0) {
        if (typeof tg.onExecute === 'function') {
          tg.onExecute();
        }
        this.activeTelegraphs.splice(i, 1);
      }
    }

    // Update active boomerangs (Abyssal Scythe return)
    for (let i = this.activeBoomerangs.length - 1; i >= 0; i--) {
      const b = this.activeBoomerangs[i];
      b.timer -= dt;
      if (b.timer <= 0 && !b.returning) {
        b.returning = true;
        if (b.proj && b.proj.life > 0) {
          const retAngle = Math.atan2(player.y - b.proj.y, player.x - b.proj.x);
          b.proj.vx = Math.cos(retAngle) * b.speed;
          b.proj.vy = Math.sin(retAngle) * b.speed;
        }
        this.activeBoomerangs.splice(i, 1);
      }
    }

    // Update active spike queue (Vine Thrust)
    for (let i = this.activeSpikeQueue.length - 1; i >= 0; i--) {
      const sq = this.activeSpikeQueue[i];
      sq.delay -= dt;
      if (sq.delay <= 0) {
        projectiles.spawn({
          isPlayer: false,
          type: 'vine',
          x: sq.x,
          y: sq.y,
          vx: 0,
          vy: -480,
          width: 36,
          height: 80,
          damage: sq.damage,
          life: 0.38
        });
        audio.playHit();
        particles.emitDust(sq.x, sq.y, 8, '#388E3C');
        this.activeSpikeQueue.splice(i, 1);
      }
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

    // Repositioning or Lunging
    if (this.isLunging) {
      this.lungeTimer -= dt;
      this.x += this.lungeVx * dt;
      const minX = this.config.arena.startX + 200;
      const maxX = this.config.arena.endX - 150;
      this.x = Math.max(minX, Math.min(maxX, this.x));
      if (player && !player.isDead) {
        const dx = Math.abs(this.x - player.x);
        const dy = Math.abs((this.y - 60) - player.y);
        if (dx < 90 && dy < 95) {
          player.takeDamage(26);
          if (typeof player.knockback === 'function') {
            player.knockback(this.facing * 240);
          } else {
            player.vx = this.facing * 240;
          }
          particles.emitHitSparks(player.x, player.y - 30, '#FF1744', 12);
        }
      }
      if (this.lungeTimer <= 0) {
        this.isLunging = false;
      }
    } else {
      // Slow repositioning towards player
      const arenaMid = (this.config.arena.startX + this.config.arena.endX) / 2;
      const desiredX = player.x + (player.x < arenaMid ? 360 : -360);
      this.x += (desiredX - this.x) * dt * (this.phase === 2 ? 0.8 : 0.4);
    }

    // Anti-Facetank
    const distToPlayer = Math.abs(player.x - this.x);
    const af = this.config.antiFacetank;
    if (distToPlayer < af.distThreshold && this.vineCleaveCooldown <= 0) {
      this.facetankTimer += dt;
      if (this.facetankTimer >= af.standingDuration) {
        this._triggerVineCleave(player, af);
        this.facetankTimer = 0;
        this.vineCleaveCooldown = 3.0;
      }
    } else {
      this.facetankTimer = Math.max(0, this.facetankTimer - dt * 1.5);
    }

    // AI Attack Loop
    const currentConfig = this.phase === 2 ? this.config.phase2 : this.config.phase1;
    const p1CooldownMult = this.resonanceEnraged ? 0.90 : 1.0;
    const p2CooldownMult = this.resonanceEnraged ? 0.85 : 1.0;

    this.attackTimer -= dt;
    this.vineTimer -= dt;
    this.summonTimer -= dt;
    this.sporeTimer -= dt;

    this.patternTimer -= dt;
    if (this.patternTimer <= 0) {
      const phase2 = this.phase === 2;
      const step = this.patternStep % (phase2 ? 5 : 4);
      if (!phase2) {
        if (step === 0 || step === 2) this.firePetalBarrage(player);
        else if (step === 1) this.launchDreamBubbles(player);
        else this.queueVineWhip(player);
        this.patternTimer = 1.15;
      } else {
        if (step === 0) this.firePetalBarrage(player);
        else if (step === 1) this.launchDreamBubbles(player);
        else if (step === 2) this.queueVineWhip(player);
        else if (step === 3) this.fireCrossfire(player);
        else { this.activeTelegraphs.push({ type: 'bloom_burst', x: this.x, y: this.y - 120, angle: Math.atan2(player.y - (this.y - 120), player.x - this.x), timer: 0.55, maxTimer: 0.55, onExecute: () => this.triggerBloomBurst(player) }); audio.playTelegraph(); }
        this.patternTimer = 0.56;
      }
      this.patternStep++;
    }
    // v9.8.1 pattern scheduler owns Boss hazards; legacy independent timers stay inert.
    this.attackTimer = 9999;
    this.vineTimer = 9999;
    this.sporeTimer = 9999;

    if (this.phase === 1) {
      // Phase 1 attack rotation
      if (this.attackTimer <= 0) {
        this.attackTimer = currentConfig.attackCooldown * p1CooldownMult;
        this.firePetalBarrage(player);
      }
      if (this.vineTimer <= 0) {
        this.vineTimer = 4.5 * p1CooldownMult;
        this.triggerVineThrust(player);
      }
      if (this.summonTimer <= 0) {
        this.summonTimer = currentConfig.summonCooldown * p1CooldownMult;
        this.summonMinions();
      }
      if (this.sporeTimer <= 0) {
        this.sporeTimer = 6.5 * p1CooldownMult;
        this.launchSpores(player);
      }
    } else {
      // Phase 2 sequenced attack rotation (mod 6)
      this.scytheTimer -= dt;
      this.thornTimer -= dt;
      this.miasmaTimer -= dt;
      this.chomperTimer -= dt;

      const rageMult = (this.hp <= this.maxHp * 0.3) ? 0.75 : 1.0;
      this.isRaging = (this.hp <= this.maxHp * 0.3);

      if (this.attackTimer <= 0) {
        const seq = this.phase2AttackSequence % 6;
        this.phase2AttackSequence++;

        switch (seq) {
          case 0: // Radial Bloom (16-way crimson storm with safe cone + 2 targeted needles)
            this.attackTimer = (currentConfig.attackCooldown || 0.85) * p2CooldownMult * rageMult;
            this.firePetalBarrage(player);
            break;
          case 1: // Boss Lunge / Dash (0.45s telegraph)
            this.attackTimer = 3.6 * p2CooldownMult * rageMult;
            this.queueBossLunge(player);
            break;
          case 2: // Ground Roots / Vine Thrust
            this.attackTimer = 3.2 * p2CooldownMult * rageMult;
            this.triggerVineThrust(player);
            break;
          case 3: // Tracking Pollen
            this.attackTimer = 3.8 * p2CooldownMult * rageMult;
            this.launchTrackingPollen(player);
            break;
          case 4: // 死神鐮刀 (0.45s telegraph)
            this.attackTimer = 4.2 * p2CooldownMult * rageMult;
            this.scytheTimer = 4.2;
            this.queueAbyssalScythe(player);
            break;
          case 5: // 捕蠅草巨顎 / 旋刺龍卷 / 暗影瘴氣
            this.attackTimer = 4.4 * p2CooldownMult * rageMult;
            const r = Math.random();
            if (r < 0.35) {
              this.queueVenusChomper(player);
            } else if (r < 0.70) {
              this.queueSpinningThorns();
            } else {
              this.queueShadowMiasma(player);
            }
            break;
        }
      }

      // Vine Ground Thrust (triple, Phase 2)
      if (this.vineTimer <= 0) {
        this.vineTimer = 3.2 * p2CooldownMult * rageMult;
        this.triggerVineThrust(player);
      }

      // Monster Minion Summoning
      if (this.summonTimer <= 0) {
        this.summonTimer = currentConfig.summonCooldown * p2CooldownMult;
        this.summonMinions();
      }

      // Sleep Spore Clouds (faster in Phase 2)
      if (this.sporeTimer <= 0) {
        this.sporeTimer = 4.0 * p2CooldownMult * rageMult;
        this.launchSpores(player);
      }
    }

    this._updateSpores(dt, player);
    this._updateSpinningThorns(dt, player);
    this._updateTrackingPollen(dt, player);
    } finally {
      projectiles.clearSourceContext();
    }
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
  // ══════════════════════════════════════════════════════════════════
  // 9-Way Spiral Petals (Phase 1) / 16-Way Crimson Storm (Phase 2)
  // v9.5: Guaranteed safe cone angle allowing skilled dodge
  // ══════════════════════════════════════════════════════════════════
  firePetalBarrage(player) {
    const pX = this.x;
    const pY = this.y - 120;
    const arenaB = { minX: this.config.arena.startX - 50, maxX: this.config.arena.endX + 50 };
    const directAngle = Math.atan2(player.y - pY, player.x - pX);

    if (this.phase === 1) {
      // 9-way interlaced spiral petals at 320 px/s with safe angle gap
      const count = this.config.phase1.petalCount || 9;
      const spiralOffset = this.bobTimer * 0.5;
      const speed = (this.config.phase1.petalSpeed || 345) * (this.resonanceEnraged ? 1.08 : 1.0);

      for (let i = 0; i < count; i++) {
        const ang = baseAngleOffset(i, count, directAngle, spiralOffset);
        // Leave a 24° safe window right next to player dodge trajectory
        if (Math.abs(normalizeAngle(ang - directAngle)) < 0.22) continue;

        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
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
      // Phase 2: 16-way 360° crimson petal storm with 35° safe cone
      const speed = (this.config.phase2.petalSpeed || 405) * (this.resonanceEnraged ? 1.10 : 1.0);
      const safeHalfAngle = 0.32; // ~36 degree safe cone
      const dmg = (this.config.phase2.petalDamage || 20) * (this.resonanceEnraged ? 1.10 : 1.0);

      for (let i = 0; i < (this.config.phase2.petalCount || 18); i++) {
        const ang = this.bobTimer * 2.5 + i * (Math.PI * 2 / (this.config.phase2.petalCount || 18));
        if (Math.abs(normalizeAngle(ang - directAngle)) < safeHalfAngle) continue;

        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          maxDistance: 680,
          arenaBounds: arenaB,
          width: 26,
          height: 18,
          color: '#AD1457',
          damage: dmg,
          life: 2.4,
          rotates: true,
          vRot: 4
        });
      }

      // 2 targeted needles with slight offset (not directly on center, allowing sidestep)
      [-0.18, 0.18].forEach(off => {
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(directAngle + off) * (speed + 40),
          vy: Math.sin(directAngle + off) * (speed + 40),
          maxDistance: 680,
          arenaBounds: arenaB,
          width: 22,
          height: 14,
          color: '#FF1744',
          damage: (this.config.phase2.targetedDamage || 26) * (this.resonanceEnraged ? 1.10 : 1.0),
          life: 2.0
        });
      });
    }
    audio.playTelegraph();
  }

  // ══════════════════════════════════════════════════════════════════
  // Ground Spike Vine Thrust (Phase 1: 3-4 consecutive / Phase 2: triple)
  // dt-driven spike queue with visual warning
  // ══════════════════════════════════════════════════════════════════
  triggerVineThrust(player) {
    const targetX = Math.max(this.config.arena.startX + 60, Math.min(this.config.arena.endX - 60, player.x));
    const groundY = this.config.arena.groundY;
    const spikeCount = this.phase === 1 ? (3 + (Math.random() < 0.4 ? 1 : 0)) : 3;
    const dmg = (this.phase === 1 ? this.config.phase1.vineDamage : this.config.phase2.vineDamage) * (this.resonanceEnraged ? 1.10 : 1.0);

    for (let k = 0; k < spikeCount; k++) {
      const offset = this.phase === 1 ? (k * 80 * (player.x < this.x ? -1 : 1)) : ((k - 1) * 80);
      const spikeX = Math.max(this.config.arena.startX + 50, Math.min(this.config.arena.endX - 50, targetX + offset));
      const delay = 0.45 + k * (this.phase === 1 ? 0.15 : 0.12);

      // Warning particles at ground level
      for (let j = 0; j < 5; j++) {
        particles.emit({
          x: spikeX,
          y: groundY - 5 - j * 8,
          vx: (Math.random() - 0.5) * 15,
          vy: -15,
          size: 3,
          color: '#FF1744',
          life: delay,
          shape: 'rect'
        });
      }

      this.activeSpikeQueue.push({
        x: spikeX,
        y: groundY,
        delay,
        damage: dmg
      });
    }
    audio.playTelegraph();
  }

  // ══════════════════════════════════════════════════════════════════
  // Sleep Spore Clouds (both phases)
  // ══════════════════════════════════════════════════════════════════
  launchDreamBubbles(player) {
    const phase2 = this.phase === 2;
    const count = phase2 ? 8 : 5;
    const speed = phase2 ? 145 : 115;
    const damage = phase2 ? 20 : 12;
    const arenaB = { minX: this.config.arena.startX - 60, maxX: this.config.arena.endX + 60 };
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (i - (count - 1) * 0.5) * 0.22;
      projectiles.spawn({ isPlayer: false, type: 'dream_bubble', x: this.x + Math.cos(angle) * 42, y: this.y - 300 + (i % 4) * 22, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.35, width: phase2 && i < 2 ? 48 : 38, height: phase2 && i < 2 ? 48 : 38, damage, life: phase2 ? 2.8 : 3.0, burstTimer: phase2 && i < 2 ? 1.4 : null, wobble: 1.0, large: phase2 && i < 2, arenaBounds: arenaB, telegraphShown: true, sourceMonster: 'boss_flower', attackPhase: this.phase, attackType: phase2 ? 'bubble_bloom' : 'dream_bubble' });
    }
    audio.playTelegraph();
  }

  queueVineWhip(player) {
    const phase2 = this.phase === 2;
    const count = phase2 ? 3 : 2;
    const damage = phase2 ? 42 : 20;
    const telegraph = phase2 ? 0.33 : 0.45;
    this.activeTelegraphs.push({ type: 'vine_whip', x: this.x + this.facing * 90, y: this.y - 28, dir: this.facing, count, timer: telegraph, maxTimer: telegraph, onExecute: () => {
      for (let i = 0; i < count; i++) {
        const y = this.y - 28 - (phase2 ? [0, 88, 46][i] : i * 72);
        projectiles.spawn({ isPlayer: false, type: 'vine', x: this.x + this.facing * 90, y, vx: this.facing * 260, vy: 0, width: 115, height: 34, damage, life: 0.55, telegraphShown: true, sourceMonster: 'boss_flower', attackPhase: this.phase, attackType: 'vine_whip' });
      }
      audio.playBossRoar();
    }});
    audio.playTelegraph();
  }

  fireCrossfire(player) {
    this.launchDreamBubbles(player);
    this.activeTelegraphs.push({ type: 'crossfire', x: this.x, y: this.y - 120, angle: Math.atan2(player.y - (this.y - 120), player.x - this.x), timer: 0.35, maxTimer: 0.35, onExecute: () => this.firePetalBarrage(player) });
  }

  triggerBloomBurst(player) {
    const directAngle = Math.atan2(player.y - (this.y - 120), player.x - this.x);
    const safeHalfAngle = 0.32;
    for (let i = 0; i < 24; i++) {
      const angle = i * Math.PI * 2 / 24;
      if (Math.abs(normalizeAngle(angle - directAngle)) < safeHalfAngle || Math.abs(normalizeAngle(angle - directAngle - Math.PI)) < safeHalfAngle) continue;
      projectiles.spawn({ isPlayer: false, type: 'petal', x: this.x, y: this.y - 120, vx: Math.cos(angle) * 400, vy: Math.sin(angle) * 400, width: 26, height: 18, damage: 34, life: 2.0, armedAfter: 0.12, rotates: true, vRot: 5, telegraphShown: true, sourceMonster: 'boss_flower', attackPhase: 2, attackType: 'bloom_burst' });
    }
    audio.playBossRoar();
  }

  launchSpores(player) {
    const sporeCount = this.phase === 2 ? 3 : 2;
    for (let i = 0; i < sporeCount; i++) {
      const startX = this.x + (Math.random() * 80 - 40);
      const startY = this.y - 140 - Math.random() * 40;
      const targetX = player.x + (Math.random() * 120 - 60);
      const angle = Math.atan2((player.y - 80) - startY, targetX - startX);
      const speed = 90 + Math.random() * 40;

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

  // ══════════════════════════════════════════════════════════════════
  // Phase 2: Venus Flytrap Chomp (0.45s red wedge telegraph)
  // ══════════════════════════════════════════════════════════════════
  queueVenusChomper(player) {
    audio.playBossRoar();
    const tx = Math.max(this.config.arena.startX + 200, Math.min(this.config.arena.endX - 200, player.x));
    this.activeTelegraphs.push({
      type: 'chomp',
      timer: 0.45,
      maxTimer: 0.45,
      x: tx,
      y: this.config.arena.groundY,
      onExecute: () => {
        this.executeVenusChomper(tx, player);
      }
    });
  }

  executeVenusChomper(targetX, player) {
    if (this.isDead || this.isTransforming) return;
    const lungeX = this.x + (targetX - this.x) * 0.7;
    this.x = Math.max(this.config.arena.startX + 200, Math.min(this.config.arena.endX - 150, lungeX));
    const dmg = (this.config.phase2.chomperDamage || 22) * (this.resonanceEnraged ? 1.10 : 1.0);

    projectiles.spawn({
      isPlayer: false,
      type: 'vine',
      x: this.x + this.facing * 80,
      y: this.y - 80,
      vx: this.facing * 220,
      vy: 0,
      width: 75,
      height: 105,
      damage: dmg,
      life: 0.32
    });
    particles.emitHitSparks(this.x + this.facing * 80, this.y - 80, '#FF1744', 20);
    audio.playHit();
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2: Boss Lunge / Dash (0.45s telegraph, fast ground charge)
  // ══════════════════════════════════════════════════════════════════
  queueBossLunge(player) {
    audio.playTelegraph();
    const lungeDir = player.x < this.x ? -1 : 1;
    this.facing = lungeDir;
    this.activeTelegraphs.push({
      type: 'lunge',
      timer: 0.45,
      maxTimer: 0.45,
      startX: this.x,
      targetX: this.x + lungeDir * 380,
      y: this.y,
      dir: lungeDir,
      onExecute: () => {
        this.executeBossLunge(lungeDir);
      }
    });
  }

  executeBossLunge(dir) {
    if (this.isDead || this.isTransforming) return;
    audio.playBossRoar();
    this.isLunging = true;
    this.lungeTimer = 0.40;
    this.lungeVx = dir * 550;
    particles.emitFloatingText(this.x, this.y - 180, '⚡ 狂暴突進！', '#FF1744');
    for (let i = 0; i < 15; i++) {
      particles.emitDust(this.x - dir * 40, this.y - 10, 8, '#B71C1C');
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2: Tracking Pollen (homing golden pollen projectiles)
  // ══════════════════════════════════════════════════════════════════
  launchTrackingPollen(player) {
    audio.playTelegraph();
    particles.emitFloatingText(this.x, this.y - 180, '✨ 追蹤花粉！', '#FFD700');
    const count = 3;
    for (let i = 0; i < count; i++) {
      const baseAngle = (player.x < this.x ? Math.PI : 0) + (i - 1) * 0.45;
      this.trackingPollen.push({
        x: this.x + (player.x < this.x ? -50 : 50),
        y: this.y - 120 + (i - 1) * 25,
        angle: baseAngle,
        speed: 160 * (this.resonanceEnraged ? 1.10 : 1.0),
        life: 3.5,
        maxLife: 3.5,
        damage: (this.config.phase2.sporeDamage || 18) * (this.resonanceEnraged ? 1.10 : 1.0),
        hasHit: false,
        pulseTimer: 0
      });
    }
  }

  summonMinions() {
    const activeMinions = this.minions.filter(m => !m.isDead && m.x >= this.config.arena.startX);
    if (activeMinions.length >= 2) return; // Prevent overcrowding (Section 29: 召喚少量一般怪獸)

    const spawnY = this.config.arena.groundY - 10;
    if (this.phase === 1) {
      const types = ['red', 'blue', 'pink'];
      const type = types[Math.floor(Math.random() * types.length)];
      const m = new Monster(type, this.x - 140, spawnY);
      this.minions.push(m);
      particles.emitDust(this.x - 140, spawnY, 10, '#AB47BC');
    } else {
      const types = ['ice', 'yellow', 'obsidian', 'pink', 'grape'];
      const t1 = types[Math.floor(Math.random() * types.length)];
      const m1 = new Monster(t1, this.x - 180, spawnY);
      this.minions.push(m1);
      particles.emitDust(this.x - 180, spawnY, 14, '#880E4F');
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2 EXCLUSIVE: 死神鐮刀 (0.45s purple line telegraph, 0.55s boomerang return)
  // ══════════════════════════════════════════════════════════════════
  queueAbyssalScythe(player) {
    audio.playTelegraph();
    this.activeTelegraphs.push({
      type: 'scythe',
      timer: 0.45,
      maxTimer: 0.45,
      startX: this.x,
      startY: this.y - 120,
      targetX: player.x,
      targetY: player.y - 35,
      onExecute: () => {
        this.fireAbyssalScythe(player);
      }
    });
  }

  fireAbyssalScythe(player) {
    const pX = this.x;
    const pY = this.y - 120;
    const baseAngle = Math.atan2(player.y - pY, player.x - pX);
    const offsets = [-0.42, 0, 0.42];
    const speed = 300 * (this.resonanceEnraged ? 1.10 : 1.0);
    const dmg = (this.config.phase2.scytheDamage || 22) * (this.resonanceEnraged ? 1.10 : 1.0);

    audio.playBossRoar();
    particles.emitFloatingText(this.x, this.y - 180, '☠ 死神鐮刀！', '#4A148C');

    offsets.forEach((offset) => {
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
        damage: dmg,
        life: 2.6,
        rotates: true,
        vRot: 6
      });

      // Register boomerang return after 0.55s
      this.activeBoomerangs.push({
        proj,
        timer: 0.55,
        speed: speed * 0.85
      });
    });

    for (let i = 0; i < 16; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 1.0;
      particles.emit({
        x: pX + Math.cos(a) * 30,
        y: pY + Math.sin(a) * 30,
        vx: Math.cos(a) * 160,
        vy: Math.sin(a) * 160,
        size: 6,
        color: '#7B1FA2',
        life: 0.5,
        shape: 'petal',
        rotates: true
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2 EXCLUSIVE: 旋刺龍卷 (0.60s circle telegraph)
  // ══════════════════════════════════════════════════════════════════
  queueSpinningThorns() {
    audio.playTelegraph();
    this.activeTelegraphs.push({
      type: 'thorns',
      timer: 0.60,
      maxTimer: 0.60,
      x: this.x,
      y: this.y - 80,
      radius: 120,
      onExecute: () => {
        this.triggerSpinningThorns();
      }
    });
  }

  triggerSpinningThorns() {
    audio.playBossRoar();
    particles.emitFloatingText(this.x, this.y - 180, '🌀 旋刺龍卷！', '#006064');

    const count = 12;
    const dmg = (this.config.phase2.thornsDamage || 18) * (this.resonanceEnraged ? 1.10 : 1.0);
    for (let i = 0; i < count; i++) {
      const startAngle = (i / count) * Math.PI * 2;
      this.spinningThorns.push({
        angle: startAngle,
        radius: 120,
        angularSpeed: 4.0,
        driftSpeed: 28,
        life: 2.0,
        maxLife: 2.0,
        damage: dmg,
        hasHit: false,
        pulseTimer: 0,
        size: 14
      });
    }

    for (let i = 0; i < count * 2; i++) {
      const a = (i / (count * 2)) * Math.PI * 2;
      particles.emit({
        x: this.x + Math.cos(a) * 60,
        y: (this.y - 80) + Math.sin(a) * 60,
        vx: Math.cos(a) * 140,
        vy: Math.sin(a) * 140,
        size: 5,
        color: '#00BCD4',
        life: 0.5,
        shape: 'petal',
        rotates: true
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Phase 2 EXCLUSIVE: 暗影瘴氣 (0.55s ground circles telegraph)
  // ══════════════════════════════════════════════════════════════════
  queueShadowMiasma(player) {
    audio.playTelegraph();
    const arenaStart = this.config.arena.startX;
    const arenaEnd = this.config.arena.endX;
    const groundY = this.config.arena.groundY;
    const zones = [];
    const count = 4;
    const rangeWidth = arenaEnd - arenaStart - 240;
    for (let i = 0; i < count; i++) {
      zones.push({
        x: arenaStart + 120 + (i + 0.3 + Math.random() * 0.4) * (rangeWidth / count),
        y: groundY - 40,
        radius: 45
      });
    }

    this.activeTelegraphs.push({
      type: 'miasma',
      timer: 0.55,
      maxTimer: 0.55,
      zones,
      onExecute: () => {
        this.castShadowMiasma(zones);
      }
    });
  }

  castShadowMiasma(zones) {
    audio.playTelegraph();
    particles.emitFloatingText(this.x, this.y - 180, '💀 暗影瘴氣！', '#4A148C');
    const dmg = (this.config.phase2.miasmaDamage || 12) * (this.resonanceEnraged ? 1.10 : 1.0);

    for (const z of zones) {
      this.spores.push({
        x: z.x,
        y: z.y - 30,
        vx: (Math.random() - 0.5) * 25,
        vy: -10 - Math.random() * 10,
        radius: 45,
        life: 4.5,
        maxLife: 4.5,
        damage: dmg,
        slowDuration: 2.0,
        hasHit: false,
        pulseTimer: 0,
        isMiasma: true
      });

      for (let j = 0; j < 8; j++) {
        particles.emit({
          x: z.x + (Math.random() - 0.5) * 40,
          y: z.y - 20,
          vx: (Math.random() - 0.5) * 40,
          vy: -Math.random() * 50 - 20,
          size: 10,
          color: '#4A148C',
          life: 0.6,
          shape: 'circle',
          fade: true
        });
      }
    }
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
      s.vy -= 15 * dt;
      s.vx *= 0.98;

      s.x = Math.max(this.config.arena.startX + 10, Math.min(this.config.arena.endX - 10, s.x));

      if (!s.hasHit && player && !player.isDead) {
        const dist = Math.hypot(s.x - player.x, s.y - (player.y - 35));
        if (dist < s.radius + 20) {
          s.hasHit = true;
          player.takeDamage(s.damage);
          if (player.speed > 0) {
            player._sporeSlowTimer = s.slowDuration || 2.0;
            player._sporeSlowFactor = 0.45;
          }
          particles.emitHitSparks(s.x, s.y, '#CE93D8', 10);
          particles.emitFloatingText(s.x, s.y - 30, '💤 孢子遲緩！', '#CE93D8');
          this.spores.splice(i, 1);
          continue;
        }
      }

      if (Math.random() < 0.3) {
        particles.emit({
          x: s.x + (Math.random() * 12 - 6),
          y: s.y + (Math.random() * 12 - 6),
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          size: 4 + Math.random() * 4,
          color: s.isMiasma ? 'rgba(74, 20, 140, 0.6)' : `rgba(${180 + Math.floor(Math.random()*60)}, ${100 + Math.floor(Math.random()*50)}, 255, 0.6)`,
          life: 0.4,
          shape: 'circle',
          fade: true
        });
      }
    }
  }

  _updateSpinningThorns(dt, player) {
    for (let i = this.spinningThorns.length - 1; i >= 0; i--) {
      const t = this.spinningThorns[i];
      t.life -= dt;
      t.pulseTimer += dt;

      if (t.life <= 0) {
        this.spinningThorns.splice(i, 1);
        continue;
      }

      t.angle += t.angularSpeed * dt;
      t.radius += t.driftSpeed * dt;

      const wx = this.x + Math.cos(t.angle) * t.radius;
      const wy = (this.y - 80) + Math.sin(t.angle) * t.radius;

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

      if (!t.hasHit && player && !player.isDead) {
        const dist = Math.hypot(wx - player.x, wy - (player.y - 35));
        if (dist < t.size + 22) {
          t.hasHit = true;
          player.takeDamage(t.damage);
          particles.emitHitSparks(wx, wy, '#00BCD4', 10);
        }
      }
    }
  }

  _updateTrackingPollen(dt, player) {
    for (let i = this.trackingPollen.length - 1; i >= 0; i--) {
      const p = this.trackingPollen[i];
      p.life -= dt;
      p.pulseTimer += dt;
      if (p.life <= 0) {
        this.trackingPollen.splice(i, 1);
        continue;
      }
      if (player && !player.isDead) {
        const targetAngle = Math.atan2((player.y - 35) - p.y, player.x - p.x);
        let diff = normalizeAngle(targetAngle - p.angle);
        p.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      }
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;

      // Trail particles
      if (Math.random() < 0.35) {
        particles.emit({
          x: p.x,
          y: p.y,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          size: 4,
          color: '#FFD700',
          life: 0.3,
          shape: 'circle',
          fade: true
        });
      }

      if (!p.hasHit && player && !player.isDead) {
        const dist = Math.hypot(p.x - player.x, p.y - (player.y - 35));
        if (dist < 28) {
          p.hasHit = true;
          player.takeDamage(p.damage);
          particles.emitHitSparks(p.x, p.y, '#FFD700', 10);
          this.trackingPollen.splice(i, 1);
        }
      }
    }
  }

  render(ctx) {
    // Render active telegraphs (Scythe, Thorns, Miasma, Chomp, Lunge)
    this._renderTelegraphs(ctx);

    // Render spore clouds (includes Shadow Miasma zones)
    this._renderSpores(ctx);

    // Render spinning thorns
    this._renderSpinningThorns(ctx);

    // Render tracking pollen
    this._renderTrackingPollen(ctx);

    // Render ground spike warnings
    this._renderGroundSpikeWarnings(ctx);

    if (this.isDead && (!this.deathSequenceTimer || this.deathSequenceTimer <= 0)) return;

    // ── Entrance Y offset: boss rises from below ──────────────────────
    const entranceOffset = this._entranceYOffset || 0;

    ctx.save();
    ctx.translate(this.x, this.y + entranceOffset);

    // Procedural deformation: breathing squash & stretch
    const breathX = 1.0 + Math.sin(this.bobTimer * 2.5) * 0.035;
    const breathY = 1.0 - Math.sin(this.bobTimer * 2.5) * 0.035;

    // Phase 2: 20% larger than Phase 1 (RULE 36: 15-25% visual size increase)
    const phaseScale = (this.phase === 2) ? 1.20 : 1.0;

    ctx.scale(this.facing * breathX * phaseScale, breathY * phaseScale);

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
      ctx.globalAlpha = Math.min(1.0, (this.phase2TransformTimer / 2.8) * 1.2);
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
    const hasP2Image = this.imgPhase2.complete && this.imgPhase2.naturalWidth > 0;
    const activeImg = (this.phase === 2 && hasP2Image) ? this.imgPhase2 : this.imgPhase1;

    // Compute transform scale: sinusoidal 0.5→1.3→1.0 over phase2TransformTimer
    let transformScale = 1.0;
    if (this.phase2TransformTimer > 0) {
      const t = this.phase2ScaleAnim; // 0=start, 1=end
      transformScale = 0.5 + Math.sin(t * Math.PI) * 0.8 + (1.0 - Math.sin(t * Math.PI) * 0.5) * t * 0.5;
      transformScale = Math.max(0.5, Math.min(1.35, transformScale));
      transformScale += Math.sin(this.bobTimer * 6) * 0.15;
    }

    if (this.phase2TransformTimer > 0 && this.imgPhase1.complete && this.imgPhase1.naturalWidth > 0 && hasP2Image) {
      const progress = Math.max(0, Math.min(1, this.phase2ScaleAnim));
      const dw = this.width * transformScale;
      const dh = this.height * transformScale;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.drawImage(this.imgPhase1, -dw / 2, -dh, dw, dh);
      ctx.globalAlpha = progress;
      ctx.drawImage(this.imgPhase2, -dw / 2, -dh, dw, dh);
      ctx.restore();
    } else if (activeImg.complete && activeImg.naturalWidth > 0) {
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

    // v9.5 Resonance Buff Red Aura
    if (this.resonanceEnraged && !this.isDead) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.65)';
      ctx.lineWidth = 3 + Math.sin(this.bobTimer * 6) * 1.5;
      ctx.shadowColor = '#FF1744';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, -110, 115, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Phase 2 Rage Mode (<30% HP) Visual Crimson Fire Aura
    if (this.isRaging && !this.isDead) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
      ctx.lineWidth = 4 + Math.sin(this.bobTimer * 10) * 2;
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(0, -110, 125 + Math.sin(this.bobTimer * 8) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
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

  _renderTrackingPollen(ctx) {
    for (const p of this.trackingPollen) {
      const alpha = Math.min(1.0, (p.life / p.maxLife) * 1.5);
      const pulse = 1.0 + Math.sin(p.pulseTimer * 8) * 0.2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FF8F00';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FF6F00';
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

  // ══════════════════════════════════════════════════════════════════
  // Telegraph Rendering System (Scythe line, Thorns circle, Miasma zones, Chomp wedge)
  // ══════════════════════════════════════════════════════════════════
  _renderTelegraphs(ctx) {
    for (const tg of this.activeTelegraphs) {
      const progress = 1.0 - (tg.timer / tg.maxTimer);
      ctx.save();

      if (tg.type === 'scythe') {
        // 0.45s Purple Warning Line
        ctx.strokeStyle = '#AB47BC';
        ctx.lineWidth = 3 + Math.sin(tg.timer * 30) * 1.5;
        ctx.setLineDash([12, 8]);
        ctx.shadowColor = '#AB47BC';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(tg.startX, tg.startY);
        const ang = Math.atan2(tg.targetY - tg.startY, tg.targetX - tg.startX);
        ctx.lineTo(tg.startX + Math.cos(ang) * 700, tg.startY + Math.sin(ang) * 700);
        ctx.stroke();

        ctx.fillStyle = '#E1BEE7';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('⚠ SCYTHE', tg.startX - 30, tg.startY - 20);
      }
      else if (tg.type === 'thorns') {
        // 0.60s Teal Warning Radius Circle
        ctx.strokeStyle = '#00BCD4';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 10;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, tg.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner shrinking countdown ring
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, tg.radius * (1.0 - progress), 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#80DEEA';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('⚠ THORNS', tg.x - 30, tg.y - tg.radius - 8);
      }
      else if (tg.type === 'miasma') {
        // 0.55s Ground Purple Danger Circles
        if (tg.zones) {
          for (const z of tg.zones) {
            ctx.fillStyle = 'rgba(74, 20, 140, 0.25)';
            ctx.beginPath();
            ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#7B1FA2';
            ctx.lineWidth = 2 + Math.sin(tg.timer * 25);
            ctx.setLineDash([6, 6]);
            ctx.stroke();

            ctx.fillStyle = '#EA80FC';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('☠ MIASMA', z.x - 28, z.y - 10);
          }
        }
      }
      else if (tg.type === 'chomp') {
        // 0.45s Red Warning Wedge on Ground
        ctx.fillStyle = 'rgba(213, 0, 0, 0.35)';
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FF1744';
        ctx.shadowBlur = 12;

        const cw = 110;
        const ch = 70;
        ctx.beginPath();
        ctx.ellipse(tg.x, tg.y - 15, cw * (0.5 + progress * 0.5), ch * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FF5252';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('⚠ CHOMP DANGER', tg.x - 55, tg.y - 45);
      }
      else if (tg.type === 'lunge') {
        // 0.45s Red Directional Charge Arrow Corridor
        ctx.fillStyle = 'rgba(255, 23, 68, 0.22)';
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FF1744';
        ctx.shadowBlur = 14;
        const totalW = 380 * tg.dir;
        const currentW = totalW * progress;
        const startX = tg.dir > 0 ? tg.startX : tg.startX + currentW;
        ctx.fillRect(startX, tg.y - 120, Math.abs(currentW), 120);
        ctx.strokeRect(tg.dir > 0 ? tg.startX : tg.startX + totalW, tg.y - 120, Math.abs(totalW), 120);
        ctx.fillStyle = '#FF5252';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText("⚡ LUNGE CHARGE ⚡", tg.startX + totalW * 0.5 - 65, tg.y - 130);
      }
      else if (tg.type === "vine_whip") {
        ctx.strokeStyle = "#81C784";
        ctx.shadowColor = "#E040FB";
        ctx.shadowBlur = 10;
        ctx.lineWidth = 5 + progress * 3;
        ctx.setLineDash([16, 10]);
        for (let i = 0; i < tg.count; i++) {
          const offset = i === 0 ? 0 : (i === 1 ? 88 : 46);
          ctx.beginPath();
          ctx.moveTo(tg.x, tg.y + offset);
          ctx.lineTo(tg.x + tg.dir * 360, tg.y + offset);
          ctx.stroke();
        }
      }
      else if (tg.type === "crossfire") {
        ctx.strokeStyle = "rgba(255, 128, 203, 0.9)";
        ctx.shadowColor = "#E040FB";
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 9]);
        for (let i = -3; i <= 3; i++) {
          const angle = tg.angle + i * 0.12;
          ctx.beginPath();
          ctx.moveTo(tg.x, tg.y);
          ctx.lineTo(tg.x + Math.cos(angle) * (280 + progress * 120), tg.y + Math.sin(angle) * (280 + progress * 120));
          ctx.stroke();
        }
      }
      else if (tg.type === "bloom_burst") {
        ctx.strokeStyle = "#FF80AB";
        ctx.shadowColor = "#E040FB";
        ctx.shadowBlur = 16;
        ctx.lineWidth = 4 + progress * 3;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, 90 + progress * 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#B9F6CA";
        ctx.lineWidth = 12;
        ctx.setLineDash([]);
        for (const safeAngle of [tg.angle, tg.angle + Math.PI]) {
          ctx.beginPath();
          ctx.arc(tg.x, tg.y, 115, safeAngle - 0.32, safeAngle + 0.32);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
}
