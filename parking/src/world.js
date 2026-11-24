import * as THREE from 'three';
import { addSea, addSky, addContactShadows, layAsphalt } from './coast.js';
import { ClayKit, lettering } from './clay.js';

export const BAY_W = 3.15, BAY_L = 5.6, BAY_COUNT = 10, BAY_X0 = -19.5;
const C = {
  cream: '#ffedce', white: '#fff8e5', dark: '#23474a', glass: '#34636a',
  mint: '#77bba4', pink: '#de9889', lemon: '#e6b671', lilac: '#889eae',
  coral: '#ed8068', wood: '#b97a49', grass: '#a1be78', hedge: '#508e66',
  walk: '#e5cfb0', road: '#727f83', sea: '#70c4e2', ink: '#344458',
};
const bayCenters = (row, i) => ({
  x: BAY_X0 + (i + 0.5) * BAY_W, z: row === 'A' ? -18.2 : -6.6,
  heading: row === 'A' ? Math.PI : 0,
});

export function buildWorld(scene) {
  const kit = new ClayKit();
  const put = kit.add.bind(kit);
  const box = (...args) => put('box', ...args);
  const block = (...args) => put('block', ...args);
  const tile = (...args) => put('tile', ...args);
  const ball = (...args) => put('ball', ...args);
  const drum = (...args) => put('drum', ...args);
  const colliders = [];
  const footprints = [];
  const solid = (x, z, w, d) => colliders.push({ x0: x-w/2, x1: x+w/2, z0: z-d/2, z1: z+d/2 });
  const text = (...args) => lettering(scene, ...args);
  const groundText = (s,x,z,w,h,ink) => text(s,x,0.078,z,w,h,ink,null,true);
  const stripe = (x,z,w,d,color=C.white) => box(x,0.025,z,w,0.035,d,color);
  function island(x,z,w,d) {
    tile(x,-1.28,z,w,2.0,d,'#c7ac8e');
    tile(x,-0.67,z,w+0.15,0.94,d,'#e5cfac');
    tile(x,-0.245,z,w,0.37,d,C.grass);
  }
  const islands = [[-16,-22,87,79],[-16,53,90,50],[-83,-5,27,134],[64,-53,36,44]];
  for (const footprint of islands) island(...footprint);
  const animateWater = addSea(scene, islands);
  addSky(scene);
  const contacts = [], asphalt = [];
  // Low banks on the horizon give the waterfront a far shore in chase view.
  for (let i=0;i<24;i++) {
    const angle=i*Math.PI/12, radius=137+8*Math.sin(i*13);
    put('facet',Math.cos(angle)*radius,-9,Math.sin(angle)*radius,
      42+i%4*6,26+i%5*2,32,'#739c95',angle);
    if (i%2===0) {
      const x=Math.cos(angle)*120, z=Math.sin(angle)*120, y=19+i%3*3;
      for (let j=0;j<3;j++) ball(x+j*3,y+(j===1?0.9:0),z,6.8,2.4+j%2,3.8,'#fff3db');
    }
  }

  // Laid in individual slabs so joints pick up the sun at grazing angles.
  function paving(x,z,w,d,color,stepX=4,stepZ=4,top=0.06) {
    const nx = Math.ceil(w/stepX), nz = Math.ceil(d/stepZ);
    const sx=w/nx, sz=d/nz;
    box(x,top-0.12,z,w,0.18,d,'#b7b7ad');
    for(let i=0;i<nx;i++) for(let j=0;j<nz;j++) {
      tile(x-w/2+(i+0.5)*sx,top-0.075,z-d/2+(j+0.5)*sz,sx-0.055,0.15,sz-0.055,color);
    }
  }
  function road(x,z,w,d,vertical) {
    asphalt.push([x,z,w,d,vertical?-0.010:-0.024,C.road]);
    // Short edge lines leave the intersections open.
    for (const side of [-1,1]) {
      for (let t=-(vertical?d:w)/2+1;t<(vertical?d:w)/2-1;t+=2.15) {
        const xx=x+(vertical?side*(w/2-0.22):t), zz=z+(vertical?t:side*(d/2-0.22));
        if (vertical && (Math.abs(zz-11.4)<4 || Math.abs(zz+43)<4 || (side<0 && x>0 && Math.abs(zz+12.4)<4))) continue;
        if (!vertical && (Math.abs(xx-16.3)<4.5 || Math.abs(xx+36)<4)) continue;
        box(xx,0.003,zz,vertical?0.095:2.13,0.012,vertical?2.13:0.095,'#d3cdb6');
      }
    }
    const length = vertical ? d : w;
    for(let t=-length/2+2.3;t<length/2;t+=5.2) {
      stripe(x+(vertical?0:t), z+(vertical?t:0),vertical?0.23:2.2,vertical?2.2:0.23,'#ffe698');
    }
  }
  road(-36,-22,6.5,78,true);
  road(-16,-43,85,6.4,false);
  road(16.3,-22.5,7.2,79,true);
  road(-16,32.6,87,8,false);
  road(-16,11.4,84,6.4,false);
  for(const [x,z,vertical] of [[16.3,6.8,true],[16.3,-35.7,true],[-31.2,11.4,false],[-36,-37,true],[10.8,11.4,false]]) {
    for(let i=-2;i<=2;i++) stripe(x+(vertical?i*1.12:0), z+(vertical?0:i*1.12),vertical?0.55:2.3,vertical?2.3:0.55);
  }
  function signal(x,z,dir) {
    drum(x,0.19,z,0.48,0.38,0.48,C.dark);
    drum(x,2.22,z,0.18,4.28,0.18,C.dark);
    block(x+dir*1.03,4.26,z,2.16,0.21,0.21,C.dark);
    block(x+dir*1.7,4.17,z,1.55,0.56,0.56,'#ffbf49');
    for(const [i,col] of ['#ef785e','#ffda79','#75c78e'].entries()) {
      ball(x+dir*1.7+(i-1)*0.43,4.28,z+0.25,0.29,0.29,0.24,col);
    }
    solid(x,z,0.28,0.28);
  }
  signal(20.35,7.65,-1); signal(12.05,-38.7,1); signal(-31.9,7.5,-1);
  function bridge(x,z,w,d) {
    box(x,-0.4,z,w,0.65,d,C.wood);
    for(let i=0;i<Math.ceil(d);i++) tile(x,-0.08,z-d/2+i+0.5,w,0.16,0.93,'#eac285');
    for(const s of [-1,1]) {
      const xx=x+s*(w/2-0.14);
      box(xx,0.62,z,0.16,0.13,d,C.cream);
      solid(xx,z,0.2,d);
      for(let k=-d/2+0.5;k<d/2;k+=2.65) drum(xx,0.21,z+k,0.27,1.08,0.27,C.wood);
    }
  }
  bridge(16.3,23,7.3,12);
  bridge(-36,23,6.5,12);
  // Seawalls keep the drivable surface contiguous with the bridge decks.
  for(const edge of [17.55,27.95]) {
    for(const [x,w] of [[-49.7,21],[-9.8,45.1],[24.3,8.6]]) solid(x,edge,w,0.3);
  }
  asphalt.push([-4.5,-12.4,34.4,17.4,-0.004,'#637981']);
  layAsphalt(scene,asphalt);
  paving(-4,-23.4,36.5,4.65,C.walk,3.05,2.4);
  paving(23.6,-12.4,7,48,'#ecdfc7',3.5,3.5);
  paving(-26.6,-13.3,9.4,47,C.walk,3.2,3.2);
  for(const row of ['A','B']) {
    const {z}=bayCenters(row,0);
    for(let i=0;i<=BAY_COUNT;i++) stripe(BAY_X0+i*BAY_W,z,0.115,BAY_L);
    const endZ=z+(row==='A'?-1:1)*(BAY_L/2-0.04);
    stripe(BAY_X0+BAY_COUNT*BAY_W/2,endZ,BAY_COUNT*BAY_W,0.12);
    for(let i=0;i<BAY_COUNT;i++) {
      const b=bayCenters(row,i);
      if(row==='A' && [6,7].includes(i)) {
        box(b.x,0.008,z,BAY_W-0.19,0.027,BAY_L-0.15,'#78b9cb');
        groundText('♿︎',b.x,z,1.45,1.55,'#fff9e9');
      }
      if(row==='A' && [4,5].includes(i)) {
        stripe(b.x,z,0.44,1.65,'#ffe1c7'); stripe(b.x,z,1.65,0.44,'#ffe1c7');
      }
      const stop=endZ+(row==='A'?0.43:-0.43);
      block(b.x,0.13,stop,1.66,0.24,0.31,'#485768');
      for(const dx of [-0.48,0.48]) box(b.x+dx,0.258,stop,0.3,0.025,0.29,'#ffce70');
      groundText(row+String(i+1).padStart(2,'0'),b.x,z+(row==='A'?2.05:-2.05),1.45,0.51,'#f9f2d9');
    }
  }
  for(let x=-17;x<12;x+=4.6) stripe(x,-12.4,1.8,0.16,'#e9d391');
  groundText('▲',16.2,-4.4,1.5,1.65,'#fff2bd');
  for (const z of [-2.4,-22.8,3.2]) {
    // Cast-iron gullies sit flush with the kerb.
    for (const x of [13.12,19.49]) {
      box(x,0.016,z,0.43,0.026,0.91,'#54686a');
      for(let i=-2;i<=2;i++) box(x,0.034,z+i*0.145,0.33,0.014,0.046,'#abb2a1');
    }
  }
  for (const x of [-18,6.7]) {
    const z=-13.52;
    stripe(x,z,1.04,0.13,'#eee0b8');
    for(const side of [-1,1]) box(x-0.27,0.028,z+side*0.14,0.56,0.035,0.13,'#eee0b8',-side*0.57);
  }

  function tree(x,z,size,color=C.hedge,kind='round') {
    contacts.push([x,0.084,z,3.55*size,3.1*size]);
    drum(x,0.75*size,z,0.52*size,1.5*size,0.52*size,'#966840');
    if(kind==='pine') {
      for(let i=0;i<3;i++) put('cone',x,(1.73+i*0.78)*size,z,(2.48-i*0.5)*size,1.95*size,(2.48-i*0.5)*size,i===1?'#75be83':color);
    } else {
      const tint=new THREE.Color(color);
      const leaf = v => '#'+tint.clone().multiplyScalar(v).getHexString();
      const yaw=x*2.73+z;
      for(const [dx,dy,dz,r,v] of [[0,2.22,0,2.38,0.83],[-0.65,2.55,-0.21,1.52,1.04],
        [0.64,2.86,0.15,1.71,0.98],[-0.17,3.35,0.02,1.73,1.13],[0,2.43,0.68,1.42,0.93]]) {
        put('facet',x+(dx*Math.cos(yaw)-dz*Math.sin(yaw))*size,dy*size,
          z+(dx*Math.sin(yaw)+dz*Math.cos(yaw))*size,r*size,r*1.05*size,r*size,leaf(v),yaw);
      }
      for (const side of [-1,1]) put('drum',x+side*0.26*size,1.48*size,z,
        0.23*size,1.15*size,0.23*size,'#946646',0,0,-side*0.54);
    }
  }
  function hedge(x,z,w,d) {
    contacts.push([x,0.084,z,w+2.2,d+1.7]);
    tile(x,0.18,z,w+0.23,0.34,d+0.23,'#e9d7b8');
    block(x,0.69,z,w,0.91,d,'#558661');
    for(let i=0;i<Math.floor(w/0.9);i++) {
      const xx=x-w/2+0.55+i*0.91;
      put('facet',xx,1.04,z,1.12,0.62+0.15*Math.cos(i*4),d*1.02,i%3?'#78a36b':'#8cb179',i);
    }
    solid(x,z,w,d);
  }
  hedge(-11.5,-3.1,18.8,1.06); hedge(7,-3.1,9.65,1.06);
  for(const x of [-1.6,0,1.6]) { drum(x,0.48,-3.2,0.26,0.96,0.26,C.lemon); solid(x,-3.2,0.3,0.3); }
  function lamp(x,z) {
    drum(x,0.17,z,0.63,0.34,0.63,C.dark);
    put('taper',x,0.58,z,0.34,0.67,0.34,C.dark);
    drum(x,2.10,z,0.15,2.95,0.15,C.dark);
    drum(x,2.98,z,0.21,0.14,0.21,'#cbac6a');
    put('taper',x,3.62,z,0.56,0.57,0.56,'#ffe8af',0,Math.PI);
    for(const side of [-1,1]) box(x+side*0.19,3.63,z+0.085,0.045,0.55,0.045,C.dark,0,0,-side*0.10);
    put('cone',x,4.02,z,0.83,0.33,0.83,C.dark);
    ball(x,4.21,z,0.15,0.18,0.15,'#c4a163');
  }
  function bench(x,z) {
    for(const dx of [-0.8,0.8]) box(x+dx,0.43,z,0.14,0.85,0.7,C.dark);
    for(const dx of [-0.8,0.8]) box(x+dx,0.86,z-0.39,0.11,0.96,0.13,C.dark);
    for(const dz of [-0.24,0,0.24]) block(x,0.82,z+dz,2.42,0.18,0.22,'#cf8d54');
    block(x,1.26,z-0.36,2.42,0.65,0.16,'#e4ac6d');
  }
  function parasol(x,z,col) {
    drum(x,1.34,z,0.11,2.6,0.11,C.wood);
    drum(x,1.01,z,1.28,0.15,1.28,C.cream);
    for(let i=0;i<8;i++) {
      put('parasol',x,2.64,z,1,1,1,i%2?C.cream:col,i*Math.PI/4);
    }
    for(const dx of [-1.08,1.08]) {
      drum(x+dx,0.28,z,0.24,0.56,0.24,C.dark);
      drum(x+dx,0.59,z,0.62,0.13,0.62,col);
    }
  }
  function gardenBox(x,y,z) {
    block(x,y+0.18,z,2.5,0.4,0.95,C.wood);
    for(let j=-1;j<=1;j++) {
      put('facet',x+j*0.73,y+0.51,z,0.89,0.69,0.81,'#649361',j);
      for(let k=0;k<2;k++) put('bud',x+j*0.71+k*0.21-0.1,y+0.83,z+Math.sin(j+k)*0.15,
        0.27,0.20,0.27,k?'#f5c778':'#d97066');
    }
  }
  function building(x,z,w,d,h,wall,accent,name,feature='vents') {
    const front=z+d/2;
    contacts.push([x,0.085,z,w*1.35,d*1.40]);
    footprints.push({x,z,w,d,color:wall});
    solid(x,z,w,d);
    tile(x,0.15,z,w+1.6,0.45,d+1.5,'#b1d481');
    tile(x,0.46,z,w+0.35,0.38,d+0.3,C.cream);
    block(x,0.55+h/2,z,w,h,d,wall);
    tile(x,2.64,z,w+0.1,0.18,d+0.13,C.cream);
    tile(x,h+0.5,z,w+0.46,0.38,d+0.47,C.cream);
    tile(x,h+0.72,z,w+0.2,0.18,d+0.21,feature==='garden'?'#556775':'#faf0db');
    const rows=h>7?2:1;
    const cols=Math.max(2,Math.floor(w/2.8));
    for(let j=0;j<rows;j++) for(let i=0;i<cols;i++) {
      const xx=x+((i+0.5)/cols-0.5)*w*0.87, yy=3.6+j*2.3;
      box(xx,yy,front-0.03,1.16,1.31,0.17,C.glass);
      box(xx-0.12,yy,front+0.073,0.07,1.3,0.045,C.cream);
      box(xx,yy+0.34,front+0.078,1.16,0.08,0.05,C.cream);
      block(xx,yy-0.66,front+0.075,1.48,0.15,0.32,C.white);
      if (name==='BLOOM' || name==='CAFÉ') {
        for(const side of [-1,1]) {
          box(xx+side*0.76,yy,front+0.06,0.29,1.28,0.11,'#628879');
          for (const offset of [-0.40,0,0.40]) box(xx+side*0.76,yy+offset,front+0.13,0.23,0.055,0.05,'#a1b6a1');
        }
      }
    }
    for(const s of [-1,1]) for(let i=-1;i<=1;i+=2) {
      box(x+s*(w/2-0.03),3.65,z+i*d*0.22,0.15,1.28,1.23,C.glass);
      box(x+s*w/2,2.98,z+i*d*0.22,0.3,0.14,1.4,C.cream);
    }
    block(x-w*0.24,1.53,front,1.55,2.02,0.18,C.cream);
    box(x-w*0.24,1.47,front+0.12,1.19,1.85,0.08,C.dark);
    block(x+w*0.16,1.35,front,w*0.42,1.35,0.21,C.cream);
    box(x+w*0.16,1.4,front+0.14,w*0.37,1.04,0.08,C.glass);
    for(let i=1;i<4;i++) box(x+w*0.16-w*0.185+i*w*0.0925,1.4,front+0.20,0.06,1.04,0.08,C.cream);
    if(name) {
      box(x-w*0.24+0.38,1.42,front+0.185,0.063,0.35,0.075,'#e1b269');
      for(let i=0;i<4;i++) {
        const xx=x+w*0.16+(i-1.5)*w*0.086;
        if(name==='BAKERY') {
          ball(xx,1.15,front+0.216,0.53,0.30,0.14,'#d99453');
          for(const dx of [-0.1,0.07]) box(xx+dx,1.2,front+0.29,0.04,0.13,0.025,C.cream,0,0,-0.35);
        } else if(name==='BLOOM') {
          put('taper',xx,1.11,front+0.2,0.29,0.35,0.22,'#b56d52',0,Math.PI);
          put('facet',xx,1.36,front+0.22,0.43,0.42,0.18,'#8bad76');
        }
      }
    }
    const aw=w*0.82;
    for(let i=0;i<9;i++) {
      const xx=x-aw/2+(i+0.5)*aw/9, col=i%2?C.white:accent;
      put('box',xx,2.46,front+0.49,aw/9+0.004,0.16,1.19,col,0,0.19);
      block(xx,2.28,front+1.05,aw/9,0.32,0.15,col);
    }
    if(name) {
      block(x,h-0.12,front+0.06,w*0.76,0.96,0.27,feature==='clinic'?'#376e70':accent);
      text(name,x,h-0.11,front+0.201,w*0.71,0.8,feature==='clinic'?'#fff9df':'#293f4b');
    }
    const roof=h+0.84;
    if(feature==='clinic') {
      for(const dx of [-3.75,3.75]) {
        block(x+dx,roof+0.28,z-1,1.42,0.56,1.48,'#d4d8d3');
        drum(x+dx,roof+0.58,z-1,0.81,0.09,0.81,C.dark);
      }
      tile(x,roof+0.16,z,3.7,0.34,3.7,C.cream);
      // A stepped sea-green lantern with an enamel cross on both visible faces.
      const towerZ=z+1.4;
      block(x,roof+1.09,towerZ,4.5,2.18,3.25,'#4b9088');
      tile(x,roof+2.16,towerZ,4.85,0.28,3.55,C.cream);
      block(x,roof+2.63,towerZ,3.68,0.85,2.72,'#71ad9b');
      tile(x,roof+3.08,towerZ,3.98,0.22,3.04,C.cream);
      block(x,roof+3.25,towerZ,0.78,0.26,2.35,'#df5b43');
      block(x,roof+3.26,towerZ,2.37,0.27,0.78,'#df5b43');
      for (const side of [-1,1]) {
        for (let i=0;i<3;i++) box(x+side*(1.28+i*0.29),roof+1.06,towerZ+1.61,0.13,1.76,0.19,C.cream);
        for (let j=0;j<3;j++) box(x+side*w*0.47,4.5,front-0.12-j*0.12,0.19,7.1-j*0.55,0.54,C.cream);
      }
      block(x,roof+1.15,towerZ+1.65,0.47,1.56,0.16,C.white);
      block(x,roof+1.15,towerZ+1.66,1.55,0.48,0.17,C.white);
    } else if(name==='BAKERY') {
      // Terracotta mansard, standing seams and two little cream dormers.
      put('mansard',x,roof+0.94,z,w+0.34,2.05,d+0.3,'#ba6149');
      tile(x,roof+2.01,z,w*0.74,0.21,d*0.74,'#d78762');
      for (const dx of [-2.1,1.5]) {
        block(x+dx,roof+1.06,front-0.48,1.46,1.43,1.2,'#ffe3b4');
        box(x+dx,roof+1.03,front+0.134,0.83,0.88,0.06,C.glass);
        box(x+dx,roof+1.03,front+0.18,0.08,0.88,0.08,C.cream);
        put('mansard',x+dx,roof+1.92,front-0.46,1.76,0.52,1.55,'#854f41');
      }
      for(let i=-3;i<=3;i++) box(x+i,roof+1.1,front-0.52,0.066,0.09,2.29,'#df946b',0,1.07);
      block(x+2.75,roof+2.42,z-1.91,0.9,1.55,0.92,'#ac6754');
      tile(x+2.75,roof+3.25,z-1.91,1.13,0.20,1.12,C.cream);
    } else if(name==='BLOOM') {
      // Glasshouse: sloping panes, pale mullions and a ridge cap.
      const width=5.95, depth=3.25, eave=roof+1.08, pitch=0.46;
      block(x,eave-0.57,z-0.65,width,1.12,depth,'#7da79c');
      for(const side of [-1,1]) {
        const zz=z-0.65+side*depth/4;
        box(x,eave+0.42,zz,width,0.14,1.87,side>0?'#91c6b8':'#75aba6',0,side*pitch);
        for(let i=-3;i<=3;i++) {
          box(x+i*0.93,eave+0.52,zz,0.09,0.10,1.88,'#f1d9b5',0,side*pitch);
          box(x+i*0.93,eave-0.52,z-0.65+side*1.63,0.09,1.08,0.09,'#f1d9b5');
        }
        box(x,eave,z-0.65+side*1.64,width+0.15,0.12,0.13,C.cream);
      }
      box(x,eave+0.92,z-0.65,width+0.18,0.13,0.14,C.cream);
      gardenBox(x-1.55,roof,front-1.16); gardenBox(x+1.55,roof,front-1.16);
    } else if(feature==='cup') {
      drum(x,roof+0.1,z,2.85,0.18,2.85,C.cream);
      drum(x,roof+0.85,z,2,1.52,2,'#fff3d7');
      drum(x,roof+1.63,z,1.67,0.06,1.67,'#854f3d');
      put('ring',x+1.03,roof+0.94,z,1.36,1.36,1,C.cream);
    } else if(feature==='tank') {
      for(const dx of [-0.6,0.6]) for(const dz of [-0.48,0.48]) box(x+dx,roof+0.49,z+dz,0.16,0.98,0.16,C.dark);
      drum(x,roof+1.49,z,2.23,1.68,2.23,C.wood);
      put('cone',x,roof+2.58,z,2.48,0.62,2.48,C.dark);
    } else if(feature==='garden') {
      gardenBox(x-0.6,roof,z-0.7); gardenBox(x+0.8,roof,z+0.72);
    } else {
      for(const dx of [-0.92,0.92]) {
        block(x+dx,roof+0.25,z,1.4,0.54,1.36,'#dedecf');
        drum(x+dx,roof+0.54,z,0.79,0.06,0.79,C.dark);
      }
    }
  }
  // The clinic and storefronts face the bays, keeping the parking aisle in sight.
  building(-17.2,-30.5,8.1,8.5,6.5,C.pink,'#eca6b0','BLOOM','garden');
  building(-5.9,-30.2,11.5,8.9,8.2,C.mint,'#69b8a5','小 镇 医 院','clinic');
  building(6,-30.8,8.2,8.35,6.6,C.lemon,'#efb25c','BAKERY','tank');
  building(-26.9,-31.3,6.3,7.4,8.4,C.lilac,'#a4b4e0','');
  building(-27.25,-16.4,6.1,7.75,5.4,'#efac82','#d88b62','CAFÉ','cup');
  building(-27.2,-3.55,6.2,7.8,6.3,C.mint,'#81bda4','POST','garden');
  building(-17.4,2.82,7.2,6.35,4.85,C.lemon,'#e7ac54','MARKET','vents');
  building(-44.4,-28,8.5,8,7.8,C.lemon,'#e0ad55','', 'tank');
  building(-44,-15,8.8,8.2,6.3,C.mint,'#83c5b3','','garden');
  building(-44,1.25,8,9,8.1,C.pink,'#dfa1b2','');
  const rearWalls=[C.lemon,C.mint,C.lilac,C.pink,'#e6a478'];
  for(let i=0;i<7;i++) building(-51+i*10.5,-53.2,7.8,7.4,5.8+(i%3)*1.2,rearWalls[i%5],C.lemon,'',['tank','garden','vents'][i%3]);
  for(let i=0;i<7;i++) building(-52+i*11.8,43.6,7.9,8.3,5+(i%3),rearWalls[(i+2)%5],C.mint,'',i%2?'vents':'garden');
  for(const [x,z] of [[-78,-31],[-78,-16],[-78,1],[62,-49],[62,-64]]) building(x,z,7.9,8.2,7.25,C.lemon,C.pink,'','tank');
  // Waterfront café square, picnic tables and clockwork street furniture.
  paving(-4.4,2.55,14.7,8.65,C.walk,2.55,2.2,0.075);
  parasol(-6,2.5,C.coral); parasol(-1.4,2.1,'#efbb57');
  // Fabric pennants are strung on the plaza side of the hedge, clear of the bays.
  for(const x of [-10.3,1.9]) {
    drum(x,0.24,-0.37,0.47,0.48,0.47,C.cream);
    drum(x,2.02,-0.37,0.13,3.74,0.13,'#6f604d');
    ball(x,3.94,-0.37,0.24,0.24,0.24,C.lemon);
  }
  const cordHeight = t => 3.82-0.67*Math.sin(Math.PI*t);
  for(let i=0;i<12;i++) {
    const t=i/12, h=cordHeight(t), next=cordHeight((i+1)/12), x=-10.3+(i+0.5)*12.2/12;
    box(x,(h+next)/2,-0.37,1.04,0.048,0.05,'#6f604d',0,0,Math.atan2(next-h,12.2/12));
    put('pennant',x,(h+next)/2-0.27,-0.36,0.55,0.63,1,
      [C.coral,'#f9d887','#70b1a4',C.cream][i%4],0,0,-Math.PI/2);
  }
  bench(-8.8,5.7); bench(23,-20.7); bench(23,-5.3); bench(-13.1,-23.4);
  for(const [x,z] of [[-20.4,-22.2],[10.6,-22.4],[-24.2,-8.8],[10.6,-1.9],[20.4,7.2],[20.7,-31.5],[-10.9,6.4],[-31.8,7.2],[-38.8,-36.4]]) lamp(x,z);
  for(const [x,z,s,c] of [
    [-21.6,-24.4,1.05,'#e7a3bb'],[0.6,-24.6,0.82,'#81bc71'],[11.25,-25,1.05,'#f0bb61'],
    [-22.85,-6.2,0.85,'#e6a5bd'],[-31,-10.1,0.91,'#a2cf73'],[-10.85,0,0.84,'#81bc71'],
    [10.1,4.95,1.04,'#eab86a'],[22.9,-13.2,1.1,'#e8a1b1'],[22.9,3.8,0.96,'#9bcb73'],
    [-31.1,3.6,1,'#eec172'],[-32,-24,1.1,'#80bd7c'],[-8.5,-36.8,1.05,'#edafc1'],
    [-20,15.6,1.1,'#8dc578'],[8.3,15.6,1,'#e4a7bb'],[-14,-37.3,1.12,'#a0c774']
  ]) { tree(x,z,s,c); solid(x,z,0.6,0.6); }
  for(const [x,z] of [[9.8,1.65],[-22,3.8],[23.8,-33],[-31.1,-35.2],[-44.4,-5.6],[-5.5,15.3],[-12.5,15.6],[23.1,36.7]]) tree(x,z,0.92,'#66b582','pine');
  for(const [x,z] of [[-20.6,-1.4],[5.7,-0.9],[-12.4,-24.5],[23.5,-8.8],[23.5,-17.8]]) gardenBox(x,0.12,z);
  function parkingSign(x,z) {
    drum(x,1.35,z,0.16,2.7,0.16,C.dark);
    block(x,2.7,z,1.42,1.55,0.26,C.cream);
    text('P',x,2.72,z+0.14,1.2,1.29,'#ffffff','#4b91a1');
  }
  parkingSign(12.04,-3.8); parkingSign(-20.6,-19.7);
  // Drink stand beside the promenade, with a striped canopy and a rooftop cone.
  tile(6.45,0.18,4.1,4.2,0.37,3.85,C.walk);
  block(6.45,1.27,4.1,3.65,2.0,2.85,'#82c7b7');
  box(6.45,1.48,5.53,2.9,0.86,0.12,C.glass);
  tile(6.45,1.12,5.75,3.4,0.18,0.7,C.cream);
  for(let i=0;i<7;i++) block(4.74+i*0.57,2.52,4.1,0.59,0.48,3.78,i%2?C.cream:C.coral);
  put('cone',6.45,3.03,4.1,1.1,1.18,1.1,'#dbab73',0,Math.PI);
  ball(6.45,3.75,4.1,1.37,1.27,1.37,'#edabc2');
  solid(6.45,4.1,3.65,2.85);
  for(const [x,z] of [[-14,6.2],[11.3,-1],[23.7,-11],[23.7,-22.5],[-20.9,-25]]) {
    tile(x,0.18,z,2.6,0.36,1.08,C.cream);
    block(x,0.42,z,2.45,0.43,1.0,'#81b678');
    for(let i=0;i<7;i++) {
      const xx=x-0.95+i*0.31, zz=z+Math.sin(i)*0.23, y=0.77+0.12*Math.sin(i*2);
      box(xx,y-0.08,zz,0.04,0.23,0.04,'#59754b');
      for(let k=0;k<4;k++) {
        const angle=k*Math.PI/2+i;
        put('bud',xx+Math.cos(angle)*0.10,y,zz+Math.sin(angle)*0.10,
          0.20,0.12,0.19,i%2?'#ffe5a3':'#ee9d90',angle);
      }
      put('bud',xx,y+0.045,zz,0.13,0.12,0.13,'#e6a447');
    }
  }
  // Quay, striped harbour light, mooring piers and working buoys.
  for(let i=0;i<12;i++) {
    const z=-37+i*4.4;
    drum(26.4,0.34,z,0.35,0.67,0.35,C.dark);
    drum(26.4,0.67,z,0.49,0.12,0.49,C.cream);
    if(i<11 && i!==5 && i!==9) {
      box(26.4,0.58,z+2.2,0.09,0.09,4.4,'#827965');
      if(i%3===0) put('ring',26.48,0.64,z+1.0,0.83,0.83,0.83,C.coral,Math.PI/2);
    }
  }
  function dock(x,z,n) {
    for(let i=0;i<n;i++) tile(x+i*0.65,-0.37,z,0.61,0.34,2.62,'#d7a16e');
    for(const i of [0,n-1]) for(const s of [-1,1]) drum(x+i*0.65,-0.38,z+s*1.11,0.35,1.6,0.35,C.wood);
  }
  dock(26,-12,10); dock(26,4,7);
  drum(23.4,0.3,-27.7,4.7,0.55,4.7,'#cdc3ae');
  for(let i=0;i<4;i++) put('taper',23.4,1.15+i*1.14,-27.7,2.85-i*0.31,1.28,2.85-i*0.31,i%2?C.coral:C.cream);
  drum(23.4,5.35,-27.7,2.26,0.25,2.26,C.dark);
  drum(23.4,6,-27.7,1.62,1.2,1.62,'#ffdc88');
  for(const s of [-1,1]) box(23.4+s*0.63,6,-27.2,0.14,1.27,0.14,C.dark);
  put('cone',23.4,6.95,-27.7,2.48,0.82,2.48,C.coral);
  solid(23.4,-27.7,3.1,3.1);
  for (let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    drum(23.4+Math.sin(a)*1.12,5.65,-27.7+Math.cos(a)*1.12,0.075,0.6,0.075,C.dark);
  }
  put('rail',23.4,5.95,-27.7,2.34,2.34,2.34,C.dark,0,Math.PI/2);
  drum(23.4,7.62,-27.7,0.09,0.71,0.09,C.dark);
  put('pennant',24.05,7.76,-27.7,1.23,0.45,1,C.coral);
  for(const [x,z] of [[33,-26],[40,-4],[37,12],[45,-36],[33,31]]) {
    drum(x,-0.94,z,0.93,0.43,0.93,C.coral); put('cone',x,-0.53,z,0.58,0.72,0.58,C.white);
  }
  addContactShadows(scene, contacts);
  kit.bake(scene);

  const gulls=[];
  for(const [x,y,z] of [[33.1,4.8,-8.3],[36.3,5.5,-5.8],[31.4,4.2,-3.8]]) {
    const group=new THREE.Group(), bird=new ClayKit();
    bird.add('ball',0,0,0,0.33,0.26,0.75,C.white);
    bird.add('cone',0,0.045,0.42,0.17,0.28,0.15,C.lemon,0,Math.PI/2);
    for(const sign of [-1,1]) {
      bird.add('block',sign*0.43,0.08,0,0.78,0.12,0.25,C.white,sign*0.14,0,sign*0.23);
      bird.add('block',sign*0.88,0.12,-0.09,0.29,0.09,0.17,C.dark,sign*0.32,0,-sign*0.12);
    }
    bird.bake(group); group.position.set(x,y,z); scene.add(group); gulls.push({group,x,y,z});
  }
  const boats=[];
  function boat(x,z,yaw,color) {
    const group=new THREE.Group(), hull=new ClayKit();
    hull.add('block',0,0,0,1.8,0.69,4.05,color);
    hull.add('tile',0,0.35,0,1.74,0.22,3.89,C.white);
    hull.add('block',0,0.68,-0.25,1.26,0.63,1.79,C.glass);
    hull.add('tile',0,1.02,-0.25,1.42,0.2,1.93,C.cream);
    hull.add('block',0,0.53,1.19,1.05,0.14,0.45,C.wood);
    hull.bake(group); group.position.set(x,-0.94,z); group.rotation.y=yaw;
    scene.add(group); boats.push(group);
  }
  boat(31,-9.15,0.12,C.coral); boat(38,-18.4,-0.72,'#5996bc'); boat(32.5,8.7,0.7,C.lemon);
  // Cut each sail as a slightly bellied panel. Colour bands follow its taper.
  const yacht = new THREE.Group(), fittings = new ClayKit();
  fittings.add('block',0,0,0,1.84,0.74,4.65,'#235963');
  fittings.add('tile',0,0.38,0,1.78,0.18,4.54,C.cream);
  fittings.add('drum',0,2.92,0.48,0.10,5.1,0.10,'#926e48');
  fittings.add('pennant',0.38,5.38,0.48,0.74,0.29,1,C.coral);
  fittings.bake(yacht);
  const sailPos=[], sailColors=[];
  function sail(z0,foot,height,bands) {
    const point=(u,v)=>[0.06+Math.sin(Math.PI*u)*0.24*(1-v),0.84+height*v,z0+foot*u*(1-v)];
    bands.forEach((color,i)=>{
      const c=new THREE.Color(color), v=i/bands.length, v1=(i+1)/bands.length;
      for(const u of [0,0.5]) {
        for(const p of [point(u,v),point(u+0.5,v),point(u,v1),point(u,v1),point(u+0.5,v),point(u+0.5,v1)]) {
          sailPos.push(...p); sailColors.push(c.r,c.g,c.b);
        }
      }
    });
  }
  sail(0.42,-2.5,4.35,[C.cream,C.coral,C.cream,C.cream]);
  sail(0.62,1.73,3.44,[C.cream,'#edc27f',C.cream]);
  const cloth=new THREE.BufferGeometry();
  cloth.setAttribute('position',new THREE.Float32BufferAttribute(sailPos,3));
  cloth.setAttribute('color',new THREE.Float32BufferAttribute(sailColors,3));
  cloth.computeVertexNormals();
  const sails=new THREE.Mesh(cloth,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide}));
  sails.castShadow=true; yacht.add(sails);
  yacht.position.set(31.9,-0.94,-16.7); yacht.rotation.y=-0.72;
  scene.add(yacht); boats.push(yacht);
  const people=[];
  function pedestrian(x,z,color,range) {
    const p=new ClayKit(), group=new THREE.Group();
    for(const dx of [-0.15,0.15]) p.add('block',dx,0.26,0,0.21,0.49,0.27,C.dark);
    p.add('block',0,0.79,0,0.69,0.66,0.42,color);
    p.add('ball',0,1.34,0,0.53,0.6,0.53,'#dba278');
    p.add('ball',0,1.52,-0.025,0.59,0.39,0.56,'#63473b');
    p.bake(group); scene.add(group); people.push({group,x,z,range});
  }
  pedestrian(-4.9,-23.7,C.coral,2); pedestrian(22.1,-2,C.lemon,1.5);
  pedestrian(-9.55,4.1,C.mint,1.3); pedestrian(-26.2,-10.2,C.lilac,1.05);
  const parked=[
    ['ambulance','A',4],['florist-pickup','A',1],['truck-flat','A',9],
    ['suv','B',1],['truck','B',2],['surf-camper','B',4],['bread-van','B',6],['taxi','B',7],['sedan-sports','B',9],
  ].map(([model,bay,i])=>({model,bay,i,...bayCenters(bay,i)}));
  const start={x:16.25,z:-1.6,heading:Math.PI};
  let elapsed=0;
  return {start,bayCenters,parked,colliders,footprints,bounds:{x:[-58,25.8],z:[-60,48]},
    update(dt) {
      elapsed+=dt;
      animateWater(elapsed);
      gulls.forEach(({group,x,y,z},i)=>{
        const phase=elapsed*0.38+i*0.7;
        group.position.set(x+Math.sin(phase)*2.4,y+Math.cos(phase)*0.35,z+Math.cos(phase)*1.8);
        group.rotation.set(0,phase+Math.PI/2,0.08*Math.cos(phase));
      });
      boats.forEach((b,i)=>{ b.position.y=-0.94+Math.sin(elapsed*1.65+i)*0.071; b.rotation.z=Math.sin(elapsed+i)*0.039; });
      people.forEach(({group,x,z,range},i)=>{
        const phase=elapsed*0.31+i*1.7;
        group.position.set(x+Math.sin(phase)*range,0.085+Math.abs(Math.sin(elapsed*4+i))*0.034,z);
        group.rotation.y=Math.cos(phase)>0?Math.PI/2:-Math.PI/2;
      });
    }
  };
}
