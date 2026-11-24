import * as THREE from 'three';
import { ClayKit, lettering } from './clay.js';

function mapPainter(world) {
  const canvas = document.getElementById('map');
  const ctx = canvas.getContext('2d');
  const base = document.createElement('canvas');
  base.width = 500; base.height = 470;
  const bg = base.getContext('2d');
  const scale = 3.35;
  const px = x => (x+78)*scale;
  const py = z => (z+72)*scale;
  function rect(x,z,w,d,color) {
    bg.fillStyle=color; bg.fillRect(px(x-w/2),py(z-d/2),w*scale,d*scale);
  }
  bg.fillStyle='#85cdd9'; bg.fillRect(0,0,base.width,base.height);
  rect(-16,-22,87,79,'#bbd991'); rect(-16,53,90,50,'#bbd991');
  for(const [x,z,w,d] of [[16.3,-16,7.2,89],[-36,-16,6.5,89],[-16,11.4,85,6.4],[-16,-43,85,6.4],[-16,32.6,85,8]]) rect(x,z,w,d,'#faf1d7');
  rect(-3,-12.4,38,17.4,'#abb7bc');
  rect(23.6,-12.4,7,48,'#eadfc4');
  for(const f of world.footprints) { rect(f.x,f.z,f.w+0.8,f.d+0.8,'#ecedd4'); rect(f.x,f.z,f.w,f.d,f.color); }
  for(const row of ['A','B']) for(let i=0;i<10;i++) {
    const b=world.bayCenters(row,i); rect(b.x-1.57,b.z,0.27,5.4,'#fff4d8');
  }
  for(const p of world.parked) rect(p.x,p.z,1.7,3.45,'#647785');
  return (car,target) => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const left=THREE.MathUtils.clamp(px(-47), px(car.pos.x)-canvas.width+40, px(car.pos.x)-40);
    const top=THREE.MathUtils.clamp(py(-39), py(car.pos.z)-canvas.height+32, py(car.pos.z)-32);
    ctx.save();
    ctx.translate(-left,-top);
    ctx.drawImage(base,0,0);
    ctx.save(); ctx.translate(px(target.x),py(target.z));
    ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fillStyle='#ffcf40'; ctx.fill();
    ctx.strokeStyle='#43382c'; ctx.lineWidth=3; ctx.stroke(); ctx.fillStyle='#4a4035';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText('P',0,4);ctx.restore();
    ctx.save();ctx.translate(px(car.pos.x),py(car.pos.z));ctx.rotate(-car.heading);
    ctx.beginPath();ctx.moveTo(0,11);ctx.lineTo(7,-7);ctx.lineTo(0,-4);ctx.lineTo(-7,-7);ctx.closePath();
    ctx.fillStyle='#fc7654';ctx.strokeStyle='#3d3430';ctx.lineWidth=3;ctx.stroke();ctx.fill();ctx.restore();ctx.restore();
  };
}

export function createMission(scene,world,camera) {
  const read = id => document.getElementById(id);
  const label=read('mission-label'), objective=read('objective'), tip=read('tip'), next=read('next');
  const distance=read('distance'), clock=read('clock'), points=read('points');
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const drawMap=mapPainter(world);
  const bays=[['A',2],['B',3],['A',8],['B',5],['A',0],['B',8]];
  const marker=new THREE.Group(), base=new ClayKit();
  const yellow='#ffca46';
  base.add('tile',0,0.054,0,2.96,0.042,5.42,'#c29b49');
  for(const s of [-1,1]) {
    base.add('box',s*1.41,0.085,0,0.19,0.036,5.35,yellow);
    base.add('box',0,0.085,s*2.61,2.88,0.038,0.14,yellow);
  }
  for(const side of [-1,1]) {
    for(const end of [-1,1]) {
      base.add('box',side*1.36,0.111,end*2.23,0.22,0.04,0.81,'#fff2c3');
      base.add('box',side*1.08,0.111,end*2.56,0.76,0.04,0.18,'#fff2c3');
    }
  }
  base.bake(marker);
  lettering(marker,'P',0,0.1,0,1.9,2.0,'#fff8d3',null,true);
  scene.add(marker);
  // A billboard above the back of the stall is legible from all three cameras.
  const pin=new THREE.Group(), disc=new ClayKit();
  disc.add('drum',0,0,0,1.88,0.22,1.88,'#694f31',0,Math.PI/2);
  disc.add('drum',0,0,0.1,1.62,0.16,1.62,yellow,0,Math.PI/2);
  disc.add('cone',0,-0.91,0,0.54,0.64,0.23,'#ffcb38',0,Math.PI);
  disc.bake(pin); lettering(pin,'P',0,0,0.19,1.25,1.3,'#493c2d');
  marker.add(pin);
  const confetti=new THREE.InstancedMesh(new THREE.BoxGeometry(0.13,0.28,0.045),
    new THREE.MeshBasicMaterial(),24);
  const piece=new THREE.Object3D();
  for(let i=0;i<confetti.count;i++) confetti.setColorAt(i,new THREE.Color([0xffcb59,0xffedd0,0x64baac,0xeb8266][i%4]));
  confetti.frustumCulled=false;
  confetti.visible=false;
  scene.add(confetti);
  let burstTime=0;
  let index=0, score=0, elapsed=0, held=0, startedAt=null, done=false, target, phase=0;
  function begin() {
    const [row,i]=bays[index];
    target=world.bayCenters(row,i);
    marker.position.set(target.x,0,target.z);
    pin.position.z=row==='A'?-2.2:2.2;
    marker.visible=true; elapsed=held=0; done=false; startedAt=null;
    confetti.visible=false;
    next.hidden=true; label.textContent='泊车任务';
    objective.textContent='驶入 '+row+String(i+1).padStart(2,'0')+' 车位';
    tip.textContent='沿车道驶向黄色标记';
  }
  next.addEventListener('click',()=>{index=(index+1)%bays.length;begin();next.blur();});
  begin();
  function update(dt,car) {
    phase+=dt; pin.position.y=2.75+Math.sin(phase*2.5)*0.12; pin.quaternion.copy(camera.quaternion);
    const dx=car.pos.x-target.x, dz=car.pos.z-target.z;
    const meters=Math.hypot(dx,dz);
    distance.textContent=Math.round(meters);
    if(!done) {
      if(startedAt===null && Math.abs(car.speed)>0.15) startedAt=performance.now();
      if(startedAt!==null) elapsed=(performance.now()-startedAt)/1000;
      const aligned=Math.abs(Math.cos(car.heading))>0.975;
      const centered=Math.abs(dx)<0.61 && Math.abs(dz)<0.94;
      held=centered && aligned && Math.abs(car.speed)<0.13 ? held+dt : 0;
      tip.textContent=meters<3 ? (aligned?'踩住手刹，停稳车辆':'调整方向，与车位平行') : '沿车道驶向黄色标记';
      if(held>=0.65) {
        done=true; score+=100; points.textContent=score;
        label.textContent='泊车完成'; objective.textContent='精准入位！'; next.hidden=false; marker.visible=false;
        confetti.position.set(target.x,0,target.z);
        confetti.visible=!reducedMotion.matches; burstTime=0;
      }
    }
    if(confetti.visible) {
      burstTime+=dt;
      confetti.visible=burstTime<1.2;
      for(let i=0;i<confetti.count;i++) {
        const angle=i*2.40, radius=0.7+burstTime*(1.2+(i%5)*0.29);
        piece.position.set(Math.cos(angle)*radius,1.9+burstTime*(4.2+i%4*0.48)-4*burstTime*burstTime,Math.sin(angle)*radius);
        piece.rotation.set(i+burstTime*4,angle,burstTime*3-i);
        piece.scale.setScalar(Math.min(1,Math.max(0,(1.2-burstTime)*3)));
        piece.updateMatrix(); confetti.setMatrixAt(i,piece.matrix);
      }
      confetti.instanceMatrix.needsUpdate=true;
    }
    const sec=Math.floor(elapsed);
    clock.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
    drawMap(car,target);
  }
  return { update, retry:begin };
}
