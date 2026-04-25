// ─── HUD 更新（分数、生命、Boss血条、能量条、导弹数、等级条）───

// DOM 引用缓存（初始化时一次性查询）
let _hud = {};

function initUI() {
    _hud = {
        scoreVal: document.getElementById('score-val'),
        lifeVal: document.getElementById('life-val'),
        bossBarWrap: document.querySelector('.boss-bar-wrap'),
        bossBarFill: document.getElementById('boss-bar-fill'),
        bossName: document.getElementById('boss-name'),
        energyFill: document.getElementById('energy-bar-fill'),
        energyHint: document.getElementById('energy-key-hint'),
        levelNum: document.getElementById('level-num'),
        levelFill: document.getElementById('level-fill'),
        levelNext: document.getElementById('level-next'),
        buffList: document.getElementById('buff-list'),
        stageInfo: document.getElementById('stage-info'),
        // Mobile HUD overlay
        mScoreVal: document.getElementById('mhud-score-val'),
        mLifeVal: document.getElementById('mhud-life-val'),
        mLevelNum: document.getElementById('mhud-level-num'),
        mEnergyFill: document.getElementById('mhud-energy-fill'),
        mEnergyHint: document.getElementById('mhud-energy-hint'),
        mBossRow: document.getElementById('mhud-boss-row'),
        mBossName: document.getElementById('mhud-boss-name'),
        mBossFill: document.getElementById('mhud-boss-fill'),
        mBuffOverlay: document.getElementById('mobile-buff-overlay'),
        mLevelNumSmall: document.getElementById('mlevel-num'),
        mLevelFill: document.getElementById('mlevel-fill'),
        mLevelNext: document.getElementById('mlevel-next')
    };
}

// 更新 HTML UI
function updateHUD() {
    _hud.scoreVal.textContent = G.game.score;
    _hud.lifeVal.textContent = G.game.life;

    // 关卡模式：显示关卡信息
    if (G.game.gameMode === 'level') {
        const level = getCurrentLevel();
        if (level) {
            _hud.stageInfo.style.display = '';
            _hud.stageInfo.textContent = 'STAGE ' + level.id + '/' + LEVEL_DATA.length;
        }
    } else {
        _hud.stageInfo.style.display = 'none';
    }
    if (G.boss) {
        _hud.bossBarWrap.classList.add('active');
        const hpPercent = Math.max(0, G.boss.hp / G.boss.maxHp);
        _hud.bossBarFill.style.width = (hpPercent * 100) + '%';
        if (_hud.bossName && G.boss.def) {
            const roundText = G.bossRound > 0 ? ' (+' + G.bossRound + ')' : '';
            _hud.bossName.textContent = G.boss.def.name + roundText;
        }
    } else {
        _hud.bossBarWrap.classList.remove('active');
    }
    const energyPct = Math.min(100, Math.max(0, G.player.energy / OVERCLOCK_MAX_ENERGY * 100));
    _hud.energyFill.style.width = energyPct + '%';
    if (G.player.isOverclock) {
        _hud.energyFill.classList.add('full');
        _hud.energyHint.textContent = 'ACTIVE!';
    } else if (energyPct >= 100) {
        _hud.energyFill.classList.add('full');
        _hud.energyHint.textContent = IS_MOBILE ? 'TAP!' : 'SPACE!';
    } else {
        _hud.energyFill.classList.remove('full');
        _hud.energyHint.textContent = IS_MOBILE ? 'OC(100)' : 'SPACE(100)';
    }
    // 等级条
    updateLevelBar();
    // 词条列表
    updateBuffList();

    // Mobile HUD overlay updates
    if (IS_MOBILE) {
        if (_hud.mScoreVal) _hud.mScoreVal.textContent = G.game.score;
        if (_hud.mLifeVal) _hud.mLifeVal.textContent = G.game.life;
        if (_hud.mLevelNum) _hud.mLevelNum.textContent = G.player.playerLevel;

        var mEnergyPct = Math.min(100, Math.max(0, G.player.energy / OVERCLOCK_MAX_ENERGY * 100));
        if (_hud.mEnergyFill) {
            _hud.mEnergyFill.style.width = mEnergyPct + '%';
            _hud.mEnergyFill.classList.toggle('full', G.player.isOverclock || mEnergyPct >= 100);
        }
        if (_hud.mEnergyHint) {
            if (G.player.isOverclock) _hud.mEnergyHint.textContent = 'ACTIVE!';
            else if (mEnergyPct >= 100) _hud.mEnergyHint.textContent = 'TAP!';
            else _hud.mEnergyHint.textContent = 'OC(100)';
        }

        if (G.boss) {
            if (_hud.mBossRow) _hud.mBossRow.classList.add('active');
            if (_hud.mBossFill) _hud.mBossFill.style.width = (Math.max(0, G.boss.hp / G.boss.maxHp) * 100) + '%';
            if (_hud.mBossName && G.boss.def) {
                _hud.mBossName.textContent = G.boss.def.name + (G.bossRound > 0 ? ' (+' + G.bossRound + ')' : '');
            }
        } else {
            if (_hud.mBossRow) _hud.mBossRow.classList.remove('active');
        }

        // Level overlay
        var mp = G.player;
        if (_hud.mLevelNumSmall) _hud.mLevelNumSmall.textContent = mp.playerLevel;
        var mPrevScore = mp.playerLevel > 0 ? getLevelThreshold(mp.playerLevel - 1) : 0;
        var mNeed = mp.levelUpScore - mPrevScore;
        var mProgress = mNeed > 0 ? Math.min(1, Math.max(0, (G.game.score - mPrevScore) / mNeed)) : 0;
        if (_hud.mLevelFill) _hud.mLevelFill.style.width = (mProgress * 100) + '%';
        if (_hud.mLevelNext) {
            var mRemaining = Math.max(0, mp.levelUpScore - G.game.score);
            _hud.mLevelNext.textContent = (mRemaining === 0 && !G.game.buffChooseMode) ? 'UP!' : mRemaining + 'pts';
        }
    }
}

// 更新等级条 UI
function updateLevelBar() {
    if (!_hud.levelNum || !_hud.levelFill || !_hud.levelNext) return;

    const p = G.player;
    _hud.levelNum.textContent = p.playerLevel;

    const prevScore = p.playerLevel > 0 ? getLevelThreshold(p.playerLevel - 1) : 0;
    const need = p.levelUpScore - prevScore;
    const progress = need > 0 ? Math.min(1, Math.max(0, (G.game.score - prevScore) / need)) : 0;
    _hud.levelFill.style.height = (progress * 100) + '%';
    const remaining = Math.max(0, p.levelUpScore - G.game.score);
    // buff 选择模式下不显示 UP!（避免连续升级时反复闪烁）
    _hud.levelNext.textContent = (remaining === 0 && !G.game.buffChooseMode) ? 'UP!' : remaining + 'pts';
}

// 更新词条列表 DOM
function updateBuffList() {
    if (!_hud.buffList) return;
    const list = G.player.buffList;
    if (list.length === 0) { _hud.buffList.innerHTML = ''; return; }

    const counts = {};
    list.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    const rarityColors = { common: '#e8e8f0', rare: '#00ff88', epic: '#bb66ff', legendary: '#ff3355' };
    let html = '';
    for (const id in counts) {
        const def = BUFF.get(id);
        if (!def) continue;
        const color = def.color || rarityColors[def.rarity] || '#fff';
        const label = counts[id] > 1 ? def.name + ' x' + counts[id] : def.name;
        html += '<div class="buff-tag" style="color:' + color + ';border-left-color:' + color + '">' + label + '</div>';
    }
    _hud.buffList.innerHTML = html;

    // Mobile buff overlay
    if (IS_MOBILE && _hud.mBuffOverlay) {
        var mhtml = '';
        for (var mid in counts) {
            var mdef = BUFF.get(mid);
            if (!mdef) continue;
            var mcolor = mdef.color || rarityColors[mdef.rarity] || '#fff';
            var mlabel = counts[mid] > 1 ? mdef.name + '×' + counts[mid] : mdef.name;
            mhtml += '<span class="mbuff-tag" style="color:' + mcolor + ';border-left-color:' + mcolor + '">' + mlabel + '</span>';
        }
        _hud.mBuffOverlay.innerHTML = mhtml;
    }
}
