// ─── UI 公共工具函数和常量 ───

// 字体常量
const FONT_PIXEL = 'Press Start 2P, monospace';
const FONT_UI = 'VT323, monospace';

// 像素角装饰
function drawPixelCorners(ctx, x, y, w, h, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.fillRect(x + w - size, y, size, size);
    ctx.fillRect(x, y + h - size, size, size);
    ctx.fillRect(x + w - size, y + h - size, size, size);
}

// 霓虹发光文字
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
