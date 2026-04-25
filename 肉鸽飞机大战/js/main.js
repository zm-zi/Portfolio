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

// ── 图片加载注册表：所有 Image 统一注册，startGame 等待全部完成 ──
const _pendingImages = [];
function _loadImg(src) {
    const img = new Image();
    _pendingImages.push(new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = () => { console.warn('图片加载失败:', src); resolve(); };
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

// 等待所有图片和字体加载完毕再启动游戏循环
function startGame() {
    Promise.all(_pendingImages).then(() => {
        Save.load();
        gameLoop();
    });
}

if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startGame);
} else {
    // 降级：直接启动
    startGame();
}
