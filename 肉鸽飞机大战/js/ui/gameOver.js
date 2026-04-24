// ─── Game Over 画面 + 受伤特效 ───

function drawGameOver() {
    Game.ctx.fillStyle = 'rgba(13, 13, 18, 0.8)';
    Game.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const cx = LOGICAL_W / 2;
    // 故障抖动
    const shakeX = (Math.random() - 0.5) * 2;
    const shakeY = (Math.random() - 0.5) * 2;

    Game.ctx.textAlign = 'center';
    drawNeonText(Game.ctx, 'GAME OVER', cx + shakeX, LOGICAL_H / 2 - 45 + shakeY, '36px ' + FONT_PIXEL, '#ff2e2e', 30);

    // 分隔线
    const lineW = 200;
    const lineY = LOGICAL_H / 2 - 15;
    const grad = Game.ctx.createLinearGradient(cx - lineW / 2, 0, cx + lineW / 2, 0);
    grad.addColorStop(0, 'rgba(255, 46, 46, 0)');
    grad.addColorStop(0.5, 'rgba(255, 46, 46, 0.5)');
    grad.addColorStop(1, 'rgba(255, 46, 46, 0)');
    Game.ctx.strokeStyle = grad;
    Game.ctx.lineWidth = 2;
    Game.ctx.beginPath();
    Game.ctx.moveTo(cx - lineW / 2, lineY);
    Game.ctx.lineTo(cx + lineW / 2, lineY);
    Game.ctx.stroke();

    // 分数
    Game.ctx.fillStyle = '#ffd700';
    Game.ctx.font = '18px ' + FONT_PIXEL;
    Game.ctx.shadowBlur = 10;
    Game.ctx.shadowColor = '#ffd700';
    Game.ctx.fillText('SCORE ' + G.game.score, cx, LOGICAL_H / 2 + 20);
    Game.ctx.shadowBlur = 0;

    // 等级
    Game.ctx.fillStyle = 'rgba(255, 179, 0, 0.7)';
    Game.ctx.font = '20px ' + FONT_UI;
    Game.ctx.fillText('Lv.' + G.player.playerLevel, cx, LOGICAL_H / 2 + 48);

    Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    Game.ctx.font = '22px ' + FONT_UI;
    Game.ctx.fillText('按 R 重新开始', cx, LOGICAL_H / 2 + 80);
}

// ─── 受伤效果（增强版）───
function drawHitEffect() {
    const p = G.player;
    if (p.hitEffect > 0) {
        const alpha = p.hitEffect / 15 * 0.5;
        const spread = 80;
        const edges = [
            [0, 0, LOGICAL_W, spread, 0, 0, 0, spread],
            [0, LOGICAL_H - spread, LOGICAL_W, spread, 0, LOGICAL_H, 0, LOGICAL_H - spread],
            [0, 0, spread, LOGICAL_H, 0, 0, spread, 0],
            [LOGICAL_W - spread, 0, spread, LOGICAL_H, LOGICAL_W, 0, LOGICAL_W - spread, 0]
        ];
        for (const [fx, fy, fw, fh, gx1, gy1, gx2, gy2] of edges) {
            const grad = Game.ctx.createLinearGradient(gx1, gy1, gx2, gy2);
            grad.addColorStop(0, `rgba(255, 46, 46, ${alpha})`);
            grad.addColorStop(1, 'rgba(255, 46, 46, 0)');
            Game.ctx.fillStyle = grad;
            Game.ctx.fillRect(fx, fy, fw, fh);
        }
    }
}
