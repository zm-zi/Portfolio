// 四级敌人二：幻影 — 悬停瞄准射击
ENEMY.register({
    type: 'phantom',
    score: ENEMY5_SCORE,
    color: '#ff4444',
    imgSrc: 'image/四级敌人2.png',
    lastSpawnTime: 0,

    spawn(G, now, spawnMult, hpMult) {
        if (G.game.gameMode !== 'level' && G.game.score < ENEMY5_SCORE_GATE) return;
        if (now - this.lastSpawnTime < ENEMY5_SPAWN_RATE * spawnMult) return;
        const hoverY = ENEMY5_HOVER_Y_MIN + Math.random() * (ENEMY5_HOVER_Y_MAX - ENEMY5_HOVER_Y_MIN);
        G.enemies.push({
            x: Math.random() * (LOGICAL_W - ENEMY5_SIZE),
            y: -ENEMY5_SIZE,
            width: ENEMY5_SIZE,
            height: ENEMY5_SIZE,
            hp: Math.round(ENEMY5_HP * hpMult),
            type: 'phantom',
            hoverY,
            lastFireTime: now + Math.random() * ENEMY5_FIRE_RATE
        });
        this.lastSpawnTime = now;
    },

    update(e, G, now) {
        const dt = G.game.dt;

        // 下落到悬停位置
        if (e.y < e.hoverY) {
            e.y += ENEMY5_SPEED * dt;
            return;
        }

        // 朝角色方向发射一颗射弹
        if (now - e.lastFireTime >= ENEMY5_FIRE_RATE) {
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 2;
            const pcx = G.player.x + G.player.width / 2;
            const pcy = G.player.y + G.player.height / 2;
            const angle = Math.atan2(pcy - cy, pcx - cx);
            G.enemyBullets.push({
                x: cx - 4,
                y: cy - 4,
                width: 8, height: 8,
                vx: Math.cos(angle) * ENEMY5_BULLET_SPEED,
                vy: Math.sin(angle) * ENEMY5_BULLET_SPEED,
                color: '#ff6644'
            });
            e.lastFireTime = now;
        }
    },

    draw(e, ctx) {
        if (this._img) {
            drawWithOutline(ctx, this._img, e.x, e.y, e.width, e.height, 1, true, e.hitFlash);
        } else {
            // 程序化绘制：灰红菱形幻影
            const cx = e.x + e.width / 2;
            const cy = e.y + e.height / 2;
            const r = e.width / 2;
            const pulse = 1 + 0.06 * Math.sin(Date.now() * 0.004 + cx * 0.1);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(pulse, pulse);
            // 受击闪白
            if (e.hitFlash > 0) {
                ctx.globalAlpha = Math.min(e.hitFlash / 6, 1);
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.globalAlpha = 1;
            }
            // 菱形主体（灰）
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(r * 0.7, 0);
            ctx.lineTo(0, r);
            ctx.lineTo(-r * 0.7, 0);
            ctx.closePath();
            ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#666677';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // 红色核心
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#ff3333';
            ctx.fill();
            // 核心光晕
            if (e.hitFlash <= 0) {
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 50, 50, 0.2)';
                ctx.fill();
            }
            ctx.restore();
        }
    }
});
