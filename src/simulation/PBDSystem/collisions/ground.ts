import { PARTICLE_RADIUS } from "@/utils/constants";
import type { PBDSystem } from "../PBDSystem";

export function solveGroundCollision(system: PBDSystem) {
  const centerY = -1.58;

  const radiusX = 1.82;
  const radiusY = 1.82 * 0.1;
  const radiusZ = 1.82;

  for (let i = 0; i < system.count; i++) {
    const index = i * 3;

    const x = system.positions[index]!;
    let y = system.positions[index + 1]!;
    const z = system.positions[index + 2]!;

    const normalizedXZ =
      (x * x) / (radiusX * radiusX) + (z * z) / (radiusZ * radiusZ);

    // outside mound footprint
    if (normalizedXZ > 1) continue;

    // ellipsoid surface equation
    const surfaceY = centerY + radiusY * Math.sqrt(1 - normalizedXZ);

    const minY = surfaceY + PARTICLE_RADIUS;

    if (y >= minY) continue;

    y = minY;

    system.positions[index + 1]! = y;

    let vx = x - system.previousPositions[index]!;
    let vy = y - system.previousPositions[index + 1]!;
    let vz = z - system.previousPositions[index + 2]!;

    // remove downward motion
    if (vy < 0) {
      vy = 0;
    }

    // ground friction
    vx *= 0.96;
    vz *= 0.96;

    const speedSq = vx * vx + vz * vz;

    if (speedSq < 0.00002) {
      vx = 0;
      vz = 0;
    }

    system.previousPositions[index]! = x - vx;
    system.previousPositions[index + 1]! = y - vy;
    system.previousPositions[index + 2]! = z - vz;

    system.sleeping[i] = 0;
  }
}
