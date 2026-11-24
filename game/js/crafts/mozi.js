CRAFT.register({
    id: 'mozi',
    name: '信天翁',
    callsign: 'ALBATROSS',
    weapon: '范围轰炸',
    desc: '朝瞄准点投弹，爆炸波及周围目标',
    imgSrc: 'art/mozi.webp',
    fireRate: MOZI_FIRE_RATE,
    details: ['射速: ' + MOZI_FIRE_RATE + 'ms', '伤害: 2.0 AOE', '射程: 400px', '范围: 60px圆形', '朝鼠标方向发射'],

    fire(p, damage) {
        _fireMoziBomb(p, damage);
        if (p.doubleShot) {
            _fireMoziBomb(p, damage, 12);
        }
    }
});

function _fireMoziBomb(p, damage, offsetX) {
    const cx = p.x + p.width / 2 + (offsetX || 0);
    const cy = p.y;
    let angle = -Math.PI / 2;
    if (p.moziTargetX >= 0) {
        angle = Math.atan2(p.moziTargetY - cy, p.moziTargetX - cx);
    }
    const b = _makeBullet(cx - 5, cy - 5, damage);
    b.width = 10;
    b.height = 10;
    b.vx = Math.cos(angle) * MOZI_BOMB_SPEED;
    b.vy = Math.sin(angle) * MOZI_BOMB_SPEED;
    b.startX = cx;
    b.startY = cy;
    b.range = MOZI_BOMB_RANGE;
    b.isBomb = true;
    b.explosionRadius = MOZI_EXPLOSION_RADIUS;
    b.explosionDamage = MOZI_EXPLOSION_DAMAGE;
    G.bullets.push(b);
}
