import * as THREE from "three";

import { useSimulationConfig } from "@/hooks/simulationConfig";
import { useSimulationStore } from "@/hooks/simulationStore";
import { solveCabinCollisions } from "@/simulation/PBDSystem/collisions/cabin";
import { solveGlobeCollision } from "@/simulation/PBDSystem/collisions/globe";
import { solveGroundCollision } from "@/simulation/PBDSystem/collisions/ground";
import { solveTreeCollisions } from "@/simulation/PBDSystem/collisions/trees";
import { solveMarbleMaterial } from "@/simulation/PBDSystem/materials/marble";
import { solveSnowMaterial } from "@/simulation/PBDSystem/materials/snow";
import {
  BASE_PARTICLE_SIZE,
  GRID_CELL_SIZE,
  PARTICLE_RADIUS,
} from "@/utils/constants";

const SUBSTEPS = 1;
const SOLVER_ITERATIONS = 1;
const SLEEP_DELAY = 20;
const WAKE_DISTANCE = PARTICLE_RADIUS * 1.5;
const WAKE_DISTANCE_SQ = WAKE_DISTANCE * WAKE_DISTANCE;
const INV_GRID_CELL_SIZE = 1 / GRID_CELL_SIZE;
const VELOCITY_DAMPING = 0.996;
const MAX_DELTA_TIME = 1 / 30;
const ANGULAR_FORCE_MULTIPLIER = 26;
const MIN_SLEEP_SPEED = 0.0000001;
const SLEEP_HEIGHT_THRESHOLD = -1.7;

/**
 * Main particle-based simulation system.
 * Handles integration, spatial hashing, materials,
 * collisions, and particle state.
 */
export class PBDSystem {
  count: number;
  positions: Float32Array;
  previousPositions: Float32Array;
  sleeping: Uint8Array;
  sizes: Float32Array;

  gridSize = 50000;
  cellCounts: Int32Array;
  cellOffsets: Int32Array;
  cellEntries: Int32Array;

  cellX: Int32Array;
  cellY: Int32Array;
  cellZ: Int32Array;

  private gravityVector = new THREE.Vector3();
  private inverseQuaternion = new THREE.Quaternion();

  constructor(count: number) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.previousPositions = new Float32Array(count * 3);
    this.sleeping = new Uint8Array(count);
    this.sizes = new Float32Array(count);
    this.cellCounts = new Int32Array(this.gridSize);
    this.cellOffsets = new Int32Array(this.gridSize);
    this.cellEntries = new Int32Array(count);
    this.cellX = new Int32Array(count);
    this.cellY = new Int32Array(count);
    this.cellZ = new Int32Array(count);

    for (let i = 0; i < count; i++) {
      const index = i * 3;

      const x = (Math.random() - 0.5) * 1.2;
      const y = Math.random() * 1.2 + 0.5;
      const z = (Math.random() - 0.5) * 1.2;

      this.positions[index]! = x;
      this.positions[index + 1]! = y;
      this.positions[index + 2]! = z;

      this.previousPositions[index]! = x;
      this.previousPositions[index + 1]! = y;
      this.previousPositions[index + 2]! = z;

      this.sizes[i]! = BASE_PARTICLE_SIZE;
    }
  }

  /**
   * Convert 3D grid coordinates into
   * a hashed spatial grid index.
   */
  hashCell(x: number, y: number, z: number) {
    /**
     * Prime multipliers used by the spatial hash function.
     * Large prime numbers help distribute particles more evenly.
     */
    const HASH_X = 73856093;
    const HASH_Y = 19349663;
    const HASH_Z = 83492791;

    return ((x * HASH_X) ^ (y * HASH_Y) ^ (z * HASH_Z)) >>> 0;
  }

  /**
   * Build spatial hash data used for
   * localized neighbor particle searches.
   */
  buildSpatialHash() {
    /**
     * Reset particle counts for all hash cells.
     */
    this.cellCounts.fill(0);

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      /**
       * Convert particle world positions
       * into discrete spatial grid coordinates.
       */
      const x = Math.floor(this.positions[index]! * INV_GRID_CELL_SIZE);
      const y = Math.floor(this.positions[index + 1]! * INV_GRID_CELL_SIZE);
      const z = Math.floor(this.positions[index + 2]! * INV_GRID_CELL_SIZE);

      this.cellX[i]! = x;
      this.cellY[i]! = y;
      this.cellZ[i]! = z;

      /**
       * Compute hash index for the current grid cell.
       */
      const hash = this.hashCell(x, y, z) % this.gridSize;

      /**
       * Count particles stored inside each hash cell.
       */
      this.cellCounts[hash]!++;
    }

    let total = 0;

    /**
     * Compute contiguous offsets for each hash cell.
     */
    for (let i = 0; i < this.gridSize; i++) {
      this.cellOffsets[i]! = total;

      total += this.cellCounts[i]!;
    }

    /**
     * Temporary offsets used while inserting particles
     * into the spatial hash entry buffer.
     */
    const offsets = new Int32Array(this.cellOffsets);

    for (let i = 0; i < this.count; i++) {
      const hash =
        this.hashCell(this.cellX[i]!, this.cellY[i]!, this.cellZ[i]!) %
        this.gridSize;

      const offset = offsets[hash]!;

      /**
       * Store particle index inside the hash cell range.
       */
      this.cellEntries[offset]! = i;

      offsets[hash]!++;
    }
  }

  /**
   * Main simulation update loop.
   * Handles integration, spatial hashing,
   * material constraints, and collisions.
   */
  update(delta: number) {
    /**
     * Clamp large frame times to help
     * maintain stable simulation behavior.
     */
    const clampedDelta = Math.min(delta, MAX_DELTA_TIME);
    const subDelta = clampedDelta / SUBSTEPS;

    for (let step = 0; step < SUBSTEPS; step++) {
      this.integrate(subDelta);
      this.buildSpatialHash();

      /**
       * Iteratively solve particle constraints
       * and environment collisions.
       */
      for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
        // Material behavior
        solveMarbleMaterial(this);
        solveSnowMaterial(this);

        // Environment collisions
        solveGroundCollision(this);
        solveTreeCollisions(this);
        solveCabinCollisions(this);
        solveGlobeCollision(this);
      }
    }
  }

  /**
   * Update particle positions using
   * Verlet integration and external forces.
   */
  integrate(delta: number) {
    /**
     * Current globe rotation and angular velocity.
     */
    const { angularVelocityX, angularVelocityY, globeQuaternion } =
      useSimulationStore.getState();

    const velocityStrength = useSimulationConfig.getState().velocity;

    /**
     * Rotate gravity relative to the globe orientation
     * so particles react to globe movement correctly.
     */
    this.inverseQuaternion.copy(globeQuaternion).invert();
    this.gravityVector
      .set(0, -velocityStrength, 0)
      .applyQuaternion(this.inverseQuaternion);

    /**
     * Additional forces generated from globe rotation
     * movement.
     */
    const gx =
      this.gravityVector.x - angularVelocityX * ANGULAR_FORCE_MULTIPLIER;
    const gy = this.gravityVector.y;
    const gz =
      this.gravityVector.z + angularVelocityY * ANGULAR_FORCE_MULTIPLIER;

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      const px = this.positions[index]!;
      const py = this.positions[index + 1]!;
      const pz = this.positions[index + 2]!;

      /**
       * Reconstruct particle velocity using
       * current and previous positions.
       */
      const vx = (px - this.previousPositions[index]!) * VELOCITY_DAMPING;
      const vy = (py - this.previousPositions[index + 1]!) * VELOCITY_DAMPING;
      const vz = (pz - this.previousPositions[index + 2]!) * VELOCITY_DAMPING;

      const speedSq = vx * vx + vy * vy + vz * vz;

      /**
       * Put slow particles to sleep to reduce unnecessary
       * updates.
       */
      if (speedSq < MIN_SLEEP_SPEED && py < SLEEP_HEIGHT_THRESHOLD) {
        this.sleeping[i]!++;

        if (this.sleeping[i]! > SLEEP_DELAY) {
          const dx = px - this.previousPositions[index]!;
          const dy = py - this.previousPositions[index + 1]!;
          const dz = pz - this.previousPositions[index + 2]!;

          const motionSq = dx * dx + dy * dy + dz * dz;

          /**
           * Skip updates for particles with extremely
           * small movement.
           */
          if (motionSq < WAKE_DISTANCE_SQ) {
            continue;
          }

          this.sleeping[i] = 0;
        }
      } else {
        this.sleeping[i]! = 0;
      }

      /**
       * Compute next particle position
       * using Verlet integration.
       */
      const nextX = px + vx + gx * delta * delta;
      const nextY = py + vy + gy * delta * delta;
      const nextZ = pz + vz + gz * delta * delta;

      /**
       * Store current positions for the next
       * simulation step.
       */
      this.previousPositions[index]! = px;
      this.previousPositions[index + 1]! = py;
      this.previousPositions[index + 2]! = pz;

      this.positions[index]! = nextX;
      this.positions[index + 1]! = nextY;
      this.positions[index + 2]! = nextZ;
    }
  }

  /**
   * Update particle scale values used during rendering.
   */
  updateParticleSizes(particleScale: number) {
    for (let i = 0; i < this.count; i++) {
      this.sizes[i] = BASE_PARTICLE_SIZE * particleScale;
    }
  }
}
