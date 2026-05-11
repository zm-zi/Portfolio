// 简易音效系统（音效池版，避免高频触发时播放被截断）
const _bgm = new Audio('music/bgm0.mp3');
_bgm.loop = true;
_bgm.volume = 0;

function playBGM() {
    _bgm.currentTime = 0;
    _bgm.play().catch(() => {});
}

function stopBGM() {
    _bgm.pause();
    _bgm.currentTime = 0;
}

// 音效池：每个类型维护多个 Audio 实例，循环使用避免截断
function _createPool(src, volume, size) {
    const pool = [];
    for (let i = 0; i < size; i++) {
        const a = new Audio(src);
        a.volume = volume;
        pool.push(a);
    }
    let idx = 0;
    return {
        play() {
            const a = pool[idx];
            idx = (idx + 1) % pool.length;
            a.currentTime = 0;
            a.play().catch(() => {});
        },
        setVolume(v) {
            for (const a of pool) a.volume = v;
        },
        get baseVolume() { return volume; }
    };
}

const _gemPickupSfx = _createPool('music/拾取宝石音效.wav', 0.5, 3);
const _attackSfx    = _createPool('music/攻击音效3.m4a', 0.3, 4);
const _hitSfx       = _createPool('music/角色受击音效.wav', 0.5, 2);
const _explosionSfx = _createPool('music/怪物爆炸音效.wav', 0.4, 3);

// 各音效相对比例（基于默认音量）
const _SFX_RATIOS = {
    gem:   _gemPickupSfx.baseVolume,
    attack:_attackSfx.baseVolume,
    hit:   _hitSfx.baseVolume,
    boom:  _explosionSfx.baseVolume
};

function playGemPickupSound() { _gemPickupSfx.play(); }
function playAttackSound()    { _attackSfx.play(); }
function playHitSound()       { _hitSfx.play(); }
function playExplosionSound() { _explosionSfx.play(); }

// ─── 音量控制 ───
function setBGMVolume(v) {
    const vol = Math.max(0, Math.min(1, v));
    _bgm.volume = vol;
    G.game.bgmVolume = vol;
}

function setSFXVolume(v) {
    const vol = Math.max(0, Math.min(1, v));
    _gemPickupSfx.setVolume(vol * _SFX_RATIOS.gem);
    _attackSfx.setVolume(vol * _SFX_RATIOS.attack);
    _hitSfx.setVolume(vol * _SFX_RATIOS.hit);
    _explosionSfx.setVolume(vol * _SFX_RATIOS.boom);
    G.game.sfxVolume = vol;
}
