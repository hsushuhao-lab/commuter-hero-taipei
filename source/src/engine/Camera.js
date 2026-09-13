/**
 * 08點上班大作戰：通勤英雄篇 - 攝影機與畫面震動系統 (Camera.js)
 */

export class Camera {
  constructor(viewportWidth = 960, viewportHeight = 540) {
    this.x = 0;
    this.y = 0;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.target = null;
    this.minX = 0;
    this.maxX = 18000 - viewportWidth;
    this.minY = 0;
    this.maxY = 200;

    // Shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Zoom FX
    this.zoom = 1.0;
    this.targetZoom = 1.0;
  }

  get shakeTimer() {
    return this.shakeDuration;
  }

  set shakeTimer(v) {
    this.shakeDuration = v;
  }

  setTarget(target) {
    this.target = target;
  }

  setBounds(minX, maxX, minY, maxY) {
    this.minX = minX;
    this.maxX = maxX - this.viewportWidth;
    this.minY = minY;
    this.maxY = maxY;
  }

  shake(intensity = 8, duration = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  setZoom(zoom, smooth = false) {
    if (!smooth) {
      this.zoom = zoom;
      this.targetZoom = zoom;
    } else {
      this.targetZoom = zoom;
    }
  }

  update(dt) {
    if (this.target) {
      // Look slightly ahead of character direction
      const lookAhead = (this.target.facing || 1) * 80;
      const targetX = this.target.x - this.viewportWidth * 0.35 + lookAhead;
      this.x += (targetX - this.x) * Math.min(1, dt * 6.0);

      // Soft vertical tracking
      const targetY = (this.target.y - this.viewportHeight * 0.65) * 0.25;
      this.y += (targetY - this.y) * Math.min(1, dt * 4.0);
    }

    // Clamp
    this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
    this.y = Math.max(this.minY, Math.min(this.maxY, this.y));

    // Smooth zoom
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 8.0);

    // Shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const currentIntensity = this.shakeIntensity * (this.shakeDuration / 0.25);
      this.shakeOffsetX = (Math.random() * 2 - 1) * currentIntensity;
      this.shakeOffsetY = (Math.random() * 2 - 1) * currentIntensity;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }
  }

  apply(ctx) {
    ctx.save();
    const cx = this.viewportWidth / 2;
    const cy = this.viewportHeight / 2;
    ctx.translate(cx, cy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx, -cy);
    ctx.translate(-Math.round(this.x + this.shakeOffsetX), -Math.round(this.y + this.shakeOffsetY));
  }

  restore(ctx) {
    ctx.restore();
  }
}
