// Original print illustrations are drawn in the same 600 × 800 coordinates as the simulation.
const FlightArt = new Map();
const ink = { black: '#193933', paper: '#fff4d9', red: '#bc3926', gold: '#e6ae40', teal: '#276c68', ice: '#9bdbd9' };
const TAU = Math.PI * 2;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let scrollDistance = 0;
let sceneryIndex = 0;
let terrainFade = 1;

function resetBgTransition() {
    lastPaintedTime = null;
    scrollDistance = 0;
    sceneryIndex = 0;
    terrainFade = 1;
}
function triggerBgTransition() {
    sceneryIndex++;
    terrainFade = 0;
}
function advanceTerrain() {
    scrollDistance = (scrollDistance + (G.game.gameMode === 'explore' ? .39 : .72) * G.game.dt) % (LOGICAL_H * 2);
    terrainFade = Math.min(1, terrainFade + .009);
}
function loadFlightArt() {
    const registry = [...CRAFT.all().map(c => c.id), ...ENEMY.all().map(e => e.type), ...BOSS._order];
    return Promise.all([...registry,'fjord','valley'].map(id => new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const entry = { img };
            if (registry.includes(id)) {
                // Cache print silhouettes once. Per-frame canvas shadows are expensive on phones.
                for (const [name, color] of [['shadow','#2c483d'],['flash','#fff5d4']]) {
                    const layer = document.createElement('canvas');
                    layer.width = img.width;
                    layer.height = img.height;
                    const c = layer.getContext('2d');
                    c.drawImage(img, 0, 0);
                    c.globalCompositeOperation = 'source-in';
                    c.fillStyle = color;
                    c.fillRect(0,0,layer.width,layer.height);
                    entry[name] = layer;
                }
            }
            FlightArt.set(id,entry);
            resolve();
        };
        img.onerror = () => resolve();
        img.src = 'art/' + id + '.webp';
    })));
}
function circle(c,x,y,r,fill,stroke,width = 1) {
    c.beginPath();
    c.arc(x,y,r,0,TAU);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function terrainPlate(c,id) {
    const source = FlightArt.get(id);
    if (!source) { c.fillStyle = id === 'valley' ? '#d6cca4' : '#b8cbb7'; c.fillRect(0,0,LOGICAL_W,LOGICAL_H); return; }
    // Flip adjacent impressions at their shared edge so the terrain scrolls continuously.
    const top = Math.floor(scrollDistance / LOGICAL_H);
    const offset = scrollDistance % LOGICAL_H;
    for (let i = -1; i <= 0; i++) {
        c.save();
        c.translate(0, Math.round(offset) + i * LOGICAL_H);
        if ((top-i) % 2) { c.translate(0,LOGICAL_H); c.scale(1,-1); }
        c.drawImage(source.img,0,0,LOGICAL_W,LOGICAL_H);
        c.restore();
    }
}
function terrain(c) {
    const zone = G.game.gameMode === 'explore' ? 1 : G.game.gameMode === 'level' ? G.game.currentLevel : sceneryIndex;
    const id = zone % 2 ? 'valley' : 'fjord';
    if (terrainFade < 1) {
        terrainPlate(c, id === 'valley' ? 'fjord' : 'valley');
        c.globalAlpha = terrainFade;
    }
    terrainPlate(c,id);
    c.globalAlpha = 1;
    // Two delicate registration lines mark the edge of the navigable airspace.
    c.fillStyle = '#304e3c55';
    for (let y = Math.floor(scrollDistance) % 50; y < LOGICAL_H; y += 50) {
        const length = (y - Math.floor(scrollDistance)) % 100 === 0 ? 9 : 4;
        c.fillRect(0,y,length,1);
        c.fillRect(LOGICAL_W-length,y,length,1);
    }
}

function aircraft(c,id,x,y,w,h,hit = 0) {
    const sprite = FlightArt.get(id);
    if (sprite) {
        c.save();
        c.globalAlpha *= .20;
        c.drawImage(sprite.shadow,x+w*.065,y+h*.09,w,h);
        c.restore();
        c.drawImage(sprite.img,x,y,w,h);
        if (hit > 0) {
            c.save();
            c.globalAlpha *= Math.min(.9,hit*.13);
            c.drawImage(sprite.flash,x,y,w,h);
            c.restore();
        }
    } else {
        // A readable silhouette is available even during image decode.
        const friendly = !!CRAFT.get(id);
        c.save();
        c.translate(x+w/2,y+h/2);
        c.scale(w/2,(friendly ? 1 : -1)*h/2);
        c.fillStyle = friendly ? ink.red : ink.black;
        c.beginPath(); c.moveTo(0,-1); c.lineTo(.17,-.3); c.lineTo(1,.28);
        c.lineTo(.95,.46); c.lineTo(.14,.18); c.lineTo(.18,.75); c.lineTo(.4,.95);
        c.lineTo(0,.83); c.lineTo(-.4,.95); c.lineTo(-.18,.75); c.lineTo(-.14,.18);
        c.lineTo(-.95,.46); c.lineTo(-1,.28); c.lineTo(-.17,-.3); c.closePath(); c.fill();
        c.restore();
    }
}
function protection(c,x,y,r,color) {
    c.save(); c.strokeStyle = color; c.lineWidth = 2.3;
    const t = (gameNow() % 4000) / 4000 * TAU;
    for (let i=0;i<3;i++) {
        c.beginPath(); c.arc(x,y,r,t+i*TAU/3,t+i*TAU/3+1.7); c.stroke();
    }
    c.restore();
}
function contrail(c,p) {
    const pts = p.trailPoints;
    if (pts.length < 4) return;
    const count = pts.length / 2;
    c.save();
    c.globalAlpha = p.isOverclock ? .82 : .52;
    for (const side of [-1,1]) {
        c.beginPath();
        for (let i = 0; i < count; i++) {
            const age = (count - 1 - i) / count;
            const x = pts[i*2] + side*p.width*(.22+.06*age);
            const y = pts[i*2+1] - p.height*.40 + age*(p.isOverclock ? 94 : 60);
            if (!i) c.moveTo(x,y); else c.lineTo(x,y);
        }
        c.lineWidth = p.isOverclock ? 4 : 2.1;
        c.strokeStyle = p.isOverclock ? '#efad3d' : '#fffae7';
        c.stroke();
    }
    c.restore();
}
function drawFriendly(c) {
    const p = G.player, cx = p.x+p.width/2;
    contrail(c,p);
    engineBloom(c,p);
    if (p.wingmanLevel) {
        const positions = [[p.x-17,p.y+24],[p.x+p.width+17,p.y+24]];
        if (p.wingmanLevel>=2) positions.push([p.x-33,p.y+34],[p.x+p.width+32,p.y+34]);
        for (const [x,y] of positions) aircraft(c,'skysovereign',x-12,y-8,24,26);
    }
    if (p.hasPlating || p.isInvincible) protection(c,cx,p.y+p.height/2,p.width*.62,p.isOverclock ? '#bb7720' : ink.teal);
    c.save();
    if (p.isInvincible && !p.isOverclock && !reducedMotion.matches) c.globalAlpha = .65+.32*(.5+.5*Math.sin(gameNow()*.028));
    aircraft(c,p.aircraftType,p.x,p.y,p.width,p.height,Math.max(0,p.hitEffect/5));
    c.restore();
    if (p.aircraftType === 'mozi' && p.moziTargetX >= 0 && G.game.gameMode !== 'explore') {
        const x=p.moziTargetX,y=p.moziTargetY;
        circle(c,x,y,9,null,ink.teal,1.2);
        c.fillStyle = ink.teal; c.fillRect(x-13,y,7,1); c.fillRect(x+6,y,7,1);
        c.fillRect(x,y-13,1,7); c.fillRect(x,y+6,1,7);
    }
}
function playerFire(c) {
    const p = G.player;
    if (CRAFT.get(p.aircraftType).isLaser) {
        const width = LASER_WIDTH * (1 + (p.pierceLevel || 0)*.6);
        for (const offset of p.doubleShot ? [-10,10] : [0]) {
            const x = p.x + p.width/2 + offset;
            drawEnergyLaser(c,x,p.y+4,width);
        }
    }
    for (const b of G.bullets) drawEnergyRound(c,b);
    for (const b of G.wingmanBullets) drawEnergyRound(c,b,true);
    for (const m of G.homingMissiles) missile(c,m,true);
}
function missile(c,b,friendly) {
    c.save(); c.translate(b.x+b.width/2,b.y+b.height/2); c.rotate(b.angle || 0);
    c.fillStyle = friendly ? ink.teal : ink.red; c.strokeStyle = ink.black; c.lineWidth = 1.3;
    const w = Math.max(8,b.width*.6), h = Math.max(4,b.height*.3);
    c.beginPath(); c.moveTo(w,0); c.lineTo(-w*.3,h*.6); c.lineTo(-w,h); c.lineTo(-w,-h); c.lineTo(-w*.3,-h*.6); c.closePath(); c.fill(); c.stroke();
    c.fillStyle=ink.paper; c.fillRect(-w*.3,-h*.45,w*.54,h*.9); c.restore();
}
function pickup(c,g) {
    const x=g.x+g.width/2,y=g.y+g.height/2, r=8*(g.scale || 1);
    glow(c,x,y,r*2.1,g.score>=20 ? 'mint' : 'sun',.49);
    c.save(); c.translate(x,y); c.rotate(Math.PI/4);
    c.fillStyle = g.score>=20 ? ink.teal : g.score>=10 ? '#a7602a' : '#ca983d';
    c.fillRect(-r,-r,r*2,r*2); c.strokeStyle=ink.black; c.lineWidth=1.4; c.strokeRect(-r,-r,r*2,r*2);
    c.strokeStyle=ink.paper; c.lineWidth=1.6; c.strokeRect(-r*.56,-r*.56,r*1.12,r*1.12);
    c.restore();
}
function dangerLane(c,x,y,w,h,firing) {
    c.save();
    c.fillStyle = firing ? '#b43525b5' : '#a4291d26'; c.fillRect(x,y,w,h);
    c.beginPath(); c.rect(x,y,w,h); c.clip();
    c.strokeStyle = firing ? '#ffdb96' : '#a23529a8'; c.lineWidth = firing ? 5 : 1.5;
    const shift = reducedMotion.matches ? 0 : Math.floor(gameNow()/45)%28;
    for (let i=x-h+shift;i<x+w;i+=28) { c.beginPath(); c.moveTo(i,y+h); c.lineTo(i+h,y); c.stroke(); }
    c.restore();
    c.save(); if (!firing) c.setLineDash([9,5]);
    c.strokeStyle=firing ? ink.red : '#8e3025'; c.lineWidth=3; c.strokeRect(x+1,y+1,w-2,h-2); c.restore();
}
function drawHazards(c) {
    const b=G.boss;
    if (b) {
        const state=b.skillState, firing=state.endsWith('_fire');
        if (state.startsWith('laser_')) dangerLane(c,b.laserX,0,b.def.laserWidth,LOGICAL_H,firing);
        if (state.startsWith('triple_laser_')) {
            for (const y of b.tripleLaserYs) dangerLane(c,0,y,LOGICAL_W,b.def.tripleLaserHeight,firing);
        }
        if (state === 'ice_vortex_cast') {
            const x = b.vortexTargetX, y = b.vortexTargetY;
            circle(c,x,y,80,'#92d1c63b',ink.teal,1.6);
            protection(c,x,y,73,ink.teal);
        }
        if (state.startsWith('pillar_')) dangerLane(c,b.pillarTargetX-b.def.pillarWidth/2,0,b.def.pillarWidth,LOGICAL_H,firing);
    }
    for (const v of G.iceVortexes) {
        circle(c,v.x,v.y,v.radius,'#8bd4d164',ink.teal,2);
        c.save(); c.translate(v.x,v.y); c.rotate(v.angle || 0);
        for (let i=0;i<5;i++) {
            c.rotate(TAU/5); c.beginPath(); c.moveTo(0,5); c.bezierCurveTo(v.radius*.7,0,v.radius*.82,-v.radius*.48,v.radius*.82,-v.radius*.50); c.strokeStyle='#467d7c'; c.lineWidth=2; c.stroke();
        }
        c.restore();
    }
    for (const s of G.iceShields) {
        c.save(); c.translate(s.x,s.y); c.fillStyle='#a6dbd6e3'; c.fillRect(0,0,s.width,s.height);
        c.strokeStyle=ink.teal; c.lineWidth=2; c.strokeRect(0,0,s.width,s.height);
        for (let x=8;x<s.width-16;x+=22) { c.beginPath(); c.moveTo(x,0); c.lineTo(x+12,s.height*.38); c.lineTo(x-1,s.height); c.stroke(); }
        c.fillStyle=ink.teal; c.fillRect(0,s.height-4,s.width*Math.max(0,s.hp/s.maxHp),4); c.restore();
    }
}
function hostiles(c) {
    for (const e of G.enemies) {
        aircraft(c,e.type,e.x,e.y,e.width,e.height,e.hitFlash);
        if (e.frozenUntil > gameNow()) {
            circle(c,e.x+e.width/2,e.y+e.height/2,e.width*.54,'#bbe9ed55',ink.teal,2);
        }
    }
    const b=G.boss;
    if (!b) return;
    aircraft(c,b.def.id,b.x,b.y,b.width,b.height,b.hitFlash);
    const cx = b.x+b.width/2, cy = b.y+b.height*.5;
    const colors = {one_eye_king:'red',night_fury:'violet',ice_evil_king:'ice',julingshen:'sun'};
    const tone = colors[b.def.id];
    for (const fraction of [.32,.68]) {
        glow(c,b.x+b.width*fraction,b.y+b.height*.55,b._animActive ? 23 : 12,tone,.72);
    }
    if (b.isInvincible || b.skillState === 'shield_active') {
        c.save(); c.translate(cx,cy); c.scale(b.width*.53,b.height*.57);
        circle(c,0,0,1,'#a3ebdc22','#c9f5de',.014);
        c.restore();
    }
    if (b.isInvincible || b.skillState.startsWith('shield')) protection(c,cx,cy,b.width*.53,ink.teal);
    if (b._animActive || b.phaseTwo) {
        const r=4+2*Math.sin(gameNow()*.012);
        glow(c,cx,b.y+b.height*.65,r*4,tone);
        sparkStar(c,cx,b.y+b.height*.65,r*1.4,'#ffdfa8',.2);
    }
    if (b.skillState.endsWith('_warn') || b.skillState.endsWith('_cast')) {
        protection(c,cx,cy,b.width*.57,ink.red);
    }
}
function effects(c) {
    const colors = ['#d79746','#546158','#354439','#cb5c32','#fff0bb','#efb447'];
    for (const f of G.flashes) {
        c.globalAlpha=Math.min(1,f.life/f.maxLife);
        const tone = f.tone || 'sun';
        const ratio = f.life / f.maxLife;
        glow(c,f.x,f.y,Math.max(7,f.r*1.08),tone,.78);
        circle(c,f.x,f.y,f.r,null,tone === 'ice' ? '#81e5ff' : '#ffda91',2.5);
        circle(c,f.x,f.y,f.r*.81,null,tone === 'ice' ? '#39798e' : '#b34c2d',1.4);
        if (ratio > .22) sparkStar(c,f.x,f.y,Math.max(3,f.maxR*.60*ratio),'#fff5c7',.3);

    }
    for (const p of G.particles) {
        const pass=p.drawPass || 0, s=Math.max(.8,(p.size||2)*.62);
        c.globalAlpha=Math.min(.95,p.life/p.maxLife)*(pass === PASS_SMOKE ? .38 : 1);
        c.strokeStyle = p.tone === 'ice' ? '#d7faff' : colors[pass];
        c.fillStyle = pass === PASS_CORE && p.pigment ? p.pigment : colors[pass];
        if (pass===PASS_FLASH || pass===PASS_SPARK) {
            c.lineWidth=pass===PASS_FLASH ? 2.3 : 1.5; c.beginPath(); c.moveTo(p.x,p.y); c.lineTo(p.x-p.vx*2.5,p.y-p.vy*2.5); c.stroke();
        } else {
            c.beginPath(); c.ellipse(p.x,p.y,s,s*.64,p.rot||0,0,TAU); c.fill();
        }
    }
    for (const l of G.lightningChains) {
        c.globalAlpha=l.life/l.maxLife;
        c.beginPath(); c.moveTo(l.x1,l.y1);
        for (let i=1;i<8;i++) {
            const a=i/8,off=8*Math.sin(i*17+l.life);
            c.lineTo(l.x1+(l.x2-l.x1)*a+off,l.y1+(l.y2-l.y1)*a-off);
        }
        c.lineTo(l.x2,l.y2); c.strokeStyle='#46d9ce88'; c.lineWidth=10; c.stroke();
        c.strokeStyle=ink.teal; c.lineWidth=5; c.stroke(); c.strokeStyle='#e3fffc'; c.lineWidth=2; c.stroke();
        glow(c,l.x2,l.y2,20,'mint');
    }
    c.font='20px "Atlas Display",sans-serif'; c.textAlign='center';
    for (const t of G.floatTexts) {
        c.globalAlpha=Math.min(1,t.life/(t.maxLife*.35));
        c.lineWidth=3; c.strokeStyle=ink.paper; c.strokeText(t.text,t.x,t.y);
        c.fillStyle=ink.black; c.fillText(t.text,t.x,t.y);
    }
    c.globalAlpha=1;
}
function renderFlight(c) {
    terrain(c);
    flightAtmosphere(c);
    c.save();
    if (!reducedMotion.matches && G.screenShake>.5) {
        c.translate(Math.sin(gameNow()*.075)*Math.min(5,G.screenShake),Math.sin(gameNow()*.063)*Math.min(5,G.screenShake));
    }
    if (G.game.gameMode !== 'explore') {
        drawHazards(c);
        for (const g of G.gems) pickup(c,g);
        hostiles(c);
        playerFire(c);
        muzzleFlare(c);
    }
    if (!G.game.isGameOver) drawFriendly(c);
    effects(c);
    for (const b of G.enemyBullets) drawEnemyRound(c,b);
    entryOrHit(c);
    c.restore();
    if (G.screenFlash>.02 && !reducedMotion.matches) {
        c.fillStyle='rgba(255,239,198,'+Math.min(.3,G.screenFlash)+')'; c.fillRect(0,0,LOGICAL_W,LOGICAL_H);
    }
}
