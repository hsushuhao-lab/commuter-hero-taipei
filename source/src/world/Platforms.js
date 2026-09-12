/**
 * 08點上班大作戰：通勤英雄篇 - 平台與收集品系統 (Platforms.js)
 * 規格遵循：
 * - 平台厚度 >= 20px，立體磚塊/地面紋理，頂部 4~5px 高光線，30% 明度對比，下方陰影
 * - 收集品：通勤金幣 🪙 (15枚永久解鎖大招)、咖啡 ☕ (5秒加速)、悠遊卡 💳 (+3金幣)、愛心 ❤️ (+25HP)
 * - 松德打卡機 (Clock-in Machine)：打卡特效與戳章音效
 */

import { audio } from '../engine/Audio.js';
import { particles } from '../entities/Particles.js';

export class PlatformManager {
  constructor() {
    this.platforms = [];
    this.items = [];
    this.clockInMachine = null;

    // Preload item textures
    this.imgCoin = new Image();
    this.imgCoin.src = 'assets/item_coin.png';
    this.imgCoffee = new Image();
    this.imgCoffee.src = 'assets/item_coffee.png';
    this.imgEasyCard = new Image();
    this.imgEasyCard.src = 'assets/item_easycard.png';
    this.imgHeart = new Image();
    this.imgHeart.src = 'assets/item_heart.png';
    this.imgBrick = new Image();
    this.imgBrick.src = 'assets/tile_brick.png';
    this.imgGround = new Image();
    this.imgGround.src = 'assets/tile_ground.png';
  }

  reset() {
    this.platforms = [];
    this.items = [];
    this.clockInMachine = null;
  }

  addPlatform(x, y, w, h = 24, type = 'brick') {
    this.platforms.push({ x, y, w, h, type });
  }

  addItem(type, x, y) {
    this.items.push({
      type, // 'coin', 'coffee', 'easycard', 'heart'
      x,
      y,
      originY: y,
      bobOffset: Math.random() * Math.PI * 2,
      collected: false,
      width: 28,
      height: 28
    });
  }

  setClockInMachine(x, y) {
    this.clockInMachine = {
      x,
      y,
      width: 46,
      height: 74,
      punched: false
    };
  }

  update(dt, player) {
    // Bob items
    for (let item of this.items) {
      if (item.collected) continue;
      item.bobOffset += dt * 3;
      item.y = item.originY + Math.sin(item.bobOffset) * 5;

      // Collection check
      const dist = Math.hypot(player.x - item.x, (player.y - 35) - item.y);
      if (dist < 36) {
        item.collected = true;
        if (item.type === 'coin') {
          player.addCoins(1);
          audio.playCoin();
          particles.emitCoinSparkle(item.x, item.y);
        } else if (item.type === 'coffee') {
          player.addCoffee();
          audio.playPowerup();
          particles.emitDust(item.x, item.y, 8, '#795548');
        } else if (item.type === 'easycard') {
          player.addCoins(3);
          audio.playPowerup();
          particles.emitCoinSparkle(item.x, item.y);
        } else if (item.type === 'heart') {
          player.addHp(25);
          audio.playPowerup();
        }
      }
    }

    // Check Clock-In Machine Punch
    if (this.clockInMachine && !this.clockInMachine.punched) {
      const dist = Math.hypot(player.x - this.clockInMachine.x, player.y - this.clockInMachine.y);
      if (dist < 45) {
        this.clockInMachine.punched = true;
        audio.playStamp();
        particles.emitHitSparks(this.clockInMachine.x, this.clockInMachine.y - 40, '#4CAF50', 20);
      }
    }
  }

  render(ctx, camera) {
    ctx.save();

    // 1. Render Platforms with 3D Bevel, Texture, Top Highlight, and Underside Shadow
    for (let p of this.platforms) {
      // Frustum culling
      if (p.x + p.w < camera.x - 50 || p.x > camera.x + camera.viewportWidth + 50) continue;

      // Platform Base Body (At least 20px thick)
      ctx.fillStyle = p.type === 'stone' ? '#37474F' : '#4E342E';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Tile texture repeating if loaded
      const tileImg = p.type === 'stone' ? this.imgGround : this.imgBrick;
      if (tileImg.complete && tileImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(p.x, p.y, p.w, p.h);
        ctx.clip();
        const patSize = 48;
        for (let tx = p.x; tx < p.x + p.w; tx += patSize) {
          ctx.drawImage(tileImg, tx, p.y, patSize, patSize);
        }
        ctx.restore();
      }

      // Top Highlight Line (4~5px, 30% higher lightness)
      ctx.fillStyle = p.type === 'stone' ? '#78909C' : '#8D6E63';
      ctx.fillRect(p.x, p.y, p.w, 4);

      // Top Edge White Specular Glint (1px)
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(p.x, p.y, p.w, 1.5);

      // Underside Deep Cast Shadow (4px)
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);
    }

    // 2. Render Collectibles
    for (let item of this.items) {
      if (item.collected) continue;
      if (item.x + item.width < camera.x - 50 || item.x > camera.x + camera.viewportWidth + 50) continue;

      ctx.save();
      ctx.translate(item.x, item.y);

      let img = this.imgCoin;
      if (item.type === 'coffee') img = this.imgCoffee;
      else if (item.type === 'easycard') img = this.imgEasyCard;
      else if (item.type === 'heart') img = this.imgHeart;

      if (img.complete && img.naturalWidth > 0) {
        const size = item.width;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      } else {
        // Fallback
        ctx.fillStyle = item.type === 'coin' ? '#FFD700' : (item.type === 'heart' ? '#F44336' : '#8D6E63');
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Item soft glow
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 3. Render Clock-In Machine
    if (this.clockInMachine) {
      const m = this.clockInMachine;
      ctx.save();
      ctx.translate(m.x, m.y);

      // Machine Body (Green/Grey metal standing kiosk)
      ctx.fillStyle = '#2E7D32';
      ctx.fillRect(-m.width / 2, -m.height, m.width, m.height);
      ctx.strokeStyle = '#1B5E20';
      ctx.lineWidth = 2;
      ctx.strokeRect(-m.width / 2, -m.height, m.width, m.height);

      // Screen
      ctx.fillStyle = '#000';
      ctx.fillRect(-m.width / 2 + 6, -m.height + 8, m.width - 12, 22);

      // Digital Clock LED: 07:58:24
      ctx.fillStyle = m.punched ? '#69F0AE' : '#76FF03';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(m.punched ? 'ON TIME!' : '07:58:24', 0, -m.height + 23);

      // Card Slot
      ctx.fillStyle = '#1B5E20';
      ctx.fillRect(-14, -m.height + 36, 28, 4);

      // Status indicator light
      ctx.fillStyle = m.punched ? '#00E676' : '#FFD600';
      ctx.beginPath();
      ctx.arc(0, -m.height + 50, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }
}
