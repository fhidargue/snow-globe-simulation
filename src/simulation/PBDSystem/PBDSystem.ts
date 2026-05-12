import * as THREE from "three";

import {
  GLOBE_RADIUS,
  GRID_CELL_SIZE,
  PARTICLE_RADIUS,
  LEFT_TREE,
  RIGHT_TREE,
  CABIN_COLLIDERS,
} from "@/utils/constants";

import {
  applyVelocityFriction,
  solveVerticalCylinderCollision,
  solveBoxCollision,
} from "@/utils/utils";

import { useSimulationStore } from "@/hooks/simulationStore";
import { useSimulationConfig } from "@/hooks/simulationConfig";

const SUBSTEPS = 1;
const SOLVER_ITERATIONS = 1;
const DYNAMIC_FRICTION = 0.9985;
const SLEEP_DELAY = 20;
const WAKE_DISTANCE = PARTICLE_RADIUS * 1.5;
const WAKE_DISTANCE_SQ = WAKE_DISTANCE * WAKE_DISTANCE;
const INV_GRID_CELL_SIZE = 1 / GRID_CELL_SIZE;
const NEIGHBOR_OFFSETS: number[][] = [];

for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      NEIGHBOR_OFFSETS.push([x, y, z]);
    }
  }
}

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
  private trees = [LEFT_TREE, RIGHT_TREE];
  private cabinBoxes = CABIN_COLLIDERS.map((collider) => ({
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

      this.sizes[i]! = 0.018;
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
        this.solveParticleCollisions();
        this.solveGroundCollision();
        this.solveTreeCollisions();
        this.solveCabinCollisions();
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

  solveParticleCollisions() {
    const minDistance = PARTICLE_RADIUS * 2;
    const minDistanceSq = minDistance * minDistance;

    const stiffness = 0.18;

    for (let i = 0; i < this.count; i++) {
      const indexA = i * 3;

      const px = this.positions[indexA]!;
      const py = this.positions[indexA + 1]!;
      const pz = this.positions[indexA + 2]!;

      const cx = this.cellX[i]!;
      const cy = this.cellY[i]!;
      const cz = this.cellZ[i]!;

      for (let n = 0; n < NEIGHBOR_OFFSETS.length; n++) {
        const offset = NEIGHBOR_OFFSETS[n]!;

        const hash =
          this.hashCell(cx + offset[0]!, cy + offset[1]!, cz + offset[2]!) %
          this.gridSize;

        const start = this.cellOffsets[hash]!;
        const count = this.cellCounts[hash]!;
        const end = start + count;

        for (let k = start; k < end; k++) {
          const j = this.cellEntries[k]!;

          if (i >= j) continue;
          const indexB = j * 3;

          const dx = px - this.positions[indexB]!;
          const dy = py - this.positions[indexB + 1]!;
          const dz = pz - this.positions[indexB + 2]!;

          const distSq = dx * dx + dy * dy + dz * dz;
          const dist = Math.sqrt(distSq);

          const penetration = minDistance - dist;

          if (penetration < 0.0015) continue;
          if (distSq <= 0 || distSq > minDistanceSq) continue;

          const invDist = 1 / dist;

          const nx = dx * invDist;
          const ny = dy * invDist;
          const nz = dz * invDist;

          const correction = penetration * stiffness * 0.5;

          this.positions[indexA]! += nx * correction;
          this.positions[indexA + 1]! += ny * correction;
          this.positions[indexA + 2]! += nz * correction;

          this.positions[indexB]! -= nx * correction;
          this.positions[indexB + 1]! -= ny * correction;
          this.positions[indexB + 2]! -= nz * correction;

          this.sleeping[i] = 0;
          this.sleeping[j] = 0;
        }
      }
    }
  }

  solveGlobeCollision() {
    const collisionSlop = 0.0005;
    const radius = GLOBE_RADIUS - PARTICLE_RADIUS - collisionSlop;
    const radiusSq = radius * radius;

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      let x = this.positions[index]!;
      let y = this.positions[index + 1]!;
      let z = this.positions[index + 2]!;

      const distanceSq = x * x + y * y + z * z;

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

        if (normalVelocity > 0) {
          vx -= nx * normalVelocity;
          vy -= ny * normalVelocity;
          vz -= nz * normalVelocity;
        }

        vx *= DYNAMIC_FRICTION;
        vy *= DYNAMIC_FRICTION;
        vz *= DYNAMIC_FRICTION;

        const speedSq = vx * vx + vy * vy + vz * vz;
        const maxSpeed = 0.12;

        if (speedSq > maxSpeed * maxSpeed) {
          const speed = Math.sqrt(speedSq);

          const scale = maxSpeed / speed;

          vx *= scale;
          vy *= scale;
          vz *= scale;
        }

        this.previousPositions[index]! = x - vx;
        this.previousPositions[index + 1]! = y - vy;
        this.previousPositions[index + 2]! = z - vz;

        this.sleeping[i] = 0;
      }
    }
  }

  solveGroundCollision() {
    const centerY = -1.58;

    const radiusX = 1.82;
    const radiusY = 1.82 * 0.1;
    const radiusZ = 1.82;

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      const x = this.positions[index]!;
      let y = this.positions[index + 1]!;
      const z = this.positions[index + 2]!;

      const normalizedXZ =
        (x * x) / (radiusX * radiusX) + (z * z) / (radiusZ * radiusZ);

      // outside mound footprint
      if (normalizedXZ > 1) continue;

      // ellipsoid surface equation
      const surfaceY = centerY + radiusY * Math.sqrt(1 - normalizedXZ);

      const minY = surfaceY + PARTICLE_RADIUS;

      if (y >= minY) continue;

      y = minY;

      this.positions[index + 1]! = y;

      let vx = x - this.previousPositions[index]!;
      let vy = y - this.previousPositions[index + 1]!;
      let vz = z - this.previousPositions[index + 2]!;

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

      this.previousPositions[index]! = x - vx;
      this.previousPositions[index + 1]! = y - vy;
      this.previousPositions[index + 2]! = z - vz;

      this.sleeping[i] = 0;
    }
  }

  solveTreeCollisions() {
    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      let px = this.positions[index]!;
      let py = this.positions[index + 1]!;
      let pz = this.positions[index + 2]!;

      for (const tree of this.trees) {
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

          this.positions[index] = px;
          this.positions[index + 1] = py;
          this.positions[index + 2] = pz;

          applyVelocityFriction(
            this.previousPositions,
            index,
            px,
            py,
            pz,
            0.96,
          );

          this.sleeping[i] = 0;
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

            this.positions[index] = px;
            this.positions[index + 1] = py;
            this.positions[index + 2] = pz;

            applyVelocityFriction(this.previousPositions, index, px, py, pz);

            this.sleeping[i] = 0;
          }
        }
      }
    }
  }

  solveCabinCollisions() {
    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      let px = this.positions[index]!;
      let py = this.positions[index + 1]!;
      let pz = this.positions[index + 2]!;

      for (const box of this.cabinBoxes) {
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

          this.positions[index] = px;
          this.positions[index + 1] = py;
          this.positions[index + 2] = pz;

          applyVelocityFriction(this.previousPositions, index, px, py, pz);

          this.sleeping[i] = 0;
        }
      }
    }
  }
}
