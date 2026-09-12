/**
 * 08點上班大作戰：通勤英雄篇 - 魔王：夢影巨花王 (Boss.js)
 * 規格要求：
 * - 專屬獨立魔王美術 (Phase 1 & Phase 2)
 * - 嚴格 1400px 連續平整戰場，絕對不可掉出地圖
 * - Phase 1 (1000 -> 501 HP) 扇形與旋轉彈幕、藤蔓刺
 * - Phase 2 (<= 500 HP) 狂暴盛開態：吼叫震動、Banner 提示、即時切換高 BPM BGM、360度螺旋彈幕、雙怪召喚
 * - 擊敗後觸發夢光碎裂與 Victory 結算
 */

import { BOSS_CONFIG } from '../data/Monsters.js';
import { audio } from '../engine/Audio.js';
import { particles } from './Particles.js';
import { projectiles } from './Projectiles.js';
import { Monster } from './Monster.js';

export class Boss {
  constructor() {
    this.config = BOSS_CONFIG;
    this.x = 6700; // Arena right side
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

    // Telegraph
    this.isTelegraphing = false;
    this.telegraphTimer = 0;
    this.telegraphType = 'none';

    // State
    this.isDead = false;
    this.hitTimer = 0;
    this.roarTimer = 0;

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

    // Check Phase 2 Trigger (<= 500 HP)
    if (this.hp <= this.config.phase2Threshold && !this.phase2Triggered) {
      this.triggerPhase2();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      audio.playBossRoar();
      // Massive explosion
      for (let i = 0; i < 60; i++) {
        particles.emit({
          x: this.x + (Math.random() * 200 - 100),
          y: this.y - Math.random() * 200,
          vx: (Math.random() * 2 - 1) * 260,
          vy: (Math.random() * 2 - 1) * 260,
          size: Math.random() * 8 + 4,
          color: Math.random() < 0.5 ? '#FF80AB' : '#E040FB',
          life: 2.0,
          shape: 'petal'
        });
      }
    }
  }

  triggerPhase2() {
    this.phase = 2;
    this.phase2Triggered = true;
    this.roarTimer = 1.8;

    audio.playBossRoar();
    audio.playBgm('boss_p2'); // 高速狂暴 BGM!

    // Screen-wide crimson petals burst
    for (let i = 0; i < 80; i++) {
      particles.emit({
        x: this.x + (Math.random() * 240 - 120),
        y: this.y - Math.random() * 200,
        vx: (Math.random() * 2 - 1) * 350,
        vy: -Math.random() * 300 - 50,
        size: Math.random() * 6 + 4,
        color: '#880E4F',
        life: 2.2,
        shape: 'petal'
      });
    }
  }

  update(dt, player, camera) {
    if (this.isDead) return;

    this.bobTimer += dt * (this.phase === 2 ? 3.5 : 2.0);
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.roarTimer > 0) {
      this.roarTimer -= dt;
      camera.shake(12, 0.1);
      return; // Roar freeze
    }

    // Facing player
    this.facing = player.x < this.x ? -1 : 1;

    // Floating animation
    const floatY = Math.sin(this.bobTimer) * (this.phase === 2 ? 18 : 10);
    this.y = this.config.arena.groundY + floatY;

    // Clamp inside 1400px flat arena bounds
    const minX = this.config.arena.startX + 200;
    const maxX = this.config.arena.endX - 100;
    this.x = Math.max(minX, Math.min(maxX, this.x));

    // Slow repositioning towards player
    const desiredX = player.x + (player.x < 6500 ? 380 : -380);
    this.x += (desiredX - this.x) * dt * (this.phase === 2 ? 0.8 : 0.4);

    // AI Attack Loop
    const currentConfig = this.phase === 2 ? this.config.phase2 : this.config.phase1;
    this.attackTimer -= dt;
    this.vineTimer -= dt;
    this.summonTimer -= dt;

    // Standard Petal Attack
    if (this.attackTimer <= 0) {
      this.attackTimer = currentConfig.attackCooldown;
      this.firePetalBarrage(player);
    }

    // Vine Ground Thrust
    if (this.vineTimer <= 0) {
      this.vineTimer = this.phase === 2 ? 3.2 : 4.8;
      this.triggerVineThrust(player);
    }

    // Monster Minion Summoning
    if (this.summonTimer <= 0) {
      this.summonTimer = currentConfig.summonCooldown;
      this.summonMinions();
    }
  }

  firePetalBarrage(player) {
    const pX = this.x;
    const pY = this.y - 120;
    const color = this.phase === 2 ? '#AD1457' : '#E91E63';
    const speed = this.phase === 2 ? 330 : 270;
    const dmg = this.phase === 2 ? this.config.phase2.petalDamage : this.config.phase1.petalDamage;

    if (this.phase === 1) {
      // 7-way wide fan spread
      const baseAngle = Math.atan2(player.y - pY, player.x - pX);
      for (let i = -3; i <= 3; i++) {
        const ang = baseAngle + i * 0.20;
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          width: 24,
          height: 16,
          color: color,
          damage: dmg,
          life: 2.5,
          rotates: true,
          vRot: 3
        });
      }
    } else {
      // Phase 2: 16-way Spiral Bullet Hell Ring + Target Needle
      for (let i = 0; i < 16; i++) {
        const ang = this.bobTimer * 2.5 + i * (Math.PI * 2 / 16);
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          width: 26,
          height: 18,
          color: color,
          damage: dmg,
          life: 2.8,
          rotates: true,
          vRot: 4
        });
      }
      // Targeted burst needle directly at player
      const directAngle = Math.atan2(player.y - pY, player.x - pX);
      for (let j = -1; j <= 1; j++) {
        projectiles.spawn({
          isPlayer: false,
          type: 'petal',
          x: pX,
          y: pY,
          vx: Math.cos(directAngle + j * 0.15) * (speed + 60),
          vy: Math.sin(directAngle + j * 0.15) * (speed + 60),
          width: 22,
          height: 14,
          color: '#FF1744',
          damage: dmg,
          life: 2.2
        });
      }
    }
    audio.playTelegraph();
  }

  triggerVineThrust(player) {
    const targetX = Math.max(this.config.arena.startX + 50, Math.min(this.config.arena.endX - 50, player.x));
    const groundY = this.config.arena.groundY;

    // Telegraph dust
    particles.emitDust(targetX, groundY, 8, '#4CAF50');

    if (this.phase === 1) {
      setTimeout(() => {
        projectiles.spawn({
          isPlayer: false,
          type: 'vine',
          x: targetX,
          y: groundY,
          vx: 0,
          vy: -440,
          width: 36,
          height: 80,
          damage: 10,
          life: 0.38
        });
        audio.playHit();
        particles.emitDust(targetX, groundY, 12, '#2E7D32');
      }, 380);
    } else {
      // Phase 2: Triple consecutive ground vines tracking player's stride!
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
              vy: -480,
              width: 38,
              height: 85,
              damage: 15,
              life: 0.40
            });
            audio.playHit();
            particles.emitDust(vx, groundY, 14, '#880E4F');
          }, 240);
        }, idx * 120);
      });
    }
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
      // Phase 2: Spawn 2~3 distinct monsters simultaneously!
      const types = ['ice', 'yellow', 'obsidian', 'pink', 'grape'];
      const t1 = types[Math.floor(Math.random() * types.length)];
      const t2 = 'grape';
      const m1 = new Monster(t1, this.x - 180, spawnY);
      const m2 = new Monster(t2, this.x - 90, spawnY - 50, true);
      this.minions.push(m1, m2);
      particles.emitDust(this.x - 180, spawnY, 14, '#880E4F');
    }
  }

  render(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    if (this.hitTimer > 0) {
      ctx.filter = 'brightness(1.9) drop-shadow(0 0 16px #E91E63)';
    }

    // Arena shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 90, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Render Boss Image
    const activeImg = (this.phase === 2 && this.imgPhase2.complete && this.imgPhase2.naturalWidth > 0) 
      ? this.imgPhase2 
      : this.imgPhase1;

    if (activeImg.complete && activeImg.naturalWidth > 0) {
      const dw = this.width;
      const dh = this.height;
      ctx.drawImage(activeImg, -dw / 2, -dh, dw, dh);
    } else {
      // Fallback
      ctx.fillStyle = this.phase === 2 ? '#880E4F' : '#E91E63';
      ctx.beginPath();
      ctx.arc(0, -110, 85, 0, Math.PI * 2);
      ctx.fill();
    }

    // Phase 2 Core Luminous Glow
    if (this.phase === 2) {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.45)';
      ctx.beginPath();
      ctx.arc(0, -120, 35 + Math.sin(this.bobTimer * 2) * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
