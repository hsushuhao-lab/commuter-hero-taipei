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

    // Collectibles & Ultimate Unlock
    this.coins = 0;
    this.coffeeSpeedTimer = 0;
    this.easyCards = 0;
    this.hasUnlockedUlt = false; // 15 金幣永久解鎖

    // Cooldowns
    this.skillCooldown = 0;
    this.ultCooldown = 0;

    // Active Action States
    this.isAttacking = false;
    this.attackTimer = 0;
    this.isUlting = false;
    this.ultTimer = 0;
    this.ultCutinTimer = 0; // Cut-in freeze/slowdown

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

  addCoins(amount = 1) {
    this.coins += amount;
    if (this.coins >= 6 && !this.hasUnlockedUlt) {
      this.hasUnlockedUlt = true; // 6 枚金幣永久解鎖！
      particles.emitCoinSparkle(this.x, this.y - 40);
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
    this.coffeeSpeedTimer = 5.0; // 5 秒移動加速 25%
    particles.emitDust(this.x, this.y, 8, '#795548');
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0 || this.isUlting || this.isDead) return false;
    if (this.shieldTimer > 0) {
      // Shield absorbs hit
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
    if (this.isUlting || this.isDead) return;
    if (this.skillCooldown > 0) return; // 80ms 自動連發緩衝（按住連續發射，點擊瞬發）
    this.skillCooldown = 0.08;
    this.isAttacking = true;
    this.attackTimer = 0.14;
    this.animState = 'attack';
    this.animTimer = 0;

    audio.playSkill(this.id);

    // Spawn character unique projectiles
    const spawnX = this.x + this.facing * 35;
    const spawnY = this.y - 35;

    if (this.id === 'yu') {
      // Umbrella wind slash: wide piercing wind blade
      projectiles.spawn({
        isPlayer: true,
        type: 'wind_blade',
        x: spawnX,
        y: spawnY,
        vx: this.facing * 680,
        vy: 0,
        width: 36,
        height: 36,
        damage: this.charConfig.skill.damage,
        life: 1.2,
        canClearEnemyBullets: true
      });
    } else if (this.id === 'shakira') {
      // Twin egg shots rapid stream
      projectiles.spawn({
        isPlayer: true,
        type: 'egg',
        x: spawnX,
        y: spawnY - 6,
        vx: this.facing * 720,
        vy: -20,
        width: 20,
        height: 16,
        damage: this.charConfig.skill.damage * 0.6,
        life: 1.2
      });
      projectiles.spawn({
        isPlayer: true,
        type: 'egg',
        x: spawnX,
        y: spawnY + 6,
        vx: this.facing * 700,
        vy: 20,
        width: 20,
        height: 16,
        damage: this.charConfig.skill.damage * 0.6,
        life: 1.2
      });
    } else {
      // Sandra: Heavy skillet bash + fiery shockwave
      projectiles.spawn({
        isPlayer: true,
        type: 'pan_wave',
        x: spawnX,
        y: spawnY,
        vx: this.facing * 580,
        vy: 0,
        width: 42,
        height: 42,
        damage: this.charConfig.skill.damage,
        life: 1.0
      });
    }
  }

  triggerUltimate() {
    // 6 金幣永久解鎖，解鎖後不扣幣！只受冷卻限制！
    if (this.coins < 6 || this.ultCooldown > 0 || this.isUlting || this.isDead) return;

    this.ultCooldown = this.charConfig.ult.cooldown;
    this.isUlting = true;
    this.ultTimer = this.charConfig.ult.duration;
    this.ultCutinTimer = 0.65; // Anime Cut-in 0.65s 特寫與時停
    this.invulnerableTimer = this.charConfig.ult.duration; // 大招期間無敵
    this.animState = 'ultimate';
    this.animTimer = 0;

    audio.playUltCutin();

    // After cut-in ends, execute actual ultimate unleash
    setTimeout(() => {
      audio.playUltRelease(this.id);
      projectiles.clearEnemyProjectiles(); // 清屏消除敵彈

      const midX = this.x;
      const midY = this.y - 40;

      if (this.id === 'yu') {
        // High speed dash forward + 7 massive wind blades
        this.vx = this.facing * 750;
        for (let i = 0; i < 7; i++) {
          setTimeout(() => {
            projectiles.spawn({
              isPlayer: true,
              type: 'wind_blade',
              x: this.x + (Math.random() * 60 - 30),
              y: this.y - 70 + i * 18,
              vx: this.facing * 650,
              vy: (Math.random() - 0.5) * 60,
              width: 48,
              height: 48,
              damage: 28,
              life: 0.8,
              penetrating: true,
              canClearEnemyBullets: true
            });
          }, i * 70);
        }
      } 
      else if (this.id === 'shakira') {
        // Soft boiled egg meteor rain + 30 HP heal + 3s shield
        this.addHp(30);
        this.shieldTimer = 3.5;
        for (let i = 0; i < 12; i++) {
          setTimeout(() => {
            projectiles.spawn({
              isPlayer: true,
              type: 'egg',
              x: this.x - 200 + i * 40,
              y: this.y - 300,
              vx: 60 + (Math.random() - 0.5) * 40,
              vy: 550,
              width: 24,
              height: 20,
              damage: 22,
              life: 0.9,
              penetrating: true
            });
          }, i * 60);
        }
      } 
      else {
        // Sandra: 14 fiery cyclone blades outward 360 deg
        for (let i = 0; i < 14; i++) {
          const ang = i * (Math.PI * 2 / 14);
          projectiles.spawn({
            isPlayer: true,
            type: 'pan_wave',
            x: midX,
            y: midY,
            vx: Math.cos(ang) * 480,
            vy: Math.sin(ang) * 480,
            width: 40,
            height: 40,
            damage: 24,
            life: 0.7,
            penetrating: true
          });
        }
      }
    }, 650);
  }

  update(dt, input, platforms) {
    if (this.isDead) return;

    // Hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // Cut-in slowdown
    if (this.ultCutinTimer > 0) {
      this.ultCutinTimer -= dt;
      return;
    }

    // Cooldown updates
    if (this.skillCooldown > 0) this.skillCooldown -= dt;
    if (this.ultCooldown > 0) this.ultCooldown -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.coffeeSpeedTimer > 0) this.coffeeSpeedTimer -= dt;

    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.isAttacking = false;
    }
    if (this.isUlting) {
      this.ultTimer -= dt;
      if (this.ultTimer <= 0) this.isUlting = false;
    }

    // Handle Movement Input
    const speedMult = this.coffeeSpeedTimer > 0 ? 1.25 : 1.0;
    const curSpeed = this.speed * speedMult;

    if (input.isLeft()) {
      this.vx = -curSpeed;
      this.facing = -1;
    } else if (input.isRight()) {
      this.vx = curSpeed;
      this.facing = 1;
    } else {
      this.vx *= 0.75; // Friction
      if (Math.abs(this.vx) < 10) this.vx = 0;
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
          break;
        }
      }
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

    ctx.restore();
  }
}
