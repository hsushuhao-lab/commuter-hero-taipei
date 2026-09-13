/**
 * 08點上班大作戰：通勤英雄篇 - 投射物與彈幕系統 (Projectiles.js)
 */

import { particles } from './Particles.js';

export class ProjectileManager {
  constructor() {
    this.projectiles = [];
    this.nextProjId = 1;
  }

  reset() {
    this.projectiles = [];
    this.nextProjId = 1;
  }

  clear() {
    this.reset();
  }

  setSourceContext(context) {
    this.sourceContext = context;
  }

  clearSourceContext() {
    this.sourceContext = null;
  }

  spawn(p) {
    const source = this.sourceContext || {};
    if (!p.isPlayer && (source.attackPhase === 1 || source.attackPhase === 2)) {
      const pressureLimit = 3;
      if (this.projectiles.filter(projectile => !projectile.isPlayer).length >= pressureLimit) return null;
    }
    const projectile = {
      id: p.id || `proj_${this.nextProjId++}`,
      isPlayer: p.isPlayer || false,
      x: p.x || 0,
      y: p.y || 0,
      startX: p.x || 0,
      startY: p.y || 0,
      maxDistance: p.maxDistance || null,
      arenaBounds: p.arenaBounds || null,
      vx: p.vx || 0,
      vy: p.vy || 0,
      width: p.width || 16,
      height: p.height || 16,
      damage: p.damage || 10,
      life: p.life || 2.0,
      maxLife: p.life || 2.0,
      color: p.color || '#fff',
      type: p.type || 'bullet', // wind_blade, egg, pan_wave, petal, vine, laser
      penetrating: p.penetrating || false,
      rotates: p.rotates || false,
      rotation: p.rotation || 0,
      vRot: p.vRot || 0,
      canClearEnemyBullets: p.canClearEnemyBullets || false,
      splashRadius: p.splashRadius || 0,
      splashDamage: p.splashDamage || 0,
      isMeleeArc: p.isMeleeArc || false,
      zoneCenterX: p.zoneCenterX || null,
      zoneRadius: p.zoneRadius || null,
      sourceMonster: p.sourceMonster || source.sourceMonster || '',
      attackPhase: p.attackPhase || source.attackPhase || 0,
      attackType: p.attackType || source.attackType || p.type || 'bullet',
      telegraphShown: p.telegraphShown ?? source.telegraphShown ?? false
    };
    this.projectiles.push(projectile);
    return projectile;
  }

  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.rotates) p.rotation += p.vRot * dt;

      // Max physical distance culling
      if (p.maxDistance !== null) {
        const traveled = Math.hypot(p.x - p.startX, p.y - p.startY);
        if (traveled >= p.maxDistance) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Arena bounds culling (Boss bullets cannot escape arena)
      if (p.arenaBounds) {
        if (p.x < p.arenaBounds.minX || p.x > p.arenaBounds.maxX) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Particle trails
      if (p.isPlayer && p.type === 'wind_blade' && Math.random() < 0.4) {
        particles.emit({
          x: p.x - p.vx * 0.03,
          y: p.y,
          vx: -p.vx * 0.1,
          vy: (Math.random() - 0.5) * 20,
          size: 3,
          color: '#B3E5FC',
          life: 0.2,
          shape: 'circle'
        });
      }
    }
  }

  clearEnemyProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i].isPlayer) {
        const p = this.projectiles[i];
        particles.emitHitSparks(p.x, p.y, '#FFD54F', 4);
        this.projectiles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();
    for (let p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.type === 'wind_blade') {
        // Cyan crescent wind blade
        ctx.fillStyle = '#4FC3F7';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        const dir = p.vx >= 0 ? 1 : -1;
        ctx.scale(dir, 1);
        ctx.arc(0, 0, p.width, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.lineTo(-p.width * 0.5, 0);
        ctx.closePath();
        ctx.fill();
      } 
      else if (p.type === 'umbrella_bullet') {
        // Needle wind bullet from umbrella machine gun
        ctx.fillStyle = '#00E5FF';
        ctx.shadowColor = '#0288D1';
        ctx.shadowBlur = 8;
        const dir = p.vx >= 0 ? 1 : -1;
        ctx.scale(dir, 1);
        ctx.beginPath();
        ctx.moveTo(p.width * 0.5, 0);
        ctx.lineTo(-p.width * 0.5, -p.height * 0.4);
        ctx.lineTo(-p.width * 0.2, 0);
        ctx.lineTo(-p.width * 0.5, p.height * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      else if (p.type === 'egg') {
        // Golden soft boiled egg bullet
        ctx.fillStyle = '#FFFDE7';
        ctx.strokeStyle = '#FFE082';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.width, p.height, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Golden yolk
        ctx.fillStyle = '#FFA000';
        ctx.beginPath();
        ctx.arc(0, 0, p.width * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (p.type === 'pan_wave') {
        // Fiery cookware wave
        ctx.fillStyle = '#FF5722';
        ctx.shadowColor = '#FF9800';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, p.width, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.lineTo(-p.width * 0.4, 0);
        ctx.closePath();
        ctx.fill();
      }
      else if (p.type === 'petal') {
        // Boss / Flower monster petal
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.width, p.height * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (p.type === 'vine') {
        // Vine thorn thrust
        ctx.fillStyle = '#2E7D32';
        ctx.strokeStyle = '#1B5E20';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -p.height);
        ctx.lineTo(p.width * 0.5, 0);
        ctx.lineTo(-p.width * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      else if (p.type === 'transit_beam') {
        // Glowing cyan/green transit card laser beam
        ctx.fillStyle = p.color || '#00E676';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 12;
        ctx.fillRect(-p.width * 0.5, -p.height * 0.5, p.width, p.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-p.width * 0.4, -p.height * 0.2, p.width * 0.8, p.height * 0.4);
      }
      else {
        // Generic glowing orb bullet
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, p.width * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }
}

export const projectiles = new ProjectileManager();
