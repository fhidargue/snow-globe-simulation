import * as THREE from "three";

import { LEFT_TREE, RIGHT_TREE } from "@/utils/constants";
import {
  applyVelocityFriction,
  solveBoxCollision,
  solveVerticalCylinderCollision,
} from "@/utils/utils";

import type { PBDSystem } from "../PBDSystem";

const TREES = [LEFT_TREE, RIGHT_TREE];
const TRUNK_RADIUS = 0.04;
const TRUNK_HEIGHT = 0.5;
const TREE_COLLIDER_SCALE = 0.7;
const HALF_EXTENT = 0.5;
const TREE_FRICTION = 0.96;

export function solveTreeCollisions(system: PBDSystem) {
  for (let i = 0; i < system.count; i++) {
    const index = i * 3;

    let px = system.positions[index]!;
    let py = system.positions[index + 1]!;
    let pz = system.positions[index + 2]!;

    /**
     * Check collisions against all tree colliders.
     */
    for (const tree of TREES) {
      /**
       * Resolve collisions against the tree trunk cylinder.
       */
      const trunkCollision = solveVerticalCylinderCollision(
        px,
        py,
        pz,
        tree.trunkPosition[0],
        tree.trunkPosition[1],
        tree.trunkPosition[2],
        TRUNK_RADIUS,
        TRUNK_HEIGHT,
      );

      if (trunkCollision.collided) {
        px = trunkCollision.px;
        py = trunkCollision.py;
        pz = trunkCollision.pz;

        system.positions[index] = px;
        system.positions[index + 1] = py;
        system.positions[index + 2] = pz;

        /**
         * Apply friction after collision.
         */
        applyVelocityFriction(
          system.previousPositions,
          index,
          px,
          py,
          pz,
          TREE_FRICTION,
        );

        /**
         * Wake the particle so it continues updating
         * after being moved by a collision.
         */
        system.sleeping[i] = 0;
      }

      /**
       * Resolve collisions against tree foliage layers.
       */
      for (const layer of tree.layers) {
        const center = new THREE.Vector3(
          layer.position[0],
          layer.position[1],
          layer.position[2],
        );

        const halfSize = new THREE.Vector3(
          TREE_COLLIDER_SCALE * layer.scale[0] * HALF_EXTENT,
          TREE_COLLIDER_SCALE * layer.scale[1] * HALF_EXTENT,
          TREE_COLLIDER_SCALE * layer.scale[2] * HALF_EXTENT,
        );

        const boxCollision = solveBoxCollision(px, py, pz, center, halfSize);

        if (boxCollision.collided) {
          px = boxCollision.px;
          py = boxCollision.py;
          pz = boxCollision.pz;

          system.positions[index] = px;
          system.positions[index + 1] = py;
          system.positions[index + 2] = pz;

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
}
