import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 *  粒子与光影小工具
 *  - softDotTexture(): 一张柔光圆点贴图
 *  - Motes: 空气中缓慢漂浮的浮尘/花粉
 *  - Puffs: 可发射的烟团（尾气、刹车扬尘）
 *  - blobShadow(): 贴地椭圆接触阴影
 * ------------------------------------------------------------------ */

/** 柔光圆点 */
export function softDotTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.62)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 贴地椭圆阴影（不写深度，叠在地面上） */
export function blobShadow(map, w, d, opacity = 0.32) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({
      map, transparent: true, opacity, depthWrite: false, color: 0x1b2430,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  return m;
}

const VERT = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    if (t.a * vAlpha < 0.01) discard;
    gl_FragColor = vec4(uColor, t.a * vAlpha);
  }
`;

const dot = softDotTexture();

/** 通用点精灵粒子池 */
class PointPool {
  constructor(scene, { count, color = 0xffffff, size = 1, opacity = 1, blending = THREE.NormalBlending }) {
    this.count = count;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    this.alpha = new Float32Array(count);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);
    this.baseAlpha = new Float32Array(count);
    this.next = 0;

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    this.uniforms = {
      uMap: { value: dot },
      uColor: { value: new THREE.Color(color) },
    };

    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending,
      opacity,
    }));
    this.points.frustumCulled = false;
    this.geometry = g;
    scene.add(this.points);
  }

  spawn(x, y, z, { vx = 0, vy = 0, vz = 0, size = 1, life = 1, alpha = 0.6 } = {}) {
    const i = this.next;
    this.next = (this.next + 1) % this.count;
    const i3 = i * 3;
    this.pos[i3] = x;
    this.pos[i3 + 1] = y;
    this.pos[i3 + 2] = z;
    this.vel[i3] = vx;
    this.vel[i3 + 1] = vy;
    this.vel[i3 + 2] = vz;
    this.size[i] = size;
    this.alpha[i] = alpha;
    this.baseAlpha[i] = alpha;
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  update(dt, { gravity = 0, drag = 0, grow = 0 } = {}) {
    const { pos, vel, size, alpha, life } = this;
    for (let i = 0; i < this.count; i++) {
      if (life[i] <= 0) {
        alpha[i] = 0;
        continue;
      }
      life[i] -= dt;
      const i3 = i * 3;
      const damp = Math.max(0, 1 - drag * dt);
      vel[i3] *= damp;
      vel[i3 + 2] *= damp;
      vel[i3 + 1] = vel[i3 + 1] * damp + gravity * dt;
      pos[i3] += vel[i3] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt;

      const t = Math.max(0, life[i] / this.maxLife[i]);
      alpha[i] = this.baseAlpha[i] * Math.min(1, t * 1.6);
      if (grow) size[i] += grow * dt;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }
}

/** 空气浮尘：围绕相机缓慢飘动，只在镜头附近可见 */
export class Motes {
  constructor(scene, { count = 220, radius = 42, height = 14 } = {}) {
    this.count = count;
    this.radius = radius;
    this.height = height;
    this.base = new Float32Array(count * 3);
    this.phase = new Float32Array(count);

    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const alpha = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.base[i * 3] = (Math.random() - 0.5) * 2 * radius;
      this.base[i * 3 + 1] = Math.random() * height;
      this.base[i * 3 + 2] = (Math.random() - 0.5) * 2 * radius;
      this.phase[i] = Math.random() * Math.PI * 2;
      size[i] = 0.12 + Math.random() * 0.14;
      alpha[i] = 0.1 + Math.random() * 0.2;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: { uMap: { value: dot }, uColor: { value: new THREE.Color(0xffe6b8) } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geometry = g;
    this.t = 0;
  }

  update(dt, center) {
    this.t += dt;
    const p = this.geometry.attributes.position.array;
    const { base, phase, radius, count } = this;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const s = phase[i] + this.t * 0.35;
      // 相对相机做环形包裹，避免离开视野后浪费
      let x = base[i3] + Math.sin(s) * 1.6;
      let z = base[i3 + 2] + Math.cos(s * 0.8) * 1.6;
      x = ((x - center.x + radius) % (radius * 2) + radius * 2) % (radius * 2) - radius;
      z = ((z - center.z + radius) % (radius * 2) + radius * 2) % (radius * 2) - radius;
      p[i3] = center.x + x;
      p[i3 + 1] = base[i3 + 1] + Math.sin(s * 1.7) * 0.5;
      p[i3 + 2] = center.z + z;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}

/** 尾气 / 扬尘 */
export class Puffs {
  constructor(scene, { count = 90, color = 0xf2efe6 } = {}) {
    this.pool = new PointPool(scene, { count, color, blending: THREE.NormalBlending });
  }

  exhaust(x, y, z, heading) {
    const back = -1.6;
    this.pool.spawn(
      x + Math.sin(heading) * back + (Math.random() - 0.5) * 0.5,
      y + 0.5 + Math.random() * 0.2,
      z + Math.cos(heading) * back + (Math.random() - 0.5) * 0.5,
      {
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.5 + Math.random() * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
        size: 0.5 + Math.random() * 0.4,
        life: 0.8 + Math.random() * 0.5,
        alpha: 0.35,
      }
    );
  }

  dust(x, z, heading) {
    for (const side of [-1, 1]) {
      this.pool.spawn(
        x + Math.cos(heading) * 0.9 * side - Math.sin(heading) * 1.4,
        0.18,
        z - Math.sin(heading) * 0.9 * side - Math.cos(heading) * 1.4,
        {
          vx: (Math.random() - 0.5) * 1.6,
          vy: 0.6 + Math.random() * 0.6,
          vz: (Math.random() - 0.5) * 1.6,
          size: 0.7 + Math.random() * 0.5,
          life: 0.55 + Math.random() * 0.3,
          alpha: 0.3,
        }
      );
    }
  }

  update(dt) {
    this.pool.update(dt, { gravity: 0.35, drag: 1.6, grow: 0.5 });
  }
}