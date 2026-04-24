// 紫色更有韵味：单发直上 · 均衡型
CRAFT.register({
    id: 'default',
    name: '紫色更有韵味',
    desc: '单发直上 · 均衡型',
    color: '#9944cc',
    imgSrc: 'image/紫色更有韵味.png',
    fireRate: 200,
    details: ['射速: 200ms', '伤害: 1.0', '射程: 无限', '单发直射'],

    fire(p, damage) {
        const b1 = _makeBullet(p.x + p.width / 2 - 3, p.y, damage);
        b1.purple = true;
        G.bullets.push(b1);
        if (p.doubleShot) {
            const b2 = _makeBullet(p.x + p.width / 2 + 7, p.y, damage);
            b2.purple = true;
            G.bullets.push(b2);
        }
    },

    trailColors: {
        outer: '#7722aa',
        outerOC: '#ffaa00',
        inner: '#bb66ee',
        innerOC: '#ffdd44',
        glow: '#5511aa',
        glowOC: '#ff8800'
    }
});
