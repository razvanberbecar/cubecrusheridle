import * as THREE from 'three';

const REST_Y = 4;
const CRUSH_Y = 0.5;
const DOWN_MS = 120;
const UP_MS = 300;

const IDLE = 'idle';
const DOWN = 'down';
const UP = 'up';

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function createPress(scene) {
  const group = new THREE.Group();

  const loader = new THREE.TextureLoader();
  const B = import.meta.env.BASE_URL;

  const loadTex = (file, srgb = false) => {
    const t = loader.load(B + file, undefined, undefined,
      (e) => console.warn('[press] failed to load', file, e?.message || e));
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.anisotropy = 8;
    return t;
  };

  const texSet = (prefix) => ({
    map: loadTex(`${prefix}-albedo.jpg`, true),
    normalMap: loadTex(`${prefix}-normal.png`),
    roughnessMap: loadTex(`${prefix}-roughness.png`),
    metalnessMap: loadTex(`${prefix}-metallic.png`),
  });

  const metal = new THREE.MeshStandardMaterial({
    ...texSet('metal'),
    color: 0xffffff,
    metalness: 1.0,
    roughness: 1.0,
    envMapIntensity: 1.2,
  });

  let currentPrefix = 'metal';
  function setFixed(fixed) {
    const prefix = fixed ? 'metalclean' : 'metal';
    if (prefix === currentPrefix) return;
    currentPrefix = prefix;
    const next = texSet(prefix);
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
      metal[key]?.dispose();
      metal[key] = next[key];
    }
    metal.needsUpdate = true;
  }

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 1.7, 32),
    metal
  );
  body.position.y = 1.0;
  body.castShadow = true;
  group.add(body);

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.45, 0.3, 32),
    metal
  );
  plate.position.y = 0;
  plate.castShadow = true;
  group.add(plate);

  group.position.set(0, REST_Y, 0);
  scene.add(group);

  let phase = IDLE;
  let elapsed = 0;
  let impactT = 0;

  function trigger() {
    if (phase === DOWN) return false;
    phase = DOWN;
    elapsed = 0;
    return true;
  }

  function update(deltaMs) {
    let hitBottom = false;

    if (phase === DOWN) {
      elapsed += deltaMs;
      const t = Math.min(elapsed / DOWN_MS, 1);
      group.position.y = REST_Y + (CRUSH_Y - REST_Y) * t;
      if (t >= 1) {
        hitBottom = true;
        impactT = 1;
        phase = UP;
        elapsed = 0;
      }
    } else if (phase === UP) {
      elapsed += deltaMs;
      const t = Math.min(elapsed / UP_MS, 1);
      group.position.y = CRUSH_Y + (REST_Y - CRUSH_Y) * easeOutBack(t);
      if (t >= 1) {
        group.position.y = REST_Y;
        phase = IDLE;
      }
    }

    if (impactT > 0) {
      impactT = Math.max(0, impactT - deltaMs / 180);
      plate.scale.set(1 + 0.32 * impactT, 1 - 0.45 * impactT, 1 + 0.32 * impactT);
    }

    return hitBottom;
  }

  return {
    group,
    trigger,
    update,
    setFixed,
    get isPressing() {
      return phase === DOWN;
    },
  };
}
