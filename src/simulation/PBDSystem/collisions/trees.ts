import * as THREE from "three";
import { LEFT_TREE, RIGHT_TREE } from "@/utils/constants";
import type { PBDSystem } from "../PBDSystem";
import {
  applyVelocityFriction,
  solveBoxCollision,
  solveVerticalCylinderCollision,
} from "@/utils/utils";

const TREES = [LEFT_TREE, RIGHT_TREE];

export function solveTreeCollisions(system: PBDSystem) {
  for (let i = 0; i < system.count; i++) {
    const index = i * 3;

    let px = system.positions[index]!;
    let py = system.positions[index + 1]!;
    let pz = system.positions[index + 2]!;

    for (const tree of TREES) {
      const trunkCollision = solveVerticalCylinderCollision(
        px,
        py,
        pz,
        tree.trunkPosition[0],
        tree.trunkPosition[1],
        tree.trunkPosition[2],
        0.04,
        0.5,
      );

      if (trunkCollision.collided) {
        px = trunkCollision.px;
        py = trunkCollision.py;
        pz = trunkCollision.pz;

        system.positions[index] = px;
        system.positions[index + 1] = py;
        system.positions[index + 2] = pz;

        applyVelocityFriction(
          system.previousPositions,
          index,
          px,
          py,
          pz,
          0.96,
        );

        system.sleeping[i] = 0;
      }

      for (const layer of tree.layers) {
        const center = new THREE.Vector3(
          layer.position[0],
          layer.position[1],
          layer.position[2],
        );

        const halfSize = new THREE.Vector3(
          0.7 * layer.scale[0] * 0.5,
          0.7 * layer.scale[1] * 0.5,
          0.7 * layer.scale[2] * 0.5,
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

          system.sleeping[i] = 0;
        }
      }
    }
  }
}
