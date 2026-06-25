import * as THREE from 'three';

const POOL_SIZE = 100;
const GRAVITY = 9.8;
const LIFETIME = 0.8;
const BASE_RADIUS = 0.1;
const PARTICLE_SIZES = [0.05, 0.1, 0.18];
const SHARED_GEO = new THREE.SphereGeometry(BASE_RADIUS, 6, 6);

export function createParticles(scene) {
  const pool = [];

  for (let i = 0; i < POOL_SIZE; i++) {

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(SHARED_GEO, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = false;
    scene.add(mesh);
    pool.push({
      mesh,
      velocity: new THREE.Vector3(),
      life: 0,
    });
  }

  let cursor = 0;

  function burst(position, color) {
    const count = 20 + ((Math.random() * 11) | 0);
    for (let n = 0; n < count; n++) {
      const p = pool[cursor];
      cursor = (cursor + 1) % POOL_SIZE;

      p.mesh.position.copy(position);
      p.mesh.material.color.setHex(color);
      p.mesh.material.emissive.setHex(color);
      p.mesh.material.opacity = 1;

      const size = PARTICLE_SIZES[(Math.random() * PARTICLE_SIZES.length) | 0];
      p.mesh.scale.setScalar(size / BASE_RADIUS);
      p.mesh.visible = true;

      p.velocity.set(
        (Math.random() - 0.5) * 10,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 10
      );
      p.life = LIFETIME;
    }
  }

  function update(delta) {
    for (const p of pool) {
      if (p.life <= 0) continue;
      p.velocity.y -= GRAVITY * delta;
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.life -= delta;

      p.mesh.material.opacity = Math.max(0, p.life / LIFETIME);
      if (p.life <= 0) p.mesh.visible = false;
    }
  }

  return { burst, update };
}
