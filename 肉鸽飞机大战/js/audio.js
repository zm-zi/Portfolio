// 简易音效系统
const _bgm = new Audio('music/bgm0.mp3');
_bgm.loop = true;
_bgm.volume = 0.4;

function playBGM() {
    _bgm.currentTime = 0;
    _bgm.play().catch(() => {});
}

function stopBGM() {
    _bgm.pause();
    _bgm.currentTime = 0;
}

// SFX 相对比例（基于当前默认音量）
const _SFX_RATIOS = {
    gem:   0.5 / 0.5,  // 1.0
    attack:0.3 / 0.5,  // 0.6
    hit:   0.5 / 0.5,  // 1.0
    boom:  0.4 / 0.5   // 0.8
};

const _gemPickupSfx = new Audio('music/拾取宝石音效.wav');
_gemPickupSfx.volume = 0.5;

const _attackSfx = new Audio('music/攻击音效3.m4a');
_attackSfx.volume = 0.3;

const _hitSfx = new Audio('music/角色受击音效.wav');
_hitSfx.volume = 0.5;

const _explosionSfx = new Audio('music/怪物爆炸音效.wav');
_explosionSfx.volume = 0.4;

function playGemPickupSound() {
    _gemPickupSfx.currentTime = 0;
    _gemPickupSfx.play().catch(() => {});
}

function playAttackSound() {
    _attackSfx.currentTime = 0;
    _attackSfx.play().catch(() => {});
}

function playHitSound() {
    _hitSfx.currentTime = 0;
    _hitSfx.play().catch(() => {});
}

function playExplosionSound() {
    _explosionSfx.currentTime = 0;
    _explosionSfx.play().catch(() => {});
}

// ─── 音量控制 ───
function setBGMVolume(v) {
    const vol = Math.max(0, Math.min(1, v));
    _bgm.volume = vol;
    G.game.bgmVolume = vol;
}

function setSFXVolume(v) {
    const vol = Math.max(0, Math.min(1, v));
    _gemPickupSfx.volume = vol * _SFX_RATIOS.gem;
    _attackSfx.volume   = vol * _SFX_RATIOS.attack;
    _hitSfx.volume      = vol * _SFX_RATIOS.hit;
    _explosionSfx.volume = vol * _SFX_RATIOS.boom;
    G.game.sfxVolume = vol;
}
