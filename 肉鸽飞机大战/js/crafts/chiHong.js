// 赤红号：持续激光 · 红色主题
CRAFT.register({
    id: 'chihong',
    name: '赤红号',
    desc: '持续激光 · 红色主题',
    color: '#ff2244',
    imgSrc: 'image/赤红号.png',
    fireRate: 100,
    isLaser: true,
    details: ['伤害: 5/秒', '射程: 全屏', '持续激光束'],

    fire(p, damage) {
        // 激光不通过子弹系统，留空
    },

    trailColors: {
        outer: '#cc2222',
        outerOC: '#ffaa00',
        inner: '#ff6644',
        innerOC: '#ffdd44',
        glow: '#aa1111',
        glowOC: '#ff8800'
    }
});
