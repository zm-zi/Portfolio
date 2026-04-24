// 全局状态
const G = {
    // ── Game Meta ──
    game: {
        score: 0,
        life: 5,
        isPaused: false,
        isGameOver: false,
        isStarted: false,
        buffChooseMode: false,
        buffChoices: [],
        lastBuffScore: 0,
        buffIsFreePick: false,
        difficultyLevel: 0,
        bgmVolume: 0.4,
        sfxVolume: 0.5,
        settingsOpen: false,
        _settingsDrag: null,
        targetFPS: 0,
        dt: 1
    },
    debuggerOpen: false,
    // ── Player ──
    player: {
        x: LOGICAL_W / 2 - PLAYER_WIDTH / 2,
        y: LOGICAL_H - 120,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        speed: PLAYER_SPEED,
        isInvincible: false,
        invincibleTime: 0,
        hitEffect: 0,
        currentFireRate: FIRE_RATE,
        lastFireTime: 0,
        wingmanLastFireTime: 0,
        buffList: [],
        bulletDamage: 1,
        doubleShot: false,
        wingmanLevel: 0,
        wingmanDamageMultiplier: 1,
        wingmanFireRateMultiplier: 1,
        energy: 0,
        isOverclock: false,
        overclockEndTime: 0,
        playerLevel: 0,
        levelUpScore: getLevelThreshold(0),
        homingMissileLevel: 0,
        homingMissileCount: 1,
        lastHomingMissileTime: 0,
        trailPoints: []      // 线性拖尾历史坐标
    },
    // ── Entity Arrays ──
    bullets: [],
    homingMissiles: [],
    enemies: [],
    enemyBullets: [],
    wingmanBullets: [],
    particles: [],
    flashes: [],
    gems: [],
    floatTexts: [],
    // ── Boss ──
    boss: null,
    bossWarning: false,
    bossWarningStart: 0,
    bossSpawned: false,
    bossDefeatTime: 0,
    bossIndex: 0,           // 当前应出场的 Boss 在 BOSS 注册表中的索引
    bossRound: 0,           // 当前循环轮次（0=首次，1=第2轮增强...）
    bossNextScore: 0, // 下一个 Boss 的触发分数（在 main.js 中由 BOSS 注册表初始化）
    // ── Screen Effects ──
    screenShake: 0,
    screenFlash: 0,
    // ── Ice Shield (冰邪王) ──
    iceShields: [],
    // ── Ice Vortex (冰邪王) ──
    iceVortexes: [],
    // ── 闪电连锁视觉效果 ──
    lightningChains: []
};

function _clearArrays(...arrays) {
    for (const arr of arrays) arr.length = 0;
}

function resetState() {
    const p = G.player;
    p.x = LOGICAL_W / 2 - PLAYER_WIDTH / 2;
    p.y = LOGICAL_H - 120;
    p.speed = PLAYER_SPEED;
    p.isInvincible = false;
    p.invincibleTime = 0;
    p.hitEffect = 0;
    p.currentFireRate = FIRE_RATE;
    p.lastFireTime = 0;
    p.wingmanLastFireTime = 0;
    p.buffList = [];
    p.bulletDamage = 1;
    p.doubleShot = false;
    p.wingmanLevel = 0;
    p.wingmanDamageMultiplier = 1;
    p.wingmanFireRateMultiplier = 1;
    p.energy = 0;
    p.isOverclock = false;
    p.overclockEndTime = 0;
    p.playerLevel = 0;
    p.levelUpScore = getLevelThreshold(0);
    p.homingMissileLevel = 0;
    p.homingMissileCount = 1;
    p.lastHomingMissileTime = 0;
    p.trailPoints = [];

    // 由各词条 onInit 注册的属性在这里重置为默认值
    if (typeof BUFF !== 'undefined') {
        BUFF.all().forEach(def => {
            if (def.onInit) def.onInit(G);
        });
    }

    const gm = G.game;
    gm.score = 0;
    gm.life = 5;
    gm.isPaused = false;
    gm.isGameOver = false;
    gm.isStarted = false;
    gm.buffChooseMode = false;
    gm.buffChoices = [];
    gm.lastBuffScore = 0;
    gm.buffIsFreePick = false;
    gm.difficultyLevel = 0;

    _clearArrays(
        G.bullets, G.homingMissiles, G.enemies, G.enemyBullets,
        G.wingmanBullets, G.particles, G.flashes, G.gems, G.floatTexts,
        G.iceShields, G.iceVortexes,
        G.lightningChains
    );
    if (typeof _bgPlanes !== 'undefined') _bgPlanes.length = 0;

    G.screenShake = 0;
    G.screenFlash = 0;

    // 重置敌人刷新计时器
    if (typeof ENEMY !== 'undefined') {
        ENEMY.all().forEach(def => { def.lastSpawnTime = 0; });
    }

    G.boss = null;
    G.bossWarning = false;
    G.bossWarningStart = 0;
    G.bossSpawned = false;
    G.bossDefeatTime = 0;
    G.bossIndex = 0;
    G.bossRound = 0;
    G.bossNextScore = 0;
}
