import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildWorld } from './world.js';
import { createMission } from './mission.js';
import { ClayKit, lettering } from './clay.js';
import { Puffs, blobShadow, softDotTexture } from './fx.js';

/* ------------------------------------------------------------------ *
 *  小镇医院停车场 · 低模卡通风原型
 *  - 场景（建筑 / 地面 / 标线 / 道具 / 天空）在 src/world.js
 *  - 这里负责：渲染器、灯光、车辆、街机物理、相机、HUD
 * ------------------------------------------------------------------ */

const canvas = document.getElementById('scene');
const speedEl = document.getElementById('speed');
const gearEl = document.getElementById('gear');
const loadingEl = document.getElementById('loading');
const errEl = document.getElementById('err');


/* ----------------------------- 渲染器 ----------------------------- */

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NoToneMapping; // 卡通配色要保住饱和度

const scene = new THREE.Scene();
const sky = new THREE.Color('#d8e1c9');
scene.background = sky;
scene.fog = new THREE.Fog(sky, 83, 195);
const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.1, 360);
scene.add(new THREE.HemisphereLight(0xfff1da, 0xc3d9da, 1.50));

const sun = new THREE.DirectionalLight(0xffe6bd, 2.34);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 220;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 2.1;
scene.add(sun, sun.target);

const SUN_OFFSET = new THREE.Vector3(-39, 48, 22);

// Cool fill keeps the shaded sides of the pastel buildings readable.
const fill = new THREE.DirectionalLight(0xbcdff5, 0.47);
fill.position.set(32, 24, -35);
scene.add(fill);

/* ------------------------------ 场景 ------------------------------ */

const world = buildWorld(scene);
const mission = createMission(scene, world, camera);

/* ------------------------------ 粒子 ------------------------------ */

const blobTex = softDotTexture(96);

const puffs = new Puffs(scene, { count: 110 });

/* ------------------------------ 车辆 ------------------------------ */

const WHEELBASE = 2.18;
const WHEEL_RADIUS = 0.43;

const carGroup = new THREE.Group();
const playerLabel = new THREE.Group();
const tag = new ClayKit();
tag.add('block',0,0,0,1.82,0.69,0.16,'#344957');
tag.add('cone',0,-0.43,0,0.37,0.28,0.1,'#344957',0,Math.PI);
tag.bake(playerLabel);
lettering(playerLabel,'玩家',0,0.015,0.084,1.48,0.54,'#fff4c9');
scene.add(playerLabel);
scene.add(carGroup);

// 车底接触阴影（补足实时阴影在软接触处缺失的暗部）
const carShadow = blobShadow(blobTex, 2.8, 4.8, 0.3);
carShadow.rotation.x = -Math.PI / 2;
carShadow.position.y = 0.04;
carGroup.add(carShadow);

const car = {
  pos: new THREE.Vector3(world.start.x, 0, world.start.z),
  heading: world.start.heading,
  speed: 0,
  steer: 0,
  wheelSpin: 0,
  ready: false,
};

const wheels = { front: [], back: [] };
let brakeLens;
const loader = new GLTFLoader();
const loadGLB = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));

// Kenney's Car Kit samples a shared colour atlas. Shade the glass swatch
// locally and keep the original models, wheel nodes and UVs intact.
function finishBody(material) {
  const finish = material.clone();
  finish.roughness = 0.58;
  finish.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vPanel;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nvPanel = position;'
    );
    shader.fragmentShader = 'varying vec3 vPanel;\n' + shader.fragmentShader.replace(
      '#include <map_fragment>', `#include <map_fragment>
        if (abs(vMapUv.x - 0.09375) < 0.025 && vMapUv.y > 0.75) {
          float band = vPanel.x + vPanel.z * 0.61 + vPanel.y * 0.43;
          float streak = 1.0-smoothstep(0.10,0.135,abs(band-0.37));
          streak += 0.60*(1.0-smoothstep(0.017,0.032,abs(band-0.56)));
          diffuseColor.rgb = mix(vec3(0.045,0.16,0.19),vec3(0.26,0.49,0.53),smoothstep(0.63,1.16,vPanel.y));
          diffuseColor.rgb += vec3(0.10,0.14,0.14)*streak;
        }`
    );
  };
  return finish;
}

function prepareModel(gltf) {
  const model = gltf.scene;
  if (!model.userData.worldMetres) model.scale.set(1.65, 1.65 * 0.88, 1.65);
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = false;
    if (o.name === 'body' && o.material.map) o.material = finishBody(o.material);
  });
  return model;
}

try {
  const [playerGltf, ...parkedGltfs] = await Promise.all([
    loadGLB('./assets/vehicles/bay-coupe.glb'),
    ...world.parked.map((p) => loadGLB(`./assets/vehicles/${p.model}.glb`)),
  ]);

  const player = prepareModel(playerGltf);
  brakeLens = player.getObjectByName('brake-lights').material;
  player.traverse((o) => {
    if (!/^wheel-/.test(o.name)) return;
    o.rotation.order = 'YXZ';
    (o.name.includes('front') ? wheels.front : wheels.back).push(o);
  });
  carGroup.add(player);
  carGroup.position.copy(car.pos);
  carGroup.rotation.y = car.heading;

  // 已经停好的车
  world.parked.forEach((p, i) => {
    const model = prepareModel(parkedGltfs[i]);
    model.position.set(p.x, 0, p.z);
    model.rotation.y = p.heading;
    scene.add(model);
    if (model.userData.worldMetres) {
      const {min,max}=new THREE.Box3().setFromObject(model);
      world.colliders.push({x0:min.x,x1:max.x,z0:min.z,z1:max.z});
    } else {
      world.colliders.push({x0:p.x-0.735,x1:p.x+0.735,z0:p.z-1.675,z1:p.z+1.675});
    }

    const shadow = blobShadow(blobTex, 2.8, 4.8, 0.26);
    shadow.rotation.order = 'YXZ';
    shadow.rotation.y = p.heading;
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(p.x, 0.04, p.z);
    scene.add(shadow);
  });

  car.ready = true;
  loadingEl.classList.add('hidden');
} catch (e) {
  console.error(e);
  errEl.textContent = '模型加载失败：' + (e?.message || e);
  loadingEl.querySelector('.spinner').style.display = 'none';
}

/* ------------------------------ 输入 ------------------------------ */

const keys = Object.create(null);
let cameraMode = 'town';
const modes = ['town','chase','top'];
const cameraButton = document.getElementById('camera-btn');
function setMode(mode) {
  cameraMode = mode;
  camSnap = true;
  camera.fov = mode === 'chase' ? 54 : mode === 'top' ? 46 : 36;
  camera.updateProjectionMatrix();
  const names = {town:'街区',chase:'跟车',top:'俯视'};
  cameraButton.title = '当前为' + (names[mode] || '自由') + '视角 · 切换 (C)';
}
function cycleCamera() { setMode(modes[(modes.indexOf(cameraMode)+1)%modes.length]); }
const help = document.getElementById('guide'), helpButton=document.getElementById('help-btn');
function showGuide(open) {
  help.hidden = !open;
  helpButton.setAttribute('aria-expanded', String(open));
}
helpButton.onclick = () => showGuide(help.hidden);
document.getElementById('close-guide').onclick = () => showGuide(false);
cameraButton.onclick = cycleCamera;
document.getElementById('retry-btn').onclick = resetCar;
for(const button of document.querySelectorAll('[data-key]')) {
  button.onpointerdown = e => { e.preventDefault(); button.setPointerCapture(e.pointerId); keys[button.dataset.key]=true; };
  button.onlostpointercapture = () => { keys[button.dataset.key]=false; };
}
window.addEventListener('keydown', (e) => {
  if(e.code==='Escape') showGuide(false);
  if(e.code==='Space' && document.activeElement?.tagName==='BUTTON' && !document.activeElement.dataset.key) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (!e.repeat && e.code === 'KeyC') cycleCamera();
  if (!e.repeat && e.code === 'KeyR') resetCar();
});
document.querySelectorAll('button').forEach(b => b.addEventListener('pointerup',()=>b.blur()));
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

function resetCar() {
  car.pos.set(world.start.x, 0, world.start.z);
  car.heading = world.start.heading;
  car.speed = 0;
  car.steer = 0;
  car.wheelSpin = 0;
  mission.retry();
  camSnap = true;
}

/* ------------------------------ 物理 ------------------------------ */

const MAX_SPEED = 22;
const MAX_REVERSE = 7;
const ACCEL = 8.5;
const BRAKE = 17;
const REVERSE_ACCEL = 5.5;
const HANDBRAKE = 26;
const CAR_RADIUS = 1.15;

function approach(current, target, delta) {
  if (current < target) return Math.min(current + delta, target);
  if (current > target) return Math.max(current - delta, target);
  return current;
}

function collide() {
  for (const c of world.colliders) {
    const x0 = c.x0 - CAR_RADIUS;
    const x1 = c.x1 + CAR_RADIUS;
    const z0 = c.z0 - CAR_RADIUS;
    const z1 = c.z1 + CAR_RADIUS;
    if (car.pos.x <= x0 || car.pos.x >= x1 || car.pos.z <= z0 || car.pos.z >= z1) continue;

    const dxL = car.pos.x - x0;
    const dxR = x1 - car.pos.x;
    const dzL = car.pos.z - z0;
    const dzR = z1 - car.pos.z;
    const m = Math.min(dxL, dxR, dzL, dzR);

    if (m === dxL) car.pos.x = x0;
    else if (m === dxR) car.pos.x = x1;
    else if (m === dzL) car.pos.z = z0;
    else car.pos.z = z1;

    car.speed *= 0.3;
  }

  const b = world.bounds;
  car.pos.x = THREE.MathUtils.clamp(car.pos.x, b.x[0], b.x[1]);
  car.pos.z = THREE.MathUtils.clamp(car.pos.z, b.z[0], b.z[1]);
}

function updateVehicle(dt) {
  const forward = keys.KeyW || keys.ArrowUp;
  const backward = keys.KeyS || keys.ArrowDown;
  const left = keys.KeyA || keys.ArrowLeft;
  const right = keys.KeyD || keys.ArrowRight;
  const handbrake = keys.Space;
  brakeLens.emissiveIntensity = handbrake || (backward && car.speed>0) || (forward && car.speed<0) ? 1.3 : 0.03;

  if (handbrake) {
    car.speed = approach(car.speed, 0, HANDBRAKE * dt);
  } else if (forward) {
    car.speed += (car.speed < 0 ? BRAKE : ACCEL) * dt;
  } else if (backward) {
    car.speed -= (car.speed > 0 ? BRAKE : REVERSE_ACCEL) * dt;
  } else {
    car.speed = approach(car.speed, 0, (1.2 + Math.abs(car.speed) * 0.1) * dt);
  }
  car.speed = THREE.MathUtils.clamp(car.speed, -MAX_REVERSE, MAX_SPEED);

  const input = (left ? 1 : 0) - (right ? 1 : 0);
  const speedRatio = THREE.MathUtils.clamp(Math.abs(car.speed) / 20, 0, 1);
  const maxSteer = THREE.MathUtils.lerp(0.62, 0.2, speedRatio);
  car.steer = THREE.MathUtils.damp(car.steer, input * maxSteer, 9, dt);

  car.heading += (car.speed / WHEELBASE) * Math.tan(car.steer) * dt;

  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;
  collide();

  carGroup.position.copy(car.pos);
  carGroup.rotation.y = car.heading;

  car.wheelSpin += (car.speed / WHEEL_RADIUS) * dt;
  for (const w of wheels.front) {
    w.rotation.y = car.steer;
    w.rotation.x = car.wheelSpin;
  }
  for (const w of wheels.back) w.rotation.x = car.wheelSpin;

  // 粒子：踩油门冒尾气，手刹拖出扬尘
  if ((forward || backward) && Math.abs(car.speed) > 0.8 && Math.random() < dt * 18) {
    puffs.exhaust(car.pos.x, 0, car.pos.z, car.heading);
  }
  if (handbrake && Math.abs(car.speed) > 3 && Math.random() < dt * 60) {
    puffs.dust(car.pos.x, car.pos.z, car.heading);
  }
}

/* ------------------------------ 相机 ------------------------------ */

const camGoal = new THREE.Vector3();
const camLook = new THREE.Vector3();
const camTarget = new THREE.Vector3();
const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
let camSnap = true;

function updateCamera(dt) {
  if (cameraMode === 'free') return;

  const smooth = camSnap ? 1 : 1 - Math.exp(-6 * dt);
  camSnap = false;

  if (cameraMode === 'town') {
    // Bias the view towards the clinic and both parking rows on approach.
    const wide = THREE.MathUtils.smoothstep(camera.aspect,0.64,1.42);
    camLook.copy(car.pos);
    camLook.x -= THREE.MathUtils.clamp(car.pos.x-1,-15,15)*0.80;
    camLook.z -= THREE.MathUtils.clamp(car.pos.z+15,-14,14)*(0.68+0.22*wide);
    // In portrait the entrance and target lie along the long axis of the screen.
    const azimuth = THREE.MathUtils.lerp(1.04,0.31,wide);
    const sin = Math.sin(azimuth), cos = Math.cos(azimuth);
    const lateral = (camLook.x-car.pos.x)*cos-(camLook.z-car.pos.z)*sin;
    const margin = camera.aspect*12;
    const correction = THREE.MathUtils.clamp(lateral,-margin,margin)-lateral;
    camLook.x += correction*cos;
    camLook.z -= correction*sin;
    tmp.set(55.7*sin,48,55.7*cos);
    camGoal.copy(camLook).add(tmp);
    camTarget.lerp(camGoal,smooth);
    camera.position.copy(camTarget);
    camera.lookAt(camGoal.copy(camTarget).sub(tmp));
    return;
  }

  if (cameraMode === 'top') {
    camGoal.set(car.pos.x, 18, car.pos.z + 0.001);
    camTarget.lerp(camGoal, smooth);
    camera.position.copy(camTarget);
    camera.lookAt(car.pos.x, 0, car.pos.z);
    return;
  }

  tmp.set(0, 3.9, -8.6).applyAxisAngle(UP, car.heading);
  camGoal.copy(car.pos).add(tmp);
  camTarget.lerp(camGoal, smooth);
  camera.position.copy(camTarget);

  camLook.set(0, 1.1, 6.0).applyAxisAngle(UP, car.heading).add(car.pos);
  camera.lookAt(camLook);
}

/* ------------------------------ 主循环 ------------------------------ */

let lastTime = performance.now();

function tick(now) {
  const dt = Math.min((now - lastTime) / 1000, 1 / 20);
  lastTime = now;

  if (car.ready) updateVehicle(dt);
  updateCamera(dt);

  sun.position.copy(car.pos).add(SUN_OFFSET);
  sun.target.position.copy(car.pos);
  sun.target.updateMatrixWorld();

  const speedKmh = Math.round(Math.abs(car.speed) * 3.6);
  if (speedEl.textContent !== String(speedKmh)) {
    speedEl.textContent = speedKmh;
  }
  gearEl.textContent = car.speed < -0.3 ? 'R' : car.speed > 0.3 ? 'D' : 'N';
  playerLabel.position.copy(car.pos);
  playerLabel.position.y=3.05;
  playerLabel.quaternion.copy(camera.quaternion);
  playerLabel.visible=cameraMode==='town';
  mission.update(dt,car);


  puffs.update(dt);
  world.update?.(dt);

  renderer.render(scene,camera);
}

renderer.setAnimationLoop(tick);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

});

// 调试 / 截图钩子
window.__sim = {
  THREE,
  car, carGroup, camera, scene, renderer, wheels, world, keys,
  setMode,
  /** 不渲染、按时长步进物理，方便自动化测试 */
  step: (seconds, dt = 1 / 60) => {
    for (let t = 0; t < seconds; t += dt) updateVehicle(dt);
  },
  /** 自由视角：view([x,y,z],[tx,ty,tz]) */
  view: (pos, look) => {
    cameraMode = 'free';
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(look[0], look[1], look[2]);
  },
  /** 把车传送到指定位置（调试用） */
  place: (x, z, heading = 0) => {
    car.pos.set(x, 0, z);
    car.heading = heading;
    car.speed = 0;
    camSnap = true;
  },
};
