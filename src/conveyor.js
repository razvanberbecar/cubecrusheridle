import * as THREE from 'three';
import { gameState } from './gameState.js';
import { createCube, createBossCube } from './cube.js';

const BELT_TOP_Y = 0;
const CUBE_Y = BELT_TOP_Y + 0.6;
const BOSS_Y = BELT_TOP_Y + 1.2;
const PRESS_X = 0;
const SPAWN_X = 7;
const EXIT_X = -7.5;
const SPACING = 4.5;
const CRUSH_HALF_WIDTH = 1.1;
const BOSS_INTERVAL = 30;

export const BELT_Z = 1.0;

export function createConveyor(scene, onMiss) {
  const group = new THREE.Group();
  group.position.z = BELT_Z;

  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = plateCanvas.height = 256;
  const pc = plateCanvas.getContext('2d');
  pc.fillStyle = '#4a4e54';
  pc.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3500; i++) {
    pc.globalAlpha = Math.random() * 0.05 + 0.02;
    pc.fillStyle = Math.random() > 0.5 ? '#6b7077' : '#33363b';
    pc.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 12 + 4, 1);
  }
  pc.globalAlpha = 1;

  const CELL = 32;
  for (let gy = 0; gy < 256 / CELL; gy++) {
    for (let gx = 0; gx < 256 / CELL; gx++) {
      const dir = (gx + gy) % 2 === 0 ? 1 : -1;
      pc.save();
      pc.translate(gx * CELL + CELL / 2, gy * CELL + CELL / 2);
      pc.rotate((dir * Math.PI) / 4);
      pc.fillStyle = '#5e636a'; pc.fillRect(-11, -3.5, 22, 7);
      pc.fillStyle = '#9aa0a8'; pc.fillRect(-11, -3.5, 22, 2);
      pc.fillStyle = '#2b2e33'; pc.fillRect(-11, 2.5, 22, 1.5);
      pc.restore();
    }
  }
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  plateTex.wrapS = plateTex.wrapT = THREE.RepeatWrapping;
  plateTex.repeat.set(4, 1);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.2, 3),
    new THREE.MeshStandardMaterial({
      map: plateTex,
      color: 0x9a9ea3,
      metalness: 0.85,
      roughness: 0.45,
    })
  );
  belt.position.y = BELT_TOP_Y - 0.1;
  belt.receiveShadow = true;
  group.add(belt);

  const rollerCount = 13;
  const rollerGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 12);
  const rollerMat = new THREE.MeshStandardMaterial({
    color: 0x6a6f76,
    metalness: 0.85,
    roughness: 0.4,
  });
  const rollers = new THREE.InstancedMesh(rollerGeo, rollerMat, rollerCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < rollerCount; i++) {
    dummy.position.set(-6 + i, BELT_TOP_Y + 0.02, 0);
    dummy.rotation.set(Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    rollers.setMatrixAt(i, dummy.matrix);
  }
  rollers.instanceMatrix.needsUpdate = true;
  group.add(rollers);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xbf00ff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const magnetRing = new THREE.Mesh(new THREE.RingGeometry(1.3, 2.1, 40), ringMat);
  magnetRing.rotation.x = -Math.PI / 2;
  magnetRing.position.set(PRESS_X, BELT_TOP_Y + 0.06, 0);
  group.add(magnetRing);
  let ringTime = 0;

  scene.add(group);

  const cubes = [];
  let bossPending = false;
  let bossActive = false;
  let bossCube = null;
  let goldenSurge = false;

  function setGoldenSurge(on) {
    goldenSurge = on;
  }

  function spawnNormalCube() {

    const chance = Math.min(
      gameState.goldenChance + gameState.rebirthBonuses.goldenChanceBonus,
      1
    );
    const golden = goldenSurge || Math.random() < chance;
    const mesh = createCube(golden);
    mesh.position.set(SPAWN_X, CUBE_Y, BELT_Z);
    scene.add(mesh);

    if (mesh.userData.glow) {
      mesh.userData.glow.position.copy(mesh.position);
      scene.add(mesh.userData.glow);
    }
    cubes.push(mesh);
  }

  function spawnBoss() {
    const mesh = createBossCube();
    mesh.position.set(SPAWN_X, BOSS_Y, BELT_Z);
    scene.add(mesh);
    cubes.push(mesh);
    bossCube = mesh;
    bossActive = true;
    bossPending = false;
  }

  function disposeCube(cube) {
    if (cube.userData.glow) {
      scene.remove(cube.userData.glow);
      cube.userData.glow.dispose?.();
      cube.userData.glow = null;
    }
    scene.remove(cube);

    if (cube.isMesh && cube.material) cube.material.dispose();
  }

  function registerCrush() {
    gameState.crushCount += 1;
    if (gameState.crushCount % BOSS_INTERVAL === 0) bossPending = true;
  }

  function update(delta) {
    const beltSpeed = gameState.conveyorSpeed * 2.0;
    const magnet = gameState.magnetStrength;

    for (let i = cubes.length - 1; i >= 0; i--) {
      const cube = cubes[i];
      const dx = cube.position.x - PRESS_X;
      let speed = beltSpeed;
      if (magnet > 0 && dx > CRUSH_HALF_WIDTH) speed += magnet;

      const nextX = cube.position.x - speed * delta;

      cube.position.x = cube.userData.isBoss ? Math.max(PRESS_X, nextX) : nextX;
      cube.rotation.y += delta * 0.8;

      if (cube.userData.glow) {
        cube.userData.glow.position.set(
          cube.position.x,
          cube.position.y + 0.3,
          cube.position.z
        );
      }

      if (!cube.userData.isBoss && cube.position.x <= EXIT_X) {
        disposeCube(cube);
        cubes.splice(i, 1);
        onMiss?.();
      }
    }

    ringTime += delta;
    const lvl = gameState.magnetLevel;
    ringMat.opacity =
      lvl <= 0 ? 0 : Math.min(0.12 + lvl * 0.03, 0.4) * (0.7 + 0.3 * Math.sin(ringTime * 4));

    if (bossActive) return;
    const last = cubes[cubes.length - 1];
    const hasRoom = !last || last.position.x <= SPAWN_X - SPACING;
    if (!hasRoom) return;
    if (bossPending) spawnBoss();
    else spawnNormalCube();
  }

  function getCrushTarget() {
    if (
      bossActive &&
      bossCube &&
      Math.abs(bossCube.position.x - PRESS_X) <= CRUSH_HALF_WIDTH
    ) {
      return bossCube;
    }
    for (const cube of cubes) {
      if (cube.userData.isBoss) continue;
      if (Math.abs(cube.position.x - PRESS_X) <= CRUSH_HALF_WIDTH) return cube;
    }
    return null;
  }

  function crush(cube) {
    const idx = cubes.indexOf(cube);
    if (idx === -1) return null;
    cubes.splice(idx, 1);
    const result = {
      position: cube.position.clone(),
      color: cube.userData.color,
      multiplier: cube.userData.multiplier,
      golden: cube.userData.isGolden,
    };
    disposeCube(cube);
    registerCrush();
    return result;
  }

  function damageBoss(cube) {
    cube.userData.health -= 1;
    const destroyed = cube.userData.health <= 0;
    const result = {
      destroyed,
      position: cube.position.clone(),
      color: cube.userData.color,
      multiplier: cube.userData.multiplier,
      health: Math.max(0, cube.userData.health),
      maxHealth: cube.userData.maxHealth,
    };
    if (destroyed) {
      const idx = cubes.indexOf(cube);
      if (idx !== -1) cubes.splice(idx, 1);
      disposeCube(cube);
      bossActive = false;
      bossCube = null;
    }
    return result;
  }

  function getBoss() {
    return bossActive ? bossCube : null;
  }

  function reset() {
    for (const cube of cubes) disposeCube(cube);
    cubes.length = 0;
    bossPending = false;
    bossActive = false;
    bossCube = null;
  }

  return { group, update, getCrushTarget, crush, damageBoss, getBoss, reset, setGoldenSurge };
}
