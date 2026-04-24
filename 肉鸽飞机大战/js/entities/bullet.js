// 子弹更新/绘制（性能优化版）
let _bulletImg = null;
let _enemy2BulletImg = null;

function initBullets(bImg, e2bImg) {
    _bulletImg = bImg;
    _enemy2BulletImg = e2bImg;
}

function updateBullets() {
    const dt = G.game.dt;
    // 玩家子弹：原地压缩
    let w = 0;
    for (let i = 0, n = G.bullets.length; i < n; i++) {
        const b = G.bullets[i];
        if (b.vx !== undefined) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (!b.isBomb && b.startY !== undefined && Math.abs(b.startY - b.y) >= b.range) {
                // 散射子弹（苍穹号等）
                continue;
            }
        } else {
            b.y -= BULLET_SPEED * dt;
        }
        if (b.y > -b.height && b.y < LOGICAL_H + b.height && b.x > -b.width && b.x < LOGICAL_W + b.width) {
            if (w !== i) G.bullets[w] = b;
            w++;
        }
    }
    G.bullets.length = w;

    // 僚机子弹：原地压缩
    w = 0;
    for (let i = 0, n = G.wingmanBullets.length; i < n; i++) {
        const b = G.wingmanBullets[i];
        b.y -= BULLET_SPEED * dt;
        if (b.y > -b.height) {
            if (w !== i) G.wingmanBullets[w] = b;
            w++;
        }
    }
    G.wingmanBullets.length = w;

    // 敌人子弹：原地压缩
    w = 0;
    for (let i = 0, n = G.enemyBullets.length; i < n; i++) {
        const b = G.enemyBullets[i];
        if (b.isHoming) {
            _updateHomingMissile(b);
            b.life -= dt;
            if (b.life <= 0) continue;
        } else if (b.vx !== undefined && b.vy !== undefined) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            // 冰锥拖尾粒子：微弱弥散蓝白小光点
            if (b.iceTrail && G.particles.length < PARTICLE_LIMIT && Math.random() < 0.5) {
                G.particles.push({
                    x: b.x + b.width / 2 + (Math.random() - 0.5) * 6,
                    y: b.y + b.height / 2 + (Math.random() - 0.5) * 6,
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: (Math.random() - 0.5) * 0.2,
                    life: 15 + Math.random() * 10, maxLife: 25,
                    color: '#bbeeff', size: 1 + Math.random(),
                    gravity: 0, isPixel: true, drawPass: PASS_CORE
                });
            }
            // 独眼王火焰拖尾粒子：暗红余烬
            if (b.emberTrail && G.particles.length < PARTICLE_LIMIT && Math.random() < 0.4) {
                G.particles.push({
                    x: b.x + b.width / 2 + (Math.random() - 0.5) * 4,
                    y: b.y + b.height / 2 + (Math.random() - 0.5) * 4,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: Math.random() * 0.5 + 0.2,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    color: Math.random() > 0.4 ? '#ff2200' : '#881100',
                    size: 1.5 + Math.random() * 1.5,
                    gravity: -0.02, drawPass: PASS_CIRCLE,
                    glowColor: '#ff0000'
                });
            }
        } else {
            b.y += BULLET_SPEED * dt;
        }
        if (b.y > LOGICAL_H || b.x < -b.width || b.x > LOGICAL_W) continue;
        if (w !== i) G.enemyBullets[w] = b;
        w++;
    }
    G.enemyBullets.length = w;
}

function _updateHomingMissile(m) {
    const dt = G.game.dt;
    const speed = m.homingSpeed || MISSILE_SPEED;
    const baseTurn = m.homingTurn || MISSILE_TURN_SPEED;
    const targetX = G.player.x + G.player.width / 2;
    const targetY = G.player.y + G.player.height / 2;
    const angleToTarget = Math.atan2(targetY - m.y, targetX - m.x);
    const turnSpeed = m.life < 30 ? baseTurn * 0.5 : baseTurn;
    let angleDiff = angleToTarget - m.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    m.angle += Math.max(-turnSpeed, Math.min(turnSpeed, angleDiff)) * dt;
    m.vx = Math.cos(m.angle) * speed;
    m.vy = Math.sin(m.angle) * speed;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    createMissileTrail(m.x, m.y, m.angle);
}

// ─── 玩家子弹绘制（椭圆蓝白能量弹） ───
function drawBullets() {
    const ctx = Game.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0, n = G.bullets.length; i < n; i++) {
        const b = G.bullets[i];
        const cx = Math.round(b.x + b.width / 2);
        const cy = Math.round(b.y + b.height / 2);

        if (b.isBomb) {
            // 墨子号炸弹：深蓝色圆形弹体
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#1a2266';
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, 6.2832);
            ctx.fill();

            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#3344aa';
            ctx.beginPath();
            ctx.arc(cx, cy, 6, 0, 6.2832);
            ctx.fill();

            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#6688dd';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, 6.2832);
            ctx.fill();

            ctx.fillStyle = '#aaccff';
            ctx.beginPath();
            ctx.arc(cx, cy, 2, 0, 6.2832);
            ctx.fill();
            continue;
        }

        // 苍穹号偏冷白，紫色更有韵味偏紫，默认机偏亮蓝
        const ss = b.skySovereign;
        const pu = b.purple;

        // 外层大辉光（最扁最大）
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = ss ? '#88aacc' : pu ? '#5522aa' : '#3377aa';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 8, 20, 0, 0, 6.2832);
        ctx.fill();

        // 中层辉光
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = ss ? '#99bbdd' : pu ? '#7733cc' : '#4499cc';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5.5, 16, 0, 0, 6.2832);
        ctx.fill();

        // 弹体
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = ss ? '#bbddee' : pu ? '#9955ee' : '#66bbdd';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 3.5, 13, 0, 0, 6.2832);
        ctx.fill();

        // 内核高光
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = ss ? '#ddeeff' : pu ? '#cc88ff' : '#aaddff';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 1, 2, 9, 0, 0, 6.2832);
        ctx.fill();

        // 白色炽热核心
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 2, 1.2, 6, 0, 0, 6.2832);
        ctx.fill();

        // 顶部闪烁光点
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 13, 1.5, 0, 6.2832);
        ctx.fill();
    }

    ctx.restore();

    // 尾焰拖尾粒子
    if (G.particles.length < PARTICLE_LIMIT) {
        for (let i = 0, n = G.bullets.length; i < n; i++) {
            if (Math.random() < 0.2) {
                const b = G.bullets[i];
                const bx = b.x + b.width / 2;
                const trailY = b.vy !== undefined ? b.y : b.y + b.height;
                if (b.isBomb) {
                    createBombTrail(bx + (Math.random() - 0.5) * 4, trailY);
                } else {
                    createBulletTrail(bx + (Math.random() - 0.5) * 3, trailY, b.skySovereign, b.purple);
                }
            }
        }
    }
}

// 子弹尾焰粒子（多色渐变模拟尾焰衰减）
function createBulletTrail(x, y, isSS, isPurple) {
    const r = Math.random();
    let color;
    if (isSS) {
        color = r < 0.3 ? '#ffffff' : r < 0.6 ? '#ddeeff' : '#aabbcc';
    } else if (isPurple) {
        color = r < 0.3 ? '#ffffff' : r < 0.6 ? '#cc88ff' : '#8844cc';
    } else {
        color = r < 0.3 ? '#ffffff' : r < 0.6 ? '#88ddff' : '#44aadd';
    }
    G.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: Math.random() * 1.2 + 0.4,
        life: 14 + Math.random() * 10,
        maxLife: 24,
        size: r < 0.4 ? 3 : r < 0.7 ? 2 : 1.5,
        color: color,
        drawPass: PASS_CORE
    });
}

function createBombTrail(x, y) {
    const r = Math.random();
    G.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        life: 12 + Math.random() * 8,
        maxLife: 20,
        size: r < 0.3 ? 3 : 2,
        color: r < 0.3 ? '#6688ff' : r < 0.6 ? '#4466cc' : '#3344aa',
        drawPass: PASS_CORE
    });
}

// ─── 僚机子弹绘制（批量绘制，lighter 叠加替代 shadowBlur） ───
function drawWingmanBullets() {
    const ctx = Game.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0, n = G.wingmanBullets.length; i < n; i++) {
        const b = G.wingmanBullets[i];
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const rx = b.width / 2;
        const ry = b.height / 2;

        // 大号辉光底（替代外层 shadowBlur ellipse）
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#44ddff';
        ctx.fillRect(cx - rx - 4, cy - ry - 4, rx * 2 + 8, ry * 2 + 8);

        // 弹体（用 fillRect 替代 ellipse，像素风格更统一）
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#44ddff';
        ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

        // 内核高光
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#bbf4ff';
        const irx = rx * 0.6;
        const iry = ry * 0.6;
        ctx.fillRect(cx - irx, cy - iry - 1, irx * 2, iry * 2);
    }

    ctx.restore();
}

function drawEnemyBullets() {
    const ctx = Game.ctx;
    for (let i = 0, n = G.enemyBullets.length; i < n; i++) {
        const b = G.enemyBullets[i];
        if (b.isHoming || b.isMissile) {
            _drawHomingMissile(b);
        } else if (b.iceSpike) {
            // 冰霜漩涡冰刺：发光描边 + 图片
            const cx = b.x + b.width / 2;
            const cy = b.y + b.height / 2;
            const r = Math.max(b.width, b.height) * 0.7;
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#88ddff';
            ctx.fillStyle = '#aaf0ff';
            ctx.beginPath();
            ctx.ellipse(cx, cy, r, r * 1.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            const img = b.img || _enemy2BulletImg;
            ctx.drawImage(img, b.x, b.y, b.width, b.height);
        } else if (b.color) {
            _drawColoredBullet(ctx, b);
        } else {
            const img = b.img || _enemy2BulletImg;
            ctx.drawImage(img, b.x, b.y, b.width, b.height);
        }
    }
}

// 按颜色绘制不同风格的敌弹
function _drawColoredBullet(ctx, b) {
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const rx = b.width / 2;
    const ry = b.height / 2;
    const c = b.color;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 外层辉光
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 3, ry + 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 弹体
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // 内核高光
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.15, rx * 0.4, ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function _drawHomingMissile(m) {
    const ctx = Game.ctx;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle);

    const scale = Math.min(1, (MISSILE_LIFE - m.life) / 3 + 0.5);
    ctx.scale(scale, scale);

    // 导弹主体
    ctx.fillStyle = '#DDDDDD';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 4, 0, 0, 6.2832);
    ctx.fill();

    // 头部高光
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(6, 0, 4, 2.5, 0, 0, 6.2832);
    ctx.fill();

    // 喷气口（用 lighter 叠加替代 shadowBlur）
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FF4400';
    ctx.fillRect(-12, -3, 4, 6);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-11, -1.5, 2, 3);

    ctx.restore();
}

function updateHomingMissiles() {
    const claimed = new Set();
    const dt = G.game.dt;

    for (let i = G.homingMissiles.length - 1; i >= 0; i--) {
        const m = G.homingMissiles[i];

        let target = null;
        let minDist = Infinity;

        if (m._target && !claimed.has(m._target)) {
            const stillAlive = m._target === G.boss ? !!G.boss : G.enemies.indexOf(m._target) >= 0;
            if (stillAlive) {
                target = m._target;
            }
        }

        if (!target) {
            for (const e of G.enemies) {
                if (claimed.has(e)) continue;
                const ecx = e.x + e.width / 2;
                const ecy = e.y + e.height / 2;
                const dx = ecx - (m.x + m.width / 2);
                const dy = ecy - (m.y + m.height / 2);
                const dist = dx * dx + dy * dy;
                if (dist < minDist) { minDist = dist; target = e; }
            }
            if (G.boss && !claimed.has(G.boss)) {
                const bx = G.boss.x + G.boss.width / 2;
                const by = G.boss.y + G.boss.height / 2;
                const dx = bx - (m.x + m.width / 2);
                const dy = by - (m.y + m.height / 2);
                const dist = dx * dx + dy * dy;
                if (dist < minDist) { minDist = dist; target = G.boss; }
            }
        }

        m._target = target;
        if (target) claimed.add(target);

        if (target) {
            const tx = target.x + target.width / 2;
            const ty = target.y + target.height / 2;
            const angleToTarget = Math.atan2(ty - (m.y + m.height / 2), tx - (m.x + m.width / 2));
            let angleDiff = angleToTarget - m.angle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            const turn = m.life < 30 ? PLAYER_MISSILE_TURN * 0.5 : PLAYER_MISSILE_TURN;
            m.angle += Math.max(-turn, Math.min(turn, angleDiff)) * dt;
            m.vx = Math.cos(m.angle) * PLAYER_MISSILE_SPEED;
            m.vy = Math.sin(m.angle) * PLAYER_MISSILE_SPEED;
        }

        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= dt;

        createMissileTrail(m.x + m.width / 2, m.y + m.height / 2, m.angle);

        if (m.y > LOGICAL_H || m.y < -m.height || m.x < -m.width || m.x > LOGICAL_W || m.life <= 0) {
            G.homingMissiles.splice(i, 1);
        }
    }
}

function drawHomingMissiles() {
    for (let i = 0, n = G.homingMissiles.length; i < n; i++) {
        _drawHomingMissile(G.homingMissiles[i]);
    }
}
