import { PARTICLE_RADIUS } from "@/utils/constants";

import type { PBDSystem } from "../PBDSystem";

/**
 * Vertical offset for the snow ground ellipsoid.
 */
const GROUND_CENTER_Y = -1.58;

/**
 * Ellipsoid radii used for the snow mound shape.
 */
const GROUND_RADIUS_X = 1.82;
const GROUND_RADIUS_Y = GROUND_RADIUS_X * 0.1;
const GROUND_RADIUS_Z = 1.82;

const GROUND_FRICTION = 0.96;
const MIN_GROUND_SPEED = 0.00002;

export function solveGroundCollision(system: PBDSystem) {
  for (let i = 0; i < system.count; i++) {
    const index = i * 3;

    const x = system.positions[index]!;
    let y = system.positions[index + 1]!;
    const z = system.positions[index + 2]!;

    /**
     * Normalized ellipsoid footprint check.
     */
    const normalizedXZ =
      (x * x) / (GROUND_RADIUS_X * GROUND_RADIUS_X) +
      (z * z) / (GROUND_RADIUS_Z * GROUND_RADIUS_Z);

    // Skip particles outside the ground area
    if (normalizedXZ > 1) continue;

    /**
     * Ellipsoid surface height at the current position.
     */
    const surfaceY =
      GROUND_CENTER_Y + GROUND_RADIUS_Y * Math.sqrt(1 - normalizedXZ);

    const minY = surfaceY + PARTICLE_RADIUS;

    // Skip particles already above the surface
    if (y >= minY) continue;

    /**
     * Move particles back onto the ground surface.
     */
    y = minY;

    system.positions[index + 1]! = y;

    /**
     * Reconstruct velocity using Verlet positions.
     */
    let vx = x - system.previousPositions[index]!;
    let vy = y - system.previousPositions[index + 1]!;
    let vz = z - system.previousPositions[index + 2]!;

    /**
     * Remove downward velocity after collision.
     */
    if (vy < 0) {
      vy = 0;
    }

    /**
     * Apply ground friction to reduce sliding.
     */
    vx *= GROUND_FRICTION;
    vz *= GROUND_FRICTION;

    const speedSq = vx * vx + vz * vz;

    /**
     * Remove very small horizontal motion
     * to stabilize resting particles.
     */
    if (speedSq < MIN_GROUND_SPEED) {
      vx = 0;
      vz = 0;
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
