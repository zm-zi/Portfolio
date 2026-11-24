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
    }
};
