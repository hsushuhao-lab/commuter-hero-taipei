/**
 * 08點上班大作戰：通勤英雄篇 - 七大晨間花系怪獸 (Monster.js)
 * 嚴格遵循規範：
 * - 7 隻怪獸皆使用 Sheet 3 獨立美術 PNG，無 tint 換色
 * - 0.4 秒 (25-frame) 專屬 Telegraph 預警系統（3次閃爍，前 80ms 最亮）
 * - 輕怪 4~7 HP、重怪 6~9 HP 均衡數值
 */

import { MONSTER_TYPES } from '../data/Monsters.js';
import { audio } from '../engine/Audio.js';
import { particles } from './Particles.js';
import { projectiles } from './Projectiles.js';

export class Monster {
  constructor(typeKey, x, y, isSkyDrop = false) {
    const isValid = typeKey && MONSTER_TYPES[typeKey] && !MONSTER_TYPES[typeKey].disabled && typeKey !== 'transit';
    this.typeKey = isValid ? typeKey : 'red';
    this.config = MONSTER_TYPES[this.typeKey];
    this.isSkyDrop = isSkyDrop;
    this.x = x;
    this.originX = x;
    this.originY = y;
    this.y = isSkyDrop ? y - 280 : y;
    this.vx = 0;
    this.vy = 0;

    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.speed = this.config.speed;
    this.attackDamage = this.config.attackDamage;
    this.attackCooldown = this.config.attackCooldown;
    this.attackPhase = 1;
    this.isPhase2 = false; // Backward-compatible alias
    this.name = this.config.name;

    this.width = 54;
    this.height = 54;
    this.facing = -1;
    this.patrolBounds = null;
    this.predatorRole = 'patroller';
    this.flankSide = 0;
    this.isPursuer = false;
    this.reentryCount = 0;
    this.reentryCooldown = 0;

    // AI & Attack Timers
    this.attackCooldownTimer = Math.random() * 1.2; // Staggered first attack
    this.isTelegraphing = false;
    this.telegraphTimer = 0;
    this.telegraphDuration = this.config.telegraphDuration || 0.40;
    this.delayedSpawns = [];
    this.turnaroundTimer = 0;

    // Visual & State
    this.isDead = false;
    this.hitTimer = 0;
    this.bobTimer = Math.random() * Math.PI * 2;

    // v9.6: Cancel cosmetic transformation - All monsters strictly retain imageP1!
    this.imageP1 = new Image();
    this.imageP1.src = this.config.asset;
    this.imageP2 = this.imageP1; // Keep alias pointing to same image
    this.image = this.imageP1;
  }

  triggerAttackPhase2() {
    if (this.attackPhase === 2 || this.isDead) return;
    if (this.predatorRole === 'patroller') this.assignPredatorRole('pursuer');
    this.attackPhase = 2;
    this.isPhase2 = true; // alias
    // Strict requirement: DO NOT CHANGE IMAGE!
    this.image = this.imageP1;

    if (this.config.phase2) {
      this.attackDamage = this.config.phase2.attackDamage;
      this.attackCooldown = this.config.phase2.attackCooldown;
    } else {
      this.attackDamage = this.config.attackDamage * 2;
      this.attackCooldown = this.config.attackCooldown * 0.5;
    }
    this.telegraphDuration = Math.max(0.30, (this.config.telegraphDuration || 0.40) * 0.85);

    particles.emitHitSparks(this.x, this.y - 20, '#FFD700', 16);
    particles.emitHitSparks(this.x, this.y - 20, this.config.color, 14);
    particles.emitFloatingText(this.x, this.y - 45, '⚡ PREDATOR HUNT', this.config.color);
  }

  assignPredatorRole(role, flankSide = 0) {
    const validRoles = ['pursuer', 'interceptor', 'air_harasser', 'front_blocker', 'rear_pursuer', 'flanker'];
    if (!validRoles.includes(role)) throw new Error(`Unknown predator role: ${role}`);
    this.predatorRole = role;
    this.flankSide = Math.sign(flankSide);
    this.isPursuer = true;
    return this;
  }

  getPredatorTargetX(player) {
    const predictedLead = Math.max(-100, Math.min(180, (player.vx || 0) * 0.45));
    if (this.predatorRole === 'rear_pursuer') return player.x - 140 + predictedLead * 0.25;
    if (this.predatorRole === 'front_blocker') return player.x + 220 + predictedLead * 0.25;
    if (this.predatorRole === 'air_harasser') return player.x + 150 + predictedLead * 0.4;
    if (this.predatorRole === 'interceptor') return player.x + 220 + predictedLead;
    if (this.predatorRole === 'flanker') return player.x + this.flankSide * 240;
    return player.x + predictedLead * 0.35;
  }

  evolveToPhase2() {
    this.triggerAttackPhase2();
  }

  takeDamage(amount, attackInstanceId = null) {
    if (this.isDead) return;

    if (attackInstanceId) {
      if (!this.multiHitGate) this.multiHitGate = new Map();
      const now = performance.now ? performance.now() : Date.now();
      const lastHit = this.multiHitGate.get(attackInstanceId) || 0;
      if (now - lastHit < 250) return; // Projectiles can hit a monster once every 250ms
      this.multiHitGate.set(attackInstanceId, now);
      
      // Cleanup old entries
      if (this.multiHitGate.size > 20) {
        for (const [id, t] of this.multiHitGate.entries()) {
          if (now - t > 1000) this.multiHitGate.delete(id);
        }
      }
    }

    this.hp -= amount;
    this.hitTimer = 0.15;
    audio.playHit();
    particles.emitHitSparks(this.x, this.y - 20, this.config.color, 8);

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      particles.emitHitSparks(this.x, this.y - 20, this.config.color, 16);
      particles.emitDust(this.x, this.y, 8);
    }
  }

  update(dt, player, platforms = []) {
    if (this.isDead) return;

    // Process delayed spawns (dt-driven)
    for (let i = this.delayedSpawns.length - 1; i >= 0; i--) {
      const item = this.delayedSpawns[i];
      item.delay -= dt;
      if (item.delay <= 0) {
        if (!this.isDead) {
          item.spawn();
        }
        this.delayedSpawns.splice(i, 1);
      }
    }

    // 30 金幣觸發怪獸二階段全體進化 (Predator Mode)
    if (player.coins >= 30 && !this.isPhase2) {
      this.evolveToPhase2();
    }

    this.bobTimer += dt * 3.5;
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.turnaroundTimer > 0) this.turnaroundTimer -= dt;

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    const distFromOrigin = Math.abs(this.x - this.originX);

    // ── PHASE 1: AGGRO LEASH (Threatening but Avoidable) ──
    // If player runs away (>550px) or monster is pulled far (>650px), drop aggro & return home!
    let hasAggro = true;
    if (this.attackPhase === 1) {
      if (distToPlayer > 520 || distFromOrigin > 600 || (player.x - this.x) > 220) {
        hasAggro = false;
        if (this.isTelegraphing) {
          this.isTelegraphing = false;
          this.telegraphTimer = 0;
        }
      }
    }

    // Facing direction
    if (this.turnaroundTimer <= 0) {
      if (hasAggro) {
        const targetX = this.attackPhase === 2 ? this.getPredatorTargetX(player) : player.x;
        if (Math.abs(targetX - this.x) > 10) {
          this.facing = targetX < this.x ? -1 : 1;
        }
      } else {
        // Return towards origin
        if (distFromOrigin > 25) {
          this.facing = this.originX < this.x ? -1 : 1;
        }
      }
    }

    // Sky drop descent behavior
    if (this.isSkyDrop && this.y < this.originY) {
      if (distToPlayer < 750) {
        this.y += 140 * dt;
        this.x += Math.sin(this.bobTimer * 2) * 50 * dt;
        if (Math.random() < 0.25) {
          particles.emitDust(this.x, this.y, 1, this.config.color);
        }
      }
    }

    // ── Phase 2 Tactical Re-entry ──
    if (this.reentryCooldown > 0) this.reentryCooldown -= dt;
    // Keep a rear predator active while it is off-screen; re-entry is movement-driven, never a teleport.
    if (this.attackPhase === 2 && this.isPursuer) {
      if (this.reentryCooldown <= 0 && this.reentryCount < 2 && player.x - this.x > 850 && player.x - this.x < 1400) {
        this.reentryCount += 1;
        this.reentryCooldown = 5.0;
      }
    }

    // Movement calculation
    let targetSpeed = this.speed;
    if (this.attackPhase === 1) {
      // Phase 1 chase speed is below/near player forward speed (0.75x)
      targetSpeed = this.speed * 0.75;
    } else {
      // Phase 2 catch-up acceleration
      let catchUpMult = 1.15;
      if (distToPlayer > 350) catchUpMult = 1.30;
      if (distToPlayer > 550) catchUpMult = 1.45;
      targetSpeed = this.speed * catchUpMult;
    }

    // Patrol / Float behavior
    if (this.typeKey === 'transit') {
      this.vx = 0;
    } else if (this.config.type === 'flying') {
      // Sinusoidal floating
      const targetBaseY = this.isSkyDrop && this.y < this.originY ? this.y : this.originY;
      this.y = targetBaseY + Math.sin(this.bobTimer) * 22;
      if (hasAggro && !this.isTelegraphing) {
        this.vx = this.facing * targetSpeed;
      } else if (!hasAggro && distFromOrigin > 25) {
        this.vx = this.facing * this.speed * 0.5;
      } else {
        this.vx = 0;
      }
    } else {
      // Ground patrol
      if (hasAggro && !this.isTelegraphing) {
        this.vx = this.facing * targetSpeed;
      } else if (!hasAggro && distFromOrigin > 25) {
        this.vx = this.facing * this.speed * 0.5;
      } else {
        this.vx = 0;
      }

      // Patrol bounds check (only active if returning or patrolling without aggro)
      if (this.patrolBounds && !hasAggro) {
        if (this.x <= this.patrolBounds.minX && this.vx <= 0) {
          this.facing = 1;
          this.vx = this.speed * 0.5;
          this.x = this.patrolBounds.minX;
          this.turnaroundTimer = 0.8;
        } else if (this.x >= this.patrolBounds.maxX && this.vx >= 0) {
          this.facing = -1;
          this.vx = -this.speed * 0.5;
          this.x = this.patrolBounds.maxX;
          this.turnaroundTimer = 0.8;
        }
      }

      // Edge turnaround check (never walk off cliff/platform)
      if (platforms && platforms.length > 0 && Math.abs(this.vx) > 0) {
        const lookAheadX = this.x + this.facing * 30;
        const checkY = this.y + 10;
        const hasFloorAhead = platforms.some(p => 
          p.x <= lookAheadX && (p.x + p.w) >= lookAheadX &&
          p.y >= this.y - 10 && p.y <= checkY + 30
        );
        if (!hasFloorAhead) {
          this.facing = -this.facing;
          this.vx = this.facing * targetSpeed * 0.5;
          this.turnaroundTimer = 0.8;
        }
      }
    }

    this.x += this.vx * dt;

    // Assertion check for finite numeric properties
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y) || 
        !Number.isFinite(this.vx) || !Number.isFinite(this.vy) || 
        !Number.isFinite(this.hp)) {
      console.error(`[Monster Stability Error] Non-finite value in monster ${this.typeKey}: x=${this.x}, y=${this.y}, vx=${this.vx}, vy=${this.vy}, hp=${this.hp}`);
      this.isDead = true;
      this.hp = 0;
      return;
    }

    // Handle Attack & Telegraph (screen-visible range, no offscreen snipes)
    const attackRange = this.attackPhase === 2 ? 680 : 500;
    if (hasAggro && distToPlayer < attackRange) {
      if (this.isTelegraphing) {
        this.telegraphTimer += dt;
        if (this.telegraphTimer >= this.telegraphDuration) {
          this.executeAttack(player);
          this.isTelegraphing = false;
          this.telegraphTimer = 0;
          this.attackCooldownTimer = this.attackCooldown;
        }
      } else {
        this.attackCooldownTimer -= dt;
        if (this.attackCooldownTimer <= 0) {
          this.isTelegraphing = true;
          this.telegraphTimer = 0;
          audio.playTelegraph();
        }
      }
    } else {
      this.isTelegraphing = false;
    }
  }

  executeAttack(player) {
    const dir = this.facing;
    const spawnX = this.x + dir * 25;
    const spawnY = this.y - 25;
    const isP2 = this.attackPhase === 2;

    if (this.typeKey === 'red') {
      // 尖鼻小紅苗:
      // Phase 1: 直線發射紅色種子 (中等傷害)
      // Phase 2: 連續高速種子彈幕 (高傷害, 3連發)
      projectiles.spawn({
        isPlayer: false,
        type: 'petal',
        x: spawnX,
        y: spawnY,
        vx: dir * (isP2 ? 620 : 520),
        vy: 0,
        maxDistance: isP2 ? 650 : 380,
        width: isP2 ? 36 : 32,
        height: 14,
        color: '#FF5252',
        damage: this.attackDamage,
        life: 1.5
      });
      if (isP2) {
        [0.08, 0.16].forEach((delay, idx) => {
          this.delayedSpawns.push({
            delay,
            spawn: () => {
              projectiles.spawn({
                isPlayer: false,
                type: 'petal',
                x: spawnX,
                y: spawnY + (idx % 2 === 0 ? -8 : 8),
                vx: dir * 650,
                vy: (idx % 2 === 0 ? -15 : 15),
                maxDistance: 650,
                width: 34,
                height: 14,
                color: '#FF1744',
                damage: this.attackDamage,
                life: 1.5
              });
            }
          });
        });
      }
    } 
    else if (this.typeKey === 'ice') {
      // 稜角冰晶怪:
      // Phase 1: 發射冰晶碎片 (雙向滾動冰霜波，中等傷害，附減速)
      // Phase 2: 大範圍冰晶風暴 (5向廣角冰晶風暴，高傷害，強力減速)
      if (!isP2) {
        [-1, 1].forEach(d => {
          projectiles.spawn({
            isPlayer: false,
            type: 'pan_wave',
            x: spawnX,
            y: this.y,
            vx: d * 340,
            vy: 0,
            maxDistance: 350,
            width: 42,
            height: 28,
            color: '#40C4FF',
            damage: this.attackDamage,
            life: 1.3
          });
        });
      } else {
        for (let i = -2; i <= 2; i++) {
          projectiles.spawn({
            isPlayer: false,
            type: 'pan_wave',
            x: spawnX,
            y: spawnY,
            vx: dir * 360,
            vy: i * 65,
            maxDistance: 500,
            width: 46,
            height: 32,
            color: '#00E5FF',
            damage: this.attackDamage,
            life: 1.4
          });
        }
      }
    }
    else if (this.typeKey === 'grape') {
      // 紫葡花結毒姬:
      // Phase 1: 發射毒氣花球 (3連拋物線，中等傷害，附中毒)
      // Phase 2: 大範圍毒霧爆發 (5連多向毒霧，高傷害，持續中毒)
      const spread = isP2 ? [-220, -170, -120, -70, -20] : [-180, -140, -230];
      spread.forEach((vy, idx) => {
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: spawnX,
          y: spawnY - 10,
          vx: dir * (180 + idx * 35),
          vy: vy,
          maxDistance: isP2 ? 520 : 360,
          width: isP2 ? 26 : 22,
          height: isP2 ? 26 : 22,
          color: isP2 ? '#7B1FA2' : '#BA68C8',
          damage: this.attackDamage,
          life: 1.7,
          rotates: true,
          vRot: 4
        });
      });
    }
    else if (this.typeKey === 'blue') {
      // 藍滴芽精:
      // Phase 1: 發射追蹤水滴 (雙重高速穿梭水刃，中等傷害)
      // Phase 2: 旋轉水流漩渦 (3連高速水刃 + 漩渦彈，高傷害，大範圍)
      const yOffsets = isP2 ? [-12, 0, 12] : [-8, 8];
      yOffsets.forEach((yo) => {
        projectiles.spawn({
          isPlayer: false,
          type: 'wind_blade',
          x: spawnX,
          y: spawnY + yo,
          vx: dir * (isP2 ? 620 : 550),
          vy: yo * 2,
          maxDistance: isP2 ? 580 : 360,
          width: isP2 ? 38 : 32,
          height: 24,
          color: '#00E5FF',
          damage: this.attackDamage,
          life: 1.4
        });
      });
      if (isP2) {
        this.delayedSpawns.push({
          delay: 0.12,
          spawn: () => {
            projectiles.spawn({
              isPlayer: false,
              type: 'pan_wave',
              x: spawnX,
              y: spawnY,
              vx: dir * 420,
              vy: 0,
              maxDistance: 500,
              width: 48,
              height: 48,
              color: '#0288D1',
              damage: this.attackDamage,
              life: 1.5,
              rotates: true,
              vRot: 6
            });
          }
        });
      }
    }
    else if (this.typeKey === 'yellow') {
      // 金花瓣使:
      // Phase 1: 發射追蹤花瓣 (5向扇形花瓣，中等傷害)
      // Phase 2: 花瓣光環大爆發 (8向360°圓環大爆發，高傷害，大範圍)
      if (!isP2) {
        for (let i = -2; i <= 2; i++) {
          projectiles.spawn({
            isPlayer: false,
            type: 'petal',
            x: spawnX,
            y: spawnY,
            vx: dir * 340,
            vy: i * 80,
            maxDistance: 350,
            width: 24,
            height: 16,
            color: '#FFD700',
            damage: this.attackDamage,
            life: 1.5,
            rotates: true,
            vRot: 3
          });
        }
      } else {
        for (let i = 0; i < 8; i++) {
          const ang = i * (Math.PI * 2 / 8);
          projectiles.spawn({
            isPlayer: false,
            type: 'petal',
            x: spawnX,
            y: spawnY,
            vx: Math.cos(ang) * 360,
            vy: Math.sin(ang) * 360,
            maxDistance: 520,
            width: 28,
            height: 20,
            color: '#FFEA00',
            damage: this.attackDamage,
            life: 1.6,
            rotates: true,
            vRot: 5
          });
        }
      }
    }
    else if (this.typeKey === 'obsidian') {
      // 玄晶葉衛:
      // Phase 1: 地面晶刺突起 (地面震波 + 1道突刺地刺，中等傷害)
      // Phase 2: 密集晶刺陣 (大範圍強烈地震波 + 3道前進突刺晶刺陣，高傷害)
      projectiles.spawn({
        isPlayer: false,
        type: 'pan_wave',
        x: spawnX,
        y: this.y,
        vx: dir * (isP2 ? 320 : 260),
        vy: 0,
        maxDistance: isP2 ? 520 : 360,
        width: isP2 ? 68 : 56,
        height: 48,
        color: '#3949AB',
        damage: this.attackDamage,
        life: 1.6
      });
      const spikeDistances = isP2 ? [110, 200, 290] : [140];
      spikeDistances.forEach((dist, idx) => {
        this.delayedSpawns.push({
          delay: 0.12 * (idx + 1),
          spawn: () => {
            projectiles.spawn({
              isPlayer: false,
              type: 'vine',
              x: this.x + dir * dist,
              y: this.y,
              vx: 0,
              vy: -360,
              maxDistance: 300,
              width: 36,
              height: 75,
              color: '#283593',
              damage: this.attackDamage,
              life: 0.42
            });
          }
        });
      });
    }
    else {
      // 粉翼花靈 (pink):
      // Phase 1: 發射花粉光彈 (雙發俯衝花粉重爆彈，中等傷害)
      // Phase 2: 旋轉花瓣風暴 (4連發高空俯衝光彈 + 旋轉花瓣風暴大擴散，高傷害)
      const count = isP2 ? 4 : 2;
      for (let i = 0; i < count; i++) {
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: spawnX - dir * i * 20,
          y: spawnY + i * 8,
          vx: dir * (240 + i * 40),
          vy: 300 + i * 20,
          maxDistance: isP2 ? 480 : 350,
          width: isP2 ? 30 : 26,
          height: isP2 ? 30 : 26,
          color: isP2 ? '#F50057' : '#FF80AB',
          damage: this.attackDamage,
          life: 1.4,
          rotates: true,
          vRot: 5
        });
      }
    }
  }

  render(ctx) {
    if (this.isDead || !Number.isFinite(this.x) || !Number.isFinite(this.y)) return;

    // Render Telegraph Warning Area (0.4s @ 60fps)
    if (this.isTelegraphing) {
      this.renderTelegraph(ctx);
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    // Hit flash overlay
    if (this.hitTimer > 0) {
      ctx.filter = 'brightness(1.8) drop-shadow(0 0 8px #FF5252)';
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Attack Phase 2 Energy Pulse & Aura (Consistent appearance, powerful aura)
    if (this.attackPhase === 2) {
      ctx.save();
      const pulse = Math.sin(Date.now() * 0.008) * 3;
      const rot = (Date.now() * 0.003) % (Math.PI * 2);
      
      // Outer rotating dashed energy ring
      ctx.save();
      ctx.rotate(rot);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 36 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Inner glowing color pulse
      ctx.save();
      ctx.strokeStyle = this.config.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.3;
      ctx.beginPath();
      ctx.arc(0, -28, 30 + pulse * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }

    // Monster Sprite - Strictly single appearance
    if (this.image.complete && this.image.naturalWidth > 0) {
      const drawSize = 64; // Same size and appearance in both phases
      ctx.drawImage(this.image, -drawSize / 2, -drawSize, drawSize, drawSize);
    } else {
      // Fallback
      ctx.fillStyle = this.config.color;
      ctx.beginPath();
      ctx.arc(0, -25, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HP Bar
    this.renderHpBar(ctx);
  }

  renderTelegraph(ctx) {
    const progress = this.telegraphTimer / this.telegraphDuration;
    // 3 blinks, highest brightness in the last 80ms
    const isLast80ms = (this.telegraphDuration - this.telegraphTimer) <= 0.08;
    const alpha = isLast80ms ? 0.95 : (0.35 + Math.sin(progress * Math.PI * 6) * 0.3);

    ctx.save();
    ctx.strokeStyle = this.config.color;
    ctx.fillStyle = this.config.color;
    ctx.globalAlpha = Math.max(0.1, alpha);

    const dir = this.facing;
    const startX = this.x + dir * 20;
    const startY = this.y - 25;

    if (this.typeKey === 'red') {
      // Screen-spanning red targeting laser line
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + dir * 650, startY);
      ctx.stroke();
    } 
    else if (this.typeKey === 'ice') {
      // Expanding dual ice shockwave zone
      ctx.lineWidth = 2;
      const radius = 30 + progress * 80;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    else if (this.typeKey === 'grape') {
      // Wide triple purple lob arc
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX + dir * 180, startY - 180, startX + dir * 360, this.y);
      ctx.stroke();
    }
    else if (this.typeKey === 'blue') {
      // Fast dual water cutter lines
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX, startY - 8);
      ctx.lineTo(startX + dir * 600, startY - 8);
      ctx.moveTo(startX, startY + 8);
      ctx.lineTo(startX + dir * 600, startY + 8);
      ctx.stroke();
    }
    else if (this.typeKey === 'yellow') {
      // Golden petal 5-way fan sector
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const angleCenter = dir > 0 ? 0 : Math.PI;
      ctx.arc(startX, startY, 360, angleCenter - 0.45, angleCenter + 0.45);
      ctx.closePath();
      ctx.globalAlpha = alpha * 0.25;
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }
    else if (this.typeKey === 'obsidian') {
      // Ground danger tremor zone + spike marker
      ctx.lineWidth = 3;
      const zoneW = 340;
      ctx.strokeRect(dir > 0 ? this.x : this.x - zoneW, this.y - 12, zoneW, 24);
    }
    else if (this.typeKey === 'transit') {
      // Transit beam direct laser line
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + dir * 680, startY);
      ctx.stroke();
    }
    else {
      // Pink dive swoop line + bomb area
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + dir * 380, startY + 160);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderHpBar(ctx) {
    if (this.hp >= this.maxHp && this.attackPhase !== 2) return;
    const barW = 48;
    const barH = 5;
    const x = this.x - barW / 2;
    const y = this.y - 70;

    ctx.save();
    // Phase 2 Badge
    if (this.attackPhase === 2) {
      ctx.font = 'bold 9px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // Badge background pill
      const badgeW = 44;
      const badgeH = 13;
      ctx.fillStyle = 'rgba(20, 15, 30, 0.85)';
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(this.x - badgeW / 2, y - 16, badgeW, badgeH, 4);
      } else {
        ctx.rect(this.x - badgeW / 2, y - 16, badgeW, badgeH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFD700';
      ctx.fillText('⚡ ATK II', this.x, y - 5);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);

    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = this.attackPhase === 2 ? '#FFB300' : this.config.color;
    ctx.fillRect(x, y, barW * ratio, barH);
    ctx.restore();
  }
}
