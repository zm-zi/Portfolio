// 四级敌人：扇形弹射击
ENEMY.register({
    type: 'spinner',
    score: ENEMY4_SCORE,
    color: '#ff4444',
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
            hoverY: ENEMY4_HOVER_Y,
            wave2Fired: false,
            wave3Fired: false,
            wave2Time: 0
        });
        this.lastSpawnTime = now;
    },

    update(e, G, now) {
        if (e.y < e.hoverY) e.y += ENEMY4_SPEED * G.game.dt;
        // Two interleaved fans form a flower with a different opening on each volley.
        if (!e.wave2Fired && now - e.lastFireTime >= ENEMY4_FIRE_RATE) {
            e.petalTilt = e.petalTilt === 1 ? -1 : 1;
            spinnerPetals(e, [-68,-34,0,34,68], e.petalTilt * 5);
            e.wave2Fired = true;
            e.wave2Time = now;
        }
        if (e.wave2Fired && !e.wave3Fired && now - e.wave2Time >= 240) {
            spinnerPetals(e, [-51,-17,17,51], e.petalTilt * 5);
            e.wave3Fired = true;
        }
        if (e.wave3Fired && now - e.wave2Time >= 420) {
            e.lastFireTime = now;
            e.wave2Fired = false;
            e.wave3Fired = false;
        }
    }
});

function spinnerPetals(enemy, angles, tilt) {
    const x = enemy.x + enemy.width / 2 - 4;
    for (const degrees of angles) {
        const angle = (degrees + tilt) * Math.PI / 180;
        G.enemyBullets.push({
            x, y: enemy.y + enemy.height, width: 8, height: 12, petal: true,
            vx: Math.sin(angle) * ENEMY4_BULLET_SPEED, vy: Math.cos(angle) * ENEMY4_BULLET_SPEED
        });
    }
}
