// Dispatch desk, route atlas and in-flight instruments.
let _levelProgress = -1;
let selectedCraft = 'default';
let selectedMode = 'endless';
let selectedLevel = 0;
let lobbyPage = 'hangar';
let displayedSheet = '';
let previousPage = '';
let displayedLevelProgress = null;
const $ = id => document.getElementById(id);
const modes = {
    endless: { title: '无尽冒险', hint: '迎战敌群，挑战最高纪录', icon: 'loop' },
    level: { title: '关卡航线', hint: '逐段突破七条作战航线', icon: 'route' },
    explore: { title: '自由探索', hint: '关闭火力，自由巡航', icon: 'compass' }
};

const iconPaths = {
    sliders: 'M3 7h8m4 0h6M3 17h3m4 0h11M11 4v6m-4 4v6',
    laurel: 'M6 4c-4 4-3 13 5 15M18 4c4 4 3 13-5 15M4 8l4 2m-3 3 4 1m11-6-4 2m3 3-4 1M12 5l1.4 3 3.2.4-2.3 2.2.6 3.3-2.9-1.6-2.9 1.6.6-3.3-2.3-2.2 3.2-.4Z',
    arrow: 'M3 12h17m-7-7 7 7-7 7', pause: 'M8 5v14m8-14v14',
    close: 'm6 6 12 12M18 6 6 18', bolt: 'm14 2-9 12h6l-1 8 9-13h-7Z',
    loop: 'M12 12c-3-4-4-6-7-5-5 2-3 10 2 9 2-.4 3.3-2.1 5-4s3-5 6-5c5 0 6 8 1 9-3 .6-5-3-7-4Z',
    route: 'M3 18h4l4-11 4 10 3-6h3M5 18a2 2 0 1 1-4 0 2 2 0 1 1 4 0Zm17-8a2 2 0 1 1-4 0 2 2 0 1 1 4 0Z',
    compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0ZM15.5 8.5l-2 5-5 2 2-5Z',
    lock: 'M6 10h12v10H6ZM9 10V7a3 3 0 0 1 6 0v3m-3 4v2',
    check: 'm4 12 5 5L20 6', snow: 'M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7M9 4l3 3 3-3m-6 16 3-3 3 3',
    wing: 'm2 15 18-9-5 10-12 3Zm5 .5 10-5', target: 'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0ZM12 2v5m0 10v5M2 12h5m10 0h5',
    supply: 'M3 7h18v12H3ZM9 7V4h6v3m-3 3v6m-3-3h6', fire: 'm4 19 4-8 3 3 6-11-2 10 4-1-5 8Z',
    shield: 'm12 2 8 4v5c0 5-4 9-8 11-4-2-8-6-8-11V6Z'
};
function icon(name) {
    return `<i data-icon="${name}" aria-hidden="true"><svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[name]}"/></svg></i>`;
}
function setText(id, value) {
    const node = $(id);
    const text = String(value);
    if (node.textContent !== text) node.textContent = text;
}
function headerNav(id, active) {
    const node = $(id);
    if (active) node.setAttribute('aria-current', 'page');
    else node.removeAttribute('aria-current');
}
function initDispatch() {
    document.querySelectorAll('i[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); });
    $('mode-options').innerHTML = Object.entries(modes).map(([id, mode]) =>
        `<button class="mode" data-mode="${id}" aria-pressed="false">${icon(mode.icon)}<strong>${mode.title}</strong></button>`
    ).join('');
    $('fleet-options').innerHTML = CRAFT.all().map((craft,i) =>
        `<button class="fleet-card" data-craft="${craft.id}" aria-pressed="false" title="${craft.desc}">
            <span class="craft-art"><span class="pick-key" aria-hidden="true">0${i + 1}</span><span class="player-flag" aria-hidden="true">1P</span><img src="${craft.imgSrc}" alt=""></span>
            <span class="craft-caption"><strong>${craft.name}</strong><small>${craft.weapon}</small></span></button>`
    ).join('');
    selectCraft(selectedCraft);
    selectMode(selectedMode);
    $('sheet').addEventListener('cancel', e => { e.preventDefault(); goBack(); });
    document.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b || b.disabled) return;
        if (b.dataset.craft) selectCraft(b.dataset.craft);
        else if (b.dataset.mode) selectMode(b.dataset.mode);
        else if (b.dataset.stage !== undefined) selectStage(Number(b.dataset.stage));
        else if (b.dataset.choice !== undefined) chooseBuff(Number(b.dataset.choice));
        else if (b.dataset.action) handleAction(b.dataset.action);
        syncUI();
    });
    $('sheet-content').addEventListener('input', e => {
        const id = e.target.id;
        if (id !== 'bgm' && id !== 'sfx') return;
        const val = Number(e.target.value);
        (id === 'bgm' ? setBGMVolume : setSFXVolume)(val / 100);
        setText(id + '-value', val + '%');
    });
    $('sheet-content').addEventListener('change', e => {
        if (e.target.id === 'fps') { G.game.targetFPS = Number(e.target.value); _lastFrameTime = null; }
        if (['bgm','sfx','fps'].includes(e.target.id)) Save.save();
    });
}
function selectCraft(id) {
    const craft = CRAFT.get(id);
    if (!craft) return;
    selectedCraft = id;
    document.querySelectorAll('[data-craft]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.craft === id)));
    const plane = $('poster-plane');
    if (plane.getAttribute('src') !== craft.imgSrc) {
        plane.src = craft.imgSrc;
        plane.classList.remove('reveal');
        void plane.offsetWidth;
        plane.classList.add('reveal');
    }
    const number = CRAFT.all().indexOf(craft) + 1;
    setText('plane-code', 'F–0' + number + '  /  ' + craft.callsign);
    setText('plane-title', craft.name + '号');
    setText('plane-role', craft.weapon);
    setText('fleet-count', '0' + number + ' / 04');
}
function selectMode(id) {
    selectedMode = id;
    document.querySelectorAll('[data-mode]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.mode === id)));
    setText('mode-brief',modes[id].hint);
    $('launch').firstElementChild.textContent = id === 'level' ? '选择航段' : id === 'explore' ? '起飞' : '出击';
}
function showRoutes() {
    lobbyPage = 'routes';
    selectMode('level');
    selectStage(Math.min(Math.max(0, _levelProgress + 1), LEVEL_DATA.length - 1));
}
const routeStops = [[25,156],[70,130],[103,145],[152,91],[196,101],[240,63],[295,39]];
function selectStage(index) {
    if (index < 0 || index >= LEVEL_DATA.length || index > _levelProgress + 1) return;
    selectedLevel = index;
    drawSchedule();
}
function drawSchedule() {
    displayedLevelProgress = _levelProgress;
    const points = routeStops.map(([x,y]) => x + ',' + y).join(' ');
    const stops = routeStops.map(([x,y], i) => `<g transform="translate(${x} ${y})"><circle r="${i === selectedLevel ? 9 : 5}" stroke="#223e35" stroke-width="2" fill="${i === selectedLevel ? '#b43823' : i <= _levelProgress ? '#326959' : '#f2eddd'}"/><text y="-13" text-anchor="middle" fill="#193a31" stroke="#e8e7cf" stroke-width="3" paint-order="stroke" font-family="monospace" font-size="12" font-weight="bold">0${i+1}</text></g>`).join('');
    $('map-diagram').innerHTML = `<svg viewBox="0 0 320 180" aria-hidden="true"><polyline points="${points}" fill="none" stroke="#fff4d9" stroke-width="6"/><polyline points="${points}" fill="none" stroke="#324c40" stroke-width="2" stroke-dasharray="6 4"/>${stops}</svg>`;
    setText('map-name', '0' + (selectedLevel + 1) + ' / ' + LEVEL_DATA[selectedLevel].name);
    setText('map-progress', (_levelProgress + 1) + ' / 7 已通关');
    $('route-list').innerHTML = LEVEL_DATA.map((level,i) => {
        const locked = i > _levelProgress + 1;
        const record = G.game.levelHighScores[i];
        return `<button class="schedule-row" data-stage="${i}" aria-pressed="${i === selectedLevel}" ${locked ? 'disabled' : ''}><span class="route-id">0${i+1}</span><span><b>${level.name}</b><small>${level.subtitle}${record ? ' · 最高 ' + record + ' 分' : ''}</small></span>${icon(locked ? 'lock' : i <= _levelProgress ? 'check' : 'arrow')}</button>`;
    }).join('');
}
function beginGame() {
    G.game.gameMode = 'endless';
    G.game.isStarted = true;
    flightStartedAt = gameNow();
    startBuffChoice(true);
    playBGM();
}
function beginLevel(index) {
    G.game.gameMode = 'level';
    G.game.currentLevel = index;
    selectedLevel = index;
    G.game.isStarted = true;
    flightStartedAt = gameNow();
    initLevelState();
    startBuffChoice(true);
    playBGM();
}
function beginExplore() {
    G.game.gameMode = 'explore';
    G.game.isStarted = true;
    flightStartedAt = gameNow();
    playBGM();
}
function launchFlight() {
    G.player.aircraftType = selectedCraft;
    resetState();
    if (selectedMode === 'level') beginLevel(selectedLevel);
    else if (selectedMode === 'explore') beginExplore();
    else beginGame();
}
function returnToHangar() {
    stopBGM();
    G.debuggerOpen = false;
    G.game.settingsOpen = false;
    resetState();
    lobbyPage = 'hangar';
}
function goBack() {
    if (G.game.settingsOpen) G.game.settingsOpen = false;
    else if (G.debuggerOpen) G.debuggerOpen = false;
    else if (G.game.isPaused && !G.game.buffChooseMode) G.game.isPaused = false;
    else if (!G.game.isStarted) lobbyPage = 'hangar';
    syncUI();
}
function handleAction(action) {
    switch (action) {
        case 'hangar': lobbyPage = 'hangar'; break;
        case 'routes': showRoutes(); break;
        case 'launch': if (selectedMode === 'level') showRoutes(); else launchFlight(); break;
        case 'start-level': launchFlight(); break;
        case 'settings': G.game.settingsOpen = true; break;
        case 'back': goBack(); break;
        case 'pause': if (isFlying()) G.game.isPaused = true; break;
        case 'resume': G.game.isPaused = false; break;
        case 'boost': if (isFlying()) activateOverclock(); break;
        case 'home': returnToHangar(); break;
        case 'again': launchFlight(); break;
        case 'next': proceedToNextLevel(); break;
        case 'reroll': rerollBuffChoice(); break;
        case 'debug': G.debuggerOpen = true; break;
        case 'debug-life-minus': G.game.life = Math.max(0, G.game.life - 1); break;
        case 'debug-life-plus': G.game.life = Math.min(10, G.game.life + 1); break;
        case 'debug-score-minus': G.game.score = Math.max(0, G.game.score - 100); break;
        case 'debug-score-plus': G.game.score = Math.min(999999, G.game.score + 100); break;
        case 'debug-enemy': summonDebugEnemy($('debug-enemy').value); break;
        case 'debug-boss': {
            if (!G.boss) { G.bossIndex = BOSS._order.indexOf($('debug-boss').value); spawnBoss(); }
            break;
        }
        case 'debug-buff': {
            const def = BUFF.get($('debug-buff').value);
            def.apply(G);
            G.player.buffList.push(def.id);
            G.game.lastChosenBuff = def.id;
            break;
        }
    }
}
function choiceIcon(id) {
    if (id.includes('cryo')) return 'snow';
    if (/lightning|charge|overclock/.test(id)) return 'bolt';
    if (/health|supply|life/.test(id)) return 'supply';
    if (/wingman|swift/.test(id)) return 'wing';
    if (/magnet|gem|missile/.test(id)) return 'target';
    if (id.includes('plating')) return 'shield';
    return 'fire';
}
const button = (action, label, primary = false) => `<button class="${primary ? 'primary' : 'menu-button'}" data-action="${action}">${label}${icon('arrow')}</button>`;
function sheetName() {
    const gm = G.game;
    if (gm.settingsOpen) return 'settings';
    if (!gm.isStarted) return '';
    if (gm.isGameOver) return 'loss';
    if (gm.levelCompleted) return 'clear';
    if (gm.buffChooseMode) return 'choice';
    if (G.debuggerOpen) return 'debug';
    return gm.isPaused ? 'pause' : '';
}
function presentSheet(kind) {
    const gm = G.game;
    const dialog = $('sheet');
    // A reroll can replace the choices while the same sheet stays open.
    const key = kind === 'choice' ? [kind, ...gm.buffChoices, gm.buffRerolls, gm.buffStarter, gm.routeChoice].join('|') : kind;
    if (key === displayedSheet) return;
    const wasOpen = dialog.open;
    displayedSheet = key;
    _lastFrameTime = null;
    _simulationAccumulator = 0;
    if (!kind) {
        if (wasOpen) { dialog.close(); if (gm.isStarted) $('gameCanvas').focus({preventScroll:true}); }
        return;
    }
    let title, code, content;
    dialog.dataset.kind = kind;
    $('sheet-close').hidden = ['choice','clear','loss'].includes(kind);
    if (kind === 'choice') {
        title = gm.routeChoice ? '选择航线' : gm.buffStarter ? '选择起飞装备' : '改装战机';
        code = gm.routeChoice ? 'ROUTE CHANGE' : gm.buffStarter ? 'PREFLIGHT' : 'FIELD UPGRADE';
        content = `<p class="sheet-note">${gm.routeChoice ? '决定下一段航程的奖励。' : '从以下方案中装配一项。'}</p>`;
        content += gm.buffChoices.map((id,i) => {
            const def = BUFF.get(id);
            const desc = typeof def.desc === 'function' ? def.desc(G) : def.desc;
            const rarity = {common:'标准', rare:'稀有', epic:'史诗', legendary:'传说'}[def.rarity] || '';
            return `<button class="choice" data-rarity="${def.rarity}" data-choice="${i}">${icon(choiceIcon(id))}<span><strong>${def.name} <em>${rarity}</em></strong><small>${desc}</small></span><kbd>${i+1}</kbd></button>`;
        }).join('');
        if (!gm.buffStarter && !gm.routeChoice) content += `<button class="sheet-secondary" data-action="reroll" ${gm.buffRerolls ? '' : 'disabled'}>重新抽取 · 剩余 ${gm.buffRerolls} 次</button>`;
    } else if (kind === 'pause') {
        title = '飞行暂停'; code = 'FLIGHT HOLD';
        content = button('resume','继续飞行',true) + '<div class="sheet-actions">' + button('settings','飞行设置') + button('debug','调试面板') + button('home','结束本次飞行并返回机库') + '</div>';
    } else if (kind === 'settings') {
        title = '飞行设置'; code = 'PREFERENCES';
        content = [['bgm','背景音乐',gm.bgmVolume],['sfx','游戏音效',gm.sfxVolume]].map(([id,label,v]) => `<label class="settings-row" for="${id}"><b>${label}</b><input type="range" id="${id}" min="0" max="100" value="${Math.round(v*100)}"><output id="${id}-value">${Math.round(v*100)}%</output></label>`).join('');
        content += `<label class="settings-row" for="fps"><b>帧率上限</b><select id="fps">${[0,60,90,120,144,200].map(n=>`<option value="${n}" ${gm.targetFPS === n ? 'selected' : ''}>${n ? n+' FPS' : '跟随屏幕'}</option>`).join('')}</select></label><div class="sheet-actions">${button('back','完成',true)}</div>`;
    } else if (kind === 'debug') {
        title = '调试面板'; code = 'MAINTENANCE';
        const enemyNames = {basic:'侦察机',shooter:'炮艇',rusher:'突击机',spinner:'回旋翼',phantom:'幻影',minion:'子机'};
        const select = (id,label,options) => `<div class="settings-row"><label for="debug-${id}">${label}</label><select id="debug-${id}">${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select><button data-action="debug-${id}">添加</button></div>`;
        const adjust = (id,label) => `<div class="settings-row"><span>${label}</span><span id="debug-${id}"></span><span><button aria-label="减少${label}" data-action="debug-${id}-minus">−</button> <button aria-label="增加${label}" data-action="debug-${id}-plus">+</button></span></div>`;
        content = adjust('life','生命') + adjust('score','分数') + select('enemy','敌机',Object.entries(enemyNames)) + select('boss','Boss',BOSS._order.map(id=>[id,BOSS.get(id).name])) + select('buff','改装',BUFF.all().filter(def=>!def.id.startsWith('route_')).map(def=>[def.id,def.name]));
    } else {
        const clear = kind === 'clear';
        code = clear ? 'ROUTE COMPLETE' : 'FLIGHT REPORT';
        title = clear ? getCurrentLevel().name + ' · 通关' : '飞行结束';
        content = `<div class="report"><span>本次飞行得分</span><b>${gm.score}</b></div>` + (clear ? button('next',gm.currentLevel < LEVEL_DATA.length-1 ? '进入下一航段' : '完成航程',true) : button('again','再次出航',true)) + button('home','返回机库');
    }
    setText('sheet-title',title);
    setText('sheet-code',code);
    $('sheet-content').innerHTML = content;
    if (!wasOpen) dialog.showModal();
    if (!wasOpen || !dialog.contains(document.activeElement)) {
        const first = $('sheet-content').querySelector('button:enabled,input,select');
        if (first) first.focus({preventScroll: true});
    }
}
function syncUI() {
    const gm = G.game;
    const page = gm.isStarted ? 'flight' : lobbyPage;
    if (page !== previousPage) {
        previousPage = page;
        document.body.classList.toggle('in-flight', gm.isStarted);
        document.body.dataset.scene = page;
        $('lobby').hidden = page !== 'hangar';
        $('routes').hidden = page !== 'routes';
        $('flight').hidden = !gm.isStarted;
        headerNav('nav-hangar',page === 'hangar');
        headerNav('nav-routes',page === 'routes');
        if (gm.isStarted) {
            const craft = CRAFT.get(G.player.aircraftType);
            $('flight-craft').src = craft.imgSrc;
            setText('flight-name',craft.name + '号');
            setText('flight-code',craft.callsign);
            setText('control-note',matchMedia('(pointer: coarse)').matches ? '拖动空域移动战机' : 'WASD / 方向键移动 · 空格超频 · P 暂停');
        }
        window.scrollTo(0,0);
    }
    if (page === 'routes' && displayedLevelProgress !== _levelProgress) drawSchedule();
    setText('best-score',String(gm.highScore).padStart(5,'0'));
    if (gm.isStarted) updateInstruments();
    presentSheet(sheetName());
    if (G.debuggerOpen && $('debug-life')) { setText('debug-life',gm.life); setText('debug-score',gm.score); }
    $('save-status').hidden = !Save.error;
    if (Save.error) setText('save-status',Save.error);
}
let lastLoadout = '';
function updateInstruments() {
    const p = G.player, gm = G.game;
    const explore = gm.gameMode === 'explore';
    const level = getCurrentLevel();
    setText('flight-heading',level ? 'STAGE 0' + level.id + ' / 07' : 'FLIGHT LOG');
    setText('flight-mode',level?.name || modes[gm.gameMode].title);
    setText('flight-score',String(gm.score).padStart(5,'0'));
    const life = Math.max(0,Math.ceil(gm.life));
    if ($('life-pips').childElementCount !== life) {
        $('life-pips').innerHTML = '<i></i>'.repeat(life);
        $('life-pips').setAttribute('aria-label','剩余生命 '+life);
    }
    setText('level-read','Lv.' + p.playerLevel);
    const base = p.playerLevel ? getLevelThreshold(p.playerLevel - 1) : 0;
    const xp = Math.max(0,Math.min(1,(gm.score - base) / (p.levelUpScore - base)));
    const percent = Math.round(xp * 100);
    $('xp-bar').style.width = percent + '%';
    $('xp-meter').setAttribute('aria-valuenow',percent);
    $('xp-meter').title = '再得 ' + Math.max(0,p.levelUpScore-gm.score) + ' 分升级';
    const loadout = p.buffList.join('|');
    if (lastLoadout !== loadout || !$('buff-log').textContent) {
        lastLoadout = loadout;
        const counts = new Map();
        for (const id of p.buffList) counts.set(id,(counts.get(id) || 0) + 1);
        setText('buff-log',Array.from(counts,([id,n])=>BUFF.get(id).name + (n>1 ? ' ×'+n : '')).join(' · ') || '暂无改装');
    }
    const value = Math.min(100,Math.floor(p.energy));
    $('boost').style.setProperty('--charge',p.isOverclock ? '100%' : value+'%');
    $('gameCanvas').parentElement.classList.toggle('drive',p.isOverclock);
    $('boost').disabled = !isFlying() || explore || value < 100 || p.isOverclock;
    setText('energy-read',p.isOverclock ? '生效中' : value + '%');
    const alertBox = $('field-alert');
    let alert = '';
    if (G.bossWarning) {
        alert = '警戒 · 大型敌机接近';
    } else if (G.boss) {
        const b = G.boss;
        const remaining = Math.max(0,Math.ceil(100 * b.hp / b.maxHp));
        const phase = b.isInvincible ? ' · 护盾' : b.phaseTwo ? ' · 二阶段' : '';
        const round = G.bossRound ? ' +' + G.bossRound : '';
        alert = b.def.name + round + phase + '  /  ' + remaining + '%';
        alertBox.style.setProperty('--integrity',remaining + '%');
    } else if (gm.eliteUntil) {
        alert = '精英航线 · ' + Math.max(0,Math.ceil((gm.eliteUntil-gameNow())/1000)) + ' 秒';
    }
    alertBox.classList.toggle('boss-contact',!!G.boss);
    alertBox.hidden = !alert;
    if (alert) setText('field-alert',alert);
}
