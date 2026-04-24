// 宝石掉落系统
let _gemImgs = {};

function initGems(img5, img10, img20) {
    _gemImgs[5] = img5;
    _gemImgs[10] = img10;
    _gemImgs[20] = img20;
}

function _getGemImg(score) {
    if (score >= 20) return _gemImgs[20];
    if (score >= 10) return _gemImgs[10];
    return _gemImgs[5];
}

const GEM_SIZE = 24;
const GEM_ATTRACT_DIST_BASE = 120;
const GEM_ATTRACT_SPEED = 6;
const FLOAT_TEXT_LIFE = 90;

// 宝石颜色映射
function _gemColor(score) {
    if (score >= 20) return '#44ff88';
    if (score >= 10) return '#44ddff';
    return '#ff8800';
}

// 爆出宝石 — 从中心向四周弹射，带旋转和缩放动画
function spawnGem(x, y, score) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8; // 上半扇形
    const speed = 2.5 + Math.random() * 3;
    G.gems.push({
        x: x - GEM_SIZE / 2,
        y: y - GEM_SIZE / 2,
        width: GEM_SIZE,
        height: GEM_SIZE,
        score: score,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        gravity: 0.12,
        friction: 0.97,
        attracted: false,
        scale: 0.1,
        scaleTarget: 1,
        phase: 'burst',
        burstTimer: 0,
        bobPhase: Math.random() * Math.PI * 2
    });
}

// 生成浮动加分文字（更夸张的弹出效果）
function spawnFloatText(x, y, score, color) {
    G.floatTexts.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y,
        text: '+' + score,
        color: color,
        life: FLOAT_TEXT_LIFE,
        maxLife: FLOAT_TEXT_LIFE,
        vy: -2.5,
        vx: (Math.random() - 0.5) * 1.0,
        scale: 1.8,        // 初始放大弹出
        scaleTarget: 1,
        shake: 3,           // 初始抖动幅度
        score: score
    });
}

function updateGems() {
    const dt = G.game.dt;
    const px = G.player.x + G.player.width / 2;
    const py = G.player.y + G.player.height / 2;

    for (let i = G.gems.length - 1; i >= 0; i--) {
        const g = G.gems[i];
        const stacks = G.player.gemAttractStacks || 0;
        const attractDist = stacks >= 5 ? 9999 : GEM_ATTRACT_DIST_BASE * Math.pow(1.2, stacks);

        // ── burst 阶段：弹射出去 ──
        if (g.phase === 'burst') {
            g.vx *= Math.pow(g.friction, dt);
            g.vy *= Math.pow(g.friction, dt);
            g.vy += g.gravity * dt;
            g.x += g.vx * dt;
            g.y += g.vy * dt;

            // 缩放弹入
            const lerpFactor = 1 - Math.pow(0.85, dt);
            g.scale += (g.scaleTarget - g.scale) * lerpFactor;

            g.burstTimer += dt;
            if (g.burstTimer > 20) {
                g.phase = 'fall';
            }
        }
        // ── fall 阶段：缓慢下落 + 轻微 bob ──
        else if (g.phase === 'fall') {
            g.vy = Math.min(g.vy + 0.04 * dt, 1.2);
            g.x += g.vx * dt;
            g.y += g.vy * dt;
            g.vx *= Math.pow(0.99, dt);

            const lerpFactor = 1 - Math.pow(0.9, dt);
            g.scale += (g.scaleTarget - g.scale) * lerpFactor;

            const gcx = g.x + g.width / 2;
            const gcy = g.y + g.height / 2;
            if (Math.hypot(px - gcx, py - gcy) < attractDist) {
                g.attracted = true;
                g.phase = 'attract';
            }
        }
        // ── attract 阶段：飞向玩家 ──
        else if (g.phase === 'attract') {
            const gcx = g.x + g.width / 2;
            const gcy = g.y + g.height / 2;
            const dist = Math.max(1, Math.hypot(px - gcx, py - gcy));
            const dx = px - gcx;
            const dy = py - gcy;
            const speed = Math.min(GEM_ATTRACT_SPEED + (attractDist - dist) * 0.05, 14);
            g.x += (dx / dist) * speed * dt;
            g.y += (dy / dist) * speed * dt;
            g.scale = 0.9 + Math.sin(Date.now() * 0.01) * 0.1;
        }

        // 限制左右不出边界
        if (g.x < 0) { g.x = 0; g.vx = Math.abs(g.vx) * 0.5; }
        if (g.x + g.width > LOGICAL_W) { g.x = LOGICAL_W - g.width; g.vx = -Math.abs(g.vx) * 0.5; }

        // 拾取检测
        if (Game.Util.aabb(g, G.player)) {
            const gemMult = 1 + (G.player.gemValueStacks || 0) * 0.1;
            const finalScore = Math.round(g.score * gemMult);
            G.game.score += finalScore;
            const color = _gemColor(g.score);
            spawnFloatText(g.x + g.width / 2, g.y, finalScore, color);
            // 拾取时爆出几个闪光粒子
            _spawnGemPickupFx(g.x + g.width / 2, g.y + g.height / 2, color);
            playGemPickupSound();
            G.gems.splice(i, 1);
            continue;
        }

        if (g.y > LOGICAL_H + 40) {
            G.gems.splice(i, 1);
        }
    }

    // 更新浮动文字
    for (let i = G.floatTexts.length - 1; i >= 0; i--) {
        const ft = G.floatTexts[i];
        ft.y += ft.vy * dt;
        ft.x += ft.vx * dt;
        ft.vy *= Math.pow(0.94, dt);
        ft.vx *= Math.pow(0.92, dt);
        ft.life -= dt;

        // 缩放弹入后回落
        const lerpFactor = 1 - Math.pow(0.88, dt);
        ft.scale += (ft.scaleTarget - ft.scale) * lerpFactor;

        // 抖动衰减
        if (ft.shake > 0.1) ft.shake *= Math.pow(0.85, dt);

        if (ft.life <= 0) G.floatTexts.splice(i, 1);
    }
}

// 拾取时的闪光粒子
function _spawnGemPickupFx(x, y, color) {
    if (G.particles.length >= PARTICLE_LIMIT) return;
    for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2.5 + 1;
        G.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 12 + Math.random() * 8,
            maxLife: 20,
            color: color,
            size: Math.random() * 3 + 1,
            gravity: 0,
            drawPass: PASS_CORE
        });
    }
}

function drawGems(ctx) {
    ctx.save();

    // 绘制宝石
    for (const g of G.gems) {
        const img = _getGemImg(g.score);
        const cx = g.x + g.width / 2;
        const cy = g.y + g.height / 2;
        const color = _gemColor(g.score);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(g.scale, g.scale);

        // 宝石底光（合并闪光和拖尾为一次 shadowBlur）
        ctx.shadowBlur = g.phase === 'attract' ? 10 : 8;
        ctx.shadowColor = color;

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -g.width / 2, -g.height / 2, g.width, g.height);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(-g.width / 2, -g.height / 2, g.width, g.height);
        }
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    // 绘制浮动加分文字
    for (const ft of G.floatTexts) {
        const alpha = ft.life / ft.maxLife;
        const ox = ft.shake > 0.1 ? (Math.random() - 0.5) * ft.shake : 0;
        const oy = ft.shake > 0.1 ? (Math.random() - 0.5) * ft.shake : 0;

        // 大分值用更大的字号
        const fontSize = ft.score >= 20 ? 18 : ft.score >= 10 ? 16 : 14;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
        ctx.translate(ft.x + ox, ft.y + oy);
        ctx.scale(ft.scale, ft.scale);

        // 外层光晕
        ctx.shadowBlur = 14 * alpha;
        ctx.shadowColor = ft.color;
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);

        // 内层白色高亮
        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ft.text, 0, 0);

        ctx.restore();
    }

    ctx.restore();
}
