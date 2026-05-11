// ─── UI 公共工具函数和常量 ───

// 字体常量
const FONT_PIXEL = 'Press Start 2P, monospace';
const FONT_UI = 'VT323, monospace';

// 科幻配色
const SCI = {
    primary:  '#00e5ff',
    accent:   '#00ffcc',
    gold:     '#ffd700',
    green:    '#00ff88',
    red:      '#ff3355',
    magenta:  '#ff00e5',
    white:    '#e8e8f0',
    dim:      'rgba(255,255,255,0.3)',
    panelBg:  'rgba(8, 14, 28, 0.9)',
    cardBg:   'rgba(12, 18, 38, 0.94)',
    border:   'rgba(0, 229, 255, 0.25)',
    borderBright: 'rgba(0, 229, 255, 0.55)',
};

// 像素角装饰（保留兼容）
function drawPixelCorners(ctx, x, y, w, h, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.fillRect(x + w - size, y, size, size);
    ctx.fillRect(x, y + h - size, size, size);
    ctx.fillRect(x + w - size, y + h - size, size, size);
}

// 科幻角括号装饰（L形边角）
function drawSciCorners(ctx, x, y, w, h, len, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    // 左上
    ctx.beginPath();
    ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    ctx.stroke();
    // 右上
    ctx.beginPath();
    ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
    ctx.stroke();
    // 左下
    ctx.beginPath();
    ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
    ctx.stroke();
    // 右下
    ctx.beginPath();
    ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
    ctx.stroke();
}

// 科幻面板背景 + 边框 + 角装饰
function drawSciPanel(ctx, x, y, w, h, opts) {
    const o = Object.assign({ bg: SCI.panelBg, borderColor: SCI.border, cornerLen: 10, cornerColor: SCI.primary, radius: 2, glow: 0 }, opts);
    // 背景
    ctx.fillStyle = o.bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, o.radius);
    ctx.fill();
    // 边框
    ctx.strokeStyle = o.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, o.radius);
    ctx.stroke();
    // 辉光
    if (o.glow > 0) {
        ctx.save();
        ctx.shadowBlur = o.glow;
        ctx.shadowColor = o.cornerColor;
        ctx.strokeStyle = o.cornerColor;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, o.radius);
        ctx.stroke();
        ctx.restore();
    }
    // 角装饰
    drawSciCorners(ctx, x, y, w, h, o.cornerLen, o.cornerColor + '88');
}

// 霓虹发光文字（保留原接口，增强效果）
function drawNeonText(ctx, text, x, y, font, color, blur) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.shadowBlur = blur || 30;
    ctx.shadowColor = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = Math.floor((blur || 30) / 3);
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
}

// 科幻标题文字（发光 + 下划光线）
function drawSciTitle(ctx, text, x, y, font, color, blur) {
    drawNeonText(ctx, text, x, y, font, color, blur);
    // 底部光线
    const tw = ctx.measureText(text).width;
    const grad = ctx.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.3, color);
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, y + 8);
    ctx.lineTo(x + tw / 2, y + 8);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// 科幻分隔线
function drawSciSeparator(ctx, cx, y, lineW, color) {
    const c = color || SCI.primary;
    const grad = ctx.createLinearGradient(cx - lineW / 2, 0, cx + lineW / 2, 0);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.2, c);
    grad.addColorStop(0.5, c);
    grad.addColorStop(0.8, c);
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - lineW / 2, y);
    ctx.lineTo(cx + lineW / 2, y);
    ctx.stroke();
    // 中心菱形
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(cx, y - 3);
    ctx.lineTo(cx + 3, y);
    ctx.lineTo(cx, y + 3);
    ctx.lineTo(cx - 3, y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
}

// 文本自动换行（中英文混合）
function _wrapText(text, fontSize, maxWidth) {
    const lines = [];
    let line = '';
    let lineW = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const chW = ch.charCodeAt(0) > 127 ? fontSize : fontSize * 0.6;
        if (lineW + chW > maxWidth && line.length > 0) {
            lines.push(line);
            line = ch;
            lineW = chW;
        } else {
            line += ch;
            lineW += chW;
        }
    }
    if (line.length > 0) lines.push(line);
    return lines;
}
