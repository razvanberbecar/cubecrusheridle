import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const FLOOR_Y = -2;

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);

export function createDecorations(scene) {
  const buckets = new Map();
  const _p = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _s = new THREE.Vector3();

  const cardUrl = import.meta.env.BASE_URL + 'cardboard.png';
  const cardTex = new THREE.TextureLoader().load(
    cardUrl,
    undefined,
    undefined,
    () => console.error('[decorations] failed to load cardboard texture:', cardUrl)
  );
  cardTex.colorSpace = THREE.SRGBColorSpace;
  cardTex.wrapS = cardTex.wrapT = THREE.RepeatWrapping;
  cardTex.repeat.set(1, 1);

  const conCanvas = document.createElement('canvas');
  conCanvas.width = conCanvas.height = 256;
  const xc = conCanvas.getContext('2d');
  for (let xp = 0; xp < 256; xp++) {
    const wave = Math.sin((xp / 18) * Math.PI * 2);
    const b = Math.round(200 + 34 * wave);
    xc.fillStyle = `rgb(${b},${b},${b})`;
    xc.fillRect(xp, 0, 1, 256);
  }

  for (let i = 0; i < 70; i++) {
    xc.globalAlpha = Math.random() * 0.08 + 0.03;
    xc.fillStyle = Math.random() > 0.5 ? '#000' : '#fff';
    xc.fillRect(0, Math.random() * 256, 256, Math.random() * 2 + 1);
  }

  xc.globalAlpha = 0.12;
  for (const [rx, ry, rr] of [[44, 180, 30], [200, 92, 26], [150, 214, 22]]) {
    const g = xc.createRadialGradient(rx, ry, 0, rx, ry, rr);
    g.addColorStop(0, '#5a2a10'); g.addColorStop(1, '#5a2a1000');
    xc.fillStyle = g; xc.fillRect(0, 0, 256, 256);
  }
  xc.globalAlpha = 1;
  const containerTex = new THREE.CanvasTexture(conCanvas);
  containerTex.colorSpace = THREE.SRGBColorSpace;
  containerTex.wrapS = containerTex.wrapT = THREE.RepeatWrapping;
  containerTex.repeat.set(3, 1);

  const fkCanvas = document.createElement('canvas');
  fkCanvas.width = fkCanvas.height = 256;
  const fx = fkCanvas.getContext('2d');
  fx.fillStyle = '#dcdcdc';
  fx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4000; i++) {
    fx.globalAlpha = Math.random() * 0.06 + 0.02;
    fx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#6f6f6f';
    fx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }

  for (let i = 0; i < 45; i++) {
    fx.globalAlpha = Math.random() * 0.22 + 0.08;
    fx.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#555555';
    fx.lineWidth = Math.random() * 0.8 + 0.3;
    const x = Math.random() * 256, y = Math.random() * 256;
    const len = Math.random() * 40 + 10, a = Math.random() * Math.PI;
    fx.beginPath(); fx.moveTo(x, y); fx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); fx.stroke();
  }

  fx.globalAlpha = 0.5;
  for (let i = 0; i < 28; i++) {
    fx.fillStyle = Math.random() > 0.5 ? '#3a2a1a' : '#555555';
    fx.beginPath(); fx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2.5 + 1, 0, Math.PI * 2); fx.fill();
  }

  fx.globalAlpha = 1;
  const fkEdge = fx.createLinearGradient(0, 0, 0, 256);
  fkEdge.addColorStop(0, 'rgba(20,12,4,0.4)'); fkEdge.addColorStop(0.09, 'rgba(20,12,4,0)');
  fkEdge.addColorStop(0.91, 'rgba(20,12,4,0)'); fkEdge.addColorStop(1, 'rgba(20,12,4,0.4)');
  fx.fillStyle = fkEdge; fx.fillRect(0, 0, 256, 256);
  const fkEdgeH = fx.createLinearGradient(0, 0, 256, 0);
  fkEdgeH.addColorStop(0, 'rgba(20,12,4,0.35)'); fkEdgeH.addColorStop(0.09, 'rgba(20,12,4,0)');
  fkEdgeH.addColorStop(0.91, 'rgba(20,12,4,0)'); fkEdgeH.addColorStop(1, 'rgba(20,12,4,0.35)');
  fx.fillStyle = fkEdgeH; fx.fillRect(0, 0, 256, 256);
  const paintMetalTex = new THREE.CanvasTexture(fkCanvas);
  paintMetalTex.colorSpace = THREE.SRGBColorSpace;
  paintMetalTex.wrapS = paintMetalTex.wrapT = THREE.RepeatWrapping;
  paintMetalTex.repeat.set(1, 1);

  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = woodCanvas.height = 256;
  const wgx = woodCanvas.getContext('2d');
  wgx.fillStyle = '#dcdcdc';
  wgx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 105; i++) {
    const y = Math.random() * 256;
    wgx.globalAlpha = Math.random() * 0.16 + 0.08;
    wgx.strokeStyle = Math.random() > 0.4 ? '#5f5f5f' : '#ffffff';
    wgx.lineWidth = Math.random() * 1.6 + 0.4;
    wgx.beginPath();
    wgx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 8) wgx.lineTo(x, y + Math.sin((x + i * 20) * 0.03) * 2.5);
    wgx.stroke();
  }
  wgx.globalAlpha = 0.32;
  for (const [kx, ky] of [[70, 92], [186, 174]]) {
    wgx.strokeStyle = '#5a4326';
    for (let r = 11; r > 0; r -= 2) {
      wgx.lineWidth = 1;
      wgx.beginPath();
      wgx.ellipse(kx, ky, r, r * 0.6, 0.5, 0, Math.PI * 2);
      wgx.stroke();
    }
  }
  wgx.globalAlpha = 1;
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(1, 1);

  const barCanvas = document.createElement('canvas');
  barCanvas.width = barCanvas.height = 256;
  const brx = barCanvas.getContext('2d');
  brx.fillStyle = '#cfcfcf';
  brx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    brx.globalAlpha = Math.random() * 0.06 + 0.02;
    brx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#7a7a7a';
    brx.fillRect(Math.random() * 256, Math.random() * 256, 1, Math.random() * 4 + 1);
  }
  brx.globalAlpha = 1;
  for (const ry of [52, 128, 204]) {
    brx.fillStyle = '#5a5a5a'; brx.fillRect(0, ry - 3, 256, 6);
    brx.fillStyle = '#efefef'; brx.fillRect(0, ry - 4, 256, 1.5); brx.fillRect(0, ry + 3, 256, 1.5);
  }
  brx.globalAlpha = 0.16;
  brx.fillStyle = '#3a1808';
  for (let i = 0; i < 14; i++) brx.fillRect(Math.random() * 256, Math.random() * 128, 2, Math.random() * 70 + 30);
  brx.globalAlpha = 1;
  const barrelTex = new THREE.CanvasTexture(barCanvas);
  barrelTex.colorSpace = THREE.SRGBColorSpace;
  barrelTex.wrapS = barrelTex.wrapT = THREE.RepeatWrapping;
  barrelTex.repeat.set(1, 1);

  const dmCanvas = document.createElement('canvas');
  dmCanvas.width = dmCanvas.height = 256;
  const dmx = dmCanvas.getContext('2d');
  dmx.fillStyle = '#e8e8e8';
  dmx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    dmx.globalAlpha = Math.random() * 0.05 + 0.02;
    dmx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#9a9a9a';
    dmx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 6 + 2, 1);
  }
  dmx.globalAlpha = 1;
  const darkMetalTex = new THREE.CanvasTexture(dmCanvas);
  darkMetalTex.colorSpace = THREE.SRGBColorSpace;
  darkMetalTex.wrapS = darkMetalTex.wrapT = THREE.RepeatWrapping;
  darkMetalTex.repeat.set(1, 1);

  const M = {
    steelO: new THREE.MeshStandardMaterial({ map: paintMetalTex, color: 0xc25a1a, metalness: 0.6, roughness: 0.5 }),
    steelB: new THREE.MeshStandardMaterial({ map: paintMetalTex, color: 0x2a557a, metalness: 0.6, roughness: 0.5 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex, color: 0x6b4a2f, metalness: 0, roughness: 1 }),
    woodL: new THREE.MeshStandardMaterial({ map: woodTex, color: 0x8a6a43, metalness: 0, roughness: 1 }),
    card: new THREE.MeshStandardMaterial({ map: cardTex, color: 0xffffff, metalness: 0, roughness: 0.92 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0, roughness: 1 }),
    darkMetal: new THREE.MeshStandardMaterial({ map: darkMetalTex, color: 0x333333, metalness: 0.7, roughness: 0.4 }),
    container: new THREE.MeshStandardMaterial({ map: containerTex, color: 0x3f6fa8, metalness: 0.6, roughness: 0.5 }),
    barrel: new THREE.MeshStandardMaterial({ map: barrelTex, color: 0x8b2500, metalness: 0.4, roughness: 0.7 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xf2c200, metalness: 0.1, roughness: 0.8 }),
    black: new THREE.MeshStandardMaterial({ color: 0x161616, metalness: 0.1, roughness: 0.8 }),
    forkO: new THREE.MeshStandardMaterial({ map: paintMetalTex, color: 0xe65100, metalness: 0.4, roughness: 0.55 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.1, roughness: 0.9 }),
  };

  function addUnit(geo, mat, x, y, z, rot, scl, P) {
    _q.setFromEuler(_e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0));
    Array.isArray(scl) ? _s.set(scl[0], scl[1], scl[2]) : _s.set(scl, scl, scl);
    const L = new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s);
    const m = P ? P.clone().multiply(L) : L;
    const g = geo.clone().applyMatrix4(m);
    let arr = buckets.get(mat);
    if (!arr) buckets.set(mat, (arr = []));
    arr.push(g);
  }
  const box = (mat, x, y, z, w, h, d, rot, P) => addUnit(UNIT_BOX, mat, x, y, z, rot, [w, h, d], P);
  const cyl = (mat, x, y, z, r, h, rot, P) => addUnit(UNIT_CYL, mat, x, y, z, rot, [r * 2, h, r * 2], P);

  const at = (cx, cz, yaw = 0) =>
    new THREE.Matrix4().compose(_p.set(cx, FLOOR_Y, cz), new THREE.Quaternion().setFromEuler(_e.set(0, yaw, 0)), new THREE.Vector3(1, 1, 1));

  function pallet(P) {
    box(M.wood, 0, 0.12, 0, 1.6, 0.12, 1.2, null, P);
    for (const sz of [-0.5, 0, 0.5]) box(M.wood, 0, 0.05, sz, 1.6, 0.1, 0.22, null, P);
    return 0.18;
  }

  function rack(cx, cz, yaw, w, h, depth, loadMat) {
    const P = at(cx, cz, yaw);
    for (const sx of [-w / 2, w / 2])
      for (const sz of [-depth / 2, depth / 2]) box(M.steelO, sx, h / 2, sz, 0.18, h, 0.18, null, P);
    const levels = [0.12, h * 0.42, h * 0.74];
    for (const ly of levels) {
      box(M.steelB, 0, ly, -depth / 2, w, 0.14, 0.1, null, P);
      box(M.steelB, 0, ly, depth / 2, w, 0.14, 0.1, null, P);
      box(M.woodL, 0, ly + 0.07, 0, w - 0.1, 0.06, depth - 0.05, null, P);
    }

  }

  function container(cx, cz, yaw, len, ht, dep) {
    const P = at(cx, cz, yaw);
    box(M.container, 0, ht / 2, 0, len, ht, dep, null, P);
    box(M.darkMetal, 0, ht + 0.06, 0, len + 0.05, 0.12, dep + 0.05, null, P);
    box(M.darkMetal, 0, 0.06, 0, len + 0.05, 0.12, dep + 0.05, null, P);
    for (let i = -len / 2 + 0.5; i < len / 2; i += 0.9) {
      box(M.darkMetal, i, ht / 2, dep / 2 + 0.02, 0.08, ht * 0.9, 0.04, null, P);
      box(M.darkMetal, i, ht / 2, -dep / 2 - 0.02, 0.08, ht * 0.9, 0.04, null, P);
    }
    for (const dz of [dep * 0.22, -dep * 0.22]) box(M.darkMetal, len / 2 + 0.02, ht * 0.5, dz, 0.05, ht * 0.86, 0.08, null, P);
  }

  function crateStack(cx, cz) {
    const P = at(cx, cz);
    const top = pallet(P);
    box(M.card, -0.32, top + 0.6, 0.28, 1.05, 1.15, 1.0, [0, 0.1], P);
    box(M.card, 0.42, top + 0.5, -0.28, 0.9, 0.95, 0.9, [0, -0.15], P);
    box(M.card, 0.0, top + 1.15 + 0.5, 0.0, 1.1, 0.95, 1.0, [0, 0.05], P);
  }

  function bagPile(cx, cz) {
    const P = at(cx, cz);
    const top = pallet(P);
    const rows = [
      [-0.55, 0, 0.55],
      [-0.28, 0.28],
      [0],
    ];
    rows.forEach((xs, r) => {
      const y = top + 0.23 + r * 0.45;
      xs.forEach((bx) => box(M.concrete, bx, y, 0, 0.85, 0.45, 0.62, [(Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.12], P));
    });
  }

  function barrelGroup(cx, cz) {
    const P = at(cx, cz);
    const top = pallet(P);
    for (const [bx, bz] of [[-0.45, -0.3], [0.45, -0.3], [-0.45, 0.35], [0.45, 0.35]]) {
      cyl(M.barrel, bx, top + 0.45, bz, 0.32, 0.9, null, P);
      cyl(M.darkMetal, bx, top + 0.9 + 0.03, bz, 0.32, 0.06, null, P);
    }
  }

  function pipeStack(cx, cz, yaw) {
    const P = at(cx, cz, yaw);
    const R = 0.36, L = 4.2;
    const rows = [[-0.78, 0, 0.78], [-0.4, 0.4], [0]];
    const ys = [R, R + R * 1.72, R + R * 3.44];
    rows.forEach((zs, ri) => zs.forEach((zz) => cyl(M.darkMetal, 0, ys[ri], zz, R, L, [0, 0, Math.PI / 2], P)));
  }

  function lumberStack(cx, cz, yaw) {
    const P = at(cx, cz, yaw);
    for (let i = 0; i < 6; i++) box(M.woodL, (Math.random() - 0.5) * 0.25, 0.1 + i * 0.16, 0, 4.2, 0.14, 0.38, null, P);
  }

  function forklift(cx, cz, yaw) {
    const P = at(cx, cz, yaw);
    box(M.forkO,    0,     1.1,  0,     2.6,  1.5,  1.8,  null, P);
    box(M.forkO,    1.84,  1.6,  0,     1.1,  1.1,  1.8,  null, P);
    box(M.darkMetal,-1.96, 0.96, 0,     1.3,  1.1,  1.8,  null, P);
    box(M.tyre,     0,     2.9, -0.1,   1.7,  0.2,  1.8,  null, P);
    for (const pz of [0.76, -0.76]) box(M.darkMetal, 0.56, 2.24, pz, 0.14, 1.1,  0.14, null, P);
    for (const pz of [0.54, -0.54]) box(M.darkMetal, 2.56, 1.9,  pz, 0.18, 3.8,  0.14, null, P);
    for (const pz of [0.44, -0.44]) box(M.tyre,      3.44, 0.2,  pz, 1.8,  0.14, 0.18, null, P);
    for (const [wx, wz] of [[1.0, 0.7],[1.0,-0.7],[-1.0, 0.7],[-1.0,-0.7]])
      cyl(M.tyre, wx, 0.4, wz, 0.4, 0.32, [Math.PI / 2, 0, 0], P);
  }

  rack(-7.5, -9, 0, 6.5, 9, 1.7, M.card);
  rack(0, -9, 0, 6.5, 9, 1.7, M.card);
  rack(7.5, -9, 0, 6.5, 9, 1.7, M.card);

  bagPile(-11.3, 5.6);
  pipeStack(-12.6, 1.8, 0);

  barrelGroup(12.6, 2.6);
  lumberStack(11.2, 6.6, 0.3);

  for (const bx of [-14.6, 14.6])
    for (const bz of [-5, 4]) {
      box(M.darkMetal, bx, FLOOR_Y + 5.5, bz, 0.1, 11, 0.1, null, null);
      box(M.darkMetal, bx, FLOOR_Y + 11, bz, 0.5, 0.1, 0.1, null, null);
      box(M.darkMetal, bx, FLOOR_Y, bz, 0.5, 0.1, 0.1, null, null);
    }

  for (const pz of [-6, -2, 6]) {
    cyl(M.darkMetal, 0, 12.3, pz, 0.1, 28, [0, 0, Math.PI / 2], null);
    for (let jx = -12; jx <= 12; jx += 4) cyl(M.darkMetal, jx, 12.3, pz, 0.15, 0.16, [0, 0, Math.PI / 2], null);
  }

  const group = new THREE.Group();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  scene.add(group);

  loadGLBModel(scene, 'forklift.glb',           { targetH: 4.2, posX: 10.5, posZ: -4.5, yaw: Math.PI * 1.75 });

  loadGLBModel(scene, 'pallettruck.glb',         { targetH: 2.8, posX: -3.0, posZ: -5.5, yaw: Math.PI * 0.5 });

  loadGLBModel(scene, 'Pallet.glb',              { targetH: 0.3, posX: 2.0, posZ: -5.8, yaw: 0.45 });
  loadGLBModel(scene, 'Pallet.glb',              { targetH: 0.3, posX: 5.0, posZ: -5.8, yaw: 0.15 });

  loadGLBModel(scene, 'Cardboard Boxes.glb',      { targetH: 0.9,  posX: -7.8, posZ: 6.6,  yaw: 0.1 });
  loadGLBModel(scene, 'Cardboard Boxes (1).glb',  { targetH: 1.2,  posX: -9.5, posZ: 4.0,  yaw: -0.2 });
  loadGLBModel(scene, 'Cardboard Boxes (2).glb',  { targetH: 1.0,  posX: 12.4, posZ: -3.2, yaw: 0.15 });
  loadGLBModel(scene, 'Cardboard Box Open.glb',   { targetH: 0.6,  posX: 11.0, posZ: 5.0,  yaw: -0.1 });

  loadGLBModel(scene, 'Exploding Barrel.glb',     { targetH: 1.6, posX: -6.6, posZ: -5.2, yaw: 0.3 });
  loadGLBModel(scene, 'Exploding Barrel.glb',     { targetH: 1.6, posX: -8.4, posZ: -5.6, yaw: 1.1 });
  loadGLBModel(scene, 'Exploding Barrel.glb',     { targetH: 1.6, posX: -7.5, posZ: -6.8, yaw: -0.4 });

  loadGLBModel(scene, 'Shipping Container.glb',   { targetH:3.7, posX: -12.5, posZ: -3.5, yaw: 0, rotZ: Math.PI / 2 });

  const BOX_FILES = ['Cardboard Boxes.glb', 'Cardboard Boxes (1).glb', 'Cardboard Boxes (2).glb', 'Cardboard Box Open.glb'];

  const BOX_SCALE = [1.0, 1.6, 1.0, 1.0];

  function fillShelf(cx, floorY, specs) {
    for (const [dx, size, fi, yaw = 0, dz = 0] of specs)
      loadGLBModel(scene, BOX_FILES[fi], { targetH: size * BOX_SCALE[fi], posX: cx + dx, posZ: -8.7 + dz, yaw, floorY });
  }

  for (const cx of [-7.5, 0, 7.5]) {
    fillShelf(cx, -1.81, [
      [-2.0, 1.35, 0,  0.08,  0.15],
      [-0.55, 1.05, 1, -0.10, -0.10],
      [ 0.8, 1.5,  2,  0.05,  0.05],
      [ 2.0, 1.3,  3, -0.06,  0.18],
    ]);
    fillShelf(cx, 1.85, [
      [-1.9, 1.35, 2,  0.06,  0.00],
      [ 0.0, 1.05, 1, -0.08, -0.12],
      [ 1.9, 1.3,  0,  0.10,  0.10],
    ]);
  }

  return group;
}

const _glbCache = new Map();
function loadGLBModel(scene, filename, { targetH, posX, posZ, yaw = 0, rotX = 0, rotZ = 0, floorY = FLOOR_Y, offsetY = 0 } = {}) {
  let tpl = _glbCache.get(filename);
  if (!tpl) {
    const url = import.meta.env.BASE_URL + filename.replace(/ /g, '%20');
    tpl = new Promise((resolve, reject) =>
      new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, reject));
    _glbCache.set(filename, tpl);
  }
  tpl
    .then((template) => {
      const model = template.clone(true);

      model.rotation.set(rotX, yaw, rotZ);
      let bbox = new THREE.Box3().setFromObject(model);
      const size = bbox.getSize(new THREE.Vector3());
      if (targetH && size.y > 0) model.scale.setScalar(targetH / size.y);

      bbox = new THREE.Box3().setFromObject(model);
      const c = bbox.getCenter(new THREE.Vector3());
      model.position.x += posX - c.x;
      model.position.z += posZ - c.z;
      model.position.y += floorY - bbox.min.y + offsetY;
      model.traverse((o) => {
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
      });
      scene.add(model);
    })
    .catch((err) => console.warn(`[decorations] ${filename} failed to load:`, err?.message || err));
}
