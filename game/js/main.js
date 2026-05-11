// 入口
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
Game.ctx = ctx;
const dpr = window.devicePixelRatio || 1;

canvas.width = LOGICAL_W * dpr;
canvas.height = LOGICAL_H * dpr;
canvas.style.width = LOGICAL_W + 'px';
canvas.style.height = LOGICAL_H + 'px';
ctx.scale(dpr, dpr);
ctx.imageSmoothingEnabled = false;

// Mobile: responsive canvas sizing
var _resizeMobileCanvas = null;
if (IS_MOBILE) {
    _resizeMobileCanvas = function () {
        var wrap = document.getElementById('canvas-wrap');
        var wrapW = wrap.clientWidth;
        var wrapH = wrap.clientHeight;
        // Calculate canvas size maintaining 3:4 aspect ratio
        var ratio = LOGICAL_W / LOGICAL_H; // 0.75
        var w = wrapW;
        var h = w / ratio;
        if (h > wrapH) {
            h = wrapH;
            w = h * ratio;
        }
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
    };
    _resizeMobileCanvas();
    window.addEventListener('resize', _resizeMobileCanvas);
    window.addEventListener('orientationchange', function () {
        setTimeout(_resizeMobileCanvas, 150);
    });
}

// ── 图片加载注册表：所有 Image 统一注册，startGame 等待全部完成 ──
const _pendingImages = [];
let _loadedImageCount = 0;
let _totalImageCount = 0;
function _loadImg(src) {
    _totalImageCount++;
    const img = new Image();
    _pendingImages.push(new Promise((resolve) => {
        img.onload = () => { _loadedImageCount++; resolve(); };
        img.onerror = () => { console.warn('图片加载失败:', src); _loadedImageCount++; resolve(); };
    }));
    img.src = src;
    return img;
}

// ── 战机图片：从 CRAFT 注册表批量加载 ──
CRAFT.all().forEach(c => {
    if (c.imgSrc) {
        const img = _loadImg(c.imgSrc);
        CRAFT.bindImg(c.id, img);
    }
});

const bulletImg = new Image();
bulletImg.src = 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="16" viewBox="0 0 6 16">
        <ellipse cx="3" cy="8" rx="3" ry="8" fill="#ff4444"/>
        <ellipse cx="3" cy="6" rx="1.5" ry="4" fill="#ffff88"/>
    </svg>
`);

const gem5Img = _loadImg('image/宝石5分.png');
const gem10Img = _loadImg('image/宝石10分.png');
const gem20Img = _loadImg('image/宝石20分·.png');

const iceConeImg = _loadImg('image/冰锥子弹.png');
const iceWallImg = _loadImg('image/冰墙素材.png');
const iceVortexImg = _loadImg('image/冰霜漩涡.png');

const enemy2BulletImg = new Image();
enemy2BulletImg.src = 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 12">
        <ellipse cx="4" cy="6" rx="4" ry="6" fill="#ff8800"/>
        <ellipse cx="4" cy="4" rx="2" ry="3" fill="#ffff00"/>
    </svg>
`);

// 初始化
initUI();
initBuffUI();
initLevelMap();
initBullets(bulletImg, enemy2BulletImg);
initGems(gem5Img, gem10Img, gem20Img);

// ── 从注册表批量加载敌人/Boss 图片 ──
ENEMY.all().forEach(def => {
    if (def.imgSrc) {
        const img = _loadImg(def.imgSrc);
        ENEMY.bindImg(def.type, img);
    }
});

BOSS._order.forEach(id => {
    const def = BOSS.get(id);
    if (!def) return;
    if (def.imgSrc) {
        const img = _loadImg(def.imgSrc);
        BOSS.bindImg(id, img);
    }
    if (def.actionImgSrc) {
        const img = _loadImg(def.actionImgSrc);
        BOSS.bindActionImg(id, img);
    }
});

// 冰霜图片挂到全局
G.iceImg = iceConeImg;
G.iceWallImg = iceWallImg;
G.iceVortexImg = iceVortexImg;

// Boss 触发分数初始化
const firstBoss = BOSS.getByIndex(0);
G.bossNextScore = firstBoss ? firstBoss.spawnScore : Infinity;

// 背景飞机用图（从注册表获取）
initBgPlanes(ENEMY.get('basic')._img, ENEMY.get('shooter')._img, ENEMY.get('rusher')._img);

// 陨石 + 破损战舰背景素材
const meteorite1Img = _loadImg('image/陨石素材1.png');
const meteorite2Img = _loadImg('image/陨石素材2.png');
const meteorite3Img = _loadImg('image/陨石素材3.png');
const meteorite4Img = _loadImg('image/陨石素材4.png');
const meteorite5Img = _loadImg('image/陨石素材5.png');
const wreck1Img = _loadImg('image/破损战舰1.png');
const wreck2Img = _loadImg('image/破损战舰2.png');
const wreck3Img = _loadImg('image/破损战舰3.png');
const wreck4Img = _loadImg('image/破损战舰4.png');
initMeteorites(meteorite1Img, meteorite2Img, meteorite3Img, meteorite4Img, meteorite5Img, wreck1Img, wreck2Img, wreck3Img, wreck4Img);

// 无尽模式背景图（多图轮换，击杀Boss切换）
const endlessBgImg0 = _loadImg('image/背景图零.png');
const endlessBgImg3 = _loadImg('image/背景图三.png');
initEndlessBg([endlessBgImg0, endlessBgImg3]);

// 星球探索背景图
const exploreBgImg = _loadImg('image/背景图一.png');
initExploreBg(exploreBgImg);

initInput(canvas);

// ── 加载屏幕系统 ──
const _loadingState = {
    fontsReady: false,
    imagesReady: false,
    allReady: false,
    startTime: Date.now(),
    stars: [],
    particles: [],
    showEnter: false,
    entered: false,
    loadPhase: 'init', // 'init' | 'images' | 'fonts' | 'ready' | 'entering'
    currentAsset: '',
    errorCount: 0,
};

// 生成加载屏星空
for (let i = 0; i < 80; i++) {
    _loadingState.stars.push({
        x: Math.random() * LOGICAL_W,
        y: Math.random() * LOGICAL_H,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.6 + 0.15,
    });
}

// 生成背景粒子
for (let i = 0; i < 20; i++) {
    _loadingState.particles.push({
        x: Math.random() * LOGICAL_W,
        y: Math.random() * LOGICAL_H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.8 - 0.2,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.3 + 0.05,
        color: Math.random() > 0.5 ? '#00e5ff' : '#00ffcc',
    });
}

// 加载状态文本
function _getLoadingStatusText() {
    if (!_loadingState.fontsReady) return '正在加载字体...';
    if (!_loadingState.imagesReady) return '正在加载资源...';
    return '加载完成';
}

// 加载百分比
function _getLoadingProgress() {
    const total = _totalImageCount + 1; // +1 for fonts
    let loaded = _loadedImageCount;
    if (_loadingState.fontsReady) loaded += 1;
    return Math.min(loaded / total, 1);
}

// 绘制加载屏幕
function _drawLoadingScreen() {
    const ctx = Game.ctx;
    const now = Date.now();
    const elapsed = now - _loadingState.startTime;

    // 背景
    ctx.fillStyle = '#05080f';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 星空动画
    for (const star of _loadingState.stars) {
        star.y += star.speed * 0.8;
        if (star.y > LOGICAL_H) {
            star.y = -2;
            star.x = Math.random() * LOGICAL_W;
        }
        const twinkle = 0.5 + 0.5 * Math.sin(now * 0.003 + star.x);
        ctx.fillStyle = `rgba(200, 220, 255, ${star.alpha * twinkle})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // 粒子效果
    for (const p of _loadingState.particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
            p.y = LOGICAL_H + 10;
            p.x = Math.random() * LOGICAL_W;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(now * 0.002 + p.x));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 标题
    ctx.textAlign = 'center';
    const titleY = 160;
    const titlePulse = 0.8 + 0.2 * Math.sin(now * 0.003);

    // 标题发光
    ctx.save();
    ctx.shadowBlur = 30;
    ctx.shadowColor = SCI.primary;
    ctx.fillStyle = SCI.primary;
    ctx.globalAlpha = titlePulse;
    ctx.font = 'bold 42px ' + FONT_UI;
    ctx.fillText('超时空激战', LOGICAL_W / 2, titleY);
    ctx.restore();

    // 副标题
    ctx.fillStyle = `rgba(0, 229, 255, ${0.4 + 0.15 * Math.sin(now * 0.004)})`;
    ctx.font = '18px ' + FONT_UI;
    ctx.fillText('无尽冒险 · 词条搭配', LOGICAL_W / 2, titleY + 30);

    // 分隔线
    drawSciSeparator(ctx, LOGICAL_W / 2, titleY + 50, 240, SCI.primary);

    // ── 进度条区域 ──
    const barW = 320;
    const barH = 16;
    const barX = LOGICAL_W / 2 - barW / 2;
    const barY = 320;
    const progress = _getLoadingProgress();

    // 进度条背景
    ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2);
    ctx.fill();

    // 进度条边框
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2);
    ctx.stroke();

    // 进度条填充
    if (progress > 0) {
        const fillW = barW * progress;
        const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
        grad.addColorStop(0, '#003366');
        grad.addColorStop(0.5, '#00e5ff');
        grad.addColorStop(1, '#00ffcc');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillW, barH, 2);
        ctx.fill();

        // 填充发光
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00e5ff';
        ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillW, barH, 2);
        ctx.fill();
        ctx.restore();
    }

    // 角装饰
    drawSciCorners(ctx, barX - 4, barY - 4, barW + 8, barH + 8, 8, SCI.primary + '88');

    // 百分比文字
    const percentText = Math.floor(progress * 100) + '%';
    ctx.fillStyle = SCI.white;
    ctx.font = 'bold 14px ' + FONT_PIXEL;
    ctx.fillText(percentText, LOGICAL_W / 2, barY + barH + 28);

    // 状态文字
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.font = '14px ' + FONT_UI;
    ctx.fillText(_getLoadingStatusText(), LOGICAL_W / 2, barY + barH + 52);

    // 加载详情
    if (_totalImageCount > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '12px ' + FONT_UI;
        ctx.fillText(`资源: ${_loadedImageCount}/${_totalImageCount}`, LOGICAL_W / 2, barY + barH + 72);
    }

    // 超时提示（超过15秒未加载完）
    if (!_loadingState.allReady && elapsed > 15000) {
        const warnY = barY + barH + 100;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.font = '13px ' + FONT_UI;
        ctx.fillText('加载较慢，请检查网络连接', LOGICAL_W / 2, warnY);

        // 跳过按钮
        const skipW = 160;
        const skipH = 36;
        const skipX = LOGICAL_W / 2 - skipW / 2;
        const skipY = warnY + 18;
        const skipPulse = 0.5 + 0.5 * Math.sin(now * 0.005);

        ctx.fillStyle = `rgba(255, 215, 0, ${0.06 * skipPulse})`;
        ctx.beginPath();
        ctx.roundRect(skipX, skipY, skipW, skipH, 2);
        ctx.fill();

        ctx.save();
        ctx.shadowBlur = 6 * skipPulse;
        ctx.shadowColor = '#ffd700';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5 + 0.3 * skipPulse;
        ctx.beginPath();
        ctx.roundRect(skipX, skipY, skipW, skipH, 2);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = `rgba(255, 215, 0, ${0.6 + 0.3 * skipPulse})`;
        ctx.font = '12px ' + FONT_PIXEL;
        ctx.fillText('跳过加载', LOGICAL_W / 2, skipY + 14);

        _loadingState.skipRect = { x: skipX, y: skipY, w: skipW, h: skipH };
    }

    // ── 加载完成后显示点击进入 ──
    if (_loadingState.allReady && !_loadingState.entered) {
        _loadingState.showEnter = true;

        const enterY = 500;
        const enterPulse = 0.5 + 0.5 * Math.sin(now * 0.004);

        // 点击进入按钮
        const btnW = 240;
        const btnH = 50;
        const btnX = LOGICAL_W / 2 - btnW / 2;
        const btnY = enterY - 10;

        // 按钮背景
        ctx.fillStyle = `rgba(0, 229, 255, ${0.06 * enterPulse})`;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 3);
        ctx.fill();

        // 按钮边框 + 发光
        ctx.save();
        ctx.shadowBlur = 12 * enterPulse;
        ctx.shadowColor = SCI.primary;
        ctx.strokeStyle = SCI.primary;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6 + 0.4 * enterPulse;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 3);
        ctx.stroke();
        ctx.restore();

        // 角装饰
        drawSciCorners(ctx, btnX, btnY, btnW, btnH, 10, SCI.primary + '88');

        // 按钮文字
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + 0.3 * enterPulse})`;
        ctx.font = '16px ' + FONT_PIXEL;
        ctx.fillText('点击进入游戏', LOGICAL_W / 2, enterY + 18);

        // 提示文字
        ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
        ctx.font = '13px ' + FONT_UI;
        ctx.fillText('资源加载完成，点击任意位置开始', LOGICAL_W / 2, enterY + 60);

        // 存储按钮区域用于点击检测
        _loadingState.btnRect = { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    // 底部装饰
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.font = '11px ' + FONT_UI;
    ctx.fillText('CLOUDFLARE CDN', LOGICAL_W / 2, LOGICAL_H - 30);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.fillText('超时空激战 v1.0', LOGICAL_W / 2, LOGICAL_H - 14);

    ctx.textAlign = 'left';
}

// 加载动画循环
function _loadingLoop() {
    if (_loadingState.entered) return;

    _drawLoadingScreen();

    // 持续运行动画直到用户点击进入
    requestAnimationFrame(_loadingLoop);
}

// 点击进入游戏
function _onLoadingClick(e) {
    if (_loadingState.entered) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_W / rect.width;
    const scaleY = LOGICAL_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // 检查跳过按钮
    if (_loadingState.skipRect) {
        const sr = _loadingState.skipRect;
        if (mx >= sr.x && mx <= sr.x + sr.w && my >= sr.y && my <= sr.y + sr.h) {
            _enterGame();
            return;
        }
    }

    // 点击进入按钮（加载完成后任意位置点击）
    if (!_loadingState.showEnter) return;
    _enterGame();
}

function _onLoadingTouch(e) {
    e.preventDefault();
    if (_loadingState.entered) return;

    // 检查跳过按钮
    if (_loadingState.skipRect) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const scaleX = LOGICAL_W / rect.width;
        const scaleY = LOGICAL_H / rect.height;
        const mx = (touch.clientX - rect.left) * scaleX;
        const my = (touch.clientY - rect.top) * scaleY;
        const sr = _loadingState.skipRect;
        if (mx >= sr.x && mx <= sr.x + sr.w && my >= sr.y && my <= sr.y + sr.h) {
            _enterGame();
            return;
        }
    }

    if (!_loadingState.showEnter) return;
    _enterGame();
}

function _enterGame() {
    if (_loadingState.entered) return;
    _loadingState.entered = true;
    canvas.removeEventListener('click', _onLoadingClick);
    canvas.removeEventListener('touchstart', _onLoadingTouch);
    Save.load();
    gameLoop();
}

// 等待所有图片和字体加载完毕，显示加载完成，等待点击
function startGame() {
    // 开始加载动画
    _loadingState.loadPhase = 'images';
    _loadingLoop();

    // 注册点击事件
    canvas.addEventListener('click', _onLoadingClick);
    canvas.addEventListener('touchstart', _onLoadingTouch, { passive: false });

    // 等待图片加载
    Promise.all(_pendingImages).then(() => {
        _loadingState.imagesReady = true;
        _loadingState.loadPhase = 'ready';

        // 等字体也准备好
        const checkReady = () => {
            if (_loadingState.fontsReady) {
                _loadingState.allReady = true;
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    });
}

// 字体加载
if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
        _loadingState.fontsReady = true;
        startGame();
    });
} else {
    _loadingState.fontsReady = true;
    startGame();
}
