import {
  DYNAMIC_FRICTION,
  GLOBE_RADIUS,
  PARTICLE_RADIUS,
} from "@/utils/constants";

import type { PBDSystem } from "../PBDSystem";

export function solveGlobeCollision(system: PBDSystem) {
  const collisionSlop = 0.0005;
  const radius = GLOBE_RADIUS - PARTICLE_RADIUS - collisionSlop;
  const radiusSq = radius * radius;

  for (let i = 0; i < system.count; i++) {
    const index = i * 3;

    let x = system.positions[index]!;
    let y = system.positions[index + 1]!;
    let z = system.positions[index + 2]!;

    const distanceSq = x * x + y * y + z * z;

    if (distanceSq > radiusSq) {
      const distance = Math.sqrt(distanceSq);

      const nx = x / distance;
      const ny = y / distance;
      const nz = z / distance;

      x = nx * radius;
      y = ny * radius;
      z = nz * radius;

      system.positions[index]! = x;
      system.positions[index + 1]! = y;
      system.positions[index + 2]! = z;

      let vx = x - system.previousPositions[index]!;
      let vy = y - system.previousPositions[index + 1]!;
      let vz = z - system.previousPositions[index + 2]!;

      const normalVelocity = vx * nx + vy * ny + vz * nz;

      if (normalVelocity > 0) {
        vx -= nx * normalVelocity;
        vy -= ny * normalVelocity;
        vz -= nz * normalVelocity;
      }

      vx *= DYNAMIC_FRICTION;
      vy *= DYNAMIC_FRICTION;
      vz *= DYNAMIC_FRICTION;

      const speedSq = vx * vx + vy * vy + vz * vz;
      const maxSpeed = 0.12;

      if (speedSq > maxSpeed * maxSpeed) {
        const speed = Math.sqrt(speedSq);

        const scale = maxSpeed / speed;

        vx *= scale;
        vy *= scale;
        vz *= scale;
      }

      system.previousPositions[index]! = x - vx;
      system.previousPositions[index + 1]! = y - vy;
      system.previousPositions[index + 2]! = z - vz;

      system.sleeping[i] = 0;
    }
  }
}
