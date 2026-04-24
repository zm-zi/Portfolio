// 星空背景
const _stars = [];
for (let i = 0; i < 100; i++) {
    _stars.push({
        x: Math.random() * LOGICAL_W,
        y: Math.random() * LOGICAL_H,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
    });
}

// 背景飞机（飞过效果）
const _bgPlanes = [];
let _lastBgPlaneSpawn = 0;
const _BG_PLANE_INTERVAL = 2000; // 基础间隔2秒

// 背景飞机图片资源
let _bgPlaneImgs = [];
function initBgPlanes(img1, img2, img3) {
    _bgPlaneImgs = [img1, img2, img3];
}

function updateBgPlanes() {
    const now = Date.now();
    // 定时生成背景飞机，随机间隔2~5秒
    if (now - _lastBgPlaneSpawn > _BG_PLANE_INTERVAL + Math.random() * 3000) {
        const fromLeft = Math.random() > 0.5;
        const imgIdx = Math.floor(Math.random() * _bgPlaneImgs.length);
        const img = _bgPlaneImgs[imgIdx];
        if (!img.complete || img.width === 0) { _lastBgPlaneSpawn = now; return; }
        // 随机大小比例
        const scale = 0.3 + Math.random() * 0.35;
        const planeW = img.width * scale;
        const planeH = img.height * scale;
        // 随机高度
        const planeY = Math.random() * (LOGICAL_H - 250) + 30;
        // 随机速度
        const baseSpeed = 1.2 + Math.random() * 2;
        _bgPlanes.push({
            x: fromLeft ? -planeW : LOGICAL_W,
            y: planeY,
            width: planeW,
            height: planeH,
            speed: baseSpeed * (fromLeft ? 1 : -1),
            alpha: 0.15 + Math.random() * 0.2,
            imgIdx: imgIdx,
            // 随机微旋转角度（模拟不规则飞行）
            angle: (Math.random() - 0.5) * 0.3
        });
        _lastBgPlaneSpawn = now;
    }
    // 更新位置并移除出界的
    const dt = G.game.dt;
    for (let i = _bgPlanes.length - 1; i >= 0; i--) {
        const p = _bgPlanes[i];
        p.x += p.speed * dt;
        // 微调y轴（轻微上下漂移，模拟不规则）
        p.y += Math.sin(p.x * 0.02) * 0.3 * dt;
        if (p.x < -p.width * 2 || p.x > LOGICAL_W + p.width * 2) {
            _bgPlanes.splice(i, 1);
        }
    }
}

function drawBgPlanes(ctx) {
    for (const p of _bgPlanes) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
        ctx.rotate(p.angle);
        ctx.drawImage(
            _bgPlaneImgs[p.imgIdx],
            -p.width / 2,
            -p.height / 2,
            p.width,
            p.height
        );
        ctx.restore();
    }
}

function updateStars() {
    const dt = G.game.dt;
    for (const s of _stars) {
        s.y += s.speed * dt;
        if (s.y > LOGICAL_H) {
            s.y = 0;
            s.x = Math.random() * LOGICAL_W;
        }
    }
}

function drawStars(ctx) {
    for (const s of _stars) {
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ─── 陨石 + 破损战舰背景元素（三层视差深度）───
const _meteoriteImgs = [];
const _wreckImgs = [];
const _meteorites = [];
let _lastMeteoriteSpawn = 0;
const _METEORITE_BASE_INTERVAL = 1500; // 基础生成间隔 ms

function initMeteorites(rock1, rock2, rock3, rock4, rock5, wreck1, wreck2, wreck3, wreck4) {
    _meteoriteImgs.length = 0;
    _meteoriteImgs.push(rock1, rock2, rock3, rock4, rock5);
    _wreckImgs.length = 0;
    _wreckImgs.push(wreck1, wreck2, wreck3, wreck4);
}

function spawnMeteorite() {
    // 15% 概率生成破损战舰，否则生成陨石
    const isWreck = Math.random() < 0.15;
    const pool = isWreck ? _wreckImgs : _meteoriteImgs;
    const imgIdx = Math.floor(Math.random() * pool.length);
    const img = pool[imgIdx];
    if (!img.complete || img.width === 0) return;

    // 按概率选择深度层级：远景30%、中景50%、近景20%
    const roll = Math.random();
    let scale, alpha, speed;
    if (roll < 0.3) {
        // 远景：小而暗，慢速
        scale = (isWreck ? 0.03 : 0.04) + Math.random() * 0.04;
        alpha = 0.08 + Math.random() * 0.07;
        speed = 0.2 + Math.random() * 0.3;
    } else if (roll < 0.8) {
        // 中景：中等大小和亮度
        scale = (isWreck ? 0.06 : 0.1) + Math.random() * 0.08;
        alpha = 0.2 + Math.random() * 0.15;
        speed = 0.6 + Math.random() * 0.6;
    } else {
        // 近景：大而亮，快速
        scale = (isWreck ? 0.1 : 0.2) + Math.random() * 0.08;
        alpha = 0.35 + Math.random() * 0.15;
        speed = 1.5 + Math.random() * 1.0;
    }

    const w = img.width * scale;
    const h = img.height * scale;
    const x = Math.random() * (LOGICAL_W - w);

    _meteorites.push({
        x: x,
        y: -h,
        width: w,
        height: h,
        speed: speed,
        alpha: alpha,
        isWreck: isWreck,
        imgIdx: imgIdx,
        driftX: (Math.random() - 0.5) * 0.15
    });
}

function updateMeteorites() {
    const now = Date.now();
    const interval = _METEORITE_BASE_INTERVAL + Math.random() * 3000;
    if (now - _lastMeteoriteSpawn > interval) {
        spawnMeteorite();
        _lastMeteoriteSpawn = now;
    }

    const dt = G.game.dt;
    for (let i = _meteorites.length - 1; i >= 0; i--) {
        const m = _meteorites[i];
        m.y += m.speed * dt;
        m.x += m.driftX * dt;
        // 移除超出底部的陨石
        if (m.y > LOGICAL_H + m.height) {
            _meteorites.splice(i, 1);
        }
    }
    // 安全上限：防止内存泄漏
    while (_meteorites.length > 15) {
        _meteorites.shift();
    }
}

function drawMeteorites(ctx) {
    for (const m of _meteorites) {
        ctx.globalAlpha = m.alpha;
        ctx.drawImage(
            m.isWreck ? _wreckImgs[m.imgIdx] : _meteoriteImgs[m.imgIdx],
            m.x,
            m.y,
            m.width,
            m.height
        );
    }
    ctx.globalAlpha = 1;
}
