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
    const attackPhase = p.attackPhase || source.attackPhase;
    const sourceMonster = p.sourceMonster || source.sourceMonster;
    const hardCoreBossDamage = (!p.isPlayer && sourceMonster === 'boss_flower' &&
      typeof window !== 'undefined' && window.__GAME_MODE__ === 'HARDCORE') ? 1.10 : 1.0;
    if (!p.isPlayer && (attackPhase === 1 || attackPhase === 2)) {
      const pressureLimit = sourceMonster === "boss_flower" ? (attackPhase === 2 ? 56 : 28) : 3;
      if (this.projectiles.filter(projectile => !projectile.isPlayer).length >= pressureLimit) {
        if (typeof window !== "undefined" && window.__RUNTIME_QA__) {
          const phase = "P" + attackPhase;
          window.__BOSS_PROJECTILE_DROPS__ = window.__BOSS_PROJECTILE_DROPS__ || {};
          window.__BOSS_PROJECTILE_DROPS__[phase] = (window.__BOSS_PROJECTILE_DROPS__[phase] || 0) + 1;
          console.warn("[BOSS PROJECTILE DROPPED]", phase, pressureLimit);
        }
        return null;
      }
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
      damage: (p.damage || 10) * hardCoreBossDamage,
      monsterDamage: p.monsterDamage || p.damage || 10,
      life: p.life || 2.0,
      maxLife: p.life || 2.0,
      color: p.color || '#fff',
      type: p.type || 'bullet', // wind_blade, egg, sandra_orange_drop, pan_wave, flying_pan, petal, vine, laser
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
      bossTargetAssist: Boolean(p.bossTargetAssist),
      sourceMonster: p.sourceMonster || source.sourceMonster || '',
      attackPhase: p.attackPhase || source.attackPhase || 0,
      attackType: p.attackType || source.attackType || p.type || 'bullet',
      telegraphShown: p.telegraphShown ?? source.telegraphShown ?? false,
      bossGlow: !p.isPlayer && sourceMonster === 'boss_flower'
    };
    projectile.wobble = p.wobble || 0;
    projectile.wobblePhase = p.wobblePhase || 0;
    projectile.large = Boolean(p.large);
    projectile.burstTimer = p.burstTimer ?? null;
    projectile.burstTriggered = false;
    projectile.armedAfter = p.armedAfter || 0;
    projectile.releaseAfter = p.releaseAfter || 0;
    projectile.age = 0;
    projectile.waveCenterY = p.waveCenterY ?? null;
    projectile.waveStartY = p.waveStartY ?? null;
    projectile.waveAmplitude = p.waveAmplitude || 0;
    projectile.waveFrequency = p.waveFrequency || 0;
    projectile.wavePhase = p.wavePhase || 0;
    projectile.waveRiseDuration = p.waveRiseDuration || 0.20;
    projectile.hitTargets = new Set();
    this.projectiles.push(projectile);
    return projectile;
  }

  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.releaseAfter > 0) {
        p.releaseAfter = Math.max(0, p.releaseAfter - dt);
        continue;
      }
      p.life -= dt;
      if (p.armedAfter > 0) p.armedAfter = Math.max(0, p.armedAfter - dt);
      if (p.burstTimer !== null && !p.burstTriggered) {
        p.burstTimer -= dt;
        if (p.burstTimer <= 0) {
          p.burstTriggered = true;
          for (let burstIndex = 0; burstIndex < 4; burstIndex++) {
            const angle = p.wobblePhase + burstIndex * (Math.PI * 2 / 3);
            this.spawn({
              isPlayer: false,
              type: "petal",
              x: p.x,
              y: p.y,
              vx: Math.cos(angle) * 190,
              vy: Math.sin(angle) * 190,
              width: 16,
              height: 10,
              color: "#F48FB1",
              damage: 11,
              life: 1.35,
              maxDistance: 260,
              armedAfter: 0.12,
              rotates: true,
              vRot: 5,
              sourceMonster: p.sourceMonster,
              attackPhase: p.attackPhase,
              attackType: "bubble_burst",
              telegraphShown: true
            });
          }
          p.life = 0;
        }
      }
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }
      p.age += dt;
      p.x += p.vx * dt;
      if (p.type === 'egg_wave' && p.waveCenterY !== null) {
        const riseT = Math.min(1, p.age / Math.max(0.01, p.waveRiseDuration));
        const easedRise = 1 - Math.pow(1 - riseT, 3);
        const startY = p.waveStartY ?? p.startY;
        const centerY = startY + (p.waveCenterY - startY) * easedRise;
        p.y = centerY + Math.sin(p.age * p.waveFrequency + p.wavePhase) * p.waveAmplitude * riseT;
      } else {
        p.y += p.vy * dt;
      }
      if (p.wobble) {
        p.wobblePhase += dt * 4;
        p.x += Math.sin(p.wobblePhase) * p.wobble * dt * 8;
      }
      if (p.rotates) p.rotation += p.vRot * dt;

      // v9.9.2 Boss attacks leave fluorescent trails without changing collision geometry.
      if (p.bossGlow && Math.random() < 0.72) {
        const glowColor = p.attackPhase === 2
          ? (Math.random() < 0.5 ? '#FF2BD6' : '#7C4DFF')
          : (Math.random() < 0.5 ? '#00F5D4' : '#FF4FD8');
        particles.emit({
          x: p.x - p.vx * 0.018,
          y: p.y - p.vy * 0.018,
          vx: -p.vx * 0.035 + (Math.random() - 0.5) * 24,
          vy: -p.vy * 0.035 + (Math.random() - 0.5) * 24,
          size: 3 + Math.random() * 5,
          color: glowColor,
          life: 0.24 + Math.random() * 0.18,
          shape: Math.random() < 0.55 ? 'spark' : 'circle',
          fade: true,
          visualOnly: true
        });
      }

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
      if (p.isPlayer && p.type === 'umbrella_wave' && Math.random() < 0.82) {
        const foam = Math.random() < 0.55 ? '#E1F5FE' : '#80DEEA';
        particles.emit({
          x: p.x - p.vx * 0.028 + (Math.random() - 0.5) * 22,
          y: p.y + (Math.random() - 0.5) * Math.max(18, p.height * 0.8),
          vx: -p.vx * (0.08 + Math.random() * 0.05),
          vy: -30 - Math.random() * 55,
          size: 3 + Math.random() * 6,
          color: foam,
          life: 0.25 + Math.random() * 0.22,
          shape: Math.random() < 0.65 ? 'circle' : 'spark',
          fade: true,
          visualOnly: true
        });
      }
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
      if (p.isPlayer && p.type === 'flying_pan' && Math.random() < 0.85) {
        particles.emit({
          x: p.x - p.vx * 0.035,
          y: p.y - p.vy * 0.035,
          vx: -p.vx * 0.06,
          vy: -p.vy * 0.06 + (Math.random() - 0.5) * 35,
          size: 4 + Math.random() * 3,
          color: Math.random() < 0.5 ? '#FF5722' : '#FFA726',
          life: 0.22,
          shape: 'spark'
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

      // v9.9.2 Fluorescent boss-attack aura. Purely visual; hitboxes remain unchanged.
      if (p.bossGlow) {
        const aura = p.attackPhase === 2 ? '#FF2BD6' : '#00F5D4';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        ctx.shadowColor = aura;
        ctx.shadowBlur = p.attackPhase === 2 ? 28 : 22;
        ctx.strokeStyle = aura;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(12, Math.max(p.width, p.height) * 0.72), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(18, Math.max(p.width, p.height) * 1.05), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        ctx.shadowColor = aura;
        ctx.shadowBlur = p.attackPhase === 2 ? 24 : 18;
      }

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
      else if (p.type === 'umbrella_wave') {
        // v9.9.3 Yu ultimate: layered water-flow impact wave, not a rigid crescent blade.
        const dir = p.vx >= 0 ? 1 : -1;
        ctx.scale(dir, 1);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 22;

        // Main surge body: curling water crest with a broad impact front.
        const waterGrad = ctx.createLinearGradient(-p.width * 1.25, 0, p.width * 0.9, 0);
        waterGrad.addColorStop(0, 'rgba(3,169,244,0.16)');
        waterGrad.addColorStop(0.50, 'rgba(41,182,246,0.58)');
        waterGrad.addColorStop(1, 'rgba(128,222,234,0.92)');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.moveTo(-p.width * 1.20, p.height * 0.48);
        ctx.bezierCurveTo(-p.width * 0.70, p.height * 0.95, p.width * 0.05, p.height * 0.70, p.width * 0.72, p.height * 0.18);
        ctx.bezierCurveTo(p.width * 0.98, -p.height * 0.08, p.width * 0.72, -p.height * 0.92, p.width * 0.28, -p.height * 0.72);
        ctx.bezierCurveTo(-p.width * 0.08, -p.height * 0.56, -p.width * 0.18, -p.height * 0.12, -p.width * 0.50, p.height * 0.08);
        ctx.bezierCurveTo(-p.width * 0.78, p.height * 0.28, -p.width * 0.96, p.height * 0.30, -p.width * 1.20, p.height * 0.48);
        ctx.closePath();
        ctx.fill();

        // White foam crest and inner stream lines give the attack a fluid direction.
        ctx.strokeStyle = 'rgba(240,253,255,0.96)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.width * 0.55, -p.height * 0.05);
        ctx.bezierCurveTo(-p.width * 0.12, -p.height * 0.62, p.width * 0.44, -p.height * 0.80, p.width * 0.76, -p.height * 0.24);
        ctx.stroke();
        ctx.globalAlpha = 0.72;
        ctx.strokeStyle = '#B3E5FC';
        ctx.lineWidth = 3;
        for (let lane = 0; lane < 3; lane++) {
          const y = (lane - 1) * p.height * 0.25;
          ctx.beginPath();
          ctx.moveTo(-p.width * (1.10 - lane * 0.08), y + p.height * 0.22);
          ctx.bezierCurveTo(-p.width * 0.45, y - p.height * 0.22, p.width * 0.12, y + p.height * 0.16, p.width * 0.62, y - p.height * 0.10);
          ctx.stroke();
        }
        ctx.restore();

        // Spray droplets at the leading edge.
        ctx.fillStyle = '#E1F5FE';
        for (let d = 0; d < 4; d++) {
          const dx = p.width * (0.55 + d * 0.10);
          const dy = -p.height * (0.20 + (d % 2) * 0.28);
          ctx.beginPath();
          ctx.arc(dx, dy, 2.5 + d * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
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
      else if (p.type === 'egg_wave') {
        // Shakira v9.9.1: forward Oeuf Mayo wave roll with creamy ribbon wake.
        const dir = p.vx >= 0 ? 1 : -1;
        ctx.scale(dir, 1);
        ctx.shadowColor = '#FFD54F';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = 'rgba(255, 236, 179, 0.78)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.width * 2.0, p.height * 0.30);
        ctx.quadraticCurveTo(-p.width * 1.05, -p.height * 1.15, -p.width * 0.20, 0);
        ctx.stroke();
        ctx.strokeStyle = '#FFF8E1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-p.width * 1.8, p.height * 0.20);
        ctx.quadraticCurveTo(-p.width * 0.95, -p.height * 0.85, -p.width * 0.12, 0);
        ctx.stroke();
        ctx.fillStyle = '#FFFDE7';
        ctx.strokeStyle = '#FFE082';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.width, p.height, -0.10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFA000';
        ctx.beginPath();
        ctx.arc(p.width * 0.10, 0, p.width * 0.52, 0, Math.PI * 2);
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
      else if (p.type === 'sandra_orange_drop') {
        // Sandra-only orange droplet, distinct from blue monster water shots.
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.shadowColor = '#FF9800';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#FF6D00';
        ctx.strokeStyle = '#FFE0B2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.width * 0.9, 0);
        ctx.lineTo(-p.width * 0.2, -p.height * 0.58);
        ctx.lineTo(-p.width * 0.62, 0);
        ctx.lineTo(-p.width * 0.2, p.height * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFB74D';
        ctx.beginPath();
        ctx.ellipse(-p.width * 0.12, 0, p.width * 0.42, p.height * 0.5, 0, 0, Math.PI * 2);
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
      else if (p.type === 'flying_pan') {
        // Sandra Phase II: a readable spinning cast-iron pan, not a generic orb.
        ctx.rotate(p.rotation);
        ctx.shadowColor = '#FF5722';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#FF7043';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, p.width * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.arc(0, 0, p.width * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#90A4AE';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#455A64';
        ctx.fillRect(p.width * 0.38, -p.height * 0.15, p.width * 0.85, p.height * 0.3);
        ctx.fillStyle = '#FFB300';
        ctx.beginPath();
        ctx.arc(-p.width * 0.12, -p.height * 0.14, p.width * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (p.type === 'dream_bubble') {
        const radius = p.large ? 24 : 18;
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = p.large ? "#E040FB" : "#CE93D8";
        ctx.strokeStyle = "#FFF3FF";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#FF80AB";
        ctx.beginPath(); ctx.arc(-radius * 0.25, -radius * 0.25, 4, 0, Math.PI * 2); ctx.fill();
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
        // v9.9.3 Organic thorn-vine strike: curved stalk + barbs + luminous tip.
        const h = Math.max(34, p.height);
        const w = Math.max(16, p.width);
        ctx.save();
        ctx.shadowColor = p.bossGlow ? (p.attackPhase === 2 ? '#FF2BD6' : '#00F5D4') : '#66BB6A';
        ctx.shadowBlur = p.bossGlow ? 20 : 10;
        ctx.lineCap = 'round';

        // Main curved stalk.
        ctx.strokeStyle = p.attackPhase === 2 ? '#6A1B9A' : '#2E7D32';
        ctx.lineWidth = Math.max(7, w * 0.24);
        ctx.beginPath();
        ctx.moveTo(-w * 0.08, h * 0.44);
        ctx.bezierCurveTo(-w * 0.26, h * 0.18, w * 0.24, -h * 0.18, 0, -h * 0.48);
        ctx.stroke();

        // Bright inner sap line.
        ctx.strokeStyle = p.attackPhase === 2 ? '#EA80FC' : '#9CCC65';
        ctx.lineWidth = Math.max(2, w * 0.07);
        ctx.beginPath();
        ctx.moveTo(-w * 0.06, h * 0.42);
        ctx.bezierCurveTo(-w * 0.20, h * 0.17, w * 0.18, -h * 0.17, 0, -h * 0.46);
        ctx.stroke();

        // Alternating natural barbs instead of a flat triangle silhouette.
        for (let b = 0; b < 4; b++) {
          const by = h * 0.24 - b * h * 0.17;
          const side = b % 2 === 0 ? -1 : 1;
          ctx.strokeStyle = p.attackPhase === 2 ? '#CE93D8' : '#81C784';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(side * w * 0.02, by);
          ctx.quadraticCurveTo(side * w * 0.26, by - h * 0.03, side * w * 0.36, by - h * 0.12);
          ctx.stroke();
        }

        // Tapered luminous thorn tip.
        ctx.fillStyle = p.attackPhase === 2 ? '#F3E5F5' : '#E8F5E9';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.66);
        ctx.quadraticCurveTo(w * 0.14, -h * 0.49, 0, -h * 0.42);
        ctx.quadraticCurveTo(-w * 0.14, -h * 0.49, 0, -h * 0.66);
        ctx.fill();
        ctx.restore();
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
