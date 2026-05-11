// ─── 存档系统（localStorage 持久化）───

const Save = (() => {
    const KEY = 'rogue_aircraft_save';

    const DEFAULTS = {
        levelProgress: -1,
        highScore: 0,
        levelHighScores: [0, 0, 0, 0, 0, 0, 0],
        bgmVolume: 0,
        sfxVolume: 0.5,
        targetFPS: 0
    };

    function _read() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return { ...DEFAULTS };
            const data = JSON.parse(raw);
            return { ...DEFAULTS, ...data };
        } catch {
            return { ...DEFAULTS };
        }
    }

    function _write(data) {
        try {
            localStorage.setItem(KEY, JSON.stringify(data));
        } catch { /* quota exceeded, ignore */ }
    }

    return {
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
            const d = {
                levelProgress: _levelProgress,
                highScore: G.game.highScore || 0,
                levelHighScores: (G.game.levelHighScores || DEFAULTS.levelHighScores).slice(),
                bgmVolume: G.game.bgmVolume,
                sfxVolume: G.game.sfxVolume,
                targetFPS: G.game.targetFPS
            };
            _write(d);
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
