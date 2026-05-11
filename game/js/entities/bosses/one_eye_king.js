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
    imgSrc: 'image/Boss1-独眼王.png',
    actionImgSrc: 'image/Boss1-独眼王动作帧.png',

    update(b, G, now) {
        const def = b.def;
        const dt = G.game.dt;

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

            if (now - b.lastSkillTime >= def.skillInterval) {
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
                const count = def.bulletCount;

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
                        isBoss: true,
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
                        isBoss: true,
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
    },

    draw(b, ctx) {
        // 使用通用动画绘制（150ms间隔，循环4次）
        BOSS.drawFrame(b, ctx, 150, 4);

        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const now = Date.now();

        // ─── 待机时：机甲底部微光 ───
        if (b.skillState === 'idle') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const pulseA = 0.15 + Math.sin(now / 150) * 0.08;
            ctx.globalAlpha = pulseA;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, b.width * 0.3, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ─── 扫射预警：底部红光蓄力带 ───
        if (b.skillState === 'sweep_warn') {
            ctx.save();
            ctx.globalAlpha = (b.sweepWarnAlpha || 0.3) * 0.6;
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 25;
            // 蓄力能量带
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 40 + Math.sin(now / 80) * 15, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ─── 扫射中：炮口发光 + 两侧能量纹路 ───
        if (b.skillState === 'sweep') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // 底部炮口辉光
            const muzzlePulse = 0.5 + Math.sin(now / 30) * 0.3;
            ctx.globalAlpha = muzzlePulse;
            ctx.shadowColor = '#ff2200';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 3, 25, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // 炮口内核白光
            ctx.globalAlpha = muzzlePulse * 0.6;
            ctx.fillStyle = '#ffcc88';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 3, 12, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // ─── 护盾预警：红色能量环收缩 ───
        if (b.skillState === 'shield_warn') {
            ctx.save();
            const warnA = b.shieldWarnAlpha || 0.2;
            const rw = b.width / 2 + 30 + (1 - warnA) * 30;
            const rh = b.height / 2 + 30 + (1 - warnA) * 30;

            ctx.globalAlpha = warnA * 0.7;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 15;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.restore();
        }

        // ─── 护盾激活：暗红能量护盾（多层 + 旋转齿轮纹路） ───
        if (b.skillState === 'shield' && b.isInvincible) {
            ctx.save();
            const alpha = b.shieldAlpha || 0.35;
            const rw = b.width / 2 + 25;
            const rh = b.height / 2 + 25;
            const rotAngle = b.shieldAngle || 0;

            // 外层暗红辉光
            ctx.globalAlpha = alpha * 0.4;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 30;
            ctx.strokeStyle = '#cc0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rw + 5, rh + 5, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 主护盾壳体（半透明填充）
            ctx.globalAlpha = alpha * 0.15;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
            ctx.fill();

            // 护盾边界线
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#ff2200';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 旋转齿轮纹路（8条放射线）
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#880000';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff0000';
            for (let i = 0; i < 8; i++) {
                const a = rotAngle + (i / 8) * Math.PI * 2;
                const innerR = 0.6;
                const outerR = 1.0 + Math.sin(now / 150 + i * 0.8) * 0.08;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * rw * innerR, cy + Math.sin(a) * rh * innerR);
                ctx.lineTo(cx + Math.cos(a) * rw * outerR, cy + Math.sin(a) * rh * outerR);
                ctx.stroke();
            }

            // 能量节点（旋转线段端点的小光点）
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 8; i++) {
                const a = rotAngle + (i / 8) * Math.PI * 2;
                const r = 1.0 + Math.sin(now / 150 + i * 0.8) * 0.08;
                const nx = cx + Math.cos(a) * rw * r;
                const ny = cy + Math.sin(a) * rh * r;
                ctx.globalAlpha = alpha * 0.6;
                ctx.fillStyle = '#ff4400';
                ctx.beginPath();
                ctx.arc(nx, ny, 3, 0, 6.28);
                ctx.fill();
            }

            // 内层脉冲环
            ctx.globalAlpha = alpha * 0.3;
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = 1;
            const innerPulse = 0.7 + Math.sin(now / 120) * 0.05;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rw * innerPulse, rh * innerPulse, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        // ─── 召唤施法中：召唤阵 ───
        if (b.skillState === 'summon_cast') {
            ctx.save();
            const alpha = b.summonWarnAlpha || 0;
            const r = 55;

            // 外圈法阵
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();

            // 内圈
            ctx.globalAlpha = alpha * 0.4;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            // 六芒星
            ctx.globalAlpha = alpha * 0.5;
            ctx.lineWidth = 1.5;
            for (let t = 0; t < 2; t++) {
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const a = (i / 3) * Math.PI * 2 + t * Math.PI / 3 + now / 800;
                    const px = cx + Math.cos(a) * r * 0.85;
                    const py = cy + Math.sin(a) * r * 0.85;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.stroke();
            }

            // 中心红点脉冲
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = alpha * (0.4 + Math.sin(now / 80) * 0.3);
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(cx, cy, 8 + Math.sin(now / 100) * 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
});
