// 碰撞检测
const _aabb = Game.Util.aabb;

// ═══════════════════════════════════════════
//  墨子号炸弹爆炸
// ═══════════════════════════════════════════

function createBombExplosion(x, y) {
    // 核心闪光
    for (let i = 0; i < 5; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 2 + 0.5;
        G.particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 12 + Math.random() * 10, maxLife: 22,
            color: '#ffffff', size: 5 + Math.random() * 8,
            gravity: 0.02, isPixel: true, drawPass: PASS_FLASH,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.6
        });
    }
    // 主色碎片（深蓝系）
    const mc = ['#2244aa', '#3355bb', '#1133aa', '#4466cc', '#2255cc'];
    for (let i = 0; i < 10; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 5.5 + 2;
        G.particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 36 + Math.random() * 28, maxLife: 64,
            color: mc[(Math.random() * 5) | 0], size: 5 + Math.random() * 10,
            gravity: 0.10, isPixel: true, drawPass: PASS_CORE,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.35
        });
    }
    // 亮色碎块
    const bc = ['#6688ff', '#88aaff', '#5577ee', '#99bbff'];
    for (let i = 0; i < 12; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 7 + 3;
        G.particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 20 + Math.random() * 24, maxLife: 44,
            color: bc[(Math.random() * 4) | 0], size: 2 + Math.random() * 5,
            gravity: 0.05, isPixel: true, drawPass: PASS_CORE,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.5
        });
    }
    // 火花条
    for (let i = 0; i < 8; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 8 + 4;
        G.particles.push({
            x, y,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 24 + Math.random() * 16, maxLife: 40,
            color: `rgb(${(50+Math.random()*60)|0},${(100+Math.random()*80)|0},255)`,
            size: 2 + Math.random() * 3,
            gravity: 0.02, isPixel: true, drawPass: PASS_SPARK,
            sparkLen: 20 + Math.random() * 28,
            sparkDx: Math.cos(a), sparkDy: Math.sin(a)
        });
    }
    // 烟雾
    for (let i = 0; i < 4; i++) {
        const a = Math.random() * 6.2832;
        const s = Math.random() * 1.2 + 0.3;
        G.particles.push({
            x: x + (Math.random() - 0.5) * 12,
            y: y + (Math.random() - 0.5) * 12,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 60 + Math.random() * 30, maxLife: 90,
            color: '#334455', size: 10 + Math.random() * 14,
            gravity: -0.04, isPixel: true, drawPass: PASS_SMOKE,
            rot: Math.random() * 6.28, rotV: (Math.random() - 0.5) * 0.08
        });
    }
    // 冲击波
    G.flashes.push({ x, y, r: 3, maxR: 50, life: 28, maxLife: 28, color: 4 });
    G.flashes.push({ x, y, r: 2, maxR: 30, life: 16, maxLife: 16, color: 2 });
}

function _processBombExplosions() {
    for (let i = G.bullets.length - 1; i >= 0; i--) {
        const b = G.bullets[i];
        if (!b.isBomb) continue;

        let shouldExplode = false;
        const radius = b.explosionRadius || MOZI_EXPLOSION_RADIUS;
        const bx = b.x + b.width / 2;
        const by = b.y + b.height / 2;

        // 检查是否飞出射程
        if (b.startX !== undefined) {
            const dx = b.x - b.startX;
            const dy = b.y - b.startY;
            if (dx * dx + dy * dy >= b.range * b.range) shouldExplode = true;
        }

        // 检查是否命中敌人或Boss（直接碰撞）
        if (!shouldExplode) {
            for (let j = G.enemies.length - 1; j >= 0; j--) {
                if (_aabb(b, G.enemies[j])) { shouldExplode = true; break; }
            }
            if (!shouldExplode && G.boss && !G.boss.isInvincible && _aabb(b, G.boss)) {
                shouldExplode = true;
            }
        }

        // 检查是否接近敌人/Boss 到爆炸范围内（近炸引信）
        if (!shouldExplode) {
            for (let j = 0; j < G.enemies.length; j++) {
                const e = G.enemies[j];
                const ecx = e.x + e.width / 2;
                const ecy = e.y + e.height / 2;
                if (Math.hypot(ecx - bx, ecy - by) <= radius) { shouldExplode = true; break; }
            }
            if (!shouldExplode && G.boss && !G.boss.isInvincible) {
                const bossCx = G.boss.x + G.boss.width / 2;
                const bossCy = G.boss.y + G.boss.height / 2;
                if (Math.hypot(bossCx - bx, bossCy - by) <= radius) shouldExplode = true;
            }
        }

        if (!shouldExplode) continue;

        // 爆炸
        const ex = bx;
        const ey = by;
        const dmg = b.explosionDamage || MOZI_EXPLOSION_DAMAGE;

        createBombExplosion(ex, ey);

        // AOE 对敌人造成伤害
        for (let j = G.enemies.length - 1; j >= 0; j--) {
            const e = G.enemies[j];
            const ecx = e.x + e.width / 2;
            const ecy = e.y + e.height / 2;
            if (Math.hypot(ecx - ex, ecy - ey) <= radius) {
                e.hp -= dmg;
                if (e.hp <= 0) {
                    _awardKill(e, G.enemies, j);
                } else {
                    e.hitFlash = 6;
                }
            }
        }
        // AOE 对 Boss 造成伤害（用圆-矩形最近点检测，Boss体型大，中心点距离判定不够）
        if (G.boss && !G.boss.isInvincible) {
            const closestX = Math.max(G.boss.x, Math.min(ex, G.boss.x + G.boss.width));
            const closestY = Math.max(G.boss.y, Math.min(ey, G.boss.y + G.boss.height));
            if (Math.hypot(closestX - ex, closestY - ey) <= radius) {
                G.boss.hp -= dmg;
                if (G.boss.hp <= 0) _killBoss();
            }
        }

        G.bullets.splice(i, 1);
    }
}

// 三角形碰撞：玩家受击面积为底朝下的等腰三角形
// t1x,t1y=顶点(上)  t2x,t2y=左底  t3x,t3y=右底
function _pointInTri(px, py, t1x, t1y, t2x, t2y, t3x, t3y) {
    const d1 = (px - t3x) * (t1y - t3y) - (t1x - t3x) * (py - t3y);
    const d2 = (px - t1x) * (t2y - t1y) - (t2x - t1x) * (py - t1y);
    const d3 = (px - t2x) * (t3y - t2y) - (t3x - t2x) * (py - t2y);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
}

// 线段交叉：p1-p2 与 p3-p4 是否相交（不含端点重叠）
function _segCross(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
    const d1 = (p3x - p1x) * (p2y - p1y) - (p3y - p1y) * (p2x - p1x);
    const d2 = (p4x - p1x) * (p2y - p1y) - (p4y - p1y) * (p2x - p1x);
    const d3 = (p1x - p3x) * (p4y - p3y) - (p1y - p3y) * (p4x - p3x);
    const d4 = (p2x - p3x) * (p4y - p3y) - (p2y - p3y) * (p4x - p3x);
    return (d1 * d2 < 0) && (d3 * d4 < 0);
}

// 矩形 vs 三角形碰撞检测
function _rectTriHit(rx, ry, rw, rh, t1x, t1y, t2x, t2y, t3x, t3y) {
    const tip = _pointInTri;
    // 矩形四角在三角形内
    if (tip(rx, ry, t1x,t1y, t2x,t2y, t3x,t3y)) return true;
    if (tip(rx+rw, ry, t1x,t1y, t2x,t2y, t3x,t3y)) return true;
    if (tip(rx, ry+rh, t1x,t1y, t2x,t2y, t3x,t3y)) return true;
    if (tip(rx+rw, ry+rh, t1x,t1y, t2x,t2y, t3x,t3y)) return true;
    // 三角形顶点在矩形内
    if (t1x>=rx && t1x<=rx+rw && t1y>=ry && t1y<=ry+rh) return true;
    if (t2x>=rx && t2x<=rx+rw && t2y>=ry && t2y<=ry+rh) return true;
    if (t3x>=rx && t3x<=rx+rw && t3y>=ry && t3y<=ry+rh) return true;
    // 边交叉
    const cr = _segCross;
    if (cr(rx,ry, rx+rw,ry, t1x,t1y, t2x,t2y)) return true;
    if (cr(rx,ry, rx+rw,ry, t2x,t2y, t3x,t3y)) return true;
    if (cr(rx,ry, rx+rw,ry, t3x,t3y, t1x,t1y)) return true;
    if (cr(rx,ry+rh, rx+rw,ry+rh, t1x,t1y, t2x,t2y)) return true;
    if (cr(rx,ry+rh, rx+rw,ry+rh, t2x,t2y, t3x,t3y)) return true;
    if (cr(rx,ry+rh, rx+rw,ry+rh, t3x,t3y, t1x,t1y)) return true;
    if (cr(rx,ry, rx,ry+rh, t1x,t1y, t2x,t2y)) return true;
    if (cr(rx,ry, rx,ry+rh, t2x,t2y, t3x,t3y)) return true;
    if (cr(rx,ry, rx,ry+rh, t3x,t3y, t1x,t1y)) return true;
    if (cr(rx+rw,ry, rx+rw,ry+rh, t1x,t1y, t2x,t2y)) return true;
    if (cr(rx+rw,ry, rx+rw,ry+rh, t2x,t2y, t3x,t3y)) return true;
    if (cr(rx+rw,ry, rx+rw,ry+rh, t3x,t3y, t1x,t1y)) return true;
    return false;
}

// 预计算三角形顶点（每帧调用一次）
let _pt1x, _pt1y, _pt2x, _pt2y, _pt3x, _pt3y;
function _updatePlayerTri() {
    const r = G.player;
    const s = 0.8; // 受击面积缩放（0.8 = 缩小20%）
    const hw = r.width / 2, hh = r.height / 2;
    const cx = r.x + hw, cy = r.y + hh;
    _pt1x = cx;             _pt1y = cy - hh * s; // 机头
    _pt2x = cx - hw * s;    _pt2y = cy + hh * s; // 左下
    _pt3x = cx + hw * s;    _pt3y = cy + hh * s; // 右下
}

// ═══════════════════════════════════════════
//  通用碰撞检测函数
// ═══════════════════════════════════════════

/**
 * 子弹 vs 冰盾：检测 bulletList 中的子弹与 iceShields 的碰撞
 * @param {Array} bulletList - 子弹数组（G.bullets / G.wingmanBullets / G.homingMissiles）
 * @param {Function} getDamage - (bullet) => 伤害值
 * @param {Function} onHit - (bulletIndex, shieldIndex, shield) 命中回调
 */
function _checkBulletsVsShields(bulletList, getDamage, onHit) {
    for (let i = bulletList.length - 1; i >= 0; i--) {
        if (bulletList[i].isBomb) continue; // 炸弹由 _processBombExplosions 处理
        for (let j = G.iceShields.length - 1; j >= 0; j--) {
            if (_aabb(bulletList[i], G.iceShields[j])) {
                const s = G.iceShields[j];
                s.hp -= getDamage(bulletList[i]);
                s.shakeTimer = 6;
                onHit(i, j, s);
                break;
            }
        }
    }
}

/**
 * 子弹 vs 敌人/Boss：检测 bulletList 与 enemies/Boss 的碰撞
 * @param {Array} bulletList - 子弹数组
 * @param {Function} getDamage - (bullet) => 伤害值
 * @param {Function} onEnemyHit - (bulletIndex, enemyIndex) 命中敌人回调
 * @param {Function} onBossHit - (bulletIndex) 命中Boss回调
 */
function _checkBulletsVsEnemies(bulletList, getDamage, onEnemyHit, onBossHit) {
    for (let i = bulletList.length - 1; i >= 0; i--) {
        if (bulletList[i].isBomb) continue; // 炸弹由 _processBombExplosions 处理
        let consumed = false;
        for (let j = G.enemies.length - 1; j >= 0; j--) {
            if (_aabb(bulletList[i], G.enemies[j])) {
                onEnemyHit(i, j);
                consumed = true;
                break;
            }
        }
        if (consumed) continue;
        if (G.boss && !G.boss.isInvincible && _aabb(bulletList[i], G.boss)) {
            onBossHit(i);
        }
    }
}

// ═══════════════════════════════════════════
//  Boss 击杀 + 敌人击杀
// ═══════════════════════════════════════════

function _killBoss() {
    const bx = G.boss.x + G.boss.width / 2;
    const by = G.boss.y + G.boss.height / 2;
    createExplosion(bx, by, '#ff0000');
    setTimeout(() => createExplosion(bx - 25, by - 20, '#ff4400'), 60);
    setTimeout(() => createExplosion(bx + 25, by + 15, '#ff6600'), 120);
    setTimeout(() => createExplosion(bx - 15, by + 25, '#ff4400'), 180);
    setTimeout(() => createExplosion(bx + 20, by - 18, '#ff0000'), 240);
    G.screenFlash = 0.4;
    G.player.energy = Math.min(OVERCLOCK_MAX_ENERGY, G.player.energy + 30);
    _spawnBossGemRain(bx, by, 200);
    G.boss = null;
    G.bossSpawned = false;
    G.bossDefeatTime = Date.now();
    _advanceBoss();
}

function _spawnBossGemRain(x, y, total) {
    const pool = [20, 10, 5];
    let remain = total;
    const gems = [];
    while (remain > 0) {
        const valid = pool.filter(v => v <= remain);
        const pick = (gems.length >= 10)
            ? valid[valid.length - 1]
            : valid[Math.floor(Math.random() * valid.length)];
        gems.push(pick);
        remain -= pick;
    }
    for (let i = 0; i < gems.length; i++) {
        const angle = (i / gems.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const dist = 20 + Math.random() * 40;
        const gx = x + Math.cos(angle) * dist;
        const gy = y + Math.sin(angle) * dist;
        spawnGem(gx, gy, gems[i]);
    }
}

function _awardKill(enemy, enemyList, index, skipLightning) {
    const color = Game.Util.enemyColor(enemy.type);
    const score = Game.Util.enemyScore(enemy.type);
    const cx = enemy.x + enemy.width / 2;
    const cy = enemy.y + enemy.height / 2;
    createExplosion(cx, cy, color);
    playExplosionSound();
    spawnGem(cx, cy, score);
    // 贪婪：30%概率额外掉落一颗宝石
    if (G.player.greedChance && Math.random() < G.player.greedChance) {
        const ox = (Math.random() - 0.5) * 30;
        spawnGem(cx + ox, cy, score);
    }
    enemyList.splice(index, 1);
    // 闪电连锁：击杀时对最近的N个敌人造成2点伤害
    // skipLightning=true 表示调用方（_triggerLightningChain）会自行处理连锁，
    // 避免递归调用修改 enemyList 导致外层连锁的 refIndex 失效
    if (!skipLightning) {
        const lcLevel = G.player.lightningChainLevel || 0;
        if (lcLevel > 0) {
            _triggerLightningChain(cx, cy, lcLevel, enemyList);
        }
    }
    G.player.energy = Math.min(OVERCLOCK_MAX_ENERGY, G.player.energy + OVERCLOCK_BASE_ENERGY_PER_KILL + (G.player.overclockEnergyBonus || 0));
}

function _damageEnemy(enemyList, index, bulletList, bulletIndex) {
    const e = enemyList[index];
    const b = bulletList[bulletIndex];
    const dmg = (b && b.damage) ? b.damage : 1;

    // 穿透弹：防重复伤害同一敌人
    if (b && b.hitSet) {
        if (b.hitSet.has(index)) return;
        b.hitSet.add(index);
    }

    // 穿透弹：有剩余穿透次数则不销毁子弹
    if (b && b.pierceCount > 0) {
        b.pierceCount--;
    } else {
        bulletList.splice(bulletIndex, 1);
    }

    e.hp -= dmg;
    if (e.hp <= 0) {
        _awardKill(e, enemyList, index);
    } else {
        e.hitFlash = 6;
    }
}

function _damagePlayer() {
    if (!G.player.isInvincible) {
        // 镀层：免疫一次伤害
        if (G.player.hasPlating) {
            G.player.hasPlating = false;
            G.player.platingBroken = 15; // 破碎特效帧数
            playHitSound();
            return;
        }
        G.game.life--;
        G.player.isInvincible = true;
        G.player.invincibleTime = INVINCIBLE_DURATION;
        G.player.hitEffect = 15;
        playHitSound();
    }
}

// ═══════════════════════════════════════════
//  闪电连锁
// ═══════════════════════════════════════════

function _triggerLightningChain(fromX, fromY, chainCount, enemyList) {
    // 收集所有可连锁目标：存活的敌人 + Boss（被击杀的敌人已在调用前移除）
    const targets = [];
    for (let i = 0; i < enemyList.length; i++) {
        const e = enemyList[i];
        targets.push({
            cx: e.x + e.width / 2,
            cy: e.y + e.height / 2,
            ref: e,
            refList: enemyList,
            refIndex: i
        });
    }
    if (G.boss && !G.boss.isInvincible) {
        targets.push({
            cx: G.boss.x + G.boss.width / 2,
            cy: G.boss.y + G.boss.height / 2,
            ref: G.boss,
            isBoss: true
        });
    }

    // 按距离排序
    let curX = fromX, curY = fromY;
    for (let n = 0; n < chainCount && targets.length > 0; n++) {
        // 找最近的目标
        let bestIdx = 0, bestDist = Infinity;
        for (let i = 0; i < targets.length; i++) {
            const d = Math.hypot(targets[i].cx - curX, targets[i].cy - curY);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        const t = targets.splice(bestIdx, 1)[0];

        // 添加闪电视觉效果
        G.lightningChains.push({
            x1: curX, y1: curY,
            x2: t.cx, y2: t.cy,
            life: 10,
            maxLife: 10
        });

        // 造成伤害
        t.ref.hp -= 2;
        if (t.isBoss) {
            if (t.ref.hp <= 0) _killBoss();
        } else {
            if (t.ref.hp <= 0) {
                _awardKill(t.ref, t.refList, t.refIndex, true);
                // awardKill 会 splice，后续目标的 index 需要修正
                for (const other of targets) {
                    if (!other.isBoss && other.refList === t.refList && other.refIndex > t.refIndex) {
                        other.refIndex--;
                    }
                }
            }
        }

        curX = t.cx;
        curY = t.cy;
    }
}

function drawLightningChains(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = G.lightningChains.length - 1; i >= 0; i--) {
        const l = G.lightningChains[i];
        l.life--;
        if (l.life <= 0) { G.lightningChains.splice(i, 1); continue; }

        const alpha = l.life / l.maxLife;
        const dx = l.x2 - l.x1;
        const dy = l.y2 - l.y1;
        const dist = Math.hypot(dx, dy);
        const segments = Math.max(3, Math.floor(dist / 15));

        // 外层光晕
        ctx.globalAlpha = alpha * 0.3;
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        for (let s = 1; s < segments; s++) {
            const t = s / segments;
            const mx = l.x1 + dx * t + (Math.random() - 0.5) * 16;
            const my = l.y1 + dy * t + (Math.random() - 0.5) * 16;
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();

        // 主闪电
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        for (let s = 1; s < segments; s++) {
            const t = s / segments;
            const mx = l.x1 + dx * t + (Math.random() - 0.5) * 10;
            const my = l.y1 + dy * t + (Math.random() - 0.5) * 10;
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();

        // 核心白线
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        for (let s = 1; s < segments; s++) {
            const t = s / segments;
            const mx = l.x1 + dx * t + (Math.random() - 0.5) * 6;
            const my = l.y1 + dy * t + (Math.random() - 0.5) * 6;
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(l.x2, l.y2);
        ctx.stroke();

        // 命中点闪光
        if (l.life > l.maxLife - 3) {
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(l.x2, l.y2, 8 * alpha, 0, 6.2832);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

// ═══════════════════════════════════════════
//  赤红号持续激光碰撞
// ═══════════════════════════════════════════

const _laserAccum = new WeakMap();

function _laserHitEnemies(laserX, halfW, dmgPerFrame, playerY, killSources) {
    for (let i = G.enemies.length - 1; i >= 0; i--) {
        const e = G.enemies[i];
        if (e.y + e.height > playerY) continue;
        if (laserX + halfW < e.x || laserX - halfW > e.x + e.width) continue;

        let acc = (_laserAccum.get(e) || 0) + dmgPerFrame;
        const intDmg = Math.floor(acc);
        if (intDmg >= 1) {
            e.hp -= intDmg;
            acc -= intDmg;
            if (e.hp <= 0) {
                _laserAccum.delete(e);
                killSources.push({ x: e.x + e.width / 2, y: e.y + e.height / 2 });
                // 直接击杀，跳过闪电连锁（循环结束后统一触发）
                _awardKill(e, G.enemies, i, true);
                continue;
            }
        }
        _laserAccum.set(e, acc);
        e.hitFlash = 3;

        if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.4) {
            G.particles.push({
                x: laserX + (Math.random() - 0.5) * 8,
                y: e.y + Math.random() * e.height * 0.3,
                vx: (Math.random() - 0.5) * 2,
                vy: -(Math.random() * 1.5 + 0.5),
                life: 8 + Math.random() * 6, maxLife: 14,
                color: Math.random() > 0.5 ? '#ff4422' : '#ff8844',
                size: 1.5 + Math.random(),
                gravity: 0.05, drawPass: PASS_CORE
            });
        }
    }
}

function _laserHitBoss(laserX, halfW, dmgPerFrame, playerY) {
    if (!G.boss || G.boss.isInvincible) return;
    const boss = G.boss;
    if (laserX + halfW < boss.x || laserX - halfW > boss.x + boss.width) return;
    if (boss.y + boss.height >= playerY) return;

    let acc = (_laserAccum.get(boss) || 0) + dmgPerFrame;
    const intDmg = Math.floor(acc);
    if (intDmg >= 1) {
        boss.hp -= intDmg;
        acc -= intDmg;
        if (boss.hp <= 0) _killBoss();
    }
    _laserAccum.set(boss, acc);

    if (G.particles.length < PARTICLE_LIMIT && Math.random() < 0.3) {
        const hitY = Math.min(boss.y + boss.height, playerY);
        G.particles.push({
            x: laserX + (Math.random() - 0.5) * 10,
            y: hitY + Math.random() * 10,
            vx: (Math.random() - 0.5) * 2.5,
            vy: -(Math.random() * 2 + 0.5),
            life: 8 + Math.random() * 6, maxLife: 14,
            color: Math.random() > 0.5 ? '#ff4422' : '#ffaa44',
            size: 2 + Math.random() * 1.5,
            gravity: 0.05, drawPass: PASS_CORE
        });
    }
}

function _checkLaserCollisions() {
    const p = G.player;
    const def = CRAFT.get(p.aircraftType);
    if (!def || !def.isLaser) return;

    const dt = G.game.dt;
    // 穿透词条：每级宽度 +60%
    const widthMult = 1 + (p.pierceLevel || 0) * 0.6;
    const halfW = LASER_WIDTH * widthMult / 2;
    // 速射词条：laserDamageMult 增伤
    const dmgMult = p.laserDamageMult || 1;
    // 超频：伤害翻倍（等效射速翻倍）
    const ocMult = p.isOverclock ? OVERCLOCK_FIRE_RATE_DIV : 1;
    const dmgPerFrame = LASER_DPS * dmgMult * ocMult * dt / BASE_FPS;

    // 收集击杀坐标，循环结束后统一触发闪电连锁
    const killSources = [];

    if (p.doubleShot) {
        // 双束激光：每束独立造成全额伤害（与普通战机双发一致，2x输出）
        const offset = 10;
        const lx1 = p.x + p.width / 2 - offset;
        const lx2 = p.x + p.width / 2 + offset;
        _laserHitEnemies(lx1, halfW, dmgPerFrame, p.y, killSources);
        _laserHitEnemies(lx2, halfW, dmgPerFrame, p.y, killSources);
        _laserHitBoss(lx1, halfW, dmgPerFrame, p.y);
        _laserHitBoss(lx2, halfW, dmgPerFrame, p.y);
    } else {
        const laserX = p.x + p.width / 2;
        _laserHitEnemies(laserX, halfW, dmgPerFrame, p.y, killSources);
        _laserHitBoss(laserX, halfW, dmgPerFrame, p.y);
    }

    // 统一触发闪电连锁（此时不再遍历 G.enemies，安全）
    const lcLevel = p.lightningChainLevel || 0;
    if (lcLevel > 0) {
        for (const k of killSources) {
            _triggerLightningChain(k.x, k.y, lcLevel, G.enemies);
        }
    }
}

// ═══════════════════════════════════════════
//  主碰撞检测入口
// ═══════════════════════════════════════════

function checkCollisions() {
    _updatePlayerTri();

    // ── 墨子号炸弹爆炸（AOE伤害）──
    _processBombExplosions();

    // ── 赤红号持续激光 ──
    _checkLaserCollisions();

    // ── 玩家子弹 vs 冰盾 ──
    _checkBulletsVsShields(
        G.bullets,
        b => (b.damage || 1),
        (i, j, s) => {
            G.bullets.splice(i, 1);
            if (s.hp <= 0) {
                createExplosion(s.x + s.width / 2, s.y + s.height / 2, '#88ddff');
                G.iceShields.splice(j, 1);
            }
        }
    );

    // ── 玩家子弹 vs 敌人/Boss ──
    _checkBulletsVsEnemies(
        G.bullets,
        b => (b.damage || 1),
        (i, j) => { _damageEnemy(G.enemies, j, G.bullets, i); },
        (i) => {
            const b = G.bullets[i];
            // 穿透弹：有剩余穿透次数则不销毁子弹
            if (b && b.pierceCount > 0) {
                b.pierceCount--;
            } else {
                G.bullets.splice(i, 1);
            }
            G.boss.hp -= (b.damage || 1);
            if (G.boss.hp <= 0) _killBoss();
        }
    );

    // ── 僚机子弹 vs 冰盾 ──
    _checkBulletsVsShields(
        G.wingmanBullets,
        b => (b.damage || 1),
        (i, j, s) => {
            G.wingmanBullets.splice(i, 1);
            if (s.hp <= 0) {
                createExplosion(s.x + s.width / 2, s.y + s.height / 2, '#88ddff');
                G.iceShields.splice(j, 1);
            }
        }
    );

    // ── 僚机子弹 vs 敌人/Boss ──
    _checkBulletsVsEnemies(
        G.wingmanBullets,
        b => (b.damage || 1),
        (i, j) => { _damageEnemy(G.enemies, j, G.wingmanBullets, i); },
        (i) => {
            const b = G.wingmanBullets[i];
            G.wingmanBullets.splice(i, 1);
            G.boss.hp -= (b.damage || 1);
            if (G.boss.hp <= 0) _killBoss();
        }
    );

    // ── 敌人撞击玩家（三角形受击面积）──
    for (let i = G.enemies.length - 1; i >= 0; i--) {
        const e = G.enemies[i];
        if (_rectTriHit(e.x, e.y, e.width, e.height, _pt1x,_pt1y, _pt2x,_pt2y, _pt3x,_pt3y)) {
            createExplosion(e.x + e.width / 2, e.y + e.height / 2, Game.Util.enemyColor(e.type));
            G.enemies.splice(i, 1);
            _damagePlayer();
        }
    }

    // ── Boss 撞击玩家（三角形受击面积）──
    if (G.boss && !G.boss.isInvincible) {
        if (_rectTriHit(G.boss.x, G.boss.y, G.boss.width, G.boss.height, _pt1x,_pt1y, _pt2x,_pt2y, _pt3x,_pt3y)) {
            _damagePlayer();
        }
    }

    // ── 敌人子弹击中玩家（三角形受击面积）──
    for (let i = G.enemyBullets.length - 1; i >= 0; i--) {
        const b = G.enemyBullets[i];
        if (_rectTriHit(b.x, b.y, b.width, b.height, _pt1x,_pt1y, _pt2x,_pt2y, _pt3x,_pt3y)) {
            G.enemyBullets.splice(i, 1);
            _damagePlayer();
        }
    }

    // ── 追踪导弹 vs 冰盾 ──
    _checkBulletsVsShields(
        G.homingMissiles,
        m => m.damage,
        (i, j, s) => {
            const m = G.homingMissiles[i];
            createExplosion(m.x + m.width / 2, m.y + m.height / 2, '#88ddff');
            if (s.hp <= 0) {
                createExplosion(s.x + s.width / 2, s.y + s.height / 2, '#88ddff');
                G.iceShields.splice(j, 1);
            }
            G.homingMissiles.splice(i, 1);
        }
    );

    // ── 追踪导弹 vs 敌人/Boss ──
    _checkBulletsVsEnemies(
        G.homingMissiles,
        m => m.damage,
        (i, j) => {
            const m = G.homingMissiles[i];
            G.enemies[j].hp -= m.damage;
            createExplosion(m.x + m.width / 2, m.y + m.height / 2, '#FF8800');
            if (G.enemies[j].hp <= 0) {
                _awardKill(G.enemies[j], G.enemies, j);
            }
            G.homingMissiles.splice(i, 1);
        },
        (i) => {
            const m = G.homingMissiles[i];
            G.boss.hp -= m.damage;
            createExplosion(m.x + m.width / 2, m.y + m.height / 2, '#FF8800');
            if (G.boss.hp <= 0) _killBoss();
            G.homingMissiles.splice(i, 1);
        }
    );
}
