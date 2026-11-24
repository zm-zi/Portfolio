// Boss：独眼王（黑红机甲）
BOSS.register({
    id: 'one_eye_king',
    name: '独眼王',
    spawnScore: 400,
    hp: 200,
    width: 300,
    height: 225,
    skillInterval: 4000,
    sweepSpeed: 3,
    sweepDuration: 2000,
    shieldDuration: 2500,
    shieldWarnDuration: 500,
    summonCount: 4,
    bulletCount: 3,

    update(b, G, now) {
        const def = b.def;
        const dt = G.game.dt;
        if (!b.phaseTwo && b.hp <= b.maxHp * 0.5) {
            b.phaseTwo = true;
            G.screenFlash = Math.max(G.screenFlash, 0.35);
            G.screenShake = Math.max(G.screenShake, 3);
        }

        if (b.skillState === 'idle') {
            b.x += Math.sin(now / 1000) * 0.5 * dt;
            if (b.x < 0) b.x = 0;
            if (b.x > LOGICAL_W - b.width) b.x = LOGICAL_W - b.width;

            // 待机时：机甲尾焰粒子（黑红微光）
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.3) {
                const px = b.x + b.width / 2 + (Math.random() - 0.5) * b.width * 0.6;
                const py = b.y + b.height - 5;
                G.particles.push({
                    x: px, y: py,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: Math.random() * 0.8 + 0.3,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    color: Math.random() > 0.5 ? '#ff2200' : '#440000',
                    size: 2 + Math.random() * 2,
                    gravity: -0.02, isPixel: true, drawPass: PASS_CIRCLE,
                    glowColor: '#ff0000'
                });
            }

            if (now - b.lastSkillTime >= def.skillInterval * (b.phaseTwo ? 0.75 : 1)) {
                if (!b.skillVariant) b.skillVariant = 0;
                const variant = b.skillVariant % 3;
                if (variant === 0) {
                    b.skillState = 'sweep_warn';
                    b.sweepDir = Math.random() > 0.5 ? 1 : -1;
                    b.sweepWarnAlpha = 0;
                } else if (variant === 1) {
                    b.skillState = 'shield_warn';
                    b.shieldWarnAlpha = 0;
                } else {
                    b.skillState = 'summon_cast';
                    b.summonWarnAlpha = 0;
                    b.summoned = false;
                }
                b.skillVariant = (b.skillVariant || 0) + 1;
                b.skillStartTime = now;
                BOSS.startSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  技能1：热能扫射（带预警阶段）
        // ══════════════════════════════════════
        else if (b.skillState === 'sweep_warn') {
            // 预警 0.6s：红光脉冲 + 机甲蓄力粒子
            b.sweepWarnAlpha = 0.3 + Math.sin(now / 60) * 0.3;

            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.6) {
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height;
                G.particles.push({
                    x: cx + (Math.random() - 0.5) * 40,
                    y: cy + (Math.random() - 0.5) * 10,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: Math.random() * 2 + 1,
                    life: 8 + Math.random() * 6, maxLife: 14,
                    color: '#ff3300', size: 3 + Math.random() * 3,
                    gravity: 0, drawPass: PASS_CIRCLE,
                    glowColor: '#ff0000'
                });
            }

            if (now - b.skillStartTime >= 600) {
                b.skillState = 'sweep';
                b.skillStartTime = now;
                b.lastBulletTime = 0;
            }
        }

        else if (b.skillState === 'sweep') {
            b.x += def.sweepSpeed * b.sweepDir * dt;

            if (b.x <= 0) { b.x = 0; b.sweepDir = 1; }
            else if (b.x >= LOGICAL_W - b.width) { b.x = LOGICAL_W - b.width; b.sweepDir = -1; }

            const elapsed = now - b.skillStartTime;
            const fireRate = elapsed < 800 ? 250 : 300; // 前0.8s快，后1.2s慢

            if (elapsed < def.sweepDuration && now - (b.lastBulletTime || 0) > fireRate) {
                const centerX = b.x + b.width / 2;
                const centerY = b.y + b.height;
                const count = def.bulletCount + (b.phaseTwo ? 2 : 0);

                for (let i = 0; i < count; i++) {
                    const t = count > 1 ? i / (count - 1) : 0.5;
                    const angle = t * 100 - 50; // -50° 到 +50°
                    const rad = angle * Math.PI / 180;
                    const speed = 1.0 + Math.sin(now / 200 + i) * 0.15;
                    const vx = Math.sin(rad) * speed;
                    const vy = Math.cos(rad) * speed;
                    if (isNaN(vx) || isNaN(vy)) continue;

                    // 内层3颗用红色高伤弹，外层2颗用暗红追踪弹
                    const isCore = i >= 1 && i <= count - 2;
                    G.enemyBullets.push({
                        x: centerX - 5,
                        y: centerY,
                        width: isCore ? 12 : 8,
                        height: isCore ? 12 : 8,
                        vx, vy,
                        isBoss: true, warhead: 'ember',
                        color: isCore ? '#ff2200' : '#cc1100',
                        emberTrail: true // 火焰拖尾
                    });
                }

                // 发射口爆裂粒子
                if (G.particles.length < PARTICLE_LIMIT) {
                    for (let k = 0; k < 4; k++) {
                        G.particles.push({
                            x: centerX + (Math.random() - 0.5) * 20,
                            y: centerY,
                            vx: (Math.random() - 0.5) * 3,
                            vy: Math.random() * 3 + 1,
                            life: 6 + Math.random() * 6, maxLife: 12,
                            color: Math.random() > 0.3 ? '#ff4400' : '#ffaa00',
                            size: 2 + Math.random() * 3,
                            gravity: 0.05, isPixel: true, drawPass: PASS_CORE,
                            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.4
                        });
                    }
                }
                b.lastBulletTime = now;
            }

            // 扫射拖尾粒子
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.4) {
                G.particles.push({
                    x: b.x + b.width / 2 + (Math.random() - 0.5) * b.width * 0.8,
                    y: b.y + b.height + Math.random() * 10,
                    vx: -b.sweepDir * (Math.random() * 1.5 + 0.5),
                    vy: Math.random() * 0.5,
                    life: 12 + Math.random() * 8, maxLife: 20,
                    color: '#ff2200', size: 2 + Math.random() * 2,
                    gravity: -0.03, drawPass: PASS_CIRCLE,
                    glowColor: '#ff0000'
                });
            }

            if (elapsed >= def.sweepDuration) {
                b.skillState = 'idle';
                b.lastSkillTime = now;
                BOSS.endSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  技能2：暗红护盾
        // ══════════════════════════════════════
        else if (b.skillState === 'shield_warn') {
            b.shieldWarnAlpha = 0.2 + Math.sin(now / 60) * 0.2;

            // 蓄力粒子从四周汇聚到boss
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.5) {
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const a = Math.random() * 6.28;
                const dist = 80 + Math.random() * 60;
                G.particles.push({
                    x: cx + Math.cos(a) * dist,
                    y: cy + Math.sin(a) * dist,
                    vx: -Math.cos(a) * 2,
                    vy: -Math.sin(a) * 2,
                    life: 10 + Math.random() * 6, maxLife: 16,
                    color: '#ff0000', size: 2 + Math.random() * 2,
                    gravity: 0, drawPass: PASS_CIRCLE,
                    glowColor: '#ff0000'
                });
            }

            if (now - b.skillStartTime >= def.shieldWarnDuration) {
                b.skillState = 'shield';
                b.isInvincible = true;
                b.shieldAngle = 0;
                b.skillStartTime = now;
            }
        }

        else if (b.skillState === 'shield') {
            b.shieldAlpha = 0.35 + Math.sin(now / 80) * 0.15;
            b.shieldAngle = (b.shieldAngle || 0) + 0.02 * dt;

            // 护盾内部脉冲粒子
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.2) {
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const a = Math.random() * 6.28;
                const r = (b.width / 2 + 15) * 0.7;
                G.particles.push({
                    x: cx + Math.cos(a) * r,
                    y: cy + Math.sin(a) * r,
                    vx: Math.cos(a) * 0.3,
                    vy: Math.sin(a) * 0.3,
                    life: 15 + Math.random() * 10, maxLife: 25,
                    color: '#880000', size: 1.5 + Math.random() * 1.5,
                    gravity: 0, drawPass: PASS_CIRCLE,
                    glowColor: '#ff0000'
                });
            }

            // 从护盾边缘向下散射暗红弹丸（每500ms）
            if (now - (b.lastBulletTime || 0) > 500) {
                const cx = b.x + b.width / 2;
                const shieldR = b.width / 2 + 25;
                // 从护盾两侧发射
                for (let side = -1; side <= 1; side += 2) {
                    const sx = cx + side * shieldR * 0.7;
                    const sy = b.y + b.height / 2 + shieldR * 0.5;
                    G.enemyBullets.push({
                        x: sx - 4, y: sy,
                        width: 8, height: 10,
                        vx: side * 0.5, vy: 2.5,
                        isBoss: true, warhead: 'ember',
                        color: '#cc0000',
                        emberTrail: true
                    });
                }
                b.lastBulletTime = now;
            }

            if (now - b.skillStartTime >= def.shieldDuration) {
                // 护盾破碎爆发
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                G.flashes.push({ x: cx, y: cy, r: 10, maxR: 80, life: 12, maxLife: 12, color: 0 });
                // 破碎碎片粒子
                if (G.particles.length < PARTICLE_LIMIT) {
                    for (let k = 0; k < 12; k++) {
                        const a = Math.random() * 6.28;
                        const s = Math.random() * 4 + 2;
                        G.particles.push({
                            x: cx + (Math.random() - 0.5) * b.width * 0.6,
                            y: cy + (Math.random() - 0.5) * b.height * 0.6,
                            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                            life: 15 + Math.random() * 10, maxLife: 25,
                            color: Math.random() > 0.5 ? '#ff2200' : '#880000',
                            size: 3 + Math.random() * 5,
                            gravity: 0.08, isPixel: true, drawPass: PASS_CORE,
                            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.4
                        });
                    }
                }

                b.skillState = 'idle';
                b.lastSkillTime = now;
                b.isInvincible = false;
                BOSS.endSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  技能3：召唤（带召唤阵特效）
        // ══════════════════════════════════════
        else if (b.skillState === 'summon_cast') {
            b.summonWarnAlpha = Math.min(1, (now - b.skillStartTime) / 800);

            // 召唤阵旋转粒子环
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.5) {
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;
                const angle = now / 300;
                const r = 50 + Math.sin(now / 200) * 10;
                G.particles.push({
                    x: cx + Math.cos(angle + Math.random() * 0.5) * r,
                    y: cy + Math.sin(angle + Math.random() * 0.5) * r,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    life: 12 + Math.random() * 8, maxLife: 20,
                    color: '#ff0000', size: 2 + Math.random() * 2,
                    gravity: 0, drawPass: PASS_CIRCLE,
                    glowColor: '#ff0000'
                });
            }

            if (!b.summoned && now - b.skillStartTime >= 800) {
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height / 2;

                // 召唤冲击波
                G.flashes.push({ x: cx, y: cy, r: 5, maxR: 60, life: 10, maxLife: 10, color: 0 });

                for (let i = 0; i < def.summonCount; i++) {
                    const side = i % 2 === 0 ? -1 : 1;
                    const sx = cx + side * (50 + i * 30);
                    const sy = cy;

                    // 每个召唤点爆裂
                    if (G.particles.length < PARTICLE_LIMIT) {
                        for (let k = 0; k < 6; k++) {
                            const a = Math.random() * 6.28;
                            const s = Math.random() * 3 + 1;
                            G.particles.push({
                                x: sx, y: sy,
                                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                                life: 8 + Math.random() * 6, maxLife: 14,
                                color: '#ff3300', size: 2 + Math.random() * 3,
                                gravity: 0.05, isPixel: true, drawPass: PASS_CORE,
                                rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.3
                            });
                        }
                    }

                    G.enemies.push({
                        x: sx - 20, y: sy - 20,
                        width: 40, height: 40,
                        hp: 1, type: 'minion'
                    });
                }
                b.summoned = true;
            }

            if (now - b.skillStartTime >= 1500) {
                b.skillState = 'idle';
                b.lastSkillTime = now;
                b.summoned = false;
                BOSS.endSkillAnim(b);
            }
        }
    }
});
