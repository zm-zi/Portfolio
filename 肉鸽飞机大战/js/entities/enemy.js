// ─── 白色描边工具（方案A：多次绘制偏移法）───
const _outlineCache = new Map();

function _getWhiteSilhouette(img) {
    if (_outlineCache.has(img)) return _outlineCache.get(img);
    const off = document.createElement('canvas');
    off.width = img.naturalWidth || img.width;
    off.height = img.naturalHeight || img.height;
    const oc = off.getContext('2d');
    oc.drawImage(img, 0, 0);
    oc.globalCompositeOperation = 'source-in';
    oc.fillStyle = '#ffffff';
    oc.fillRect(0, 0, off.width, off.height);
    _outlineCache.set(img, off);
    return off;
}

// 用白色描边绘制图片（偏移4方向 + 中心原图）
// outlineWidth: 描边像素宽度
// breathe: 是否启用呼吸缩放效果
// hitFlash: 受击闪烁帧数，>0 时绘制白色闪光
function drawWithOutline(ctx, img, x, y, w, h, outlineWidth, breathe, hitFlash) {
    // 对齐到整像素，消除 60fps 下 dt>1 导致的子像素抖动
    x = Math.round(x);
    y = Math.round(y);
    const sil = _getWhiteSilhouette(img);
    const d = outlineWidth || 1;

    // 受击闪光：绘制白色半透明覆盖
    if (hitFlash > 0) {
        ctx.save();
        const alpha = Math.min(hitFlash / 6, 1);
        // 描边
        ctx.globalAlpha = alpha;
        ctx.drawImage(sil, x - d, y, w, h);
        ctx.drawImage(sil, x + d, y, w, h);
        ctx.drawImage(sil, x, y - d, w, h);
        ctx.drawImage(sil, x, y + d, w, h);
        // 白色覆盖
        ctx.drawImage(sil, x, y, w, h);
        ctx.restore();
        return;
    }

    if (breathe) {
        const now = Date.now();
        const scale = 1 + 0.06 * Math.sin(now * 0.004 + x * 0.1);
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        // 描边
        ctx.drawImage(sil, x - d, y, w, h);
        ctx.drawImage(sil, x + d, y, w, h);
        ctx.drawImage(sil, x, y - d, w, h);
        ctx.drawImage(sil, x, y + d, w, h);
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
        return;
    }

    // 仅4方向偏移（去掉对角），描边更细
    ctx.drawImage(sil, x - d, y, w, h);   // 左
    ctx.drawImage(sil, x + d, y, w, h);   // 右
    ctx.drawImage(sil, x, y - d, w, h);   // 上
    ctx.drawImage(sil, x, y + d, w, h);   // 下
    ctx.drawImage(img, x, y, w, h);       // 原图
}

// 敌人注册表 + Boss 生成/更新/绘制入口
const ENEMY = {
    _pool: {},

    register(def) {
        this._pool[def.type] = def;
    },

    // 绑定图片到指定类型
    bindImg(type, img) {
        const def = this._pool[type];
        if (def) def._img = img;
    },

    get(type) { return this._pool[type] || null; },

    all() { return Object.values(this._pool); },

    // 统一刷新：遍历所有注册敌人，调用各自的 spawn
    spawnAll(G, now) {
        const diffLevel = G.game.difficultyLevel;
        const spawnMult = Math.max(DIFF_SPAWN_RATE_MIN, Math.pow(DIFF_SPAWN_RATE_FACTOR, diffLevel));
        const hpMult = 1 + Math.min(DIFF_HP_BONUS_MAX, diffLevel * DIFF_HP_BONUS_PER_LEVEL);
        for (const def of this.all()) {
            if (def.spawn) def.spawn(G, now, spawnMult, hpMult);
        }
    },

    // 统一更新
    updateAll(G, now) {
        for (let i = G.enemies.length - 1; i >= 0; i--) {
            const e = G.enemies[i];
            const def = this._pool[e.type];
            if (def && def.update) def.update(e, G, now);
            if (e.hitFlash > 0) e.hitFlash--;
            if (e.y > LOGICAL_H + e.height || e.y < -e.height * 2 || e.x < -e.width || e.x > LOGICAL_W + e.width) G.enemies.splice(i, 1);
        }
    },

    // 统一绘制
    drawAll() {
        for (const e of G.enemies) {
            const def = this._pool[e.type];
            if (def && def.draw) def.draw(e, Game.ctx);
        }
    }
};

// 敌人刷新入口
function spawnEnemies() {
    if (G.bossSpawned) return;
    if (G.bossWarning) return;
    if (G.bossDefeatTime > 0 && Date.now() - G.bossDefeatTime < 3000) return;

    const now = Date.now();

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
    ENEMY.updateAll(G, Date.now());
}

// 敌人绘制入口
function drawEnemies() {
    ENEMY.drawAll();
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
    const now = Date.now();
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

// Boss 绘制入口
function drawBoss() {
    if (!G.boss) return;
    const b = G.boss;
    if (b.def && b.def.draw) b.def.draw(b, Game.ctx);
}
