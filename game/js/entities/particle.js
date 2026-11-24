const PARTICLE_LIMIT = 800;
const PASS_CIRCLE = 0;
const PASS_SMOKE = 1;
const PASS_DEBRIS = 2;
const PASS_CORE = 3;
const PASS_FLASH = 4;
const PASS_SPARK = 5;

function createExplosion(x, y, kind = 'impact') {
    const heavy = kind === 'bomb' || kind === 'fortress';
    const radius = kind === 'fortress' ? 99 : kind === 'bomb' ? MOZI_EXPLOSION_RADIUS : 36;
    const pigment = kind === 'ice' ? '#6eaaa9' : '#c95432';
    const sectors = heavy ? 18 : 9;
    const phase = Math.random() * Math.PI;
    const tone = kind === 'ice' ? 'ice' : kind === 'bomb' ? 'sun' : 'red';
    G.flashes.push({x, y, r: 3, maxR: radius, life: 35, maxLife: 35, tone});
    if (heavy) G.flashes.push({x, y, r: 2, maxR: radius * .57, life: 49, maxLife: 49});
    for (let i = 0; i < sectors && G.particles.length < PARTICLE_LIMIT - 1; i++) {
        const angle = phase + (i + Math.random() * .32) * Math.PI * 2 / sectors;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const speed = (1 + Math.random() * 1.4) * (heavy ? 2.1 : 1.2);
        const life = 20 + Math.random() * 23;
        G.particles.push({
            x: x + dx * 4, y: y + dy * 4, vx: dx * speed, vy: dy * speed,
            rot: angle, rotV: .025, size: heavy ? 6 : 4, life, maxLife: life,
            pigment, drawPass: i % 3 === 0 ? PASS_DEBRIS : PASS_CORE
        });
        G.particles.push({
            x: x + dx * 7, y: y + dy * 7, vx: dx * speed * 1.7, vy: dy * speed * 1.7,
            size: 2, life: 24, maxLife: 24, drawPass: PASS_SPARK
        });
    }
}

function createMissileTrail(x, y, angle) {
    if (G.particles.length >= PARTICLE_LIMIT) return;
    G.particles.push({
        x, y, vx: -Math.cos(angle) * .65, vy: -Math.sin(angle) * .65,
        size: 3.5, life: 17, maxLife: 17, drawPass: PASS_SMOKE
    });
}

function updateParticles() {
    const dt = G.game.dt;
    // 原地压缩，一次遍历，O(n) 无 splice
    let w = 0;
    for (let i = 0, n = G.particles.length; i < n; i++) {
        const p = G.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity || 0) * dt;
        // 摩擦力：每 200fps 帧衰减 0.98，dt 帧后衰减 0.98^dt
        const friction = Math.pow(0.98, dt);
        p.vx *= friction;
        p.vy *= friction;
        if (p.rot !== undefined) p.rot += (p.rotV || 0) * dt;
        const decay = (p.decay !== undefined) ? p.decay : 1;
        p.life -= decay * dt;
        if (p.life > 0) {
            if (w !== i) G.particles[w] = p;
            w++;
        }
    }
    G.particles.length = w;

    w = 0;
    for (let i = 0, n = G.flashes.length; i < n; i++) {
        const f = G.flashes[i];
        f.life -= dt;
        // 插值：每帧靠近目标 0.3，dt 帧后用 1 - (1-0.3)^dt
        const lerpFactor = 1 - Math.pow(0.7, dt);
        f.r += (f.maxR - f.r) * lerpFactor;
        if (f.life > 0) {
            if (w !== i) G.flashes[w] = f;
            w++;
        }
    }
    G.flashes.length = w;
}
