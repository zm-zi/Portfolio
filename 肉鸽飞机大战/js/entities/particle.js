// 粒子系统（性能优化版）
const PARTICLE_LIMIT = 800;

// 绘制批次标记（写入粒子 drawPass 字段）
const PASS_SMOKE = 1;      // 烟雾
const PASS_DEBRIS = 2;     // 暗色残骸
const PASS_CORE = 3;       // 主色碎片 + 亮色碎块（lighter 发光）
const PASS_FLASH = 4;      // 白色核心闪光
const PASS_SPARK = 5;      // 火花条
const PASS_CIRCLE = 0;     // 非像素圆形（导弹尾焰等）

// ─── 像素方块爆炸 ───
function createExplosion(x, y, color) {
    if (G.particles.length >= PARTICLE_LIMIT) return;
    const isGreen = color === '#44ff44';

    // ── 核心闪光（白色，快速一闪） ──
    for (let i = 0; i < 6; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 2 + 0.5;
        G.particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 6 + Math.random() * 5, maxLife: 11,
            color: '#ffffff', size: 5 + Math.random() * 8,
            gravity: 0.02, isPixel: true, drawPass: PASS_FLASH,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.6
        });
    }

    // ── 主色大碎片 ──
    const mc = isGreen
        ? ['#00ff44', '#00cc33', '#33ff66', '#00ff88', '#22ee55']
        : ['#ff4400', '#ff6600', '#ff2200', '#ff8800', '#ff3300'];
    for (let i = 0; i < 10; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 5.5 + 2;
        G.particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 18 + Math.random() * 14, maxLife: 32,
            color: mc[(Math.random() * 5) | 0], size: 5 + Math.random() * 10,
            gravity: 0.10, isPixel: true, drawPass: PASS_CORE,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.35
        });
    }

    // ── 亮色高速碎块 ──
    const bc = isGreen
        ? ['#88ffaa', '#55ff99', '#aaffcc', '#66ffbb']
        : ['#ffaa44', '#ff7744', '#ffcc55', '#ff6633'];
    for (let i = 0; i < 12; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 7 + 3;
        G.particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 10 + Math.random() * 12, maxLife: 22,
            color: bc[(Math.random() * 4) | 0], size: 2 + Math.random() * 5,
            gravity: 0.05, isPixel: true, drawPass: PASS_CORE,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.5
        });
    }

    // ── 暗色残骸 ──
    const dk = isGreen
        ? ['#005522', '#003311', '#006633', '#114422']
        : ['#551100', '#330800', '#662200', '#441100'];
    for (let i = 0; i < 5; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 3.5 + 1.5;
        G.particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 25 + Math.random() * 15, maxLife: 40,
            color: dk[(Math.random() * 4) | 0], size: 6 + Math.random() * 12,
            gravity: 0.15, isPixel: true, drawPass: PASS_DEBRIS,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.15
        });
    }

    // ── 火花条 ──
    for (let i = 0; i < 8; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 8 + 4;
        const sc = isGreen
            ? `rgb(${(Math.random()*80)|0},255,${(100+Math.random()*100)|0})`
            : `rgb(255,${(150+Math.random()*105)|0},${(Math.random()*60)|0})`;
        G.particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 12 + Math.random() * 8, maxLife: 20,
            color: sc, size: 2 + Math.random() * 3,
            gravity: 0.02, isPixel: true, drawPass: PASS_SPARK,
            sparkLen: 10 + Math.random() * 14,
            sparkDx: Math.cos(a), sparkDy: Math.sin(a)
        });
    }

    // ── 烟雾 ──
    for (let i = 0; i < 4; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 1.2 + 0.3;
        G.particles.push({
            x: x + (Math.random() - 0.5) * 12,
            y: y + (Math.random() - 0.5) * 12,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 30 + Math.random() * 15, maxLife: 45,
            color: '#444444', size: 10 + Math.random() * 14,
            gravity: -0.04, isPixel: true, drawPass: PASS_SMOKE,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.08
        });
    }

    // ── 冲击波（color 编码: 0=红, 1=绿, 2=白） ──
    G.flashes.push({ x, y, r: 3, maxR: 45, life: 14, maxLife: 14, color: isGreen ? 1 : 0 });
    G.flashes.push({ x, y, r: 2, maxR: 28, life: 8, maxLife: 8, color: 2 });
}

function createMissileTrail(x, y, angle) {
    if (G.particles.length >= PARTICLE_LIMIT) return;
    for (let i = 0; i < 2; i++) {
        G.particles.push({
            x, y,
            vx: Math.cos(angle + Math.PI) * 1.5 + (Math.random() - 0.5),
            vy: Math.sin(angle + Math.PI) * 1.5 + (Math.random() - 0.5),
            size: Math.random() * 4 + 2,
            life: 1.0, maxLife: 1.0, decay: 0.05,
            color: MISSILE_PARTICLE_COLORS[(Math.random() * 3) | 0],
            gravity: 0, drawPass: PASS_CIRCLE
        });
    }
}

function updateParticles() {
    const dt = G.game.dt;
    // 原地压缩，一次遍历，O(n) 无 splice
    let w = 0;
    for (let i = 0, n = G.particles.length; i < n; i++) {
        const p = G.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity || 0) * dt;
        // 摩擦力：每 200fps 帧衰减 0.98，dt 帧后衰减 0.98^dt
        const friction = Math.pow(0.98, dt);
        p.vx *= friction;
        p.vy *= friction;
        if (p.rot !== undefined) p.rot += (p.rotV || 0) * dt;
        const decay = (p.decay !== undefined) ? p.decay : 1;
        p.life -= decay * dt;
        if (p.life > 0) {
            if (w !== i) G.particles[w] = p;
            w++;
        }
    }
    G.particles.length = w;

    w = 0;
    for (let i = 0, n = G.flashes.length; i < n; i++) {
        const f = G.flashes[i];
        f.life -= dt;
        // 插值：每帧靠近目标 0.3，dt 帧后用 1 - (1-0.3)^dt
        const lerpFactor = 1 - Math.pow(0.7, dt);
        f.r += (f.maxR - f.r) * lerpFactor;
        if (f.life > 0) {
            if (w !== i) G.flashes[w] = f;
            w++;
        }
    }
    G.flashes.length = w;
}

// 旋转变换矩形，避免 save/restore/translate/rotate
function _rotRect(ctx, x, y, half, rot) {
    const c = Math.cos(rot) * half, s = Math.sin(rot) * half;
    ctx.beginPath();
    ctx.moveTo(x + c - s, y + s + c);
    ctx.lineTo(x - c - s, y - s + c);
    ctx.lineTo(x - c + s, y - s - c);
    ctx.lineTo(x + c + s, y + s - c);
    ctx.closePath();
    ctx.fill();
}

function drawParticles(ctx) {
    ctx.save();

    // ── 冲击波（lighter 叠加） ──
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0, n = G.flashes.length; i < n; i++) {
        const f = G.flashes[i];
        const a = f.life / f.maxLife;
        if (f.color === 2) {
            ctx.fillStyle = `rgba(255,255,255,${(a * 0.6).toFixed(2)})`;
        } else {
            const grd = ctx.createRadialGradient(f.x, f.y, f.r * 0.3, f.x, f.y, f.r);
            grd.addColorStop(0, `rgba(255,255,220,${(a * 0.8).toFixed(2)})`);
            grd.addColorStop(0.35, f.color === 1
                ? `rgba(50,255,100,${(a * 0.5).toFixed(2)})`
                : f.color === 3
                    ? `rgba(170,0,255,${(a * 0.5).toFixed(2)})`
                    : `rgba(255,150,30,${(a * 0.5).toFixed(2)})`);
            grd.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grd;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.2832);
        ctx.fill();
    }

    // ── Pass 1: 烟雾（source-over，无发光） ──
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0, n = G.particles.length; i < n; i++) {
        const p = G.particles[i];
        if (p.drawPass !== PASS_SMOKE) continue;
        const a = p.life / p.maxLife;
        const half = p.size * a * 0.5;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.rot) { _rotRect(ctx, p.x, p.y, half, p.rot); }
        else { ctx.fillRect(p.x - half, p.y - half, half * 2, half * 2); }
    }

    // ── Pass 2: 暗色残骸（source-over） ──
    for (let i = 0, n = G.particles.length; i < n; i++) {
        const p = G.particles[i];
        if (p.drawPass !== PASS_DEBRIS) continue;
        const a = p.life / p.maxLife;
        const half = p.size * a * 0.5;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.rot) { _rotRect(ctx, p.x, p.y, half, p.rot); }
        else { ctx.fillRect(p.x - half, p.y - half, half * 2, half * 2); }
    }

    // ── Pass 3: 主色碎片 + 亮色碎块（lighter 叠加发光） ──
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0, n = G.particles.length; i < n; i++) {
        const p = G.particles[i];
        if (p.drawPass !== PASS_CORE) continue;
        const a = p.life / p.maxLife;
        const half = p.size * a * 0.5;

        // 大尺寸半透明底（辉光，替代 shadowBlur）
        if (p.size > 4) {
            ctx.globalAlpha = a * 0.22;
            ctx.fillStyle = p.color;
            const big = half * 1.6;
            if (p.rot) { _rotRect(ctx, p.x, p.y, big, p.rot); }
            else { ctx.fillRect(p.x - big, p.y - big, big * 2, big * 2); }
        }

        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.rot) { _rotRect(ctx, p.x, p.y, half, p.rot); }
        else { ctx.fillRect(p.x - half, p.y - half, half * 2, half * 2); }

        // 内部高亮
        if (p.size > 5) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = a * 0.4;
            const inner = half * 0.3;
            ctx.fillRect(p.x - inner, p.y - inner, inner * 2, inner * 2);
        }
    }

    // ── Pass 4: 白色核心闪光（lighter，最亮） ──
    for (let i = 0, n = G.particles.length; i < n; i++) {
        const p = G.particles[i];
        if (p.drawPass !== PASS_FLASH) continue;
        const a = p.life / p.maxLife;
        const half = p.size * a * 0.5;
        // 发光底
        ctx.globalAlpha = a * 0.3;
        ctx.fillStyle = '#ffffff';
        const big = half * 1.8;
        ctx.fillRect(p.x - big, p.y - big, big * 2, big * 2);
        // 实体
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ffffff';
        if (p.rot) { _rotRect(ctx, p.x, p.y, half, p.rot); }
        else { ctx.fillRect(p.x - half, p.y - half, half * 2, half * 2); }
    }

    // ── Pass 5: 火花条（lighter） ──
    for (let i = 0, n = G.particles.length; i < n; i++) {
        const p = G.particles[i];
        if (p.drawPass !== PASS_SPARK) continue;
        const a = p.life / p.maxLife;
        const len = p.sparkLen * a;
        const dx = p.sparkDx * len * 0.5;
        const dy = p.sparkDy * len * 0.5;
        const sz = p.size * 0.5;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.x - dx, p.y - dy - sz);
        ctx.lineTo(p.x + dx, p.y + dy - sz);
        ctx.lineTo(p.x + dx, p.y + dy + sz);
        ctx.lineTo(p.x - dx, p.y - dy + sz);
        ctx.closePath();
        ctx.fill();
        // 头部亮点
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x + dx - 1.5, p.y + dy - 1, 3, 2);
    }

    // ── Pass 6: 非像素圆形粒子（source-over），包括外部调用者 push 的无 drawPass 粒子 ──
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0, n = G.particles.length; i < n; i++) {
        const p = G.particles[i];
        if (p.drawPass !== PASS_CIRCLE && p.drawPass !== undefined) continue;
        const a = p.life / p.maxLife;
        ctx.globalAlpha = a * 0.25;
        ctx.fillStyle = p.glowColor || '#ffffc8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a * 1.8, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, 6.2832);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}
