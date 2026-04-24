// ─── 关卡数据配置（7关）───
const LEVEL_DATA = [
    {
        id: 1,
        name: '新兵试炼',
        subtitle: '前50分一级  后50分二级',
        bossId: null,
        targetScore: 100,
        spawnMult: 1.0,
        hpMult: 1.0,
        maxLife: 5,
        // 分阶段刷怪：50分前只刷T1，50分后只刷T2
        getAllowedTypes(G) {
            return G.game.score < 50 ? ['basic'] : ['shooter'];
        }
    },
    {
        id: 2,
        name: '火力初开',
        subtitle: '一二三级混合  200分通关',
        bossId: null,
        targetScore: 200,
        spawnMult: 0.9,
        hpMult: 1.0,
        maxLife: 5,
        getAllowedTypes() {
            return ['basic', 'shooter', 'rusher'];
        }
    },
    {
        id: 3,
        name: '独眼王',
        subtitle: '击败独眼王',
        bossId: 'one_eye_king',
        targetScore: null,
        bossTriggerScore: 0,   // 开局直接触发Boss
        spawnMult: 1.0,
        hpMult: 1.0,
        maxLife: 5,
        getAllowedTypes() {
            return [];  // Boss关不刷小怪
        }
    },
    {
        id: 4,
        name: '全面围攻',
        subtitle: '全部敌人  300分通关',
        bossId: null,
        targetScore: 300,
        spawnMult: 0.8,
        hpMult: 1.3,
        maxLife: 5,
        getAllowedTypes() {
            return ['basic', 'shooter', 'rusher', 'spinner'];
        }
    },
    {
        id: 5,
        name: '夜煞降临',
        subtitle: '击败夜煞',
        bossId: 'night_fury',
        targetScore: null,
        bossTriggerScore: 0,
        spawnMult: 1.0,
        hpMult: 1.0,
        maxLife: 5,
        getAllowedTypes() {
            return [];
        }
    },
    {
        id: 6,
        name: '冰封王座',
        subtitle: '击败冰邪王',
        bossId: 'ice_evil_king',
        targetScore: null,
        bossTriggerScore: 0,
        spawnMult: 1.0,
        hpMult: 1.0,
        maxLife: 5,
        getAllowedTypes() {
            return [];
        }
    },
    {
        id: 7,
        name: '终极决战',
        subtitle: '击败所有Boss',
        bossId: ['one_eye_king', 'night_fury', 'ice_evil_king'],
        targetScore: null,
        bossTriggerScore: 0,
        spawnMult: 0.7,
        hpMult: 1.5,
        maxLife: 5,
        getAllowedTypes() {
            return ['basic', 'shooter', 'rusher', 'spinner'];
        }
    }
];

// ─── 关卡模式逻辑 ───

function getCurrentLevel() {
    if (G.game.gameMode !== 'level') return null;
    return LEVEL_DATA[G.game.currentLevel] || null;
}

// 获取当前关卡允许的敌人类型（支持动态切换如第1关）
function getAllowedEnemyTypes() {
    const level = getCurrentLevel();
    if (!level) return null; // null = 无尽模式不限制
    if (level.getAllowedTypes) return level.getAllowedTypes(G);
    return level.allowedTypes || [];
}

// 检查敌人类型是否在当前关卡允许列表中
function isEnemyAllowedInLevel(type) {
    const allowed = getAllowedEnemyTypes();
    if (allowed === null) return true;
    return allowed.includes(type);
}

function getLevelSpawnMult() {
    const level = getCurrentLevel();
    return level ? level.spawnMult : 1.0;
}

function getLevelHpMult() {
    const level = getCurrentLevel();
    return level ? level.hpMult : 1.0;
}

// ─── 关卡模式 Boss 逻辑 ───

function getLevelBossTriggerScore() {
    const level = getCurrentLevel();
    if (!level) return Infinity;

    if (Array.isArray(level.bossId)) {
        const idx = G.levelBossIndex || 0;
        if (idx === 0) return level.bossTriggerScore;
        return (G.levelLastBossDefeatScore || 0) + 200;
    }
    return level.bossTriggerScore;
}

function getCurrentLevelBossId() {
    const level = getCurrentLevel();
    if (!level || !level.bossId) return null;

    if (Array.isArray(level.bossId)) {
        const idx = G.levelBossIndex || 0;
        return level.bossId[idx] || null;
    }
    return level.bossId;
}

function getLevelBossRegistryIndex() {
    const bossId = getCurrentLevelBossId();
    if (!bossId) return -1;
    for (let i = 0; i < BOSS._order.length; i++) {
        if (BOSS._order[i] === bossId) return i;
    }
    return -1;
}

// ─── 关卡通关检测 ───

function checkLevelComplete() {
    if (G.game.gameMode !== 'level') return;
    if (G.game.levelCompleted) return;

    const level = getCurrentLevel();
    if (!level) return;

    // 分数达标
    if (level.targetScore && G.game.score >= level.targetScore) {
        triggerLevelComplete();
        return;
    }

    // Boss击败
    if (level.bossId) {
        if (Array.isArray(level.bossId)) {
            const allDefeated = (G.levelBossIndex || 0) >= level.bossId.length;
            if (allDefeated) triggerLevelComplete();
        } else {
            if (G.bossDefeatTime > 0 && !G.bossSpawned) triggerLevelComplete();
        }
    }
}

function triggerLevelComplete() {
    G.game.levelCompleted = true;
    // 更新进度：标记当前关卡为已完成
    if (G.game.currentLevel > _levelProgress) {
        _levelProgress = G.game.currentLevel;
    }
    // 更新关卡最高分
    if (!G.game.levelHighScores) G.game.levelHighScores = [0,0,0,0,0,0,0];
    if (G.game.score > (G.game.levelHighScores[G.game.currentLevel] || 0)) {
        G.game.levelHighScores[G.game.currentLevel] = G.game.score;
    }
    stopBGM();
    G.screenFlash = 0.6;
    Save.save();
}

function proceedToNextLevel() {
    const nextLevel = G.game.currentLevel + 1;
    if (nextLevel >= LEVEL_DATA.length) {
        // 全部通关，回到主菜单
        G.game.gameMode = 'endless';
        G.game.currentLevel = 0;
        G.game.levelCompleted = false;
        startScreenMode = 'main';
        _levelProgress = -1;
        Save.clearProgress();
        resetState();
        return;
    }

    const savedLevel = nextLevel;
    resetState();
    G.game.gameMode = 'level';
    G.game.currentLevel = savedLevel;
    G.game.levelCompleted = false;

    beginLevel(savedLevel);
}

function initLevelState() {
    const level = getCurrentLevel();
    if (!level) return;

    G.game.life = level.maxLife;
    G.levelBossIndex = 0;
    G.levelLastBossDefeatScore = 0;
    G.game.levelCompleted = false;

    if (level.bossId) {
        G.bossIndex = getLevelBossRegistryIndex();
        G.bossNextScore = getLevelBossTriggerScore();
    }
}
