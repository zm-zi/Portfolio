const BASE_INTERVAL = 1000 / BASE_FPS;
const SIMULATION_STEP = 1000 / 60;
const MAX_FRAME_TIME = 250;
let _lastFrameTime = null;
let _simulationAccumulator = 0;
let _gameTime = Date.now();
let lastPaintedTime = null;

function gameNow() { return _gameTime; }

document.addEventListener('visibilitychange', () => {
    _lastFrameTime = null;
    _simulationAccumulator = 0;
});

function advanceFlight() {
    const gm = G.game;
    _gameTime += SIMULATION_STEP;
    gm.dt = SIMULATION_STEP / BASE_INTERVAL;
    advanceTerrain();
    updatePlayer();
    if (gm.gameMode === 'explore') {
        updateParticles();
        updateInvincible();
        return;
    }
    updateBullets();
    gm.difficultyLevel = Math.floor(gm.score / DIFFICULTY_SCORE_INTERVAL);
    checkBossWarning();
    spawnEnemies();
    updateEnemies();
    updateBoss();
    if (G.iceVortexes.length && G.boss?.skillState !== 'ice_vortex_active') {
        G.player._vortexSlowdown = false;
        _updateIceVortexesGlobal(G, gameNow());
    }
    updateParticles();
    updateInvincible();
    checkCollisions();
    fireBullets();
    updateHomingMissiles();
    updateGems();
    checkBuffTrigger();
    updateRoute();
    if (gm.gameMode === 'level') checkLevelComplete();
    if (gm.life < 1) {
        gm.isGameOver = true;
        gm.highScore = Math.max(gm.highScore, gm.score);
        Save.save();
        stopBGM();
        createExplosion(G.player.x + G.player.width / 2, G.player.y + G.player.height / 2);
    }
    for (let i = G.lightningChains.length - 1; i >= 0; i--) {
        if (--G.lightningChains[i].life <= 0) G.lightningChains.splice(i, 1);
    }
    for (const wall of G.iceShields) wall.shakeTimer = Math.max(0,(wall.shakeTimer || 0) - gm.dt);
    G.screenShake = G.screenShake < .1 ? 0 : G.screenShake * .87;
    G.screenFlash = G.screenFlash < .01 ? 0 : G.screenFlash * .8;
}

function gameLoop(timestamp) {
    if (!Number.isFinite(timestamp)) timestamp = performance.now();
    requestAnimationFrame(gameLoop);
    const interval = G.game.targetFPS ? 1000 / G.game.targetFPS : 0;
    if (_lastFrameTime !== null && timestamp - _lastFrameTime + .5 < interval) return;
    const elapsed = _lastFrameTime === null ? 0 : Math.max(0, Math.min(timestamp - _lastFrameTime, MAX_FRAME_TIME));
    _lastFrameTime = timestamp;
    if (isFlying() && !document.hidden) {
        _simulationAccumulator += elapsed;
        while (_simulationAccumulator >= SIMULATION_STEP && isFlying()) {
            _simulationAccumulator -= SIMULATION_STEP;
            advanceFlight();
        }
    } else {
        _simulationAccumulator = 0;
    }
    if (!G.game.isStarted) {
        lastPaintedTime = null;
        drawHangarSky(timestamp);
    } else if (lastPaintedTime !== _gameTime) {
        renderFlight(Game.ctx);
        lastPaintedTime = _gameTime;
    }
    syncUI();
}

function checkBossWarning() {
    if (G.bossSpawned) return;

    if (G.game.gameMode === 'level') {
        // 关卡模式：使用关卡配置的触发逻辑
        const level = getCurrentLevel();
        if (!level || !level.bossId) return;

        const triggerScore = getLevelBossTriggerScore();
        if (triggerScore === Infinity || triggerScore === null) return;

        // 对于多Boss关，检查是否所有Boss都已击败
        if (Array.isArray(level.bossId)) {
            if ((G.levelBossIndex || 0) >= level.bossId.length) return;
        }

        const now = gameNow();
        if (!G.bossWarning) {
            if (G.game.score >= triggerScore) {
                G.bossWarning = true;
                G.bossWarningStart = now;
                // 设置对应的 Boss 注册表索引
                G.bossIndex = getLevelBossRegistryIndex();
            }
        } else {
            if (now - G.bossWarningStart >= BOSS_WARNING_TIME) {
                spawnBoss();
            }
        }
    } else {
        // 无尽模式：原有逻辑
        if (G.bossNextScore === 0) {
            const def = BOSS.getByIndex(G.bossIndex);
            if (def) G.bossNextScore = def.spawnScore;
        }
        const now = gameNow();
        if (!G.bossWarning) {
            if (G.game.score >= G.bossNextScore) {
                G.bossWarning = true;
                G.bossWarningStart = now;
            }
        } else {
            if (now - G.bossWarningStart >= BOSS_WARNING_TIME) {
                spawnBoss();
            }
        }
    }
}
