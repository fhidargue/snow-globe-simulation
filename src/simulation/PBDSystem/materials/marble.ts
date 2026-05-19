import { useSimulationConfig } from "@/hooks/simulationConfig";
import type { PBDSystem } from "@/simulation/PBDSystem/PBDSystem";
import { MATERIAL_TYPE, PARTICLE_RADIUS } from "@/utils/constants";
import { NEIGHBOR_OFFSETS } from "@/utils/utils";

const PARTICLE_STIFFNESS = 0.18;
const PARTICLE_COLLISION_EPSILON = 0.0015;

export function solveMarbleMaterial(system: PBDSystem) {
  const materialType = useSimulationConfig.getState().materialType;

  if (materialType !== MATERIAL_TYPE.MARBLE) return;

  const minDistance = PARTICLE_RADIUS * 2;
  const minDistanceSq = minDistance * minDistance;

  for (let i = 0; i < system.count; i++) {
    const indexA = i * 3;

    const px = system.positions[indexA]!;
    const py = system.positions[indexA + 1]!;
    const pz = system.positions[indexA + 2]!;

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

        const dx = px - system.positions[indexB]!;
        const dy = py - system.positions[indexB + 1]!;
        const dz = pz - system.positions[indexB + 2]!;

        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq <= 0 || distSq > minDistanceSq) continue;

        const dist = Math.sqrt(distSq);

        const penetration = minDistance - dist;

        if (penetration < PARTICLE_COLLISION_EPSILON) continue;

        const invDist = 1 / dist;

        const nx = dx * invDist;
        const ny = dy * invDist;
        const nz = dz * invDist;

        const correction = penetration * PARTICLE_STIFFNESS * 0.5;

        system.positions[indexA]! += nx * correction;
        system.positions[indexA + 1]! += ny * correction;
        system.positions[indexA + 2]! += nz * correction;

        system.positions[indexB]! -= nx * correction;
        system.positions[indexB + 1]! -= ny * correction;
        system.positions[indexB + 2]! -= nz * correction;

        system.sleeping[i] = 0;
        system.sleeping[j] = 0;
      }
    }
  }
}
