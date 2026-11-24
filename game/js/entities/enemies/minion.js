// Boss 召唤小怪（不由 spawnAll 生成）
ENEMY.register({
    type: 'minion',
    score: 5,
    color: '#ff6666',
    lastSpawnTime: 0,
    spawn: null,  // 由 Boss 直接 push 到 G.enemies

    update(e) {
        e.y += ENEMY_MINION_SPEED * G.game.dt;
    }
});
