// ─── 开始画面 ───

const startBtn = { x: LOGICAL_W / 2 - 80, y: LOGICAL_H / 2 + 30, width: 160, height: 54 };

function drawStartScreen() {
    updateStars();
    updateBgPlanes();
    drawStars(Game.ctx);
    drawBgPlanes(Game.ctx);

    // 暖调遮罩
    Game.ctx.fillStyle = 'rgba(13, 13, 18, 0.85)';
    Game.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const cx = LOGICAL_W / 2;

    // 标题（中文用 VT323 大号）
    Game.ctx.textAlign = 'center';
    drawNeonText(Game.ctx, '超时空激战', cx, LOGICAL_H / 2 - 70, 'bold 48px ' + FONT_UI, '#ffb300', 30);

    // 副标题
    Game.ctx.fillStyle = 'rgba(255, 179, 0, 0.7)';
    Game.ctx.font = '22px ' + FONT_UI;
    Game.ctx.fillText('无尽冒险 · 词条搭配', cx, LOGICAL_H / 2 - 32);

    // 分隔线（琥珀色）
    const lineW = 180;
    const lineY = LOGICAL_H / 2 - 14;
    const grad = Game.ctx.createLinearGradient(cx - lineW / 2, 0, cx + lineW / 2, 0);
    grad.addColorStop(0, 'rgba(255, 179, 0, 0)');
    grad.addColorStop(0.5, 'rgba(255, 179, 0, 0.6)');
    grad.addColorStop(1, 'rgba(255, 179, 0, 0)');
    Game.ctx.strokeStyle = grad;
    Game.ctx.lineWidth = 2;
    Game.ctx.beginPath();
    Game.ctx.moveTo(cx - lineW / 2, lineY);
    Game.ctx.lineTo(cx + lineW / 2, lineY);
    Game.ctx.stroke();

    // START 按钮
    const bx = startBtn.x, by = startBtn.y, bw = startBtn.width, bh = startBtn.height;
    const pulse = 0.7 + 0.3 * Math.abs(Math.sin(Date.now() / 600));

    Game.ctx.shadowBlur = 16 * pulse;
    Game.ctx.shadowColor = '#ffb300';
    Game.ctx.strokeStyle = 'rgba(255, 179, 0, 0.7)';
    Game.ctx.lineWidth = 2;
    Game.ctx.beginPath();
    Game.ctx.roundRect(bx, by, bw, bh, 2);
    Game.ctx.stroke();
    Game.ctx.shadowBlur = 0;

    Game.ctx.fillStyle = `rgba(255, 179, 0, ${0.1 * pulse})`;
    Game.ctx.beginPath();
    Game.ctx.roundRect(bx, by, bw, bh, 2);
    Game.ctx.fill();

    // 四角像素装饰
    drawPixelCorners(Game.ctx, bx, by, bw, bh, 4, 'rgba(255, 179, 0, 0.6)');

    // 按钮文字
    Game.ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + 0.3 * pulse})`;
    Game.ctx.font = '14px ' + FONT_PIXEL;
    Game.ctx.fillText('START', cx, by + bh / 2 + 5);

    // 操作提示
    Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    Game.ctx.font = '18px ' + FONT_UI;
    Game.ctx.fillText('方向键/WASD 移动  空格 超频  P 暂停', cx, LOGICAL_H - 35);

    Game.ctx.textAlign = 'left';
}
