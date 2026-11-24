import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Compose the town from a small set of shared moulds. Each mould is drawn in
// one batch, with the glaze colour supplied per instance.
function canopyPanel() {
  const edge = 1.63 / Math.sqrt(2), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0,0.365,0, 0,-0.365,1.63, edge,-0.365,edge,
    0,-0.365,1.63, 0,-0.50,1.63, edge,-0.50,edge,
    0,-0.365,1.63, edge,-0.50,edge, edge,-0.365,edge
  ],3));
  geometry.computeVertexNormals();
  return geometry;
}

const moulds = {
  pennant: new THREE.ConeGeometry(0.5,1,3).rotateZ(-Math.PI/2).scale(1,1,0.05),
  box: new THREE.BoxGeometry(1, 1, 1),
  parasol: canopyPanel(),
  mansard: new THREE.CylinderGeometry(0.53,Math.SQRT1_2,1,4,1,false,Math.PI/4),
  tile: new RoundedBoxGeometry(1, 0.25, 1, 1, 0.042).scale(1, 4, 1),
  block: new RoundedBoxGeometry(1, 1, 1, 1, 0.07),
  ball: new THREE.SphereGeometry(0.5, 12, 8),
  facet: new THREE.IcosahedronGeometry(0.5, 1),
  bud: new THREE.IcosahedronGeometry(0.5, 0),
  cone: new THREE.ConeGeometry(0.5, 1, 12),
  drum: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  taper: new THREE.CylinderGeometry(0.39, 0.5, 1, 12),
  ring: new THREE.TorusGeometry(0.37, 0.13, 8, 24),
  rail: new THREE.TorusGeometry(0.48, 0.018, 5, 24),
};
// These moulds use solid glazes. Share vertices across unused UV seams while
// preserving the normals that define their bevels and flat facets.
for (const [shape, geometry] of Object.entries(moulds)) {
  if (geometry.index) continue;
  geometry.deleteAttribute('uv');
  moulds[shape] = mergeVertices(geometry);
  geometry.dispose();
}
const glaze = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
const transform = new THREE.Object3D();
const tint = new THREE.Color();

export class ClayKit {
  constructor() { this.parts = new Map(); }

  add(shape, x, y, z, w, h, d, color, ry = 0, rx = 0, rz = 0) {
    if (!this.parts.has(shape)) this.parts.set(shape, []);
    transform.position.set(x, y, z);
    transform.scale.set(w, h, d);
    transform.rotation.set(rx, ry, rz, 'YXZ');
    transform.updateMatrix();
    this.parts.get(shape).push([transform.matrix.clone(), color]);
  }

  bake(parent) {
    for (const [shape, parts] of this.parts) {
      const mesh = new THREE.InstancedMesh(moulds[shape], glaze, parts.length);
      parts.forEach(([matrix, color], i) => {
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, tint.set(color));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
    }
    this.parts.clear();
  }
}

const signs = new Map();
export function lettering(parent, text, x, y, z, w, h, ink, background = null, ground = false, yaw = 0) {
  const key = [text, ink, background, w / h].join('|');
  if (!signs.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.max(40, Math.min(512, Math.round(512 * h / w)));
    const ctx = canvas.getContext('2d');
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 ' + Math.floor(canvas.height * 0.82) + 'px "Arial Black", "Microsoft YaHei", sans-serif';
    ctx.fillText(text, canvas.width / 2, canvas.height * 0.53, canvas.width * 0.94);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    signs.set(key, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), signs.get(key));
  sign.position.set(x, y, z);
  sign.rotation.order = 'YXZ';
  sign.rotation.set(ground ? -Math.PI / 2 : 0, yaw, 0);
  parent.add(sign);
  return sign;
}
