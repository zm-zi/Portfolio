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
    randomPick(count) {
        const pool = this.all().filter(d => !d.condition || d.condition(G));
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
    }
};

// ========= 词条选择 UI =========
const _cardW = 170;
const _cardH = 240;
const _cardGap = 20;

function initBuffUI() {
}

function startBuffChoice(freePick) {
    const choices = BUFF.randomPick(BUFF_CHOICE_COUNT);
    if (choices.length === 0) return; // 没有注册任何词条时不触发
    G.game.buffChooseMode = true;
    G.game.buffChoices = choices.map(d => d.id);
    G.game.lastBuffScore = G.game.score;
    G.game.buffIsFreePick = !!freePick;
}

function drawBuffChoose(ctx) {
    const choices = G.game.buffChoices;
    const count = choices.length;
    if (count === 0) return;

    // 遮罩
    ctx.fillStyle = 'rgba(13, 13, 18, 0.88)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 标题（中文用 VT323）
    const cx = LOGICAL_W / 2;
    ctx.textAlign = 'center';
    drawNeonText(ctx, '选择词条', cx, LOGICAL_H / 2 - _cardH / 2 - 40, 'bold 28px HYPixel, sans-serif', '#ffd700', 16);

    // 副标题
    ctx.fillStyle = 'rgba(255, 179, 0, 0.5)';
    ctx.font = '20px HYPixel, sans-serif';
    ctx.fillText('按 1 / 2 / 3 选择', cx, LOGICAL_H / 2 - _cardH / 2 - 14);

    const totalW = count * _cardW + (count - 1) * _cardGap;
    const startX = (LOGICAL_W - totalW) / 2;
    const cardY = LOGICAL_H / 2 - _cardH / 2;

    const rarityColors = { common: '#e8e8f0', rare: '#44ff88', epic: '#dd44dd', legendary: '#ff3333' };
    const rarityLabels = { common: 'COMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' };

    for (let i = 0; i < count; i++) {
        const def = BUFF.get(choices[i]);
        if (!def) continue;
        const cardX = startX + i * (_cardW + _cardGap);
        const color = def.color || rarityColors[def.rarity] || '#555';

        // 卡片外发光
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, _cardW, _cardH, 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 卡片背景
        ctx.fillStyle = 'rgba(30, 30, 46, 0.92)';
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, _cardW, _cardH, 2);
        ctx.fill();

        // 四角像素装饰
        drawPixelCorners(ctx, cardX, cardY, _cardW, _cardH, 4, color);

        // 顶部色带
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, _cardW, 40, [2, 2, 0, 0]);
        ctx.clip();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(cardX, cardY, _cardW, 40);
        ctx.globalAlpha = 1;
        ctx.restore();

        // 裁剪到卡片区域内
        ctx.save();
        ctx.beginPath();
        ctx.rect(cardX + 1, cardY + 1, _cardW - 2, _cardH - 2);
        ctx.clip();

        // 稀有度标识
        ctx.fillStyle = color;
        ctx.font = 'bold 10px Press Start 2P, monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 6;
        ctx.shadowColor = color;
        ctx.fillText(rarityLabels[def.rarity] || def.rarity, cardX + _cardW / 2, cardY + 25);
        ctx.shadowBlur = 0;

        // 名称（自动换行）
        ctx.fillStyle = '#e8e8f0';
        ctx.font = 'bold 18px HYPixel, sans-serif';
        const nameFontSize = 18;
        const nameLines = _wrapText(def.name, nameFontSize, _cardW - 24);
        const nameLineH = 20;
        const nameStartY = cardY + 58;
        const maxNameLines = 2;
        for (let li = 0; li < nameLines.length && li < maxNameLines; li++) {
            ctx.fillText(nameLines[li], cardX + _cardW / 2, nameStartY + li * nameLineH);
        }

        // 描述
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px HYPixel, sans-serif';
        const desc = typeof def.desc === 'function' ? def.desc(G) : def.desc;
        const descFontSize = 14;
        const lines = _wrapText(desc, descFontSize, _cardW - 24);
        const descLineH = 16;
        const descStartY = nameStartY + nameLines.length * nameLineH + 10;
        const descMaxY = cardY + _cardH - 28;
        for (let li = 0; li < lines.length && descStartY + li * descLineH < descMaxY; li++) {
            ctx.fillText(lines[li], cardX + _cardW / 2, descStartY + li * descLineH);
        }

        ctx.restore();

        // 序号提示
        ctx.fillStyle = 'rgba(255, 179, 0, 0.4)';
        ctx.font = '10px Press Start 2P, monospace';
        ctx.fillText('[' + (i + 1) + ']', cardX + _cardW / 2, cardY + _cardH - 14);
    }

    ctx.textAlign = 'left';
}

function chooseBuff(index) {
    if (!G.game.buffChooseMode) return;
    const choices = G.game.buffChoices;
    if (index < 0 || index >= choices.length) return;

    const def = BUFF.get(choices[index]);
    if (!def) return;

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
    G.game.buffChoices = [];
    G.game.buffIsFreePick = false;
}

function drawPlayerBuffs(ctx) {
    const list = G.player.buffList;
    if (list.length === 0) return;

    const counts = {};
    list.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    const rarityColors = { common: '#e8e8f0', rare: '#44ff88', epic: '#dd44dd', legendary: '#ff3333' };
    ctx.font = '16px HYPixel, sans-serif';
    ctx.textAlign = 'left';
    let y = 68;
    for (const id in counts) {
        const def = BUFF.get(id);
        if (!def) continue;
        const color = def.color || rarityColors[def.rarity] || '#fff';
        const label = counts[id] > 1 ? def.name + ' x' + counts[id] : def.name;
        const tw = ctx.measureText(label).width + 12;
        // 标签背景
        ctx.fillStyle = 'rgba(22, 22, 34, 0.8)';
        ctx.beginPath();
        ctx.roundRect(5, y - 12, tw, 17, 2);
        ctx.fill();
        // 左侧色标（更宽）
        ctx.fillStyle = color;
        ctx.fillRect(5, y - 12, 4, 17);
        // 文字
        ctx.fillStyle = color;
        ctx.fillText(label, 13, y);
        y += 20;
    }
    ctx.textAlign = 'left';
}

// ========= 词条触发检测 =========
function checkBuffTrigger() {
    if (G.game.buffChooseMode) return;
    const p = G.player;
    if (G.game.score >= p.levelUpScore) {
        startBuffChoice();
    }
}

// ========= 初始词条注册 =========

// 词条1：速射 — 射速 x1.25（间隔缩短为 0.8 倍），最多叠加3次
BUFF.register({
    id: 'rapid_fire',
    name: '速射',
    desc: '射速提升25%',
    rarity: 'common',
    condition: (G) => (G.player._rapidFireCount || 0) < 3,
    onInit(G) { G.player.currentFireRate = FIRE_RATE; G.player._rapidFireCount = 0; },
    apply(G) {
        G.player._rapidFireCount = (G.player._rapidFireCount || 0) + 1;
        // 重算射速：基于基础射速，每层速射 -20%，每层双发 -25%，最低限 50ms
        G.player.currentFireRate = Math.max(50, Math.round(FIRE_RATE * Math.pow(0.8, G.player._rapidFireCount) / Math.pow(0.75, G.player.doubleShotCount || 0)));
    }
});

// 词条2：双发 — 并排两发，但射速 x0.75，仅可选择一次
BUFF.register({
    id: 'double_shot',
    name: '双发',
    desc: '并排发射两发子弹，射速降低25%',
    rarity: 'rare',
    condition: (G) => !G.player.doubleShot,
    onInit(G) {
        G.player.doubleShot = false;
        G.player.doubleShotCount = 0;
    },
    apply(G) {
        G.player.doubleShot = true;
        G.player.doubleShotCount = (G.player.doubleShotCount || 0) + 1;
        // 重算射速：基于基础射速，每层双发 -25%，最低限 50ms
        G.player.currentFireRate = Math.max(50, Math.round(FIRE_RATE * Math.pow(0.8, G.player._rapidFireCount || 0) / Math.pow(0.75, G.player.doubleShotCount)));
    }
});

// 词条3：僚机 — 增加两个僚机，射速和伤害均为主机一半，最多叠加2次
BUFF.register({
    id: 'wingman',
    name: '僚机',
    desc: '召唤僚机协同作战，射速和伤害为主机一半',
    rarity: 'rare',
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
    condition: (G) => G.player.homingMissileLevel >= 1 && (G.player._swiftCount || 0) < 2,
    onInit(G) {},
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
    condition: (G) => G.player.homingMissileLevel >= 1 && (G.player._missileCountStacks || 0) < 2,
    onInit(G) {},
    apply(G) { G.player.homingMissileCount = (G.player.homingMissileCount || 1) + 1; G.player._missileCountStacks = (G.player._missileCountStacks || 0) + 1; }
});

// 词条5：超频时间延长 — 超频持续时间+1秒，最多叠加3次
BUFF.register({
    id: 'overclock_duration',
    name: '超频时间延长',
    desc: '超频持续时间+1秒',
    rarity: 'epic',
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
BUFF.register({
    id: 'penetrating_bullet',
    name: '穿透弹',
    desc: (G) => {
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

// 词条13：闪电连锁 — 击杀敌人时闪电攻击最近的敌人，伤害2，需穿透弹满级解锁
// 每升一级增加一个连锁目标，最多5个
BUFF.register({
    id: 'lightning_chain',
    name: '闪电连锁',
    desc: (G) => {
        const lv = (G.player.lightningChainLevel || 0) + 1;
        return '击杀时连锁' + lv + '个敌人，闪电伤害2';
    },
    rarity: 'legendary',
    condition: (G) => G.player.pierceLevel >= 3 && (G.player.lightningChainLevel || 0) < 5,
    onInit(G) { G.player.lightningChainLevel = 0; },
    apply(G) {
        G.player.lightningChainLevel = (G.player.lightningChainLevel || 0) + 1;
    }
});
