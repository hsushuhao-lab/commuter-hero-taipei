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
    this.imgRaindrop = new Image();
    this.imgRaindrop.src = 'assets/item_raindrop.png';
    this.imgCookingSpark = new Image();
    this.imgCookingSpark.src = 'assets/item_cookingspark.png';
    this.imgBrick = new Image();
    this.imgBrick.src = 'assets/tile_brick.png';
    this.imgGround = new Image();
    this.imgGround.src = 'assets/tile_ground.png';
    this.imgClockMachine = new Image();
    this.imgClockMachine.src = 'assets/prop_clock_machine.png';
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
      width: 72,
      height: 96,
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
        }
      }
    }

    // Check Clock-In Machine Punch
    if (this.clockInMachine && !this.clockInMachine.punched) {
      const dist = Math.hypot(player.x - this.clockInMachine.x, player.y - this.clockInMachine.y);
      if (dist < 55) {
        this.clockInMachine.punched = true;
        this.clockInMachine.punchedTimeText = this.clockInMachine.customTimeText || '07:59:20';
        audio.playStamp();
        particles.emitHitSparks(this.clockInMachine.x, this.clockInMachine.y - 45, '#4CAF50', 25);
        particles.emitCoinSparkle(this.clockInMachine.x, this.clockInMachine.y - 60);
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

    // 2. Render Collectibles (Only Coin and Coffee in gameplay)
    for (let item of this.items) {
      if (item.collected) continue;
      if (item.x + item.width < camera.x - 50 || item.x > camera.x + camera.viewportWidth + 50) continue;

      ctx.save();
      ctx.translate(item.x, item.y);

      const img = item.type === 'coffee' ? this.imgCoffee : this.imgCoin;

      if (img.complete && img.naturalWidth > 0) {
        const size = item.width;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      } else {
        // Fallback
        ctx.fillStyle = item.type === 'coin' ? '#FFD700' : '#8D6E63';
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

    // 3. Render Clock-In Machine (松德院區打卡機)
    if (this.clockInMachine) {
      const m = this.clockInMachine;
      if (m.x + m.width >= camera.x - 50 && m.x <= camera.x + camera.viewportWidth + 50) {
        ctx.save();
        ctx.translate(m.x, m.y);

        // Celebratory Green Beacon when punched
        if (m.punched) {
          ctx.save();
          const beaconGrad = ctx.createLinearGradient(0, 0, 0, -300);
          beaconGrad.addColorStop(0, 'rgba(76, 175, 80, 0.4)');
          beaconGrad.addColorStop(0.5, 'rgba(0, 230, 118, 0.2)');
          beaconGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
          ctx.fillStyle = beaconGrad;
          ctx.beginPath();
          ctx.moveTo(-m.width * 0.7, 0);
          ctx.lineTo(-m.width * 1.5, -300);
          ctx.lineTo(m.width * 1.5, -300);
          ctx.lineTo(m.width * 0.7, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Render high-res AI cutout prop
        if (this.imgClockMachine.complete && this.imgClockMachine.naturalWidth > 0) {
          ctx.drawImage(this.imgClockMachine, -m.width / 2, -m.height, m.width, m.height);
        } else {
          // Fallback metal kiosk
          ctx.fillStyle = '#2E7D32';
          ctx.fillRect(-m.width / 2, -m.height, m.width, m.height);
          ctx.strokeStyle = '#1B5E20';
          ctx.lineWidth = 2;
          ctx.strokeRect(-m.width / 2, -m.height, m.width, m.height);
        }

        // Digital LED Clock Screen Overlay
        const screenW = 44;
        const screenH = 22;
        const screenY = -m.height * 0.58;
        ctx.fillStyle = m.punched ? '#1B5E20' : '#263238';
        ctx.fillRect(-screenW / 2, screenY, screenW, screenH);
        ctx.strokeStyle = m.punched ? '#00E676' : '#90A4AE';
        ctx.lineWidth = 1;
        ctx.strokeRect(-screenW / 2, screenY, screenW, screenH);

        const displayTime = m.punchedTimeText || '07:58:00';
        ctx.fillStyle = m.punched ? '#00E676' : '#FFD54F';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayTime, 0, screenY + screenH / 2);

        // Punch status banner
        ctx.fillStyle = m.punched ? '#00E676' : '#FFD700';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = m.punched ? '#00E676' : '#FFD700';
        ctx.shadowBlur = 10;
        ctx.fillText(m.punched ? `★ ${displayTime} ON TIME!` : '🖹 松德院區打卡處', 0, -m.height - 10);

        ctx.restore();
      }
    }

    ctx.restore();
  }
}
