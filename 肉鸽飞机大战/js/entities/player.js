// 玩家 + 僚机
let _planeImg = null;

function initPlayer(img) {
    _planeImg = img;
}

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
        if (Date.now() >= p.overclockEndTime) deactivateOverclock();
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
    const extraDuration = (p.overclockDurationStacks || 0) * OVERCLOCK_DURATION_PER_STACK;
    p.overclockEndTime = Date.now() + OVERCLOCK_DURATION + extraDuration;
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

function fireBullets() {
    const p = G.player;
    const now = Date.now();
    const damage = p.bulletDamage || 1;

    const effectiveFireRate = p.isOverclock ? Math.round(p.currentFireRate / OVERCLOCK_FIRE_RATE_DIV) : p.currentFireRate;
    if (now - p.lastFireTime >= effectiveFireRate) {
        if (p.doubleShot) {
            G.bullets.push(_makeBullet(p.x + p.width / 2 - 12, p.y, damage));
            G.bullets.push(_makeBullet(p.x + p.width / 2 + 6, p.y, damage));
        } else {
            G.bullets.push(_makeBullet(p.x + p.width / 2 - 3, p.y, damage));
        }
        p.lastFireTime = now;
        playAttackSound();
    }

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

function drawPlayerTrail() {
    const p = G.player;
    const pts = p.trailPoints;
    const count = pts.length / 2;
    if (count < 2) return;

    const ctx = Game.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isOC = p.isOverclock;
    const now = Date.now();

    const engineX = p.x + p.width / 2;
    const engineY = p.y + p.height;
    const TRAIL_LENGTH = 35;

    // 构建每段的几何数据（只算一次）
    const segs = [];
    for (let i = 1; i < count; i++) {
        const t = i / count;
        const x1 = pts[i * 2];
        const y1 = pts[i * 2 + 1];
        const dx = x1 - engineX;
        const dy = y1 - engineY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const flicker = 1 + Math.sin(now * 0.008 + i * 0.5) * 0.15;
        const extend = (1 - t) * TRAIL_LENGTH * flicker;
        let nx, ny;
        if (dist > 1) { nx = dx / dist; ny = dy / dist; }
        else { nx = 0; ny = 1; }
        segs.push({ t, x1, y1, tx: x1 + nx * extend, ty: y1 + ny * extend });
    }

    // 外层辉光（只对最亮的前 1/3 段用 shadowBlur，其余用半透明填充代替）
    const blurThreshold = Math.floor(segs.length * 0.65);
    for (let si = 0; si < segs.length; si++) {
        const { t, x1, y1, tx, ty } = segs[si];
        const alpha = t * 0.25;
        const width = t * 16 + 2;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = isOC ? '#ffaa00' : '#0088ff';
        ctx.lineWidth = width;
        if (si >= blurThreshold) {
            ctx.shadowBlur = 14;
            ctx.shadowColor = isOC ? '#ff8800' : '#0066ff';
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(tx, ty);
        ctx.stroke();
    }

    // 内层亮芯（不用 shadowBlur）
    ctx.shadowBlur = 0;
    for (const { t, x1, y1, tx, ty } of segs) {
        const alpha = t * 0.4;
        const width = t * 5 + 1;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = isOC ? '#ffdd44' : '#66ddff';
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(tx, ty);
        ctx.stroke();
    }

    ctx.restore();
}

function drawPlayer() {
    // 先画拖尾（在机体下方）
    drawPlayerTrail();
    const p = G.player;
    if (!p.isInvincible || Math.floor(Date.now() / 80) % 2 === 0) {
        Game.ctx.imageSmoothingEnabled = false;
        Game.ctx.drawImage(_planeImg, p.x, p.y, p.width, p.height);
    }
    // 超频时画光环特效
    if (p.isOverclock) {
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        const pulse = 0.4 + Math.sin(Date.now() / 80) * 0.3;
        Game.ctx.save();
        Game.ctx.globalAlpha = pulse;
        Game.ctx.strokeStyle = '#ffdd00';
        Game.ctx.lineWidth = 3;
        Game.ctx.shadowBlur = 15;
        Game.ctx.shadowColor = '#ff8800';
        Game.ctx.beginPath();
        Game.ctx.ellipse(cx, cy, p.width * 0.7, p.height * 0.6, 0, 0, Math.PI * 2);
        Game.ctx.stroke();
        Game.ctx.restore();
    }
    // 镀层特效
    if (p.platingBroken > 0) {
        // 破碎：闪烁白色碎片
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        const alpha = Math.max(0, p.platingBroken) / 15;
        Game.ctx.save();
        Game.ctx.globalAlpha = alpha;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.01;
            const r = 30 + (15 - Math.max(0, p.platingBroken)) * 3;
            Game.ctx.fillStyle = '#ffffff';
            Game.ctx.fillRect(cx + Math.cos(angle) * r - 2, cy + Math.sin(angle) * r - 2, 4, 4);
        }
        Game.ctx.restore();
    } else if (p.hasPlating) {
        // 镀层存在：金色外壳光环
        const cx = p.x + p.width / 2;
        const cy = p.y + p.height / 2;
        const pulse = 0.5 + Math.sin(Date.now() / 120) * 0.3;
        Game.ctx.save();
        Game.ctx.globalAlpha = pulse;
        Game.ctx.strokeStyle = '#ffd700';
        Game.ctx.lineWidth = 2;
        Game.ctx.shadowBlur = 12;
        Game.ctx.shadowColor = '#ffaa00';
        Game.ctx.beginPath();
        Game.ctx.ellipse(cx, cy, p.width * 0.55, p.height * 0.5, 0, 0, Math.PI * 2);
        Game.ctx.stroke();
        Game.ctx.restore();
    }
}

function drawWingman() {
    const p = G.player;
    const wl = p.wingmanLevel || 0;
    if (wl <= 0) return;
    if (p.isInvincible && Math.floor(Date.now() / 80) % 2 === 1) return;

    const positions = [
        { x: p.x - 25, y: p.y + 20 },
        { x: p.x + p.width + 15, y: p.y + 20 }
    ];
    if (wl >= 2) {
        positions.push({ x: p.x - 40, y: p.y + 30 });
        positions.push({ x: p.x + p.width + 30, y: p.y + 30 });
    }

    for (const pos of positions) {
        Game.ctx.fillStyle = '#44ddff';
        Game.ctx.beginPath();
        Game.ctx.moveTo(pos.x + 5, pos.y);
        Game.ctx.lineTo(pos.x, pos.y + 18);
        Game.ctx.lineTo(pos.x + 10, pos.y + 18);
        Game.ctx.closePath();
        Game.ctx.fill();
        Game.ctx.fillStyle = '#88eeff';
        Game.ctx.beginPath();
        Game.ctx.moveTo(pos.x + 5, pos.y + 4);
        Game.ctx.lineTo(pos.x + 2, pos.y + 14);
        Game.ctx.lineTo(pos.x + 8, pos.y + 14);
        Game.ctx.closePath();
        Game.ctx.fill();
    }
}
