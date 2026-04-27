// ─── Mobile Adaptation Module ───
// IS_MOBILE is declared in an inline <script> in index.html

// ─── Coordinate Conversion ───
function screenToLogical(clientX, clientY) {
    var c = document.getElementById('gameCanvas');
    var rect = c.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (LOGICAL_W / rect.width),
        y: (clientY - rect.top) * (LOGICAL_H / rect.height)
    };
}

// ─── Canvas Overlay Buttons ───
function _initOverlayButtons() {
    if (!IS_MOBILE) return;

    var ocBtn = document.getElementById('mobile-oc-overlay');
    var pauseBtn = document.getElementById('mobile-pause-overlay');

    // Overclock button
    if (ocBtn) {
        ocBtn.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof activateOverclock === 'function' &&
                G.game.isStarted && !G.game.isPaused && !G.game.isGameOver && !G.game.buffChooseMode) {
                activateOverclock();
            }
        });
    }

    // Pause button
    if (pauseBtn) {
        pauseBtn.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (G.game.isStarted && !G.game.isGameOver && !G.game.buffChooseMode) {
                G.game.isPaused = !G.game.isPaused;
            }
        });
    }

    // Unlock audio on first touch (mobile autoplay policy)
    document.addEventListener('pointerdown', function unlockAudio() {
        document.removeEventListener('pointerdown', unlockAudio);
    }, { once: true });
}

// ─── Initialize ───
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        _initOverlayButtons();
        if (typeof _resizeMobileCanvas === 'function') _resizeMobileCanvas();
    });
} else {
    _initOverlayButtons();
    if (typeof _resizeMobileCanvas === 'function') _resizeMobileCanvas();
}
