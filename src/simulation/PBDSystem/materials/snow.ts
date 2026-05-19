import { useSimulationConfig } from "@/hooks/simulationConfig";
import type { PBDSystem } from "@/simulation/PBDSystem/PBDSystem";
import { MATERIAL_TYPE, PARTICLE_RADIUS } from "@/utils/constants";
import { NEIGHBOR_OFFSETS } from "@/utils/utils";

const PARTICLE_STIFFNESS = 0.18;
const PARTICLE_COLLISION_EPSILON = 0.0015;
const SNOW_STICK_RADIUS = PARTICLE_RADIUS * 3.6;

export function solveSnowMaterial(system: PBDSystem) {
  const materialType = useSimulationConfig.getState().materialType;

  if (materialType !== MATERIAL_TYPE.SNOW) return;

  const minDistance = PARTICLE_RADIUS * 2;
  const minDistanceSq = minDistance * minDistance;
  const stickRadiusSq = SNOW_STICK_RADIUS * SNOW_STICK_RADIUS;

  for (let i = 0; i < system.count; i++) {
    const indexA = i * 3;

    let px = system.positions[indexA]!;
    let py = system.positions[indexA + 1]!;
    let pz = system.positions[indexA + 2]!;

    const cx = system.cellX[i]!;
    const cy = system.cellY[i]!;
    const cz = system.cellZ[i]!;

    for (let n = 0; n < NEIGHBOR_OFFSETS.length; n++) {
      const offset = NEIGHBOR_OFFSETS[n]!;

      const hash =
        system.hashCell(cx + offset[0]!, cy + offset[1]!, cz + offset[2]!) %
        system.gridSize;

      const start = system.cellOffsets[hash]!;
      const count = system.cellCounts[hash]!;
      const end = start + count;

      for (let k = start; k < end; k++) {
        const j = system.cellEntries[k]!;

        if (i >= j) continue;

        const indexB = j * 3;

        let bx = system.positions[indexB]!;
        let by = system.positions[indexB + 1]!;
        let bz = system.positions[indexB + 2]!;

        const dx = px - bx;
        const dy = py - by;
        const dz = pz - bz;

        const distSq = dx * dx + dy * dy + dz * dz;

        // Particle collision
        if (distSq > 0 && distSq < minDistanceSq) {
          const dist = Math.sqrt(distSq);
          const penetration = minDistance - dist;

          if (penetration > PARTICLE_COLLISION_EPSILON) {
            const invDist = 1 / dist;

            const nx = dx * invDist;
            const ny = dy * invDist;
            const nz = dz * invDist;

            const correction = penetration * PARTICLE_STIFFNESS * 0.5;

            px += nx * correction;
            py += ny * correction;
            pz += nz * correction;

            bx -= nx * correction;
            by -= ny * correction;
            bz -= nz * correction;

            system.positions[indexA] = px;
            system.positions[indexA + 1] = py;
            system.positions[indexA + 2] = pz;

            system.positions[indexB] = bx;
            system.positions[indexB + 1] = by;
            system.positions[indexB + 2] = bz;

            system.sleeping[i] = 0;
            system.sleeping[j] = 0;
          }
        }

        // Snow friction clostering
        if (distSq <= minDistanceSq || distSq > stickRadiusSq) {
          continue;
        }

        const dist = Math.sqrt(distSq);
        const influence = 1 - dist / SNOW_STICK_RADIUS;
        const damping = 1 - influence * 0.025;

        const velAX = px - system.previousPositions[indexA]!;
        const velAZ = pz - system.previousPositions[indexA + 2]!;

        const velBX = bx - system.previousPositions[indexB]!;
        const velBZ = bz - system.previousPositions[indexB + 2]!;

        system.previousPositions[indexA] = px - velAX * damping;
        system.previousPositions[indexA + 2] = pz - velAZ * damping;

        system.previousPositions[indexB] = bx - velBX * damping;
        system.previousPositions[indexB + 2] = bz - velBZ * damping;
      }
    }
  }
}
