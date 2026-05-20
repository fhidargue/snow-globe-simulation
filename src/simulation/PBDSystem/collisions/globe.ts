import {
  DYNAMIC_FRICTION,
  GLOBE_RADIUS,
  PARTICLE_RADIUS,
} from "@/utils/constants";

import type { PBDSystem } from "../PBDSystem";

/**
 * Small collision offset used to prevent particles
 * from repeatedly intersecting the globe boundary.
 */
const COLLISION_SLOP = 0.0005;

/**
 * Maximum allowed collision velocity.
 * Prevents unstable bouncing at high speeds.
 */
const MAX_COLLISION_SPEED = 0.12;

export function solveGlobeCollision(system: PBDSystem) {
  /**
   * Effective collision radius inside the globe.
   */
  const radius = GLOBE_RADIUS - PARTICLE_RADIUS - COLLISION_SLOP;
  const radiusSq = radius * radius;

  for (let i = 0; i < system.count; i++) {
    const index = i * 3;

    let x = system.positions[index]!;
    let y = system.positions[index + 1]!;
    let z = system.positions[index + 2]!;

    /**
     * Squared distance from the globe center.
     */
    const distanceSq = x * x + y * y + z * z;

    /**
     * Detect particles outside the globe boundary.
     */
    if (distanceSq > radiusSq) {
      const distance = Math.sqrt(distanceSq);

      /**
       * Collision surface normal.
       */
      const nx = x / distance;
      const ny = y / distance;
      const nz = z / distance;

      /**
       * Reposition particle onto the globe surface.
       */

      x = nx * radius;
      y = ny * radius;
      z = nz * radius;

      system.positions[index]! = x;
      system.positions[index + 1]! = y;
      system.positions[index + 2]! = z;

      /**
       * Reconstruct velocity using Verlet positions.
       */
      let vx = x - system.previousPositions[index]!;
      let vy = y - system.previousPositions[index + 1]!;
      let vz = z - system.previousPositions[index + 2]!;

      /**
       * Velocity projected onto the collision normal.
       */
      const normalVelocity = vx * nx + vy * ny + vz * nz;

      /**
       * Remove outward velocity to prevent particles escaping
       * the globe.
       */
      if (normalVelocity > 0) {
        vx -= nx * normalVelocity;
        vy -= ny * normalVelocity;
        vz -= nz * normalVelocity;
      }

      /**
       * Apply surface friction after collision.
       */
      vx *= DYNAMIC_FRICTION;
      vy *= DYNAMIC_FRICTION;
      vz *= DYNAMIC_FRICTION;

      /**
       * Limit excessive collision velocity
       * to improve simulation stability.
       */
      const speedSq = vx * vx + vy * vy + vz * vz;

      if (speedSq > MAX_COLLISION_SPEED * MAX_COLLISION_SPEED) {
        const speed = Math.sqrt(speedSq);

        const scale = MAX_COLLISION_SPEED / speed;

        vx *= scale;
        vy *= scale;
        vz *= scale;
      }

      /**
       * Update previous positions with corrected velocity.
       */
      system.previousPositions[index]! = x - vx;
      system.previousPositions[index + 1]! = y - vy;
      system.previousPositions[index + 2]! = z - vz;

      /**
       * Wake the particle so it continues updating
       * after being moved by a collision.
       */
      system.sleeping[i] = 0;
    }
  }
}
