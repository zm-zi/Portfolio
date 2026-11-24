function summonDebugEnemy(type) {
    const sizeMap = { basic: ENEMY1_SIZE, shooter: ENEMY2_SIZE, rusher: ENEMY3_SIZE, spinner: ENEMY4_SIZE, phantom: ENEMY5_SIZE, minion: 40 };
    const hpMap = { basic: ENEMY1_HP, shooter: ENEMY2_HP, rusher: ENEMY3_HP, spinner: ENEMY4_HP, phantom: ENEMY5_HP, minion: 1 };
    const size = sizeMap[type] || 50;
    const hp = hpMap[type] || 1;

    let enemy = { x: 50 + Math.random() * (LOGICAL_W - 150), y: -80, width: size, height: size, hp: hp, type: type };

    if (type === 'shooter' || type === 'phantom') {
        enemy.lastFireTime = gameNow();
        enemy.hoverY = 100 + (Math.random() - 0.5) * 40;
    } else if (type === 'rusher') {
        enemy.lastFireTime = gameNow();
        enemy.spawnTime = gameNow();
        enemy.hasRushed = false;
        enemy.rushTargetX = null;
        enemy.rushTargetY = null;
        enemy.hoverY = 100 + (Math.random() - 0.5) * 40;
    } else if (type === 'spinner') {
        enemy.lastFireTime = gameNow();
        enemy.hoverY = 350;
        enemy.wave2Fired = false;
        enemy.wave3Fired = false;
        enemy.wave2Time = 0;
    }

    G.enemies.push(enemy);
}
