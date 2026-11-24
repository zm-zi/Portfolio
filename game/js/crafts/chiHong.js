CRAFT.register({
    id: 'chihong',
    name: '日冕',
    callsign: 'CORONA',
    weapon: '持续激光',
    desc: '连续光束，贯穿整条射线',
    imgSrc: 'art/chihong.webp',
    fireRate: 100,
    isLaser: true,
    details: ['伤害: 5/秒', '射程: 全屏', '持续激光束'],

    fire(p, damage) {
        // 激光不通过子弹系统，留空
    }
});
