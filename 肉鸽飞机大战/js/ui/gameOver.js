// ─── Game Over 画面 + 受伤特效 ───

function drawGameOver() {
    const ctx = Game.ctx;

    ctx.fillStyle = 'rgba(5, 8, 15, 0.85)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const cx = LOGICAL_W / 2;
    // 故障抖动
    const shakeX = (Math.random() - 0.5) * 3;
    const shakeY = (Math.random() - 0.5) * 3;

    ctx.textAlign = 'center';

    // GAME OVER 标题
    drawSciTitle(ctx, 'GAME OVER', cx + shakeX, LOGICAL_H / 2 - 45 + shakeY, '36px ' + FONT_PIXEL, SCI.red, 25);

    // 故障条纹特效
    for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.4) {
            const gy = LOGICAL_H / 2 - 60 + Math.random() * 120;
            ctx.fillStyle = `rgba(255, 51, 85, ${0.04 + Math.random() * 0.06})`;
            ctx.fillRect(0, gy, LOGICAL_W, 2 + Math.random() * 4);
        }
    }

    // 分隔线
    drawSciSeparator(ctx, cx, LOGICAL_H / 2 - 12, 200, SCI.red);

    // 分数
    ctx.fillStyle = SCI.gold;
    ctx.font = '18px ' + FONT_PIXEL;
    ctx.shadowBlur = 10;
    ctx.shadowColor = SCI.gold;
    ctx.fillText('SCORE ' + G.game.score, cx, LOGICAL_H / 2 + 25);
    ctx.shadowBlur = 0;

    // 等级
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.font = '20px ' + FONT_UI;
    ctx.fillText('Lv.' + G.player.playerLevel, cx, LOGICAL_H / 2 + 50);

    ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.font = '22px ' + FONT_UI;
    ctx.fillText('按 R 重新开始', cx, LOGICAL_H / 2 + 82);
}

// ─── 受伤效果 ───
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
            grad.addColorStop(0, `rgba(255, 51, 85, ${alpha})`);
            grad.addColorStop(1, 'rgba(255, 51, 85, 0)');
            Game.ctx.fillStyle = grad;
            Game.ctx.fillRect(fx, fy, fw, fh);
        }
    }
}

// ─── 关卡通关画面 ───
function drawLevelComplete() {
    const level = getCurrentLevel();
    if (!level) return;
    const ctx = Game.ctx;

    ctx.fillStyle = 'rgba(5, 8, 15, 0.82)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const cx = LOGICAL_W / 2;
    ctx.textAlign = 'center';

    // STAGE CLEAR 标题
    drawSciTitle(ctx, 'STAGE CLEAR', cx, LOGICAL_H / 2 - 60, '32px ' + FONT_PIXEL, SCI.gold, 22);

    // 分隔线
    drawSciSeparator(ctx, cx, LOGICAL_H / 2 - 28, 200, SCI.gold);

    // 关卡名
    ctx.fillStyle = SCI.primary;
    ctx.font = '22px ' + FONT_UI;
    ctx.shadowBlur = 10;
    ctx.shadowColor = SCI.primary;
    ctx.fillText('第' + level.id + '关 · ' + level.name, cx, LOGICAL_H / 2);
    ctx.shadowBlur = 0;

    // 分数
    ctx.fillStyle = SCI.gold;
    ctx.font = '18px ' + FONT_PIXEL;
    ctx.shadowBlur = 10;
    ctx.shadowColor = SCI.gold;
    ctx.fillText('SCORE ' + G.game.score, cx, LOGICAL_H / 2 + 30);
    ctx.shadowBlur = 0;

    // 提示
    const isLastLevel = G.game.currentLevel >= LEVEL_DATA.length - 1;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.font = '20px ' + FONT_UI;
    if (isLastLevel) {
        ctx.fillText('恭喜通关！按 Enter 返回菜单', cx, LOGICAL_H / 2 + 65);
    } else {
        ctx.fillText('按 Enter 进入下一关', cx, LOGICAL_H / 2 + 65);
    }

    ctx.textAlign = 'left';
}
