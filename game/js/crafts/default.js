CRAFT.register({
    id: 'default',
    name: '朱隼',
    callsign: 'FALCON',
    weapon: '单发直射',
    desc: '直线射击，覆盖正前方空域',
    imgSrc: 'art/default.webp',
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
    }
});
