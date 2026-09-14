/**
 * v9.7.9 Opening cinematic
 * Taipei dawn -> hero beats -> commute montage -> ambush -> boss tease -> logo.
 */

import { MONSTER_TYPES } from '../data/Monsters.js';
import { audio } from '../engine/Audio.js';

const SHOT_STARTS = [0, 1.8, 4.3, 6.5, 8.8, 10.6];
const SHOT_ENDS = [1.8, 4.3, 6.5, 8.8, 10.6, 13.5];
const HEROES = [
  { id: 'yu', name: '禹志晨｜通勤醫師', color: '#00B0FF' },
  { id: 'shakira', name: '夏奇拉｜蛋醬宅男', color: '#8E24AA' },
  { id: 'sandra', name: '珊卓澎｜海鸚廚娘', color: '#D84315' }
];

const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export class IntroCinematic {
  constructor() {
    this.isActive = false;
    this.time = 0;
    this.duration = 13.5;
    this.onComplete = null;
    this.reducedMotion = Boolean(
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    this.backgrounds = {
      station: this.loadImage('assets/bg_station.jpg'),
      lane: this.loadImage('assets/bg_lane.jpg'),
      park: this.loadImage('assets/bg_hulin_park.jpg'),
      hospital: this.loadImage('assets/bg_hospital.jpg')
    };
    this.heroImgs = {
      yu: this.loadImage('assets/intro_yu_chibi.png'),
      shakira: this.loadImage('assets/intro_shakira_chibi.png'),
      sandra: this.loadImage('assets/intro_sandra_chibi.png')
    };
    this.bossImgs = {
      phase1: this.loadImage('assets/boss_flower_phase1_v9_7_4.png'),
      phase2: this.loadImage('assets/boss_flower_phase2_v9_7_7.png')
    };
    this.monsterImgs = {};
    for (const key of Object.keys(MONSTER_TYPES)) {
      this.monsterImgs[key] = this.loadImage(MONSTER_TYPES[key].asset);
    }
  }

  loadImage(src) {
    const image = new Image();
    image.src = src;
    return image;
  }

  start(onComplete) {
    this.isActive = true;
    this.time = 0;
    this.onComplete = onComplete;
    audio.ensureContext();
    audio.playBgm('city_pop');
  }

  skip() {
    this.isActive = false;
    if (!this.onComplete) return;
    const callback = this.onComplete;
    this.onComplete = null;
    callback();
  }

  nextAct() {
    const next = SHOT_ENDS.find(boundary => boundary > this.time + 0.001);
    if (next && next < this.duration) this.time = next;
    else this.skip();
  }

  update(dt) {
    if (!this.isActive) return;
    this.time += dt;
    if (this.time >= this.duration) this.skip();
  }

  render(ctx, vw, vh) {
    if (!this.isActive) return;
    ctx.save();
    if (this.time < SHOT_ENDS[0]) this.renderShot1TaipeiDawn(ctx, vw, vh);
    else if (this.time < SHOT_ENDS[1]) this.renderShot2HeroBeats(ctx, vw, vh);
    else if (this.time < SHOT_ENDS[2]) this.renderShot3CommuteMontage(ctx, vw, vh);
    else if (this.time < SHOT_ENDS[3]) this.renderShot4MonsterAmbush(ctx, vw, vh);
    else if (this.time < SHOT_ENDS[4]) this.renderShot5BossTease(ctx, vw, vh);
    else this.renderShot6HeroRunLogo(ctx, vw, vh);
    this.renderSkipButton(ctx, vw);
    this.renderProgressBar(ctx, vw, vh);
    ctx.restore();
  }

  isCompact() {
    return typeof window !== 'undefined' && window.innerWidth <= 480;
  }

  motion(value) {
    return this.reducedMotion ? 0 : value;
  }

  drawCover(ctx, image, vw, vh, pan = 0) {
    if (!image || !image.complete || !image.naturalWidth) {
      ctx.fillStyle = '#EAF6FF';
      ctx.fillRect(0, 0, vw, vh);
      return;
    }
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const viewRatio = vw / vh;
    let sourceX = 0;
    let sourceY = 0;
    let sourceW = image.naturalWidth;
    let sourceH = image.naturalHeight;
    if (sourceRatio > viewRatio) {
      sourceW = image.naturalHeight * viewRatio;
      sourceX = (image.naturalWidth - sourceW) / 2 + pan;
      sourceX = Math.max(0, Math.min(image.naturalWidth - sourceW, sourceX));
    } else {
      sourceH = image.naturalWidth / viewRatio;
      sourceY = (image.naturalHeight - sourceH) / 2;
    }
    ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, vw, vh);
  }

  drawContain(ctx, image, centerX, bottomY, maxW, maxH, alpha = 1) {
    if (!image || !image.complete || !image.naturalWidth) return;
    const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, centerX - width / 2, bottomY - height, width, height);
    ctx.restore();
  }

  drawMorningGrade(ctx, vw, vh, strength = 0.8) {
    const sky = ctx.createLinearGradient(0, 0, 0, vh);
    sky.addColorStop(0, `rgba(157, 216, 255, ${0.72 * strength})`);
    sky.addColorStop(0.58, `rgba(234, 246, 255, ${0.45 * strength})`);
    sky.addColorStop(1, `rgba(255, 214, 107, ${0.48 * strength})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, vw, vh);
    const glow = ctx.createRadialGradient(vw * 0.72, vh * 0.12, 0, vw * 0.72, vh * 0.12, vh * 0.8);
    glow.addColorStop(0, `rgba(255, 248, 210, ${0.85 * strength})`);
    glow.addColorStop(1, 'rgba(255, 214, 107, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, vw, vh);
  }

  drawTaipeiSkyline(ctx, vw, vh, alpha = 0.75) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#17305A';
    const horizon = vh * 0.82;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.quadraticCurveTo(vw * 0.2, horizon - 90, vw * 0.4, horizon - 22);
    ctx.quadraticCurveTo(vw * 0.62, horizon - 120, vw, horizon - 30);
    ctx.lineTo(vw, vh);
    ctx.lineTo(0, vh);
    ctx.closePath();
    ctx.fill();
    const towerX = vw * 0.73;
    const towerBase = horizon - 8;
    ctx.fillRect(towerX - 13, towerBase - 185, 26, 185);
    for (let index = 0; index < 7; index++) {
      const width = 38 - index * 3;
      ctx.fillRect(towerX - width / 2, towerBase - 52 - index * 19, width, 15);
    }
    ctx.fillRect(towerX - 2, towerBase - 220, 4, 35);
    ctx.restore();
  }

  drawPetals(ctx, vw, vh, time, count = 18) {
    ctx.save();
    ctx.fillStyle = '#F59AD7';
    for (let index = 0; index < count; index++) {
      const drift = this.motion(time * (24 + index % 5));
      const x = (index * 97 + drift) % (vw + 80) - 40;
      const y = 40 + ((index * 61 + this.motion(time * 16)) % Math.max(80, vh - 90));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.motion(time * 0.7 + index));
      ctx.globalAlpha = 0.35 + (index % 4) * 0.12;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 3, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawCaption(ctx, text, subtext, vw, y, color = '#17305A') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(234, 246, 255, 0.88)';
    const width = this.isCompact() ? 430 : 520;
    ctx.fillRect(vw / 2 - width / 2, y - 29, width, subtext ? 61 : 48);
    ctx.fillStyle = color;
    ctx.font = '700 22px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(text, vw / 2, y - (subtext ? 8 : 0));
    if (subtext) {
      ctx.fillStyle = '#4E5D73';
      ctx.font = '500 12px "PingFang SC", "Microsoft JhengHei", sans-serif';
      ctx.fillText(subtext, vw / 2, y + 18, width - 28);
    }
    ctx.restore();
  }

  drawHero(ctx, id, centerX, bottomY, maxW, maxH, phase = 0, alpha = 1) {
    const bob = this.motion(Math.sin(phase * Math.PI * 2) * 5);
    const lean = this.motion(Math.sin(phase * Math.PI * 2) * 0.035);
    ctx.save();
    ctx.translate(centerX, bottomY + bob);
    ctx.rotate(lean);
    this.drawContain(ctx, this.heroImgs[id], 0, 0, maxW, maxH, alpha);
    ctx.restore();
  }

  renderShot1TaipeiDawn(ctx, vw, vh) {
    const local = this.time - SHOT_STARTS[0];
    const reveal = smooth(local / 0.65);
    const pan = this.motion(local * 18);
    ctx.save();
    ctx.globalAlpha = reveal;
    this.drawCover(ctx, this.backgrounds.station, vw, vh, pan);
    this.drawMorningGrade(ctx, vw, vh, 0.82);
    this.drawTaipeiSkyline(ctx, vw, vh, 0.58);
    this.drawPetals(ctx, vw, vh, local, 14);
    ctx.fillStyle = 'rgba(234, 246, 255, 0.82)';
    ctx.fillRect(26, 24, 184, 43);
    ctx.fillStyle = '#17305A';
    ctx.font = '700 21px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('07:57:00', 42, 51);
    ctx.font = '600 14px "PingFang SC", sans-serif';
    ctx.fillText('07:57｜象山', 42, 84);
    ctx.restore();
  }

  renderShot2HeroBeats(ctx, vw, vh) {
    const local = this.time - SHOT_STARTS[1];
    const beatLength = (SHOT_ENDS[1] - SHOT_STARTS[1]) / 3;
    const index = Math.min(2, Math.floor(local / beatLength));
    const beatTime = local - index * beatLength;
    const hero = HEROES[index];
    const backgrounds = [this.backgrounds.station, this.backgrounds.lane, this.backgrounds.park];
    this.drawCover(ctx, backgrounds[index], vw, vh, this.motion(beatTime * 12));
    this.drawMorningGrade(ctx, vw, vh, 0.58);
    const enter = smooth(beatTime / 0.24);
    const exit = 1 - smooth((beatTime - beatLength + 0.18) / 0.18);
    const alpha = Math.min(enter, exit);
    const travel = this.reducedMotion ? 0 : (1 - enter) * -130;
    const heroHeight = this.isCompact() ? 350 : 390;
    this.drawHero(ctx, hero.id, vw / 2 + travel, vh - 44, 390, heroHeight, beatTime * 2.2, alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = hero.color;
    ctx.fillRect(0, vh - 82, vw, 82);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = '800 24px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText(hero.name, vw / 2, vh - 35);
    ctx.restore();
  }

  renderShot3CommuteMontage(ctx, vw, vh) {
    const local = this.time - SHOT_STARTS[2];
    const segment = Math.min(2, Math.floor(local / 0.74));
    const backgrounds = [this.backgrounds.station, this.backgrounds.lane, this.backgrounds.hospital];
    this.drawCover(ctx, backgrounds[segment], vw, vh, this.motion(local * 28));
    this.drawMorningGrade(ctx, vw, vh, 0.36);
    ctx.fillStyle = 'rgba(23, 48, 90, 0.22)';
    ctx.fillRect(0, vh - 82, vw, 82);
    const compact = this.isCompact();
    const formation = compact ? [360, 480, 600] : [315, 480, 645];
    HEROES.forEach((hero, index) => {
      this.drawHero(ctx, hero.id, formation[index], vh - 42 + (index === 1 ? -14 : 0), 150, compact ? 176 : 192, local * 2.7 + index / 3);
    });
    for (let index = 0; index < 5; index++) {
      const x = 90 + index * 180 - this.motion((local * 130) % 180);
      ctx.fillStyle = '#FFD66B';
      ctx.beginPath();
      ctx.arc(x, vh - 155 - (index % 2) * 28, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = '#FFF8E1';
    ctx.fillRect(vw - 120, vh - 165, 25, 35);
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(vw - 116, vh - 145, 17, 12);
    ctx.fillStyle = '#4E8B57';
    ctx.fillRect(55, vh - 72, 128, 16);
  }

  renderShot4MonsterAmbush(ctx, vw, vh) {
    const local = this.time - SHOT_STARTS[3];
    this.drawCover(ctx, this.backgrounds.park, vw, vh, this.motion(local * 8));
    const mist = ctx.createLinearGradient(0, 0, 0, vh);
    mist.addColorStop(0, 'rgba(234, 246, 255, 0.25)');
    mist.addColorStop(1, 'rgba(78, 139, 87, 0.72)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = '#4E8B57';
    ctx.lineWidth = 4;
    for (let index = 0; index < 18; index++) {
      const sway = this.motion(Math.sin(local * 3 + index) * 9);
      ctx.beginPath();
      ctx.moveTo(index * 58, vh);
      ctx.quadraticCurveTo(index * 58 + sway, vh - 70, index * 58 + 10, vh - 118);
      ctx.stroke();
    }
    const order = ['red', 'ice', 'grape', 'blue', 'yellow', 'obsidian', 'pink'];
    const positions = [
      [330, 475, 142], [480, 482, 150], [630, 475, 142],
      [385, 355, 118], [575, 355, 118],
      [430, 255, 98], [535, 255, 98]
    ];
    order.forEach((key, index) => {
      const appearance = smooth((local - 0.55 - index * 0.09) / 0.28);
      const [x, bottom, size] = positions[index];
      const jump = this.motion((1 - appearance) * 75);
      this.drawContain(ctx, this.monsterImgs[key], x, bottom + jump, size, size, appearance);
    });
    if (local > 1.3) this.drawAmbushProjectiles(ctx, vw, vh, local - 1.3);
    this.drawCaption(ctx, '晨霧異變', '', vw, 57, '#7A164F');
  }

  drawAmbushProjectiles(ctx, vw, vh, time) {
    ctx.save();
    const travel = this.motion(time * 310);
    for (let index = 0; index < 4; index++) {
      const x = (250 + index * 210 + travel) % (vw + 140) - 70;
      ctx.fillStyle = '#FF5252';
      ctx.beginPath();
      ctx.ellipse(x, 175 + index * 30, 13, 6, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#B388FF';
      ctx.beginPath();
      ctx.arc(vw - x, 230 + index * 22, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EAF6FF';
      ctx.beginPath();
      ctx.moveTo(x + 48, 120 + index * 25);
      ctx.lineTo(x + 60, 140 + index * 25);
      ctx.lineTo(x + 38, 140 + index * 25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  renderShot5BossTease(ctx, vw, vh) {
    const local = this.time - SHOT_STARTS[4];
    this.drawCover(ctx, this.backgrounds.hospital, vw, vh);
    ctx.fillStyle = 'rgba(44, 18, 55, 0.58)';
    ctx.fillRect(0, 0, vw, vh);
    const fog = ctx.createRadialGradient(vw / 2, vh * 0.55, 20, vw / 2, vh * 0.55, 380);
    fog.addColorStop(0, 'rgba(245, 154, 215, 0.48)');
    fog.addColorStop(1, 'rgba(122, 22, 79, 0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, vw, vh);
    const reveal = smooth((local - 0.18) / 0.82);
    const bossHeight = this.isCompact() ? 365 : 420;
    this.drawContain(ctx, this.bossImgs.phase1, vw / 2, vh + 15, 620, bossHeight, reveal);
    if (local > 1.45 && local < 1.62) {
      const flash = 1 - Math.abs(local - 1.535) / 0.085;
      this.drawContain(ctx, this.bossImgs.phase2, vw / 2, vh + 15, 620, bossHeight, clamp01(flash) * 0.72);
    }
    this.drawPetals(ctx, vw, vh, local, 22);
    this.drawCaption(
      ctx,
      '夢影巨花王',
      '在夢的花園裡，最美的夢，也是最危險的陷阱。',
      vw,
      68,
      '#7A164F'
    );
  }

  renderShot6HeroRunLogo(ctx, vw, vh) {
    const local = this.time - SHOT_STARTS[5];
    this.drawCover(ctx, this.backgrounds.hospital, vw, vh, this.motion(local * 10));
    this.drawMorningGrade(ctx, vw, vh, 0.7);
    this.drawTaipeiSkyline(ctx, vw, vh, 0.42);
    this.drawPetals(ctx, vw, vh, local, 24);
    const compact = this.isCompact();
    const baseY = compact ? vh - 34 : vh - 24;
    const runIn = smooth(local / 0.55);
    const offset = this.reducedMotion ? 0 : (1 - runIn) * -260;
    this.drawHero(ctx, 'shakira', vw / 2 - (compact ? 120 : 170) + offset, baseY - 18, 185, compact ? 210 : 240, local * 2.4);
    this.drawHero(ctx, 'sandra', vw / 2 + (compact ? 120 : 170) + offset, baseY - 10, 185, compact ? 210 : 240, local * 2.4 + 0.35);
    this.drawHero(ctx, 'yu', vw / 2 + offset, baseY, 220, compact ? 260 : 290, local * 2.4 + 0.7);

    const logoAlpha = smooth((local - 1.65) / 0.32);
    ctx.save();
    ctx.globalAlpha = logoAlpha;
    ctx.fillStyle = 'rgba(234, 246, 255, 0.91)';
    const logoW = compact ? 560 : 650;
    ctx.fillRect(vw / 2 - logoW / 2, 38, logoW, 174);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#17305A';
    ctx.font = `${compact ? 42 : 50}px 900 "PingFang SC", "Microsoft JhengHei", sans-serif`;
    ctx.fillText('08點上班大作戰', vw / 2, 92);
    ctx.fillStyle = '#7A164F';
    ctx.font = '800 23px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('通勤英雄篇', vw / 2, 128);
    ctx.fillStyle = '#4E8B57';
    ctx.font = '600 14px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('象山晨衝・奔向松德', vw / 2, 155);
    ctx.fillStyle = '#D84315';
    ctx.font = '800 16px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('08:00 前，準時打卡！', vw / 2, 182);
    ctx.fillStyle = '#17305A';
    ctx.font = '600 13px "PingFang SC", "Microsoft JhengHei", sans-serif';
    ctx.fillText('按任意鍵開始', vw / 2, 203);
    ctx.restore();
  }

  renderSkipButton(ctx, vw) {
    ctx.save();
    const x = vw - 150;
    ctx.fillStyle = 'rgba(23, 48, 90, 0.78)';
    ctx.fillRect(x, 16, 135, 36);
    ctx.strokeStyle = '#FFD66B';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, 16, 135, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 12px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('略過  SPACE / ESC', x + 67.5, 34);
    ctx.restore();
  }

  renderProgressBar(ctx, vw, vh) {
    const ratio = clamp01(this.time / this.duration);
    ctx.fillStyle = 'rgba(23, 48, 90, 0.2)';
    ctx.fillRect(0, vh - 5, vw, 5);
    const gradient = ctx.createLinearGradient(0, 0, vw, 0);
    gradient.addColorStop(0, '#9DD8FF');
    gradient.addColorStop(0.55, '#FFD66B');
    gradient.addColorStop(1, '#F59AD7');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, vh - 5, vw * ratio, 5);
  }
}

export const introCinematic = new IntroCinematic();
