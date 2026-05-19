import * as THREE from "three";

import { CABIN_COLLIDERS } from "@/utils/constants";
import { applyVelocityFriction, solveBoxCollision } from "@/utils/utils";

import type { PBDSystem } from "../PBDSystem";

const CABIN_BOXES = CABIN_COLLIDERS.map((collider) => ({
  center: new THREE.Vector3(
    collider.position[0],
    collider.position[1],
    collider.position[2],
  ),
  halfSize: new THREE.Vector3(
    0.72 * collider.scale[0] * 0.5,
    0.72 * collider.scale[1] * 0.5,
    0.72 * collider.scale[2] * 0.5,
  ),
  rotation: collider.rotation?.[2] || 0,
}));

export function solveCabinCollisions(system: PBDSystem) {
  for (let i = 0; i < system.count; i++) {
    const index = i * 3;

    let px = system.positions[index]!;
    let py = system.positions[index + 1]!;
    let pz = system.positions[index + 2]!;

    for (const box of CABIN_BOXES) {
      const collision = solveBoxCollision(
        px,
        py,
        pz,
        box.center,
        box.halfSize,
        box.rotation,
      );

      if (collision.collided) {
        px = collision.px;
        py = collision.py;
        pz = collision.pz;

        system.positions[index] = px;
        system.positions[index + 1] = py;
        system.positions[index + 2] = pz;

        applyVelocityFriction(system.previousPositions, index, px, py, pz);

        system.sleeping[i] = 0;
      }
    }
  }
}
