// Boss：冰邪王
BOSS.register({
    id: 'ice_evil_king',
    name: '冰邪王',
    spawnScore: 400,
    hp: 200,
    width: 300,
    height: 225,
    skillInterval: 4000,
    iceCount: 8,            // 扫射冰锥总数
    iceFireInterval: 150,   // 每枚间隔 0.15s
    iceSpeed: 2.5,
    shieldDuration: 5000,   // 冰墙持续时间
    vortexGrowRate: 0.33,   // 漩涡每帧膨胀（~20px/秒 @60fps）
    vortexMaxRadius: 150,
    vortexDuration: 4000,   // 漩涡持续时间
    vortexFireInterval: 400,// 漩涡射弹间隔 ms
    vortexSpikeSpeed: 1.8,
    imgSrc: 'image/Boss3-冰邪王.png',
    actionImgSrc: 'image/Boss3-冰邪王动作帧率.png',

    update(b, G, now) {
        const def = b.def;
        const dt = G.game.dt;

        if (b.skillState === 'idle') {
            b.x += Math.sin(now / 1000) * 0.5 * dt;
            if (b.x < 0) b.x = 0;
            if (b.x > LOGICAL_W - b.width) b.x = LOGICAL_W - b.width;

            // 冰墙持续时间到了或被摧毁，清除
            if (G.iceShields.length > 0 && b.shieldStartTime && now - b.shieldStartTime >= def.shieldDuration) {
                G.iceShields.length = 0;
                b.shieldStartTime = 0;
            }

            if (now - b.lastSkillTime >= def.skillInterval) {
                const rand = Math.random();
                if (rand < 0.35) {
                    b.skillState = 'ice_sweep';
                    b.firedCount = 0;
                    b.lastBulletTime = 0;
                } else if (rand < 0.65) {
                    b.skillState = 'ice_wall';
                    _spawnIceWall(b, G, def);
                    b.shieldStartTime = now;
                } else {
                    b.skillState = 'ice_vortex_cast';
                    // 锁定屏幕中心
                    b.vortexTargetX = LOGICAL_W / 2;
                    b.vortexTargetY = LOGICAL_H / 2;
                }
                b.skillStartTime = now;
                BOSS.startSkillAnim(b);
            }
        } else if (b.skillState === 'ice_wall') {
            // 冰墙施放中，Boss 不动，1s 后回到 idle
            if (now - b.skillStartTime >= 1000) {
                b.skillState = 'idle';
                b.lastSkillTime = now;
                BOSS.endSkillAnim(b);
            }
        } else if (b.skillState === 'ice_sweep') {
            // 扫射期间 Boss 不动

            if (b.firedCount < def.iceCount) {
                const interval = b.firedCount === 0 ? 0 : def.iceFireInterval;
                if (now - (b.lastBulletTime || b.skillStartTime) >= interval) {
                    _fireIceCone(b, G, def, b.firedCount);
                    b.firedCount++;
                    b.lastBulletTime = now;
                }
            }

            // 最后一枚发出后等 1.5s 再结束
            if (b.firedCount >= def.iceCount && now - b.lastBulletTime >= 1500) {
                b.skillState = 'idle';
                b.lastSkillTime = now;
                BOSS.endSkillAnim(b);
            }
        } else if (b.skillState === 'ice_vortex_cast') {
            // 施放阶段：Boss 不动，1s 后在锁定位置生成漩涡
            if (now - b.skillStartTime >= 1000) {
                _spawnIceVortex(b, G, def, b.vortexTargetX, b.vortexTargetY);
                b.skillState = 'ice_vortex_active';
                b.skillStartTime = now;
            }
        } else if (b.skillState === 'ice_vortex_active') {
            // 漩涡持续期间：Boss 不动，更新所有漩涡
            _updateIceVortexes(G, now);

            // 漩涡全部消失或超时 → 结束
            if (G.iceVortexes.length === 0 || now - b.skillStartTime >= def.vortexDuration + 500) {
                // 安全清理剩余漩涡（触发散射）
                _endAllVortexes(G);
                b.skillState = 'idle';
                b.lastSkillTime = now;
                BOSS.endSkillAnim(b);
            }
        }

        // 每帧重置减速标志（由漩涡 update 负责设置）
        G.player._vortexSlowdown = false;
    },

    draw(b, ctx) {
        BOSS.drawFrame(b, ctx, 150, 4);

        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const now = Date.now();

        // ─── 待机：冰霜粒子（从身体飘落）───
        if (b.skillState === 'idle') {
            if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.35) {
                const px = b.x + b.width * 0.2 + Math.random() * b.width * 0.6;
                const py = b.y + b.height * 0.3 + Math.random() * b.height * 0.5;
                const isWhite = Math.random() > 0.4;
                G.particles.push({
                    x: px, y: py,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: Math.random() * 0.5 + 0.2,
                    life: 15 + Math.random() * 10, maxLife: 25,
                    color: isWhite ? '#ddeeff' : '#88ccff',
                    size: 1 + Math.random() * 1.5,
                    gravity: 0.01, drawPass: PASS_CIRCLE,
                    glowColor: '#44aaff'
                });
            }
        }

        // ─── 待机：底部冰晶微光 ───
        if (b.skillState === 'idle') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const pulseA = 0.12 + Math.sin(now / 200) * 0.06;
            ctx.globalAlpha = pulseA;
            ctx.fillStyle = '#4488ff';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, b.width * 0.35, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            // 内核亮白
            ctx.globalAlpha = pulseA * 0.5;
            ctx.fillStyle = '#aaddff';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, b.width * 0.15, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ─── 待机：冰晶光环环绕 ───
        if (b.skillState === 'idle') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const ringR = Math.max(b.width, b.height) * 0.55;
            const ringAlpha = 0.08 + Math.sin(now / 300) * 0.04;
            ctx.globalAlpha = ringAlpha;
            ctx.strokeStyle = '#66bbff';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#4488ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.ellipse(cx, cy, ringR, ringR * 0.7, 0, 0, Math.PI * 2);
            ctx.stroke();
            // 内环
            ctx.globalAlpha = ringAlpha * 0.6;
            ctx.strokeStyle = '#aaeeff';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.ellipse(cx, cy, ringR * 0.7, ringR * 0.5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // ─── 冰锥扫射：底部蓄力蓝光 ───
        if (b.skillState === 'ice_sweep') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const chargePulse = 0.4 + Math.sin(now / 50) * 0.2;
            ctx.globalAlpha = chargePulse;
            ctx.fillStyle = '#4488ff';
            ctx.shadowColor = '#2266dd';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 3, 30 + Math.sin(now / 80) * 10, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            // 内核白光
            ctx.globalAlpha = chargePulse * 0.5;
            ctx.fillStyle = '#cceeff';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 3, 14, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ─── 冰墙施放：冰能量汇聚效果 ───
        if (b.skillState === 'ice_wall') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const castA = 0.3 + Math.sin(now / 80) * 0.15;
            ctx.globalAlpha = castA;
            ctx.fillStyle = '#4488ff';
            ctx.shadowColor = '#2266dd';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 20, b.width * 0.4, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = castA * 0.4;
            ctx.fillStyle = '#aaddff';
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 20, b.width * 0.2, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ─── 漩涡施放：冰能量锁定目标 ───
        if (b.skillState === 'ice_vortex_cast') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const castPulse = 0.35 + Math.sin(now / 60) * 0.15;
            // Boss底部蓄力
            ctx.globalAlpha = castPulse;
            ctx.fillStyle = '#4488ff';
            ctx.shadowColor = '#2266dd';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 25, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            // 锁定点预示光环
            if (b.vortexTargetX !== undefined) {
                const tx = b.vortexTargetX;
                const ty = b.vortexTargetY;
                const lockR = 40 + Math.sin(now / 100) * 10;
                ctx.globalAlpha = castPulse * 0.5;
                ctx.strokeStyle = '#66bbff';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(tx, ty, lockR, 0, Math.PI * 2);
                ctx.stroke();
                // 十字标记
                ctx.globalAlpha = castPulse * 0.3;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tx - lockR * 0.6, ty);
                ctx.lineTo(tx + lockR * 0.6, ty);
                ctx.moveTo(tx, ty - lockR * 0.6);
                ctx.lineTo(tx, ty + lockR * 0.6);
                ctx.stroke();
            }
            ctx.restore();
        }

        // ─── 漩涡活跃中：Boss底部蓝光脉冲 ───
        if (b.skillState === 'ice_vortex_active') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const va = 0.2 + Math.sin(now / 120) * 0.1;
            ctx.globalAlpha = va;
            ctx.fillStyle = '#4488ff';
            ctx.shadowColor = '#2266dd';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.ellipse(cx, b.y + b.height + 5, 20, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
});

// 发射冰锥：8 枚依次发射，角度从 -50° 扫到 +50°，形成弧线
function _fireIceCone(boss, G, def, index) {
    const cx = boss.x + boss.width / 2;
    const cy = boss.y + boss.height;
    const total = def.iceCount;

    // 线性扫过：第0枚 -50°，最后一枚 +50°
    const startAngle = -50;
    const endAngle = 50;
    const angle = startAngle + (endAngle - startAngle) * (index / (total - 1));
    const rad = angle * Math.PI / 180;

    G.enemyBullets.push({
        x: cx - 9,
        y: cy,
        width: 18,
        height: 27,
        vx: Math.sin(rad) * def.iceSpeed,
        vy: Math.cos(rad) * def.iceSpeed,
        isBoss: true,
        iceTrail: true,
        img: G.iceImg || null
    });
}

// 召唤冰墙：Boss 面前一面整块冰墙，血量 = Boss 血量的 1/10
function _spawnIceWall(boss, G, def) {
    G.iceShields.length = 0;
    const wallHp = Math.round(boss.hp / 10);
    G.iceShields.push({
        x: boss.x,
        y: boss.y + boss.height,
        width: boss.width,
        height: 40,
        hp: wallHp,
        maxHp: wallHp,
        shakeTimer: 0
    });
}

// 绘制冰墙
function drawIceShields() {
    const ctx = Game.ctx;
    const now = Date.now();
    for (let i = 0; i < G.iceShields.length; i++) {
        const s = G.iceShields[i];
        const hpRatio = s.hp / s.maxHp;
        const alpha = 0.5 + 0.5 * hpRatio;
        let ox = 0, oy = 0;
        if (s.shakeTimer > 0) {
            const intensity = s.shakeTimer;
            ox = (Math.random() * 2 - 1) * intensity;
            oy = (Math.random() * 2 - 1) * intensity;
            s.shakeTimer -= G.game.dt;
        }
        const sx = s.x + ox;
        const sy = s.y + oy;

        // 冰墙底部蓝光
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.2 * hpRatio;
        ctx.fillStyle = '#4488ff';
        ctx.shadowColor = '#2266dd';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.ellipse(sx + s.width / 2, sy + s.height + 3, s.width * 0.45, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 冰墙本体
        ctx.globalAlpha = alpha;
        ctx.drawImage(G.iceWallImg, sx, sy, s.width, s.height);

        // 冰墙表面冰晶光泽
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const shimmer = 0.08 + Math.sin(now / 200 + i) * 0.05;
        ctx.globalAlpha = shimmer * hpRatio;
        const grad = ctx.createLinearGradient(sx, sy, sx + s.width, sy + s.height);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.4, '#aaeeff');
        grad.addColorStop(0.6, 'transparent');
        grad.addColorStop(1, '#88ccff');
        ctx.fillStyle = grad;
        ctx.fillRect(sx, sy, s.width, s.height);
        ctx.restore();

        ctx.globalAlpha = 1;
    }
}

// ══════════════════════════════════════════
//  冰霜漩涡系统
// ══════════════════════════════════════════

function _spawnIceVortex(boss, G, def, targetX, targetY) {
    G.iceVortexes.push({
        x: targetX,
        y: targetY,
        radius: 80,
        maxRadius: def.vortexMaxRadius,
        growRate: def.vortexGrowRate,
        duration: def.vortexDuration,
        startTime: Date.now(),
        fireInterval: def.vortexFireInterval,
        lastFireTime: 0,
        spikeSpeed: def.vortexSpikeSpeed,
        angle: 0           // 旋转角度
    });
}

function _updateIceVortexes(G, now) {
    const player = G.player;
    const dt = G.game.dt;
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;

    for (let i = G.iceVortexes.length - 1; i >= 0; i--) {
        const v = G.iceVortexes[i];
        const elapsed = now - v.startTime;

        // 膨胀
        if (v.radius < v.maxRadius) {
            v.radius += v.growRate * dt;
            if (v.radius > v.maxRadius) v.radius = v.maxRadius;
        }

        // 顺时针旋转
        v.angle += 0.03 * dt;

        // 玩家减速检测
        const dx = pcx - v.x;
        const dy = pcy - v.y;
        if (dx * dx + dy * dy < v.radius * v.radius) {
            player._vortexSlowdown = true;
        }

        // 从漩涡边缘朝中心射冰刺
        if (v.lastFireTime === 0) v.lastFireTime = v.startTime;
        if (now - v.lastFireTime >= v.fireInterval) {
            _fireVortexSpikes(v, G);
            v.lastFireTime = now;
        }

        // 漩涡结束 → 360° 散射
        if (elapsed >= v.duration) {
            _fireVortexBurst(v, G);
            G.iceVortexes.splice(i, 1);
        }
    }
}
// 别名：供 gameLoop.js 在 Boss 不存在时调用
const _updateIceVortexesGlobal = _updateIceVortexes;

// 从漩涡边缘朝中心射出 2 枚冰刺（左右对称偏移）
function _fireVortexSpikes(v, G) {
    // 随机选两个方向朝中心
    for (let k = 0; k < 2; k++) {
        const randAngle = Math.random() * Math.PI * 2;
        // 边缘起点
        const edgeX = v.x + Math.cos(randAngle) * v.radius * 0.9;
        const edgeY = v.y + Math.sin(randAngle) * v.radius * 0.9;
        // 朝中心方向
        const toCx = v.x - edgeX;
        const toCy = v.y - edgeY;
        const dist = Math.sqrt(toCx * toCx + toCy * toCy) || 1;

        G.enemyBullets.push({
            x: edgeX - 7,
            y: edgeY - 10,
            width: 14,
            height: 20,
            vx: (toCx / dist) * v.spikeSpeed,
            vy: (toCy / dist) * v.spikeSpeed,
            isBoss: true,
            iceTrail: true,
            iceSpike: true,
            img: G.iceImg || null
        });
    }
}

// 漩涡结束时 360° 散射弹幕
function _fireVortexBurst(v, G) {
    const count = 8;
    const speed = 2.2;
    for (let i = 0; i < count; i++) {
        const rad = (i / count) * Math.PI * 2;
        G.enemyBullets.push({
            x: v.x - 7,
            y: v.y - 10,
            width: 14,
            height: 20,
            vx: Math.cos(rad) * speed,
            vy: Math.sin(rad) * speed,
            isBoss: true,
            iceTrail: true,
            iceSpike: true,
            img: G.iceImg || null
        });
    }
}

// 安全清理所有剩余漩涡（触发散射）
function _endAllVortexes(G) {
    for (const v of G.iceVortexes) {
        _fireVortexBurst(v, G);
    }
    G.iceVortexes.length = 0;
}

// 绘制冰霜漩涡
function drawIceVortexes() {
    const ctx = Game.ctx;
    const img = G.iceVortexImg;
    const now = Date.now();

    for (let i = 0; i < G.iceVortexes.length; i++) {
        const v = G.iceVortexes[i];
        const elapsed = now - v.startTime;
        const lifeRatio = 1 - elapsed / v.duration;
        // 渐隐：最后 1 秒开始变淡
        const alpha = lifeRatio < 0.25 ? lifeRatio * 4 : 1;

        // 外层蓝光辐射
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.15;
        const glowGrad = ctx.createRadialGradient(v.x, v.y, v.radius * 0.2, v.x, v.y, v.radius * 1.2);
        glowGrad.addColorStop(0, '#4488ff');
        glowGrad.addColorStop(0.5, '#2255cc');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 漩涡精灵图
        if (img && img.complete) {
            const size = v.radius * 2 * 1.3;
            ctx.save();
            ctx.globalAlpha = alpha * 0.8;
            ctx.translate(v.x, v.y);
            ctx.rotate(v.angle);
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
            ctx.restore();
        }

        // 漩涡边缘冰晶环
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * (0.12 + Math.sin(now / 150) * 0.05);
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 冰刺环绕旋转标记（6个小点沿边缘旋转）
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = '#aaddff';
        for (let k = 0; k < 6; k++) {
            const a = v.angle + (k / 6) * Math.PI * 2;
            const dx = Math.cos(a) * v.radius * 0.85;
            const dy = Math.sin(a) * v.radius * 0.85;
            ctx.beginPath();
            ctx.arc(v.x + dx, v.y + dy, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
