// ─── 存档系统（localStorage 持久化）───

const Save = (() => {
    const KEY = 'rogue_aircraft_save';
    const VERSION = 1;
    let writeLocked = false;
    let errorMessage = '';

    const DEFAULTS = {
        levelProgress: -1,
        highScore: 0,
        levelHighScores: [0, 0, 0, 0, 0, 0, 0],
        bgmVolume: 0,
        sfxVolume: 0.5,
        targetFPS: 0
    };

    function _normalize(data) {
        const number = (value, fallback, min, max) =>
            typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
        const scores = Array.isArray(data.levelHighScores) ? data.levelHighScores : [];
        return {
            version: VERSION,
            levelProgress: Math.floor(number(data.levelProgress, -1, -1, DEFAULTS.levelHighScores.length - 1)),
            highScore: number(data.highScore, 0, 0, Number.MAX_SAFE_INTEGER),
            levelHighScores: DEFAULTS.levelHighScores.map((_, i) => number(scores[i], 0, 0, Number.MAX_SAFE_INTEGER)),
            bgmVolume: number(data.bgmVolume, DEFAULTS.bgmVolume, 0, 1),
            sfxVolume: number(data.sfxVolume, DEFAULTS.sfxVolume, 0, 1),
            targetFPS: [0, 60, 90, 120, 144, 200].includes(data.targetFPS) ? data.targetFPS : DEFAULTS.targetFPS
        };
    }

    function _read() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return _normalize({});
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid save');
            if (data.version !== undefined && (!Number.isInteger(data.version) || data.version < 0 || data.version > VERSION)) {
                throw new Error('Unsupported save version');
            }
            return _normalize(data);
        } catch {
            writeLocked = true;
            errorMessage = '存档读取失败，已保留原始数据';
            return _normalize({});
        }
    }

    function _write(data) {
        if (writeLocked) return false;
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
            errorMessage = '';
            return true;
        } catch {
            errorMessage = '存档写入失败，请检查浏览器存储';
            return false;
        }
    }

    return {
        get error() { return errorMessage; },
        // 启动时调用：读取存档 → 应用到游戏状态
        load() {
            const d = _read();

            // 关卡进度
            _levelProgress = d.levelProgress;

            // 最高分
            G.game.highScore = d.highScore;
            G.game.levelHighScores = d.levelHighScores.slice();

            // 设置
            G.game.bgmVolume = d.bgmVolume;
            G.game.sfxVolume = d.sfxVolume;
            G.game.targetFPS = d.targetFPS;

            // 应用音量
            setBGMVolume(d.bgmVolume);
            setSFXVolume(d.sfxVolume);
        },

        // 从当前游戏状态收集并写入
        save() {
            const d = _normalize({
                levelProgress: _levelProgress,
                highScore: G.game.highScore || 0,
                levelHighScores: (G.game.levelHighScores || DEFAULTS.levelHighScores).slice(),
                bgmVolume: G.game.bgmVolume,
                sfxVolume: G.game.sfxVolume,
                targetFPS: G.game.targetFPS
            });
            return _write(d);
        },

        // 清除进度（保留设置）
        clearProgress() {
            const d = _read();
            d.levelProgress = -1;
            d.highScore = 0;
            d.levelHighScores = [0, 0, 0, 0, 0, 0, 0];
            _write(d);
        }
    };
})();
