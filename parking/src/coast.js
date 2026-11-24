import * as THREE from 'three';
import { softDotTexture } from './fx.js';

// Paint the entire bay in one pass. Distances are in town units so the
// shallows follow the islands even in the low chase camera.
export function addSea(scene, islands) {
  const time = { value: 0 };
  const material = new THREE.MeshStandardMaterial({ roughness: 0.76, color: 0xffffff });
  material.onBeforeCompile = shader => {
    shader.uniforms.uTide = time;
    shader.uniforms.uIslands = {
      value: islands.map(([x, z, w, d]) => new THREE.Vector4(x, z, w / 2, d / 2))
    };
    shader.vertexShader = 'varying vec2 vBay;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nvBay = vec2(position.x, -position.y);'
    );
    shader.fragmentShader = `
      varying vec2 vBay;
      uniform float uTide;
      uniform vec4 uIslands[4];
      float ripple(vec2 p, float time) {
        p.y += 0.28 * sin(p.x * 0.65 + time);
        p.x += 4.1 * floor(p.y);
        vec2 cell = floor(p);
        float seed = fract(sin(dot(cell, vec2(17.17, 51.71))) * 1234.56);
        vec2 q = fract(p) - 0.5;
        q.y += 0.24*sin(seed*72.0) + 0.10*sin(q.x*5.0+seed*21.0);
        float edge = abs(q.y) + q.x*q.x*(2.0+4.2*seed);
        float aa = clamp(fwidth(p.y), 0.02, 0.2);
        return (1.0 - smoothstep(0.08, 0.08 + aa, edge)) * smoothstep(0.64, 0.92, seed);
      }
    ` + shader.fragmentShader.replace('#include <color_fragment>', `
      float shore = 1000.0;
      for (int i = 0; i < 4; i++) {
        vec2 offset = max(abs(vBay - uIslands[i].xy) - uIslands[i].zw, 0.0);
        shore = min(shore, length(offset));
      }
      float swell = sin(vBay.y * 0.75 + uTide * 0.8) * 0.24
                  + sin(vBay.x * 0.8 + vBay.y * 0.4 - uTide) * 0.12;
      float depth = smoothstep(0.0, 19.0, shore + swell);
      vec3 sea = mix(vec3(0.19,0.71,0.67), vec3(0.022,0.34,0.52), depth);
      sea += 0.023 * sin(vBay.y * 0.63 + sin(vBay.x * 0.31) + uTide * 0.32);
      float foam = 1.0 - smoothstep(0.08,0.22,abs(shore + swell - 0.68));
      foam += 0.48*(1.0-smoothstep(0.06,0.18,abs(shore+swell*1.5-2.08)));
      float glint = ripple(vBay * vec2(0.25,0.77) + vec2(uTide*0.09,0.0), uTide*0.36);
      diffuseColor.rgb = mix(sea, vec3(0.81,0.97,0.83), clamp(foam*0.68+glint*0.66,0.0,1.0));
    `);
  };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), material);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.2;
  water.receiveShadow = true;
  scene.add(water);
  return elapsed => { time.value = elapsed; };
}

export function addSky(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 40, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying float vHeight;
      void main(){ vHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying float vHeight;
      void main(){
        vec3 sky = mix(vec3(0.87,0.86,0.67), vec3(0.25,0.63,0.76), smoothstep(-0.02,0.49,vHeight));
        gl_FragColor = vec4(sky,1.0);
        #include <colorspace_fragment>
      }`
  }));
  sky.renderOrder = -2;
  scene.add(sky);
}

// Transparent, shared ground decals give each object a soft contact shadow.
export function addContactShadows(scene, shadows) {
  const material = new THREE.MeshBasicMaterial({
    map: softDotTexture(), color: '#334849', transparent: true, opacity: 0.32, depthWrite: false
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), material, shadows.length);
  const stamp = new THREE.Object3D();
  stamp.rotation.x = -Math.PI / 2;
  shadows.forEach(([x, y, z, width, depth], i) => {
    stamp.position.set(x, y, z);
    stamp.scale.set(width, depth, 1);
    stamp.updateMatrix();
    mesh.setMatrixAt(i, stamp.matrix);
  });
  mesh.renderOrder = 1;
  scene.add(mesh);
}

export function layAsphalt(scene, sections) {
  const size = 128, data = new Uint8Array(size * size * 4);
  let seed = 31;
  for (let i = 0; i < data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grit = 227 + (seed >>> 27) * 0.85;
    data[i] = data[i+1] = data[i+2] = grit;
    data[i+3] = 255;
  }
  const grain = new THREE.DataTexture(data, size, size);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.generateMipmaps = true;
  grain.magFilter = THREE.LinearFilter;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.needsUpdate = true;
  const positions = [], uvs = [], colors = [], indices = [];
  for (const [x,z,w,d,y,color] of sections) {
    const first = positions.length / 3;
    const tint = new THREE.Color(color);
    for (const [dx,dz] of [[-1,-1],[-1,1],[1,1],[1,-1]]) {
      const xx = x + dx*w/2, zz = z + dz*d/2;
      positions.push(xx,y,zz); uvs.push(xx/6,zz/6); colors.push(tint.r,tint.g,tint.b);
    }
    indices.push(first,first+1,first+2,first,first+2,first+3);
  }
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  surface.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  surface.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  surface.setIndex(indices); surface.computeVertexNormals();
  const mesh = new THREE.Mesh(surface, new THREE.MeshStandardMaterial({map:grain, vertexColors:true, roughness:1}));
  mesh.receiveShadow = true;
  scene.add(mesh);
}
