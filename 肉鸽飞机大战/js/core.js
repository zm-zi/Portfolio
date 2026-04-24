// 命名空间 + 工具函数
window.Game = {
    Entities: {},
    Systems: {},
    Util: {},
    ctx: null  // 由 main.js 赋值，全局共享 canvas 上下文
};

Game.Util = {
    // AABB 碰撞检测
    aabb(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    },

    // 敌人类型 → 分数查找（查注册表）
    enemyScore(type) {
        const d = ENEMY.get(type);
        return d ? d.score : 10;
    },

    // 敌人类型 → 爆炸颜色（查注册表）
    enemyColor(type) {
        const d = ENEMY.get(type);
        return d ? d.color : '#ff4444';
    },

    // 等比缩放绘制图片，适配到 bw×bh 包围盒内并居中
    drawImageFit(ctx, img, x, y, bw, bh) {
        const ir = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
        const br = bw / bh;
        let dw, dh;
        if (ir > br) { dw = bw; dh = bw / ir; }
        else { dh = bh; dw = bh * ir; }
        ctx.drawImage(img, x + (bw - dw) / 2, y + (bh - dh) / 2, dw, dh);
    }
};
