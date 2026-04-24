// Boss 召唤小怪（不由 spawnAll 生成）
ENEMY.register({
    type: 'minion',
    score: 5,
    color: '#ff6666',
    lastSpawnTime: 0,
    spawn: null,  // 由 Boss 直接 push 到 G.enemies

    update(e) {
        e.y += ENEMY_MINION_SPEED * G.game.dt;
    },

    draw(e, ctx) {
        const cx = e.x + e.width / 2;
        const cy = e.y + e.height / 2;
        const r = e.width / 2;
        const scale = 1 + 0.06 * Math.sin(Date.now() * 0.004 + cx * 0.1);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        // 白色描边
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // 受击闪光
        if (e.hitFlash > 0) {
            ctx.globalAlpha = Math.min(e.hitFlash / 6, 1);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 外圆
            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            // 内圆
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, r / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
});
