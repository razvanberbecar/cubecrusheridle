import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function createScene(canvas) {
  const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const MAX_DPR = isMobile ? 1.5 : 2;
  const SHADOW_SIZE = isMobile ? 1024 : 2048;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);

  scene.fog = new THREE.Fog(0x0a0a0f, 18, 48);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 4.3, 7.8);
  camera.lookAt(0, 1.0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;

  const dirLight = new THREE.DirectionalLight(0xfff2e0, 2.2);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(SHADOW_SIZE, SHADOW_SIZE);
  dirLight.shadow.bias = -0.001;
  const cam = dirLight.shadow.camera;
  cam.near = 1;
  cam.far = 30;
  cam.left = -10;
  cam.right = 10;
  cam.top = 10;
  cam.bottom = -10;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x9fb4ff, 0.2);
  fillLight.position.set(-5, 8, 2);
  scene.add(fillLight);

  const pressSpot = new THREE.SpotLight(0xffe3b0, 20, 28, 0.6, 0.5, 1.1);
  pressSpot.position.set(0, 11, 2.5);
  pressSpot.target.position.set(0, 0, 0);
  scene.add(pressSpot);
  scene.add(pressSpot.target);

  scene.add(new THREE.AmbientLight(0xffffff, 0.08));

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.environmentIntensity = 0.6;

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
  }
  window.addEventListener('resize', onResize);

  return { scene, camera, renderer };
}

export function createEnvironment(scene) {
  const room = new THREE.Group();

  const FLOOR_Y = -2;
  const WALL_H = 15;
  const WALL_Y = FLOOR_Y + WALL_H / 2;
  const CEIL_Y = FLOOR_Y + WALL_H;

  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');

  ctx.fillStyle = '#3c3c42';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2.2 + 0.4;
    const v = Math.floor(Math.random() * 70 + 55);
    ctx.globalAlpha = Math.random() * 0.3 + 0.04;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const stains = [
    [80,  120, 90,  55, '#2e2e2e', 0.20],
    [300, 380, 120, 70, '#252525', 0.14],
    [420, 100, 70,  45, '#383838', 0.16],
    [160, 400, 100, 60, '#2a2a2a', 0.12],
    [370, 260, 85,  50, '#333333', 0.15],
  ];
  for (const [x, y, rw, rh, col, a] of stains) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rw, rh));
    g.addColorStop(0, col); g.addColorStop(1, col + '00');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.0;
  [
    [[30, 170], [110, 205], [175, 190], [245, 228]],
    [[295, 45], [340, 125], [385, 118], [430, 182]],
    [[95,  348], [155, 368], [205, 418], [250, 408]],
  ].forEach(pts => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.stroke();
  });

  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#c8a000';
  ctx.fillRect(175, 0, 10, 512);
  ctx.fillRect(0, 175, 512, 10);

  ctx.globalAlpha = 1;
  const floorTex = new THREE.CanvasTexture(texCanvas);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(4, 3);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.1, 20),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0xaaaaaa,
      metalness: 0.0,
      roughness: 0.97,
    })
  );
  floor.position.set(0, FLOOR_Y, 0);
  floor.receiveShadow = true;
  room.add(floor);

  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 512; wallCanvas.height = 512;
  const wc = wallCanvas.getContext('2d');

  wc.fillStyle = '#7a7e86';
  wc.fillRect(0, 0, 512, 512);

  for (let x = 0; x < 512; x += 20) {

    wc.globalAlpha = 0.28;
    wc.fillStyle = '#1a1a1a';
    wc.fillRect(x, 0, 4, 512);

    wc.globalAlpha = 0.18;
    wc.fillStyle = '#e8e8e8';
    wc.fillRect(x + 9, 0, 5, 512);
  }

  wc.globalAlpha = 1;
  wc.fillStyle = '#1e1e1e';
  for (const sy of [170, 340]) {
    wc.fillRect(0, sy - 1, 512, 3);
  }

  wc.fillStyle = '#555';
  for (const sy of [170, 340]) {
    for (let bx = 10; bx < 512; bx += 36) {
      wc.beginPath();
      wc.arc(bx, sy, 2.5, 0, Math.PI * 2);
      wc.fill();
    }
  }

  const dg = wc.createLinearGradient(0, 360, 0, 512);
  dg.addColorStop(0, 'rgba(0,0,0,0)');
  dg.addColorStop(1, 'rgba(20,18,14,0.55)');
  wc.globalAlpha = 1;
  wc.fillStyle = dg;
  wc.fillRect(0, 0, 512, 512);

  wc.globalAlpha = 0.12;
  wc.fillStyle = '#6b3a1a';
  for (const [sx, sy] of [[60,170],[140,170],[300,340],[420,340],[200,170],[380,170]]) {
    wc.fillRect(sx - 1, sy, 3, 80 + Math.random() * 60);
  }

  wc.globalAlpha = 1;
  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(5, 2);

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x888888,
    metalness: 0.45,
    roughness: 0.75,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0d0d0d,
    metalness: 0.3,
    roughness: 0.85,
  });

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(30, WALL_H, 0.1), wallMat);
  backWall.position.set(0, WALL_Y, -10);
  room.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, WALL_H, 20), wallMat);
  leftWall.position.set(-15, WALL_Y, 0);
  room.add(leftWall);

  const rightWall = leftWall.clone();
  rightWall.position.x = 15;
  room.add(rightWall);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(30, 0.1, 20), darkMat);
  ceiling.position.set(0, CEIL_Y, 0);
  room.add(ceiling);

  const lampMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.4,
  });
  const cordMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.5,
    roughness: 0.6,
  });
  const lampGeo = new THREE.CylinderGeometry(0.1, 0.3, 0.4, 8);
  const LAMP_Y = 6.5;

  for (const [lx, lz] of [
    [-7, -4],
    [7, -4],
    [-7, 4],
    [7, 4],
  ]) {
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(lx, LAMP_Y, lz);
    room.add(lamp);

    const cordLen = CEIL_Y - (LAMP_Y + 0.2);
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, cordLen, 6),
      cordMat
    );
    cord.position.set(lx, LAMP_Y + 0.2 + cordLen / 2, lz);
    room.add(cord);

    const light = new THREE.PointLight(0x4444ff, 0.35, 8);
    light.position.set(lx, LAMP_Y - 0.4, lz);
    room.add(light);
  }

  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.9,
    roughness: 0.3,
  });
  const pipeGeo = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
  for (const px of [-14.5, 14.5]) {
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(px, FLOOR_Y + 5, -9.5);
    room.add(pipe);
  }

  scene.add(room);
  return room;
}
