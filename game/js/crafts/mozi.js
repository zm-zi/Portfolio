// 墨子号：范围炸弹 · 深蓝主题
CRAFT.register({
    id: 'mozi',
    name: '墨子号',
    desc: '范围炸弹 · 深蓝主题',
    color: '#4466cc',
    imgSrc: 'image/墨子号.png',
    fireRate: MOZI_FIRE_RATE,
    details: ['射速: ' + MOZI_FIRE_RATE + 'ms', '伤害: 2.0 AOE', '射程: 400px', '范围: 60px圆形', '朝鼠标方向发射'],

    fire(p, damage) {
        _fireMoziBomb(p, damage);
        if (p.doubleShot) {
            _fireMoziBomb(p, damage, 12);
        }
    },

    trailColors: {
        outer: '#3355aa',
        outerOC: '#ffaa00',
        inner: '#6688cc',
        innerOC: '#ffdd44',
        glow: '#223388',
        glowOC: '#ff8800'
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
