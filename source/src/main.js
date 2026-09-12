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
import { Level, STAGES } from './world/Level.js';
import { MONSTER_TYPES as MONSTERS, BOSS_CONFIG } from './data/Monsters.js';
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
    this.punchedCount = 0;

    // v9.3: Companion state for Victory Run (the other two heroes rush in!)
    this.companions = [];         // [{id, x, y, vx, facing, animPhase, dialogueTimer, dialogueText, dialogueColor}]
    this.dialogueBubbles = [];    // active speech bubbles
    this.celebrationTimer = 0;
    this.confettiTimer = 0;

    // Commuter Resonance Milestone announcements
    this.milestoneBanner = null;
    this.milestoneBannerTimer = 0;
    this.announcedMilestones = {};

    // v9.4: Boss entrance cinematic tracking
    this.bossEntranceDone = false;

    // Joystick touch tracking
    this.joystickPointerId = null;

    // Assets for Menu
    this.menuKeyart = new Image();
    this.menuKeyart.src = 'assets/menu_keyart.jpg';

    // v9.4: Preload chibi sprites for victory companion rendering
    this.chibiImages = {};
    ['yu', 'shakira', 'sandra'].forEach(id => {
      const img = new Image();
      img.src = `assets/chibi_${id}_clean.png`;
      this.chibiImages[id] = img;
    });

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
    this.bossEntranceDone = false;  // v9.4: reset boss entrance for new game
    this.joystickPointerId = null;
    // v9.3: Reset companions & celebration state
    this.companions = [];
    this.dialogueBubbles = [];
    this.celebrationTimer = 0;
    this.confettiTimer = 0;
    this.punchedCount = 0;
    this._playerPunched = false;
    this._comp1Punched = false;
    this._comp2Punched = false;

    // v9.5 BGM Rule: commute_theme along the entire route (Scenes 1–4)
    audio.playBgm('commute_theme');
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
      if (this.player.fallTimePenalty > 0) {
        hud.timeRemaining = Math.max(0, hud.timeRemaining - this.player.fallTimePenalty);
        this.player.fallTimePenalty = 0;
      }
      this.camera.update(dt);
      this.level.update(dt, this.player, this.camera);
      this.pm.update(dt, this.player);

      // Check Boss Arena trigger (Arena entrance at x >= 14700)
      if (this.player.x >= 14700 && !this.boss.isDead) {
        // v9.4: Show boss entrance banner (first time only)
        if (!this.bossEntranceDone && this.player.x >= 14750) {
          this.bossEntranceDone = true;
          this.milestoneBanner = '🌹 夢影巨花王現身！準備迎戰！';
          this.milestoneBannerTimer = 3.5;
        }
        this.boss.update(dt, this.player, this.camera);
        // v9.5 BGM Rule: Single boss_theme for entire boss battle (P2 layers intensity via setBossIntensity)
        if (audio.currentBgmType !== 'boss_theme') {
          audio.playBgm('boss_theme');
        }
      } else if (this.player.x < 14700) {
        // v9.5 BGM Rule: Scenes 1–4 strictly keep commute_theme (no rainy_park or city_pop switch)
        if (audio.currentBgmType !== 'commute_theme') {
          audio.playBgm('commute_theme');
        }
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
        this.milestoneBanner = '🌟 通勤共振 45 幣：主角覺醒第二型態！戰力全面強化！';
        this.milestoneBannerTimer = 3.2;
      } else if (c >= 60 && !this.announcedMilestones[60]) {
        this.announcedMilestones[60] = true;
        this.milestoneBanner = '🔥 通勤共振 60 幣：夢影巨花王狂暴共振！難度提升！';
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
          this.punchedCount = 3;
          if (this.pm.clockInMachine) {
            this.pm.clockInMachine.punched = true;
            this.pm.clockInMachine.punchedCount = 3;
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
        this.punchedCount = 0;
        this._playerPunched = false;
        this._comp1Punched = false;
        this._comp2Punched = false;
        // v9.5 BGM Rule: fade to victory_theme
        audio.fadeToVictory(0.6);
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

    // 20-Second Watchdog Protection (accommodates full companion ceremony sequence)
    if (this.bossDeadTimer > 20.0 && this.state !== 'VICTORY') {
      this.watchdogTriggerCount++;
      console.error('WATCHDOG TRIGGERED: Victory Run exceeded 20s! Auto-completing to clock machine.');
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

    // Update dialogue bubble lifetimes
    for (let i = this.dialogueBubbles.length - 1; i >= 0; i--) {
      this.dialogueBubbles[i].life -= dt;
      if (this.dialogueBubbles[i].life <= 0) {
        this.dialogueBubbles.splice(i, 1);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: BOSS_BURST (0.0 ~ 0.8s) – Boss floral burst, clear projectiles
    // ═══════════════════════════════════════════════════════════════
    if (this.victorySubState === 'BOSS_BURST') {
      projectiles.projectiles = projectiles.projectiles.filter(p => p.isPlayer);

      if (this.victoryTimer >= 0.8) {
        // Open hospital gate
        this.pm.arenaGateActive = false;
        this.victorySubState = 'COMPANION_RUSH';
        this.victoryTimer = 0;

        // Determine which companions should appear (the two NOT selected)
        const allIds = ['yu', 'shakira', 'sandra'];
        const companionIds = allIds.filter(id => id !== this.player.id);
        this.companions = companionIds.map((id, idx) => ({
          id,
          x: this.player.x - 320 - idx * 80, // Spawn 300-400px behind player for dramatic run-up
          y: 520,
          vx: 1400 + idx * 80, // Fast rush speed
          facing: 1,
          animPhase: 'run',
          dialogueSent: false
        }));

        this.milestoneBanner = '🎉 擊破巨花王！夥伴們趕來會合！衝入松德大廳打卡！';
        this.milestoneBannerTimer = 4.0;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: COMPANION_RUSH (0.0 ~ 2.0s) – Companions sprint from left
    // ═══════════════════════════════════════════════════════════════
    else if (this.victorySubState === 'COMPANION_RUSH') {
      // Player waits in place (triumphant idle)
      this.player.facing = -1; // Looking back towards companions
      this.player.animState = 'idle';
      this.player.updateAnimation(dt);

      // Move companions toward player
      let allArrived = true;
      for (const comp of this.companions) {
        const targetX = this.player.x - 90 - (this.companions.indexOf(comp)) * 70;
        if (comp.x < targetX - 10) {
          comp.x += comp.vx * dt;
          comp.x = Math.min(comp.x, targetX);
          allArrived = false;

          // Companion run trail particles
          const colors = { yu: '#29B6F6', shakira: '#CE93D8', sandra: '#FF7043' };
          if (Math.random() < 0.6) {
            particles.emitDust(comp.x - 15, comp.y, 4, colors[comp.id] || '#FFD700');
          }
        } else {
          comp.x = targetX;
          comp.vx = 0;
          comp.animPhase = 'arrive';
        }
      }

      // Arrival celebration particles
      if (Math.random() < 0.3) {
        particles.emit({
          x: this.player.x + (Math.random() * 200 - 100),
          y: this.player.y - Math.random() * 80,
          vx: (Math.random() - 0.5) * 80,
          vy: -Math.random() * 60 - 20,
          size: 5 + Math.random() * 4,
          color: ['#00E5FF', '#FFD700', '#FF80AB', '#76FF03'][Math.floor(Math.random() * 4)],
          life: 0.8,
          shape: 'star'
        });
      }

      if (allArrived && this.victoryTimer >= 1.2) {
        this.victorySubState = 'DIALOGUE';
        this.victoryTimer = 0;
        this.player.facing = 1; // Face right again

        // Trigger dialogue bubbles – character-specific lines!
        const dialogues = [
          { id: 'yu',     text: '呼……眼鏡差點歪掉，但路通了！', color: '#29B6F6', delay: 0.1 },
          { id: 'shakira', text: '太棒了！大家快跟上，還差最後幾十秒！', color: '#CE93D8', delay: 0.9 },
          { id: 'sandra', text: '平底鍋都快炒焦啦，最後衝刺衝啊——！', color: '#FF7043', delay: 1.7 }
        ];
        this._scheduledDialogues = dialogues;
        this._dialogueElapsed = 0;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: DIALOGUE (0.0 ~ 3.5s) – Speech bubbles
    // ═══════════════════════════════════════════════════════════════
    else if (this.victorySubState === 'DIALOGUE') {
      this._dialogueElapsed = (this._dialogueElapsed || 0) + dt;

      // Spawn dialogue bubbles at scheduled times
      if (this._scheduledDialogues) {
        for (let i = this._scheduledDialogues.length - 1; i >= 0; i--) {
          const d = this._scheduledDialogues[i];
          if (this._dialogueElapsed >= d.delay) {
            // Find speaker position
            let speakerX = this.player.x;
            let speakerY = this.player.y;
            if (d.id !== this.player.id) {
              const comp = this.companions.find(c => c.id === d.id);
              if (comp) { speakerX = comp.x; speakerY = comp.y; }
            }

            this.dialogueBubbles.push({
              x: speakerX,
              y: speakerY,
              text: d.text,
              color: d.color,
              life: 2.8,
              maxLife: 2.8,
              speakerId: d.id
            });
            audio.playCoin(); // Short chime for each line
            this._scheduledDialogues.splice(i, 1);
          }
        }
      }

      // After all dialogues played + brief pause, transition to group sprint
      if (this._dialogueElapsed >= 3.5) {
        this.victorySubState = 'GROUP_SPRINT';
        this.victoryTimer = 0;
        this._scheduledDialogues = [];
        this.dialogueBubbles = [];

        // Set companions into sprint mode
        for (const comp of this.companions) {
          comp.vx = 1100;
          comp.animPhase = 'run';
        }
        this.milestoneBanner = '🏃‍♂️🏃‍♀️🏃 三人並肩衝刺！衝入松德醫院大廳打卡機！';
        this.milestoneBannerTimer = 3.0;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 4: GROUP_SPRINT (0.0 ~ reach x=17630) – All three sprint together
    // ═══════════════════════════════════════════════════════════════
    else if (this.victorySubState === 'GROUP_SPRINT') {
      // Player sprints
      this.player.facing = 1;
      this.player.animState = 'run';
      this.player.vx = 1100;
      this.player.x += this.player.vx * dt;
      this.player.updateAnimation(dt);

      // Companions sprint in formation
      const colors = { yu: '#29B6F6', shakira: '#AB47BC', sandra: '#FF5722' };
      for (const comp of this.companions) {
        comp.x += comp.vx * dt;
        comp.facing = 1;

        // Three-color sprint trails
        if (Math.random() < 0.8) {
          particles.emit({
            x: comp.x - 20,
            y: comp.y - 20 - Math.random() * 20,
            vx: -200 - Math.random() * 80,
            vy: (Math.random() - 0.5) * 40,
            size: 6 + Math.random() * 4,
            color: colors[comp.id] || '#FFD700',
            life: 0.4,
            shape: 'star',
            fade: true
          });
        }
      }

      // Player sprint trail
      if (Math.random() < 0.7) {
        const playerColor = colors[this.player.id] || '#00E5FF';
        particles.emitDust(this.player.x - 20, this.player.y, 5, playerColor);
        particles.emit({
          x: this.player.x - 15,
          y: this.player.y - 30,
          vx: -180 - Math.random() * 60,
          vy: (Math.random() - 0.5) * 30,
          size: 7,
          color: playerColor,
          life: 0.35,
          shape: 'slash'
        });
      }

      // Reached clock machine zone
      if (this.player.x >= 17630) {
        this.player.x = 17630;
        this.player.vx = 0;

        // Position companions slightly behind and to the sides
        const compSlots = [17570, 17510];
        this.companions.forEach((comp, idx) => {
          comp.x = compSlots[idx] || 17570;
          comp.vx = 0;
          comp.animPhase = 'idle';
        });

        this.victorySubState = 'PUNCH_PLAYER';
        this.victoryPunchTimer = 0;
        this.punchedCount = 0;
        this._playerPunched = false;
        this._comp1Punched = false;
        this._comp2Punched = false;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5.1: PUNCH_PLAYER – Selected Player punches clock (1/3)
    // ═══════════════════════════════════════════════════════════════
    else if (this.victorySubState === 'PUNCH_PLAYER') {
      this.victoryPunchTimer = (this.victoryPunchTimer || 0) + dt;
      if (!this._playerPunched) {
        this._playerPunched = true;
        this.punchedCount = 1;
        this.player.animState = 'attack';
        const clockTime = hud.getFormattedClockTime();
        if (this.pm.clockInMachine) {
          this.pm.clockInMachine.punched = true;
          this.pm.clockInMachine.punchedCount = 1;
          this.pm.clockInMachine.punchedTimeText = clockTime;
        }
        hud.punchedTimeText = clockTime;
        audio.playStamp();
        particles.emitHitSparks(17650, 480, '#00E676', 35);
        const pNames = { yu: '禹志晨', shakira: '夏奇拉', sandra: '珊卓澎' };
        const pColors = { yu: '#4FC3F7', shakira: '#FFD54F', sandra: '#FF7043' };
        particles.emitFloatingText(17630, 420, `【1/3】${pNames[this.player.id]} 打卡成功！`, pColors[this.player.id]);
      }

      if (this.victoryPunchTimer >= 0.55) {
        this.victorySubState = 'PUNCH_COMPANION_1';
        this.victoryPunchTimer = 0;
      }
      this.player.updateAnimation(dt);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5.2: PUNCH_COMPANION_1 – Companion 1 steps up and punches (2/3)
    // ═══════════════════════════════════════════════════════════════
    else if (this.victorySubState === 'PUNCH_COMPANION_1') {
      this.victoryPunchTimer = (this.victoryPunchTimer || 0) + dt;
      const comp1 = this.companions[0];
      if (comp1 && !this._comp1Punched) {
        this._comp1Punched = true;
        this.punchedCount = 2;
        comp1.x = 17640;
        comp1.animPhase = 'attack';
        if (this.pm.clockInMachine) {
          this.pm.clockInMachine.punchedCount = 2;
        }
        audio.playStamp();
        particles.emitHitSparks(17650, 480, '#00E676', 40);
        const compNames = { yu: '禹志晨', shakira: '夏奇拉', sandra: '珊卓澎' };
        const compColors = { yu: '#4FC3F7', shakira: '#FFD54F', sandra: '#FF7043' };
        particles.emitFloatingText(comp1.x, 420, `【2/3】${compNames[comp1.id]} 打卡成功！`, compColors[comp1.id]);
      }

      if (this.victoryPunchTimer >= 0.55) {
        this.victorySubState = 'PUNCH_COMPANION_2';
        this.victoryPunchTimer = 0;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5.3: PUNCH_COMPANION_2 – Companion 2 steps up and punches (3/3)
    // ═══════════════════════════════════════════════════════════════
    else if (this.victorySubState === 'PUNCH_COMPANION_2') {
      this.victoryPunchTimer = (this.victoryPunchTimer || 0) + dt;
      const comp2 = this.companions[1];
      if (comp2 && !this._comp2Punched) {
        this._comp2Punched = true;
        this.punchedCount = 3;
        comp2.x = 17650;
        comp2.animPhase = 'attack';
        if (this.pm.clockInMachine) {
          this.pm.clockInMachine.punchedCount = 3;
        }
        audio.playStamp();
        this.camera.shake(14, 0.6);
        particles.emitHitSparks(17650, 460, '#00E676', 70);
        particles.emitCoinSparkle(17650, 440);
        for (let i = 0; i < 90; i++) {
          particles.emit({
            x: 17650,
            y: 480,
            vx: (Math.random() - 0.5) * 550,
            vy: -Math.random() * 450 - 100,
            size: Math.random() * 8 + 4,
            color: ['#00E676', '#FFD700', '#00E5FF', '#FF4081', '#76FF03', '#FFFFFF'][Math.floor(Math.random() * 6)],
            life: 3.0,
            shape: 'star'
          });
        }
        const compNames = { yu: '禹志晨', shakira: '夏奇拉', sandra: '珊卓澎' };
        const compColors = { yu: '#4FC3F7', shakira: '#FFD54F', sandra: '#FF7043' };
        particles.emitFloatingText(comp2.x, 420, `【3/3】${compNames[comp2.id]} 打卡成功！`, compColors[comp2.id]);
        particles.emitFloatingText(17630, 360, '★ 3 / 3 PUNCHED！全體準時上班！', '#00E676');
      }

      if (this.victoryPunchTimer >= 0.75) {
        // Position companions nicely for final celebration group pose
        const compSlots = [17570, 17690];
        this.companions.forEach((comp, idx) => {
          comp.x = compSlots[idx] || 17570;
          comp.animPhase = 'celebrate';
        });
        this.player.x = 17630;
        this.player.animState = 'victory';
        this.victorySubState = 'VICTORY_CELEBRATE';
        this.celebrationTimer = 0;
        this.confettiTimer = 0;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 6: VICTORY_CELEBRATE (0.0 ~ 5.0s) – All three pose + confetti rain
    // ═══════════════════════════════════════════════════════════════
    else if (this.victorySubState === 'VICTORY_CELEBRATE') {
      this.celebrationTimer += dt;
      this.confettiTimer += dt;

      // Player victory pose
      this.player.animState = 'victory';
      this.player.updateAnimation(dt);

      // Five-color confetti rain from ceiling (高掛大廳天花板)
      if (Math.random() < 0.75) {
        particles.emit({
          x: 17200 + Math.random() * 600,
          y: 0 + Math.random() * 30,
          vx: (Math.random() - 0.5) * 80,
          vy: Math.random() * 100 + 80,
          size: Math.random() * 8 + 4,
          color: ['#FFD700', '#00E676', '#00E5FF', '#FF4081', '#FFFFFF', '#FF80AB', '#FF6D00', '#AEEA00'][Math.floor(Math.random() * 8)],
          life: 3.0,
          shape: Math.random() < 0.5 ? 'star' : 'petal',
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 4,
          gravity: 30,
          fade: true
        });
      }

      // Morning golden light rays (晨光金芒)
      if (this.celebrationTimer < 3.0 && Math.random() < 0.4) {
        particles.emit({
          x: 17630,
          y: 30,
          vx: (Math.random() - 0.5) * 150,
          vy: Math.random() * 120 + 60,
          size: 12 + Math.random() * 8,
          color: `rgba(255, ${180 + Math.floor(Math.random() * 75)}, 0, 0.6)`,
          life: 2.5,
          shape: 'star',
          gravity: 20
        });
      }

      // Unique character celebration quotes & poses
      if (this.celebrationTimer > 0.3 && this.celebrationTimer < 0.4) {
        // Cheering quotes
        const cheerQuotes = {
          yu: '收傘推眼鏡：「呼……總算在 08:00 前抵達。傘沒白撐！」',
          shakira: '雙手歡呼：「歐姆蛋的晨間魔法大成功！耶——！」',
          sandra: '收鍋擦汗：「火侯抓得剛剛好！今日便當準時上菜！」'
        };
        const cheerColors = { yu: '#29B6F6', shakira: '#AB47BC', sandra: '#FF5722' };
        
        particles.emitFloatingText(this.player.x, 390, cheerQuotes[this.player.id], cheerColors[this.player.id]);
        this.companions.forEach(c => {
          particles.emitFloatingText(c.x, 340, cheerQuotes[c.id], cheerColors[c.id]);
        });
      }

      // Floating golden victory text heading
      if (this.celebrationTimer > 0.8 && this.celebrationTimer < 0.9) {
        particles.emitFloatingText(17630, 290, '🎊 08:00 上班成功！全員準時通關！！', '#FFD700');
      }

      // Transition to final victory score screen at 5.0s
      if (this.celebrationTimer >= 5.0) {
        this.state = 'VICTORY';
        hud.triggerVictory(this.player, {
          punchedCount: this.punchedCount,
          falls: this.player.fallCount || 0,
          bossClearTime: this.boss.clearTime || 0
        });
      }
    }
  }

  // ─── Companion Q版 Chibi render helper (uses real chibi_*_clean.png) ──
  renderCompanions(ctx) {
    if (this.companions.length === 0) return;
    const CHIBI_W = 100;
    const CHIBI_H = 130;
    const CHARS = {
      yu:      { color: '#29B6F6', name: '禹志晨', accent: '#4FC3F7' },
      shakira: { color: '#AB47BC', name: '夏奇拉', accent: '#FFD54F' },
      sandra:  { color: '#FF5722', name: '珊卓澎', accent: '#FFA726' }
    };

    for (const comp of this.companions) {
      const sx = comp.x - this.camera.x;
      const sy = comp.y - CHIBI_H;   // feet at comp.y (world-space ground)
      const cfg = CHARS[comp.id] || CHARS.yu;
      const chibiImg = this.chibiImages && this.chibiImages[comp.id];

      ctx.save();
      ctx.scale(comp.facing, 1);  // flip left/right based on direction
      const drawX = comp.facing === 1 ? sx : -sx;

      // ── Shadow ellipse under feet ──
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(drawX, sy + CHIBI_H, CHIBI_W * 0.38, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // ── Draw chibi sprite or fallback ──
      if (chibiImg && chibiImg.complete && chibiImg.naturalWidth > 0) {
        // Celebration bob animation
        const bobOffset = this.victorySubState === 'VICTORY_CELEBRATE'
          ? Math.sin(performance.now() * 0.008 + comp.x * 0.01) * 6
          : 0;
        ctx.drawImage(chibiImg, drawX - CHIBI_W / 2, sy + bobOffset, CHIBI_W, CHIBI_H);

        // Colored glow ring during celebration
        if (this.victorySubState === 'VICTORY_CELEBRATE') {
          const glowAlpha = 0.3 + Math.sin(performance.now() * 0.006) * 0.2;
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth = 3;
          ctx.globalAlpha = glowAlpha;
          ctx.beginPath();
          ctx.ellipse(drawX, sy + CHIBI_H * 0.55, CHIBI_W * 0.45, CHIBI_H * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      } else {
        // Fallback silhouette (circle head + rect body)
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(drawX, sy + CHIBI_H * 0.3, CHIBI_W * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = cfg.accent;
        ctx.fillRect(drawX - CHIBI_W * 0.26, sy + CHIBI_H * 0.58, CHIBI_W * 0.52, CHIBI_H * 0.42);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.name[0], drawX, sy + CHIBI_H * 0.3);
      }

      // ── Character name label ──
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = cfg.color;
      ctx.font = 'bold 12px "PingFang SC", "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(cfg.name, drawX, sy + CHIBI_H + 2);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    // ── Also render the PLAYER using chibi sprite during victory ──
    if (this.victorySubState && this.victorySubState !== 'BOSS_BURST') {
      const p = this.player;
      const pChibi = this.chibiImages && this.chibiImages[p.id];
      if (pChibi && pChibi.complete && pChibi.naturalWidth > 0) {
        const sx = p.x - this.camera.x;
        const sy = p.y - CHIBI_H;
        ctx.save();
        const bobOffset = this.victorySubState === 'VICTORY_CELEBRATE'
          ? Math.sin(performance.now() * 0.008) * 8
          : 0;
        ctx.scale(p.facing, 1);
        const drawX = p.facing === 1 ? sx : -sx;
        ctx.drawImage(pChibi, drawX - CHIBI_W / 2, sy + bobOffset, CHIBI_W, CHIBI_H);
        // Player name
        const pCfg = CHARS[p.id];
        if (pCfg) {
          ctx.fillStyle = pCfg.color;
          ctx.font = 'bold 12px "PingFang SC", "Microsoft JhengHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 4;
          ctx.fillText(pCfg.name, drawX, sy + CHIBI_H + 2);
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }
    }
  }

  // ─── Speech bubble render ────────────────────────────────────────────
  renderDialogueBubbles(ctx) {
    for (const bub of this.dialogueBubbles) {
      const sx = bub.x - this.camera.x;
      const sy = bub.y - this.camera.y;
      const alpha = Math.min(1.0, bub.life / bub.maxLife);
      const bubY = sy - 110;
      const textWidth = Math.max(160, bub.text.length * 12);
      const bubW = textWidth + 24;
      const bubH = 36;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Bubble body
      ctx.fillStyle = 'rgba(10, 15, 30, 0.92)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(sx - bubW / 2, bubY, bubW, bubH, 8) : ctx.rect(sx - bubW / 2, bubY, bubW, bubH);
      ctx.fill();

      // Bubble border
      ctx.strokeStyle = bub.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tail triangle
      ctx.fillStyle = 'rgba(10, 15, 30, 0.92)';
      ctx.beginPath();
      ctx.moveTo(sx - 8, bubY + bubH);
      ctx.lineTo(sx + 8, bubY + bubH);
      ctx.lineTo(sx, bubY + bubH + 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = bub.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.fillStyle = bub.color;
      ctx.font = 'bold 13px "PingFang SC", "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = bub.color;
      ctx.shadowBlur = 4;
      ctx.fillText(bub.text, sx, bubY + bubH / 2);

      ctx.restore();
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

      // 4. Cinematic Victory Run Rendering (companions + speech bubbles)
      if (this.state === 'VICTORY_RUN') {
        // Render companion Chibi characters (screen-space coords)
        this.renderCompanions(this.ctx);

        // Render speech dialogue bubbles (screen-space coords)
        if (this.dialogueBubbles.length > 0) {
          this.renderDialogueBubbles(this.ctx);
        }

        // Victory banner text per sub-state
        if (this.victorySubState === 'BOSS_BURST') {
          this.renderVictoryBanner('⚡ 魔王崩解！晨霧散去！夥伴們趕來集合！');
        } else if (this.victorySubState === 'COMPANION_RUSH') {
          this.renderVictoryBanner('🏃 夥伴驚喜登場！一同奔向松德院區！');
        } else if (this.victorySubState === 'DIALOGUE') {
          this.renderVictoryBanner('💬 夥伴互動中……最後衝刺倒數！');
        } else if (this.victorySubState === 'GROUP_SPRINT') {
          this.renderVictoryBanner('🏃‍♂️🏃‍♀️🏃 三人並肩晨衝！全力奔向打卡機！');
        } else if (this.victorySubState === 'PUNCH_CLOCK' || this.victorySubState === 'VICTORY_CELEBRATE') {
          const clockText = hud.punchedTimeText || '08:00:00';
          this.renderVictoryBanner(`🎉 ${clockText} 打卡成功！ON TIME！準時上班大成功！`);
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
  Monster,
  MONSTER_TYPES,
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
