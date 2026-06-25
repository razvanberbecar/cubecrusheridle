import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const GOLD_COLOR = 0xffd700;
export const GOLDEN_MULTIPLIER = 10;

const BOSS_COLOR = 0x8b0000;
export const BOSS_MULTIPLIER = 25;
export const BOSS_HEALTH = 3;

const CUBE_SIZE = 1.2;
const BOSS_GEO = new THREE.BoxGeometry(2.4, 2.4, 2.4);

const NORMAL_BLOCKS = [
  { file: 'Brick Block.glb', color: 0xb5482f },
  { file: 'Diamond Block.glb', color: 0x4fd0ff },
  { file: 'Crystal Block.glb', color: 0xbf5cff },
  { file: 'Wood Planks Block.glb', color: 0xc8893f },
  { file: 'Coal Block.glb', color: 0x2e2e2e },
];
const GOLDEN_BLOCK = { file: 'golden-block.glb', color: GOLD_COLOR };

const loader = new GLTFLoader();
const templates = new Map();
const CUBE_GEO = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

function loadTemplate(file) {
  return new Promise((resolve) => {
    const url = import.meta.env.BASE_URL + encodeURIComponent(file);
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar(CUBE_SIZE / maxDim);
        const c = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
        model.position.sub(c);
        model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        const wrapper = new THREE.Group();
        wrapper.add(model);
        templates.set(file, wrapper);
        resolve();
      },
      undefined,
      (e) => { console.warn('[cube] failed to load', file, e?.message || e); resolve(); }
    );
  });
}

let preloadPromise = null;
export function preloadCubeModels() {
  if (!preloadPromise) {
    const files = [...NORMAL_BLOCKS.map((b) => b.file), GOLDEN_BLOCK.file];
    preloadPromise = Promise.all(files.map(loadTemplate));
  }
  return preloadPromise;
}

export function createCube(golden = false) {
  const def = golden
    ? GOLDEN_BLOCK
    : NORMAL_BLOCKS[(Math.random() * NORMAL_BLOCKS.length) | 0];

  const tpl = templates.get(def.file);
  let obj;
  if (tpl) {
    obj = tpl.clone(true);
  } else {

    obj = new THREE.Mesh(
      CUBE_GEO,
      new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: golden ? 1.0 : 0.4,
        metalness: 0.3,
        roughness: 0.5,
      })
    );
    obj.castShadow = true;
  }

  obj.userData.color = def.color;
  obj.userData.isGolden = golden;
  obj.userData.multiplier = golden ? GOLDEN_MULTIPLIER : 1;
  if (golden) obj.userData.glow = new THREE.PointLight(GOLD_COLOR, 3, 4);
  return obj;
}

export function createBossCube() {
  const material = new THREE.MeshStandardMaterial({
    color: BOSS_COLOR,
    metalness: 0.3,
    roughness: 0.4,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  });
  const mesh = new THREE.Mesh(BOSS_GEO, material);
  mesh.castShadow = true;
  mesh.userData.isBoss = true;
  mesh.userData.health = BOSS_HEALTH;
  mesh.userData.maxHealth = BOSS_HEALTH;
  mesh.userData.multiplier = BOSS_MULTIPLIER;
  mesh.userData.color = 0xff2020;
  return mesh;
}
