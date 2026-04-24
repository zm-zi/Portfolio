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

    // 反向遍历删除：callback 返回 true 则移除该元素
    removeIf(arr, predicate) {
        for (let i = arr.length - 1; i >= 0; i--) {
            if (predicate(arr[i], i)) arr.splice(i, 1);
        }
    },

    // 寻找距离 (cx, cy) 最近的实体
    nearest(cx, cy, entities) {
        let best = null, bestDist = Infinity;
        for (const e of entities) {
            const d = Math.hypot(e.x + e.width / 2 - cx, e.y + e.height / 2 - cy);
            if (d < bestDist) { bestDist = d; best = e; }
        }
        return best;
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
    }
};
