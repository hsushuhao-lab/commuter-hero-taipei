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

    // Collectibles & Evolution (Commuter Resonance)
    this.coins = 0;
    this.coffeeSpeedTimer = 0;
    this.easyCards = 0;
    this.hasUnlockedUlt = false; // 15 金幣永久解鎖
    this.form2Active = false;    // 45 金幣覺醒第二型態

    // New item buffs
    this.waterShieldTimer = 0;
    this.raindrops = 0;
    this.cookingSparkTimer = 0;

    // EasyCard Dash (E / touch button)
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
    // 咖啡固定回復 25 HP（HP 上限 100），不提供移速 Buff
    if (this.hp < 100) {
      this.hp = Math.min(100, this.hp + 25);
      audio.playPowerup();
      particles.emit({
        x: this.x,
        y: this.y - 40,
        vy: -40,
        size: 7,
        color: '#4CAF50',
        life: 0.8,
        shape: 'star'
      });
    } else {
      // 若滿血拾取，轉換為短暫受擊保護 0.5s，不得增加移速
      this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.5);
      audio.playPowerup();
      particles.emit({
        x: this.x,
        y: this.y - 40,
        vy: -40,
        size: 6,
        color: '#FFE082',
        life: 0.6,
        shape: 'spark'
      });
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
    if (this.invulnerableTimer > 0 || this.isUlting || this.isDead || this.dashTimer > 0) return false;

    // 1. Water shield absorbs hit
    if (this.waterShieldTimer > 0) {
      this.waterShieldTimer = 0;
      audio.playPowerup();
      particles.emitHitSparks(this.x, this.y - 30, '#00E5FF', 16);
      return false;
    }

    // 2. Shakira ult shield absorbs hit
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
    if (this.isUlting || this.isDead) return;
    if (this.skillCooldown > 0) return;
    
    // 設定角色獨立 CD
    const charCooldown = this.charConfig.stats.skillCooldown || 0.35;
    this.skillCooldown = charCooldown;
    this.isAttacking = true;
    this.attackTimer = 0.16;
    this.animState = 'attack';
    this.animTimer = 0;

    audio.playSkill(this.id);

    const spawnX = this.x + this.facing * 35;
    const spawnY = this.y - 35;
    const damageMult = (this.cookingSparkTimer > 0 ? 1.5 : 1.0) * (this.form2Active ? 1.3 : 1.0);

    if (this.id === 'yu') {
      // 禹志晨：雨傘風壓斬 (中近距離防守反擊型)
      // 前方 150px、80° 弧形、反彈半徑 175px (Form 2 增至 200px)
      const isF2 = this.form2Active;
      const deflectRadius = isF2 ? 200 : 175;
      
      // Deflect enemy bullets in front within 175px/200px
      for (let i = projectiles.projectiles.length - 1; i >= 0; i--) {
        const p = projectiles.projectiles[i];
        if (!p.isPlayer) {
          const dx = p.x - this.x;
          const dy = p.y - spawnY;
          const dist = Math.hypot(dx, dy);
          // Only in front of player (same direction)
          if (dist <= deflectRadius && dx * this.facing > 0) {
            particles.emitHitSparks(p.x, p.y, '#00E5FF', 8);
            projectiles.projectiles.splice(i, 1);
          }
        }
      }

      projectiles.spawn({
        isPlayer: true,
        type: 'wind_blade',
        x: spawnX,
        y: spawnY,
        vx: this.facing * 430,
        vy: 0,
        maxDistance: 150, // 嚴格限制前方 150px
        width: isF2 ? 55 : 36,
        height: isF2 ? 55 : 36,
        damage: this.charConfig.skill.damage * damageMult,
        life: 0.35,
        penetrating: isF2,
        canClearEnemyBullets: true
      });
    } else if (this.id === 'shakira') {
      // 夏奇拉：美乃滋噴射・蛋能雙彈 (遠程範圍型)
      // 射程 500px、雙發、爆炸半徑 60px、CD 0.45s
      [-12, 12].forEach((offsetY) => {
        projectiles.spawn({
          isPlayer: true,
          type: 'egg',
          x: spawnX,
          y: spawnY + offsetY,
          vx: this.facing * 500,
          vy: offsetY * 1.5,
          maxDistance: 500, // 嚴格限制最大射程 500px
          width: 22,
          height: 18,
          damage: (this.charConfig.skill.damage * 0.55) * damageMult,
          life: 1.0
        });
      });
    } else {
      // 珊卓澎：爆炒上菜・鐵鍋重擊 (近戰擊退型)
      // 平底鍋本體前方 140px，鍋氣震波 240px，扇形 105°，CD 0.55s
      const isF2 = this.form2Active;
      projectiles.spawn({
        isPlayer: true,
        type: 'pan_wave',
        x: spawnX,
        y: spawnY,
        vx: this.facing * 480,
        vy: 0,
        maxDistance: 240, // 鍋氣 shockwave 最大 240px
        width: isF2 ? 60 : 42,
        height: isF2 ? 60 : 42,
        damage: this.charConfig.skill.damage * damageMult,
        life: 0.50,
        penetrating: isF2
      });
    }
  }

  triggerUltimate() {
    // 15 金幣永久解鎖，解鎖後不扣幣！只受冷卻限制！
    if (this.coins < 15 || this.ultCooldown > 0 || this.isUlting || this.isDead) return;

    this.ultCooldown = this.charConfig.stats.ultCooldown || 7.0;
    this.isUlting = true;
    this.ultTimer = this.charConfig.ult.duration || 1.2;
    this.ultCutinTimer = 0.65; // Anime Cut-in 0.65s 特寫與時停
    this.invulnerableTimer = this.charConfig.ult.duration || 1.2;
    this.animState = 'ultimate';
    this.animTimer = 0;

    audio.playUltCutin();

    // After cut-in ends, execute actual ultimate unleash
    setTimeout(() => {
      audio.playUltRelease(this.id);
      projectiles.clearEnemyProjectiles(); // 清屏消除敵彈

      const isF2 = this.form2Active;
      const dmgBonus = isF2 ? 1.4 : 1.0;

      if (this.id === 'yu') {
        // 禹志晨大招：最多突進 650px，1.2 秒無敵，風刃沿突進走廊作用
        this.vx = this.facing * 750;
        const bladeCount = isF2 ? 8 : 6;
        for (let i = 0; i < bladeCount; i++) {
          setTimeout(() => {
            projectiles.spawn({
              isPlayer: true,
              type: 'wind_blade',
              x: this.x + (Math.random() * 40 - 20),
              y: this.y - 65 + i * 14,
              vx: this.facing * 520,
              vy: (Math.random() - 0.5) * 40,
              maxDistance: 450,
              width: isF2 ? 55 : 44,
              height: isF2 ? 55 : 44,
              damage: 26 * dmgBonus,
              life: 0.65,
              penetrating: true,
              canClearEnemyBullets: true
            });
          }, i * 60);
        }
      } 
      else if (this.id === 'shakira') {
        // 夏奇拉大招：以自身為中心 800~900px 戰區傾瀉流星蛋雨，回復 30/40 HP
        this.addHp(isF2 ? 40 : 30);
        this.shieldTimer = isF2 ? 4.0 : 3.0;
        const eggCount = isF2 ? 14 : 10;
        for (let i = 0; i < eggCount; i++) {
          setTimeout(() => {
            const spawnOffsetX = (Math.random() - 0.5) * 800; // 800px 範圍
            projectiles.spawn({
              isPlayer: true,
              type: 'egg',
              x: this.x + spawnOffsetX,
              y: this.y - 300,
              vx: (Math.random() - 0.5) * 80,
              vy: 520,
              maxDistance: 450,
              width: 26,
              height: 22,
              damage: 22 * dmgBonus,
              life: 0.85,
              penetrating: true
            });
          }, i * 60);
        }
      } 
      else {
        // 珊卓澎大招：旋風核心半徑 320px，14 道鍋氣各最大飛行 370px
        const waveCount = 14;
        for (let i = 0; i < waveCount; i++) {
          const ang = i * (Math.PI * 2 / waveCount);
          projectiles.spawn({
            isPlayer: true,
            type: 'pan_wave',
            x: this.x,
            y: this.y - 40,
            vx: Math.cos(ang) * 480,
            vy: Math.sin(ang) * 480,
            maxDistance: 370, // 最大飛行 370px
            width: isF2 ? 50 : 38,
            height: isF2 ? 50 : 38,
            damage: 24 * dmgBonus,
            life: 0.65,
            penetrating: true
          });
        }
        if (isF2) {
          // Form 2 火龍波貫穿前方 450px
          projectiles.spawn({
            isPlayer: true,
            type: 'pan_wave',
            x: this.x + this.facing * 40,
            y: this.y - 40,
            vx: this.facing * 550,
            vy: 0,
            maxDistance: 450,
            width: 72,
            height: 72,
            damage: 48,
            life: 0.8,
            penetrating: true
          });
        }
      }
    }, 650);
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

    // Cut-in slowdown
    if (this.ultCutinTimer > 0) {
      this.ultCutinTimer -= dt;
      return;
    }

    // Cooldown updates
    if (this.skillCooldown > 0) this.skillCooldown -= dt;
    if (this.ultCooldown > 0) this.ultCooldown -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.waterShieldTimer > 0) this.waterShieldTimer -= dt;
    if (this.cookingSparkTimer > 0) this.cookingSparkTimer -= dt;

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
    const speedMult = this.dashTimer > 0 ? 2.2 : 1.0;
    const curSpeed = this.speed * speedMult;

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

    // Water Bubble Shield
    if (this.waterShieldTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
      ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -45, 52, 0, Math.PI * 2);
      ctx.fill();
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

    // Cooking Spark Buff Flame
    if (this.cookingSparkTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 109, 0, 0.35)';
      ctx.beginPath();
      ctx.arc(0, -35, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

    ctx.restore();
  }
}
