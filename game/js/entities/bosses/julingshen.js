// Boss：巨灵神（金色甲胄战士）
BOSS.register({
    id: 'julingshen',
    name: '巨灵神',
    spawnScore: 400,
    hp: 250,
    width: 350,
    height: 240,
    skillInterval: 4000,
    imgSrc: 'image/Boss4-巨灵神.png',
    actionImgSrc: 'image/Boss4-巨灵神动作帧.png',

    // ─── 技能参数 ───
    // 技能1：天降神雨
    rainWarnDuration: 1200,    // 预警时长
    rainWaveCount: 4,          // 弹幕波数
    rainWaveInterval: 500,     // 每波间隔 ms（拉大间隔让玩家有时间移动）
    rainColumns: 5,            // 每波列数（减少列数）
    rainColGap: 120,           // 列间距（>玩家宽度80px，确保能穿过）
    rainBulletSpeed: 2.2,      // 弹幕下落速度（更慢，反应时间更充裕）
    rainSway: 0,               // 无横向漂移（安全走廊保持稳定）

    // 技能2：神力横扫
    sweepWarnDuration: 800,
    sweepDuration: 2000,
    sweepSpeed: 2.0,           // 降低Boss移动速度（更容易预判）
    sweepBulletCount: 3,       // 减少弹数（3颗留出躲避空间）
    sweepBulletSpeed: 2.5,     // 弹速略增（快速通过后有空档）

    // 技能3：天罚之柱
    pillarWarnDuration: 1500,
    pillarDuration: 1200,
    pillarWidth: 80,
    pillarDamage: 2,

    update(b, G, now) {
        const def = b.def;
        const dt = G.game.dt;

        if (b.skillState === 'idle') {
            b.x += Math.sin(now / 1000) * 0.5 * dt;
            if (b.x < 0) b.x = 0;
            if (b.x > LOGICAL_W - b.width) b.x = LOGICAL_W - b.width;

            // 待机：金色神性粒子
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.3) {
                const px = b.x + b.width / 2 + (Math.random() - 0.5) * b.width * 0.5;
                const py = b.y + b.height * 0.3 + (Math.random() - 0.5) * 40;
                G.particles.push({
                    x: px, y: py,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: Math.random() * 0.6 + 0.2,
                    life: 12 + Math.random() * 8, maxLife: 20,
                    color: Math.random() > 0.5 ? '#ffcc44' : '#aa6600',
                    size: 2 + Math.random() * 2,
                    gravity: -0.01, isPixel: true, drawPass: PASS_CIRCLE,
                    glowColor: '#ffaa00'
                });
            }

            if (now - b.lastSkillTime >= def.skillInterval) {
                if (!b.skillVariant) b.skillVariant = 0;
                const variant = b.skillVariant % 3;
                if (variant === 0) {
                    b.skillState = 'rain_warn';
                    b.rainWaveIndex = 0;
                    b.lastRainWaveTime = 0;
                } else if (variant === 1) {
                    b.skillState = 'sweep_warn';
                    b.sweepDir = Math.random() > 0.5 ? 1 : -1;
                } else {
                    b.skillState = 'pillar_warn';
                    b.pillarTargetX = G.player.x + G.player.width / 2;
                }
                b.skillVariant = (b.skillVariant || 0) + 1;
                b.skillStartTime = now;
                BOSS.startSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  技能1：天降神雨（弹幕雨）
        // ══════════════════════════════════════
        else if (b.skillState === 'rain_warn') {
            // 预警阶段：Boss 蓄力 + 屏幕顶部金光
            if (now - b.skillStartTime >= def.rainWarnDuration) {
                b.skillState = 'rain';
                b.skillStartTime = now;
                b.rainWaveIndex = 0;
                b.lastRainWaveTime = 0;
                G.screenFlash = 0.3;
            }
        }

        else if (b.skillState === 'rain') {
            const elapsed = now - b.skillStartTime;

            // 按波次发射弹幕
            if (b.rainWaveIndex < def.rainWaveCount) {
                if (now - (b.lastRainWaveTime || b.skillStartTime) >= def.rainWaveInterval) {
                    _fireRainWave(b, G, def, b.rainWaveIndex);
                    b.rainWaveIndex++;
                    b.lastRainWaveTime = now;
                }
            }

            // 所有波次发出后等待 1.5s 结束
            if (b.rainWaveIndex >= def.rainWaveCount && now - b.lastRainWaveTime >= 1500) {
                b.skillState = 'idle';
                b.lastSkillTime = now;
                BOSS.endSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  技能2：神力横扫
        // ══════════════════════════════════════
        else if (b.skillState === 'sweep_warn') {
            if (now - b.skillStartTime >= def.sweepWarnDuration) {
                b.skillState = 'sweep';
                b.skillStartTime = now;
                b.lastSweepBulletTime = 0;
            }
        }

        else if (b.skillState === 'sweep') {
            // 横向移动扫射
            b.x += def.sweepSpeed * b.sweepDir * dt;
            if (b.x <= 0) { b.x = 0; b.sweepDir = 1; }
            else if (b.x >= LOGICAL_W - b.width) { b.x = LOGICAL_W - b.width; b.sweepDir = -1; }

            const elapsed = now - b.skillStartTime;
            const fireRate = elapsed < 1000 ? 180 : 250;

            if (now - (b.lastSweepBulletTime || 0) > fireRate) {
                _fireSweepBullets(b, G, def);
                b.lastSweepBulletTime = now;
            }

            // 扫射拖尾粒子
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.4) {
                const cx = b.x + b.width / 2;
                const cy = b.y + b.height;
                G.particles.push({
                    x: cx + (Math.random() - 0.5) * b.width * 0.6,
                    y: cy + Math.random() * 5,
                    vx: -b.sweepDir * (Math.random() * 2 + 1),
                    vy: Math.random() * 0.5,
                    life: 10 + Math.random() * 8, maxLife: 18,
                    color: '#ffaa00', size: 2 + Math.random() * 2,
                    gravity: -0.02, drawPass: PASS_CIRCLE,
                    glowColor: '#ffcc44'
                });
            }

            if (elapsed >= def.sweepDuration) {
                b.skillState = 'idle';
                b.lastSkillTime = now;
                BOSS.endSkillAnim(b);
            }
        }

        // ══════════════════════════════════════
        //  技能3：天罚之柱
        // ══════════════════════════════════════
        else if (b.skillState === 'pillar_warn') {
            // 追踪玩家位置（缓慢跟随）
            const targetX = G.player.x + G.player.width / 2;
            b.pillarTargetX += (targetX - b.pillarTargetX) * 0.015 * dt;

            if (now - b.skillStartTime >= def.pillarWarnDuration) {
                b.skillState = 'pillar_fire';
                b.skillStartTime = now;
                G.screenShake = 8;
                G.screenFlash = 0.5;
            }
        }

        else if (b.skillState === 'pillar_fire') {
            const elapsed = now - b.skillStartTime;

            // 光柱持续伤害检测
            const pillarX = b.pillarTargetX - def.pillarWidth / 2;
            const pillarRight = b.pillarTargetX + def.pillarWidth / 2;
            const playerCX = G.player.x + G.player.width / 2;
            const playerCY = G.player.y + G.player.height / 2;

            if (playerCX > pillarX && playerCX < pillarRight && !G.player.isInvincible) {
                // 每300ms判定一次伤害
                if (!b._lastPillarHit || now - b._lastPillarHit > 300) {
                    if (typeof _damagePlayer === 'function') _damagePlayer(G);
                    b._lastPillarHit = now;
                }
            }

            // 光柱粒子效果
            if (G.particles.length < PARTICLE_LIMIT) {
                for (let k = 0; k < 3; k++) {
                    const px = b.pillarTargetX + (Math.random() - 0.5) * def.pillarWidth;
                    const py = Math.random() * LOGICAL_H;
                    G.particles.push({
                        x: px, y: py,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: -Math.random() * 2 - 1,
                        life: 8 + Math.random() * 8, maxLife: 16,
                        color: Math.random() > 0.3 ? '#ffdd44' : '#ff8800',
                        size: 2 + Math.random() * 3,
                        gravity: -0.02, drawPass: PASS_CIRCLE,
                        glowColor: '#ffaa00'
                    });
                }
            }

            // 结束时发射散射弹幕
            if (elapsed >= def.pillarDuration) {
                _firePillarBurst(b, G, def);
                b.skillState = 'idle';
                b.lastSkillTime = now;
                b._lastPillarHit = 0;
                BOSS.endSkillAnim(b);
            }
        }

        // 金色神性粒子（施法中加强）
        if (b.skillState !== 'idle' && G.particles.length < PARTICLE_LIMIT && Math.random() < 0.5) {
            const px = b.x + b.width / 2 + (Math.random() - 0.5) * b.width * 0.6;
            const py = b.y + b.height * 0.5 + (Math.random() - 0.5) * b.height * 0.4;
            G.particles.push({
                x: px, y: py,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -Math.random() * 1.2 - 0.3,
                life: 10 + Math.random() * 8, maxLife: 18,
                color: Math.random() > 0.4 ? '#ffcc44' : '#ff8800',
                size: 2 + Math.random() * 2.5,
                gravity: -0.02, drawPass: PASS_CIRCLE,
                glowColor: '#ffaa00'
            });
        }
    },

    draw(b, ctx) {
        BOSS.drawFrame(b, ctx, 150, 4);

        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const now = Date.now();

        // ─── 待机：底部金色微光 ───
        if (b.skillState === 'idle') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const pulseA = 0.12 + Math.sin(now / 150) * 0.06;
            ctx.globalAlpha = pulseA;
            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, b.width * 0.3, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ─── 天降神雨预警：Boss 蓄力 + 屏幕顶部金光带 ───
        if (b.skillState === 'rain_warn') {
            const elapsed = now - b.skillStartTime;
            const progress = elapsed / b.def.rainWarnDuration;
            const warnPulse = 0.3 + Math.sin(now / 60) * 0.2;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Boss 底部蓄力金光
            ctx.globalAlpha = warnPulse * 0.8;
            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 40 + Math.sin(now / 80) * 15, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // 内核白光
            ctx.globalAlpha = warnPulse * 0.4;
            ctx.fillStyle = '#fff8dd';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 18, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // 屏幕顶部预警光带（从上往下扩散）
            const bandHeight = 60 * progress;
            const bandAlpha = 0.15 + Math.sin(now / 80) * 0.08;
            ctx.globalAlpha = bandAlpha * progress;
            const bandGrad = ctx.createLinearGradient(0, 0, 0, bandHeight);
            bandGrad.addColorStop(0, '#ffcc00');
            bandGrad.addColorStop(0.5, '#ff8800');
            bandGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = bandGrad;
            ctx.fillRect(0, 0, LOGICAL_W, bandHeight);

            // 预警列标记线
            ctx.globalAlpha = bandAlpha * 0.5 * progress;
            ctx.strokeStyle = '#ffcc44';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 8]);
            const colGap = b.def.rainColGap;
            const startX = (LOGICAL_W - colGap * (b.def.rainColumns - 1)) / 2;
            for (let i = 0; i < b.def.rainColumns; i++) {
                const lx = startX + i * colGap;
                ctx.beginPath();
                ctx.moveTo(lx, 0);
                ctx.lineTo(lx, bandHeight + 40 * progress);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            ctx.restore();
        }

        // ─── 天降神雨施放中：底部金光脉冲 ───
        if (b.skillState === 'rain') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const rainPulse = 0.4 + Math.sin(now / 40) * 0.2;
            ctx.globalAlpha = rainPulse;
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 35, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = rainPulse * 0.5;
            ctx.fillStyle = '#fff8dd';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 15, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 屏幕顶部持续金光
            ctx.globalAlpha = 0.08 + Math.sin(now / 100) * 0.04;
            const topGrad = ctx.createLinearGradient(0, 0, 0, 80);
            topGrad.addColorStop(0, '#ffcc00');
            topGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = topGrad;
            ctx.fillRect(0, 0, LOGICAL_W, 80);

            ctx.restore();
        }

        // ─── 神力横扫预警：两侧金色能量汇聚 ───
        if (b.skillState === 'sweep_warn') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const sweepWarnPulse = 0.3 + Math.sin(now / 50) * 0.2;
            ctx.globalAlpha = sweepWarnPulse;
            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 35 + Math.sin(now / 60) * 10, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ─── 神力横扫中：炮口金光 ───
        if (b.skillState === 'sweep') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const muzzlePulse = 0.5 + Math.sin(now / 30) * 0.3;
            ctx.globalAlpha = muzzlePulse;
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffcc44';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 3, 25, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = muzzlePulse * 0.6;
            ctx.fillStyle = '#fff8dd';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 3, 12, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ─── 天罚之柱预警：锁定标记 ───
        if (b.skillState === 'pillar_warn') {
            const targetX = b.pillarTargetX;
            const elapsed = now - b.skillStartTime;
            const progress = elapsed / b.def.pillarWarnDuration;
            const lockPulse = 0.3 + Math.sin(now / 80) * 0.2;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // 锁定十字
            ctx.globalAlpha = lockPulse * 0.6;
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 15;
            const crossSize = 30 + Math.sin(now / 100) * 8;
            ctx.beginPath();
            ctx.moveTo(targetX - crossSize, LOGICAL_H / 2);
            ctx.lineTo(targetX + crossSize, LOGICAL_H / 2);
            ctx.moveTo(targetX, LOGICAL_H / 2 - crossSize);
            ctx.lineTo(targetX, LOGICAL_H / 2 + crossSize);
            ctx.stroke();

            // 锁定圆环（随进度收缩）
            const lockR = 60 * (1 - progress * 0.5) + 15;
            ctx.globalAlpha = lockPulse * 0.4;
            ctx.strokeStyle = '#ffdd44';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.arc(targetX, LOGICAL_H / 2, lockR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // 预警光柱轮廓（从上到下的虚线）
            ctx.globalAlpha = lockPulse * 0.25 * progress;
            ctx.fillStyle = '#ffcc00';
            ctx.shadowBlur = 20;
            const pw = b.def.pillarWidth * progress;
            ctx.fillRect(targetX - pw / 2, 0, pw, LOGICAL_H);

            // Boss 底部蓄力
            ctx.globalAlpha = lockPulse * 0.7;
            ctx.fillStyle = '#ffaa00';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 30 + Math.sin(now / 60) * 10, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // ─── 天罚之柱施放中：金色光柱 ───
        if (b.skillState === 'pillar_fire') {
            const targetX = b.pillarTargetX;
            const elapsed = now - b.skillStartTime;
            const fadeIn = Math.min(elapsed / 200, 1);
            const fadeOut = elapsed > b.def.pillarDuration - 300
                ? (b.def.pillarDuration - elapsed) / 300 : 1;
            const alpha = fadeIn * fadeOut;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // 主光柱
            const pw = b.def.pillarWidth;
            const pillarAlpha = alpha * (0.25 + Math.sin(now / 30) * 0.08);
            ctx.globalAlpha = pillarAlpha;
            const pillarGrad = ctx.createLinearGradient(targetX - pw / 2, 0, targetX + pw / 2, 0);
            pillarGrad.addColorStop(0, 'transparent');
            pillarGrad.addColorStop(0.2, '#ffaa00');
            pillarGrad.addColorStop(0.5, '#ffdd44');
            pillarGrad.addColorStop(0.8, '#ffaa00');
            pillarGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = pillarGrad;
            ctx.fillRect(targetX - pw / 2, 0, pw, LOGICAL_H);

            // 光柱内核（更亮更窄）
            ctx.globalAlpha = pillarAlpha * 0.6;
            ctx.fillStyle = '#fff8dd';
            ctx.fillRect(targetX - pw * 0.15, 0, pw * 0.3, LOGICAL_H);

            // 光柱边缘射线
            ctx.globalAlpha = alpha * 0.15;
            ctx.strokeStyle = '#ffcc44';
            ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const rx = targetX + (Math.random() - 0.5) * pw;
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.lineTo(rx + (Math.random() - 0.5) * 20, LOGICAL_H);
                ctx.stroke();
            }

            // Boss 底部能量汇聚
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = '#ffcc00';
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 35, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
});

// ══════════════════════════════════════
//  天降神雨：发射一波弹幕
// ══════════════════════════════════════
function _fireRainWave(boss, G, def, waveIndex) {
    const colCount = def.rainColumns;
    const colGap = def.rainColGap;
    const totalWidth = colGap * (colCount - 1);
    const startX = (LOGICAL_W - totalWidth) / 2;

    // 奇偶波整体偏移半列间距，形成交错但保留宽走廊
    const offset = (waveIndex % 2 === 0) ? 0 : colGap / 2;

    for (let i = 0; i < colCount; i++) {
        const colX = startX + i * colGap + offset;

        // 超出屏幕边界则跳过
        if (colX < -20 || colX > LOGICAL_W + 20) continue;

        G.enemyBullets.push({
            x: colX - 6,
            y: -15,
            width: 12,
            height: 14,
            vx: 0,
            vy: def.rainBulletSpeed + Math.random() * 0.2,
            isBoss: true,
            color: '#ffcc00',
            emberTrail: true
        });
    }

    // 发射口爆裂粒子
    if (G.particles.length < PARTICLE_LIMIT) {
        const cx = boss.x + boss.width / 2;
        const cy = boss.y + boss.height;
        for (let k = 0; k < 6; k++) {
            G.particles.push({
                x: cx + (Math.random() - 0.5) * boss.width * 0.8,
                y: cy + Math.random() * 10,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 2 + 1,
                life: 8 + Math.random() * 6, maxLife: 14,
                color: Math.random() > 0.3 ? '#ffcc44' : '#ff8800',
                size: 3 + Math.random() * 3,
                gravity: 0.05, isPixel: true, drawPass: PASS_CORE,
                rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.4
            });
        }
    }

    // 小幅屏幕震动
    G.screenShake = Math.max(G.screenShake, 2);
}

// ══════════════════════════════════════
//  神力横扫：发射扇形弹幕
// ══════════════════════════════════════
function _fireSweepBullets(boss, G, def) {
    const cx = boss.x + boss.width / 2;
    const cy = boss.y + boss.height;
    const count = def.sweepBulletCount;

    for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const angle = (t - 0.5) * 50; // -25° ~ +25°
        const rad = angle * Math.PI / 180;
        const speed = def.sweepBulletSpeed + Math.sin(Date.now() / 200 + i) * 0.15;

        G.enemyBullets.push({
            x: cx - 6,
            y: cy,
            width: 12,
            height: 12,
            vx: Math.sin(rad) * speed,
            vy: Math.cos(rad) * speed,
            isBoss: true,
            color: '#ffbb22',
            emberTrail: true
        });
    }

    // 发射口粒子
    if (G.particles.length < PARTICLE_LIMIT) {
        for (let k = 0; k < 4; k++) {
            G.particles.push({
                x: cx + (Math.random() - 0.5) * 20,
                y: cy,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 3 + 1,
                life: 6 + Math.random() * 6, maxLife: 12,
                color: Math.random() > 0.3 ? '#ffcc44' : '#ffaa00',
                size: 2 + Math.random() * 3,
                gravity: 0.05, isPixel: true, drawPass: PASS_CORE,
                rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.4
            });
        }
    }
}

// ══════════════════════════════════════
//  天罚之柱结束：散射弹幕
// ══════════════════════════════════════
function _firePillarBurst(boss, G, def) {
    const cx = boss.x + boss.width / 2;
    const cy = boss.y + boss.height;
    const count = 12;
    const speed = 2.0;

    for (let i = 0; i < count; i++) {
        const rad = (i / count) * Math.PI * 2;
        G.enemyBullets.push({
            x: cx - 5,
            y: cy,
            width: 10,
            height: 10,
            vx: Math.cos(rad) * speed,
            vy: Math.sin(rad) * speed,
            isBoss: true,
            color: '#ffcc00',
            emberTrail: true
        });
    }

    // 散射爆裂粒子
    if (G.particles.length < PARTICLE_LIMIT) {
        for (let k = 0; k < 15; k++) {
            const a = Math.random() * 6.28;
            const s = Math.random() * 4 + 2;
            G.particles.push({
                x: cx, y: cy,
                vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                life: 12 + Math.random() * 8, maxLife: 20,
                color: Math.random() > 0.5 ? '#ffcc44' : '#ff8800',
                size: 3 + Math.random() * 4,
                gravity: 0.03, isPixel: true, drawPass: PASS_CORE,
                rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.4
            });
        }
    }

    G.screenShake = 5;
}
