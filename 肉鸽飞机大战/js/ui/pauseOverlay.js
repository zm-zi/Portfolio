// ─── 暂停按钮、暂停覆盖层、设置面板 ───

const pauseBtn = IS_MOBILE
    ? { x: 12, y: 14, width: 44, height: 44 }
    : { x: 12, y: 14, width: 30, height: 30 };

// 暂停菜单按钮定义
const _pauseBtnW = IS_MOBILE ? 200 : 160;
const _pauseBtnH = IS_MOBILE ? 52 : 40;
const _pauseBtns = [
    { label: '继续', action: 'resume',   x: 0, y: 0, w: _pauseBtnW, h: _pauseBtnH },
    { label: '返回主页', action: 'home',     x: 0, y: 0, w: _pauseBtnW, h: _pauseBtnH },
    { label: '调试器', action: 'debugger', x: 0, y: 0, w: _pauseBtnW, h: _pauseBtnH },
    { label: '设置', action: 'settings',  x: 0, y: 0, w: _pauseBtnW, h: _pauseBtnH }
];

// ─── 暂停按钮（科幻风格）───
function drawPauseBtn() {
    const { x: bx, y: by, width: bw, height: bh } = pauseBtn;
    const ctx = Game.ctx;

    ctx.fillStyle = SCI.panelBg;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 暂停竖线
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    const barW = 5, barH = 14, gap = 4;
    const barY = by + (bh - barH) / 2;
    ctx.fillRect(bx + bw / 2 - gap - barW, barY, barW, barH);
    ctx.fillRect(bx + bw / 2 + gap, barY, barW, barH);
}

// ─── 暂停覆盖层 ───
function drawPauseOverlay() {
    const ctx = Game.ctx;

    ctx.fillStyle = 'rgba(5, 8, 15, 0.82)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const cx = LOGICAL_W / 2;
    ctx.textAlign = 'center';

    // 暂停图标
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.fillRect(cx - 20, LOGICAL_H / 2 - 80, 12, 40);
    ctx.fillRect(cx + 8, LOGICAL_H / 2 - 80, 12, 40);

    // PAUSED 文字
    drawSciTitle(ctx, 'PAUSED', cx, LOGICAL_H / 2 - 18, '28px ' + FONT_PIXEL, SCI.primary, 20);

    // 按钮布局
    const btnGap = 12;
    const startY = LOGICAL_H / 2 + 20;
    for (let i = 0; i < _pauseBtns.length; i++) {
        const btn = _pauseBtns[i];
        btn.x = cx - btn.w / 2;
        btn.y = startY + i * (btn.h + btnGap);

        // 调试器按钮激活状态高亮
        const isActive = btn.action === 'debugger' && G.debuggerOpen;

        ctx.fillStyle = isActive ? 'rgba(0, 229, 255, 0.15)' : 'rgba(0, 229, 255, 0.06)';
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 2);
        ctx.fill();
        ctx.strokeStyle = isActive ? SCI.primary : 'rgba(0, 229, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 2);
        ctx.stroke();
        ctx.fillStyle = isActive ? SCI.primary : 'rgba(255, 255, 255, 0.7)';
        ctx.font = '18px ' + FONT_UI;
        ctx.fillText(btn.label, cx, btn.y + btn.h / 2 + 6);
    }

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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '20px ' + FONT_UI;
    ctx.fillText(label, p.x + 90, sliderY + 5);

    // 滑轨底
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.fillRect(trackX, trackY, trackW, trackH);

    // 滑轨填充
    const fillW = trackW * value;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.fillRect(trackX, trackY, fillW, trackH);

    // 拖柄圆
    const knobX = trackX + fillW;
    const knobY = sliderY;
    ctx.beginPath();
    ctx.arc(knobX, knobY, 10, 0, Math.PI * 2);
    ctx.fillStyle = SCI.primary;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 百分比
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.font = '16px ' + FONT_UI;
    ctx.fillText(Math.round(value * 100) + '%', trackX + trackW + 12, sliderY + 5);
}

function drawSettingsPanel() {
    const ctx = Game.ctx;
    const p = _settingsPanel;

    // 遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 面板
    drawSciPanel(ctx, p.x, p.y, p.w, p.h, { cornerLen: 12, glow: 15 });

    // 标题
    ctx.textAlign = 'center';
    drawSciTitle(ctx, '设置', LOGICAL_W / 2, p.y + 38, '22px ' + FONT_PIXEL, SCI.primary, 15);

    // 分隔线
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
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
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '20px ' + FONT_UI;
    ctx.fillText('帧率', p.x + 90, fpsY + 5);

    const btnW = IS_MOBILE ? 52 : 40;
    const btnH = IS_MOBILE ? 36 : 26;
    const btnGap = IS_MOBILE ? 6 : 4;
    const fpsStartX = p.x + 100;
    _fpsButtons.length = 0;

    for (let i = 0; i < _fpsOptions.length; i++) {
        const bx = fpsStartX + i * (btnW + btnGap);
        const isActive = G.game.targetFPS === _fpsOptions[i];
        _fpsButtons.push({ x: bx, y: fpsY - btnH / 2, w: btnW, h: btnH, fps: _fpsOptions[i] });

        ctx.fillStyle = isActive ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(bx, fpsY - btnH / 2, btnW, btnH);
        ctx.strokeStyle = isActive ? SCI.primary : 'rgba(0, 229, 255, 0.2)';
        ctx.lineWidth = isActive ? 1 : 1;
        ctx.strokeRect(bx, fpsY - btnH / 2, btnW, btnH);

        ctx.textAlign = 'center';
        ctx.fillStyle = isActive ? SCI.primary : 'rgba(255, 255, 255, 0.5)';
        ctx.font = (isActive ? 'bold ' : '') + '16px ' + FONT_UI;
        ctx.fillText(_fpsLabels[i], bx + btnW / 2, fpsY + 5);
    }

    // 返回按钮
    const cb = _sliderCloseBtn;
    cb.x = LOGICAL_W / 2 - 40;
    cb.y = p.y + p.h - 48;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(cb.x, cb.y, cb.w, cb.h, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cb.x, cb.y, cb.w, cb.h, 2);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '18px ' + FONT_UI;
    ctx.fillText('返回', cb.x + cb.w / 2, cb.y + 21);
}
