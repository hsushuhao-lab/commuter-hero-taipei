/**
 * 08點上班大作戰：通勤英雄篇 - Web Audio API 音效與音樂合成系統 (Audio.js)
 * 特色：
 * - 100% 程式即時合成，零外部音訊依賴
 * - 4 首獨立合成 BGM (Morning City Pop, Rainy Park, Boss Phase 1, Boss Phase 2 高速狂暴)
 * - 大招施放時自動 Ducking (BGM 壓低 30%)
 * - 3 位英雄各自專屬小招 / 大招音效
 * - 完整打擊、金幣、打卡鐘 (Stamp) 音效
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this.isMuted = false;
    this.currentBgmType = null;
    this.bgmLoopTimer = null;
    this.bgmStep = 0;
    this.tempo = 125;
    this.isDucked = false;
    this.bossIntensity = 1; // v9.5: 1 = Phase 1, 2 = Phase 2 intensity layer
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMute(mute) {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  duckBGM(duck = true) {
    if (!this.bgmGain || !this.ctx) return;
    this.isDucked = duck;
    const target = duck ? 0.15 : 0.45; // 降低約 30% ~ 35%
    this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
  }

  stopBgm() {
    if (this.bgmLoopTimer) {
      clearInterval(this.bgmLoopTimer);
      this.bgmLoopTimer = null;
    }
    this.currentBgmType = null;
  }

  setBossIntensity(level) {
    this.bossIntensity = level;
  }

  fadeToVictory(fadeDuration = 0.6) {
    if (!this.ctx || !this.bgmGain) {
      this.playBgm('victory_theme');
      return;
    }
    const t = this.ctx.currentTime;
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, t);
    this.bgmGain.gain.linearRampToValueAtTime(0.01, t + fadeDuration);
    setTimeout(() => {
      this.playBgm('victory_theme');
      if (this.bgmGain && this.ctx) {
        this.bgmGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        this.bgmGain.gain.linearRampToValueAtTime(0.45, this.ctx.currentTime + 0.3);
      }
    }, fadeDuration * 1000);
  }

  playBgm(type) {
    this.ensureContext();

    // v9.5 Three-Theme Rule & Canonical Mapping
    // 1. commute_theme (Scene 1 to Boss gate; no switching in rainy park!)
    // 2. boss_theme (Phase 1 & Phase 2 share track; Phase 2 sets intensity 2)
    // 3. victory_theme (Celebration, triple clock-in, evaluation)
    let canonical = type;
    if (type === 'city_pop') canonical = 'commute_theme';
    if (type === 'boss_p1') {
      canonical = 'boss_theme';
      this.bossIntensity = 1;
    }
    if (type === 'boss_p2') {
      canonical = 'boss_theme';
      this.bossIntensity = 2;
    }
    if (type === 'victory') canonical = 'victory_theme';

    // Disallow switching away from commute_theme while in scenes 1-4 (e.g. rainy_park)
    if (type === 'rainy_park') {
      return; // Do not switch BGM in Hulin Park; commute_theme persists!
    }

    if (this.currentBgmType === canonical) {
      // If already playing boss_theme and boss_p2 was requested, intensity was updated above
      return;
    }

    this.stopBgm();
    this.currentBgmType = canonical;
    this.bgmStep = 0;

    let intervalMs = 120; // Default 125 BPM
    if (canonical === 'commute_theme') intervalMs = 120; // 125 BPM City Pop
    else if (canonical === 'boss_theme') intervalMs = 105; // 142 BPM Tension
    else if (canonical === 'victory_theme') intervalMs = 115; // 130 BPM Victory Fanfare

    this.bgmLoopTimer = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      this.tickBgm(canonical);
      this.bgmStep = (this.bgmStep + 1) % 64;
    }, intervalMs);
  }

  tickBgm(type) {
    const t = this.ctx.currentTime;
    const step = this.bgmStep;

    if (type === 'commute_theme') {
      // Upbeat City Pop Bassline & Chords (Amaj7 - G#m7 - C#m7 - F#m7)
      const bassNotes = [220, 220, 330, 220, 207, 207, 311, 207, 164, 164, 246, 164, 185, 185, 277, 185];
      const note = bassNotes[step % 16];
      if (step % 2 === 0) {
        this.synthBass(note, t, 0.18, 'sawtooth');
      }
      // Hi-hat and snare
      if (step % 4 === 2) this.synthSnare(t);
      if (step % 2 === 0) this.synthHiHat(t, 0.04);
      // Melody / Chord stab
      if (step % 8 === 0) {
        this.synthChords([440, 554, 659, 830], t, 0.25);
      }
    } 
    else if (type === 'boss_theme') {
      // Base: Dramatic driving tension (Em - C - D - B7)
      const bossNotes = [164, 164, 246, 164, 130, 130, 196, 130, 146, 146, 220, 146, 123, 123, 185, 123];
      const note = bossNotes[step % 16];
      this.synthBass(note, t, 0.14, 'sawtooth');

      // Kick & Snare
      if (step % 4 === 0) this.synthKick(t);
      if (step % 4 === 2) this.synthSnare(t, 0.4);
      this.synthHiHat(t, 0.05);

      if (step % 8 === 0) {
        this.synthArp([329, 392, 493, 659], t, 0.15);
      }

      // v9.5 Intensity 2 Layer (Phase 2 Berserk - Hi-hats, distorted bass, double kick, rapid arps)
      if (this.bossIntensity >= 2) {
        // Double kick on every other beat
        if (step % 2 === 0) this.synthKick(t, 0.65);
        // Rapid hi-hats on off-beats
        if (step % 2 === 1) this.synthHiHat(t, 0.06);
        // Snare with extra power
        if (step % 4 === 2) this.synthSnare(t, 0.6);
        // Extra rapid upper arpeggios
        const arpFreqs = [440, 554, 659, 880, 1108, 880, 659, 554];
        this.synthArp([arpFreqs[step % 8]], t, 0.08, 0.16);
      }
    }
    else if (type === 'victory_theme') {
      // Triumphant Victory Fanfare (C - G - Am - F - G - C)
      const vicBass = [130, 130, 196, 196, 220, 220, 174, 196];
      const bNote = vicBass[Math.floor(step / 2) % 8];
      if (step % 2 === 0) {
        this.synthBass(bNote, t, 0.20, 'triangle');
      }
      if (step % 4 === 0) this.synthKick(t, 0.6);
      if (step % 4 === 2) this.synthSnare(t, 0.45);
      if (step % 2 === 0) this.synthHiHat(t, 0.05);

      // Uplifting Brass Fanfare Stabs & Chords
      if (step % 8 === 0) {
        this.synthChords([523, 659, 784, 1046], t, 0.35, 0.18); // High C major
      } else if (step % 8 === 4) {
        this.synthChords([587, 784, 880, 1174], t, 0.30, 0.16); // G / D
      }
      // Cheerful sparkling arpeggio
      const vicArp = [523, 659, 784, 988, 1046, 988, 784, 659];
      this.synthArp([vicArp[step % 8]], t, 0.09, 0.12);
    }
  }

  // --- Synthesis Helpers ---

  synthBass(freq, time, dur, type = 'sawtooth') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + dur);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + dur);
  }

  synthKick(time, vol = 0.5) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  synthSnare(time, vol = 0.3) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.1);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  synthHiHat(time, dur = 0.04) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'highpass';
    osc.frequency.setValueAtTime(9000, time);
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + dur);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(time);
    osc.stop(time + dur);
  }

  synthChords(freqs, time, dur, vol = 0.12) {
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + dur);
    });
  }

  synthArp(freqs, time, dur, vol = 0.12) {
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, time);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + dur);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + dur);
    });
  }

  // --- Sound Effects (SFX) ---

  playJump() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.16);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playCoin() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987, t); // B5
    osc.frequency.setValueAtTime(1318, t + 0.08); // E6
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  playPowerup() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.2, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.15);
    });
  }

  playSkill(charId) {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    if (charId === 'yu') {
      // Wind blade whoosh
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.22);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(4, t);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.22);
    } 
    else if (charId === 'shakira') {
      // Pop & Mayo squirt
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.2);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    } 
    else {
      // Sandra: Heavy Pan Clank + sizzle
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.24);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    }
  }

  playUltCutin() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    this.duckBGM(true);
    const t = this.ctx.currentTime;
    // Dramatic shimmer and rising chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(261, t);
    osc.frequency.exponentialRampToValueAtTime(1567, t + 0.45);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  playUltRelease(charId) {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Supreme explosion
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.8);

    // Release ducking after 1.8s
    setTimeout(() => {
      this.duckBGM(false);
    }, 1800);
  }

  playHit() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playTelegraph() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playBossRoar() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 1.2);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.2);
  }

  playStamp() {
    this.ensureContext();
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    // Mechanical click-clack + victory chime
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(450, t);
    osc1.frequency.exponentialRampToValueAtTime(100, t + 0.08);
    gain1.gain.setValueAtTime(0.6, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 0.08);

    // Chime
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      [523, 659, 784, 1046, 1318].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t2 + i * 0.08);
        g.gain.setValueAtTime(0.25, t2 + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.01, t2 + i * 0.08 + 0.35);
        o.connect(g);
        g.connect(this.sfxGain);
        o.start(t2 + i * 0.08);
        o.stop(t2 + i * 0.08 + 0.35);
      });
    }, 100);
  }
}

export const audio = new AudioManager();
