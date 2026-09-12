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
    this.arenaGateActive = true; // Gate at x=16500 blocks entrance while Boss is alive

    // Preload item & tile textures (Only Coin and Coffee in gameplay)
    this.imgCoin = new Image();
    this.imgCoin.src = 'assets/item_coin.png';
    this.imgCoffee = new Image();
    this.imgCoffee.src = 'assets/item_coffee.png';
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
    this.arenaGateActive = true;
  }

  addPlatform(x, y, w, h = 24, type = 'brick') {
    this.platforms.push({ x, y, w, h, type });
  }

  addItem(type, x, y) {
    // v9.2: Coin is 48px, Coffee is 46x56px
    const w = type === 'coffee' ? 46 : 48;
    const h = type === 'coffee' ? 56 : 48;
    this.items.push({
      type, // 'coin' or 'coffee'
      x,
      y,
      originY: y,
      bobOffset: Math.random() * Math.PI * 2,
      collected: false,
      width: w,
      height: h
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

    // 2. Render Collectibles (v9.2: Only Coin and Coffee in gameplay)
    const now = performance.now();
    for (let item of this.items) {
      if (item.collected) continue;
      if (item.x + item.width < camera.x - 50 || item.x > camera.x + camera.viewportWidth + 50) continue;

      ctx.save();
      ctx.translate(item.x, item.y);

      if (item.type === 'coin') {
        // v9.2 COIN: 48px display size, 6-frame 3D rotation, gold rim, 08 motif, glint shine, outer glow
        const rotAngle = (now * 0.0035 + item.bobOffset) % (Math.PI * 2);
        const scaleX = Math.cos(rotAngle);
        const absScale = Math.max(0.12, Math.abs(scaleX));
        const r = 24;

        // Outer soft golden glow
        ctx.save();
        const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 32);
        glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
        glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw 3D rotating coin disc
        ctx.save();
        ctx.scale(scaleX, 1);

        // Rim thickness extrusion (edge view)
        if (Math.abs(scaleX) < 0.8) {
          ctx.fillStyle = '#C67100';
          ctx.beginPath();
          ctx.ellipse(-scaleX * 3, 0, r, r, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Outer Gold Bevel
        const goldGrad = ctx.createLinearGradient(-r, -r, r, r);
        goldGrad.addColorStop(0, '#FFF9C4');
        goldGrad.addColorStop(0.3, '#FFD54F');
        goldGrad.addColorStop(0.7, '#FFA000');
        goldGrad.addColorStop(1, '#FF6F00');
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFE082';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner Recessed Disc
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFA000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // "08" Motif
        if (absScale > 0.35) {
          ctx.fillStyle = '#FFF8E1';
          ctx.font = 'bold 15px "Arial Black", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#FF8F00';
          ctx.shadowBlur = 4;
          ctx.fillText('08', 0, 0);
        }

        // Specular Glint sweep
        const glintPhase = (Math.sin(rotAngle * 2) + 1) / 2;
        if (glintPhase > 0.7) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.beginPath();
          ctx.ellipse((glintPhase - 0.85) * 40, -4, 4, 18, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      } else if (item.type === 'coffee') {
        // v9.2 COFFEE: 46x56px display size, paper cup with sleeve and lid, rising steam animation
        const cw = 42;
        const ch = 52;

        // Animated Rising Steam (3 wisps rising and drifting)
        ctx.save();
        for (let s = 0; s < 3; s++) {
          const steamTime = (now * 0.002 + s * 1.2) % 2.0; // 0 to 2.0s
          const steamProgress = steamTime / 2.0;
          const sx = (s - 1) * 8 + Math.sin(steamTime * 3 + s) * 5;
          const sy = -ch / 2 - 4 - steamProgress * 26;
          const steamAlpha = Math.sin(steamProgress * Math.PI) * 0.65;
          ctx.fillStyle = `rgba(255, 255, 255, ${steamAlpha})`;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 3 + steamProgress * 4, 5 + steamProgress * 5, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Soft coffee aroma aura
        ctx.save();
        const auraGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, 32);
        auraGrad.addColorStop(0, 'rgba(121, 85, 72, 0.25)');
        auraGrad.addColorStop(1, 'rgba(121, 85, 72, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Cup Body (Trapezoid paper cup)
        ctx.save();
        ctx.fillStyle = '#EFEBE9';
        ctx.beginPath();
        ctx.moveTo(-cw * 0.44, -ch * 0.38);
        ctx.lineTo(cw * 0.44, -ch * 0.38);
        ctx.lineTo(cw * 0.34, ch * 0.48);
        ctx.lineTo(-cw * 0.34, ch * 0.48);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#D7CCC8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Kraft Paper Sleeve (Center)
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.moveTo(-cw * 0.42, -ch * 0.12);
        ctx.lineTo(cw * 0.42, -ch * 0.12);
        ctx.lineTo(cw * 0.37, ch * 0.22);
        ctx.lineTo(-cw * 0.37, ch * 0.22);
        ctx.closePath();
        ctx.fill();

        // Sleeve Logo "08 AM"
        ctx.fillStyle = '#FFF8E1';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('08 AM', 0, ch * 0.05);

        // Cup Lid (Dark roast plastic lid)
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.roundRect(-cw * 0.48, -ch * 0.48, cw * 0.96, 7, 3);
        ctx.fill();
        // Lid Sip Stopper
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(-6, -ch * 0.48 - 3, 12, 3);
        ctx.restore();
      }

      ctx.restore();
    }

    // 3. Render Boss Arena Gate (x = 16500)
    if (this.arenaGateActive && camera.x + camera.viewportWidth >= 16400 && camera.x <= 16650) {
      ctx.save();
      const gateX = 16500;
      const gateH = 460;
      const gateY = 100;

      // Vertical Energy Barrier
      const pulse = 0.5 + Math.sin(now * 0.005) * 0.25;
      const barrierGrad = ctx.createLinearGradient(gateX - 25, 0, gateX + 25, 0);
      barrierGrad.addColorStop(0, 'rgba(233, 30, 99, 0)');
      barrierGrad.addColorStop(0.5, `rgba(233, 30, 99, ${0.45 * pulse})`);
      barrierGrad.addColorStop(1, 'rgba(233, 30, 99, 0)');
      ctx.fillStyle = barrierGrad;
      ctx.fillRect(gateX - 25, gateY, 50, gateH);

      // Warning laser grid lines
      ctx.strokeStyle = `rgba(255, 64, 129, ${0.8 * pulse})`;
      ctx.lineWidth = 2.5;
      for (let ly = gateY + 20; ly < gateY + gateH; ly += 38) {
        ctx.beginPath();
        ctx.moveTo(gateX - 20, ly);
        ctx.lineTo(gateX + 20, ly);
        ctx.stroke();
      }

      // Gate Frame Posts
      ctx.fillStyle = '#37474F';
      ctx.fillRect(gateX - 8, gateY, 16, gateH);
      ctx.strokeStyle = '#90A4AE';
      ctx.lineWidth = 2;
      ctx.strokeRect(gateX - 8, gateY, 16, gateH);

      // Flashing Warning Siren
      ctx.fillStyle = Math.sin(now * 0.01) > 0 ? '#FF1744' : '#FF80AB';
      ctx.beginPath();
      ctx.arc(gateX, gateY - 12, 10, 0, Math.PI * 2);
      ctx.fill();

      // Warning Banner
      ctx.save();
      ctx.translate(gateX, gateY + 200);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#FF80AB';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ 院區門禁管制・請先擊退巨花王 ⚠', 0, -14);
      ctx.restore();

      ctx.restore();
    }

    // 4. Render Clock-In Machine (松德院區打卡機)
    if (this.clockInMachine) {
      const m = this.clockInMachine;
      if (m.x + m.width >= camera.x - 50 && m.x <= camera.x + camera.viewportWidth + 50) {
        ctx.save();
        ctx.translate(m.x, m.y);

        // Celebratory Green Beacon when punched
        if (m.punched) {
          ctx.save();
          const beaconGrad = ctx.createLinearGradient(0, 0, 0, -320);
          beaconGrad.addColorStop(0, 'rgba(76, 175, 80, 0.55)');
          beaconGrad.addColorStop(0.5, 'rgba(0, 230, 118, 0.3)');
          beaconGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
          ctx.fillStyle = beaconGrad;
          ctx.beginPath();
          ctx.moveTo(-m.width * 0.8, 0);
          ctx.lineTo(-m.width * 1.8, -320);
          ctx.lineTo(m.width * 1.8, -320);
          ctx.lineTo(m.width * 0.8, 0);
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
