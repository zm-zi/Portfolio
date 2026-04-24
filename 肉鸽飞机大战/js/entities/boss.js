// Boss 注册表
const BOSS = {
    _pool: {},
    _order: [],

    register(def) {
        this._pool[def.id] = def;
        this._order.push(def.id);
    },

    // 绑定图片到指定 ID
    bindImg(id, img) {
        const def = this._pool[id];
        if (def) def._img = img;
    },

    // 绑定动作帧图片到指定 ID
    bindActionImg(id, img) {
        const def = this._pool[id];
        if (def) def._actionImg = img;
    },

    get(id) { return this._pool[id] || null; },

    getByIndex(i) { return this._pool[this._order[i % this._order.length]] || null; },

    count() { return this._order.length; },

    // ─── 通用动画工具 ───

    // 开始技能动画（由 Boss 的 update 调用）
    startSkillAnim(b) {
        b._animStartTime = Date.now();
        b._animActive = true;
        // 尝试从 def 获取动作帧
        if (!b._actionImg && b.def && b.def._actionImg) {
            b._actionImg = b.def._actionImg;
        }
    },

    // 结束技能动画（由 Boss 的 update 调用）
    endSkillAnim(b) {
        b._animActive = false;
        b._actionImg = null;
    },

    // 绘制 Boss 帧（处理普通帧/动作帧交替，带白色描边）
    // 参数：b(Boss对象), ctx, frameInterval(帧间隔ms), maxCycles(循环次数)
    drawFrame(b, ctx, frameInterval = 150, maxCycles = 4) {
        const actionImg = b._actionImg;
        const baseImg = b.def && b.def._img;

        if (!baseImg) return;

        let img;
        if (b._animActive && actionImg) {
            const elapsed = Date.now() - b._animStartTime;
            const cycleTime = elapsed % (frameInterval * 2);
            const currentFrame = cycleTime < frameInterval ? 0 : 1;
            const completedCycles = Math.floor(elapsed / (frameInterval * 2));
            img = (completedCycles < maxCycles) ? (currentFrame === 0 ? baseImg : actionImg) : actionImg;
        } else {
            img = baseImg;
        }
        ctx.drawImage(img, Math.round(b.x), Math.round(b.y), b.width, b.height);
    }
};
