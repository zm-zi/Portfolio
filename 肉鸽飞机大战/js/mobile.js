// ─── Mobile Adaptation Module ───

// IS_MOBILE is already declared in an inline <script> in index.html before this loads

// ─── Coordinate Conversion ───
function screenToLogical(clientX, clientY) {
    var c = document.getElementById('gameCanvas');
    var rect = c.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (LOGICAL_W / rect.width),
        y: (clientY - rect.top) * (LOGICAL_H / rect.height)
    };
}

// ─── Joystick State ───
var _joyTouchId = null;
var _joyDirX = 0;
var _joyDirY = 0;

// ─── Create DOM Elements ───
function _createJoystick(wrap) {
    var ring = document.createElement('div');
    ring.id = 'mobile-joystick';
    ring.style.cssText =
        'position:relative;width:120px;height:120px;border-radius:50%;' +
        'background:rgba(0,229,255,0.06);border:2px solid rgba(0,229,255,0.25);' +
        'flex-shrink:0;pointer-events:auto;touch-action:none;';

    var thumb = document.createElement('div');
    thumb.id = 'mobile-joystick-thumb';
    thumb.style.cssText =
        'position:absolute;width:48px;height:48px;border-radius:50%;' +
        'background:rgba(0,229,255,0.35);border:1px solid rgba(0,229,255,0.5);' +
        'top:36px;left:36px;pointer-events:none;transition:none;';

    ring.appendChild(thumb);
    wrap.appendChild(ring);
    return { ring: ring, thumb: thumb };
}

function _createOCButton(wrap) {
    var btn = document.createElement('div');
    btn.id = 'mobile-oc-btn';
    btn.textContent = 'OC';
    btn.style.cssText =
        'position:relative;width:72px;height:72px;border-radius:50%;' +
        'background:rgba(255,215,0,0.1);border:2px solid rgba(255,215,0,0.35);' +
        'display:flex;align-items:center;justify-content:center;' +
        'color:rgba(255,215,0,0.8);font-family:"Press Start 2P",monospace;font-size:11px;' +
        'pointer-events:auto;touch-action:none;flex-shrink:0;' +
        '-webkit-tap-highlight-color:transparent;user-select:none;';
    wrap.appendChild(btn);
    return btn;
}

function _createMobilePauseBtn(wrap) {
    var btn = document.createElement('div');
    btn.id = 'mobile-pause-btn';
    btn.innerHTML = '<span style="display:block;width:5px;height:16px;background:rgba(0,229,255,0.6);border-radius:1px"></span><span style="display:block;width:5px;height:16px;background:rgba(0,229,255,0.6);border-radius:1px"></span>';
    btn.style.cssText =
        'position:relative;width:48px;height:48px;' +
        'background:rgba(8,14,28,0.82);border:1px solid rgba(0,229,255,0.25);border-radius:2px;' +
        'display:flex;align-items:center;justify-content:center;gap:4px;' +
        'pointer-events:auto;touch-action:none;flex-shrink:0;' +
        '-webkit-tap-highlight-color:transparent;cursor:pointer;';
    wrap.appendChild(btn);
    return btn;
}

// ─── Joystick Logic ───
function _updateJoystick(e, ring, thumb) {
    var rect = ring.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    _joyDirX = e.clientX - cx;
    _joyDirY = e.clientY - cy;
    var maxDist = rect.width / 2 - 24;
    var dist = Math.sqrt(_joyDirX * _joyDirX + _joyDirY * _joyDirY);
    var clamped = Math.min(dist, maxDist);
    if (dist > 0) {
        _joyDirX = _joyDirX / dist * clamped;
        _joyDirY = _joyDirY / dist * clamped;
    }
    thumb.style.transform = 'translate(' + _joyDirX + 'px, ' + _joyDirY + 'px)';

    var deadZone = 10;
    if (clamped > deadZone) {
        keys.left = _joyDirX < -deadZone;
        keys.right = _joyDirX > deadZone;
        keys.up = _joyDirY < -deadZone;
        keys.down = _joyDirY > deadZone;
    } else {
        keys.left = false; keys.right = false; keys.up = false; keys.down = false;
    }
}

function _resetJoystick(thumb) {
    thumb.style.transform = 'translate(0, 0)';
    keys.left = false; keys.right = false; keys.up = false; keys.down = false;
    _joyDirX = 0; _joyDirY = 0;
    _joyTouchId = null;
}

// ─── Initialize ───
function initMobileControls() {
    if (!IS_MOBILE) return;

    var controlsWrap = document.getElementById('mobile-controls');
    if (!controlsWrap) return;

    var joystick = _createJoystick(controlsWrap);
    var ocBtn = _createOCButton(controlsWrap);
    var pauseBtn = _createMobilePauseBtn(controlsWrap);

    // ─── Joystick pointer events ───
    joystick.ring.addEventListener('pointerdown', function (e) {
        _joyTouchId = e.pointerId;
        joystick.ring.setPointerCapture(e.pointerId);
        _updateJoystick(e, joystick.ring, joystick.thumb);
        e.preventDefault();
    });

    joystick.ring.addEventListener('pointermove', function (e) {
        if (e.pointerId !== _joyTouchId) return;
        _updateJoystick(e, joystick.ring, joystick.thumb);
        e.preventDefault();
    });

    function _joyUp(e) {
        if (e.pointerId !== _joyTouchId) return;
        _resetJoystick(joystick.thumb);
    }

    joystick.ring.addEventListener('pointerup', _joyUp);
    joystick.ring.addEventListener('pointercancel', _joyUp);
    joystick.ring.addEventListener('pointerleave', _joyUp);

    // ─── Overclock button ───
    ocBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof activateOverclock === 'function' &&
            G.game.isStarted && !G.game.isPaused && !G.game.isGameOver && !G.game.buffChooseMode) {
            activateOverclock();
        }
    });

    // ─── Pause button ───
    pauseBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (G.game.isStarted && !G.game.isGameOver && !G.game.buffChooseMode) {
            G.game.isPaused = !G.game.isPaused;
        }
    });

    // ─── Unlock audio on first touch (mobile autoplay policy) ──
    document.addEventListener('pointerdown', function unlockAudio() {
        // First user gesture unlocks HTMLAudioElement.play() for all subsequent calls
        document.removeEventListener('pointerdown', unlockAudio);
    }, { once: true });

    // Trigger canvas resize after controls are created (controls height may have changed)
    if (typeof _resizeMobileCanvas === 'function') {
        _resizeMobileCanvas();
    }
}

// Defer init until after DOMContentLoaded so all scripts have run
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileControls);
} else {
    initMobileControls();
}
