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
  constructor(typeKey, x, y) {
    this.config = MONSTER_TYPES[typeKey] || MONSTER_TYPES.red;
    this.typeKey = typeKey;
    this.x = x;
    this.y = y;
    this.originX = x;
    this.originY = y;
    this.vx = 0;
    this.vy = 0;

    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.width = 54;
    this.height = 54;
    this.facing = -1;

    // AI & Attack Timers
    this.attackCooldownTimer = Math.random() * 1.5; // Staggered first attack
    this.isTelegraphing = false;
    this.telegraphTimer = 0;
    this.telegraphDuration = this.config.telegraphDuration || 0.42;

    // Visual & State
    this.isDead = false;
    this.hitTimer = 0;
    this.bobTimer = Math.random() * Math.PI * 2;

    // Image
    this.image = new Image();
    this.image.src = this.config.asset;
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

  update(dt, player) {
    if (this.isDead) return;

    this.bobTimer += dt * 3;
    if (this.hitTimer > 0) this.hitTimer -= dt;

    // Face player
    this.facing = player.x < this.x ? -1 : 1;

    // Patrol / Float behavior
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);

    if (this.config.type === 'flying') {
      // Sinusoidal floating
      this.y = this.originY + Math.sin(this.bobTimer) * 20;
      if (distToPlayer < 450 && !this.isTelegraphing) {
        this.vx = this.facing * this.config.speed * 0.7;
      } else {
        this.vx = 0;
      }
    } else {
      // Ground patrol
      if (distToPlayer < 400 && !this.isTelegraphing) {
        this.vx = this.facing * this.config.speed;
      } else {
        this.vx = 0;
      }
    }

    this.x += this.vx * dt;

    // Handle Attack & Telegraph
    if (distToPlayer < 500) {
      if (this.isTelegraphing) {
        this.telegraphTimer += dt;
        if (this.telegraphTimer >= this.telegraphDuration) {
          this.executeAttack(player);
          this.isTelegraphing = false;
          this.telegraphTimer = 0;
          this.attackCooldownTimer = this.config.attackCooldown;
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
      // Line spike projectile
      projectiles.spawn({
        isPlayer: false,
        type: 'petal',
        x: spawnX,
        y: spawnY,
        vx: dir * 360,
        vy: 0,
        width: 22,
        height: 12,
        color: '#FF5252',
        damage: this.config.attackDamage,
        life: 1.2
      });
    } 
    else if (this.typeKey === 'ice') {
      // Ground shockwave
      projectiles.spawn({
        isPlayer: false,
        type: 'pan_wave',
        x: spawnX,
        y: this.y,
        vx: dir * 300,
        vy: 0,
        width: 32,
        height: 24,
        color: '#40C4FF',
        damage: this.config.attackDamage,
        life: 0.9
      });
    }
    else if (this.typeKey === 'grape') {
      // Parabolic toxic bubble
      projectiles.spawn({
        isPlayer: false,
        type: 'petal',
        x: spawnX,
        y: spawnY - 10,
        vx: dir * 220,
        vy: -150,
        width: 18,
        height: 18,
        color: '#BA68C8',
        damage: this.config.attackDamage,
        life: 1.5,
        rotates: true,
        vRot: 4
      });
    }
    else if (this.typeKey === 'blue') {
      // High speed water blade
      projectiles.spawn({
        isPlayer: false,
        type: 'wind_blade',
        x: spawnX,
        y: spawnY,
        vx: dir * 460,
        vy: 0,
        width: 26,
        height: 20,
        color: '#00E5FF',
        damage: this.config.attackDamage,
        life: 0.8
      });
    }
    else if (this.typeKey === 'yellow') {
      // Golden fan 3 petals
      for (let i = -1; i <= 1; i++) {
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: spawnX,
          y: spawnY,
          vx: dir * 280,
          vy: i * 80,
          width: 20,
          height: 14,
          color: '#FFD700',
          damage: this.config.attackDamage,
          life: 1.4,
          rotates: true,
          vRot: 3
        });
      }
    }
    else if (this.typeKey === 'obsidian') {
      // Heavy ground slam shockwave
      projectiles.spawn({
        isPlayer: false,
        type: 'pan_wave',
        x: spawnX,
        y: this.y,
        vx: dir * 240,
        vy: 0,
        width: 44,
        height: 36,
        color: '#3949AB',
        damage: this.config.attackDamage,
        life: 1.2
      });
    }
    else {
      // Pink dive swoop
      projectiles.spawn({
        isPlayer: false,
        type: 'petal',
        x: spawnX,
        y: spawnY,
        vx: dir * 320,
        vy: 120,
        width: 20,
        height: 16,
        color: '#FF80AB',
        damage: this.config.attackDamage,
        life: 1.0,
        rotates: true,
        vRot: 5
      });
    }
  }

  render(ctx) {
    if (this.isDead) return;

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

    // Monster Sprite
    if (this.image.complete && this.image.naturalWidth > 0) {
      const drawSize = 64;
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
      // Red targeting laser line
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + dir * 350, startY);
      ctx.stroke();
    } 
    else if (this.typeKey === 'ice') {
      // Expanding ice circle at feet
      ctx.lineWidth = 2;
      const radius = 20 + progress * 50;
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    else if (this.typeKey === 'grape') {
      // Purple lob trajectory
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(startX + dir * 120, startY - 120, startX + dir * 240, this.y);
      ctx.stroke();
    }
    else if (this.typeKey === 'blue') {
      // Water blade line
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + dir * 280, startY);
      ctx.stroke();
    }
    else if (this.typeKey === 'yellow') {
      // Golden petal fan sector
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const angleCenter = dir > 0 ? 0 : Math.PI;
      ctx.arc(startX, startY, 260, angleCenter - 0.25, angleCenter + 0.25);
      ctx.closePath();
      ctx.globalAlpha = alpha * 0.25;
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }
    else if (this.typeKey === 'obsidian') {
      // Ground danger tremor zone
      ctx.lineWidth = 3;
      const zoneW = 220;
      ctx.strokeRect(dir > 0 ? this.x : this.x - zoneW, this.y - 10, zoneW, 20);
    }
    else {
      // Pink dive trajectory
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX + dir * 260, startY + 120);
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
