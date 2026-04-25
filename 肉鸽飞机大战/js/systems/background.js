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

// ─── 无尽模式背景：上下拼接无限滚动（支持多图轮换 + 切换动画）───
let _endlessBgImg = null;
let _endlessBgOffset = 0;

// 多背景切换系统
let _endlessBgImgs = [];
let _bgCurrentIdx = 0;
let _bgTransition = -1; // -1 = 空闲, 0~1 = 过渡进度
const _BG_TRANSITION_FRAMES = 160; // 约 800ms（200fps 基准）

function _drawBgTile(ctx, img, offset) {
    if (!img || !img.complete || img.width === 0) return;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    const scale = LOGICAL_W / imgW;
    const tileH = imgH * scale;
    const o = offset % tileH;
    const startY = -tileH + o;
    for (let y = startY; y < LOGICAL_H; y += tileH) {
        ctx.drawImage(img, 0, y, LOGICAL_W, tileH);
    }
}

// 初始化：支持传单图或数组
function initEndlessBg(img) {
    if (Array.isArray(img)) {
        _endlessBgImgs = img.filter(i => i);
        _bgCurrentIdx = 0;
        _bgTransition = -1;
        _endlessBgImg = _endlessBgImgs[0] || null;
    } else {
        _endlessBgImgs = [img];
        _bgCurrentIdx = 0;
        _bgTransition = -1;
        _endlessBgImg = img;
    }
    _endlessBgOffset = 0;
}

// 触发背景切换（由 Boss 击杀时调用）
function triggerBgTransition() {
    if (_endlessBgImgs.length < 2 || _bgTransition >= 0) return;
    _bgTransition = 0;
}

// 重置到第一张背景（游戏重启时）
function resetBgTransition() {
    _bgCurrentIdx = 0;
    _bgTransition = -1;
    _endlessBgImg = _endlessBgImgs[0] || null;
    _endlessBgOffset = 0;
}

function updateEndlessBg(scrollSpeed) {
    _endlessBgOffset += scrollSpeed * G.game.dt;
    // 更新过渡进度
    if (_bgTransition >= 0) {
        _bgTransition += G.game.dt / _BG_TRANSITION_FRAMES;
        if (_bgTransition >= 1) {
            _bgTransition = -1;
            _bgCurrentIdx = (_bgCurrentIdx + 1) % _endlessBgImgs.length;
            _endlessBgImg = _endlessBgImgs[_bgCurrentIdx];
        }
    }
}

function drawEndlessBg(ctx) {
    if (_bgTransition < 0) {
        // 正常绘制当前背景
        _drawBgTile(ctx, _endlessBgImg, _endlessBgOffset);
        return;
    }

    const p = _bgTransition;
    if (p < 0.5) {
        // 阶段1：当前背景逐渐变暗
        _drawBgTile(ctx, _endlessBgImg, _endlessBgOffset);
        const darkAlpha = p * 2; // 0 → 1
        ctx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    } else {
        // 阶段2：新背景从黑暗中浮现
        const nextIdx = (_bgCurrentIdx + 1) % _endlessBgImgs.length;
        _drawBgTile(ctx, _endlessBgImgs[nextIdx], _endlessBgOffset);
        const darkAlpha = 1 - (p - 0.5) * 2; // 1 → 0
        ctx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }
}

// ─── 星球探索背景：上下拼接无限滚动 ───
let _exploreBgImg = null;
let _exploreBgOffset = 0;

function initExploreBg(img) {
    _exploreBgImg = img;
    _exploreBgOffset = 0;
}

function updateExploreBg(scrollSpeed) {
    _exploreBgOffset += scrollSpeed * G.game.dt;
}

function drawExploreBg(ctx) {
    if (!_exploreBgImg || !_exploreBgImg.complete || _exploreBgImg.width === 0) {
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
        return;
    }
    const imgW = _exploreBgImg.naturalWidth || _exploreBgImg.width;
    const imgH = _exploreBgImg.naturalHeight || _exploreBgImg.height;
    // 缩放到画布宽度，保持比例
    const scale = LOGICAL_W / imgW;
    const tileH = imgH * scale;
    // 取模实现无限循环
    _exploreBgOffset = _exploreBgOffset % tileH;
    // 绘制足够多的贴图覆盖屏幕
    const startY = -tileH + _exploreBgOffset;
    for (let y = startY; y < LOGICAL_H; y += tileH) {
        ctx.drawImage(_exploreBgImg, 0, y, LOGICAL_W, tileH);
    }
}
