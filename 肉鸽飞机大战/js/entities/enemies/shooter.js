// 二级敌人：悬停射击
ENEMY.register({
    type: 'shooter',
    score: ENEMY2_SCORE,
    color: '#44ff44',
    imgSrc: 'image/二级敌人.png',
    lastSpawnTime: 0,

    spawn(G, now, spawnMult, hpMult) {
        if (G.game.gameMode !== 'level' && G.game.score < 50) return;
        if (now - this.lastSpawnTime < ENEMY2_SPAWN_RATE * spawnMult) return;
        G.enemies.push({
            x: Math.random() * (LOGICAL_W - ENEMY2_SIZE),
            y: -ENEMY2_SIZE,
            width: ENEMY2_SIZE,
            height: ENEMY2_SIZE,
            hp: Math.round(ENEMY2_HP * hpMult),
            type: 'shooter',
            lastFireTime: now + Math.random() * ENEMY2_FIRE_RATE,
            hoverY: 100 + (Math.random() - 0.5) * 40
        });
        this.lastSpawnTime = now;
    },

    update(e, G, now) {
        if (e.y < e.hoverY) e.y += ENEMY2_SPEED * G.game.dt;
        if (now - e.lastFireTime >= ENEMY2_FIRE_RATE) {
            G.enemyBullets.push({
                x: e.x + e.width / 2 - 4,
                y: e.y + e.height,
                width: 8, height: 12,
                color: '#44ff88'
            });
            e.lastFireTime = now;
        }
    },

    draw(e, ctx) {
        drawWithOutline(ctx, this._img, e.x, e.y, e.width, e.height, 1, true, e.hitFlash);
    }
});
