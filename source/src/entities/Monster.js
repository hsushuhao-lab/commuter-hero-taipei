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
    this.isPhase2 = false;
    this.name = this.config.name;

    this.width = 54;
    this.height = 54;
    this.facing = -1;
    this.patrolBounds = null;

    // AI & Attack Timers
    this.attackCooldownTimer = Math.random() * 1.2; // Staggered first attack
    this.isTelegraphing = false;
    this.telegraphTimer = 0;
    this.telegraphDuration = this.config.telegraphDuration || 0.32;
    this.delayedSpawns = [];
    this.turnaroundTimer = 0;

    // Visual & State
    this.isDead = false;
    this.hitTimer = 0;
    this.bobTimer = Math.random() * Math.PI * 2;

    // Preload P1 and P2 images
    this.imageP1 = new Image();
    this.imageP1.src = this.config.asset;
    this.imageP2 = new Image();
    if (this.config.phase2 && this.config.phase2.asset) {
      this.imageP2.src = this.config.phase2.asset;
    } else {
      this.imageP2 = this.imageP1;
    }
    this.image = this.imageP1;
  }

  evolveToPhase2() {
    if (this.isPhase2 || this.isDead) return;
    this.isPhase2 = true;
    if (this.config.phase2) {
      const p2 = this.config.phase2;
      this.name = p2.name;
      const hpDiff = p2.hp - this.config.hp;
      this.hp = Math.min(p2.hp, this.hp + hpDiff);
      this.maxHp = p2.hp;
      this.image = this.imageP2;
      this.speed = p2.speed;
      this.attackDamage = p2.attackDamage;
      this.attackCooldown = p2.attackCooldown;
    }
    particles.emitHitSparks(this.x, this.y - 20, '#FFD700', 16);
    particles.emitHitSparks(this.x, this.y - 20, this.config.color, 12);
  }

  takeDamage(amount) {
    if (this.isDead) return;
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

    // 30 金幣觸發怪獸二階段全體進化 (Commuter Resonance)
    if (player.coins >= 30 && !this.isPhase2) {
      this.evolveToPhase2();
    }

    this.bobTimer += dt * 3.5;
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.turnaroundTimer > 0) this.turnaroundTimer -= dt;

    // Face player unless currently turning around from edge/boundary
    if (this.turnaroundTimer <= 0) {
      this.facing = player.x < this.x ? -1 : 1;
    }

    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

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

    // Patrol / Float behavior
    if (this.typeKey === 'transit') {
      this.vx = 0;
    } else if (this.config.type === 'flying') {
      // Sinusoidal floating
      const targetBaseY = this.isSkyDrop && this.y < this.originY ? this.y : this.originY;
      this.y = targetBaseY + Math.sin(this.bobTimer) * 22;
      if (distToPlayer < 700 && !this.isTelegraphing) {
        this.vx = this.facing * this.speed * 0.75;
      } else {
        this.vx = 0;
      }
    } else {
      // Ground patrol
      if ((distToPlayer < 650 || this.turnaroundTimer > 0) && !this.isTelegraphing) {
        this.vx = this.facing * this.speed;
      } else {
        this.vx = 0;
      }

      // Patrol bounds check
      if (this.patrolBounds) {
        if (this.x <= this.patrolBounds.minX && this.vx <= 0) {
          this.facing = 1;
          this.vx = this.speed;
          this.x = this.patrolBounds.minX;
          this.turnaroundTimer = 0.8;
        } else if (this.x >= this.patrolBounds.maxX && this.vx >= 0) {
          this.facing = -1;
          this.vx = -this.speed;
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
          this.vx = this.facing * this.speed;
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
    if (distToPlayer < 650) {
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
    }
  }

  executeAttack(player) {
    const dir = this.facing;
    const spawnX = this.x + dir * 25;
    const spawnY = this.y - 25;

    if (this.typeKey === 'red') {
      // Screen-spanning rapid piercing red lance
      projectiles.spawn({
        isPlayer: false,
        type: 'petal',
        x: spawnX,
        y: spawnY,
        vx: dir * 520,
        vy: 0,
        maxDistance: 600,
        width: 32,
        height: 14,
        color: '#FF5252',
        damage: this.attackDamage,
        life: 1.5
      });
    } 
    else if (this.typeKey === 'ice') {
      // Dual bi-directional ground frost shockwaves
      projectiles.spawn({
        isPlayer: false,
        type: 'pan_wave',
        x: spawnX,
        y: this.y,
        vx: dir * 340,
        vy: 0,
        maxDistance: 450,
        width: 42,
        height: 28,
        color: '#40C4FF',
        damage: this.attackDamage,
        life: 1.3
      });
      projectiles.spawn({
        isPlayer: false,
        type: 'pan_wave',
        x: spawnX,
        y: this.y,
        vx: -dir * 340,
        vy: 0,
        maxDistance: 450,
        width: 42,
        height: 28,
        color: '#40C4FF',
        damage: this.attackDamage,
        life: 1.3
      });
    }
    else if (this.typeKey === 'grape') {
      // Triple toxic lob bubbles covering high, medium and low arcs
      const angles = [
        { vx: dir * 220, vy: -180 },
        { vx: dir * 300, vy: -140 },
        { vx: dir * 160, vy: -230 }
      ];
      angles.forEach(a => {
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: spawnX,
          y: spawnY - 10,
          vx: a.vx,
          vy: a.vy,
          maxDistance: 500,
          width: 22,
          height: 22,
          color: '#BA68C8',
          damage: this.attackDamage,
          life: 1.6,
          rotates: true,
          vRot: 4
        });
      });
    }
    else if (this.typeKey === 'blue') {
      // Twin ultra-fast hydro cutters
      projectiles.spawn({
        isPlayer: false,
        type: 'wind_blade',
        x: spawnX,
        y: spawnY - 8,
        vx: dir * 550,
        vy: -25,
        maxDistance: 550,
        width: 32,
        height: 22,
        color: '#00E5FF',
        damage: this.attackDamage,
        life: 1.4
      });
      projectiles.spawn({
        isPlayer: false,
        type: 'wind_blade',
        x: spawnX,
        y: spawnY + 8,
        vx: dir * 550,
        vy: 25,
        maxDistance: 550,
        width: 32,
        height: 22,
        color: '#00E5FF',
        damage: this.attackDamage,
        life: 1.4
      });
    }
    else if (this.typeKey === 'yellow') {
      // 5-Way wide golden petal fan covering 75 degrees
      for (let i = -2; i <= 2; i++) {
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: spawnX,
          y: spawnY,
          vx: dir * 340,
          vy: i * 80,
          maxDistance: 500,
          width: 24,
          height: 16,
          color: '#FFD700',
          damage: this.attackDamage,
          life: 1.5,
          rotates: true,
          vRot: 3
        });
      }
    }
    else if (this.typeKey === 'obsidian') {
      // Giant seismic shockwave + rising ground stone spike
      projectiles.spawn({
        isPlayer: false,
        type: 'pan_wave',
        x: spawnX,
        y: this.y,
        vx: dir * 260,
        vy: 0,
        maxDistance: 450,
        width: 56,
        height: 44,
        color: '#3949AB',
        damage: this.attackDamage,
        life: 1.6
      });
      this.delayedSpawns.push({
        delay: 0.15,
        spawn: () => {
          projectiles.spawn({
            isPlayer: false,
            type: 'vine',
            x: this.x + dir * 140,
            y: this.y,
            vx: 0,
            vy: -350,
            maxDistance: 280,
            width: 34,
            height: 70,
            color: '#3949AB',
            damage: this.attackDamage,
            life: 0.38
          });
        }
      });
    }
    else if (this.typeKey === 'transit') {
      // 捷運幽靈 / 悠遊卡寄靈 瞬移雷射
      projectiles.spawn({
        isPlayer: false,
        type: 'transit_beam',
        x: spawnX,
        y: spawnY,
        vx: dir * (this.isPhase2 ? 600 : 500),
        vy: 0,
        maxDistance: 550,
        width: 40,
        height: 18,
        color: '#00E676',
        damage: this.attackDamage,
        life: 1.4
      });
      if (this.isPhase2) {
        this.delayedSpawns.push({
          delay: 0.12,
          spawn: () => {
            projectiles.spawn({
              isPlayer: false,
              type: 'transit_beam',
              x: spawnX,
              y: spawnY - 14,
              vx: dir * 600,
              vy: 0,
              maxDistance: 550,
              width: 40,
              height: 18,
              color: '#00E676',
              damage: this.attackDamage,
              life: 1.4
            });
          }
        });
      }
    }
    else {
      // Pink aerial dive swoop + dual flower bomb drop
      projectiles.spawn({
        isPlayer: false,
        type: 'petal',
        x: spawnX,
        y: spawnY,
        vx: dir * 240,
        vy: 320,
        maxDistance: 450,
        width: 26,
        height: 26,
        color: '#FF80AB',
        damage: this.attackDamage,
        life: 1.3,
        rotates: true,
        vRot: 5
      });
      projectiles.spawn({
        isPlayer: false,
        type: 'petal',
        x: spawnX - dir * 24,
        y: spawnY - 10,
        vx: dir * 180,
        vy: 340,
        maxDistance: 450,
        width: 26,
        height: 26,
        color: '#FF80AB',
        damage: this.attackDamage,
        life: 1.3,
        rotates: true,
        vRot: -5
      });
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

    // Phase 2 Evolution Aura
    if (this.isPhase2) {
      ctx.save();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, -28, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Monster Sprite
    if (this.image.complete && this.image.naturalWidth > 0) {
      const drawSize = this.isPhase2 ? 72 : 64;
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
    if (this.hp >= this.maxHp) return;
    const barW = 44;
    const barH = 5;
    const x = this.x - barW / 2;
    const y = this.y - 68;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);

    const ratio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = this.config.color;
    ctx.fillRect(x, y, barW * ratio, barH);
    ctx.restore();
  }
}
