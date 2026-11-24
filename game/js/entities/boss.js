// Boss 注册表
const BOSS = {
    _pool: {},
    _order: [],

    register(def) {
        this._pool[def.id] = def;
        this._order.push(def.id);
    },

    get(id) { return this._pool[id] || null; },

    getByIndex(i) { return this._pool[this._order[i % this._order.length]] || null; },

    count() { return this._order.length; },

    startSkillAnim(b) { b._animActive = true; },
    endSkillAnim(b) { b._animActive = false; }
};
