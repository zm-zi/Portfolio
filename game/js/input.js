const keys = { left: false, right: false, up: false, down: false };
const heldKeys = new Set();
const movement = {left: ['ArrowLeft','KeyA'], right: ['ArrowRight','KeyD'], up: ['ArrowUp','KeyW'], down: ['ArrowDown','KeyS']};

function isFlying() {
    const gm = G.game;
    return gm.isStarted && !gm.isPaused && !gm.isGameOver && !gm.buffChooseMode && !gm.levelCompleted && !gm.settingsOpen;
}

function initInput(canvas) {
    let drag = null;
    function syncKeys() {
        for (const [direction,codes] of Object.entries(movement)) {
            keys[direction] = codes.some(code => heldKeys.has(code));
        }
    }
    function release() { heldKeys.clear(); syncKeys(); drag = null; }
    function point(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: (e.clientX - rect.left) * LOGICAL_W / rect.width, y: (e.clientY - rect.top) * LOGICAL_H / rect.height };
    }
    document.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
        const gm = G.game;
        const k = e.key.toLowerCase();
        const n = /^[1-7]$/.test(k) ? Number(k) - 1 : -1;
        const sheet = sheetName();
        if (['INPUT','SELECT'].includes(e.target.tagName) && k !== 'escape') return;
        if (isFlying() && Object.values(movement).some(codes => codes.includes(e.code))) {
            heldKeys.add(e.code); syncKeys(); e.preventDefault(); return;
        }
        if (e.repeat) return;
        if (sheet === 'choice' && n >= 0 && n <= 2) chooseBuff(n);
        else if (sheet === 'choice' && k === 'r') rerollBuffChoice();
        else if (k === 'escape' || (k === 'p' && ['pause','settings','debug'].includes(sheet))) {
            if (!sheet && gm.isStarted) gm.isPaused = true;
            else goBack();
        } else if (sheet === 'loss' && k === 'r') returnToHangar();
        else if (sheet === 'clear' && (k === 'enter' || k === ' ') && e.target.tagName !== 'BUTTON') proceedToNextLevel();
        else if (k === 'd' && sheet === 'pause') G.debuggerOpen = true;
        else if (k === 'd' && sheet === 'debug') G.debuggerOpen = false;
        else if (sheet) return;
        else if (!gm.isStarted && lobbyPage === 'routes' && n >= 0) {
            if (n <= _levelProgress + 1 && n < LEVEL_DATA.length) { selectStage(n); launchFlight(); }
        } else if (!gm.isStarted && lobbyPage === 'hangar' && n >= 0 && n < 4) selectCraft(CRAFT.all()[n].id);
        else if (!gm.isStarted && lobbyPage === 'hangar' && n === 4) { selectMode('explore'); launchFlight(); }
        else if (!gm.isStarted && lobbyPage === 'hangar' && (k === 'arrowleft' || k === 'arrowright')) {
            const fleet = CRAFT.all();
            const i = fleet.findIndex(c => c.id === selectedCraft);
            selectCraft(fleet[(i + (k === 'arrowleft' ? -1 : 1) + fleet.length) % fleet.length].id);
        } else if (!gm.isStarted && lobbyPage === 'hangar' && (k === 'arrowup' || k === 'arrowdown')) {
            const ids = Object.keys(modes), offset = k === 'arrowup' ? -1 : 1;
            selectMode(ids[(ids.indexOf(selectedMode) + offset + ids.length) % ids.length]);
        } else if (!gm.isStarted && (k === 'enter' || k === ' ')) {
            const target = e.target.closest('button');
            const selected = target?.dataset.craft === selectedCraft || target?.dataset.mode === selectedMode;
            if (target && !(k === 'enter' && selected)) return;
            handleAction(lobbyPage === 'routes' ? 'start-level' : 'launch');
        } else if (k === 'p' && gm.isStarted) gm.isPaused = true;
        else if (k === ' ' && isFlying() && e.target.tagName !== 'BUTTON') activateOverclock();
        else return;
        e.preventDefault();
        if (!isFlying()) release();
        syncUI();
    });
    document.addEventListener('keyup', e => { heldKeys.delete(e.code); syncKeys(); });
    // Fire the cockpit switch on contact, including a second finger during a steering drag.
    $('boost').addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' || !isFlying() || $('boost').disabled) return;
        e.preventDefault();
        activateOverclock();
        syncUI();
    });
    canvas.addEventListener('pointerdown', e => {
        if (!isFlying() || !e.isPrimary) return;
        canvas.focus({preventScroll:true});
        const pt = point(e);
        if (G.player.aircraftType === 'mozi') { G.player.moziTargetX = pt.x; G.player.moziTargetY = pt.y; }
        if (e.pointerType !== 'mouse') {
            drag = { id: e.pointerId, x: pt.x - G.player.x, y: pt.y - G.player.y };
            canvas.setPointerCapture(e.pointerId);
        }
    });
    canvas.addEventListener('pointermove', e => {
        if (!isFlying() || !e.isPrimary) return;
        const pt = point(e), p = G.player;
        if (p.aircraftType === 'mozi') { p.moziTargetX = pt.x; p.moziTargetY = pt.y; }
        if (drag && drag.id === e.pointerId) {
            p.x = Math.max(0, Math.min(LOGICAL_W - p.width, pt.x - drag.x));
            p.y = Math.max(0, Math.min(LOGICAL_H - p.height, pt.y - drag.y));
        }
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) {
        canvas.addEventListener(type, e => { if (drag && drag.id === e.pointerId) drag = null; });
    }
    window.addEventListener('blur',release);
    document.addEventListener('visibilitychange',() => { if (document.hidden) release(); });
    $('sheet').addEventListener('focusin',release);
}
