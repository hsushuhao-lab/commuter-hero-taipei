/**
 * 08點上班大作戰：通勤英雄篇 - 主程式 (main.js)
 * 流程：
 * MENU (主視覺立繪與標題) -> SELECT (寫實立繪與 Q 版 Chibi 對比選角) -> PLAYING (橫向卷軸冒險) -> BOSS -> VICTORY / GAMEOVER
 */

import { CHARACTERS } from './data/Characters.js';
import { audio } from './engine/Audio.js';
import { Camera } from './engine/Camera.js';
import { input } from './engine/Input.js';
import { Player } from './entities/Player.js';
import { Boss } from './entities/Boss.js';
import { projectiles } from './entities/Projectiles.js';
import { particles } from './entities/Particles.js';
import { PlatformManager } from './world/Platforms.js';
import { Level } from './world/Level.js';
import { hud } from './ui/HUD.js';
import { styleBibleUI } from './ui/StyleBible.js';
import { introCinematic } from './ui/Intro.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.vw = 960;
    this.vh = 540;
    this.canvas.width = this.vw;
    this.canvas.height = this.vh;

    this.state = 'MENU'; // MENU, INTRO, SELECT, PLAYING, VICTORY_RUN, VICTORY, GAMEOVER
    this.selectedCharId = 'yu';

    this.camera = new Camera(this.vw, this.vh);
    this.pm = new PlatformManager();
    this.level = new Level(this.pm);
    this.camera.setBounds(0, this.level.totalLength, 0, 200);
    this.player = new Player(this.selectedCharId);
    this.boss = new Boss();
    this.boss.minions = this.level.monsters;

    // Victory sequence tracking & Watchdog
    this.victoryTimer = 0;
    this.victorySubState = '';
    this.victoryPunchTimer = 0;
    this.bossDeadTimer = 0;
    this.watchdogTriggerCount = 0;

    // Commuter Resonance Milestone announcements
    this.milestoneBanner = null;
    this.milestoneBannerTimer = 0;
    this.announcedMilestones = {};

    // Joystick touch tracking
    this.joystickPointerId = null;

    // Assets for Menu
    this.menuKeyart = new Image();
    this.menuKeyart.src = 'assets/menu_keyart.jpg';

    // Time tracking
    this.lastTime = performance.now();
    this.animationFrameId = null;

    this.initEvents();
    this.resizeCanvas();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Space / Enter / Escape to skip Intro
    window.addEventListener('keydown', (e) => {
      if (this.state === 'INTRO') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
          introCinematic.skip();
        }
      }
    });

    // Tab toggle Style Bible
    input.onToggleStyleBible = () => {
      styleBibleUI.toggle();
    };

    // Canvas pointerdown
    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.vw / rect.width;
      const scaleY = this.vh / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      this.handlePointerDown(mx, my, e);
    });

    // Canvas pointermove for analog virtual joystick
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.joystickPointerId !== null && e.pointerId === this.joystickPointerId && (this.state === 'PLAYING' || this.state === 'VICTORY_RUN')) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.vw / rect.width;
        const scaleY = this.vh / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        hud.updateJoystick(mx, my, true);
        input.setJoystick(hud.joystick.normX, hud.joystick.normY);
      }
    });

    // Canvas pointerup / cancel
    const endPointer = (e) => {
      if (e && e.pointerId === this.joystickPointerId) {
        this.joystickPointerId = null;
        hud.resetJoystick();
        input.resetJoystick();
      }
      input.touchLeft = false;
      input.touchRight = false;
      input.touchJump = false;
      input.touchSkill = false;
      input.touchUlt = false;
      input.touchDash = false;
    };

    this.canvas.addEventListener('pointerup', endPointer);
    this.canvas.addEventListener('pointercancel', endPointer);
  }

  resizeCanvas() {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const aspect = this.vw / this.vh;

    let targetW = windowW;
    let targetH = windowW / aspect;

    if (targetH > windowH) {
      targetH = windowH;
      targetW = windowH * aspect;
    }

    this.canvas.style.width = `${Math.floor(targetW)}px`;
    this.canvas.style.height = `${Math.floor(targetH)}px`;
  }

  handlePointerDown(mx, my) {
    audio.ensureContext();

    // If Style Bible is open
    if (styleBibleUI.isOpen) {
      // Check tab clicks or close click
      const pad = 36;
      const modalW = this.vw - pad * 2;
      const modalH = this.vh - pad * 2;
      const tabW = modalW / 5;
      if (my >= pad + 44 && my <= pad + 80) {
        const tabIdx = Math.floor((mx - pad) / tabW);
        if (tabIdx >= 0 && tabIdx < 5) styleBibleUI.setTab(tabIdx);
      }
      // Close button
      if (mx >= pad + modalW - 40 && mx <= pad + modalW && my >= pad && my <= pad + 40) {
        styleBibleUI.toggle();
      }
      // If activeTab is 3 (Art Sheets), check thumbnail click or main preview click
      if (styleBibleUI.activeTab === 3 && my > pad + 85) {
        const previewW = modalW - 220;
        const thumbX = pad + 20 + previewW + 15;
        if (mx >= thumbX && mx <= pad + modalW - 20) {
          const thumbH = 34;
          const clickedIdx = Math.floor((my - (pad + 115)) / (thumbH + 6));
          if (clickedIdx >= 0 && clickedIdx < 8) {
            styleBibleUI.selectedArtSheet = clickedIdx;
          }
        } else if (mx >= pad + 20 && mx <= pad + 20 + previewW) {
          styleBibleUI.nextSheet();
        }
      }
      return;
    }

    // Top Right TAB button in HUD
    if (mx >= hud.btnBible.x && mx <= hud.btnBible.x + hud.btnBible.w &&
        my >= hud.btnBible.y && my <= hud.btnBible.y + hud.btnBible.h) {
      styleBibleUI.toggle();
      return;
    }

    if (this.state === 'INTRO') {
      // Top right skip button: x: vw - 140, y: 18, w: 120, h: 34
      if (mx >= this.vw - 140 && mx <= this.vw - 20 && my >= 18 && my <= 52) {
        introCinematic.skip();
      } else {
        introCinematic.nextAct();
      }
      return;
    }

    if (this.state === 'MENU') {
      // 1. Start Game Button
      if (mx >= 350 && mx <= 610 && my >= 340 && my <= 392) {
        this.state = 'SELECT';
        audio.playCoin();
      }
      // 2. Watch Intro Button
      else if (mx >= 350 && mx <= 610 && my >= 402 && my <= 452) {
        this.state = 'INTRO';
        introCinematic.start(() => {
          this.state = 'SELECT';
        });
        audio.playCoin();
      }
      // 3. Style Bible Button
      else if (mx >= 380 && mx <= 580 && my >= 462 && my <= 505) {
        styleBibleUI.toggle();
      }
    } 
    else if (this.state === 'SELECT') {
      // 3 Hero cards: Yu, Shakira, Sandra
      const cardW = 260;
      const cardH = 340;
      const cardY = 110;
      const heroes = ['yu', 'shakira', 'sandra'];

      heroes.forEach((hId, idx) => {
        const cardX = 60 + idx * 290;
        if (mx >= cardX && mx <= cardX + cardW && my >= cardY && my <= cardY + cardH) {
          this.selectedCharId = hId;
          audio.playSkill(hId);
        }
      });

      // Confirm & Start Game
      if (mx >= 380 && mx <= 580 && my >= 470 && my <= 520) {
        this.startGame();
      }
    } 
    else if (this.state === 'PLAYING') {
      // Check Virtual Joystick touch / click
      const jDist = Math.hypot(mx - hud.joystick.baseX, my - hud.joystick.baseY);
      if (jDist <= hud.joystick.radius + 35) {
        this.joystickPointerId = e ? e.pointerId : 1;
        hud.updateJoystick(mx, my, true);
        input.setJoystick(hud.joystick.normX, hud.joystick.normY);
        return;
      }

      // Mobile touch action buttons
      const hitCircle = (btn, x, y) => Math.hypot(x - (btn.x + btn.w / 2), y - (btn.y + btn.h / 2)) <= btn.w / 2 + 10;

      if (hitCircle(hud.btnJump, mx, my)) {
        input.touchJump = true;
        input.jumpBufferTime = performance.now();
      }
      if (hitCircle(hud.btnSkill, mx, my)) input.touchSkill = true;
      if (hitCircle(hud.btnUlt, mx, my)) input.touchUlt = true;
      if (hitCircle(hud.btnDash, mx, my)) input.touchDash = true;

      // Check Game Over retry click
      if (hud.isGameOver) {
        this.startGame();
      }
    }
    else if (this.state === 'VICTORY') {
      if (hud.isVictory) {
        this.startGame();
      }
    }
    else if (this.state === 'VICTORY_RUN') {
      // Tap screen to accelerate to final report
      if (this.victoryTimer > 2.0) {
        this.victoryTimer = 10.0;
      }
    }
  }

  startGame() {
    this.state = 'PLAYING';
    this.player = new Player(this.selectedCharId);
    this.pm.reset();
    this.level.buildLevelGeometry();
    this.camera.setBounds(0, this.level.totalLength, 0, 200);
    this.camera.setTarget(this.player);
    this.boss = new Boss();
    this.boss.minions = this.level.monsters;
    projectiles.reset();
    particles.reset();
    hud.reset();
    input.reset();
    this.victoryTimer = 0;
    this.victorySubState = '';
    this.victoryPunchTimer = 0;
    this.bossDeadTimer = 0;
    this.watchdogTriggerCount = 0;
    this.milestoneBanner = null;
    this.milestoneBannerTimer = 0;
    this.announcedMilestones = {};
    this.joystickPointerId = null;

    audio.playBgm('city_pop');
  }

  start() {
    this.lastTime = performance.now();
    const loop = (time) => {
      const dt = Math.min(0.05, (time - this.lastTime) / 1000);
      this.lastTime = time;

      this.update(dt);
      this.render();

      input.endFrame();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  update(dt) {
    if (this.state === 'INTRO') {
      introCinematic.update(dt);
      return;
    }

    if (this.state === 'PLAYING') {
      // Update Entities & World
      this.player.update(dt, input, this.pm.platforms);
      this.camera.update(dt);
      this.level.update(dt, this.player, this.camera);
      this.pm.update(dt, this.player);

      // Check Boss Arena trigger (Arena is at 14800 ~ 16500)
      if (this.player.x >= 14700 && !this.boss.isDead) {
        this.boss.update(dt, this.player, this.camera);
        if (this.boss.phase === 2 && audio.currentBgmType !== 'boss_p2') {
          audio.playBgm('boss_p2');
        } else if (this.boss.phase === 1 && audio.currentBgmType !== 'boss_p1') {
          audio.playBgm('boss_p1');
        }
      } else if (this.player.x >= 7000 && this.player.x < 10500) {
        // Stage 3 rainy park
        if (audio.currentBgmType !== 'rainy_park') audio.playBgm('rainy_park');
      } else if (this.player.x < 7000 || (this.player.x >= 10500 && this.player.x < 14700)) {
        if (audio.currentBgmType !== 'city_pop') audio.playBgm('city_pop');
      }

      // Commuter Resonance Milestone Announcement checks
      const c = this.player.coins;
      if (c >= 15 && !this.announcedMilestones[15]) {
        this.announcedMilestones[15] = true;
        this.milestoneBanner = '⚔️ 通勤共振 15 幣：大招已永久解鎖！[F / K]';
        this.milestoneBannerTimer = 3.2;
      } else if (c >= 30 && !this.announcedMilestones[30]) {
        this.announcedMilestones[30] = true;
        this.milestoneBanner = '👹 通勤共振 30 幣：全場怪獸進化至 PHASE 2！';
        this.milestoneBannerTimer = 3.2;
      } else if (c >= 45 && !this.announcedMilestones[45]) {
        this.announcedMilestones[45] = true;
        this.milestoneBanner = '🌟 通勤共振 45 幣：主角覺醒第二型態！捷運幽靈現身！';
        this.milestoneBannerTimer = 3.2;
      } else if (c >= 60 && !this.announcedMilestones[60]) {
        this.announcedMilestones[60] = true;
        this.milestoneBanner = '🔥 通勤共振 60 幣：夢影巨花王狂暴盛開！稀有掉落率翻倍！';
        this.milestoneBannerTimer = 3.2;
      }
      if (this.milestoneBannerTimer > 0) {
        this.milestoneBannerTimer -= dt;
      }

      // Check Projectile Collisions
      this.handleCollisions(dt);

      // Boss Arena Gate: x = 16500 blocks entrance while Boss is alive
      if (!this.boss.isDead) {
        this.pm.arenaGateActive = true;
        if (this.player.x > 16500) {
          this.player.x = 16500;
          this.player.vx = 0;
        }
      } else {
        this.pm.arenaGateActive = false;
        this.bossDeadTimer += dt;
        if (this.bossDeadTimer > 10.0 && this.state !== 'VICTORY') {
          this.watchdogTriggerCount++;
          console.error('WATCHDOG TRIGGERED: Boss dead for >10s without VICTORY! Auto-recovering player to clock machine.');
          this.player.x = 17650;
          if (this.pm.clockInMachine) {
            this.pm.clockInMachine.punched = true;
            this.pm.clockInMachine.punchedTimeText = hud.getFormattedClockTime();
          }
          this.state = 'VICTORY';
          hud.triggerVictory(this.player);
          return;
        }
      }

      projectiles.update(dt);
      particles.update(dt);
      hud.update(dt, this.player, this.boss);

      // Boss Defeated Check -> Transition to VICTORY_RUN animation!
      if (this.boss.isDead && !this.player.isDead) {
        this.state = 'VICTORY_RUN';
        this.victoryTimer = 0;
        this.victorySubState = 'BOSS_BURST';
        // Clear remaining monster projectiles for celebratory sprint
        projectiles.projectiles = projectiles.projectiles.filter(p => p.isPlayer);
      }
    }
    else if (this.state === 'VICTORY_RUN') {
      this.updateVictoryRun(dt);
    }
  }

  updateVictoryRun(dt) {
    this.victoryTimer += dt;
    this.bossDeadTimer += dt;

    // 10-Second Watchdog Protection (Guaranteed recovery if ever obstructed)
    if (this.bossDeadTimer > 10.0 && this.state !== 'VICTORY') {
      this.watchdogTriggerCount++;
      console.error('WATCHDOG TRIGGERED: Victory Run exceeded 10s! Auto-completing to clock machine.');
      this.player.x = 17650;
      if (this.pm.clockInMachine) {
        this.pm.clockInMachine.punched = true;
        this.pm.clockInMachine.punchedTimeText = hud.getFormattedClockTime();
      }
      this.state = 'VICTORY';
      hud.triggerVictory(this.player);
      return;
    }

    this.boss.update(dt, this.player, this.camera);
    particles.update(dt);
    this.pm.update(dt, this.player);
    this.camera.update(dt);

    // Seven to Nine Beat Victory Flow
    if (this.victorySubState === 'BOSS_BURST') {
      // Beat 1 & 2 (0.0 ~ 0.8s): Boss floral burst, clearance of all enemy projectiles
      projectiles.projectiles = projectiles.projectiles.filter(p => p.isPlayer);
      if (this.victoryTimer >= 0.8) {
        // Beat 3: Hospital entrance barrier unlocks
        this.pm.arenaGateActive = false;
        this.victorySubState = 'SPRINT_TO_CLOCK';
        this.player.facing = 1;
        this.player.animState = 'run';
        this.milestoneBanner = '🎉 擊破巨花王！火速衝入松德大廳打卡！';
        this.milestoneBannerTimer = 3.0;
      }
    } 
    else if (this.victorySubState === 'SPRINT_TO_CLOCK') {
      // Beat 4 & 5 (0.8s ~): Auto-sprints past 16500 into interior hospital lobby towards clock at x = 17650
      this.player.facing = 1;
      this.player.animState = 'run';
      this.player.vx = 1100; // Rapid celebratory sprint
      this.player.x += this.player.vx * dt;
      this.player.updateAnimation(dt);

      // Emit high-speed particle trail
      if (Math.random() < 0.8) {
        particles.emitDust(this.player.x - 20, this.player.y, 6, '#00E5FF');
      }

      // Reached punch clock interaction zone at x = 17630 ~ 17650
      if (this.player.x >= 17630) {
        this.player.x = 17630;
        this.player.vx = 0;
        this.player.vy = -250;
        this.victorySubState = 'PUNCH_CLOCK';
        this.victoryPunchTimer = 0;

        // Beat 6: Character-specific signature punch actions
        if (this.player.id === 'yu') {
          // Yu: folds umbrella, pushes glasses, right-hand punch, sighs with relief
          this.player.animState = 'attack';
          particles.emitHitSparks(this.player.x, this.player.y - 45, '#4FC3F7', 16);
          particles.emitFloatingText(this.player.x, this.player.y - 75, '準時打卡！', '#4FC3F7');
        } else if (this.player.id === 'shakira') {
          // Shakira: Mayo magic sparkles disperse, joyful double-arm cheer, jump-punch
          this.player.animState = 'attack';
          particles.emitHitSparks(this.player.x, this.player.y - 35, '#FFD54F', 18);
          particles.emitFloatingText(this.player.x, this.player.y - 75, '元氣抵達！', '#FFD54F');
        } else {
          // Sandra: fire extinguishes, stores skillet, wipes brow, hearty slam punch
          this.player.animState = 'attack';
          particles.emitHitSparks(this.player.x, this.player.y - 40, '#FF7043', 18);
          particles.emitFloatingText(this.player.x, this.player.y - 75, '搶秒成功！', '#FF7043');
        }

        // Beat 7: Stamp clock machine with dynamic real clock time!
        const clockTime = hud.getFormattedClockTime();
        if (this.pm.clockInMachine) {
          this.pm.clockInMachine.punched = true;
          this.pm.clockInMachine.punchedTimeText = clockTime;
        }
        hud.punchedTimeText = clockTime;
        audio.playStamp();
        this.camera.shake(10, 0.45);

        // Huge celebratory fireworks & beacon burst at 17650
        particles.emitHitSparks(17650, this.player.y - 50, '#00E676', 60);
        particles.emitCoinSparkle(17650, this.player.y - 80);
        for (let i = 0; i < 90; i++) {
          particles.emit({
            x: 17650,
            y: this.player.y - 60,
            vx: (Math.random() - 0.5) * 500,
            vy: -Math.random() * 400 - 90,
            size: Math.random() * 9 + 4,
            color: ['#00E676', '#FFD700', '#00E5FF', '#FF4081', '#76FF03', '#FFFFFF'][Math.floor(Math.random() * 6)],
            life: 3.2,
            shape: 'star'
          });
        }
      }
    } 
    else if (this.victorySubState === 'PUNCH_CLOCK') {
      this.victoryPunchTimer = (this.victoryPunchTimer || 0) + dt;
      this.player.vy += 820 * dt;
      this.player.y += this.player.vy * dt;
      if (this.player.y >= 520) {
        this.player.y = 520;
        this.player.vy = 0;
        this.player.animState = 'victory';
        this.victorySubState = 'VICTORY_CELEBRATE';
      }
      this.player.updateAnimation(dt);
    } 
    else if (this.victorySubState === 'VICTORY_CELEBRATE') {
      // Beat 8: Continuous hospital lobby celebration confetti & victory pose
      this.player.animState = 'victory';
      this.player.updateAnimation(dt);

      if (Math.random() < 0.6) {
        particles.emit({
          x: 17450 + Math.random() * 350,
          y: 40 + Math.random() * 60,
          vx: (Math.random() - 0.5) * 60,
          vy: Math.random() * 80 + 60,
          size: Math.random() * 7 + 3,
          color: ['#FFD700', '#00E676', '#00E5FF', '#FF4081', '#FFFFFF'][Math.floor(Math.random() * 5)],
          life: 2.2,
          shape: 'star'
        });
      }

      // Beat 9 (5.2s+): Transition to final victory score screen
      if (this.victoryTimer >= 5.2) {
        this.state = 'VICTORY';
        hud.triggerVictory(this.player);
      }
    }
  }

  handleCollisions(dt = 0.016) {
    const p = this.player;

    // 1. Player Projectiles vs Monsters & Boss
    for (let proj of projectiles.projectiles) {
      if (!proj.isPlayer) continue;

      // vs Monsters
      for (let m of this.level.monsters) {
        if (m.isDead) continue;
        if (Math.hypot(proj.x - m.x, proj.y - (m.y - 25)) < proj.width + 25) {
          m.takeDamage(proj.damage);
          if (!proj.penetrating) proj.life = 0;
        }
      }

      // vs Boss (Arena is at 14800 ~ 16500)
      if (this.player.x >= 14600 && !this.boss.isDead) {
        if (Math.hypot(proj.x - this.boss.x, proj.y - (this.boss.y - 120)) < proj.width + 90) {
          this.boss.takeDamage(proj.damage);
          if (!proj.penetrating) proj.life = 0;
        }
      }
    }

    // 2. Enemy Projectiles vs Player
    for (let proj of projectiles.projectiles) {
      if (proj.isPlayer) continue;
      if (Math.hypot(proj.x - p.x, proj.y - (p.y - 35)) < proj.width + 22) {
        p.takeDamage(proj.damage);
        proj.life = 0;
      }
    }

    // 3. Shakira Form 2 Mayo Orbs Collision
    if (p.form2Active && p.mayoOrbs && p.mayoOrbs.length > 0) {
      const orbs = p.getMayoOrbsWorld();
      for (let orb of orbs) {
        // Absorb enemy bullets
        for (let proj of projectiles.projectiles) {
          if (!proj.isPlayer && Math.hypot(proj.x - orb.x, proj.y - orb.y) < orb.radius + proj.width) {
            proj.life = 0;
            particles.emitHitSparks(orb.x, orb.y, '#FFD54F', 6);
          }
        }
        // Damage monsters touching orbs
        for (let m of this.level.monsters) {
          if (!m.isDead && Math.hypot(m.x - orb.x, (m.y - 25) - orb.y) < orb.radius + 25) {
            m.takeDamage(15 * dt * 30);
          }
        }
      }
    }

    // 4. Monster Contact vs Player
    for (let m of this.level.monsters) {
      if (m.isDead) continue;
      if (Math.hypot(m.x - p.x, (m.y - 25) - (p.y - 35)) < 36) {
        p.takeDamage(m.config.contactDamage);
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.vw, this.vh);

    if (this.state === 'INTRO') {
      introCinematic.render(this.ctx, this.vw, this.vh);
      return;
    }

    if (this.state === 'MENU') {
      this.renderMenu();
    } else if (this.state === 'SELECT') {
      this.renderSelect();
    } else {
      // PLAYING, VICTORY_RUN, VICTORY, GAMEOVER
      // 1. Parallax Backgrounds
      this.level.renderBackgrounds(this.ctx, this.camera);

      // 2. Camera World Viewport
      this.camera.apply(this.ctx);

      this.pm.render(this.ctx, this.camera);
      this.level.renderMonsters(this.ctx, this.camera);
      if (this.player.x >= 10400 || this.state === 'VICTORY_RUN' || this.state === 'VICTORY') {
        this.boss.render(this.ctx);
      }
      this.player.render(this.ctx);
      projectiles.render(this.ctx);
      particles.render(this.ctx);

      this.camera.restore(this.ctx);

      // 3. Screen-Space HUD & UI
      hud.render(this.ctx, this.player, this.boss, this.level, this.camera);

      // Commuter Resonance Floating Milestone Banner
      if (this.milestoneBannerTimer > 0 && this.milestoneBanner) {
        this.renderMilestoneBanner(this.milestoneBanner);
      }

      // 4. Cinematic Victory Run Banner Overlay
      if (this.state === 'VICTORY_RUN') {
        if (this.victorySubState === 'BOSS_BURST') {
          this.renderVictoryBanner('⚡ 魔王崩解！晨霧散去！快奔向松德院區大廳打卡！');
        } else if (this.victorySubState === 'SPRINT_TO_CLOCK') {
          this.renderVictoryBanner('🏃 晨衝倒數！全力衝入松德醫院大廳打卡機！');
        } else if (this.victorySubState === 'PUNCH_CLOCK' || this.victorySubState === 'VICTORY_CELEBRATE') {
          this.renderVictoryBanner('🎉 07:58:24 打卡成功！ON TIME！準時上班大成功！');
        }
      }
    }

    // 5. Style Bible Modal Overlay
    styleBibleUI.render(this.ctx, this.vw, this.vh);
  }

  renderMilestoneBanner(text) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(25, 15, 45, 0.88)';
    ctx.fillRect(80, 80, this.vw - 160, 42);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, this.vw - 160, 42);

    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 16px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.fillText(text, this.vw / 2, 101);
    ctx.restore();
  }

  renderVictoryBanner(text) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 20, 40, 0.85)';
    ctx.fillRect(0, 85, this.vw, 46);
    ctx.strokeStyle = '#00E676';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 85, this.vw, 46);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00E676';
    ctx.shadowBlur = 12;
    ctx.fillText(text, this.vw / 2, 108);
    ctx.restore();
  }

  renderMenu() {
    const ctx = this.ctx;
    // Draw Keyart
    if (this.menuKeyart.complete && this.menuKeyart.naturalWidth > 0) {
      ctx.drawImage(this.menuKeyart, 0, 0, this.vw, this.vh);
    } else {
      ctx.fillStyle = '#1A237E';
      ctx.fillRect(0, 0, this.vw, this.vh);
    }

    // Dark gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, this.vh);
    grad.addColorStop(0, 'rgba(10, 20, 40, 0.4)');
    grad.addColorStop(0.7, 'rgba(10, 20, 40, 0.75)');
    grad.addColorStop(1, 'rgba(10, 20, 40, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.vw, this.vh);

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 42px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fillText('08點上班大作戰：通勤英雄篇', this.vw / 2, 145);

    ctx.fillStyle = '#81D4FA';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('—— 象山晨衝・奔向松德 ——', this.vw / 2, 192);

    ctx.fillStyle = '#ECEFF1';
    ctx.font = '14px sans-serif';
    ctx.fillText('台北 08:00 晨間通勤冒險 × 奇幻花系怪獸大作戰', this.vw / 2, 235);

    // 1. Start Game Button
    ctx.fillStyle = '#0288D1';
    ctx.fillRect(350, 340, 260, 52);
    ctx.strokeStyle = '#B3E5FC';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(350, 340, 260, 52);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('出發上班！開始遊戲', this.vw / 2, 366);

    // 2. Watch Intro Button (人物與怪獸開頭動畫)
    ctx.fillStyle = 'rgba(233, 30, 99, 0.75)';
    ctx.fillRect(350, 402, 260, 48);
    ctx.strokeStyle = '#FF80AB';
    ctx.lineWidth = 2;
    ctx.strokeRect(350, 402, 260, 48);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🎬 開篇序幕 (人物與怪獸介紹)', this.vw / 2, 426);

    // 3. Style Bible Button
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(380, 462, 200, 42);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.strokeRect(380, 462, 200, 42);
    ctx.fillStyle = '#FFF';
    ctx.font = '14px sans-serif';
    ctx.fillText('企劃與設定集 [TAB]', this.vw / 2, 483);

    ctx.restore();
  }

  renderSelect() {
    const ctx = this.ctx;
    ctx.fillStyle = '#101726';
    ctx.fillRect(0, 0, this.vw, this.vh);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('選擇你的通勤英雄', this.vw / 2, 50);

    ctx.fillStyle = '#B0BEC5';
    ctx.font = '13px sans-serif';
    ctx.fillText('寫實立繪與高解析 Q 版 Chibi 對比・每位英雄具備專屬小招與 Anime 大招', this.vw / 2, 75);

    const cardW = 260;
    const cardH = 350;
    const cardY = 95;
    const heroes = [CHARACTERS.yu, CHARACTERS.shakira, CHARACTERS.sandra];

    heroes.forEach((h, idx) => {
      const cardX = 60 + idx * 290;
      const isSelected = this.selectedCharId === h.id;

      // Card Background
      ctx.fillStyle = isSelected ? 'rgba(33, 150, 243, 0.25)' : 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = isSelected ? '#00E5FF' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Hero Name & Role
      ctx.fillStyle = isSelected ? '#FFF' : '#B0BEC5';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(h.name, cardX + cardW / 2, cardY + 35);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = h.colors.secondary;
      ctx.fillText(h.role, cardX + cardW / 2, cardY + 55);

      // Chibi Preview Area (256x256 frame 0)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(cardX + 20, cardY + 70, cardW - 40, 130);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeRect(cardX + 20, cardY + 70, cardW - 40, 130);

      // Draw clean Chibi
      if (this.player.spriteSheet && this.player.spriteSheet.complete) {
        // Sample chibi
        const img = new Image();
        img.src = h.cleanChibi;
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, cardX + cardW / 2 - 40, cardY + 75, 80, 120);
        }
      }

      // Skill & Ult Summary
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#ECEFF1';
      ctx.fillText(`小招: ${h.skill.name}`, cardX + cardW / 2, cardY + 225);
      ctx.fillStyle = '#FFD54F';
      ctx.fillText(`大招: ${h.ult.name}`, cardX + cardW / 2, cardY + 248);

      // Stats
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#90A4AE';
      ctx.fillText(`HP: ${h.stats.maxHp} | 移速: ${h.stats.speed}`, cardX + cardW / 2, cardY + 280);

      // Select Status
      if (isSelected) {
        ctx.fillStyle = '#00E676';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('✓ 已選取 (點擊下方開始)', cardX + cardW / 2, cardY + 325);
      } else {
        ctx.fillStyle = '#B0BEC5';
        ctx.font = '13px sans-serif';
        ctx.fillText('點擊選取', cardX + cardW / 2, cardY + 325);
      }
    });

    // Start Game Button
    ctx.fillStyle = '#00C853';
    ctx.fillRect(380, 470, 200, 50);
    ctx.strokeStyle = '#B9F6CA';
    ctx.lineWidth = 2;
    ctx.strokeRect(380, 470, 200, 50);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('進入台北晨間冒險', this.vw / 2, 502);

    ctx.restore();
  }
}

window.CommuterGame = {
  Game,
  Player,
  Boss,
  Level,
  STAGES,
  CHARACTERS,
  MONSTERS,
  BOSS_CONFIG,
  hud,
  PlatformManager,
  projectiles,
  particles,
  input,
  audio
};

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.activeGame = game;
  game.start();
});
