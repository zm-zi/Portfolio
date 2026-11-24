// ========= 词条注册表 =========
const BUFF = {
    _pool: {},
    _poolOrder: [],

    register(def) {
        if (this._pool[def.id]) return; // 防重复注册
        this._pool[def.id] = def;
        this._poolOrder.push(def.id);
    },

    get(id) { return this._pool[id] || null; },

    all() { return this._poolOrder.map(id => this._pool[id]); },

    // 按稀有度权重随机抽取 count 个不重复词条
    randomPick(count, exclude = []) {
        let pool = this.all().filter(d => !d.condition || d.condition(G));
        const fresh = pool.filter(d => !exclude.includes(d.id));
        if (fresh.length >= count) pool = fresh;
        if (pool.length === 0) return [];
        const n = Math.min(count, pool.length);

        // 稀有度权重
        const weightOf = { common: 5, rare: 3, epic: 1, legendary: 0.65 };
        const weights = pool.map(d => weightOf[d.rarity] || 3);

        const picked = [];
        const used = new Set();
        for (let i = 0; i < n; i++) {
            // 每轮重新计算剩余权重总和
            let remainingWeight = 0;
            for (let j = 0; j < pool.length; j++) {
                if (!used.has(j)) remainingWeight += weights[j];
            }
            if (remainingWeight <= 0) break;

            let r = Math.random() * remainingWeight;
            for (let j = 0; j < pool.length; j++) {
                if (used.has(j)) continue;
                r -= weights[j];
                if (r <= 0) {
                    picked.push(pool[j]);
                    used.add(j);
                    break;
                }
            }
            // 兜底：取第一个未用的
            if (picked.length <= i) {
                for (let j = 0; j < pool.length; j++) {
                    if (!used.has(j)) { picked.push(pool[j]); used.add(j); break; }
                }
            }
        }
        return picked;
    },

    // 只抽取攻击类词条
    randomPickAttack(count, exclude = []) {
        let pool = this.all().filter(d => d.category === 'attack' && (!d.condition || d.condition(G)));
        const fresh = pool.filter(d => !exclude.includes(d.id));
        if (fresh.length >= count) pool = fresh;
        if (pool.length === 0) return [];
        const n = Math.min(count, pool.length);

        const weightOf = { common: 5, rare: 3, epic: 1, legendary: 0.65 };
        const weights = pool.map(d => weightOf[d.rarity] || 3);

        const picked = [];
        const used = new Set();
        for (let i = 0; i < n; i++) {
            let remainingWeight = 0;
            for (let j = 0; j < pool.length; j++) {
                if (!used.has(j)) remainingWeight += weights[j];
            }
            if (remainingWeight <= 0) break;

            let r = Math.random() * remainingWeight;
            for (let j = 0; j < pool.length; j++) {
                if (used.has(j)) continue;
                r -= weights[j];
                if (r <= 0) {
                    picked.push(pool[j]);
                    used.add(j);
                    break;
                }
            }
            if (picked.length <= i) {
                for (let j = 0; j < pool.length; j++) {
                    if (!used.has(j)) { picked.push(pool[j]); used.add(j); break; }
                }
            }
        }
        return picked;
    }
};

// ========= 词条选择 UI =========
function startBuffChoice(freePick) {
    let choices;
    G.game.buffStarter = !!freePick && !G.game.routeReward;
    if (freePick && !G.game.routeReward) {
        choices = ['lightning_chain', 'rapid_fire', 'cryo_rounds'].map(id => BUFF.get(id)).filter(d => d && (!d.condition || d.condition(G)));
        if (choices.length < 3) choices.push(BUFF.get('wingman'));
    } else if (G.game.gameMode === 'level') {
        // 关卡模式：只从攻击类词条中选1个
        choices = BUFF.randomPickAttack(BUFF_CHOICE_COUNT);
    } else {
        choices = BUFF.randomPick(BUFF_CHOICE_COUNT);
    }
    if (choices.length === 0) return;
    G.game.buffChooseMode = true;
    G.game.buffChoices = choices.map(d => d.id);
    G.game.lastBuffScore = G.game.score;
    G.game.buffIsFreePick = !!freePick;
}

function rerollBuffChoice() {
    const gm = G.game;
    if (!gm.buffChooseMode || gm.routeChoice || gm.buffStarter || gm.buffRerolls <= 0) return;
    const choices = gm.gameMode === 'level'
        ? BUFF.randomPickAttack(BUFF_CHOICE_COUNT, gm.buffChoices)
        : BUFF.randomPick(BUFF_CHOICE_COUNT, gm.buffChoices);
    if (!choices.length) return;
    gm.buffChoices = choices.map(d => d.id);
    gm.buffRerolls--;
}

function chooseBuff(index) {
    if (!G.game.buffChooseMode) return;
    const choices = G.game.buffChoices;
    if (index < 0 || index >= choices.length) return;

    const def = BUFF.get(choices[index]);
    if (!def) return;

    if (G.game.routeChoice) {
        G.game.routeChoice = false;
        G.game.routeChosen = true;
        G.game.routeNextScore = G.game.score + 500;
        G.game.buffChooseMode = false;
        G.game.buffChoices = [];
        def.apply(G);
        return;
    }

    def.apply(G);
    G.player.buffList.push(def.id);
    G.game.lastChosenBuff = def.id;

    // 升级：推进等级和下一级门槛（开局免费词条不消耗等级）
    // 连续追赶到当前分数对应的等级，避免大分数跳跃导致连续弹出多次 buff 选择
    const p = G.player;
    if (!G.game.buffIsFreePick) {
        p.playerLevel++;
        p.levelUpScore = getLevelThreshold(p.playerLevel);
        while (G.game.score >= p.levelUpScore) {
            p.playerLevel++;
            p.levelUpScore = getLevelThreshold(p.playerLevel);
        }
    }
    G.game.buffChooseMode = false;
    G.game.buffStarter = false;
    G.game.buffChoices = [];
    G.game.buffIsFreePick = false;
}

function checkBuffTrigger() {
    if (G.game.buffChooseMode) return;
    // 关卡模式：不自动弹出词条选择（每关只在开局选一次）
    if (G.game.gameMode === 'level') return;
    const p = G.player;
    if (G.game.score >= p.levelUpScore) {
        startBuffChoice();
    }
}

// ========= 初始词条注册 =========

// 词条1：速射 — 射速 x1.25（间隔缩短为 0.8 倍），最多叠加3次
// 激光战机：每层激光伤害 +25%
BUFF.register({
    id: 'rapid_fire',
    name: '速射',
    desc: G => (CRAFT.get(G.player.aircraftType) || {}).isLaser ? '激光伤害提升25%' : '射速提升25%',
    rarity: 'common',
    category: 'attack',
    condition: (G) => (G.player._rapidFireCount || 0) < 3,
    onInit(G) { G.player.currentFireRate = G.player.baseFireRate || FIRE_RATE; G.player._rapidFireCount = 0; G.player.laserDamageMult = 1; },
    apply(G) {
        G.player._rapidFireCount = (G.player._rapidFireCount || 0) + 1;
        const def = CRAFT.get(G.player.aircraftType);
        if (def && def.isLaser) {
            G.player.laserDamageMult = 1 + G.player._rapidFireCount * 0.25;
        } else {
            const base = G.player.baseFireRate || FIRE_RATE;
            G.player.currentFireRate = Math.max(50, Math.round(base * Math.pow(0.8, G.player._rapidFireCount) / Math.pow(0.75, G.player.doubleShotCount || 0)));
        }
    }
});

// 词条2：双发 — 主弹两侧各增一颗子弹，无副作用，仅可选择一次
// 激光战机：双束激光左右各偏移10px
BUFF.register({
    id: 'double_shot',
    name: '双发',
    desc: '左右各增加一颗子弹',
    rarity: 'legendary',
    category: 'attack',
    condition: (G) => !G.player.doubleShot,
    onInit(G) {
        G.player.doubleShot = false;
    },
    apply(G) {
        G.player.doubleShot = true;
    }
});

// 词条3：僚机 — 增加两个僚机，射速和伤害均为主机一半，最多叠加2次
BUFF.register({
    id: 'wingman',
    name: '僚机',
    desc: '召唤僚机协同作战，射速和伤害为主机一半',
    rarity: 'rare',
    category: 'attack',
    condition: (G) => (G.player.wingmanLevel || 0) < 2,
    onInit(G) { G.player.wingmanLevel = 0; },
    apply(G) { G.player.wingmanLevel = Math.min((G.player.wingmanLevel || 0) + 1, 2); }
});

// 词条3b：僚机伤 — 僚机伤害翻倍，需先拥有僚机，仅可叠加一次
BUFF.register({
    id: 'wingman_damage',
    name: '僚机伤',
    desc: '僚机伤害翻倍',
    rarity: 'rare',
    category: 'attack',
    condition: (G) => G.player.wingmanLevel >= 1 && !G.player.wingmanDamageBoosted,
    onInit(G) { G.player.wingmanDamageBoosted = false; },
    apply(G) {
        G.player.wingmanDamageMultiplier = (G.player.wingmanDamageMultiplier || 1) * 2;
        G.player.wingmanDamageBoosted = true;
    }
});

// 词条3c：僚机疾 — 僚机射速翻倍，需先拥有僚机，仅可触发一次
BUFF.register({
    id: 'wingman_swift',
    name: '僚机疾',
    desc: '僚机射速翻倍',
    rarity: 'rare',
    category: 'attack',
    condition: (G) => G.player.wingmanLevel >= 1 && !G.player.wingmanSwiftActivated,
    onInit(G) { G.player.wingmanSwiftActivated = false; },
    apply(G) {
        G.player.wingmanFireRateMultiplier = (G.player.wingmanFireRateMultiplier || 1) * 2;
        G.player.wingmanSwiftActivated = true;
    }
});

// 词条4：追踪导弹 — 每3秒自动发射一枚追踪导弹，仅可选择一次
BUFF.register({
    id: 'homing_missile',
    name: '追踪导弹',
    desc: '每3秒发射一枚追踪导弹，自动锁敌',
    rarity: 'epic',
    category: 'attack',
    condition: (G) => !G.player.homingMissileLevel,
    onInit(G) { G.player.homingMissileLevel = 0; },
    apply(G) { G.player.homingMissileLevel = (G.player.homingMissileLevel || 0) + 1; G.player.lastHomingMissileTime = 0; }
});

// 词条4b：追踪导弹·疾 — 发射间隔缩短1秒（需先拥有追踪导弹），最多叠加2次
BUFF.register({
    id: 'homing_missile_swift',
    name: '追踪导弹·疾',
    desc: '发射间隔缩短1秒',
    rarity: 'epic',
    category: 'attack',
    condition: (G) => G.player.homingMissileLevel >= 1 && (G.player._swiftCount || 0) < 2,
    onInit(G) { G.player._swiftCount = 0; },
    apply(G) {
        G.player._swiftCount = (G.player._swiftCount || 0) + 1;
        G.player.homingMissileLevel = (G.player.homingMissileLevel || 0) + 1;
    }
});

// 词条4c：追踪导弹·量 — 增加一枚追踪导弹（需先拥有追踪导弹），最多叠加2次
BUFF.register({
    id: 'homing_missile_count',
    name: '追踪导弹·量',
    desc: '同时发射+1枚追踪导弹',
    rarity: 'epic',
    category: 'attack',
    condition: (G) => G.player.homingMissileLevel >= 1 && (G.player._missileCountStacks || 0) < 2,
    onInit(G) { G.player._missileCountStacks = 0; },
    apply(G) { G.player.homingMissileCount = (G.player.homingMissileCount || 1) + 1; G.player._missileCountStacks = (G.player._missileCountStacks || 0) + 1; }
});

// 词条5：超频时间延长 — 超频持续时间+1秒，最多叠加3次
BUFF.register({
    id: 'overclock_duration',
    name: '超频时间延长',
    desc: '超频持续时间+1秒',
    rarity: 'epic',
    category: 'attack',
    condition: (G) => (G.player.overclockDurationStacks || 0) < 3,
    onInit(G) { G.player.overclockDurationStacks = 0; },
    apply(G) { G.player.overclockDurationStacks = (G.player.overclockDurationStacks || 0) + 1; }
});

// 词条6：超频充能 — 击杀怪物获得能量+1，最多叠加4次
BUFF.register({
    id: 'overclock_energy',
    name: '超频充能',
    desc: '击杀怪物获得能量+1',
    rarity: 'rare',
    category: 'attack',
    condition: (G) => (G.player.overclockEnergyStacks || 0) < 4,
    onInit(G) { G.player.overclockEnergyStacks = 0; G.player.overclockEnergyBonus = 0; },
    apply(G) {
        G.player.overclockEnergyStacks = (G.player.overclockEnergyStacks || 0) + 1;
        G.player.overclockEnergyBonus = G.player.overclockEnergyStacks;
    }
});

// 词条7：生命回复 — 生命值+1，最大不超过10
BUFF.register({
    id: 'extra_life',
    name: '生命回复',
    desc: '生命值+1',
    rarity: 'rare',
    condition: (G) => G.game.life < 10 && G.game.lastChosenBuff !== 'extra_life',
    apply(G) {
        G.game.life = Math.min(G.game.life + 1, 10);
    }
});

// 词条8：磁力宝石 — 拾取宝石范围增加20%，最多叠加5次（5次后满屏吸取）
BUFF.register({
    id: 'gem_attract',
    name: '磁力宝石',
    desc: (G) => {
        const stacks = (G.player.gemAttractStacks || 0) + 1;
        return stacks >= 5 ? '满屏吸取宝石' : '宝石拾取范围+20%';
    },
    rarity: 'common',
    condition: (G) => (G.player.gemAttractStacks || 0) < 5,
    onInit(G) { G.player.gemAttractStacks = 0; },
    apply(G) {
        G.player.gemAttractStacks = (G.player.gemAttractStacks || 0) + 1;
    }
});

// 词条9：金身护体 — 10秒未受伤生成镀层，免疫一次伤害（无敌期间不计时，无敌时镀层不会被打破）
BUFF.register({
    id: 'golden_plating',
    name: '隐身镀层',
    desc: '10秒未受伤生成镀层，免疫一次伤害',
    rarity: 'legendary',
    condition: (G) => !G.player.platingLevel,
    onInit(G) { G.player.platingLevel = 0; G.player.hasPlating = false; G.player.platingTimer = 0; G.player.platingBroken = 0; },
    apply(G) {
        G.player.platingLevel = 1;
        G.player.platingTimer = 0;
    }
});

// 词条10：穿透弹 — 子弹穿透敌人继续飞行，最多叠加3次
// 第1次：穿透1个敌人，伤害减半
// 第2次：穿透1个敌人，伤害不变
// 第3次：穿透2个敌人，伤害不变
// 激光战机：每级激光宽度+4px，覆盖范围更广
BUFF.register({
    id: 'penetrating_bullet',
    name: '穿透弹',
    category: 'attack',
    desc: (G) => {
        const def = CRAFT.get(G.player.aircraftType);
        if (def && def.isLaser) {
            const lv = (G.player.pierceLevel || 0) + 1;
            return '激光宽度+' + (lv * 4) + 'px';
        }
        const lv = (G.player.pierceLevel || 0) + 1;
        if (lv === 1) return '穿透1个敌人，伤害减半';
        if (lv === 2) return '穿透1个敌人，伤害不变';
        return '穿透2个敌人，伤害不变';
    },
    rarity: 'legendary',
    condition: (G) => (G.player.pierceLevel || 0) < 3,
    onInit(G) { G.player.pierceLevel = 0; },
    apply(G) {
        G.player.pierceLevel = (G.player.pierceLevel || 0) + 1;
    }
});

// 词条11：宝石增值 — 宝石分数+10%，最多叠加5次（50%）
BUFF.register({
    id: 'gem_value',
    name: '宝石增值',
    desc: (G) => {
        const stacks = (G.player.gemValueStacks || 0) + 1;
        return '宝石分数+' + (stacks * 10) + '%';
    },
    rarity: 'common',
    condition: (G) => (G.player.gemValueStacks || 0) < 5,
    onInit(G) { G.player.gemValueStacks = 0; },
    apply(G) {
        G.player.gemValueStacks = (G.player.gemValueStacks || 0) + 1;
    }
});

// 词条12：贪婪 — 击杀时30%概率额外掉落一颗宝石，仅可选择一次
BUFF.register({
    id: 'greed',
    name: '贪婪',
    desc: '击杀时30%概率额外掉落一颗宝石',
    rarity: 'epic',
    condition: (G) => !(G.player.greedChance || 0),
    onInit(G) { G.player.greedChance = 0; },
    apply(G) { G.player.greedChance = 0.3; }
});

// 词条13：闪电连锁 — 击杀敌人时闪电攻击最近的敌人，伤害2
// 每升一级增加一个连锁目标，最多5个
BUFF.register({
    id: 'lightning_chain',
    name: '闪电连锁',
    category: 'attack',
    desc: (G) => {
        const lv = (G.player.lightningChainLevel || 0) + 1;
        return '击杀时连锁' + lv + '个敌人，闪电伤害' + (G.player.lightningOverload ? 3 : 2);
    },
    rarity: 'legendary',
    condition: (G) => {
        return (G.player.lightningChainLevel || 0) < 5;
    },
    onInit(G) { G.player.lightningChainLevel = 0; },
    apply(G) {
        G.player.lightningChainLevel = (G.player.lightningChainLevel || 0) + 1;
    }
});

BUFF.register({
    id: 'cryo_rounds', name: '冰霜弹', category: 'attack', rarity: 'rare', color: '#80eaff',
    desc: '主武器命中敌机3次冻结1秒；对Boss无效',
    condition: G => !G.player.cryoRounds && !(CRAFT.get(G.player.aircraftType) || {}).isLaser && G.player.aircraftType !== 'mozi',
    onInit(G) { G.player.cryoRounds = false; },
    apply(G) { G.player.cryoRounds = true; }
});

BUFF.register({
    id: 'cryo_shatter', name: '碎冰弹', category: 'attack', rarity: 'epic', color: '#80eaff',
    desc: '主武器击中冻结敌机时碎冰，额外造成2点伤害',
    condition: G => G.player.cryoRounds && !G.player.cryoShatter,
    onInit(G) { G.player.cryoShatter = false; },
    apply(G) { G.player.cryoShatter = true; }
});

BUFF.register({
    id: 'firepower_core', name: '火力核心', category: 'attack', rarity: 'epic', color: '#ffad55',
    desc: '需要速射与双发：所有主武器子弹伤害+1',
    condition: G => (G.player._rapidFireCount || 0) > 0 && G.player.doubleShot && !G.player.firepowerCore && ['default', 'skysovereign'].includes(G.player.aircraftType),
    onInit(G) { G.player.firepowerCore = false; },
    apply(G) { G.player.firepowerCore = true; G.player.bulletDamage += 1; }
});

BUFF.register({
    id: 'cryo_quickfreeze', name: '急冻弹', category: 'attack', rarity: 'rare', color: '#80eaff',
    desc: '冰霜弹只需命中2次即可冻结敌机',
    condition: G => G.player.cryoRounds && !G.player.cryoQuickfreeze,
    onInit(G) { G.player.cryoQuickfreeze = false; },
    apply(G) { G.player.cryoQuickfreeze = true; }
});
BUFF.register({
    id: 'cryo_longfreeze', name: '深度冻结', category: 'attack', rarity: 'rare', color: '#80eaff',
    desc: '冰霜弹的冻结时间增加至2秒',
    condition: G => G.player.cryoRounds && !G.player.cryoLongfreeze,
    onInit(G) { G.player.cryoLongfreeze = false; },
    apply(G) { G.player.cryoLongfreeze = true; }
});
BUFF.register({
    id: 'lightning_overload', name: '雷霆增幅', category: 'attack', rarity: 'rare', color: '#aabaff',
    desc: '闪电连锁每次跳跃额外造成1点伤害',
    condition: G => G.player.lightningChainLevel > 0 && !G.player.lightningOverload,
    onInit(G) { G.player.lightningOverload = false; },
    apply(G) { G.player.lightningOverload = true; }
});
BUFF.register({
    id: 'lightning_charge', name: '雷霆充能', category: 'attack', rarity: 'rare', color: '#aabaff',
    desc: '拥有闪电连锁时，每次击杀额外获得2点超频能量',
    condition: G => G.player.lightningChainLevel > 0 && !G.player.lightningCharge,
    onInit(G) { G.player.lightningCharge = false; },
    apply(G) { G.player.lightningCharge = true; }
});
BUFF.register({
    id: 'fire_surge', name: '超频弹幕', category: 'attack', rarity: 'rare', color: '#ffad55',
    desc: '需要速射：超频时主武器射击间隔再缩短20%',
    condition: G => (G.player._rapidFireCount || 0) > 0 && !G.player.fireSurge && ['default', 'skysovereign'].includes(G.player.aircraftType),
    onInit(G) { G.player.fireSurge = false; },
    apply(G) { G.player.fireSurge = true; }
});

// 航线仅在无尽模式的分岔点出现，不进入普通词条池。
BUFF.register({ id: 'route_elite', name: '精英航线', rarity: 'legendary',
    desc: '20秒内敌人更密集、更强；完成后获得一次词条选择',
    condition: () => false,
    apply(G) { G.game.eliteUntil = gameNow() + 20000; }
});
BUFF.register({ id: 'route_supply', name: '补给航线', rarity: 'rare',
    desc: '立即恢复1点生命（最多10点）', condition: () => false,
    apply(G) { G.game.life = Math.min(10, G.game.life + 1); }
});
BUFF.register({ id: 'route_charge', name: '充能航线', rarity: 'epic',
    desc: '立即获得50点超频能量', condition: () => false,
    apply(G) { G.player.energy = Math.min(OVERCLOCK_MAX_ENERGY, G.player.energy + 50); }
});

function updateRoute() {
    const gm = G.game;
    if (gm.gameMode !== 'endless' || gm.buffChooseMode || gm.isGameOver) return;
    if (gm.eliteUntil && gameNow() >= gm.eliteUntil) {
        gm.eliteUntil = 0;
        gm.routeReward = true;
        startBuffChoice(true);
        gm.routeReward = false;
    } else if (!gm.eliteUntil && !G.bossSpawned && !G.bossWarning && gm.score >= gm.routeNextScore) {
        gm.routeChoice = true;
        gm.buffChooseMode = true;
        gm.buffChoices = ['route_elite', 'route_supply', 'route_charge'];
    }
}
