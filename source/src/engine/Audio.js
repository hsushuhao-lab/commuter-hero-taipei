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

  playBgm(type) {
    this.ensureContext();
    if (this.currentBgmType === type) return;
    this.stopBgm();
    this.currentBgmType = type;
    this.bgmStep = 0;

    let intervalMs = 125;
    if (type === 'city_pop') intervalMs = 120; // 125 BPM
    else if (type === 'rainy_park') intervalMs = 145; // 105 BPM
    else if (type === 'boss_p1') intervalMs = 110; // 136 BPM
    else if (type === 'boss_p2') intervalMs = 90;  // 166 BPM (High BPM 狂暴)

    this.bgmLoopTimer = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      this.tickBgm(type);
      this.bgmStep = (this.bgmStep + 1) % 64;
    }, intervalMs);
  }

  tickBgm(type) {
    const t = this.ctx.currentTime;
    const step = this.bgmStep;

    if (type === 'city_pop') {
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
    else if (type === 'rainy_park') {
      // Subdued, melancholy rain vibe (Dm7 - Am7 - Gm7 - A7)
      const rainBass = [146, 0, 146, 220, 110, 0, 110, 164, 98, 0, 98, 146, 110, 0, 164, 220];
      const note = rainBass[step % 16];
      if (note > 0 && step % 4 === 0) {
        this.synthBass(note, t, 0.35, 'triangle');
      }
      if (step % 8 === 4) this.synthSnare(t, 0.15);
      // Soft electric piano chime
      if (step % 16 === 0) {
        this.synthChords([293, 349, 440, 523], t, 0.45, 0.08);
      }
    }
    else if (type === 'boss_p1') {
      // Dramatic driving tension (Em - C - D - B7)
      const bossNotes = [164, 164, 246, 164, 130, 130, 196, 130, 146, 146, 220, 146, 123, 123, 185, 123];
      const note = bossNotes[step % 16];
      this.synthBass(note, t, 0.14, 'sawtooth');
      if (step % 4 === 0) this.synthKick(t);
      if (step % 4 === 2) this.synthSnare(t, 0.4);
      this.synthHiHat(t, 0.05);
      if (step % 8 === 0) {
        this.synthArp([329, 392, 493, 659], t, 0.15);
      }
    }
    else if (type === 'boss_p2') {
      // Intense 166 BPM Double-Time Bullet Hell Drum & Bass
      const p2Notes = [110, 110, 164, 110, 123, 123, 185, 123, 130, 130, 196, 130, 146, 164, 196, 220];
      const note = p2Notes[step % 16];
      this.synthBass(note, t, 0.10, 'sawtooth');
      this.synthKick(t, 0.7); // Driving kick on every beat
      if (step % 2 === 1) this.synthHiHat(t, 0.08);
      if (step % 4 === 2) this.synthSnare(t, 0.6);
      // Rapid arpeggios
      const arpFreqs = [440, 554, 659, 880, 1108, 880, 659, 554];
      this.synthArp([arpFreqs[step % 8]], t, 0.08, 0.14);
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
