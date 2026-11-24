const ENEMY = {
    _pool: {},

    register(def) {
        this._pool[def.type] = def;
    },

    get(type) { return this._pool[type] || null; },

    all() { return Object.values(this._pool); },

    // 统一刷新：遍历所有注册敌人，调用各自的 spawn
    spawnAll(G, now) {
        const diffLevel = G.game.difficultyLevel;
        const elite = G.game.eliteUntil && now < G.game.eliteUntil;
        const spawnMult = Math.max(DIFF_SPAWN_RATE_MIN, Math.pow(DIFF_SPAWN_RATE_FACTOR, diffLevel)) * (elite ? 0.7 : 1);
        const hpMult = (1 + Math.min(DIFF_HP_BONUS_MAX, diffLevel * DIFF_HP_BONUS_PER_LEVEL)) * (elite ? 1.5 : 1);
        for (const def of this.all()) {
            if (def.spawn) def.spawn(G, now, spawnMult, hpMult);
        }
    },

    // 统一更新
    updateAll(G, now) {
        for (let i = G.enemies.length - 1; i >= 0; i--) {
            const e = G.enemies[i];
            const def = this._pool[e.type];
            if (def && def.update && !(e.frozenUntil > now)) def.update(e, G, now);
            if (e.hitFlash > 0) e.hitFlash--;
            if (e.y > LOGICAL_H + e.height || e.y < -e.height * 2 || e.x < -e.width || e.x > LOGICAL_W + e.width) G.enemies.splice(i, 1);
        }
    }
};

// 敌人刷新入口
function spawnEnemies() {
    if (G.bossSpawned) return;
    if (G.bossWarning) return;
    if (G.bossDefeatTime > 0 && gameNow() - G.bossDefeatTime < 3000) return;

    const now = gameNow();

    if (G.game.gameMode === 'level') {
        // 关卡模式：使用关卡配置的倍率，只刷新允许的敌人类型
        const spawnMult = getLevelSpawnMult();
        const hpMult = getLevelHpMult();
        for (const def of ENEMY.all()) {
            if (def.type === 'minion') {
                // minion 由 Boss 召唤，不受关卡限制
                if (def.spawn) def.spawn(G, now, spawnMult, hpMult);
            } else if (isEnemyAllowedInLevel(def.type)) {
                if (def.spawn) def.spawn(G, now, spawnMult, hpMult);
            }
        }
    } else {
        // 无尽模式：原有逻辑
        ENEMY.spawnAll(G, now);
    }
}

// 敌人更新入口
function updateEnemies() {
    ENEMY.updateAll(G, gameNow());
}

// Boss 生成
function spawnBoss() {
    const def = BOSS.getByIndex(G.bossIndex);
    if (!def) return;
    let hpScale = 1 + G.bossRound * BOSS_HP_SCALE_PER_ROUND;
    // 关卡模式额外 HP 倍率
    if (G.game.gameMode === 'level') {
        hpScale *= getLevelHpMult();
    }
    const bossX = (LOGICAL_W - def.width) / 2;
    G.boss = {
        x: bossX,
        y: -def.height,
        width: def.width,
        height: def.height,
        hp: Math.round(def.hp * hpScale),
        maxHp: Math.round(def.hp * hpScale),
        targetY: 30,
        def: def,
        // 技能状态
        skillState: 'idle',
        skillStartTime: 0,
        lastSkillTime: 0,
        sweepDir: 1,
        isInvincible: false,
        shieldAlpha: 0,
        summoned: false
    };
    G.bossWarning = false;
    G.bossSpawned = true;
}

// Boss 击败后推进到下一个
function _advanceBoss() {
    if (G.game.gameMode === 'level') {
        // 关卡模式：多Boss关推进，单Boss关不做任何事
        const level = getCurrentLevel();
        if (level && Array.isArray(level.bossId)) {
            G.levelBossIndex = (G.levelBossIndex || 0) + 1;
            G.levelLastBossDefeatScore = G.game.score;

            // 还有后续 Boss
            if (G.levelBossIndex < level.bossId.length) {
                G.bossIndex = getLevelBossRegistryIndex();
                G.bossNextScore = getLevelBossTriggerScore();
            }
        }
        // 单Boss关：不需要推进，checkLevelComplete 会处理通关
    } else {
        // 无尽模式：原有逻辑
        G.bossIndex++;
        if (G.bossIndex >= BOSS.count()) {
            G.bossIndex = 0;
            G.bossRound++;
        }
        G.bossDefeatCount++;
        const interval = BOSS_RESUME_INTERVALS[G.bossDefeatCount - 1] || BOSS_RESUME_INTERVAL_MAX;
        G.bossNextScore = G.game.score + interval;
    }
}

// Boss 更新入口
function updateBoss() {
    if (!G.boss) return;
    const now = gameNow();
    const b = G.boss;

    // Boss入场：从上方滑入
    if (b.y < b.targetY) {
        b.y += 2 * G.game.dt;
        return;
    }

    // 检查无敌时间
    const def = b.def;
    if (b.isInvincible && now - b.skillStartTime > def.shieldDuration) {
        b.isInvincible = false;
        b.skillState = 'idle';
    }

    // 委托给 Boss 定义的 update
    if (def.update) def.update(b, G, now);
}
