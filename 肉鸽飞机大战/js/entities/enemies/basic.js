// 一级敌人：直线下落
ENEMY.register({
    type: 'basic',
    score: ENEMY1_SCORE,
    color: '#ff4444',
    imgSrc: 'image/一级敌人.png',
    lastSpawnTime: 0,

    spawn(G, now, spawnMult, hpMult) {
        if (now - this.lastSpawnTime < ENEMY1_SPAWN_RATE * spawnMult) return;
        G.enemies.push({
            x: Math.random() * (LOGICAL_W - ENEMY1_SIZE),
            y: -ENEMY1_SIZE,
            width: ENEMY1_SIZE,
            height: ENEMY1_SIZE,
            hp: Math.round(ENEMY1_HP * hpMult),
            type: 'basic'
        });
        this.lastSpawnTime = now;
    },

    update(e) {
        e.y += ENEMY1_SPEED * G.game.dt;
    },

    draw(e, ctx) {
        drawWithOutline(ctx, this._img, e.x, e.y, e.width, e.height, 1, true, e.hitFlash);
    }
});
