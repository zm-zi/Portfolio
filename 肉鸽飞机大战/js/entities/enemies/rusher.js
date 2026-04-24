// 三级敌人：悬停后冲刺
ENEMY.register({
    type: 'rusher',
    score: ENEMY3_SCORE,
    color: '#44ff44',
    imgSrc: 'image/三级敌人.png',
    lastSpawnTime: 0,

    spawn(G, now, spawnMult, hpMult) {
        if (G.game.score < 300) return;
        if (now - this.lastSpawnTime < ENEMY3_SPAWN_RATE * spawnMult) return;
        G.enemies.push({
            x: Math.random() * (LOGICAL_W - ENEMY3_SIZE),
            y: -ENEMY3_SIZE,
            width: ENEMY3_SIZE,
            height: ENEMY3_SIZE,
            hp: Math.round(ENEMY3_HP * hpMult),
            type: 'rusher',
            lastFireTime: now + Math.random() * ENEMY3_FIRE_RATE,
            spawnTime: now,
            hasRushed: false,
            rushTargetX: null,
            rushTargetY: null,
            hoverY: 100 + (Math.random() - 0.5) * 40
        });
        this.lastSpawnTime = now;
    },

    update(e, G, now) {
        const dt = G.game.dt;
        if (!e.hasRushed) {
            if (e.y < e.hoverY) e.y += ENEMY3_SPEED * dt;
            if (now - e.lastFireTime >= ENEMY3_FIRE_RATE) {
                const centerX = e.x + e.width / 2;
                const centerY = e.y + e.height / 2;
                const angles = [-45, -22.5, 0, 22.5, 45];
                for (const angle of angles) {
                    const rad = angle * Math.PI / 180;
                    G.enemyBullets.push({
                        x: centerX - 4,
                        y: centerY,
                        width: 8, height: 12,
                        vx: Math.sin(rad) * ENEMY3_BULLET_SPEED,
                        vy: Math.cos(rad) * ENEMY3_BULLET_SPEED,
                        color: '#ff4444'
                    });
                }
                e.lastFireTime = now;
            }
            if (now - e.spawnTime >= ENEMY3_STALL_TIME) {
                e.rushTargetX = G.player.x + G.player.width / 2;
                e.rushTargetY = G.player.y + G.player.height / 2;
                e.hasRushed = true;
            }
        } else {
            if (e.rushTargetX !== null && e.rushTargetY !== null) {
                const dx = e.rushTargetX - (e.x + e.width / 2);
                const dy = e.rushTargetY - (e.y + e.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    e.x += (dx / dist) * ENEMY3_RUSH_SPEED * dt;
                    e.y += (dy / dist) * ENEMY3_RUSH_SPEED * dt;
                }
            }
        }
    },

    draw(e, ctx) {
        drawWithOutline(ctx, this._img, e.x, e.y, e.width, e.height, 1, true, e.hitFlash);
    }
});
