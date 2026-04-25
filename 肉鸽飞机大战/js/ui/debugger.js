// ─── 调试器系统 ───

const DEBUG_COLS = 2;
const DEBUG_ITEM_H = 36;
const DEBUG_HEADER_H = 40;
const DEBUG_FOOTER_H = 50;
const DEBUG_PADDING = 16;
const DEBUG_ITEM_GAP = 6;

const DEBUG_CATEGORIES = [
    { name: '生命', type: 'life', color: SCI.red },
    { name: '分数', type: 'score', color: '#ffd700' },
    { name: '敌人', type: 'enemy', color: '#00e5ff' },
    { name: 'Boss', type: 'boss', color: '#ff00e5' },
    { name: '词条', type: 'buff', color: SCI.green }
];

const DEBUG_ENEMY_TYPES = ['basic', 'shooter', 'rusher', 'spinner', 'minion'];
const DEBUG_ENEMY_NAMES = { basic: '一级敌人', shooter: '二级敌人', rusher: '三级敌人', spinner: '四级敌人', minion: '小怪' };
const DEBUG_BOSS_TYPES = ['one_eye_king', 'night_fury', 'ice_evil_king', 'julingshen'];
const DEBUG_BOSS_NAMES = { one_eye_king: '独眼王', night_fury: '夜煞', ice_evil_king: '冰邪王', julingshen: '巨灵神' };

let dbg = {
    selectedCategory: 0,
    selectedEnemy: 0,
    selectedBoss: 0,
    selectedBuff: 0,
    buffScrollY: 0,
    inputBuffer: '',
    inputType: null,
    activeType: 'enemy'
};

// 词条分类可见区域
const DEBUG_BUFF_VISIBLE = 6; // 一屏显示几个词条

function getDebuggerRect() {
    const cat = DEBUG_CATEGORIES[dbg.selectedCategory];
    let extraH = 0;
    if (cat && cat.type === 'buff') {
        extraH = DEBUG_BUFF_VISIBLE * (DEBUG_ITEM_H + DEBUG_ITEM_GAP) - (DEBUG_ITEM_H + DEBUG_ITEM_GAP);
    }
    const w = 480;
    const h = DEBUG_HEADER_H + (DEBUG_CATEGORIES.length * (DEBUG_ITEM_H + DEBUG_ITEM_GAP)) + DEBUG_FOOTER_H + DEBUG_PADDING * 2 + extraH;
    const x = (LOGICAL_W - w) / 2;
    const y = (LOGICAL_H - h) / 2 - 20;
    return { x, y, w, h };
}

function getCategoryY(dbg, index) {
    const rect = getDebuggerRect();
    return rect.y + DEBUG_PADDING + DEBUG_HEADER_H + index * (DEBUG_ITEM_H + DEBUG_ITEM_GAP);
}

function drawDebugger() {
    const rect = getDebuggerRect();

    drawSciPanel(Game.ctx, rect.x, rect.y, rect.w, rect.h, { cornerLen: 10, glow: 15 });

    Game.ctx.textAlign = 'center';
    Game.ctx.fillStyle = SCI.primary;
    Game.ctx.font = '12px ' + FONT_PIXEL;
    Game.ctx.fillText('DEBUGGER', rect.x + rect.w / 2, rect.y + 28);

    for (let i = 0; i < DEBUG_CATEGORIES.length; i++) {
        const cat = DEBUG_CATEGORIES[i];
        const cy = getCategoryY(dbg, i);
        const isSelected = dbg.selectedCategory === i;
        if (cat.type === 'buff') {
            drawBuffCategory(cy, rect, isSelected);
        } else {
            drawDebuggerRow(cat, cy, rect, isSelected, dbg);
        }
    }

    Game.ctx.textAlign = 'center';
    Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    Game.ctx.font = '16px ' + FONT_UI;
    const hint = getDebuggerHint();
    Game.ctx.fillText(hint, rect.x + rect.w / 2, rect.y + rect.h - 16);
}

function drawBuffCategory(cy, rect, isSelected) {
    const itemX = rect.x + DEBUG_PADDING;
    const itemW = rect.w - DEBUG_PADDING * 2;
    const catColor = SCI.green;

    // 分类标签行
    const labelH = DEBUG_ITEM_H;
    if (isSelected) {
        Game.ctx.fillStyle = 'rgba(68, 255, 136, 0.12)';
        Game.ctx.beginPath();
        Game.ctx.roundRect(itemX, cy, itemW, labelH, 2);
        Game.ctx.fill();
        Game.ctx.strokeStyle = 'rgba(68, 255, 136, 0.5)';
        Game.ctx.lineWidth = 1;
        Game.ctx.stroke();
    }
    Game.ctx.textAlign = 'left';
    Game.ctx.fillStyle = catColor;
    Game.ctx.font = '18px ' + FONT_UI;
    Game.ctx.fillText('词条', itemX + 12, cy + 23);

    if (!isSelected) {
        Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        Game.ctx.font = '14px ' + FONT_UI;
        Game.ctx.fillText('↑↓ 切换到此分类查看', itemX + 80, cy + 23);
        return;
    }

    // 词条列表（选中时展开）
    const allBuffs = BUFF.all();
    const listY = cy + labelH + DEBUG_ITEM_GAP;
    const listH = DEBUG_BUFF_VISIBLE * (DEBUG_ITEM_H + DEBUG_ITEM_GAP);

    // 列表背景
    Game.ctx.fillStyle = 'rgba(20, 20, 30, 0.6)';
    Game.ctx.beginPath();
    Game.ctx.roundRect(itemX, listY, itemW, listH, 2);
    Game.ctx.fill();

    // 滚动视口
    Game.ctx.save();
    Game.ctx.beginPath();
    Game.ctx.rect(itemX, listY, itemW, listH);
    Game.ctx.clip();

    const visibleStart = dbg.buffScrollY;
    const visibleEnd = Math.min(allBuffs.length, visibleStart + DEBUG_BUFF_VISIBLE);

    for (let j = visibleStart; j < visibleEnd; j++) {
        const def = allBuffs[j];
        const by = listY + (j - visibleStart) * (DEBUG_ITEM_H + DEBUG_ITEM_GAP);
        const isBuffSelected = dbg.selectedBuff === j;
        const stacks = _getBuffStacks(def.id);
        const hasBuff = stacks > 0;

        if (isBuffSelected) {
            Game.ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
            Game.ctx.beginPath();
            Game.ctx.roundRect(itemX + 4, by, itemW - 8, DEBUG_ITEM_H, 2);
            Game.ctx.fill();
            Game.ctx.strokeStyle = SCI.green;
            Game.ctx.lineWidth = 1;
            Game.ctx.stroke();
        }

        // 名称
        const rarityColors = { common: '#e8e8f0', rare: '#00ff88', epic: '#bb66ff', legendary: '#ff3355' };
        const nameColor = hasBuff ? (rarityColors[def.rarity] || '#fff') : 'rgba(255,255,255,0.4)';
        Game.ctx.textAlign = 'left';
        Game.ctx.fillStyle = nameColor;
        Game.ctx.font = '16px ' + FONT_UI;
        Game.ctx.fillText(def.name, itemX + 16, by + 22);

        // 层数
        if (hasBuff) {
            Game.ctx.textAlign = 'right';
            Game.ctx.fillStyle = '#ffd700';
            Game.ctx.font = '14px ' + FONT_UI;
            Game.ctx.fillText('x' + stacks, itemX + itemW - 16, by + 22);
        }

        // 稀有度
        Game.ctx.textAlign = 'right';
        Game.ctx.fillStyle = rarityColors[def.rarity] || '#888';
        Game.ctx.globalAlpha = 0.5;
        Game.ctx.font = '11px ' + FONT_PIXEL;
        Game.ctx.fillText((def.rarity || '').toUpperCase(), itemX + itemW - 50, by + 22);
        Game.ctx.globalAlpha = 1;
    }

    Game.ctx.restore();
    Game.ctx.textAlign = 'left';
}

function _getBuffStacks(id) {
    const list = G.player.buffList || [];
    let count = 0;
    for (const bid of list) {
        if (bid === id) count++;
    }
    return count;
}

function drawDebuggerRow(cat, cy, rect, isSelected, dbg) {
    const itemX = rect.x + DEBUG_PADDING;
    const itemW = rect.w - DEBUG_PADDING * 2;
    const itemH = DEBUG_ITEM_H;

    if (isSelected) {
        Game.ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
        Game.ctx.beginPath();
        Game.ctx.roundRect(itemX, cy, itemW, itemH, 2);
        Game.ctx.fill();
        Game.ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        Game.ctx.lineWidth = 1;
        Game.ctx.stroke();
    }

    Game.ctx.textAlign = 'left';
    Game.ctx.fillStyle = cat.color;
    Game.ctx.font = '18px ' + FONT_UI;
    Game.ctx.fillText(cat.name, itemX + 12, cy + 23);

    if (cat.type === 'life') {
        const val = G.game.life;
        Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        Game.ctx.font = '18px ' + FONT_UI;
        Game.ctx.fillText('当前: ' + val, itemX + 100, cy + 23);
        Game.ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        Game.ctx.fillText('[<- -1]  [-> +1]', itemX + itemW - 140, cy + 23);
    } else if (cat.type === 'score') {
        const val = G.game.score;
        Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        Game.ctx.font = '18px ' + FONT_UI;
        Game.ctx.fillText('当前: ' + val, itemX + 100, cy + 23);
        Game.ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
        Game.ctx.fillText('[<- -100]  [-> +100]', itemX + itemW - 180, cy + 23);
    } else if (cat.type === 'enemy') {
        const optStartX = itemX + 80;
        const optW = 70;
        for (let j = 0; j < DEBUG_ENEMY_TYPES.length; j++) {
            const ox = optStartX + j * (optW + 8);
            const isActive = dbg.selectedEnemy === j && dbg.activeType === 'enemy';
            if (isActive) {
                Game.ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
                Game.ctx.beginPath();
                Game.ctx.roundRect(ox, cy + 4, optW, itemH - 8, 2);
                Game.ctx.fill();
                Game.ctx.strokeStyle = '#00e5ff';
                Game.ctx.lineWidth = 1;
                Game.ctx.stroke();
            }
            Game.ctx.fillStyle = isActive ? '#00e5ff' : 'rgba(255, 255, 255, 0.6)';
            Game.ctx.font = '16px ' + FONT_UI;
            Game.ctx.textAlign = 'center';
            Game.ctx.fillText(DEBUG_ENEMY_NAMES[DEBUG_ENEMY_TYPES[j]], ox + optW / 2, cy + itemH / 2 + 5);
        }
        Game.ctx.textAlign = 'left';
    } else if (cat.type === 'boss') {
        const optStartX = itemX + 80;
        const optW = 90;
        for (let j = 0; j < DEBUG_BOSS_TYPES.length; j++) {
            const ox = optStartX + j * (optW + 8);
            const isActive = dbg.selectedBoss === j && dbg.activeType === 'boss';
            if (isActive) {
                Game.ctx.fillStyle = 'rgba(255, 0, 229, 0.25)';
                Game.ctx.beginPath();
                Game.ctx.roundRect(ox, cy + 4, optW, itemH - 8, 2);
                Game.ctx.fill();
                Game.ctx.strokeStyle = '#ff00e5';
                Game.ctx.lineWidth = 1;
                Game.ctx.stroke();
            }
            Game.ctx.fillStyle = isActive ? '#ff00e5' : 'rgba(255, 255, 255, 0.6)';
            Game.ctx.font = '16px ' + FONT_UI;
            Game.ctx.textAlign = 'center';
            Game.ctx.fillText(DEBUG_BOSS_NAMES[DEBUG_BOSS_TYPES[j]], ox + optW / 2, cy + itemH / 2 + 5);
        }
        Game.ctx.textAlign = 'left';
    }
}

function getDebuggerHint() {
    const cat = DEBUG_CATEGORIES[dbg.selectedCategory];
    if (cat.type === 'life') return '↑↓ 选择分类  ←→ 调整数值  D/Enter 关闭';
    if (cat.type === 'score') return '↑↓ 选择分类  ←→ 调整数值  D/Enter 关闭';
    if (cat.type === 'enemy') return '↑↓ 选择分类  ←→ 切换敌人  Enter 召唤  D 关闭';
    if (cat.type === 'boss') return '↑↓ 选择分类  ←→ 切换Boss  Enter 召唤  D 关闭';
    if (cat.type === 'buff') return '↑↓ 选择词条  Enter 强制获得  D 关闭';
    return '';
}

function handleDebuggerKey(e) {
    const cat = DEBUG_CATEGORIES[dbg.selectedCategory];

    if (e.key === 'ArrowUp') {
        if (cat.type === 'buff') {
            if (dbg.selectedBuff > 0) {
                dbg.selectedBuff--;
                if (dbg.selectedBuff < dbg.buffScrollY) dbg.buffScrollY = dbg.selectedBuff;
            }
        } else {
            dbg.selectedCategory = (dbg.selectedCategory - 1 + DEBUG_CATEGORIES.length) % DEBUG_CATEGORIES.length;
            if (cat.type === 'enemy') dbg.activeType = 'enemy';
            else if (cat.type === 'boss') dbg.activeType = 'boss';
        }
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        if (cat.type === 'buff') {
            const allBuffs = BUFF.all();
            if (dbg.selectedBuff < allBuffs.length - 1) {
                dbg.selectedBuff++;
                if (dbg.selectedBuff >= dbg.buffScrollY + DEBUG_BUFF_VISIBLE) {
                    dbg.buffScrollY = dbg.selectedBuff - DEBUG_BUFF_VISIBLE + 1;
                }
            }
        } else {
            dbg.selectedCategory = (dbg.selectedCategory + 1) % DEBUG_CATEGORIES.length;
            const newCat = DEBUG_CATEGORIES[dbg.selectedCategory];
            if (newCat.type === 'enemy') dbg.activeType = 'enemy';
            else if (newCat.type === 'boss') dbg.activeType = 'boss';
        }
        e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
        if (cat.type === 'life') {
            G.game.life = Math.max(0, G.game.life - 1);
        } else if (cat.type === 'score') {
            G.game.score = Math.max(0, G.game.score - 100);
        } else if (cat.type === 'enemy') {
            dbg.activeType = 'enemy';
            dbg.selectedEnemy = (dbg.selectedEnemy - 1 + DEBUG_ENEMY_TYPES.length) % DEBUG_ENEMY_TYPES.length;
        } else if (cat.type === 'boss') {
            dbg.activeType = 'boss';
            dbg.selectedBoss = (dbg.selectedBoss - 1 + DEBUG_BOSS_TYPES.length) % DEBUG_BOSS_TYPES.length;
        }
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        if (cat.type === 'life') {
            G.game.life = Math.min(99, G.game.life + 1);
        } else if (cat.type === 'score') {
            G.game.score = Math.min(999999, G.game.score + 100);
        } else if (cat.type === 'enemy') {
            dbg.activeType = 'enemy';
            dbg.selectedEnemy = (dbg.selectedEnemy + 1) % DEBUG_ENEMY_TYPES.length;
        } else if (cat.type === 'boss') {
            dbg.activeType = 'boss';
            dbg.selectedBoss = (dbg.selectedBoss + 1) % DEBUG_BOSS_TYPES.length;
        }
        e.preventDefault();
    } else if (e.key === 'Enter') {
        if (cat.type === 'enemy') {
            summonDebugEnemy();
        } else if (cat.type === 'boss') {
            summonDebugBoss();
        } else if (cat.type === 'buff') {
            applyDebugBuff();
        } else {
            G.debuggerOpen = false;
        }
        e.preventDefault();
    } else if (e.key === 'd' || e.key === 'D' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        G.debuggerOpen = false;
        e.preventDefault();
    }
}

function applyDebugBuff() {
    const allBuffs = BUFF.all();
    const idx = dbg.selectedBuff;
    if (idx < 0 || idx >= allBuffs.length) return;
    const def = allBuffs[idx];

    // 检查 condition，如果条件不满足则跳过（但强制 apply）
    def.apply(G);
    G.player.buffList.push(def.id);
    G.game.lastChosenBuff = def.id;
}

function summonDebugEnemy() {
    const type = DEBUG_ENEMY_TYPES[dbg.selectedEnemy];
    const sizeMap = { basic: ENEMY1_SIZE, shooter: ENEMY2_SIZE, rusher: ENEMY3_SIZE, spinner: ENEMY4_SIZE, minion: 40 };
    const hpMap = { basic: ENEMY1_HP, shooter: ENEMY2_HP, rusher: ENEMY3_HP, spinner: ENEMY4_HP, minion: 1 };
    const size = sizeMap[type] || 50;
    const hp = hpMap[type] || 1;

    let enemy = { x: 50 + Math.random() * (LOGICAL_W - 150), y: -80, width: size, height: size, hp: hp, type: type };

    if (type === 'shooter') {
        enemy.lastFireTime = Date.now();
        enemy.hoverY = 100 + (Math.random() - 0.5) * 40;
    } else if (type === 'rusher') {
        enemy.lastFireTime = Date.now();
        enemy.spawnTime = Date.now();
        enemy.hasRushed = false;
        enemy.rushTargetX = null;
        enemy.rushTargetY = null;
        enemy.hoverY = 100 + (Math.random() - 0.5) * 40;
    } else if (type === 'spinner') {
        enemy.lastFireTime = Date.now();
        enemy.hoverY = 350;
        enemy.wave2Fired = false;
        enemy.wave3Fired = false;
        enemy.wave2Time = 0;
    }

    G.enemies.push(enemy);
}

function summonDebugBoss() {
    const id = DEBUG_BOSS_TYPES[dbg.selectedBoss];
    const def = BOSS.get(id);
    if (!def || G.boss) return;

    const hpScale = 1 + G.bossRound * BOSS_HP_SCALE_PER_ROUND;
    const bossX = (LOGICAL_W - def.width) / 2;
    G.boss = {
        x: bossX, y: -def.height, width: def.width, height: def.height,
        hp: Math.round(def.hp * hpScale), maxHp: Math.round(def.hp * hpScale),
        targetY: 30, def: def, skillState: 'idle', skillStartTime: 0,
        lastSkillTime: 0, sweepDir: 1, isInvincible: false, shieldAlpha: 0, summoned: false
    };
    G.bossWarning = false;
    G.bossSpawned = true;
}
