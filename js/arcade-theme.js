/* ==========================================================================
   SUNMISS PORTFOLIO — RETRO ARCADE INTERACTIVE ENGINE
   - Entry Theme Selector Modal & Theme Persistence
   - 8-Bit Web Audio Chiptune Synthesizer (SFX)
   - Live Arcade HUD (1UP, HI-SCORE, STAGE, COINS, CRT, SFX)
   - Hero Interactive 8-Bit Space Invaders Shooter Canvas
   - Collectible Pixel Coins, Achievements & Konami Fever Mode
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_THEME = 'sunmiss_theme';
  const STORAGE_REMEMBER = 'sunmiss_theme_remember';
  const STORAGE_HISCORE = 'sunmiss_arcade_hiscore';
  const STORAGE_SFX = 'sunmiss_arcade_sfx';
  const STORAGE_CRT = 'sunmiss_arcade_crt';

  const root = document.documentElement;
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ========================================================================
     1. 8-BIT WEB AUDIO CHIPTUNE SYNTHESIZER
     ======================================================================== */
  class ArcadeSFX {
    constructor() {
      this.ctx = null;
      this.enabled = localStorage.getItem(STORAGE_SFX) !== 'off';
    }

    ensureContext() {
      if (!this.enabled) return null;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    tone(freq, duration, type = 'square', volume = 0.08, delay = 0, slideTo = null) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    noise(duration = 0.14, volume = 0.09, delay = 0) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime + delay;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(now);
    }

    coin() {
      this.tone(987.77, 0.08, 'square', 0.08, 0);      // B5
      this.tone(1318.51, 0.24, 'square', 0.085, 0.075); // E6
    }

    hover() {
      this.tone(660, 0.035, 'square', 0.03, 0);
    }

    select() {
      this.tone(523.25, 0.06, 'square', 0.06, 0);
      this.tone(783.99, 0.09, 'square', 0.065, 0.05);
    }

    start() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      const times = [0, 0.07, 0.14, 0.21, 0.30, 0.38];
      const durs  = [0.065, 0.065, 0.065, 0.08, 0.07, 0.24];
      notes.forEach((n, i) => this.tone(n, durs[i], 'square', 0.075, times[i]));
    }

    laser() {
      this.tone(1150, 0.11, 'sawtooth', 0.055, 0, 220);
    }

    hit() {
      this.noise(0.13, 0.08, 0);
      this.tone(240, 0.11, 'square', 0.06, 0, 75);
    }

    ufo() {
      this.tone(880, 0.07, 'triangle', 0.08, 0);
      this.tone(1174.66, 0.07, 'triangle', 0.08, 0.06);
      this.tone(1567.98, 0.18, 'square', 0.08, 0.12);
    }

    powerup() {
      const seq = [330, 392, 659, 523, 587, 784];
      seq.forEach((n, i) => this.tone(n, 0.075, 'square', 0.065, i * 0.06));
    }

    konami() {
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093];
      fanfare.forEach((n, i) => this.tone(n, 0.11, 'square', 0.075, i * 0.065));
      this.tone(2093, 0.35, 'triangle', 0.09, fanfare.length * 0.065);
    }
  }

  const sfx = new ArcadeSFX();

  /* ========================================================================
     2. GLOBAL PIXEL PARTICLE FX OVERLAY (Sparks & Konami Confetti)
     ======================================================================== */
  class ArcadeFxOverlay {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.particles = [];
      this.running = false;
      this.rafId = null;
      if (this.canvas) {
        this.resize();
        window.addEventListener('resize', () => this.resize());
      }
    }

    resize() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.canvas.width = Math.floor(this.w * dpr);
      this.canvas.height = Math.floor(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    burst(x, y, colors = ['#00f5ff', '#ff2a85', '#ffe600', '#39ff14'], count = 14) {
      if (!this.ctx || reduceMotionQuery.matches) return;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
        const speed = 1.8 + Math.random() * 4.4;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: Math.random() < 0.5 ? 4 : 6,
          color: colors[i % colors.length],
          life: 1,
          decay: 0.025 + Math.random() * 0.02,
          gravity: 0.14
        });
      }
      this.start();
    }

    confetti(count = 75) {
      if (!this.ctx || reduceMotionQuery.matches) return;
      const palette = ['#00f5ff', '#ff2a85', '#ffe600', '#39ff14', '#ff7b00', '#a855f7'];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: -10 - Math.random() * 140,
          vx: (Math.random() - 0.5) * 3.5,
          vy: 2.2 + Math.random() * 4.5,
          size: 5 + Math.floor(Math.random() * 5),
          color: palette[i % palette.length],
          life: 1,
          decay: 0.005 + Math.random() * 0.004,
          gravity: 0.04
        });
      }
      this.start();
    }

    start() {
      if (this.running || !this.ctx) return;
      this.running = true;
      const tick = () => {
        if (!this.running) return;
        this.ctx.clearRect(0, 0, this.w, this.h);
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.life -= p.decay;
          if (p.life <= 0 || p.y > this.h + 20) {
            this.particles.splice(i, 1);
            continue;
          }
          this.ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
          this.ctx.fillStyle = p.color;
          this.ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        this.ctx.globalAlpha = 1;
        if (this.particles.length > 0) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.running = false;
        }
      };
      this.rafId = requestAnimationFrame(tick);
    }

    clear() {
      this.particles = [];
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.ctx) this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
    }
  }

  /* ========================================================================
     3. HERO INTERACTIVE 8-BIT SPACE SHOOTER CANVAS
     ======================================================================== */
  // Crisp pixel sprite matrices (0 = transparent, 1 = fill)
  const SPRITES = {
    invaderA1: [
      '00100000100',
      '00010001000',
      '00111111100',
      '01101110110',
      '11111111111',
      '10111111101',
      '10100000101',
      '00011011000'
    ],
    invaderA2: [
      '00100000100',
      '10010001001',
      '10111111101',
      '11101110111',
      '11111111111',
      '01111111110',
      '00100000100',
      '01000000010'
    ],
    invaderB1: [
      '00011000',
      '00111100',
      '01111110',
      '11011011',
      '11111111',
      '00100100',
      '01011010',
      '10100101'
    ],
    invaderB2: [
      '00011000',
      '00111100',
      '01111110',
      '11011011',
      '11111111',
      '01011010',
      '10000001',
      '01000010'
    ],
    ufo: [
      '00001111110000',
      '00111111111100',
      '01111111111110',
      '11011011011011',
      '11111111111111',
      '00111000011100',
      '00010000001000'
    ],
    coin1: [
      '011110',
      '112211',
      '121121',
      '121121',
      '112211',
      '011110'
    ],
    coin2: [
      '001100',
      '012210',
      '012210',
      '012210',
      '012210',
      '001100'
    ],
    ship: [
      '00000100000',
      '00001110000',
      '00001210000',
      '00101110100',
      '01111211110',
      '11111111111',
      '11011111011',
      '10001010001'
    ]
  };

  function drawMatrix(ctx, matrix, cx, cy, pixelSize, color1, color2) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const ox = Math.round(cx - (cols * pixelSize) / 2);
    const oy = Math.round(cy - (rows * pixelSize) / 2);
    for (let r = 0; r < rows; r++) {
      const row = matrix[r];
      for (let c = 0; c < cols; c++) {
        const ch = row[c];
        if (ch === '0') continue;
        ctx.fillStyle = ch === '2' && color2 ? color2 : color1;
        ctx.fillRect(ox + c * pixelSize, oy + r * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  class ArcadeHeroShooter {
    constructor(canvas, heroEl, onHitCallback) {
      this.canvas = canvas;
      this.heroEl = heroEl;
      this.onHit = onHitCallback;
      this.ctx = canvas ? canvas.getContext('2d') : null;
      this.running = false;
      this.inView = true;
      this.rafId = null;
      this.stars = [];
      this.enemies = [];
      this.bullets = [];
      this.sparks = [];
      this.shipX = 0;
      this.targetShipX = 0;
      this.gridOffset = 0;
      this.frameTimer = 0;
      this.animStep = 0;
      this.spawnCooldown = 0;
      this.kills = 0;
      this.w = 800;
      this.h = 600;

      if (this.canvas && this.heroEl) {
        this.resize();
        this.initStars();
        this.seedEnemies();
        window.addEventListener('resize', () => this.resize());

        this.heroEl.addEventListener('mousemove', (e) => {
          if (root.getAttribute('data-theme') !== 'arcade') return;
          const rect = this.heroEl.getBoundingClientRect();
          this.targetShipX = e.clientX - rect.left;
        });

        this.heroEl.addEventListener('click', (e) => {
          if (root.getAttribute('data-theme') !== 'arcade') return;
          if (e.target.closest('a, button, .theme-modal')) return;
          const rect = this.heroEl.getBoundingClientRect();
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          this.handleShot(cx, cy, e.clientX, e.clientY);
        });

        const io = new IntersectionObserver(
          (entries) => {
            this.inView = entries[0].isIntersecting;
            if (this.inView && root.getAttribute('data-theme') === 'arcade') {
              this.start();
            } else {
              this.stop();
            }
          },
          { threshold: 0 }
        );
        io.observe(this.heroEl);

        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.stop();
          } else if (this.inView && root.getAttribute('data-theme') === 'arcade') {
            this.start();
          }
        });
      }
    }

    resize() {
      if (!this.canvas || !this.heroEl) return;
      const rect = this.heroEl.getBoundingClientRect();
      this.w = Math.max(320, rect.width);
      this.h = Math.max(480, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(this.w * dpr);
      this.canvas.height = Math.floor(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!this.shipX) {
        this.shipX = this.w * 0.5;
        this.targetShipX = this.w * 0.5;
      }
    }

    initStars() {
      this.stars = [];
      for (let i = 0; i < 64; i++) {
        this.stars.push({
          x: Math.random() * this.w,
          y: Math.random() * (this.h * 0.72),
          size: Math.random() < 0.7 ? 2 : 3,
          speed: 0.15 + Math.random() * 0.55,
          phase: Math.random() * Math.PI * 2,
          color: i % 5 === 0 ? '#00f5ff' : i % 7 === 0 ? '#ff6fb5' : '#ffffff'
        });
      }
    }

    seedEnemies() {
      this.enemies = [];
      const count = this.w < 640 ? 5 : 9;
      for (let i = 0; i < count; i++) {
        this.spawnEnemy(true);
      }
    }

    spawnEnemy(initial = false) {
      const r = Math.random();
      const isMobile = this.w < 640;
      let kind = 'invaderA';
      let color = '#39ff14';
      let color2 = null;
      let points = 150;
      let scale = isMobile ? 2.5 : 3;

      if (r < 0.16) {
        kind = 'ufo';
        color = '#ff2a85';
        points = 500;
        scale = isMobile ? 2.4 : 2.8;
      } else if (r < 0.34) {
        kind = 'coin';
        color = '#ffe600';
        color2 = '#ff9900';
        points = 200;
        scale = isMobile ? 3 : 3.5;
      } else if (r < 0.68) {
        kind = 'invaderB';
        color = '#00f5ff';
        points = 100;
      } else {
        kind = 'invaderA';
        color = Math.random() < 0.5 ? '#39ff14' : '#ff2a85';
        points = 150;
      }

      // Keep enemies primarily along upper/side lanes so center text stays super legible
      const sideBias = Math.random();
      let x;
      if (initial) {
        if (sideBias < 0.38) {
          x = 40 + Math.random() * (this.w * 0.24);
        } else if (sideBias < 0.76) {
          x = this.w * 0.74 + Math.random() * (this.w * 0.22);
        } else {
          x = this.w * 0.2 + Math.random() * (this.w * 0.6);
        }
      } else {
        x = Math.random() < 0.5 ? -30 : this.w + 30;
      }

      const yBand = kind === 'ufo'
        ? 95 + Math.random() * 55
        : (sideBias >= 0.76 ? 105 + Math.random() * 75 : 115 + Math.random() * (this.h * 0.45));

      const dir = x < this.w * 0.5 ? 1 : -1;
      const speed = (kind === 'ufo' ? 1.55 : 0.48 + Math.random() * 0.65) * dir;

      this.enemies.push({
        kind,
        x,
        y: yBand,
        baseY: yBand,
        vx: speed,
        bobPhase: Math.random() * Math.PI * 2,
        color,
        color2,
        points,
        scale,
        radius: kind === 'ufo' ? 26 : 22
      });
    }

    handleShot(cx, cy, clientX, clientY) {
      sfx.laser();
      this.targetShipX = cx;

      // Direct hit check on clicked enemy/coin for super responsive arcade feel
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const dist = Math.hypot(e.x - cx, e.y - cy);
        if (dist <= e.radius + 20) {
          this.destroyEnemy(i, clientX, clientY);
          // Also draw a quick laser bolt up toward it
          this.bullets.push({ x: this.shipX, y: this.h - 62, tx: e.x, ty: e.y, vy: -14, vx: (e.x - this.shipX) * 0.08, life: 14 });
          return;
        }
      }

      // Otherwise fire twin cyan bolts from player starfighter
      this.bullets.push({ x: this.shipX - 10, y: this.h - 62, vx: 0, vy: -11.5, life: 90 });
      this.bullets.push({ x: this.shipX + 10, y: this.h - 62, vx: 0, vy: -11.5, life: 90 });
    }

    destroyEnemy(index, screenX, screenY) {
      const e = this.enemies[index];
      if (!e) return;
      this.enemies.splice(index, 1);
      this.kills++;

      if (e.kind === 'coin') {
        sfx.coin();
      } else if (e.kind === 'ufo') {
        sfx.ufo();
      } else {
        sfx.hit();
      }

      for (let k = 0; k < 14; k++) {
        const a = (Math.PI * 2 * k) / 14 + Math.random() * 0.3;
        const spd = 1.6 + Math.random() * 3.8;
        this.sparks.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color: k % 2 === 0 ? e.color : '#ffe600',
          size: 4,
          life: 1
        });
      }

      const rect = this.heroEl.getBoundingClientRect();
      const fx = screenX ?? rect.left + e.x;
      const fy = screenY ?? rect.top + e.y;
      if (this.onHit) {
        this.onHit({
          points: e.points,
          kind: e.kind,
          kills: this.kills,
          x: fx,
          y: fy
        });
      }
    }

    drawSynthGrid(ctx) {
      const horizonY = this.h * 0.74;
      const bottomY = this.h;
      const height = bottomY - horizonY;

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.22)';
      ctx.lineWidth = 1;

      // Horizontal perspective scan lines
      this.gridOffset = (this.gridOffset + 0.008) % 1;
      for (let i = 0; i < 8; i++) {
        const t = ((i + this.gridOffset) / 8);
        const y = horizonY + Math.pow(t, 2.1) * height;
        ctx.globalAlpha = 0.08 + t * 0.32;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.w, y);
        ctx.stroke();
      }

      // Vertical perspective vanishing rays
      ctx.strokeStyle = 'rgba(255, 42, 133, 0.22)';
      ctx.globalAlpha = 0.28;
      const vanishX = this.w * 0.5;
      for (let i = -8; i <= 8; i++) {
        const bottomX = vanishX + i * (this.w * 0.11);
        ctx.beginPath();
        ctx.moveTo(vanishX + i * 18, horizonY);
        ctx.lineTo(bottomX, bottomY);
        ctx.stroke();
      }
      ctx.restore();
    }

    tick() {
      if (!this.running || !this.ctx) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      this.frameTimer++;
      if (this.frameTimer % 24 === 0) {
        this.animStep = 1 - this.animStep;
      }

      // 1. Parallax pixel stars
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        s.y += s.speed;
        if (s.y > this.h * 0.74) {
          s.y = 0;
          s.x = Math.random() * this.w;
        }
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(this.frameTimer * 0.04 + s.phase));
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = s.color;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
      }
      ctx.globalAlpha = 1;

      // 2. Retro synthwave perspective grid
      this.drawSynthGrid(ctx);

      // 3. Enemies & floating coins
      const maxEnemies = this.w < 640 ? 6 : 10;
      this.spawnCooldown--;
      if (this.enemies.length < maxEnemies && this.spawnCooldown <= 0) {
        this.spawnEnemy(false);
        this.spawnCooldown = 55;
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.x += e.vx;
        e.y = e.baseY + Math.sin(this.frameTimer * 0.045 + e.bobPhase) * 8;
        if (e.x < -60 || e.x > this.w + 60) {
          this.enemies.splice(i, 1);
          continue;
        }
        let sprite = SPRITES.invaderA1;
        if (e.kind === 'invaderA') sprite = this.animStep ? SPRITES.invaderA1 : SPRITES.invaderA2;
        else if (e.kind === 'invaderB') sprite = this.animStep ? SPRITES.invaderB1 : SPRITES.invaderB2;
        else if (e.kind === 'ufo') sprite = SPRITES.ufo;
        else if (e.kind === 'coin') sprite = this.animStep ? SPRITES.coin1 : SPRITES.coin2;

        drawMatrix(ctx, sprite, e.x, e.y, e.scale, e.color, e.color2);
      }

      // 4. Bullets & collisions
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        if (b.life <= 0 || b.y < 60) {
          this.bullets.splice(i, 1);
          continue;
        }

        ctx.fillStyle = '#00f5ff';
        ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 8), 4, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(b.x - 1), Math.round(b.y - 6), 2, 10);

        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius) {
            this.bullets.splice(i, 1);
            this.destroyEnemy(j);
            break;
          }
        }
      }

      // 5. Pixel explosion sparks
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const sp = this.sparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.035;
        if (sp.life <= 0) {
          this.sparks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = sp.life;
        ctx.fillStyle = sp.color;
        ctx.fillRect(Math.round(sp.x), Math.round(sp.y), sp.size, sp.size);
      }
      ctx.globalAlpha = 1;

      // 6. Player Pixel Starfighter at bottom
      const clampedTarget = Math.max(36, Math.min(this.w - 36, this.targetShipX));
      this.shipX += (clampedTarget - this.shipX) * 0.14;
      const shipY = this.h - 46;
      // Thruster flame
      ctx.fillStyle = this.animStep ? '#ff2a85' : '#ffe600';
      ctx.fillRect(Math.round(this.shipX - 7), Math.round(shipY + 13), 4, 6 + this.animStep * 3);
      ctx.fillRect(Math.round(this.shipX + 3), Math.round(shipY + 13), 4, 6 + this.animStep * 3);
      drawMatrix(ctx, SPRITES.ship, this.shipX, shipY, 3, '#00f5ff', '#ffe600');

      this.rafId = requestAnimationFrame(() => this.tick());
    }

    start() {
      if (this.running || !this.ctx || reduceMotionQuery.matches) return;
      this.resize();
      this.running = true;
      this.rafId = requestAnimationFrame(() => this.tick());
    }

    stop() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  /* ========================================================================
     4. MAIN CONTROLLER INITIALIZATION
     ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    const themeModal = document.getElementById('themeModal');
    const rememberCheckbox = document.getElementById('themeRemember');
    const bootOverlay = document.getElementById('arcadeBootOverlay');
    const themeCards = [...document.querySelectorAll('.theme-card')];
    const themeTriggers = [...document.querySelectorAll('[data-open-theme-modal]')];

    const scoreEl = document.getElementById('arcadeScore');
    const hiScoreEl = document.getElementById('arcadeHiScore');
    const stageEl = document.getElementById('arcadeStage');
    const coinBtn = document.getElementById('arcadeCoinBtn');
    const coinCountEl = document.getElementById('arcadeCoinCount');
    const sfxToggleBtn = document.getElementById('arcadeSfxBtn');
    const crtToggleBtn = document.getElementById('arcadeCrtBtn');
    const progressFill = document.getElementById('arcadeProgressFill');
    const toastStack = document.getElementById('arcadeToastStack');
    const killsEl = document.getElementById('arcadeKills');
    const secretBtn = document.getElementById('arcadeSecretBtn');

    const fxOverlay = new ArcadeFxOverlay(document.getElementById('arcadeFxCanvas'));

    let currentTheme = root.getAttribute('data-theme') || 'modern';
    let score = 0;
    let displayScore = 0;
    let hiScore = Math.max(2400, Number(localStorage.getItem(STORAGE_HISCORE)) || 2400);
    let coins = 1;
    let totalCoinsCollected = 0;
    let combo = 0;
    let comboTimer = null;
    let scoreRollRaf = null;
    const unlockedAchievements = new Set();

    // Format 6-digit arcade score
    const padScore = (n) => String(Math.floor(n)).padStart(6, '0');

    function renderScore() {
      if (scoreEl) scoreEl.textContent = padScore(displayScore);
      if (hiScoreEl) hiScoreEl.textContent = padScore(hiScore);
      if (coinCountEl) coinCountEl.textContent = String(coins).padStart(2, '0');
    }

    function addScore(points, x, y, customLabel) {
      if (currentTheme !== 'arcade') return;
      score += points;
      if (score > hiScore) {
        hiScore = score;
        localStorage.setItem(STORAGE_HISCORE, String(hiScore));
      }

      if (scoreEl) {
        scoreEl.classList.add('is-bump');
        setTimeout(() => scoreEl.classList.remove('is-bump'), 220);
      }

      // Smooth roll-up animation
      const stepRoll = () => {
        const diff = score - displayScore;
        if (diff <= 5) {
          displayScore = score;
          renderScore();
          scoreRollRaf = null;
          return;
        }
        displayScore += Math.ceil(diff * 0.22);
        renderScore();
        scoreRollRaf = requestAnimationFrame(stepRoll);
      };
      if (!scoreRollRaf) scoreRollRaf = requestAnimationFrame(stepRoll);

      // Floating pixel popup
      if (typeof x === 'number' && typeof y === 'number') {
        spawnFloatText(customLabel || `+${points}`, x, y);
      }
    }

    function spawnFloatText(text, x, y, color) {
      if (currentTheme !== 'arcade') return;
      const el = document.createElement('div');
      el.className = 'arcade-float-score';
      el.textContent = text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      if (color) el.style.color = color;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 880);
    }

    function unlockAchievement(id, title, desc, bonus = 250) {
      if (currentTheme !== 'arcade' || unlockedAchievements.has(id)) return;
      unlockedAchievements.add(id);
      if (bonus > 0) addScore(bonus);
      sfx.powerup();

      if (!toastStack) return;
      const toast = document.createElement('div');
      toast.className = 'arcade-toast';
      toast.innerHTML = `
        <div class="arcade-toast__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="18" height="18" style="shape-rendering:crispEdges">
            <rect x="4" y="2" width="8" height="2" fill="#ffe600"/>
            <rect x="2" y="3" width="2" height="4" fill="#ffb800"/>
            <rect x="12" y="3" width="2" height="4" fill="#ffb800"/>
            <rect x="4" y="4" width="8" height="5" fill="#ffe600"/>
            <rect x="6" y="9" width="4" height="3" fill="#ff9900"/>
            <rect x="4" y="12" width="8" height="2" fill="#ffe600"/>
          </svg>
        </div>
        <div>
          <span class="arcade-toast__kicker">★ ACHIEVEMENT +${bonus} PTS</span>
          <strong class="arcade-toast__title">${title}</strong>
          <span class="arcade-toast__desc">${desc}</span>
        </div>
      `;
      toastStack.appendChild(toast);

      // Limit max visible toasts to 3
      while (toastStack.children.length > 3) {
        toastStack.firstElementChild.remove();
      }

      setTimeout(() => {
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), 320);
      }, 3600);
    }

    /* ----- Hero Interactive Space Shooter ----- */
    const heroShooter = new ArcadeHeroShooter(
      document.getElementById('arcadeHeroCanvas'),
      document.getElementById('hero'),
      ({ points, kind, kills, x, y }) => {
        combo++;
        clearTimeout(comboTimer);
        comboTimer = setTimeout(() => { combo = 0; }, 2200);

        const mult = combo >= 3 ? Math.min(4, Math.floor(combo / 2) + 1) : 1;
        const total = points * mult;
        const label = kind === 'ufo'
          ? `UFO +${total}!`
          : mult > 1
            ? `+${total} x${mult}!`
            : `+${total}`;

        addScore(total, x, y, label);
        if (killsEl) killsEl.textContent = String(kills);
        if (kills === 1) {
          unlockAchievement('first_kill', 'ALIEN BUSTER', '击落首架外星像素入侵者！', 300);
        } else if (kills === 10) {
          unlockAchievement('ace_pilot', 'ACE PILOT', '标题画面累计击落 10 个目标！', 1000);
        }
      }
    );

    /* ----- Collectible Section Pixel Coins ----- */
    const coinHeaders = [
      { sel: '#featured .featured__title', id: 'coin-featured' },
      { sel: '#internship .internship__title', id: 'coin-internship' },
      { sel: '#skills .skills__title', id: 'coin-skills' },
      { sel: '#design-analysis .project__title', id: 'coin-analysis' },
      { sel: '#gaming-history .timeline__title', id: 'coin-timeline' },
      { sel: '#contact .contact__title', id: 'coin-contact' }
    ];

    coinHeaders.forEach(({ sel, id }) => {
      const heading = document.querySelector(sel);
      if (!heading) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'arcade-coin-pickup arcade-only arcade-only--inline';
      btn.dataset.coinId = id;
      btn.setAttribute('aria-label', '收集街机金币获得积分');
      btn.innerHTML = `
        <svg viewBox="0 0 12 12" width="12" height="12" class="arcade-hud__coin-svg" style="shape-rendering:crispEdges" aria-hidden="true">
          <rect x="3" y="1" width="6" height="10" fill="#ffe600"/>
          <rect x="1" y="3" width="10" height="6" fill="#ffe600"/>
          <rect x="4" y="3" width="4" height="6" fill="#ffae00"/>
          <rect x="5" y="4" width="2" height="4" fill="#fff7b2"/>
        </svg>
        <span>+250</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.classList.contains('is-collected')) return;
        btn.classList.add('is-collected');
        btn.querySelector('span').textContent = 'GOT!';
        coins++;
        totalCoinsCollected++;
        sfx.coin();
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        fxOverlay.burst(cx, cy, ['#ffe600', '#ffae00', '#ffffff', '#ff2a85'], 16);
        addScore(250, cx, cy, '+250 COIN!');
        renderScore();
        if (totalCoinsCollected >= 3) {
          unlockAchievement('coin_hunter', 'COIN COLLECTOR', '收集 / 投入了 3 枚像素街机金币！', 500);
        }
      });
      heading.appendChild(btn);
    });

    /* ----- HUD Controls ----- */
    function syncToggleUI() {
      if (sfxToggleBtn) {
        sfxToggleBtn.classList.toggle('is-off', !sfx.enabled);
        sfxToggleBtn.setAttribute('aria-pressed', String(sfx.enabled));
        const txt = sfxToggleBtn.querySelector('.arcade-hud__btn-txt');
        if (txt) txt.textContent = sfx.enabled ? 'SFX:ON' : 'SFX:OFF';
      }
      const crtOn = root.getAttribute('data-crt') !== 'off';
      if (crtToggleBtn) {
        crtToggleBtn.classList.toggle('is-off', !crtOn);
        crtToggleBtn.setAttribute('aria-pressed', String(crtOn));
        const txt = crtToggleBtn.querySelector('.arcade-hud__btn-txt');
        if (txt) txt.textContent = crtOn ? 'CRT:ON' : 'CRT:OFF';
      }
    }

    if (localStorage.getItem(STORAGE_CRT) === 'off') {
      root.setAttribute('data-crt', 'off');
    }

    if (coinBtn) {
      coinBtn.addEventListener('click', () => {
        coins++;
        totalCoinsCollected++;
        sfx.coin();
        const rect = coinBtn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.bottom + 8;
        fxOverlay.burst(cx, cy, ['#ffe600', '#ffae00', '#00f5ff'], 14);
        addScore(100, cx, cy + 12, '+100 CREDIT!');
        renderScore();
        if (totalCoinsCollected >= 3) {
          unlockAchievement('coin_hunter', 'COIN COLLECTOR', '收集 / 投入了 3 枚像素街机金币！', 500);
        }
      });
    }

    if (sfxToggleBtn) {
      sfxToggleBtn.addEventListener('click', () => {
        sfx.enabled = !sfx.enabled;
        localStorage.setItem(STORAGE_SFX, sfx.enabled ? 'on' : 'off');
        syncToggleUI();
        if (sfx.enabled) sfx.select();
      });
    }

    if (crtToggleBtn) {
      crtToggleBtn.addEventListener('click', () => {
        const isOff = root.getAttribute('data-crt') === 'off';
        root.setAttribute('data-crt', isOff ? 'on' : 'off');
        localStorage.setItem(STORAGE_CRT, isOff ? 'on' : 'off');
        syncToggleUI();
        sfx.select();
      });
    }

    /* ----- Scroll Progress & Stage Name HUD ----- */
    const stageMap = [
      { id: 'hero', label: '1-1 TITLE' },
      { id: 'featured', label: '1-2 SELECT' },
      { id: 'internship', label: '2-1 BOSS' },
      { id: 'skills', label: '2-2 STATS' },
      { id: 'project', label: '3-1 STG' },
      { id: 'project-parking', label: '3-2 3D' },
      { id: 'project-rf4', label: '3-3 PY' },
      { id: 'project-2', label: '3-4 ROGUE' },
      { id: 'project-3', label: '3-5 AI' },
      { id: 'design-analysis', label: '4-1 CODEX' },
      { id: 'education', label: '5-1 ACADEMY' },
      { id: 'gaming-history', label: '5-2 MAP' },
      { id: 'art', label: '6-1 MUSEUM' },
      { id: 'contact', label: 'FIN CONTINUE?' }
    ];
    const stageNodes = stageMap
      .map((s) => ({ ...s, el: document.getElementById(s.id) }))
      .filter((s) => s.el);

    let scrollTick = null;
    function updateScrollHUD() {
      scrollTick = null;
      if (currentTheme !== 'arcade') return;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100)) : 0;
      if (progressFill) progressFill.style.width = `${pct.toFixed(1)}%`;
      if (pct >= 55) {
        unlockAchievement('explorer', 'STAGE EXPLORER', '探索了超过一半的作品集关卡！', 400);
      }
      const probe = window.scrollY + 180;
      let stageName = stageMap[0].label;
      for (let i = 0; i < stageNodes.length; i++) {
        if (stageNodes[i].el.offsetTop <= probe) {
          stageName = stageNodes[i].label;
        }
      }
      if (stageEl) stageEl.textContent = stageName;
    }

    window.addEventListener('scroll', () => {
      if (!scrollTick) scrollTick = requestAnimationFrame(updateScrollHUD);
    }, { passive: true });

    /* ----- Global Arcade Click Sparks & Portfolio Activity Hooks ----- */
    document.addEventListener('click', (e) => {
      if (currentTheme !== 'arcade') return;
      if (themeModal && themeModal.classList.contains('is-open')) return;

      // Subtle pixel sparks on clicks outside hero (hero has its own lasers!)
      if (!e.target.closest('#hero')) {
        fxOverlay.burst(e.clientX, e.clientY, ['#00f5ff', '#ff2a85', '#ffe600'], 8);
      }

      // Hook interactive portfolio elements for achievements & sound
      if (e.target.closest('.project__toggle, .internship__collapse-btn')) {
        sfx.select();
        unlockAchievement('data_miner', 'DATA MINER', '展开并查阅了项目深度设计档案！', 200);
      } else if (e.target.closest('.project__screenshot, .art__item, .internship__gallery-item, #openAssets')) {
        sfx.select();
        unlockAchievement('curator', 'SPRITE CURATOR', '检视了高清实机画面 / 版画素材！', 250);
      } else if (e.target.closest('.project__demo-btn, .featured__card')) {
        sfx.select();
        addScore(50, e.clientX, e.clientY - 12);
      }
    });

    // Subtle 8-bit hover blip on buttons/cards in arcade mode (throttled)
    let lastHoverTime = 0;
    document.addEventListener('mouseover', (e) => {
      if (currentTheme !== 'arcade') return;
      if (themeModal && themeModal.classList.contains('is-open')) return;
      const hit = e.target.closest('.featured__card, .arcade-btn, .project__demo-btn, .nav__link, .contact__item');
      if (!hit) return;
      const now = Date.now();
      if (now - lastHoverTime > 120) {
        lastHoverTime = now;
        sfx.hover();
      }
    });

    /* ----- Konami Code & Fever Overdrive ----- */
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIdx = 0;
    let feverTimer = null;

    function triggerFeverMode() {
      if (currentTheme !== 'arcade') {
        applyTheme('arcade', { withBoot: true, fromUser: true });
      }
      sfx.konami();
      root.classList.add('arcade-fever');
      fxOverlay.confetti(95);
      spawnFloatText('★ GOD MODE +9999 ★', window.innerWidth / 2, window.innerHeight * 0.35, '#ffe600');
      unlockAchievement('konami', 'KONAMI LEGEND', '输入神秘指令，开启 15 秒彩虹超频模式！', 9999);
      clearTimeout(feverTimer);
      feverTimer = setTimeout(() => {
        root.classList.remove('arcade-fever');
      }, 15000);
    }

    document.addEventListener('keydown', (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          konamiIdx = 0;
          triggerFeverMode();
        }
      } else {
        konamiIdx = key === KONAMI[0] ? 1 : 0;
      }
    });

    if (secretBtn) {
      secretBtn.addEventListener('click', triggerFeverMode);
    }

    /* ----- Theme Application & Boot Transition ----- */
    function updateThemeTriggerLabels() {
      themeTriggers.forEach((btn) => {
        const label = btn.querySelector('.theme-trigger__label');
        if (!label) return;
        label.textContent = currentTheme === 'arcade' ? '切换主题' : '街机主题';
      });
    }

    function applyTheme(theme, { withBoot = false, fromUser = false } = {}) {
      const next = theme === 'arcade' ? 'arcade' : 'modern';
      currentTheme = next;
      root.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_THEME, next);
      updateThemeTriggerLabels();
      syncToggleUI();
      renderScore();

      if (next === 'arcade') {
        if (withBoot && bootOverlay && !reduceMotionQuery.matches) {
          bootOverlay.classList.remove('is-active');
          void bootOverlay.offsetWidth;
          bootOverlay.classList.add('is-active');
        }
        if (fromUser) {
          sfx.start();
        }
        heroShooter.start();
        updateScrollHUD();
        setTimeout(() => {
          unlockAchievement('joined', 'PLAYER 1 JOINED!', '欢迎进入 198X 复古街机模式 · 点击标题画面可射击！', 100);
        }, withBoot ? 550 : 250);
      } else {
        root.classList.remove('arcade-fever');
        heroShooter.stop();
        fxOverlay.clear();
      }
    }

    /* ----- Entry Theme Modal Logic ----- */
    let selectedIdx = 1; // Default highlight Retro Arcade card

    function highlightModalCard(idx) {
      selectedIdx = (idx + themeCards.length) % themeCards.length;
      themeCards.forEach((card, i) => {
        card.classList.toggle('is-selected', i === selectedIdx);
      });
    }

    function openThemeModal() {
      if (!themeModal) return;
      themeModal.classList.add('is-open');
      themeModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (rememberCheckbox) {
        rememberCheckbox.checked = localStorage.getItem(STORAGE_REMEMBER) === '1';
      }
      highlightModalCard(currentTheme === 'arcade' ? 1 : 1);
      // Focus the highlighted card cleanly for keyboard accessibility
      setTimeout(() => {
        const target = themeCards[selectedIdx];
        if (target) target.focus({ preventScroll: true });
      }, 60);
    }

    function closeThemeModal() {
      if (!themeModal) return;
      themeModal.classList.remove('is-open');
      themeModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }

    function chooseFromModal(theme) {
      if (rememberCheckbox) {
        if (rememberCheckbox.checked) {
          localStorage.setItem(STORAGE_REMEMBER, '1');
        } else {
          localStorage.removeItem(STORAGE_REMEMBER);
        }
      }
      closeThemeModal();
      applyTheme(theme, { withBoot: theme === 'arcade', fromUser: true });
    }

    themeCards.forEach((card, idx) => {
      card.addEventListener('mouseenter', () => {
        highlightModalCard(idx);
      });
      card.addEventListener('click', () => {
        chooseFromModal(card.dataset.themeChoice);
      });
    });

    themeTriggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (currentTheme === 'arcade') sfx.select();
        openThemeModal();
      });
    });

    if (themeModal) {
      themeModal.addEventListener('click', (e) => {
        // Clicking backdrop closes modal keeping current theme
        if (e.target === themeModal) {
          closeThemeModal();
        }
      });

      themeModal.addEventListener('keydown', (e) => {
        if (!themeModal.classList.contains('is-open')) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          highlightModalCard(selectedIdx + 1);
          themeCards[selectedIdx].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          highlightModalCard(selectedIdx - 1);
          themeCards[selectedIdx].focus();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeThemeModal();
        }
      });
    }

    /* ----- Initial Boot Decision ----- */
    const remembered = localStorage.getItem(STORAGE_REMEMBER) === '1';
    const savedTheme = localStorage.getItem(STORAGE_THEME);

    if (remembered && (savedTheme === 'arcade' || savedTheme === 'modern')) {
      applyTheme(savedTheme, { withBoot: false, fromUser: false });
    } else {
      // Keep clean base ready underneath & pop up theme selector immediately on entry!
      applyTheme(savedTheme === 'arcade' ? 'arcade' : 'modern', { withBoot: false, fromUser: false });
      openThemeModal();
    }
  });
})();
