import { useSimulationConfig } from "@/hooks/simulationConfig";
import type { PBDSystem } from "@/simulation/PBDSystem/PBDSystem";
import { MATERIAL_TYPE, PARTICLE_RADIUS } from "@/utils/constants";
import { NEIGHBOR_OFFSETS } from "@/utils/utils";

const PARTICLE_STIFFNESS = 0.18;
const PARTICLE_COLLISION_EPSILON = 0.0015;
const SNOW_STICK_RADIUS = PARTICLE_RADIUS * 3.6;

/**
 * Controls how much nearby particles
 * slow each other down.
 */
const SNOW_CLUSTER_DAMPING = 0.025;

export function solveSnowMaterial(system: PBDSystem) {
  const materialType = useSimulationConfig.getState().materialType;

  /**
   * Skip solver if snow mode is disabled.
   */
  if (materialType !== MATERIAL_TYPE.SNOW) return;

  /**
   * Minimum allowed particle separation distance.
   */
  const minDistance = PARTICLE_RADIUS * 2;
  const minDistanceSq = minDistance * minDistance;
  const stickRadiusSq = SNOW_STICK_RADIUS * SNOW_STICK_RADIUS;

  for (let i = 0; i < system.count; i++) {
    const indexA = i * 3;

    let px = system.positions[indexA]!;
    let py = system.positions[indexA + 1]!;
    let pz = system.positions[indexA + 2]!;

    /**
     * Current spatial hash grid cell.
     */
    const cx = system.cellX[i]!;
    const cy = system.cellY[i]!;
    const cz = system.cellZ[i]!;

    /**
     * Search neighboring spatial hash cells.
     */
    for (let n = 0; n < NEIGHBOR_OFFSETS.length; n++) {
      const offset = NEIGHBOR_OFFSETS[n]!;

      const hash =
        system.hashCell(cx + offset[0]!, cy + offset[1]!, cz + offset[2]!) %
        system.gridSize;

      const start = system.cellOffsets[hash]!;
      const count = system.cellCounts[hash]!;
      const end = start + count;

      /**
       * Resolve neighboring particle interactions.
       */
      for (let k = start; k < end; k++) {
        const j = system.cellEntries[k]!;

        // Avoid duplicate collision checks
        if (i >= j) continue;

        const indexB = j * 3;

        let bx = system.positions[indexB]!;
        let by = system.positions[indexB + 1]!;
        let bz = system.positions[indexB + 2]!;

        const dx = px - bx;
        const dy = py - by;
        const dz = pz - bz;

        const distSq = dx * dx + dy * dy + dz * dz;

        /**
         * Resolve direct particle collisions.
         */
        if (distSq > 0 && distSq < minDistanceSq) {
          const dist = Math.sqrt(distSq);

          /**
           * Amount of particle overlap.
           */
          const penetration = minDistance - dist;

          if (penetration > PARTICLE_COLLISION_EPSILON) {
            const invDist = 1 / dist;

            /**
             * Collision normal direction.
             */
            const nx = dx * invDist;
            const ny = dy * invDist;
            const nz = dz * invDist;

            /**
             * Position correction applied
             * symmetrically to both particles.
             */
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

            /**
             * Wake both particles after collision response.
             */
            system.sleeping[i] = 0;
            system.sleeping[j] = 0;
          }
        }

        /**
         * Apply localized snow clustering behavior.
         */
        if (distSq <= minDistanceSq || distSq > stickRadiusSq) {
          continue;
        }

        const dist = Math.sqrt(distSq);

        /**
         * Influence decreases with distance.
         */
        const influence = 1 - dist / SNOW_STICK_RADIUS;

        /**
         * Nearby particles slightly reduce
         * each other's movement.
         */
        const damping = 1 - influence * SNOW_CLUSTER_DAMPING;

        const velAX = px - system.previousPositions[indexA]!;
        const velAZ = pz - system.previousPositions[indexA + 2]!;

        const velBX = bx - system.previousPositions[indexB]!;
        const velBZ = bz - system.previousPositions[indexB + 2]!;

        /**
         * Apply damping through Verlet velocity reconstruction.
         */
        system.previousPositions[indexA] = px - velAX * damping;
        system.previousPositions[indexA + 2] = pz - velAZ * damping;

        system.previousPositions[indexB] = bx - velBX * damping;
        system.previousPositions[indexB + 2] = bz - velBZ * damping;
      }
    }
  }
}
