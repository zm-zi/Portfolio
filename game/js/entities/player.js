// 玩家 + 僚机

function updatePlayer() {
    const p = G.player;
    const dt = G.game.dt;
    const spd = (p._vortexSlowdown ? p.speed * 0.5 : p.speed) * dt;
    if (keys.left && p.x > 0) p.x -= spd;
    if (keys.right && p.x < LOGICAL_W - p.width) p.x += spd;
    if (keys.up && p.y > 0) p.y -= spd;
    if (keys.down && p.y < LOGICAL_H - p.height) p.y += spd;

    // 记录拖尾轨迹点（每帧追加，尾部淘汰）
    // 即使不移动，也加入微抖动让引擎尾焰始终可见
    const cx = p.x + p.width / 2 + (Math.random() - 0.5) * 2;
    const cy = p.y + p.height + (Math.random() - 0.5) * 1;
    p.trailPoints.push(cx, cy);
    if (p.trailPoints.length > TRAIL_MAX_POINTS * 2) {
        p.trailPoints.splice(0, 2);
    }

    // 镀层计时：无敌和超频期间不计时
    if (p.platingLevel > 0 && !p.hasPlating && !p.isInvincible && !p.isOverclock) {
        p.platingTimer = (p.platingTimer || 0) + dt;
        if (p.platingTimer >= 2000) { // 2000帧 @200fps = 10秒
            p.hasPlating = true;
            p.platingTimer = 0;
        }
    }
    if (p.platingBroken > 0) p.platingBroken -= dt;
}

function updateInvincible() {
    const p = G.player;
    const dt = G.game.dt;
    if (p.isOverclock) {
        // 超频期间：无敌且无敌计时器不减少
        p.isInvincible = true;
        p.invincibleTime = INVINCIBLE_DURATION;
        if (gameNow() >= p.overclockEndTime) deactivateOverclock();
    } else {
        if (p.isInvincible) {
            p.invincibleTime -= dt;
            if (p.invincibleTime <= 0) p.isInvincible = false;
        }
    }
    if (p.hitEffect > 0) p.hitEffect -= dt;
}

function activateOverclock() {
    const p = G.player;
    if (p.isOverclock || p.energy < OVERCLOCK_MAX_ENERGY) return;
    p.isOverclock = true;
    overdriveBurst();
    const extraDuration = (p.overclockDurationStacks || 0) * OVERCLOCK_DURATION_PER_STACK;
    p.overclockEndTime = gameNow() + OVERCLOCK_DURATION + extraDuration;
    p.energy = 0;
    p.isInvincible = true;
    p.invincibleTime = INVINCIBLE_DURATION;
}

function deactivateOverclock() {
    const p = G.player;
    if (!p.isOverclock) return;
    p.isOverclock = false;
}

function _makeBullet(x, y, damage) {
    const p = G.player;
    const b = { x, y, width: 6, height: 28, damage };
    if (p.pierceLevel >= 1) {
        b.pierceCount = (p.pierceLevel >= 3) ? 2 : 1;
        if (p.pierceLevel === 1) b.damage = damage * 0.5;
        b.hitSet = new Set();
    }
    return b;
}

function _fireWingmanAndMissiles(p, now) {
    // 僚机：独立射速，不与主机耦合
    const wl = p.wingmanLevel || 0;
    const wingmanFireRate = Math.round(FIRE_RATE * 2 / (p.wingmanFireRateMultiplier || 1));
    if (wl > 0 && now - p.wingmanLastFireTime >= wingmanFireRate) {
        const wDamage = 0.5 * (p.wingmanDamageMultiplier || 1);
        if (wl >= 1) {
            G.wingmanBullets.push({ x: p.x - 20, y: p.y + 20, width: 6, height: 12, damage: wDamage });
            G.wingmanBullets.push({ x: p.x + p.width + 14, y: p.y + 20, width: 6, height: 12, damage: wDamage });
        }
        if (wl >= 2) {
            G.wingmanBullets.push({ x: p.x - 35, y: p.y + 30, width: 5, height: 10, damage: wDamage });
            G.wingmanBullets.push({ x: p.x + p.width + 29, y: p.y + 30, width: 5, height: 10, damage: wDamage });
        }
        p.wingmanLastFireTime = now;
    }

    // 追踪导弹（词条：每3秒发射一枚，追踪最近敌人；升级后间隔缩短/数量增加）
    const missileInterval = Math.max(200, PLAYER_MISSILE_INTERVAL - (p.homingMissileLevel - 1) * 1000);
    const missileCount = p.homingMissileCount || 1;
    if (p.homingMissileLevel > 0 && now - p.lastHomingMissileTime >= missileInterval) {
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        // 找最近敌人（包括Boss）作为目标
        let target = null;
        let minDist = Infinity;
        for (const e of G.enemies) {
            const ecx = e.x + e.width / 2;
            const ecy = e.y + e.height / 2;
            const dist = Math.hypot(ecx - cx, ecy - cy);
            if (dist < minDist) { minDist = dist; target = e; }
        }
        // 检查Boss
        if (G.boss) {
            const bx = G.boss.x + G.boss.width / 2;
            const by = G.boss.y + G.boss.height / 2;
            const dist = Math.hypot(bx - cx, by - cy);
            if (dist < minDist) { minDist = dist; target = G.boss; }
        }
        // 无敌人时向下飞
        // 水平展开发射
        const spread = 15; // 左右偏移像素
        for (let i = 0; i < missileCount; i++) {
            const offsetX = (i - (missileCount - 1) / 2) * spread;
            const angle = target
                ? Math.atan2(target.y + target.height / 2 - cy, target.x + target.width / 2 - cx + offsetX)
                : Math.PI / 2;
            G.homingMissiles.push({
                x: cx - 5 + offsetX,
                y: cy,
                width: 10,
                height: 10,
                vx: Math.cos(angle) * PLAYER_MISSILE_SPEED,
                vy: Math.sin(angle) * PLAYER_MISSILE_SPEED,
                angle: angle,
                life: 180, // 3秒后消失
                damage: 2
            });
        }
        p.lastHomingMissileTime = now;
    }
}

function fireBullets() {
    const p = G.player;
    const now = gameNow();
    const damage = p.bulletDamage || 1;

    // 赤红号激光不走子弹系统，跳过 fire 逻辑
    const craft = CRAFT.get(p.aircraftType);
    if (!craft || craft.isLaser) {
        _fireWingmanAndMissiles(p, now);
        return;
    }

    const effectiveFireRate = p.isOverclock ? Math.round(p.currentFireRate / OVERCLOCK_FIRE_RATE_DIV * (p.fireSurge ? 0.8 : 1)) : p.currentFireRate;
    if (now - p.lastFireTime >= effectiveFireRate) {
        craft.fire(p, damage);
        p.lastFireTime = now;
        playAttackSound();
    }

    _fireWingmanAndMissiles(p, now);
}
