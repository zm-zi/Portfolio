// 游戏主循环
function initGameLoop() {
}

let _lastFrameTime = 0;
const BASE_INTERVAL = 1000 / BASE_FPS; // 5ms

function gameLoop(timestamp) {
    // 帧率节流
    const fps = G.game.targetFPS;
    if (fps > 0) {
        const interval = 1000 / fps;
        if (timestamp - _lastFrameTime < interval) {
            requestAnimationFrame(gameLoop);
            return;
        }
    }

    // 计算 dt：实际帧间隔与基准帧间隔的比值
    // 200fps 时 dt=1，60fps 时 dt≈3.33，120fps 时 dt≈1.67
    const rawDt = (timestamp - _lastFrameTime) || BASE_INTERVAL;
    const dt = Math.min(rawDt / BASE_INTERVAL, 4); // 防止卡顿导致 dt 过大
    G.game.dt = dt;

    _lastFrameTime = timestamp;

    const gm = G.game;

    // 未开始：显示开始界面
    if (!gm.isStarted) {
        drawStartScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!gm.isPaused && !gm.isGameOver && !gm.buffChooseMode) {
        // 每帧校正按键状态（防止 keyup 事件丢失导致的卡键）
        if (typeof _syncKeys === 'function') _syncKeys();
        updatePlayer();
        updateBullets();
        updateStars();
        updateMeteorites();
        // 动态难度
        G.game.difficultyLevel = Math.floor(G.game.score / DIFFICULTY_SCORE_INTERVAL);
        // 检查是否触发Boss警戒
        checkBossWarning();
        spawnEnemies();
        updateEnemies();
        updateBoss();
        // 冰霜漩涡独立更新（Boss 死亡后残余漩涡仍需生效）
        if (G.iceVortexes.length > 0 && !(G.boss && G.boss.skillState === 'ice_vortex_active')) {
            G.player._vortexSlowdown = false;
            _updateIceVortexesGlobal(G, Date.now());
        }
        updateParticles();
        updateInvincible();
        checkCollisions();
        fireBullets();
        updateHomingMissiles();
        updateGems();
        checkBuffTrigger();

        if (gm.life < 1) {
            gm.isGameOver = true;
            stopBGM();
            createExplosion(
                G.player.x + G.player.width / 2,
                G.player.y + G.player.height / 2,
                '#44aaff'
            );
        }
    }

    Game.ctx.fillStyle = '#000000';
    Game.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 屏幕震动
    Game.ctx.save();
    if (G.screenShake > 0.5) {
        const dx = (Math.random() * 2 - 1) * G.screenShake * 1.5;
        const dy = (Math.random() * 2 - 1) * G.screenShake * 1.5;
        Game.ctx.translate(dx, dy);
    }

    // 受伤屏幕抖动
    if (G.player.hitEffect > 8) {
        const hx = (Math.random() * 2 - 1) * 3;
        const hy = (Math.random() * 2 - 1) * 3;
        Game.ctx.translate(hx, hy);
    }

    drawStars(Game.ctx);
    drawMeteorites(Game.ctx);
    drawGems(Game.ctx);
    drawEnemies();
    drawBoss();
    drawIceShields();
    drawIceVortexes();
    drawBullets();
    drawEnemyBullets();
    drawWingmanBullets();
    drawHomingMissiles();
    drawParticles(Game.ctx);
    drawLightningChains(Game.ctx);
    drawWingman();
    drawPlayer();
    drawPauseBtn();

    // 屏幕闪白（最上层）
    if (G.screenFlash > 0.01) {
        Game.ctx.fillStyle = `rgba(255, 255, 255, ${G.screenFlash})`;
        Game.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    // 超频琥珀色光晕
    if (G.player.isOverclock) {
        Game.ctx.fillStyle = 'rgba(255, 179, 0, 0.05)';
        Game.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    Game.ctx.restore();

    // 屏幕震动衰减
    if (G.screenShake > 0) {
        G.screenShake *= 0.9;
        if (G.screenShake < 0.1) G.screenShake = 0;
    }
    // 屏幕闪白衰减
    if (G.screenFlash > 0) {
        G.screenFlash *= 0.85;
        if (G.screenFlash < 0.01) G.screenFlash = 0;
    }

    if (gm.isPaused) drawPauseOverlay();
    if (gm.settingsOpen) drawSettingsPanel();
    if (!gm.isPaused && !gm.isGameOver) drawHitEffect();
    // 警戒效果（词条选择时不显示，避免遮挡词条 UI）
    if (G.bossWarning && !gm.buffChooseMode) {
        drawBossWarning();
    }

    if (gm.buffChooseMode) drawBuffChoose(Game.ctx);

    if (gm.isGameOver) {
        drawGameOver();
    }

    // CRT噪声叠加
    if (gm.isStarted && !gm.isPaused && !gm.isGameOver) {
        drawNoiseOverlay(Game.ctx, 10);
    }

    // 更新 HTML UI
    updateHUD();

    requestAnimationFrame(gameLoop);
}

// ─── CRT噪声叠加 ───
function drawNoiseOverlay(ctx, intensity) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < intensity; i++) {
        const nx = Math.random() * LOGICAL_W;
        const ny = Math.random() * LOGICAL_H;
        ctx.fillRect(nx, ny, 2, 2);
    }
}

// Boss警戒检测
function checkBossWarning() {
    if (G.bossSpawned) return;
    // 惰性初始化 bossNextScore
    if (G.bossNextScore === 0) {
        const def = BOSS.getByIndex(G.bossIndex);
        if (def) G.bossNextScore = def.spawnScore;
    }
    const now = Date.now();
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

// 警戒效果绘制（增强版：故障抖动+扫描线+四边红框）
function drawBossWarning() {
    const now = Date.now();
    const elapsed = now - G.bossWarningStart;
    const blink = Math.sin(elapsed / 100 * Math.PI) > 0;
    if (blink) {
        Game.ctx.fillStyle = 'rgba(255, 46, 46, 0.2)';
        Game.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

        // 扫描线效果
        Game.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let sy = 0; sy < LOGICAL_H; sy += 4) {
            Game.ctx.fillRect(0, sy, LOGICAL_W, 1);
        }

        // 四边红色边框闪烁
        Game.ctx.fillStyle = 'rgba(255, 46, 46, 0.35)';
        Game.ctx.fillRect(0, 0, LOGICAL_W, 4);
        Game.ctx.fillRect(0, LOGICAL_H - 4, LOGICAL_W, 4);
        Game.ctx.fillRect(0, 0, 4, LOGICAL_H);
        Game.ctx.fillRect(LOGICAL_W - 4, 0, 4, LOGICAL_H);
    }

    const cx = LOGICAL_W / 2;
    const cy = LOGICAL_H / 2;

    // WARNING 故障抖动
    const shakeX = (Math.random() - 0.5) * 4;
    const shakeY = (Math.random() - 0.5) * 2;

    Game.ctx.textAlign = 'center';
    drawNeonText(Game.ctx, 'WARNING', cx + shakeX, cy - 15 + shakeY, '28px ' + FONT_PIXEL, '#ff2e2e', 25);

    Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    Game.ctx.font = '14px ' + FONT_PIXEL;
    Game.ctx.fillText('BOSS INCOMING', cx, cy + 22);
}
