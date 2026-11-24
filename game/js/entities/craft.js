// 战机注册表
const CRAFT = {
    _pool: {},

    register(def) {
        this._pool[def.id] = def;
    },

    get(id) { return this._pool[id] || null; },

    all() { return Object.values(this._pool); }
};
