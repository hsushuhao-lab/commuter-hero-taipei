/**
 * 08點上班大作戰：通勤英雄篇 - 輸入控制系統 (Input.js)
 * 支援鍵盤、手機觸控按鈕、Jump Buffer、Tab 開關 QA Style Bible
 */

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressedKeys = {};
    
    // Virtual touch buttons state
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJump = false;
    this.touchSkill = false;
    this.touchUlt = false;

    // Buffer tracking
    this.jumpBufferTime = 0;
    this.JUMP_BUFFER_MS = 150;

    // Callbacks
    this.onToggleStyleBible = null;
    this.onTogglePause = null;

    this.initKeyboard();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Avoid browser scrolling with Space or Arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'Tab' || e.code === 'F1') {
        if (this.onToggleStyleBible) this.onToggleStyleBible();
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.onTogglePause) this.onTogglePause();
        return;
      }

      if (!this.keys[e.code]) {
        this.justPressedKeys[e.code] = true;
      }
      this.keys[e.code] = true;

      // Register jump buffer
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        this.jumpBufferTime = performance.now();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.justPressedKeys[e.code] = false;
    });

    window.addEventListener('blur', () => {
      this.reset();
    });
  }

  reset() {
    this.keys = {};
    this.justPressedKeys = {};
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJump = false;
    this.touchSkill = false;
    this.touchUlt = false;
    this.jumpBufferTime = 0;
  }

  // Polled in update loop to clear one-frame triggers
  endFrame() {
    this.justPressedKeys = {};
  }

  // --- Actions ---

  isLeft() {
    return this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchLeft;
  }

  isRight() {
    return this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchRight;
  }

  isJumpHeld() {
    return this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchJump;
  }

  isJumpTriggered() {
    // Check key just pressed, or touch jump, or valid jump buffer within 150ms
    const directPress = this.justPressedKeys['Space'] || this.justPressedKeys['KeyW'] || this.justPressedKeys['ArrowUp'];
    const bufferValid = (performance.now() - this.jumpBufferTime) <= this.JUMP_BUFFER_MS;
    return directPress || bufferValid || this.touchJump;
  }

  consumeJumpBuffer() {
    this.jumpBufferTime = 0;
    this.touchJump = false;
  }

  isSkillTriggered() {
    const res = this.justPressedKeys['KeyS'] || this.justPressedKeys['KeyJ'] || this.touchSkill;
    this.touchSkill = false;
    return res;
  }

  isUltTriggered() {
    const res = this.justPressedKeys['KeyF'] || this.justPressedKeys['KeyK'] || this.touchUlt;
    this.touchUlt = false;
    return res;
  }
}

export const input = new InputManager();
