// 四级敌人：扇形弹射击
ENEMY.register({
    type: 'spinner',
    score: ENEMY4_SCORE,
    color: '#ff4444',
    imgSrc: 'image/四级敌人.png',
    lastSpawnTime: 0,

    spawn(G, now, spawnMult, hpMult) {
        if (G.game.gameMode !== 'level' && G.game.score < 500) return;
        if (now - this.lastSpawnTime < ENEMY4_SPAWN_RATE * spawnMult) return;
        G.enemies.push({
            x: Math.random() * (LOGICAL_W - ENEMY4_SIZE),
            y: -ENEMY4_SIZE,
            width: ENEMY4_SIZE,
            height: ENEMY4_SIZE,
            hp: Math.round(ENEMY4_HP * hpMult),
            type: 'spinner',
            lastFireTime: now + Math.random() * ENEMY4_FIRE_RATE,
            spiralAngle: 0,
            hoverY: ENEMY4_HOVER_Y,
            wave2Fired: false,
            wave3Fired: false,
            wave2Time: 0
        });
        this.lastSpawnTime = now;
    },

    update(e, G, now) {
        if (e.y < e.hoverY) e.y += ENEMY4_SPEED * G.game.dt;
        // 第一波：3发，180度均分（-90°, 0°, 90°）
        if (!e.wave2Fired && now - e.lastFireTime >= ENEMY4_FIRE_RATE) {
            const centerX = e.x + e.width / 2;
            const centerY = e.y + e.height;
            const angles = [-90, 0, 90];
            for (const angle of angles) {
                const rad = angle * Math.PI / 180;
                G.enemyBullets.push({
                    x: centerX - 4,
                    y: centerY,
                    width: 8, height: 12,
                    vx: Math.sin(rad) * ENEMY4_BULLET_SPEED,
                    vy: Math.cos(rad) * ENEMY4_BULLET_SPEED,
                    color: '#cc44ff'
                });
            }
            e.wave2Fired = true;
            e.wave2Time = now;
        }
        // 第二波：延迟200ms后发射，3发（-45°, 0°, 45°）
        if (e.wave2Fired && !e.wave3Fired && now - e.wave2Time >= 200) {
            const centerX = e.x + e.width / 2;
            const centerY = e.y + e.height;
            const angles = [-45, 0, 45];
            for (const angle of angles) {
                const rad = angle * Math.PI / 180;
                G.enemyBullets.push({
                    x: centerX - 4,
                    y: centerY,
                    width: 8, height: 12,
                    vx: Math.sin(rad) * ENEMY4_BULLET_SPEED,
                    vy: Math.cos(rad) * ENEMY4_BULLET_SPEED,
                    color: '#cc44ff'
                });
            }
            e.wave3Fired = true;
        }
        // 重置攻击状态
        if (now - e.lastFireTime >= ENEMY4_FIRE_RATE + 400) {
            e.lastFireTime = now;
            e.wave2Fired = false;
            e.wave3Fired = false;
        }
    },

    draw(e, ctx) {
        drawWithOutline(ctx, this._img, e.x, e.y, e.width, e.height, 1, true, e.hitFlash);
    }
});
