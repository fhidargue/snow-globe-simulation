import * as THREE from "three";

import {
  BASE_PARTICLE_SIZE,
  GRID_CELL_SIZE,
  PARTICLE_RADIUS,
} from "@/utils/constants";

import { useSimulationStore } from "@/hooks/simulationStore";
import { useSimulationConfig } from "@/hooks/simulationConfig";
import { solveSnowMaterial } from "@/simulation/PBDSystem/materials/snow";
import { solveMarbleMaterial } from "@/simulation/PBDSystem/materials/marble";
import { solveGlobeCollision } from "@/simulation/PBDSystem/collisions/globe";
import { solveCabinCollisions } from "@/simulation/PBDSystem/collisions/cabin";
import { solveTreeCollisions } from "@/simulation/PBDSystem/collisions/trees";
import { solveGroundCollision } from "@/simulation/PBDSystem/collisions/ground";

const SUBSTEPS = 1;
const SOLVER_ITERATIONS = 1;
const SLEEP_DELAY = 20;
const WAKE_DISTANCE = PARTICLE_RADIUS * 1.5;
const WAKE_DISTANCE_SQ = WAKE_DISTANCE * WAKE_DISTANCE;
const INV_GRID_CELL_SIZE = 1 / GRID_CELL_SIZE;

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

  hashCell(x: number, y: number, z: number) {
    return ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0;
  }

  buildSpatialHash() {
    this.cellCounts.fill(0);

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      const x = Math.floor(this.positions[index]! * INV_GRID_CELL_SIZE);
      const y = Math.floor(this.positions[index + 1]! * INV_GRID_CELL_SIZE);
      const z = Math.floor(this.positions[index + 2]! * INV_GRID_CELL_SIZE);

      this.cellX[i]! = x;
      this.cellY[i]! = y;
      this.cellZ[i]! = z;

      const hash = this.hashCell(x, y, z) % this.gridSize;

      this.cellCounts[hash]!++;
    }

    let total = 0;

    for (let i = 0; i < this.gridSize; i++) {
      this.cellOffsets[i]! = total;

      total += this.cellCounts[i]!;
    }

    const offsets = new Int32Array(this.cellOffsets);

    for (let i = 0; i < this.count; i++) {
      const hash =
        this.hashCell(this.cellX[i]!, this.cellY[i]!, this.cellZ[i]!) %
        this.gridSize;

      const offset = offsets[hash]!;

      this.cellEntries[offset]! = i;

      offsets[hash]!++;
    }
  }

  update(delta: number) {
    const clampedDelta = Math.min(delta, 1 / 30);

    const subDelta = clampedDelta / SUBSTEPS;

    for (let step = 0; step < SUBSTEPS; step++) {
      this.integrate(subDelta);
      this.buildSpatialHash();

      for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
        // Materials
        solveMarbleMaterial(this);
        solveSnowMaterial(this);

        // Collisions
        solveGroundCollision(this);
        solveTreeCollisions(this);
        solveCabinCollisions(this);
        solveGlobeCollision(this);
      }
    }
  }

  integrate(delta: number) {
    const { angularVelocityX, angularVelocityY, globeQuaternion } =
      useSimulationStore.getState();

    const velocityStrength = useSimulationConfig.getState().velocity;

    this.inverseQuaternion.copy(globeQuaternion).invert();

    this.gravityVector
      .set(0, -velocityStrength, 0)
      .applyQuaternion(this.inverseQuaternion);

    const gx = this.gravityVector.x - angularVelocityX * 26;
    const gy = this.gravityVector.y;
    const gz = this.gravityVector.z + angularVelocityY * 26;

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      const px = this.positions[index]!;
      const py = this.positions[index + 1]!;
      const pz = this.positions[index + 2]!;

      const vx = (px - this.previousPositions[index]!) * 0.996;
      const vy = (py - this.previousPositions[index + 1]!) * 0.996;
      const vz = (pz - this.previousPositions[index + 2]!) * 0.996;

      const speedSq = vx * vx + vy * vy + vz * vz;

      if (speedSq < 0.0000001 && py < -1.7) {
        this.sleeping[i]!++;

        if (this.sleeping[i]! > SLEEP_DELAY) {
          const dx = px - this.previousPositions[index]!;
          const dy = py - this.previousPositions[index + 1]!;
          const dz = pz - this.previousPositions[index + 2]!;

          const motionSq = dx * dx + dy * dy + dz * dz;

          if (motionSq < WAKE_DISTANCE_SQ) {
            continue;
          }

          this.sleeping[i] = 0;
        }
      } else {
        this.sleeping[i]! = 0;
      }

      const nextX = px + vx + gx * delta * delta;
      const nextY = py + vy + gy * delta * delta;
      const nextZ = pz + vz + gz * delta * delta;

      this.previousPositions[index]! = px;
      this.previousPositions[index + 1]! = py;
      this.previousPositions[index + 2]! = pz;

      this.positions[index]! = nextX;
      this.positions[index + 1]! = nextY;
      this.positions[index + 2]! = nextZ;
    }
  }

  updateParticleSizes(particleScale: number) {
    for (let i = 0; i < this.count; i++) {
      this.sizes[i] = BASE_PARTICLE_SIZE * particleScale;
    }
  }
}
