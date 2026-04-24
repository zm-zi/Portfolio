// ─── 开始画面 + 关卡选择 + 战机选择 ───

let startScreenMode = 'main'; // 'main' | 'levelSelect' | 'selectAircraft'
let _pendingGameMode = 'endless'; // 选完战机后启动的模式
let _pendingLevelIndex = 0;       // 关卡模式时的关卡索引
let _selectedAircraftIndex = 0;   // 主页选中战机索引

// 主画面按钮（底部左右排列）
const _btnW = 180, _btnH = 50, _btnGap = 30;
const endlessBtn = { x: LOGICAL_W / 2 - _btnW - _btnGap / 2, y: LOGICAL_H - 110, width: _btnW, height: _btnH };
const levelBtn = { x: LOGICAL_W / 2 + _btnGap / 2, y: LOGICAL_H - 110, width: _btnW, height: _btnH };

// 主页战机选择器箭头按钮（中间大预览区）
const _selectorArrowW = 36;
const _selectorCenterY = LOGICAL_H / 2 + 40;
const _selectorLeftBtn = { x: LOGICAL_W / 2 - 170 - 10 - _selectorArrowW, y: _selectorCenterY - 18, width: _selectorArrowW, height: _selectorArrowW };
const _selectorRightBtn = { x: LOGICAL_W / 2 + 170 + 10, y: _selectorCenterY - 18, width: _selectorArrowW, height: _selectorArrowW };

function drawStartScreen() {
    if (startScreenMode === 'levelSelect') {
        drawLevelMap();
        return;
    }
    if (startScreenMode === 'selectAircraft') {
        drawAircraftSelect();
        return;
    }

    updateStars();
    updateBgPlanes();
    drawStars(Game.ctx);
    drawBgPlanes(Game.ctx);

    Game.ctx.fillStyle = 'rgba(5, 8, 15, 0.88)';
    Game.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    drawMainMenu();
}

function drawMainMenu() {
    const cx = LOGICAL_W / 2;
    const ctx = Game.ctx;

    ctx.textAlign = 'center';

    // ── 上部：标题区 ──
    const titleY = 70;
    drawSciTitle(ctx, '超时空激战', cx, titleY, 'bold 48px ' + FONT_UI, SCI.primary, 25);

    // 副标题
    ctx.fillStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.font = '20px ' + FONT_UI;
    ctx.fillText('无尽冒险 · 词条搭配', cx, titleY + 32);

    // 分隔线
    drawSciSeparator(ctx, cx, titleY + 52, 260, SCI.primary);

    // ── 中部：大号战机预览 ──
    _drawAircraftPreview(ctx, Date.now());

    // ── 下部：模式按钮左右排列 ──
    _drawMenuButton(endlessBtn, '无尽冒险', SCI.primary);
    _drawMenuButton(levelBtn, '关卡模式', SCI.accent);

    // 底部控制提示
    ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.font = '16px ' + FONT_UI;
    ctx.fillText('方向键/WASD 移动  空格 超频  P 暂停', cx, LOGICAL_H - 28);

    ctx.textAlign = 'left';
}

// ─── 通用绘制工具 ───

function drawSeparator(cx, y, lineW) {
    drawSciSeparator(Game.ctx, cx, y, lineW, SCI.primary);
}

function _drawMenuButton(btn, label, color) {
    const bx = btn.x, by = btn.y, bw = btn.width, bh = btn.height;
    const pulse = 0.7 + 0.3 * Math.abs(Math.sin(Date.now() / 600));
    const ctx = Game.ctx;

    // 背景
    ctx.fillStyle = `rgba(0, 229, 255, ${0.04 * pulse})`;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 2);
    ctx.fill();

    // 边框 + 发光
    ctx.save();
    ctx.shadowBlur = 12 * pulse;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 2);
    ctx.stroke();
    ctx.restore();

    // 角括号装饰
    drawSciCorners(ctx, bx, by, bw, bh, 8, color + '88');

    // 文字
    ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + 0.2 * pulse})`;
    ctx.font = '14px ' + FONT_PIXEL;
    ctx.textAlign = 'center';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 5);
    ctx.textAlign = 'left';
}

function getSelectedAircraftId() {
    return _getCraftCards()[_selectedAircraftIndex].id;
}

function getMainAircraftClickTarget(mx, my) {
    const lb = _selectorLeftBtn;
    if (mx >= lb.x && mx <= lb.x + lb.width && my >= lb.y && my <= lb.y + lb.height) return 'prev';
    const rb = _selectorRightBtn;
    if (mx >= rb.x && mx <= rb.x + rb.width && my >= rb.y && my <= rb.y + rb.height) return 'next';
    return null;
}

function _drawArrowBtn(ctx, btn, label, color) {
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(Date.now() / 500));
    ctx.save();
    ctx.shadowBlur = 8 * pulse;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * pulse})`;
    ctx.font = '16px ' + FONT_PIXEL;
    ctx.textAlign = 'center';
    ctx.fillText(label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 5);
    ctx.restore();
}

function _drawAircraftPreview(ctx, now) {
    const card = _getCraftCards()[_selectedAircraftIndex];
    const color = card.color;
    const pulse = 0.7 + 0.3 * Math.abs(Math.sin(now / 600));
    const cx = LOGICAL_W / 2;
    const cy = _selectorCenterY;

    // 预览区域尺寸
    const areaW = 340;
    const areaH = 340;
    const areaX = cx - areaW / 2;
    const areaY = cy - areaH / 2 + 10;

    // 区域背景
    ctx.fillStyle = `rgba(0, 229, 255, ${0.025 * pulse})`;
    ctx.beginPath();
    ctx.roundRect(areaX, areaY, areaW, areaH, 4);
    ctx.fill();

    // 选中边框 + 发光
    ctx.save();
    ctx.shadowBlur = 14 * pulse;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5 + 0.5 * pulse;
    ctx.beginPath();
    ctx.roundRect(areaX, areaY, areaW, areaH, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();

    drawSciCorners(ctx, areaX, areaY, areaW, areaH, 14, color + '88');

    // 战机图片（大号）
    const selectedDef = _getCraftCards()[_selectedAircraftIndex];
    const img = selectedDef ? (CRAFT.get(selectedDef.id) || {})._img : null;
    const imgSize = 220;
    if (img && img.complete) {
        Game.Util.drawImageFit(ctx, img, cx - imgSize / 2, areaY + (areaH - imgSize) / 2 - 10, imgSize, imgSize);
    }

    // 战机名称
    ctx.fillStyle = color;
    ctx.font = 'bold 22px ' + FONT_UI;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.textAlign = 'center';
    ctx.fillText(card.name, cx, areaY + areaH - 30);
    ctx.shadowBlur = 0;

    // 简要描述
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px ' + FONT_UI;
    ctx.fillText(card.desc, cx, areaY + areaH - 8);

    // 左右箭头
    _drawArrowBtn(ctx, _selectorLeftBtn, '<', color);
    _drawArrowBtn(ctx, _selectorRightBtn, '>', color);

    // 操作提示
    ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.font = '13px ' + FONT_UI;
    ctx.fillText('← → 切换战机', cx, areaY + areaH + 30);

    ctx.textAlign = 'left';
}

// ─── 战机选择画面 ───

function _getCraftCards() {
    return CRAFT.all().map(c => ({
        id: c.id,
        name: c.name,
        desc: c.desc,
        color: c.color,
        details: c.details
    }));
}

const _aircraftCardMaxW = 200;
const _aircraftCardH = 260;
const _aircraftCardGap = 10;

function _getCraftCardW() {
    const n = _getCraftCards().length;
    const totalGap = (n - 1) * _aircraftCardGap;
    return Math.min(_aircraftCardMaxW, Math.floor((LOGICAL_W - totalGap - 20) / n));
}

function _getCraftStartX() {
    const cards = _getCraftCards();
    const w = _getCraftCardW();
    const totalW = cards.length * w + (cards.length - 1) * _aircraftCardGap;
    return (LOGICAL_W - totalW) / 2;
}

function getAircraftCardRect(index) {
    const w = _getCraftCardW();
    const cardY = LOGICAL_H / 2 - _aircraftCardH / 2 + 20;
    return {
        x: _getCraftStartX() + index * (w + _aircraftCardGap),
        y: cardY,
        width: w,
        height: _aircraftCardH
    };
}

function _getAircraftBackBtn() {
    const cardY = LOGICAL_H / 2 - _aircraftCardH / 2 + 20;
    return { x: LOGICAL_W / 2 - 60, y: cardY + _aircraftCardH + 25, width: 120, height: 40 };
}

function drawAircraftSelect() {
    const ctx = Game.ctx;
    const now = Date.now();

    updateStars();
    drawStars(ctx);

    ctx.fillStyle = 'rgba(5, 8, 15, 0.93)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    ctx.textAlign = 'center';
    drawSciTitle(ctx, 'SELECT CRAFT', LOGICAL_W / 2, 50, 'bold 28px ' + FONT_PIXEL, SCI.primary, 20);

    ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.font = '16px ' + FONT_UI;
    ctx.fillText('选择战机  点击卡片或按 1/2/3/4', LOGICAL_W / 2, 76);

    // 分隔线
    drawSciSeparator(ctx, LOGICAL_W / 2, 92, 300, SCI.primary);

    // 绘制卡片
    for (let i = 0; i < _getCraftCards().length; i++) {
        _drawAircraftCard(ctx, i, now);
    }

    // 返回按钮
    _drawMenuButton(_getAircraftBackBtn(), '返回', 'rgba(255,255,255,0.4)');

    ctx.textAlign = 'left';
}

function _drawAircraftCard(ctx, index, now) {
    const card = _getCraftCards()[index];
    const rect = getAircraftCardRect(index);
    const pulse = 0.7 + 0.3 * Math.abs(Math.sin(now / 600 + index * 1.5));
    const color = card.color;

    ctx.save();

    // 卡片背景
    ctx.fillStyle = SCI.cardBg;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 2);
    ctx.fill();

    // 边框 + 发光
    ctx.shadowBlur = 10 * pulse;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6 + 0.4 * pulse;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // 角括号装饰
    drawSciCorners(ctx, rect.x, rect.y, rect.width, rect.height, 10, color + '88');

    // 顶部色带
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.width, 40, [2, 2, 0, 0]);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(rect.x, rect.y, rect.width, 40);
    ctx.globalAlpha = 1;
    ctx.restore();

    // 战机图片
    const craftDef = CRAFT.get(card.id);
    const img = craftDef && craftDef._img;
    const imgSize = 80;
    const imgX = rect.x + (rect.width - imgSize) / 2;
    const imgY = rect.y + 20;
    if (img && img.complete) {
        Game.Util.drawImageFit(ctx, img, imgX, imgY, imgSize, imgSize);
    }

    // 战机名称
    ctx.fillStyle = color;
    ctx.font = 'bold 18px ' + FONT_UI;
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fillText(card.name, rect.x + rect.width / 2, rect.y + 120);
    ctx.shadowBlur = 0;

    // 副标题
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '13px ' + FONT_UI;
    ctx.fillText(card.desc, rect.x + rect.width / 2, rect.y + 142);

    // 分隔小线
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + 30, rect.y + 155);
    ctx.lineTo(rect.x + rect.width - 30, rect.y + 155);
    ctx.stroke();

    // 属性详情
    ctx.font = '12px ' + FONT_UI;
    ctx.textAlign = 'left';
    for (let j = 0; j < card.details.length; j++) {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.55)';
        ctx.fillText(card.details[j], rect.x + 25, rect.y + 178 + j * 20);
    }
    ctx.textAlign = 'center';

    // 编号
    ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.font = 'bold 12px ' + FONT_PIXEL;
    ctx.fillText('' + (index + 1), rect.x + rect.width / 2, rect.y + rect.height - 12);

    ctx.restore();
}

function getAircraftClickTarget(mx, my) {
    // 返回按钮
    const btn = _getAircraftBackBtn();
    if (mx >= btn.x && mx <= btn.x + btn.width && my >= btn.y && my <= btn.y + btn.height) {
        return 'back';
    }
    // 卡片
    for (let i = 0; i < _getCraftCards().length; i++) {
        const rect = getAircraftCardRect(i);
        if (mx >= rect.x && mx <= rect.x + rect.width && my >= rect.y && my <= rect.y + rect.height) {
            return _getCraftCards()[i].id;
        }
    }
    return null;
}

function startGameWithAircraft(aircraftId) {
    G.player.aircraftType = aircraftId;
    resetState();
    if (_pendingGameMode === 'level') {
        beginLevel(_pendingLevelIndex);
    } else {
        G.game.gameMode = 'endless';
        beginGame();
    }
}
