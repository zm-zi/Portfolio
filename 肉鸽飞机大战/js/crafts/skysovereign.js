// 苍穹号：3发散射 · 白色主题
CRAFT.register({
    id: 'skysovereign',
    name: '苍穹号',
    desc: '3发散射 · 白色主题',
    color: '#ddeeff',
    imgSrc: 'image/苍穹号.png',
    fireRate: 220,
    details: ['射速: 220ms', '伤害: 0.8×3', '射程: 320px', '弹速: -30%', '20°散射'],

    fire(p, damage) {
        const cx = p.x + p.width / 2;
        const ssDamage = damage * 0.8;
        const angles = p.doubleShot ? [-10, 0, 10, 20] : [-10, 0, 10];
        for (const ang of angles) {
            const rad = (ang - 90) * Math.PI / 180;
            const b = _makeBullet(cx - 3, p.y, ssDamage);
            b.vx = Math.cos(rad) * SPREAD_BULLET_SPEED;
            b.vy = Math.sin(rad) * SPREAD_BULLET_SPEED;
            b.startY = p.y;
            b.range = SPREAD_BULLET_RANGE;
            b.skySovereign = true;
            G.bullets.push(b);
        }
    },

    trailColors: {
        outer: '#ccddee',
        outerOC: '#ffaa00',
        inner: '#ffffff',
        innerOC: '#ffdd44',
        glow: '#aabbcc',
        glowOC: '#ff8800'
    }
});
