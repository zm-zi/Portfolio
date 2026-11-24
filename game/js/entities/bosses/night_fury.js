// Boss：夜煞（紫蓝暗影）
BOSS.register({
    id: 'night_fury',
    name: '夜煞',
    spawnScore: 400,
    hp: 240,
    width: 280,
    height: 210,
    skillInterval: 4500,
    laserWarnDuration: 1000,
    laserFireDuration: 800,
    laserWidth: 80,
    tripleLaserWarnDuration: 1200,
    tripleLaserFireDuration: 1000,
    tripleLaserCount: 3,
    tripleLaserHeight: 60,
    shieldWarnDuration: 600,
    shieldDuration: 3000,

    update(b, G, now) {
        const def = b.def;
        if (!def) return;
        const dt = G.game.dt;

        // 护盾状态：反弹玩家子弹
        if (b.skillState === 'shield_active') {
            const _reflect = (bulletList, i) => {
                const bull = bulletList[i];
                if (!bull) return;
                bull.y = b.y + b.height - bull.height;
                bull.x += (Math.random() - 0.5) * 10;
                bull.vx = (Math.random() - 0.5) * 2;
                bull.vy = ENEMY2_BULLET_SPEED;
                bull.isHoming = false;
                bull.warhead = 'echo';
                G.enemyBullets.push(bull);
                bulletList.splice(i, 1);
                // 反弹火花
                if (G.particles.length < PARTICLE_LIMIT) {
                    for (let k = 0; k < 3; k++) {
                        G.particles.push({
                            x: bull.x + (Math.random() - 0.5) * 10,
                            y: b.y + b.height,
                            vx: (Math.random() - 0.5) * 3,
                            vy: Math.random() * 2 + 1,
                            life: 8 + Math.random() * 6, maxLife: 14,
                            color: Math.random() > 0.5 ? '#aa00ff' : '#6644ff',
                            size: 2 + Math.random() * 2,
                            gravity: 0, drawPass: PASS_CIRCLE,
                            glowColor: '#aa00ff'
                        });
                    }
                }
            };

            for (let i = G.bullets.length - 1; i >= 0; i--) {
                if (Game.Util.aabb(G.bullets[i], b)) { _reflect(G.bullets, i); }
            }
            for (let i = G.wingmanBullets.length - 1; i >= 0; i--) {
                if (Game.Util.aabb(G.wingmanBullets[i], b)) { _reflect(G.wingmanBullets, i); }
            }
            for (let i = G.homingMissiles.length - 1; i >= 0; i--) {
                if (Game.Util.aabb(G.homingMissiles[i], b)) {
                    const m = G.homingMissiles[i];
                    m.isHoming = false;
                    m.warhead = 'echo';
                    m.vy = ENEMY2_BULLET_SPEED;
                    m.vx = (Math.random() - 0.5) * 2;
                    m.y = b.y + b.height - m.height;
                    G.enemyBullets.push(m);
                    G.homingMissiles.splice(i, 1);
                }
            }

            // 护盾持续粒子
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.3) {
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const a = Math.random() * 6.28;
                const r = (b.width / 2 + 25) * (0.8 + Math.random() * 0.3);
                G.particles.push({
                    x: cx + Math.cos(a) * r,
                    y: cy + Math.sin(a) * r,
                    vx: Math.cos(a) * 0.5,
                    vy: Math.sin(a) * 0.5,
                    life: 12 + Math.random() * 8, maxLife: 20,
                    color: '#7733cc', size: 1.5 + Math.random() * 1.5,
                    gravity: 0, drawPass: PASS_CIRCLE,
                    glowColor: '#aa00ff'
                });
            }

            // 更新旋转角度
            b.shieldAngle = (b.shieldAngle || 0) + 0.015 * dt;

            if (now - b.skillStartTime >= def.shieldDuration) {
                // 护盾结束爆破
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                G.flashes.push({ x: cx, y: cy, r: 10, maxR: 90, life: 14, maxLife: 14, color: 3 });
                if (G.particles.length < PARTICLE_LIMIT) {
                    for (let k = 0; k < 14; k++) {
                        const a = Math.random() * 6.28;
                        const s = Math.random() * 4 + 2;
                        G.particles.push({
                            x: cx + (Math.random() - 0.5) * b.width * 0.5,
                            y: cy + (Math.random() - 0.5) * b.height * 0.5,
                            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                            life: 15 + Math.random() * 10, maxLife: 25,
                            color: Math.random() > 0.5 ? '#aa00ff' : '#4422aa',
                            size: 3 + Math.random() * 5,
                            gravity: 0.06, isPixel: true, drawPass: PASS_CORE,
                            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.4
                        });
                    }
                }

                b.skillState = 'idle';
                b.lastSkillTime = now;
                b.laserWarnAlpha = 0;
                BOSS.endSkillAnim(b);
            }
        }

        if (b.skillState === 'idle') {
            // 待机：缓慢左右漂移
            b.x += Math.sin(now / 1000) * 0.4 * dt;
            if (b.x < 0) b.x = 0;
            if (b.x > LOGICAL_W - b.width) b.x = LOGICAL_W - b.width;

            // 待机暗影粒子
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.2) {
                const px = b.x + b.width / 2 + (Math.random() - 0.5) * b.width * 0.5;
                const py = b.y + b.height * 0.7 + Math.random() * 20;
                G.particles.push({
                    x: px, y: py,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: Math.random() * 0.6 + 0.2,
                    life: 12 + Math.random() * 8, maxLife: 20,
                    color: Math.random() > 0.5 ? '#5533aa' : '#221144',
                    size: 2 + Math.random() * 2,
                    gravity: -0.02, drawPass: PASS_CIRCLE,
                    glowColor: '#6633cc'
                });
            }

            if (now - b.lastSkillTime >= def.skillInterval) {
                if (!b.skillVariant) b.skillVariant = 0;
                const variant = b.skillVariant % 3;
                if (variant === 0) {
                    b.skillState = 'laser_warn';
                    b.laserX = G.player ? G.player.x + G.player.width / 2 - def.laserWidth / 2 : 0;
                } else if (variant === 1) {
                    b.skillState = 'triple_laser_warn';
                    const positions = [];
                    const minGap = def.tripleLaserHeight + 30;
                    let attempts = 0;
                    while (positions.length < def.tripleLaserCount && attempts < 50) {
                        attempts++;
                        const y = Math.random() * (LOGICAL_H - def.tripleLaserHeight);
                        let ok = true;
                        for (const p of positions) {
                            if (Math.abs(p - y) < minGap) { ok = false; break; }
                        }
                        if (ok) positions.push(y);
                    }
                    // 兜底：确保始终有 3 条激光
                    while (positions.length < def.tripleLaserCount) {
                        positions.push(positions.length * minGap + 60);
                    }
                    b.tripleLaserYs = positions;
                } else {
                    b.skillState = 'shield_warn';
                }
                b.skillStartTime = now;
                b.laserWarnAlpha = 0.3;
                b.skillVariant = (b.skillVariant || 0) + 1;
                BOSS.startSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  单激光
        // ══════════════════════════════════════
        else if (b.skillState === 'laser_warn') {
            b.laserWarnAlpha = 0.3 + Math.sin(now / 80) * 0.3;
            const elapsed = now - b.skillStartTime;
            if (elapsed < 500 && G.player) {
                b.laserX = G.player.x + G.player.width / 2 - def.laserWidth / 2;
            }

            // 蓄力粒子汇聚到激光线
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.4) {
                const laserCx = (b.laserX || 0) + def.laserWidth / 2;
                G.particles.push({
                    x: laserCx + (Math.random() - 0.5) * def.laserWidth * 2,
                    y: Math.random() * LOGICAL_H,
                    vx: (laserCx - (laserCx + (Math.random() - 0.5) * def.laserWidth * 2)) * 0.015,
                    vy: (Math.random() - 0.5) * 0.5,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    color: '#aa00ff', size: 1.5 + Math.random() * 1.5,
                    gravity: 0, drawPass: PASS_CIRCLE,
                    glowColor: '#cc44ff'
                });
            }

            if (elapsed >= def.laserWarnDuration) {
                b.skillState = 'laser_fire';
                b.skillStartTime = now;
            }
        }

        else if (b.skillState === 'laser_fire') {
            if (now - (b.lastLaserDmgTime || 0) > 100) {
                if (G.player) {
                    const laserX = b.laserX;
                    const px = G.player.x;
                    const pw = G.player.width;
                    const hit = px + pw > laserX && px < laserX + def.laserWidth;
                    if (hit) _damagePlayer();
                }
                b.lastLaserDmgTime = now;
            }

            // 激光底部火花
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.5) {
                const laserCx = (b.laserX || 0) + def.laserWidth / 2;
                for (let k = 0; k < 2; k++) {
                    G.particles.push({
                        x: laserCx + (Math.random() - 0.5) * def.laserWidth * 0.6,
                        y: LOGICAL_H - 10,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -(Math.random() * 3 + 1),
                        life: 8 + Math.random() * 6, maxLife: 14,
                        color: Math.random() > 0.3 ? '#cc44ff' : '#ffffff',
                        size: 2 + Math.random() * 3,
                        gravity: 0.1, isPixel: true, drawPass: PASS_CORE,
                        rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.5
                    });
                }
            }

            if (now - b.skillStartTime >= def.laserFireDuration) {
                b.skillState = 'idle';
                b.lastSkillTime = now;
                b.laserWarnAlpha = 0;
                BOSS.endSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  三连激光
        // ══════════════════════════════════════
        else if (b.skillState === 'triple_laser_warn') {
            b.laserWarnAlpha = 0.3 + Math.sin(now / 80) * 0.3;
            const elapsed = now - b.skillStartTime;

            // 蓄力粒子
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.3) {
                const ys = b.tripleLaserYs || [];
                if (ys.length > 0) {
                    const pickY = ys[(Math.random() * ys.length) | 0];
                    G.particles.push({
                        x: Math.random() * LOGICAL_W,
                        y: pickY + (Math.random() - 0.5) * def.tripleLaserHeight,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.3,
                        life: 10 + Math.random() * 8, maxLife: 18,
                        color: '#8833dd', size: 1.5 + Math.random() * 1.5,
                        gravity: 0, drawPass: PASS_CIRCLE,
                        glowColor: '#aa00ff'
                    });
                }
            }

            if (elapsed >= def.tripleLaserWarnDuration) {
                b.skillState = 'triple_laser_fire';
                b.skillStartTime = now;
            }
        }

        else if (b.skillState === 'triple_laser_fire') {
            if (now - (b.lastLaserDmgTime || 0) > 100) {
                if (G.player) {
                    const ys = b.tripleLaserYs || [];
                    const ph = G.player.height;
                    for (const laserY of ys) {
                        const py = G.player.y;
                        const hit = py + ph > laserY && py < laserY + def.tripleLaserHeight;
                        if (hit) { _damagePlayer(); break; }
                    }
                }
                b.lastLaserDmgTime = now;
            }

            // 激光扫过火花
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.3) {
                const ys = b.tripleLaserYs || [];
                if (ys.length > 0) {
                    const pickY = ys[(Math.random() * ys.length) | 0];
                    G.particles.push({
                        x: Math.random() * LOGICAL_W,
                        y: pickY + (Math.random() - 0.5) * def.tripleLaserHeight,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 3,
                        life: 6 + Math.random() * 6, maxLife: 12,
                        color: Math.random() > 0.4 ? '#cc44ff' : '#ffffff',
                        size: 2 + Math.random() * 2,
                        gravity: 0, isPixel: true, drawPass: PASS_CORE,
                        rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.5
                    });
                }
            }

            if (now - b.skillStartTime >= def.tripleLaserFireDuration) {
                b.skillState = 'idle';
                b.lastSkillTime = now;
                b.laserWarnAlpha = 0;
                BOSS.endSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  护盾
        // ══════════════════════════════════════
        else if (b.skillState === 'shield_warn') {
            b.laserWarnAlpha = 0.3 + Math.sin(now / 80) * 0.3;
            const elapsed = now - b.skillStartTime;

            // 蓄力粒子向boss汇聚
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.5) {
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const a = Math.random() * 6.28;
                const dist = 80 + Math.random() * 60;
                G.particles.push({
                    x: cx + Math.cos(a) * dist,
                    y: cy + Math.sin(a) * dist,
                    vx: -Math.cos(a) * 2.5,
                    vy: -Math.sin(a) * 2.5,
                    life: 10 + Math.random() * 6, maxLife: 16,
                    color: '#8833dd', size: 2 + Math.random() * 2,
                    gravity: 0, drawPass: PASS_CIRCLE,
                    glowColor: '#aa00ff'
                });
            }

            if (elapsed >= def.shieldWarnDuration) {
                b.skillState = 'shield_active';
                b.skillStartTime = now;
                b.shieldAngle = 0;
            }
        }
    }
});
