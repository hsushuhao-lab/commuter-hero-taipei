/**
 * 08點上班大作戰：通勤英雄篇 - 輸入控制系統 (Input.js)
 * 支援鍵盤、手機觸控按鈕、Jump Buffer、Tab 開關 QA Style Bible
 */

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressedKeys = {};
    
    // Virtual touch buttons & Joystick state
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJump = false;
    this.touchSkill = false;
    this.touchUlt = false;
    this.touchDash = false;

    // Virtual Joystick (-1.0 to 1.0)
    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickActive = false;

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
    this.touchDash = false;
    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickActive = false;
    this.jumpBufferTime = 0;
  }

  setJoystick(x, y) {
    this.joystickX = x;
    this.joystickY = y;
    this.joystickActive = (Math.abs(x) > 0.05 || Math.abs(y) > 0.05);
  }

  resetJoystick() {
    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickActive = false;
  }

  // Polled in update loop to clear one-frame triggers
  endFrame() {
    this.justPressedKeys = {};
  }

  // --- Actions ---

  isLeft() {
    return this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchLeft || (this.joystickActive && this.joystickX < -0.18);
  }

  isRight() {
    return this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchRight || (this.joystickActive && this.joystickX > 0.18);
  }

  isJumpHeld() {
    return this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp'] || this.touchJump || (this.joystickActive && this.joystickY < -0.65);
  }

  isJumpTriggered() {
    // Check key just pressed, or touch jump, or valid jump buffer within 150ms
    const directPress = this.justPressedKeys['Space'] || this.justPressedKeys['KeyW'] || this.justPressedKeys['ArrowUp'];
    const bufferValid = (performance.now() - this.jumpBufferTime) <= this.JUMP_BUFFER_MS;
    const joystickUp = this.joystickActive && this.joystickY < -0.65;
    return directPress || bufferValid || this.touchJump || joystickUp;
  }

  consumeJumpBuffer() {
    this.jumpBufferTime = 0;
    this.touchJump = false;
  }

  isSkillTriggered() {
    return this.keys['KeyS'] || this.keys['KeyJ'] || this.justPressedKeys['KeyS'] || this.justPressedKeys['KeyJ'] || this.touchSkill;
  }

  isUltTriggered() {
    const res = this.justPressedKeys['KeyF'] || this.justPressedKeys['KeyK'] || this.touchUlt;
    this.touchUlt = false;
    return res;
  }

  isDashTriggered() {
    const res = this.justPressedKeys['ShiftLeft'] || this.justPressedKeys['ShiftRight'] || this.justPressedKeys['KeyE'] || this.justPressedKeys['KeyL'] || this.touchDash;
    this.touchDash = false;
    return res;
  }
}

export const input = new InputManager();
