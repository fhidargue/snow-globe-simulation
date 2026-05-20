import * as THREE from "three";

import { CABIN_COLLIDERS } from "@/utils/constants";
import { applyVelocityFriction, solveBoxCollision } from "@/utils/utils";

import type { PBDSystem } from "../PBDSystem";
/**
 * Scale correction applied to cabin collider bounds.
 */
const CABIN_COLLIDER_SCALE = 0.72;

/**
 * Converts full collider scale into half extents.
 */
const HALF_EXTENT = 0.5;

/**
 * Precomputed collision boxes used for the cabin structure.
 * Collider transforms are converted into world-space box data.
 */
const CABIN_BOXES = CABIN_COLLIDERS.map((collider) => ({
  center: new THREE.Vector3(
    collider.position[0],
    collider.position[1],
    collider.position[2],
  ),
  halfSize: new THREE.Vector3(
    CABIN_COLLIDER_SCALE * collider.scale[0] * HALF_EXTENT,
    CABIN_COLLIDER_SCALE * collider.scale[1] * HALF_EXTENT,
    CABIN_COLLIDER_SCALE * collider.scale[2] * HALF_EXTENT,
  ),
  rotation: collider.rotation?.[2] || 0,
}));

/**
 * Resolve particle collisions against all cabin colliders.
 */
export function solveCabinCollisions(system: PBDSystem) {
  for (let i = 0; i < system.count; i++) {
    const index = i * 3;

    let px = system.positions[index]!;
    let py = system.positions[index + 1]!;
    let pz = system.positions[index + 2]!;

    /**
     * Check collisions against each cabin box collider.
     */
    for (const box of CABIN_BOXES) {
      const collision = solveBoxCollision(
        px,
        py,
        pz,
        box.center,
        box.halfSize,
        box.rotation,
      );

      /**
       * Apply corrected collision position.
       */
      if (collision.collided) {
        px = collision.px;
        py = collision.py;
        pz = collision.pz;

        system.positions[index] = px;
        system.positions[index + 1] = py;
        system.positions[index + 2] = pz;

        /**
         * Reduce excessive sliding after collision.
         */
        applyVelocityFriction(system.previousPositions, index, px, py, pz);

        /**
         * Wake the particle so it continues updating
         * after being moved by a collision.
         */
        system.sleeping[i] = 0;
      }
    }
  }
}
