// 碰撞检测
const _aabb = Game.Util.aabb;

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
    G.screenShake = 12;
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

function _awardKill(enemy, enemyList, index) {
    const color = Game.Util.enemyColor(enemy.type);
    const score = Game.Util.enemyScore(enemy.type);
    const cx = enemy.x + enemy.width / 2;
    const cy = enemy.y + enemy.height / 2;
    createExplosion(cx, cy, color);
    playExplosionSound();
    const shakeAmt = enemy.type === 'spinner' ? 5 : enemy.type === 'rusher' ? 4 : enemy.type === 'shooter' ? 3 : 2;
    G.screenShake = Math.max(G.screenShake, shakeAmt);
    spawnGem(cx, cy, score);
    // 贪婪：30%概率额外掉落一颗宝石
    if (G.player.greedChance && Math.random() < G.player.greedChance) {
        const ox = (Math.random() - 0.5) * 30;
        spawnGem(cx + ox, cy, score);
    }
    // 先从数组中移除当前敌人，再触发闪电连锁，避免递归 splice 导致索引错乱
    enemyList.splice(index, 1);
    // 闪电连锁：击杀时对最近的N个敌人造成2点伤害
    const lcLevel = G.player.lightningChainLevel || 0;
    if (lcLevel > 0) {
        _triggerLightningChain(cx, cy, lcLevel, enemyList);
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
                _awardKill(t.ref, t.refList, t.refIndex);
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
//  主碰撞检测入口
// ═══════════════════════════════════════════

function checkCollisions() {
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

    // ── 敌人撞击玩家 ──
    for (let i = G.enemies.length - 1; i >= 0; i--) {
        if (_aabb(G.enemies[i], G.player)) {
            const e = G.enemies[i];
            createExplosion(e.x + e.width / 2, e.y + e.height / 2, Game.Util.enemyColor(e.type));
            G.screenShake = Math.max(G.screenShake, 4);
            G.enemies.splice(i, 1);
            _damagePlayer();
        }
    }

    // ── 敌人子弹击中玩家 ──
    for (let i = G.enemyBullets.length - 1; i >= 0; i--) {
        if (_aabb(G.enemyBullets[i], G.player)) {
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
