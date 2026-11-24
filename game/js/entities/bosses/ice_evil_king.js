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
                if (!b.skillVariant) b.skillVariant = 0;
                const variant = b.skillVariant % 3;
                if (variant === 0) {
                    b.skillState = 'ice_sweep';
                    b.firedCount = 0;
                    b.lastBulletTime = 0;
                } else if (variant === 1) {
                    b.skillState = 'ice_wall';
                    _spawnIceWall(b, G, def);
                    b.shieldStartTime = now;
                } else {
                    b.skillState = 'ice_vortex_cast';
                    // 锁定屏幕中心
                    b.vortexTargetX = LOGICAL_W / 2;
                    b.vortexTargetY = LOGICAL_H / 2;
                }
                b.skillVariant = (b.skillVariant || 0) + 1;
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

        // 非漩涡活跃状态时重置减速标志；漩涡活跃时由 _updateIceVortexes 设置
        if (b.skillState !== 'ice_vortex_active') {
            G.player._vortexSlowdown = false;
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
        iceTrail: true
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
        startTime: gameNow(),
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
            iceSpike: true
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
            iceSpike: true
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
