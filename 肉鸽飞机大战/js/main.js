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

// ── 玩家/子弹/宝石/导弹/冰霜 等非注册表图片 ──
const planeImg = new Image();
planeImg.src = 'image/飞机素材.png';

const bulletImg = new Image();
bulletImg.src = 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="6" height="16" viewBox="0 0 6 16">
        <ellipse cx="3" cy="8" rx="3" ry="8" fill="#ff4444"/>
        <ellipse cx="3" cy="6" rx="1.5" ry="4" fill="#ffff88"/>
    </svg>
`);

const gem5Img = new Image();
gem5Img.src = 'image/宝石5分.png';
const gem10Img = new Image();
gem10Img.src = 'image/宝石10分.png';
const gem20Img = new Image();
gem20Img.src = 'image/宝石20分·.png';

const iceConeImg = new Image();
iceConeImg.src = 'image/冰锥子弹.png';

const iceWallImg = new Image();
iceWallImg.src = 'image/冰墙素材.png';

const iceVortexImg = new Image();
iceVortexImg.src = 'image/冰霜漩涡.png';

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
initPlayer(planeImg);
initBullets(bulletImg, enemy2BulletImg);
initGems(gem5Img, gem10Img, gem20Img);

// ── 从注册表批量加载敌人/Boss 图片 ──
ENEMY.all().forEach(def => {
    if (def.imgSrc) {
        const img = new Image();
        img.src = def.imgSrc;
        ENEMY.bindImg(def.type, img);
    }
});

BOSS._order.forEach(id => {
    const def = BOSS.get(id);
    if (!def) return;
    if (def.imgSrc) {
        const img = new Image();
        img.src = def.imgSrc;
        BOSS.bindImg(id, img);
    }
    if (def.actionImgSrc) {
        const img = new Image();
        img.src = def.actionImgSrc;
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
const meteorite1Img = new Image(); meteorite1Img.src = 'image/陨石素材1.png';
const meteorite2Img = new Image(); meteorite2Img.src = 'image/陨石素材2.png';
const meteorite3Img = new Image(); meteorite3Img.src = 'image/陨石素材3.png';
const meteorite4Img = new Image(); meteorite4Img.src = 'image/陨石素材4.png';
const meteorite5Img = new Image(); meteorite5Img.src = 'image/陨石素材5.png';
const wreck1Img = new Image(); wreck1Img.src = 'image/破损战舰1.png';
const wreck2Img = new Image(); wreck2Img.src = 'image/破损战舰2.png';
const wreck3Img = new Image(); wreck3Img.src = 'image/破损战舰3.png';
const wreck4Img = new Image(); wreck4Img.src = 'image/破损战舰4.png';
initMeteorites(meteorite1Img, meteorite2Img, meteorite3Img, meteorite4Img, meteorite5Img, wreck1Img, wreck2Img, wreck3Img, wreck4Img);
initGameLoop();
initInput(canvas);

// 等待字体加载完毕再启动游戏循环
function startGame() {
    if (planeImg.complete) {
        gameLoop();
    } else {
        planeImg.onload = () => gameLoop();
    }
}

if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startGame);
} else {
    // 降级：直接启动
    startGame();
}
