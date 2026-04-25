// 输入处理
const keys = { left: false, right: false, up: false, down: false };
const _heldKeys = new Set();

function beginGame() {
    G.game.isStarted = true;
    startBuffChoice(true);
    playBGM();
}

function beginLevel(levelIndex) {
    G.game.gameMode = 'level';
    G.game.currentLevel = levelIndex;
    G.game.isStarted = true;
    initLevelState();
    startBuffChoice(true);
    playBGM();
}

function beginExplore() {
    G.game.gameMode = 'explore';
    G.game.isStarted = true;
    G.game.isPaused = false;
    G.game.isGameOver = false;
    G.game.buffChooseMode = false;
    _exploreBgOffset = 0;
    playBGM();
}

function initInput(canvas) {
    document.addEventListener('keydown', (e) => {
        // 调试器打开时，拦截调试器控制键
        if (G.debuggerOpen) {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'd', 'D', 'p', 'P', 'Escape'].includes(e.key)) {
                handleDebuggerKey(e);
            }
            return;
        }

        // 忽略操作系统层面的按键重复（按住键时浏览器会反复触发 keydown）
        // 但保留首次按下
        if (e.repeat) return;

        _heldKeys.add(e.code);
        switch (e.code) {
            case 'ArrowLeft': case 'KeyA': keys.left = true; break;
            case 'ArrowRight': case 'KeyD': keys.right = true; break;
            case 'ArrowUp': case 'KeyW': keys.up = true; break;
            case 'ArrowDown': case 'KeyS': keys.down = true; break;
        }

        if (e.key === ' ') e.preventDefault();

        // 关卡通关后：按 Enter 进入下一关
        if (G.game.levelCompleted) {
            if (e.key === 'Enter' || e.key === ' ') {
                proceedToNextLevel();
            }
            return;
        }

        if (e.key === 'Enter' || e.key === ' ') {
            if (!G.game.isStarted) {
                if (startScreenMode === 'levelSelect') {
                    // 关卡选择画面：不响应 Enter，用数字键或点击
                    return;
                }
                if (startScreenMode === 'selectAircraft') {
                    // 战机选择画面：Enter 默认选默认机
                    startGameWithAircraft('default');
                    return;
                }
                // 主菜单 Enter → 直接用选中战机开始无尽模式
                _pendingGameMode = 'endless';
                startGameWithAircraft(getSelectedAircraftId());
                return;
            }
            // 超频：100能量时空格激活
            if (e.key === ' ' && G.game.isStarted && !G.game.isPaused && !G.game.isGameOver && !G.game.buffChooseMode) {
                activateOverclock();
            }
        }

        // 主菜单：数字键 1/2/3 切换战机，左右方向键切换
        if (!G.game.isStarted && startScreenMode === 'main') {
            if (e.key === '1') { _selectedAircraftIndex = 0; return; }
            if (e.key === '2') { _selectedAircraftIndex = 1; return; }
            if (e.key === '3') { _selectedAircraftIndex = 2; return; }
            if (e.key === '4') { _selectedAircraftIndex = 3; return; }
            if (e.key === '5') { _pendingGameMode = 'explore'; startGameWithAircraft(getSelectedAircraftId()); return; }
            if (e.key === 'ArrowLeft') {
                _selectedAircraftIndex = (_selectedAircraftIndex + _getCraftCards().length - 1) % _getCraftCards().length;
                return;
            }
            if (e.key === 'ArrowRight') {
                _selectedAircraftIndex = (_selectedAircraftIndex + 1) % _getCraftCards().length;
                return;
            }
        }

        // 关卡选择画面：数字键 1-7 选择关卡
        if (!G.game.isStarted && startScreenMode === 'levelSelect') {
            const num = parseInt(e.key);
            if (num >= 1 && num <= LEVEL_DATA.length) {
                _pendingGameMode = 'level';
                _pendingLevelIndex = num - 1;
                startGameWithAircraft(getSelectedAircraftId());
                return;
            }
            if (e.key === 'Escape' || e.key === 'Backspace') {
                startScreenMode = 'main';
                return;
            }
        }

        // 战机选择画面：数字键 1/2 选择战机
        if (!G.game.isStarted && startScreenMode === 'selectAircraft') {
            if (e.key === '1') { startGameWithAircraft('default'); return; }
            if (e.key === '2') { startGameWithAircraft('skysovereign'); return; }
            if (e.key === '3') { startGameWithAircraft('mozi'); return; }
            if (e.key === '4') { startGameWithAircraft('chihong'); return; }
            if (e.key === 'Escape' || e.key === 'Backspace') {
                startScreenMode = _pendingGameMode === 'level' ? 'levelSelect' : 'main';
                return;
            }
        }

        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (G.game.settingsOpen) {
                G.game.settingsOpen = false;
            } else if (!G.game.isGameOver && G.game.isStarted && !G.game.buffChooseMode) {
                G.game.isPaused = !G.game.isPaused;
            }
        }
        if (e.key === 'd' || e.key === 'D') {
            if (G.game.isPaused && !G.game.isGameOver && !G.game.buffChooseMode) {
                G.debuggerOpen = !G.debuggerOpen;
            }
        }
        if (e.key === 'r' || e.key === 'R') {
            if (G.game.isGameOver) {
                G.game.gameMode = 'endless';
                G.game.currentLevel = 0;
                G.player.aircraftType = 'default';
                startScreenMode = 'main';
                _levelProgress = -1;
                Save.clearProgress();
                resetState();
                playBGM();
            }
        }

        // 词条选择：数字键 1/2/3
        if (G.game.buffChooseMode) {
            if (e.key === '1') chooseBuff(0);
            else if (e.key === '2') chooseBuff(1);
            else if (e.key === '3') chooseBuff(2);
        }
    });

    document.addEventListener('keyup', (e) => {
        _heldKeys.delete(e.code);
        switch (e.code) {
            case 'ArrowLeft': case 'KeyA': keys.left = false; break;
            case 'ArrowRight': case 'KeyD': keys.right = false; break;
            case 'ArrowUp': case 'KeyW': keys.up = false; break;
            case 'ArrowDown': case 'KeyS': keys.down = false; break;
        }
    });

    // 每帧同步：用 _heldKeys 校正 keys 状态，防止 keyup 事件丢失导致的按键卡住
    window._syncKeys = function() {
        keys.left = _heldKeys.has('ArrowLeft') || _heldKeys.has('KeyA');
        keys.right = _heldKeys.has('ArrowRight') || _heldKeys.has('KeyD');
        keys.up = _heldKeys.has('ArrowUp') || _heldKeys.has('KeyW');
        keys.down = _heldKeys.has('ArrowDown') || _heldKeys.has('KeyS');
    };

    canvas.addEventListener('pointerdown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = LOGICAL_W / rect.width;
        const scaleY = LOGICAL_H / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        // 未开始时：主画面、关卡选择或战机选择
        if (!G.game.isStarted) {
            if (startScreenMode === 'main') {
                // 无尽冒险按钮 → 直接用选中战机开始
                if (mx >= endlessBtn.x && mx <= endlessBtn.x + endlessBtn.width &&
                    my >= endlessBtn.y && my <= endlessBtn.y + endlessBtn.height) {
                    _pendingGameMode = 'endless';
                    startGameWithAircraft(getSelectedAircraftId());
                    return;
                }
                // 关卡模式按钮
                if (mx >= levelBtn.x && mx <= levelBtn.x + levelBtn.width &&
                    my >= levelBtn.y && my <= levelBtn.y + levelBtn.height) {
                    startScreenMode = 'levelSelect';
                    return;
                }
                // 星球探索按钮
                if (mx >= exploreBtn.x && mx <= exploreBtn.x + exploreBtn.width &&
                    my >= exploreBtn.y && my <= exploreBtn.y + exploreBtn.height) {
                    _pendingGameMode = 'explore';
                    startGameWithAircraft(getSelectedAircraftId());
                    return;
                }
                // 战机选择器箭头
                const arrowTarget = getMainAircraftClickTarget(mx, my);
                if (arrowTarget === 'prev') {
                    _selectedAircraftIndex = (_selectedAircraftIndex + _getCraftCards().length - 1) % _getCraftCards().length;
                    return;
                }
                if (arrowTarget === 'next') {
                    _selectedAircraftIndex = (_selectedAircraftIndex + 1) % _getCraftCards().length;
                    return;
                }
            } else if (startScreenMode === 'levelSelect') {
                // 地图节点点击 → 直接用选中战机开始
                const target = getMapClickTarget(mx, my);
                if (target === 'back') {
                    startScreenMode = 'main';
                    return;
                }
                if (typeof target === 'number' && target >= 0) {
                    _pendingGameMode = 'level';
                    _pendingLevelIndex = target;
                    startGameWithAircraft(getSelectedAircraftId());
                    return;
                }
            } else if (startScreenMode === 'selectAircraft') {
                // 战机选择点击
                const target = getAircraftClickTarget(mx, my);
                if (target === 'back') {
                    startScreenMode = _pendingGameMode === 'level' ? 'levelSelect' : 'main';
                    return;
                }
                if (target) {
                    startGameWithAircraft(target);
                    return;
                }
            }
            return;
        }

        // 设置面板打开时：关闭按钮 / 帧率按钮
        if (G.game.settingsOpen) {
            const cb = _sliderCloseBtn;
            if (mx >= cb.x && mx <= cb.x + cb.w && my >= cb.y && my <= cb.y + cb.h) {
                G.game.settingsOpen = false;
            }
            // 帧率按钮点击
            for (const btn of _fpsButtons) {
                if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
                    G.game.targetFPS = btn.fps;
                    _lastFrameTime = 0;
                    Save.save();
                    break;
                }
            }
            return;
        }

        // 词条选择卡片点击
        if (G.game.buffChooseMode) {
            const choices = G.game.buffChoices;
            const count = choices.length;
            const totalW = count * _cardW + (count - 1) * _cardGap;
            const startX = (LOGICAL_W - totalW) / 2;
            const cardY = LOGICAL_H / 2 - _cardH / 2;
            for (let i = 0; i < count; i++) {
                const cx = startX + i * (_cardW + _cardGap);
                if (mx >= cx && mx <= cx + _cardW && my >= cardY && my <= cardY + _cardH) {
                    chooseBuff(i);
                    return;
                }
            }
            return;
        }

        // 暂停时：菜单按钮
        if (G.game.isPaused) {
            for (const btn of _pauseBtns) {
                if (mx >= btn.x && mx <= btn.x + btn.w &&
                    my >= btn.y && my <= btn.y + btn.h) {
                    if (btn.action === 'resume') {
                        G.game.isPaused = false;
                    } else if (btn.action === 'home') {
                        G.game.isPaused = false;
                        G.game.isStarted = false;
                        G.game.isGameOver = false;
                        startScreenMode = 'main';
                        _levelProgress = -1;
                        resetState();
                        playBGM();
                    } else if (btn.action === 'debugger') {
                        G.debuggerOpen = !G.debuggerOpen;
                    } else if (btn.action === 'settings') {
                        G.game.settingsOpen = true;
                    }
                    return;
                }
            }
        }

        if (mx >= pauseBtn.x && mx <= pauseBtn.x + pauseBtn.width &&
            my >= pauseBtn.y && my <= pauseBtn.y + pauseBtn.height) {
            G.game.isPaused = !G.game.isPaused;
        }

        // 移动端：Game Over 重新开始按钮
        if (IS_MOBILE && G.game.isGameOver) {
            const rb = _mobileRestartBtn;
            if (mx >= rb.x && mx <= rb.x + rb.w && my >= rb.y && my <= rb.y + rb.h) {
                G.game.gameMode = 'endless';
                G.game.currentLevel = 0;
                G.player.aircraftType = 'default';
                startScreenMode = 'main';
                _levelProgress = -1;
                Save.clearProgress();
                resetState();
                playBGM();
                return;
            }
        }

        // 移动端：关卡通关继续按钮
        if (IS_MOBILE && G.game.levelCompleted) {
            const cb = _mobileLevelContinueBtn;
            if (mx >= cb.x && mx <= cb.x + cb.w && my >= cb.y && my <= cb.y + cb.h) {
                proceedToNextLevel();
                return;
            }
        }
    });

    // ─── 滑条拖拽 ───
    function _canvasXY(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (LOGICAL_W / rect.width),
            y: (e.clientY - rect.top) * (LOGICAL_H / rect.height)
        };
    }

    function _hitSlider(mx, my, slider) {
        const { trackX, trackY, trackW, trackH } = _getSliderRect(slider.y);
        // 扩大点击区域上下各 15px
        return mx >= trackX - 15 && mx <= trackX + trackW + 15 &&
               my >= trackY - 15 && my <= trackY + trackH + 15;
    }

    function _applySlider(mx, slider, setter) {
        const { trackX, trackW } = _getSliderRect(slider.y);
        const v = Math.max(0, Math.min(1, (mx - trackX) / trackW));
        setter(v);
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (!G.game.settingsOpen) return;
        const { x: mx, y: my } = _canvasXY(e);
        if (_hitSlider(mx, my, _sliderBGM)) {
            G.game._settingsDrag = 'bgm';
            G.game._settingsPointerId = e.pointerId;
            _applySlider(mx, _sliderBGM, setBGMVolume);
        } else if (_hitSlider(mx, my, _sliderSFX)) {
            G.game._settingsDrag = 'sfx';
            G.game._settingsPointerId = e.pointerId;
            _applySlider(mx, _sliderSFX, setSFXVolume);
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        // 多点触控：仅处理拖拽中或墨子号瞄准的 pointer
        if (G.game._settingsDrag && e.pointerId !== G.game._settingsPointerId) return;

        const { x: mx, y: my } = _canvasXY(e);

        // 墨子号：实时追踪鼠标/手指位置作为炸弹目标
        if (G.player.aircraftType === 'mozi' && G.game.isStarted && !G.game.isPaused && !G.game.isGameOver) {
            G.player.moziTargetX = mx;
            G.player.moziTargetY = my;
        }

        if (!G.game._settingsDrag) return;
        if (G.game._settingsDrag === 'bgm') {
            _applySlider(mx, _sliderBGM, setBGMVolume);
        } else if (G.game._settingsDrag === 'sfx') {
            _applySlider(mx, _sliderSFX, setSFXVolume);
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        if (G.game._settingsDrag && e.pointerId === G.game._settingsPointerId) {
            Save.save();
            G.game._settingsDrag = null;
            G.game._settingsPointerId = null;
        }
    });

    canvas.addEventListener('pointercancel', (e) => {
        if (G.game._settingsDrag && e.pointerId === G.game._settingsPointerId) {
            G.game._settingsDrag = null;
            G.game._settingsPointerId = null;
        }
    });

    canvas.addEventListener('pointerleave', () => {
        G.game._settingsDrag = null;
        G.game._settingsPointerId = null;
    });

    // 窗口失焦时重置所有按键状态（浏览器不会触发 keyup）
    window.addEventListener('blur', () => {
        keys.left = false; keys.right = false; keys.up = false; keys.down = false;
        _heldKeys.clear();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            keys.left = false; keys.right = false; keys.up = false; keys.down = false;
            _heldKeys.clear();
        }
    });
}
