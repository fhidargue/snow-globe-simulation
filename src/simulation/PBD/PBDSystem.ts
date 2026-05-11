import * as THREE from "three";

import { GLOBE_RADIUS, GRID_CELL_SIZE, PARTICLE_RADIUS } from "../constants";

import { useSimulationStore } from "../simulationStore";
import { useSimulationConfig } from "../simulationConfig";

const SUBSTEPS = 2;
const SOLVER_ITERATIONS = 2;
const STATIC_FRICTION_THRESHOLD = 0.000002;
const DYNAMIC_FRICTION = 0.9985;
const BOX_FRICTION = 0.92;
const SLEEP_DELAY = 20;
const NEIGHBOR_OFFSETS = [
  [0, 0, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export class PBDSystem {
  count: number;
  positions: Float32Array;
  previousPositions: Float32Array;
  sleeping: Uint8Array;
  sizes: Float32Array;
  spatialHash = new Map<number, number[]>();

  private gravityVector = new THREE.Vector3();
  private inverseQuaternion = new THREE.Quaternion();

  constructor(count: number) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.previousPositions = new Float32Array(count * 3);
    this.sleeping = new Uint8Array(count);
    this.sizes = new Float32Array(count);

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

      this.sizes[i]! = 0.018;
    }
  }

  hashCell(x: number, y: number, z: number) {
    return ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) >>> 0;
  }

  buildSpatialHash() {
    this.spatialHash.clear();

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      const x = Math.floor(this.positions[index]! / GRID_CELL_SIZE);
      const y = Math.floor(this.positions[index + 1]! / GRID_CELL_SIZE);
      const z = Math.floor(this.positions[index + 2]! / GRID_CELL_SIZE);

      const hash = this.hashCell(x, y, z);

      let bucket = this.spatialHash.get(hash);

      if (!bucket) {
        bucket = [];
        this.spatialHash.set(hash, bucket);
      }

      bucket.push(i);
    }
  }

  update(delta: number) {
    const clampedDelta = Math.min(delta, 1 / 30);
    const subDelta = clampedDelta / SUBSTEPS;

    for (let step = 0; step < SUBSTEPS; step++) {
      this.integrate(subDelta);
      this.buildSpatialHash();

      for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration++) {
        this.solveParticleCollisions();
        this.solveInnerObjectCollision();
        this.solveGlobeCollision();
      }
    }
  }

  integrate(delta: number) {
    const { angularVelocityX, angularVelocityY, globeQuaternion } =
      useSimulationStore.getState();

    const gravityStrength = useSimulationConfig.getState().gravity;

    this.inverseQuaternion.copy(globeQuaternion).invert();
    this.gravityVector
      .set(0, -gravityStrength, 0)
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
          continue;
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

  solveParticleCollisions() {
    const minDistance = PARTICLE_RADIUS * 2;
    const minDistanceSq = minDistance * minDistance;

    for (const [, particles] of this.spatialHash) {
      const length = particles.length;

      for (let a = 0; a < length; a++) {
        const i = particles[a]!;
        const indexA = i * 3;

        const px = this.positions[indexA]!;
        const py = this.positions[indexA + 1]!;
        const pz = this.positions[indexA + 2]!;

        const cx = Math.floor(px / GRID_CELL_SIZE);
        const cy = Math.floor(py / GRID_CELL_SIZE);
        const cz = Math.floor(pz / GRID_CELL_SIZE);

        for (let n = 0; n < NEIGHBOR_OFFSETS.length; n++) {
          const offset = NEIGHBOR_OFFSETS[n]!;

          const hash = this.hashCell(
            cx + offset[0]!,
            cy + offset[1]!,
            cz + offset[2]!,
          );

          const neighbors = this.spatialHash.get(hash);

          if (!neighbors) continue;

          for (let b = 0; b < neighbors.length; b++) {
            const j = neighbors[b]!;

            if (i >= j) continue;

            const indexB = j * 3;

            const dx = px - this.positions[indexB]!;
            const dy = py - this.positions[indexB + 1]!;
            const dz = pz - this.positions[indexB + 2]!;

            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq <= 0 || distSq > minDistanceSq) continue;

            const dist = Math.sqrt(distSq);
            const invDist = 1 / dist;

            const nx = dx * invDist;
            const ny = dy * invDist;
            const nz = dz * invDist;

            const penetration = minDistance - dist;

            const stiffness = 0.18;

            const correction = penetration * stiffness * 0.5;

            this.positions[indexA]! += nx * correction;
            this.positions[indexA + 1]! += ny * correction;
            this.positions[indexA + 2]! += nz * correction;

            this.positions[indexB]! -= nx * correction;
            this.positions[indexB + 1]! -= ny * correction;
            this.positions[indexB + 2]! -= nz * correction;
          }
        }
      }
    }
  }

  solveGlobeCollision() {
    const radius = GLOBE_RADIUS - PARTICLE_RADIUS;
    const radiusSq = radius * radius;

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      let x = this.positions[index]!;
      let y = this.positions[index + 1]!;
      let z = this.positions[index + 2]!;

      const distanceSq = x * x + y * y + z * z;

      if (distanceSq < radiusSq * 0.7) continue;

      if (distanceSq > radiusSq) {
        const distance = Math.sqrt(distanceSq);

        const nx = x / distance;
        const ny = y / distance;
        const nz = z / distance;

        x = nx * radius;
        y = ny * radius;
        z = nz * radius;

        this.positions[index]! = x;
        this.positions[index + 1]! = y;
        this.positions[index + 2]! = z;

        let vx = x - this.previousPositions[index]!;
        let vy = y - this.previousPositions[index + 1]!;
        let vz = z - this.previousPositions[index + 2]!;

        const normalVelocity = vx * nx + vy * ny + vz * nz;

        vx -= nx * normalVelocity;
        vy -= ny * normalVelocity;
        vz -= nz * normalVelocity;

        vx *= DYNAMIC_FRICTION;
        vy *= DYNAMIC_FRICTION;
        vz *= DYNAMIC_FRICTION;

        this.previousPositions[index]! = x - vx;
        this.previousPositions[index + 1]! = y - vy;
        this.previousPositions[index + 2]! = z - vz;
      }
    }
  }

  solveInnerObjectCollision() {
    const boxMinX = -0.6;
    const boxMinY = -2.3;
    const boxMinZ = -0.6;
    const boxMaxX = 0.6;
    const boxMaxY = -1.2;
    const boxMaxZ = 0.6;

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      let x = this.positions[index]!;
      let y = this.positions[index + 1]!;
      let z = this.positions[index + 2]!;

      const inside =
        x > boxMinX &&
        x < boxMaxX &&
        y > boxMinY &&
        y < boxMaxY &&
        z > boxMinZ &&
        z < boxMaxZ;

      if (!inside) continue;

      const left = Math.abs(x - boxMinX);
      const right = Math.abs(boxMaxX - x);
      const bottom = Math.abs(y - boxMinY);
      const top = Math.abs(boxMaxY - y);
      const back = Math.abs(z - boxMinZ);
      const front = Math.abs(boxMaxZ - z);

      const minDistance = Math.min(left, right, bottom, top, back, front);

      let nx = 0;
      let ny = 0;
      let nz = 0;

      if (minDistance === left) {
        x = boxMinX - PARTICLE_RADIUS;

        nx = -1;
      } else if (minDistance === right) {
        x = boxMaxX + PARTICLE_RADIUS;

        nx = 1;
      } else if (minDistance === bottom) {
        y = boxMinY - PARTICLE_RADIUS;

        ny = -1;
      } else if (minDistance === top) {
        y = boxMaxY + PARTICLE_RADIUS;

        ny = 1;
      } else if (minDistance === back) {
        z = boxMinZ - PARTICLE_RADIUS;

        nz = -1;
      } else {
        z = boxMaxZ + PARTICLE_RADIUS;

        nz = 1;
      }

      this.positions[index]! = x;
      this.positions[index + 1]! = y;
      this.positions[index + 2]! = z;

      let vx = x - this.previousPositions[index]!;
      let vy = y - this.previousPositions[index + 1]!;
      let vz = z - this.previousPositions[index + 2]!;

      const normalVelocity = vx * nx + vy * ny + vz * nz;

      vx -= nx * normalVelocity;
      vy -= ny * normalVelocity;
      vz -= nz * normalVelocity;

      vx *= BOX_FRICTION;
      vy *= BOX_FRICTION;
      vz *= BOX_FRICTION;

      const speedSq = vx * vx + vy * vy + vz * vz;

      if (speedSq < STATIC_FRICTION_THRESHOLD) {
        vx = 0;
        vy = 0;
        vz = 0;
      }

      this.previousPositions[index]! = x - vx;
      this.previousPositions[index + 1]! = y - vy;
      this.previousPositions[index + 2]! = z - vz;
    }
  }
}
