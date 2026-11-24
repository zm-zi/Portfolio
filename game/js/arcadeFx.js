// Small cached light textures keep dense volleys inexpensive on a phone.
const flareCache = new Map();
let flightStartedAt = 0;
const lightRGB = { sun:'255,170,54', mint:'59,246,209', ice:'116,216,255', red:'255,70,58', violet:'222,109,255', rose:'255,109,155' };
function glow(c,x,y,r,tone,alpha=1) {
    let texture = flareCache.get(tone);
    if (!texture) {
        texture = document.createElement('canvas');
        texture.width = texture.height = 64;
        const g = texture.getContext('2d');
        const field = g.createRadialGradient(32,32,0,32,32,32);
        const color = lightRGB[tone];
        field.addColorStop(0,'rgba('+color+',.96)');
        field.addColorStop(.22,'rgba('+color+',.73)');
        field.addColorStop(.55,'rgba('+color+',.24)');
        field.addColorStop(1,'rgba('+color+',0)');
        g.fillStyle=field; g.fillRect(0,0,64,64);
        flareCache.set(tone,texture);
    }
    c.save(); c.globalAlpha *= alpha;
    c.drawImage(texture,x-r,y-r,r*2,r*2);
    c.restore();
}
function sparkStar(c,x,y,r,color,angle=0) {
    c.save(); c.translate(x,y); c.rotate(angle);
    c.beginPath();
    for (let i=0;i<8;i++) {
        const a=i*Math.PI/4, length=i%2 ? r*.19 : r;
        const px=Math.cos(a)*length, py=Math.sin(a)*length;
        if (i) c.lineTo(px,py); else c.moveTo(px,py);
    }
    c.closePath(); c.fillStyle=color; c.fill(); c.restore();
}
function energyTrail(c,width,length,color) {
    // Local nose is up. Only the luminous head marks the projectile itself.
    c.fillStyle=color; c.beginPath();
    c.moveTo(-width,0); c.quadraticCurveTo(-width*.6,length*.47,0,length);
    c.quadraticCurveTo(width*.6,length*.47,width,0); c.closePath(); c.fill();
}
function drawEnergyRound(c,b,wing) {
    const p=G.player, x=b.x+b.width/2, y=b.y+b.height/2;
    const spread=!!b.skySovereign;
    const tone=b.isBomb ? 'sun' : p.isOverclock ? 'sun' : p.cryoRounds ? 'ice' : spread || wing ? 'mint' : 'sun';
    const light=tone==='mint' ? '#99ffe8' : tone==='ice' ? '#c5f8ff' : '#ffdd87';
    const edge=tone==='mint' ? '#185d54' : tone==='ice' ? '#376a89' : '#9b4b1f';
    c.save(); c.translate(x,y);
    if (b.vx !== undefined) c.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);
    const r=b.isBomb ? 7 : wing ? 3 : spread ? 4 : 4.4;
    glow(c,0,-2,r*3.6,tone,.85);
    energyTrail(c,r*1.12,b.isBomb ? 28 : b.height*1.45,edge+'8a');
    energyTrail(c,r*.66,b.isBomb ? 22 : b.height*1.18,light+'d6');
    if (b.isBomb) {
        circle(c,0,0,7,'#be6835','#543c28',1.5);
        protection(c,0,0,10,'#ffdf88'); sparkStar(c,0,0,6,'#fff4bf',gameNow()*.004);
    } else {
        c.beginPath(); c.moveTo(0,-b.height*.46); c.quadraticCurveTo(r*1.62,-1,r*.6,5);
        c.lineTo(0,8); c.lineTo(-r*.6,5); c.quadraticCurveTo(-r*1.62,-1,0,-b.height*.46); c.closePath();
        c.fillStyle=light; c.fill(); c.strokeStyle=edge; c.lineWidth=1.4; c.stroke();
        c.fillStyle='#ffffe4'; c.fillRect(-1,-b.height*.27,2,b.height*.39);
    }
    c.restore();
}
function drawEnergyLaser(c,x,y,width) {
    const gold=G.player.isOverclock;
    const primary=gold ? '#ffcb5b' : '#ff7398';
    c.fillStyle=gold ? '#ffb43d32' : '#dc49662b'; c.fillRect(x-width*1.8,0,width*3.6,y);
    c.fillStyle=gold ? '#a96531' : '#9d364d'; c.fillRect(x-width*.5,0,width,y);
    c.fillStyle=primary; c.fillRect(x-width*.34,0,width*.68,y);
    c.fillStyle='#fff3cc'; c.fillRect(x-width*.15,0,width*.3,y);
    c.lineWidth = 1.5;
    c.strokeStyle = primary;
    const offset=(gameNow()*.20)%55;
    for (let yy=offset;yy<y;yy+=55) {
        c.beginPath(); c.ellipse(x,yy,width*.91,4,-.24,0,TAU); c.stroke();
    }
    glow(c,x,y,29,gold ? 'sun' : 'rose'); sparkStar(c,x,y,13,'#fff2ca',.15);
}
function muzzleFlare(c) {
    const p=G.player;
    const elapsed=gameNow()-p.lastFireTime;
    if (elapsed<0 || elapsed>95 || CRAFT.get(p.aircraftType).isLaser) return;
    const power=1-elapsed/95, x=p.x+p.width*.5;
    const tone=p.cryoRounds ? 'ice' : p.aircraftType==='skysovereign' ? 'mint' : 'sun';
    c.save(); c.globalAlpha=.45+.55*power;
    glow(c,x,p.y,12+18*power,tone); sparkStar(c,x,p.y,4+10*power,'#fff4ca',Math.PI*.25);
    c.restore();
}
function drawEnemyRound(c,b) {
    if (b.isHoming) {
        glow(c,b.x+b.width/2,b.y+b.height/2,16,'red'); missile(c,b,false); return;
    }
    const x=b.x+b.width/2,y=b.y+b.height/2;
    const crystal = b.iceTrail, petals = b.petal || b.warhead === 'echo';
    const crown = b.warhead === 'crown', ember = b.warhead === 'ember';
    const special = crystal || petals;
    const r = Math.max(4,b.width*.5);
    const tone = crystal ? 'ice' : petals ? 'violet' : crown ? 'sun' : 'red';
    const rim = crystal ? '#294e76' : petals ? '#553467' : crown ? '#814327' : '#6d2d32';
    const face = crystal ? '#9aeaff' : petals ? '#ef90ff' : crown ? '#ffbc56' : '#ff7454';
    c.save(); c.translate(x,y); c.rotate(Math.atan2(b.vy ?? 1,b.vx ?? 0)+Math.PI/2);
    glow(c,0,1,Math.min(30,r*3.5),tone,.78);
    const trailLength = b.warhead ? r*6.5 : special ? 22 : 16;
    energyTrail(c,r*1.05,trailLength,face+'a8');
    if (b.warhead) {
        energyTrail(c,r*.48,trailLength*.75,'#fff4bcd9');
        c.strokeStyle = face; c.lineWidth = 1.1;
        c.beginPath(); c.moveTo(-r*.8,2); c.quadraticCurveTo(-r*1.5,10,-r*.35,trailLength*.52);
        c.moveTo(r*.8,2); c.quadraticCurveTo(r*1.5,10,r*.35,trailLength*.52); c.stroke();
    }
    c.beginPath();
    if (crown) {
        c.moveTo(0,-r*1.3); c.lineTo(r,r*.05); c.lineTo(0,r); c.lineTo(-r,r*.05);
    } else if (special) {
        c.moveTo(0,-b.height*.56); c.quadraticCurveTo(r*1.5,0,0,b.height*.48); c.quadraticCurveTo(-r*1.5,0,0,-b.height*.56);
    } else c.ellipse(0,0,r,Math.max(r,b.height*.45),0,0,TAU);
    c.fillStyle=face; c.fill(); c.strokeStyle=rim; c.lineWidth=2; c.stroke();
    c.beginPath(); c.ellipse(0,-1,Math.max(1.3,r*.38),Math.max(2,b.height*.24),0,0,TAU); c.fillStyle='#fff5d2'; c.fill();
    if ((ember || crown) && r >= 5) {
        sparkStar(c,0,0,r*.94,'#fff7d8',crown ? Math.PI*.25 : 0);
    }
    c.restore();
}
function engineBloom(c,p) {
    const x=p.x+p.width*.5, y=p.y+p.height*.87;
    const strong=p.isOverclock;
    const pulse = reducedMotion.matches ? 1 : .88+.12*Math.sin(gameNow()*.03);
    c.save(); c.translate(x,y); c.scale(1,pulse);
    glow(c,0,6,strong ? 32 : 17,strong ? 'sun' : 'mint',strong ? 1 : .60);
    energyTrail(c,strong ? 8 : 4,strong ? 58 : 29,strong ? '#ffaf4baf' : '#a0f4dec2');
    energyTrail(c,strong ? 3.5 : 1.8,strong ? 35 : 17,'#fff2c7e6');
    c.restore();
}
function flightAtmosphere(c) {
    const p=G.player;
    c.fillStyle='#163e4e28'; c.fillRect(0,0,LOGICAL_W,LOGICAL_H);
    if (reducedMotion.matches) return;
    c.strokeStyle=p.isOverclock ? '#fff0b5a8' : '#e7f8ed66';
    c.lineWidth=p.isOverclock ? 2 : 1;
    const count=p.isOverclock ? 32 : 12;
    const phase=gameNow()%60000;
    c.beginPath();
    for(let i=0;i<count;i++) {
        const x=8+((i*103.7)%584), travel=phase*(p.isOverclock ? .55 : .12)*(1+(i%3)*.16);
        const y=(i*139+travel)%860-35, length=p.isOverclock ? 28+i%18 : 7+i%8;
        c.moveTo(x,y); c.lineTo(x-1,y+length);
    }
    c.stroke();
}
function impactSparks(x,y,tone='sun') {
    if (G.particles.length > PARTICLE_LIMIT-8) return;
    const amount=reducedMotion.matches ? 3 : 7;
    for (let i=0;i<amount;i++) {
        const a=i/amount*TAU+Math.random()*.36;
        const speed=1.1+Math.random()*2.3;
        G.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,size:2,life:18,maxLife:18,drawPass:PASS_SPARK,tone});
    }
    G.flashes.push({x,y,r:3,maxR:17,life:17,maxLife:17,tone});
}
function overdriveBurst() {
    const p=G.player;
    G.flashes.push({x:p.x+p.width/2,y:p.y+p.height/2,r:9,maxR:133,life:64,maxLife:64,tone:'sun'});
}
function entryOrHit(c) {
    const p=G.player;
    if (p.hitEffect>0) {
        c.strokeStyle='rgba(190,55,33,'+Math.min(.8,p.hitEffect/16)+')';
        c.lineWidth=8; c.strokeRect(3,3,LOGICAL_W-6,LOGICAL_H-6);
    }
    const elapsed=gameNow()-flightStartedAt;
    if (elapsed<0 || elapsed>1500 || G.game.buffChooseMode || G.game.isPaused) return;
    const alpha=Math.min(1,elapsed/130,(1500-elapsed)/300);
    c.save(); c.globalAlpha=Math.max(0,alpha);
    c.translate(LOGICAL_W/2,LOGICAL_H*.35);
    c.fillStyle='#172629ed'; c.fillRect(-88,-17,176,34);
    c.fillStyle='#ed5d42'; c.fillRect(-88,-17,4,34); c.fillRect(84,-17,4,34);
    c.font='11px "Atlas Pixel",monospace'; c.textAlign='center'; c.textBaseline='middle';
    c.fillStyle='#ffd462'; c.fillText(G.game.gameMode==='explore' ? 'FREE FLIGHT' : 'SORTIE START',0,1); c.restore();
}

// Distant aircraft and moving slipstreams bring the title diorama to life.
let skyContext=null, skyFrame=-1;
function drawHangarSky(ms) {
    if (document.hidden || document.body.dataset.scene!=='hangar' || G.game.settingsOpen) return;
    const sky=$('hangar-sky');
    const w=sky.clientWidth, h=sky.clientHeight;
    if (!w || !h) return;
    const t=reducedMotion.matches ? 2 : ms/1000;
    const frame=Math.floor(t*24);
    if (frame===skyFrame && sky.width===w && sky.height===h) return;
    skyFrame=frame;
    if (sky.width!==w || sky.height!==h) { sky.width=w; sky.height=h; }
    if (!skyContext) skyContext=sky.getContext('2d');
    const c=skyContext;
    c.clearRect(0,0,w,h);
    c.save();
    c.strokeStyle='#fff2ce92'; c.lineWidth=1;
    for(let i=0;i<16;i++) {
        const x=w*((1.6+(i*.197)%1-(t*(.038+i%4*.005))%1)%1.35-.12);
        const y=h*((i*.163 + .12+t*.005)%1);
        const size=8+i%4*9;
        c.globalAlpha=.12+(i%4)*.08;
        c.beginPath(); c.moveTo(x,y); c.lineTo(x+size,y-size*.4); c.stroke();
    }
    const sprite=FlightArt.get('skysovereign');
    if (sprite) {
        const progress=(t*.025)%1;
        const fx=w*(.36+progress*.8), fy=h*(.52-progress*.55);
        c.globalAlpha=.58;
        for(let i=0;i<3;i++) {
            const x=fx+i*18,y=fy+Math.abs(1-i)*18;
            c.save(); c.translate(x,y); c.rotate(.91);
            c.strokeStyle='#fff5d9be'; c.beginPath(); c.moveTo(-4,5); c.lineTo(-4,34+i*8); c.stroke();
            c.drawImage(sprite.img,-9,-8,18,16); c.restore();
        }
    }
    c.restore();
}
