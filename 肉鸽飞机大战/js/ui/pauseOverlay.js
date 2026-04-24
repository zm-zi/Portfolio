// ─── 暂停按钮、暂停覆盖层、设置面板 ───

const pauseBtn = { x: 12, y: 14, width: 30, height: 30 };
const settingsBtn = { x: LOGICAL_W / 2 - 50, y: LOGICAL_H / 2 + 65, width: 100, height: 36 };

// ─── 暂停按钮（方形像素风）───
function drawPauseBtn() {
    const { x: bx, y: by, width: bw, height: bh } = pauseBtn;
    Game.ctx.fillStyle = 'rgba(22, 22, 34, 0.85)';
    Game.ctx.beginPath();
    Game.ctx.roundRect(bx, by, bw, bh, 2);
    Game.ctx.fill();
    Game.ctx.strokeStyle = 'rgba(255, 179, 0, 0.35)';
    Game.ctx.lineWidth = 2;
    Game.ctx.stroke();

    // 暂停竖线（粗）
    Game.ctx.fillStyle = 'rgba(255, 179, 0, 0.7)';
    const barW = 6, barH = 14, gap = 4;
    const barY = by + (bh - barH) / 2;
    Game.ctx.fillRect(bx + bw / 2 - gap - barW, barY, barW, barH);
    Game.ctx.fillRect(bx + bw / 2 + gap, barY, barW, barH);
}

// ─── 暂停覆盖层 ───
function drawPauseOverlay() {
    Game.ctx.fillStyle = 'rgba(13, 13, 18, 0.75)';
    Game.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const cx = LOGICAL_W / 2;
    Game.ctx.textAlign = 'center';

    // 暂停图标（粗像素块）
    Game.ctx.fillStyle = 'rgba(255, 179, 0, 0.7)';
    Game.ctx.fillRect(cx - 20, LOGICAL_H / 2 - 55, 12, 40);
    Game.ctx.fillRect(cx + 8, LOGICAL_H / 2 - 55, 12, 40);

    // PAUSED 文字
    drawNeonText(Game.ctx, 'PAUSED', cx, LOGICAL_H / 2 + 10, '28px ' + FONT_PIXEL, '#ffb300', 20);

    Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    Game.ctx.font = '20px ' + FONT_UI;
    Game.ctx.fillText('按 P 继续  按 D 打开调试器', cx, LOGICAL_H / 2 + 42);

    // 设置按钮
    const sb = settingsBtn;
    Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    Game.ctx.fillRect(sb.x, sb.y, sb.width, sb.height);
    Game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    Game.ctx.lineWidth = 1;
    Game.ctx.strokeRect(sb.x, sb.y, sb.width, sb.height);
    Game.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    Game.ctx.font = '18px ' + FONT_UI;
    Game.ctx.fillText('设置', cx, sb.y + 23);

    if (G.debuggerOpen) {
        drawDebugger();
    }
}

// ─── 设置面板 ───
const _settingsPanel = {
    x: LOGICAL_W / 2 - 180,
    y: LOGICAL_H / 2 - 150,
    w: 360,
    h: 300
};

// 滑条定义
const _sliderBGM = { label: '音乐', y: 0 };
const _sliderSFX = { label: '音效', y: 0 };
const _sliderCloseBtn = { x: 0, y: 0, w: 80, h: 32 };

// 帧率按钮定义
const _fpsOptions = [0, 60, 90, 120, 144, 200];
const _fpsLabels = ['不限', '60', '90', '120', '144', '200'];
const _fpsButtons = []; // 由 drawSettingsPanel 动态计算

function _getSliderRect(sliderY) {
    const p = _settingsPanel;
    const trackX = p.x + 100;
    const trackY = sliderY - 4;
    const trackW = 200;
    const trackH = 8;
    return { trackX, trackY, trackW, trackH };
}

function _drawSlider(label, value, sliderY) {
    const ctx = Game.ctx;
    const p = _settingsPanel;
    const { trackX, trackY, trackW, trackH } = _getSliderRect(sliderY);

    // 标签
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '20px ' + FONT_UI;
    ctx.fillText(label, p.x + 90, sliderY + 5);

    // 滑轨底
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(trackX, trackY, trackW, trackH);

    // 滑轨填充
    const fillW = trackW * value;
    ctx.fillStyle = 'rgba(255, 179, 0, 0.7)';
    ctx.fillRect(trackX, trackY, fillW, trackH);

    // 拖柄圆
    const knobX = trackX + fillW;
    const knobY = sliderY;
    ctx.beginPath();
    ctx.arc(knobX, knobY, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb300';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 百分比
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px ' + FONT_UI;
    ctx.fillText(Math.round(value * 100) + '%', trackX + trackW + 12, sliderY + 5);
}

function drawSettingsPanel() {
    const ctx = Game.ctx;
    const p = _settingsPanel;

    // 遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 面板背景
    ctx.fillStyle = 'rgba(13, 13, 18, 0.92)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(255, 179, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    drawPixelCorners(ctx, p.x, p.y, p.w, p.h, 8, 'rgba(255, 179, 0, 0.6)');

    // 标题
    ctx.textAlign = 'center';
    drawNeonText(ctx, '设置', LOGICAL_W / 2, p.y + 38, '22px ' + FONT_PIXEL, '#ffb300', 15);

    // 分隔线
    ctx.fillStyle = 'rgba(255, 179, 0, 0.2)';
    ctx.fillRect(p.x + 20, p.y + 55, p.w - 40, 1);

    // 滑条
    const bgmY = p.y + 100;
    const sfxY = p.y + 160;
    _sliderBGM.y = bgmY;
    _sliderSFX.y = sfxY;
    _drawSlider(_sliderBGM.label, G.game.bgmVolume, bgmY);
    _drawSlider(_sliderSFX.label, G.game.sfxVolume, sfxY);

    // 帧率选择
    const fpsY = p.y + 220;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '20px ' + FONT_UI;
    ctx.fillText('帧率', p.x + 90, fpsY + 5);

    const btnW = 40;
    const btnH = 26;
    const btnGap = 4;
    const fpsStartX = p.x + 100;
    _fpsButtons.length = 0;

    for (let i = 0; i < _fpsOptions.length; i++) {
        const bx = fpsStartX + i * (btnW + btnGap);
        const isActive = G.game.targetFPS === _fpsOptions[i];
        _fpsButtons.push({ x: bx, y: fpsY - btnH / 2, w: btnW, h: btnH, fps: _fpsOptions[i] });

        ctx.fillStyle = isActive ? 'rgba(255, 179, 0, 0.35)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(bx, fpsY - btnH / 2, btnW, btnH);
        ctx.strokeStyle = isActive ? '#ffb300' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.strokeRect(bx, fpsY - btnH / 2, btnW, btnH);

        ctx.textAlign = 'center';
        ctx.fillStyle = isActive ? '#ffb300' : 'rgba(255, 255, 255, 0.6)';
        ctx.font = (isActive ? 'bold ' : '') + '16px ' + FONT_UI;
        ctx.fillText(_fpsLabels[i], bx + btnW / 2, fpsY + 5);
    }

    // 返回按钮
    const cb = _sliderCloseBtn;
    cb.x = LOGICAL_W / 2 - 40;
    cb.y = p.y + p.h - 48;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '18px ' + FONT_UI;
    ctx.fillText('返回', cb.x + cb.w / 2, cb.y + 21);
}
