// ─── 关卡节点地图 ───

// 地图节点数据（S形蛇行排列）
const _mapNodes = [
    { x: 140, y: 170, img: '陨石素材1.png' },
    { x: 460, y: 260, img: '陨石素材1.png' },
    { x: 140, y: 350, img: '陨石素材5.png' },
    { x: 460, y: 440, img: '陨石素材4.png' },
    { x: 140, y: 530, img: '陨石素材2.png' },
    { x: 460, y: 610, img: '陨石素材3.png' },
    { x: 300, y: 710, img: '陨石素材3.png' }
];

const _mapNodeSize = 56;
let _mapNodeImgs = [];
let _mapLoaded = false;

// 关卡进度（已完成的最高关卡索引，-1=还没开始）
let _levelProgress = -1;

function initLevelMap() {
    // 加载陨石图片
    _mapNodeImgs = _mapNodes.map(n => {
        const img = new Image();
        img.src = 'image/' + n.img;
        return img;
    });
    _mapLoaded = true;
}

function drawLevelMap() {
    const ctx = Game.ctx;
    const now = Date.now();

    // 背景星空
    updateStars();
    drawStars(ctx);

    // 暗色遮罩
    ctx.fillStyle = 'rgba(5, 8, 15, 0.92)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 标题
    ctx.textAlign = 'center';
    drawSciTitle(ctx, 'STAR MAP', LOGICAL_W / 2, 50, 'bold 28px ' + FONT_PIXEL, SCI.primary, 20);

    // 副标题
    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.font = '16px ' + FONT_UI;
    ctx.fillText('选择关卡  点击节点进入', LOGICAL_W / 2, 76);

    // 分隔线
    drawSciSeparator(ctx, LOGICAL_W / 2, 92, 400, SCI.primary);

    // 绘制连接路径
    _drawMapPaths(ctx, now);

    // 绘制节点
    for (let i = 0; i < LEVEL_DATA.length; i++) {
        _drawMapNode(ctx, i, now);
    }

    // 返回按钮
    _drawMapBackBtn(ctx, now);

    ctx.textAlign = 'left';
}

// ─── 连接路径 ───
function _drawMapPaths(ctx, now) {
    for (let i = 0; i < _mapNodes.length - 1; i++) {
        const a = _mapNodes[i];
        const b = _mapNodes[i + 1];

        const completed = i < _levelProgress;
        const accessible = i <= _levelProgress + 1;

        // 贝塞尔曲线控制点（中点偏移制造弧度）
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const cpOff = 40;
        const cpx = mx + (dx > 0 ? -cpOff : cpOff);
        const cpy = my;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);

        if (completed) {
            // 已完成路径：亮色实线
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
        } else if (accessible) {
            // 可达路径：虚线动画
            const dashOffset = -(now / 30) % 20;
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.lineDashOffset = dashOffset;
        } else {
            // 未解锁路径：暗线
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 8]);
        }

        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
    }
}

// ─── 单个节点 ───
function _drawMapNode(ctx, index, now) {
    const node = _mapNodes[index];
    const lv = LEVEL_DATA[index];
    const x = node.x;
    const y = node.y;
    const sz = _mapNodeSize;

    const completed = index <= _levelProgress;
    const playable = index === _levelProgress + 1;
    const locked = index > _levelProgress + 1;
    const isBoss = lv.bossId !== null;

    // Boss 光环
    if (isBoss) {
        const pulse = 0.3 + 0.2 * Math.sin(now / 500 + index);
        ctx.beginPath();
        ctx.arc(x, y, sz / 2 + 12, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 51, 85, ${0.05 * pulse})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 51, 85, ${0.25 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 可进入节点脉冲
    if (playable) {
        const pulse = 0.4 + 0.3 * Math.sin(now / 400);
        ctx.beginPath();
        ctx.arc(x, y, sz / 2 + 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 229, 255, ${pulse * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 外圈扩散
        const expand = (now % 1500) / 1500;
        ctx.beginPath();
        ctx.arc(x, y, sz / 2 + 8 + expand * 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.2 * (1 - expand)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 陨石图片
    const img = _mapNodeImgs[index];
    if (img && img.complete) {
        ctx.save();
        if (locked) {
            ctx.globalAlpha = 0.15;
        } else if (completed) {
            ctx.globalAlpha = 0.6;
        }
        ctx.drawImage(img, x - sz / 2, y - sz / 2, sz, sz);
        ctx.restore();
    } else {
        // 图片未加载时绘制占位圆
        ctx.beginPath();
        ctx.arc(x, y, sz / 2, 0, Math.PI * 2);
        ctx.fillStyle = locked ? 'rgba(255,255,255,0.03)' : 'rgba(0,229,255,0.1)';
        ctx.fill();
        ctx.strokeStyle = locked ? 'rgba(255,255,255,0.08)' : 'rgba(0,229,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 已完成标记 ✓
    if (completed) {
        ctx.fillStyle = SCI.green;
        ctx.shadowBlur = 8;
        ctx.shadowColor = SCI.green;
        ctx.font = 'bold 16px ' + FONT_PIXEL;
        ctx.textAlign = 'center';
        ctx.fillText('✓', x + sz / 2 - 2, y - sz / 2 + 12);
        ctx.shadowBlur = 0;
    }

    // 锁定标记
    if (locked) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.font = '20px ' + FONT_UI;
        ctx.textAlign = 'center';
        ctx.fillText('🔒', x, y + 5);
    }

    // Boss 标签
    if (isBoss) {
        ctx.fillStyle = SCI.red;
        ctx.shadowBlur = 6;
        ctx.shadowColor = SCI.red;
        ctx.font = 'bold 10px ' + FONT_PIXEL;
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', x, y + sz / 2 + 18);
        ctx.shadowBlur = 0;
    }

    // 关卡编号（节点上方）
    ctx.fillStyle = locked ? 'rgba(255,255,255,0.12)' : (isBoss ? '#ff6677' : '#e8e8f0');
    ctx.font = 'bold 12px ' + FONT_PIXEL;
    ctx.textAlign = 'center';
    ctx.fillText('' + lv.id, x, y - sz / 2 - 10);

    // 关卡名称（节点下方）
    const nameY = isBoss ? y + sz / 2 + 32 : y + sz / 2 + 18;
    ctx.fillStyle = locked ? 'rgba(255,255,255,0.08)' : 'rgba(0, 229, 255, 0.5)';
    ctx.font = '14px ' + FONT_UI;
    ctx.fillText(lv.name, x, nameY);
}

// ─── 返回按钮 ───
const _mapBackBtnRect = { x: LOGICAL_W / 2 - 60, y: LOGICAL_H - 40, width: 120, height: 30 };

function _drawMapBackBtn(ctx, now) {
    const btn = _mapBackBtnRect;
    const pulse = 0.7 + 0.3 * Math.abs(Math.sin(now / 600));

    ctx.strokeStyle = `rgba(0, 229, 255, ${0.25 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(0, 229, 255, ${0.35 * pulse})`;
    ctx.font = '12px ' + FONT_PIXEL;
    ctx.textAlign = 'center';
    ctx.fillText('BACK', btn.x + btn.width / 2, btn.y + btn.height / 2 + 4);
    ctx.textAlign = 'left';
}

// ─── 地图点击检测 ───
function getMapClickTarget(mx, my) {
    // 检查返回按钮
    const btn = _mapBackBtnRect;
    if (mx >= btn.x && mx <= btn.x + btn.width && my >= btn.y && my <= btn.y + btn.height) {
        return 'back';
    }

    // 检查节点
    for (let i = 0; i < _mapNodes.length; i++) {
        const node = _mapNodes[i];
        const dx = mx - node.x;
        const dy = my - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= _mapNodeSize / 2 + 10) {
            if (i <= _levelProgress + 1) {
                return i;
            }
        }
    }
    return -1;
}
