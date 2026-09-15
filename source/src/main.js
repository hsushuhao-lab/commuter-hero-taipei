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

const GAME_BUILD_VERSION = "v9.9.3";
const GAME_BUILD = Object.freeze({ version: GAME_BUILD_VERSION, status: "PI_REVIEW_REQUIRED", sha: "source-dev", builtAt: "source" });
if (typeof window !== "undefined") {
  window.__GAME_BUILD__ = window.__GAME_BUILD__ || GAME_BUILD;
  console.info("[GAME BUILD] " + window.__GAME_BUILD__.version + " " + window.__GAME_BUILD__.sha);
}

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.vw = 960;
    this.vh = 540;
    this.canvas.width = this.vw;
    this.canvas.height = this.vh;

    this.state = 'OPENING'; // OPENING, MENU, INTRO, SELECT, PLAYING, PAUSE, VICTORY_RUN, VICTORY, GAMEOVER
    this.selectedCharId = 'yu';
    // v9.9.0 Dual Mood: v9.8.5 is the immutable Hard-Core baseline.
    this.difficultyMode = 'hardcore';
    if (typeof window !== 'undefined') window.__GAME_MODE__ = 'HARDCORE';
    this.instructionsOpen = false;

    this.camera = new Camera(this.vw, this.vh);
    this.pm = new PlatformManager();
    this.level = new Level(this.pm);
    this.camera.setBounds(0, this.level.totalLength, 0, 200);
    this.player = new Player(this.selectedCharId);
    this.boss = new Boss();
    this.boss.minions = this.level.monsters;

    // Level entrance banner timer (3.0s skippable card)
    this.levelIntroTimer = 0;

    // Mobile multi-pointer tracking system
    this.activePointers = new Map(); // pointerId -> { type: 'joystick'|'left'|'right'|'jump'|'skill'|'ult'|'dash' }

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
    // v9.9.2: Once the boss encounter starts, the hero may retreat only a short distance.
    this.bossArenaLocked = false;
    this.bossRetreatMinX = BOSS_CONFIG.arena.startX - 150;

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

    this.heroSpriteSheets = {};
    ['yu', 'shakira', 'sandra'].forEach(id => {
      const img = new Image();
      img.src = CHARACTERS[id].animSheet;
      this.heroSpriteSheets[id] = img;
    });

    // Time tracking
    this.lastTime = performance.now();
    this.animationFrameId = null;

    this.initEvents();
    this.resizeCanvas();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Global keyboard handling for state shortcuts & navigation
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2') {
        window.DEBUG_HITBOX = !window.DEBUG_HITBOX;
        e.preventDefault();
        return;
      }
      // Shared instructions modal shortcut
      if (this.instructionsOpen) {
        if (e.code === 'Escape' || e.code === 'KeyH' || e.code === 'KeyI') this.instructionsOpen = false;
        return;
      }
      // Opening / Intro skip
      if (this.state === 'OPENING' || this.state === 'INTRO') {
        if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
          introCinematic.skip();
        }
      }
      // Main menu help
      else if (this.state === 'MENU') {
        if (e.code === 'KeyH' || e.code === 'KeyI') this.instructionsOpen = true;
      }
      // Character Select back to Menu
      else if (this.state === 'SELECT') {
        if (e.code === 'Escape' || e.code === 'Backspace') {
          this.state = 'MENU';
          audio.playCoin();
        }
      }
      // Playing: Level Intro skip or Pause toggle
      else if (this.state === 'PLAYING') {
        if (this.levelIntroTimer > 0) {
          this.levelIntroTimer = 0;
          return;
        }
        if (e.code === 'Escape' || e.code === 'KeyP') {
          this.state = 'PAUSE';
          audio.playCoin();
        }
      }
      // Pause Menu shortcuts: ESC/Resume, R/Restart, M/Home
      else if (this.state === 'PAUSE') {
        if (e.code === 'Escape') {
          this.state = 'PLAYING';
          audio.playCoin();
        } else if (e.code === 'KeyR') {
          this.startGame();
        } else if (e.code === 'KeyM') {
          this.state = 'MENU';
          audio.playCoin();
        } else if (e.code === 'KeyH' || e.code === 'KeyI') {
          this.instructionsOpen = true;
        }
      }
      // Victory or GameOver shortcuts: R/Retry, C/Reselect, M/Home
      else if (this.state === 'VICTORY' || this.state === 'GAMEOVER' || (this.state === 'PLAYING' && hud.isGameOver)) {
        if (e.code === 'KeyR') {
          this.startGame();
        } else if (e.code === 'KeyC') {
          this.state = 'SELECT';
          audio.playCoin();
        } else if (e.code === 'KeyM') {
          this.state = 'MENU';
          audio.playCoin();
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

      e.preventDefault();
      if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(e.pointerId);
      this.handlePointerDown(mx, my, e);
    });

    // Canvas pointermove for analog virtual joystick & touch tracking
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.vw / rect.width;
      const scaleY = this.vh / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      if (this.activePointers.has(e.pointerId)) {
        const info = this.activePointers.get(e.pointerId);
        if (info.type === 'joystick') {
          hud.updateJoystick(mx, my, true);
          input.setJoystick(hud.joystick.normX, hud.joystick.normY);
        } else if (info.type === 'left') {
          const inBtn = (mx >= hud.btnLeft.x - 20 && mx <= hud.btnLeft.x + hud.btnLeft.w + 20 && my >= hud.btnLeft.y - 20 && my <= hud.btnLeft.y + hud.btnLeft.h + 20);
          hud.btnLeft.isPressed = inBtn;
          input.touchLeft = inBtn;
        } else if (info.type === 'right') {
          const inBtn = (mx >= hud.btnRight.x - 20 && mx <= hud.btnRight.x + hud.btnRight.w + 20 && my >= hud.btnRight.y - 20 && my <= hud.btnRight.y + hud.btnRight.h + 20);
          hud.btnRight.isPressed = inBtn;
          input.touchRight = inBtn;
        }
      }
    });

    // Canvas pointerup / cancel - Multi-pointer independent release
    const endPointer = (e) => {
      if (!e) return;
      if (this.activePointers.has(e.pointerId)) {
        const info = this.activePointers.get(e.pointerId);
        if (info.type === 'joystick') {
          this.joystickPointerId = null;
          hud.resetJoystick();
          input.resetJoystick();
        } else if (info.type === 'left') {
          hud.btnLeft.isPressed = false;
          input.touchLeft = false;
        } else if (info.type === 'right') {
          hud.btnRight.isPressed = false;
          input.touchRight = false;
        } else if (info.type === 'jump') {
          hud.btnJump.isPressed = false;
          input.touchJump = false;
        } else if (info.type === 'skill') {
          hud.btnSkill.isPressed = false;
          input.touchSkill = false;
        } else if (info.type === 'ult') {
          hud.btnUlt.isPressed = false;
          input.touchUlt = false;
        } else if (info.type === 'dash') {
          hud.btnDash.isPressed = false;
          input.touchDash = false;
        }
        this.activePointers.delete(e.pointerId);
      }
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
    hud.updateLayout();
  }

  handlePointerDown(mx, my, e) {
    audio.ensureContext();

    // If Style Bible is open
    if (styleBibleUI.isOpen) {
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
          if (clickedIdx >= 0 && clickedIdx < 13) {
            styleBibleUI.selectedArtSheet = clickedIdx;
          }
        } else if (mx >= pad + 20 && mx <= pad + 20 + previewW) {
          styleBibleUI.nextSheet();
        }
      }
      return;
    }

    if (this.instructionsOpen) {
      if (mx >= this.vw / 2 - 85 && mx <= this.vw / 2 + 85 && my >= this.vh - 70 && my <= this.vh - 28) {
        this.instructionsOpen = false;
      }
      return;
    }

    // Opening / Intro Flow
    if (this.state === 'OPENING' || this.state === 'INTRO') {
      if (mx >= this.vw - 150 && mx <= this.vw - 15 && my >= 16 && my <= 52) {
        introCinematic.skip();
      } else {
        introCinematic.nextAct();
      }
      return;
    }

    // Main Menu Flow
    if (this.state === 'MENU') {
      // v9.9.0: select commute mood before character select.
      if (mx >= 225 && mx <= 465 && my >= 330 && my <= 392) {
        this.selectGameMode('chill');
      }
      else if (mx >= 495 && mx <= 735 && my >= 330 && my <= 392) {
        this.selectGameMode('hardcore');
      }
      // Watch Opening Button
      else if (mx >= 350 && mx <= 610 && my >= 402 && my <= 452) {
        this.state = 'OPENING';
        introCinematic.start(() => {
          this.state = 'MENU';
        });
        audio.playCoin();
      }
      // Game Instructions
      else if (mx >= 350 && mx <= 470 && my >= 462 && my <= 505) {
        this.instructionsOpen = true;
      }
      // Style Bible Button
      else if (mx >= 490 && mx <= 610 && my >= 462 && my <= 505) {
        styleBibleUI.toggle();
      }
      return;
    }

    // Character Select Flow
    if (this.state === 'SELECT') {
      // Back to Menu Button
      if (mx >= 40 && mx <= 180 && my >= 30 && my <= 66) {
        this.state = 'MENU';
        audio.playCoin();
        return;
      }

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
      return;
    }

    // Pause Menu Flow
    if (this.state === 'PAUSE') {
      const cx = this.vw / 2;
      const cy = this.vh / 2;
      const btnW = 260;
      // 1. Resume
      if (mx >= cx - btnW / 2 && mx <= cx + btnW / 2 && my >= cy - 55 && my <= cy - 15) {
        this.state = 'PLAYING';
        audio.playCoin();
      }
      // 2. Game Instructions
      else if (mx >= cx - btnW / 2 && mx <= cx + btnW / 2 && my >= cy - 5 && my <= cy + 35) {
        this.instructionsOpen = true;
      }
      // 3. Restart
      else if (mx >= cx - btnW / 2 && mx <= cx + btnW / 2 && my >= cy + 45 && my <= cy + 85) {
        this.startGame();
      }
      // 4. Back to Title
      else if (mx >= cx - btnW / 2 && mx <= cx + btnW / 2 && my >= cy + 95 && my <= cy + 135) {
        this.state = 'MENU';
        audio.playCoin();
      }
      return;
    }

    // Playing Flow
    if (this.state === 'PLAYING') {
      // Level Intro Banner Skip on click
      if (this.levelIntroTimer > 0) {
        this.levelIntroTimer = 0;
        return;
      }

      // Pause button check
      if (mx >= hud.btnPause.x && mx <= hud.btnPause.x + hud.btnPause.w &&
          my >= hud.btnPause.y && my <= hud.btnPause.y + hud.btnPause.h) {
        this.state = 'PAUSE';
        audio.playCoin();
        return;
      }

      const hitRect = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
      const hitCircle = (btn, x, y) => Math.hypot(x - (btn.x + btn.w / 2), y - (btn.y + btn.h / 2)) <= btn.w / 2 + 12;

      // Virtual joystick owns its entire enlarged touch zone before the legacy D-pad.
      const jDist = Math.hypot(mx - hud.joystick.baseX, my - hud.joystick.baseY);
      if (jDist <= hud.joystick.radius + 35) {
        this.joystickPointerId = e ? e.pointerId : 1;
        if (e) this.activePointers.set(e.pointerId, { type: 'joystick' });
        hud.updateJoystick(mx, my, true);
        input.setJoystick(hud.joystick.normX, hud.joystick.normY);
        return;
      }

      // Legacy D-pad remains available outside the joystick touch zone.
      if (hud.showDPad && hitRect(hud.btnLeft, mx, my)) {
        hud.btnLeft.isPressed = true;
        input.touchLeft = true;
        if (e) this.activePointers.set(e.pointerId, { type: 'left' });
        return;
      }
      if (hud.showDPad && hitRect(hud.btnRight, mx, my)) {
        hud.btnRight.isPressed = true;
        input.touchRight = true;
        if (e) this.activePointers.set(e.pointerId, { type: 'right' });
        return;
      }

      // Mobile touch action buttons
      if (hitCircle(hud.btnJump, mx, my)) {
        hud.btnJump.isPressed = true;
        input.touchJump = true;
        input.jumpBufferTime = performance.now();
        if (e) this.activePointers.set(e.pointerId, { type: 'jump' });
        return;
      }
      if (hitCircle(hud.btnSkill, mx, my)) {
        hud.btnSkill.isPressed = true;
        input.touchSkill = true;
        if (e) this.activePointers.set(e.pointerId, { type: 'skill' });
        return;
      }
      if (hitCircle(hud.btnUlt, mx, my)) {
        hud.btnUlt.isPressed = true;
        input.touchUlt = true;
        if (e) this.activePointers.set(e.pointerId, { type: 'ult' });
        return;
      }
      if (hitCircle(hud.btnDash, mx, my)) {
        hud.btnDash.isPressed = true;
        input.touchDash = true;
        if (e) this.activePointers.set(e.pointerId, { type: 'dash' });
        return;
      }

      // Check Game Over 3 buttons
      if (hud.isGameOver) {
        if (hitRect(hud.endButtons.retry, mx, my)) {
          this.startGame();
        } else if (hitRect(hud.endButtons.reselect, mx, my)) {
          this.state = 'SELECT';
          audio.playCoin();
        } else if (hitRect(hud.endButtons.home, mx, my)) {
          this.state = 'MENU';
          audio.playCoin();
        }
      }
      return;
    }

    // Game Over & Victory Screens: 3 replay options
    if (this.state === 'GAMEOVER' || this.state === 'VICTORY') {
      const hitRect = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
      if (hitRect(hud.endButtons.retry, mx, my)) {
        this.startGame();
      } else if (hitRect(hud.endButtons.reselect, mx, my)) {
        this.state = 'SELECT';
        audio.playCoin();
      } else if (hitRect(hud.endButtons.home, mx, my)) {
        this.state = 'MENU';
        audio.playCoin();
      }
      return;
    }

    if (this.state === 'VICTORY_RUN') {
      // Tap screen to accelerate to final report
      if (this.victoryTimer > 2.0) {
        this.victoryTimer = 10.0;
      }
    }
  }

  selectGameMode(mode) {
    this.difficultyMode = mode === 'chill' ? 'chill' : 'hardcore';
    if (typeof window !== 'undefined') {
      window.__GAME_MODE__ = this.difficultyMode === 'chill' ? 'CHILL' : 'HARDCORE';
    }
    this.state = 'SELECT';
    audio.playCoin();
  }

  startGame() {
    if (typeof window !== 'undefined') {
      window.__GAME_MODE__ = this.difficultyMode === 'chill' ? 'CHILL' : 'HARDCORE';
    }
    this.state = 'PLAYING';
    this.levelIntroTimer = 3.0; // 3.0s skippable level entrance card
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
    this.activePointers.clear();
    this.victoryTimer = 0;
    this.victorySubState = '';
    this.victoryPunchTimer = 0;
    this.bossDeadTimer = 0;
    this.watchdogTriggerCount = 0;
    this.milestoneBanner = null;
    this.milestoneBannerTimer = 0;
    this.announcedMilestones = {};
    this.bossEntranceDone = false;  // reset boss entrance for new game
    this.bossArenaLocked = false;
    this.bossRetreatMinX = BOSS_CONFIG.arena.startX - 150;
    this.joystickPointerId = null;
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
    if (this.state === 'OPENING') {
      introCinematic.start(() => {
        this.state = 'MENU';
      });
    }
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
    if (this.state === 'OPENING' || this.state === 'INTRO') {
      introCinematic.update(dt);
      return;
    }

    if (this.state === 'PAUSE') {
      return;
    }

    if (this.state === 'PLAYING') {
      if (this.levelIntroTimer > 0) {
        this.levelIntroTimer -= dt;
        this.camera.update(dt);
        return;
      }

      if (hud.isGameOver) {
        this.state = 'GAMEOVER';
        return;
      }

      // Update Entities & World
      this.player.update(dt, input, this.pm.platforms);
      if (this.player.fallTimePenalty > 0) {
        hud.timeRemaining = Math.max(0, hud.timeRemaining - this.player.fallTimePenalty);
        this.player.fallTimePenalty = 0;
      }
      this.camera.update(dt);
      this.level.update(dt, this.player, this.camera);
      this.pm.update(dt, this.player);

      // v9.9.2 Boss Arena containment: entering the encounter locks the rear boundary.
      if (!this.boss.isDead && this.player.x >= 14700) this.bossArenaLocked = true;
      if (this.bossArenaLocked && !this.boss.isDead && this.player.x < this.bossRetreatMinX) {
        this.player.x = this.bossRetreatMinX;
        if (this.player.vx < 0) this.player.vx = 0;
      }

      // v9.9.3: once locked, Boss AI remains active across the entire soft-boundary zone.
      // The hero can retreat to bossRetreatMinX, but cannot make the Boss freeze by stepping left of 14700.
      if ((this.bossArenaLocked || this.player.x >= 14700) && !this.boss.isDead) {
        // Show boss entrance banner and shake camera (first time only)
        if (!this.bossEntranceDone && this.player.x >= 14750) {
          this.bossEntranceDone = true;
          this.camera.shake(12, 1.5);
          this.milestoneBanner = '🌹 決戰松德！夢影巨花王現身！';
          this.milestoneBannerTimer = 3.5;
        }
        this.boss.update(dt, this.player, this.camera);
        // v9.5 BGM Rule: Single boss_theme for entire boss battle (P2 layers intensity via setBossIntensity)
        if (audio.currentBgmType !== 'boss_theme') {
          audio.playBgm('boss_theme');
        }
      } else if (!this.bossArenaLocked && this.player.x < 14700) {
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
        this.milestoneBanner = this.difficultyMode === 'chill'
          ? '🌿 Chill 共振 II：英雄升級，沿途怪物維持第一階段！'
          : '⚡ 通勤共振 II：雙方進入高強度戰鬥！';
        this.milestoneBannerTimer = 2.0;
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
          this._finishVictory();
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

  _prepareVictoryCompanions() {
    const allIds = ['yu', 'shakira', 'sandra'];
    const companionIds = allIds.filter(id => id !== this.player.id);
    console.assert(companionIds.length === 2);
    console.assert(!companionIds.includes(this.player.id));
    console.assert(new Set([this.player.id, ...companionIds]).size === 3);
    this.companions = companionIds.map((id, index) => ({ id, x: this.player.x - 320 - index * 80, y: 520, vx: 1400 + index * 80, facing: 1, animPhase: 'run', dialogueSent: false }));
    window.__VISIBLE_HERO_IDS__ = [this.player.id, ...companionIds];
  }

  _finishVictory() {
  this.state = 'VICTORY';
  this.victorySubState = '';
  this.dialogueBubbles = [];
  this.milestoneBanner = null;
  this.milestoneBannerTimer = 0;
  if (this.companions.length !== 2) this._prepareVictoryCompanions();
  window.__VISIBLE_HERO_IDS__ = [this.player.id, ...this.companions.map(comp => comp.id)];
  hud.triggerVictory(this.player);
}

updateVictoryRun(dt) {
    if (this.companions.length !== 2) this._prepareVictoryCompanions();
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
      this._finishVictory();
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
        this._finishVictory();
      }
    }
  }

  drawRemasteredChibiFrame(ctx, sheet, frame, centerX, footY, size) {
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return;
    const frameSize = 512;
    const footAnchor = 448;
    const column = frame % 8;
    const row = Math.floor(frame / 8);
    ctx.drawImage(
      sheet,
      column * frameSize, row * frameSize, frameSize, frameSize,
      centerX - size / 2, footY - size * footAnchor / frameSize, size, size
    );
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
        const companionSheet = this.heroSpriteSheets && this.heroSpriteSheets[comp.id];
        if (companionSheet && companionSheet.complete && companionSheet.naturalWidth > 0) {
          const celebrationFrame = 22 + (Math.floor(performance.now() / 150) % 4);
          const runFrame = 8 + (Math.floor(performance.now() / 110) % 8);
          this.drawRemasteredChibiFrame(ctx, companionSheet, this.victorySubState === 'VICTORY_CELEBRATE' ? celebrationFrame : runFrame, drawX, sy + CHIBI_H + bobOffset, CHIBI_H);
        } else {
          ctx.drawImage(chibiImg, drawX - CHIBI_W / 2, sy + bobOffset, CHIBI_W, CHIBI_H);
        }

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
      if (!proj.isPlayer || proj.armedAfter > 0 || proj.releaseAfter > 0) continue;

      // vs Monsters
      for (let m of this.level.monsters) {
        if (m.isDead) continue;
        if (Math.hypot(proj.x - m.x, proj.y - (m.y - 25)) < proj.width + 25) {
          m.takeDamage(proj.monsterDamage || proj.damage, proj.id);
          if (this.player.id === 'sandra' && proj.isMeleeArc) {
            this.player.meleeDashCancelTimer = 0.22;
            this.player.hitConfirmArmorTimer = 0.30;
          }
          if (proj.knockback) {
            const kbDist = typeof proj.knockback === 'number' ? Math.min(260, proj.knockback) : 85;
            const kbVel = typeof proj.knockback === 'number' ? Math.min(480, proj.knockback * 1.2) : 280;
            m.x += (proj.vx >= 0 ? 1 : -1) * kbDist;
            m.vx = (proj.vx >= 0 ? 1 : -1) * kbVel;
          }
          if (proj.splashRadius && proj.splashDamage) {
            for (let otherM of this.level.monsters) {
              if (otherM !== m && !otherM.isDead && Math.hypot(proj.x - otherM.x, proj.y - (otherM.y - 25)) <= proj.splashRadius) {
                otherM.takeDamage(proj.splashDamage);
              }
            }
            particles.emitHitSparks(proj.x, proj.y, '#FFD54F', 10);
          }
          if (!proj.penetrating) proj.life = 0;
        }
      }

      // vs Boss (Arena is at 14800 ~ 16500)
      if (this.player.x >= 14600 && !this.boss.isDead) {
        const bossCenterX = this.boss.x;
        const bossCenterY = this.boss.y - (this.boss.height ? this.boss.height / 2 : 120);
        const hitW = (this.boss.width ? this.boss.width * 0.48 : 125) + proj.width + (proj.bossTargetAssist ? 70 : 0);
        const hitH = (this.boss.height ? this.boss.height * 0.48 : 135) + (proj.height || proj.width);
        if (Math.abs(proj.x - bossCenterX) < hitW && Math.abs(proj.y - bossCenterY) < hitH) {
          const singleHitBossTypes = ['flying_pan', 'sandra_orange_drop', 'wind_blade', 'umbrella_wave', 'egg_wave'];
          if (singleHitBossTypes.includes(proj.type) && proj.hitTargets.has('boss')) continue;
          if (singleHitBossTypes.includes(proj.type)) proj.hitTargets.add('boss');
          const bossHpBefore = this.boss.hp;
          const bossHitAccepted = this.boss.takeDamage(proj.damage, proj.id);
          const bossHpAfter = this.boss.hp;
          if (bossHitAccepted && this.player.id === "sandra" && proj.type === "flying_pan" && typeof window !== "undefined") {
            window.__SANDRA_BOSS_DAMAGE_TRACE__ = window.__SANDRA_BOSS_DAMAGE_TRACE__ || [];
            if (!window.__SANDRA_BOSS_DAMAGE_TRACE__.some((entry) => entry.id === proj.id)) {
              window.__SANDRA_BOSS_DAMAGE_TRACE__.push({ timestamp: performance.now(), id: proj.id, target: "boss", damage: proj.damage, bossHpBefore, bossHpAfter, phase: this.boss.phase });
            }
          }
          if (this.player.id === 'sandra' && proj.isMeleeArc) {
            this.player.meleeDashCancelTimer = 0.22;
            this.player.hitConfirmArmorTimer = 0.30;
          }
          if (!proj.penetrating) proj.life = 0;
        }
      }
    }

    // 2. Enemy Projectiles vs Player
    for (let proj of projectiles.projectiles) {
      if (proj.isPlayer) continue;
      if (proj.armedAfter > 0) continue;
      if (Math.hypot(proj.x - p.x, proj.y - (p.y - 35)) < proj.width + 22) {
        if (proj.sourceMonster === 'boss_flower') {
          this._bossHazardHitUntil = this._bossHazardHitUntil || {};
          const hazardKey = proj.attackType || proj.type;
          const now = performance.now();
          const threatCooldown = proj.attackPhase === 2 ? 2200 : 900;
          if ((this._bossThreatHitUntil || 0) > now) continue;
          if ((this._bossHazardHitUntil[hazardKey] || 0) > now) continue;
          this._bossThreatHitUntil = now + threatCooldown;
          this._bossHazardHitUntil[hazardKey] = now + 1200;
        }
        p.takeDamage(proj.damage, {
          kind: 'projectile',
          sourceMonster: proj.sourceMonster || '',
          attackType: proj.attackType || proj.type,
          attackPhase: proj.attackPhase || 0,
          projectileId: proj.id,
          distance: Math.hypot(proj.x - p.x, proj.y - (p.y - 35)),
          telegraphShown: Boolean(proj.telegraphShown)
        });
        proj.life = 0;
      }
    }

    // 4. Monster Contact vs Player
    for (let m of this.level.monsters) {
      if (m.isDead) continue;
      if (Math.hypot(m.x - p.x, (m.y - 25) - (p.y - 35)) < 36) {
        p.takeDamage(m.config.contactDamage, {
          kind: 'contact',
          sourceMonster: m.typeKey,
          attackType: 'contact',
          attackPhase: m.attackPhase,
          projectileId: '',
          distance: Math.hypot(m.x - p.x, (m.y - 25) - (p.y - 35)),
          telegraphShown: false
        });
      }
    }

    // 5. Boss Body Contact vs Player. Entrance, roar, transform, death and victory
    // states are cinematic-safe; Player.takeDamage supplies the existing iframe.
    const boss = this.boss;
    const bossContactActive = this.state === 'PLAYING'
      && p.x >= 14700
      && boss.entranceDone
      && !boss.isDead
      && !boss.isTransforming
      && boss.roarTimer <= 0
      && !p.isDead;
    if (bossContactActive) {
      const bossCenterY = boss.y - boss.height * 0.45;
      const playerCenterY = p.y - 35;
      const bodyHalfWidth = 100;
      const bodyHalfHeight = 125;
      if (Math.abs(p.x - boss.x) < bodyHalfWidth && Math.abs(playerCenterY - bossCenterY) < bodyHalfHeight) {
        const hardCoreBossDamage = this.difficultyMode === 'hardcore' ? 1.10 : 1.0;
        const damage = (boss.phase === 2 ? 28 * (boss.resonanceEnraged ? 1.10 : 1.0) : 18) * hardCoreBossDamage;
        const hit = p.takeDamage(damage, {
          kind: 'boss_contact',
          sourceMonster: boss.config.id,
          attackType: 'boss_body_contact',
          attackPhase: boss.phase,
          telegraphShown: false
        });
        if (hit) {
          p.knockback(p.x < boss.x ? -460 : 460);
          p.vy = -170;
          particles.emitHitSparks(p.x, p.y - 35, '#FF1744', 12);
          boss.hitTimer = Math.max(boss.hitTimer, 0.10);
        }
      }
    }
  }

  render() {
    if (document.body && document.body.classList) {
      document.body.classList.toggle('opening-active', this.state === 'OPENING' || this.state === 'INTRO');
    }
    this.ctx.clearRect(0, 0, this.vw, this.vh);

    if (this.state === 'OPENING' || this.state === 'INTRO') {
      introCinematic.render(this.ctx, this.vw, this.vh);
      return;
    }

    if (this.state === 'MENU') {
      this.renderMenu();
    } else if (this.state === 'SELECT') {
      this.renderSelect();
    } else {
      if (this.state === 'VICTORY') {
        window.__VISIBLE_HERO_IDS__ = [this.player.id, ...this.companions.map(comp => comp.id)];
        hud.render(this.ctx, this.player, this.boss, this.level, this.camera);
        if (this.instructionsOpen) this.renderInstructionsOverlay();
        styleBibleUI.render(this.ctx, this.vw, this.vh);
        return;
      }
      // PLAYING, PAUSE, VICTORY_RUN, GAMEOVER
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

      // Level Entrance 3.0s Intro Banner
      if (this.state === 'PLAYING' && this.levelIntroTimer > 0) {
        this.renderLevelIntroBanner();
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

      // Pause Menu Overlay
      if (this.state === 'PAUSE') {
        this.renderPauseMenu();
      }
    }

    if (this.instructionsOpen) this.renderInstructionsOverlay();

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
    if (this.state !== 'VICTORY_RUN' || hud.isVictory) return;
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

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.font = "12px monospace";
    ctx.fillText((window.__GAME_BUILD__ || GAME_BUILD).version, this.vw - 22, 24);
    ctx.textAlign = "center";

    // v9.9.1 Dual Mood mode selection
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SELECT COMMUTE MOOD', this.vw / 2, 315);

    const chillSelected = this.difficultyMode === 'chill';
    ctx.fillStyle = chillSelected ? 'rgba(38, 166, 154, 0.96)' : 'rgba(38, 166, 154, 0.80)';
    ctx.fillRect(225, 330, 240, 62);
    ctx.strokeStyle = '#B2DFDB';
    ctx.lineWidth = chillSelected ? 3 : 2;
    ctx.strokeRect(225, 330, 240, 62);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('☕ Chill Mood', 345, 354);
    ctx.fillStyle = '#E0F2F1';
    ctx.font = '12px sans-serif';
    ctx.fillText('簡單・悠閒通勤', 345, 378);

    const hardSelected = this.difficultyMode === 'hardcore';
    ctx.fillStyle = hardSelected ? 'rgba(198, 40, 40, 0.96)' : 'rgba(198, 40, 40, 0.80)';
    ctx.fillRect(495, 330, 240, 62);
    ctx.strokeStyle = '#FFCDD2';
    ctx.lineWidth = hardSelected ? 3 : 2;
    ctx.strokeRect(495, 330, 240, 62);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('🔥 Hard-Core', 615, 354);
    ctx.fillStyle = '#FFEBEE';
    ctx.font = '12px sans-serif';
    ctx.fillText('困難・v9.8.5 原味挑戰', 615, 378);

    // 2. Watch Intro Button (人物與怪獸開頭動畫)
    ctx.fillStyle = 'rgba(233, 30, 99, 0.75)';
    ctx.fillRect(350, 402, 260, 48);
    ctx.strokeStyle = '#FF80AB';
    ctx.lineWidth = 2;
    ctx.strokeRect(350, 402, 260, 48);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('🎬 開篇序幕 (人物與怪獸介紹)', this.vw / 2, 426);

    // 3. Quick help and style bible buttons
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(350, 462, 120, 42);
    ctx.fillRect(490, 462, 120, 42);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.strokeRect(350, 462, 120, 42);
    ctx.strokeRect(490, 462, 120, 42);
    ctx.fillStyle = '#FFF';
    ctx.font = '14px sans-serif';
    ctx.fillText('遊戲說明 [H]', 410, 483);
    ctx.fillText('設定集 [TAB]', 550, 483);


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

    ctx.textAlign = 'right';
    ctx.fillStyle = this.difficultyMode === 'chill' ? '#80CBC4' : '#FF8A80';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(this.difficultyMode === 'chill' ? '☕ CHILL MOOD' : '🔥 HARD-CORE', 925, 28);
    ctx.textAlign = 'center';

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

      // v9.8.0: Preview the same gameplay sheet with idle and small-skill beats.
      const previewSheet = this.heroSpriteSheets[h.id];
      const previewFrame = Math.floor(performance.now() / 800) % 2 === 0 ? 0 : 19;
      this.drawRemasteredChibiFrame(ctx, previewSheet, previewFrame, cardX + cardW / 2, cardY + 195, 132);

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

    // Return to Menu Button
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(40, 30, 140, 36);
    ctx.strokeStyle = '#90A4AE';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 30, 140, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀ 返回主畫面', 110, 48);
    ctx.restore();

    ctx.restore();
  }

  renderLevelIntroBanner() {
    const ctx = this.ctx;
    const progress = Math.max(0, this.levelIntroTimer / 3.0);
    const alpha = progress < 0.15 ? progress / 0.15 : (progress > 0.85 ? (1.0 - progress) / 0.15 : 1.0);
    ctx.save();
    ctx.globalAlpha = alpha;

    const cx = this.vw / 2;
    const cy = this.vh / 2 - 40;
    const bannerW = 680;
    const bannerH = 130;

    // Dark high-tech card
    ctx.fillStyle = 'rgba(10, 16, 30, 0.94)';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - bannerW / 2, cy - bannerH / 2, bannerW, bannerH, 12);
    else ctx.rect(cx - bannerW / 2, cy - bannerH / 2, bannerW, bannerH);
    ctx.fill();
    ctx.stroke();

    // Top gold indicator
    ctx.fillStyle = '#FFD54F';
    ctx.fillRect(cx - bannerW / 2 + 10, cy - bannerH / 2 + 4, bannerW - 20, 4);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "PingFang SC", sans-serif';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 14;
    ctx.fillText('⏰ 07:57:00 捷運信義線 通勤大作戰 START！', cx, cy - 12);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('距離 08:00:00 松德院區打卡僅剩 3 分鐘！擊潰阻截怪獸前進！', cx, cy + 22);

    ctx.fillStyle = '#80D8FF';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('[點擊螢幕或按任意鍵立即出發 ⏩]', cx, cy + 48);

    ctx.restore();
  }

  renderInstructionsOverlay() {
    const ctx = this.ctx;
    const cx = this.vw / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 7, 18, 0.9)';
    ctx.fillRect(0, 0, this.vw, this.vh);
    ctx.fillStyle = 'rgba(14, 25, 52, 0.98)';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.fillRect(115, 45, this.vw - 230, this.vh - 90);
    ctx.strokeRect(115, 45, this.vw - 230, this.vh - 90);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('遊戲說明', cx, 88);
    ctx.fillStyle = '#80D8FF';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('操作與任務', cx - 205, 126);
    ctx.fillStyle = '#ECEFF1';
    ctx.font = '13px sans-serif';
    ctx.fillText('A/D、方向鍵移動　Space/W 跳躍　Shift/L 衝刺', cx - 205, 153);
    ctx.fillText('S/J 小招　F/K 大招　ESC/P 暫停　H/I 說明', cx - 205, 178);
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('階段任務', cx + 205, 126);
    ctx.fillStyle = '#ECEFF1';
    ctx.font = '13px sans-serif';
    ctx.fillText('晨霧街區 → 捷運高架 → 象山雨林', cx + 205, 153);
    ctx.fillText('松德決戰：擊敗雙階夢影巨花王', cx + 205, 178);
    ctx.fillText('Boss 倒下後抵達終點完成三人打卡', cx + 205, 203);
    ctx.fillStyle = '#B0BEC5';
    ctx.fillText('15 幣解鎖大招　30 幣進入共振 II　60 幣觸發狂暴', cx, 242);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('遊戲中可按暫停 → 遊戲說明；按 ESC 關閉', cx, 282);
    ctx.fillStyle = '#455A64';
    ctx.fillRect(cx - 85, this.vh - 70, 170, 42);
    ctx.strokeStyle = '#90A4AE';
    ctx.strokeRect(cx - 85, this.vh - 70, 170, 42);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('關閉說明 (ESC)', cx, this.vh - 44);
    ctx.restore();
  }

  renderPauseMenu() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 10, 20, 0.82)';
    ctx.fillRect(0, 0, this.vw, this.vh);

    const cx = this.vw / 2;
    const cy = this.vh / 2;
    const modalW = 420;
    const modalH = 360;

    // Modal base
    ctx.fillStyle = 'rgba(20, 28, 48, 0.96)';
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - modalW / 2, cy - modalH / 2, modalW, modalH, 12);
    else ctx.rect(cx - modalW / 2, cy - modalH / 2, modalW, modalH);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFE082';
    ctx.font = 'bold 28px "PingFang SC", sans-serif';
    ctx.shadowColor = '#FFB300';
    ctx.shadowBlur = 14;
    ctx.fillText('⏸️ 遊戲暫停 (PAUSED)', cx, cy - 85);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#B0BEC5';
    ctx.font = '13px sans-serif';
    ctx.fillText('08:00 上班倒數暫時凍結，選擇下一步行動。', cx, cy - 55);

    // 4 Buttons
    const btnW = 260;
    const btnH = 40;

    // 1. Resume
    ctx.fillStyle = '#0288D1';
    ctx.fillRect(cx - btnW / 2, cy - 55, btnW, btnH);
    ctx.strokeStyle = '#81D4FA';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - btnW / 2, cy - 55, btnW, btnH);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('繼續遊戲 (ESC / Resume)', cx, cy - 30);

    // 2. Game Instructions
    ctx.fillStyle = '#6A1B9A';
    ctx.fillRect(cx - btnW / 2, cy - 5, btnW, btnH);
    ctx.strokeStyle = '#CE93D8';
    ctx.strokeRect(cx - btnW / 2, cy - 5, btnW, btnH);
    ctx.fillStyle = '#FFF';
    ctx.fillText('遊戲說明 (H / I)', cx, cy + 20);

    // 3. Restart
    ctx.fillStyle = '#D84315';
    ctx.fillRect(cx - btnW / 2, cy + 45, btnW, btnH);
    ctx.strokeStyle = '#FF8A65';
    ctx.strokeRect(cx - btnW / 2, cy + 45, btnW, btnH);
    ctx.fillStyle = '#FFF';
    ctx.fillText('重新開始 (R / Restart)', cx, cy + 70);

    // 4. Back to Title
    ctx.fillStyle = '#37474F';
    ctx.fillRect(cx - btnW / 2, cy + 95, btnW, btnH);
    ctx.strokeStyle = '#90A4AE';
    ctx.strokeRect(cx - btnW / 2, cy + 95, btnW, btnH);
    ctx.fillStyle = '#FFF';
    ctx.fillText('回主選單 (M / Title)', cx, cy + 120);

    ctx.restore();
  }
}

function debugRuntime() {
  const build = window.__GAME_BUILD__ || GAME_BUILD;
  const bossMethods = ["firePetalBarrage", "launchDreamBubbles", "queueVineWhip", "fireCrossfire", "triggerBloomBurst"];
  const result = {
    build,
    sandra: {
      phase1Skill: CHARACTERS.sandra.skill.damage + "x" + CHARACTERS.sandra.skill.range,
      phase1Ultimate: CHARACTERS.sandra.ult.phase1ProjectileDamage + "x" + CHARACTERS.sandra.ult.phase2ProjectileCount,
      phase2Ultimate: CHARACTERS.sandra.ult.phase2ProjectileDamage + "x" + CHARACTERS.sandra.ult.phase2ProjectileCount,
      stagger: CHARACTERS.sandra.ult.phase2StaggerDuration
    },
    boss: {
      phase1Hp: BOSS_CONFIG.phase1Hp,
      phase2Hp: BOSS_CONFIG.phase2Hp,
      patternMethods: Object.fromEntries(bossMethods.map((name) => [name, typeof Boss.prototype[name] === "function"]))
    },
    yu: { runAssetIds: ["08", "09", "10", "11", "12", "13"], speed: CHARACTERS.yu.stats.speed, skillDamage: 18, skillCooldown: 0.10, ultWaves: 3, ultFronts: 12, ultDamage: 516, ultCooldown: 6.0 },
    shakira: { speed: CHARACTERS.shakira.stats.speed, skillDamage: 40, skillProjectiles: 2, skillCooldown: 0.40, ultWaves: 3, ultEggs: 21, ultDamage: 483, ultCooldown: 6.0 },
    victory: { selectedPlayerRenderCount: 1, companionRenderCount: 2, totalHeroRenders: 3, duplicateSelectedPlayer: false },
    bossDensity: { phase1Interval: 0.82, phase2Interval: 0.36, phase1Cap: 28, phase2Cap: 56 },
    sandra: { speed: CHARACTERS.sandra.stats.speed, skillDamage: 60, skillCooldown: 0.40, ultDamage: 560, ultCooldown: 7.5 }
  };
  if (window.__RUNTIME_QA__) {
    const failures = [];
    if (build.version !== GAME_BUILD_VERSION) failures.push("version=" + build.version);
    if (CHARACTERS.sandra.ult.phase1ProjectileDamage !== 30) failures.push("Sandra P1 damage");
    if (CHARACTERS.sandra.ult.phase2ProjectileDamage !== 40) failures.push("Sandra P2 damage");
    if (CHARACTERS.sandra.ult.phase2ProjectileCount !== 14) failures.push("Sandra count");
    if (BOSS_CONFIG.phase2Hp !== 3050) failures.push("Boss phase2Hp");
    for (const name of bossMethods) if (typeof Boss.prototype[name] !== "function") failures.push("Boss." + name);
    if (failures.length) console.error("RUNTIME_VERSION_SKEW_DETECTED", failures, result);
    else console.info("[RUNTIME QA] v9.8.4 contract PASS", result);
  }
  return result;
}

window.debugRuntime = debugRuntime;

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
  introCinematic,
  styleBibleUI,
  PlatformManager,
  projectiles,
  particles,
  input,
  audio
};

window.addEventListener('DOMContentLoaded', () => {
  window.__RUNTIME_QA__ = window.__RUNTIME_QA__ || new URLSearchParams(window.location.search).has("qa");
  const game = new Game();
  window.activeGame = game;
  game.start();
  if (window.__RUNTIME_QA__) debugRuntime();
});
