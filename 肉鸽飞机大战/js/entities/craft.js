// 战机注册表
const CRAFT = {
    _pool: {},

    register(def) {
        this._pool[def.id] = def;
    },

    bindImg(id, img) {
        const def = this._pool[id];
        if (def) def._img = img;
    },

    get(id) { return this._pool[id] || null; },

    all() { return Object.values(this._pool); }
};
