/**
 * 08點上班大作戰：通勤英雄篇 - 粒子特效系統 (Particles.js)
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  reset() {
    this.particles = [];
  }

  emit(p) {
    this.particles.push({
      x: p.x || 0,
      y: p.y || 0,
      vx: p.vx || 0,
      vy: p.vy || 0,
      size: p.size || 4,
      color: p.color || '#fff',
      alpha: p.alpha !== undefined ? p.alpha : 1.0,
      maxLife: p.life || 0.5,
      life: p.life || 0.5,
      gravity: p.gravity || 0,
      shape: p.shape || 'circle', // circle, rect, star, slash, rain, petal
      rotation: p.rotation || 0,
      vRot: p.vRot || 0,
      fade: p.fade !== undefined ? p.fade : true
    });
  }

  // --- Particle Presets ---

  emitDust(x, y, count = 4, color = 'rgba(255,255,255,0.7)') {
    for (let i = 0; i < count; i++) {
      this.emit({
        x: x + (Math.random() * 20 - 10),
        y: y - Math.random() * 4,
        vx: (Math.random() * 2 - 1) * 35,
        vy: -Math.random() * 20 - 5,
        size: Math.random() * 4 + 2,
        color: color,
        life: 0.35,
        gravity: 30,
        shape: 'circle'
      });
    }
  }

  emitHitSparks(x, y, color = '#FFD54F', count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 180 + 60;
      this.emit({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: color,
        life: 0.25 + Math.random() * 0.15,
        gravity: 200,
        shape: 'slash'
      });
    }
  }

  emitCoinSparkle(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = i * (Math.PI / 3);
      this.emit({
        x: x,
        y: y,
        vx: Math.cos(angle) * 70,
        vy: Math.sin(angle) * 70,
        size: 3,
        color: '#FFD700',
        life: 0.3,
        shape: 'star'
      });
    }
  }

  emitRain(cameraX, viewportWidth, viewportHeight, intensity = 1.0) {
    const drops = Math.floor(intensity * 5);
    for (let i = 0; i < drops; i++) {
      this.emit({
        x: cameraX + Math.random() * viewportWidth,
        y: Math.random() * -40,
        vx: -80 - Math.random() * 40,
        vy: 650 + Math.random() * 150,
        size: 1.5,
        color: 'rgba(200, 230, 255, 0.45)',
        life: 0.9,
        gravity: 0,
        shape: 'rain',
        fade: false
      });
    }
  }

  emitPetals(cameraX, viewportWidth, count = 2) {
    for (let i = 0; i < count; i++) {
      this.emit({
        x: cameraX + Math.random() * viewportWidth,
        y: -10,
        vx: 30 + Math.random() * 40,
        vy: 40 + Math.random() * 30,
        size: Math.random() * 4 + 3,
        color: 'rgba(255, 182, 193, 0.75)',
        life: 4.5,
        gravity: 5,
        shape: 'petal',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 2
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rotation += p.vRot * dt;
      if (p.fade) {
        p.alpha = Math.max(0, p.life / p.maxLife);
      }
    }
  }

  render(ctx) {
    ctx.save();
    for (let p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'rain') {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.02, p.y + p.vy * 0.02);
        ctx.stroke();
      } else if (p.shape === 'star') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
      } else if (p.shape === 'petal') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.shape === 'slash') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export const particles = new ParticleSystem();
