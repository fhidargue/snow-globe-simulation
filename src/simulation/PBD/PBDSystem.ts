import * as THREE from "three";

import { GLOBE_RADIUS, GRID_CELL_SIZE, PARTICLE_RADIUS } from "../constants";

import { useSimulationStore } from "../simulationStore";
import { useSimulationConfig } from "../simulationConfig";

export class PBDSystem {
  count: number;
  positions: Float32Array;
  previousPositions: Float32Array;
  accelerations: Float32Array;
  sleeping: Uint8Array;
  sizes: Float32Array;
  spatialHash = new Map<string, number[]>();

  constructor(count: number) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.previousPositions = new Float32Array(count * 3);
    this.accelerations = new Float32Array(count * 3);
    this.sleeping = new Uint8Array(count);
    this.sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const index = i * 3;

      const x = (Math.random() - 0.5) * 1.5;
      const y = Math.random() * 1.5 + 0.5;
      const z = (Math.random() - 0.5) * 1.5;

      this.positions[index]! = x;
      this.positions[index + 1]! = y;
      this.positions[index + 2]! = z;

      this.previousPositions[index]! = x;
      this.previousPositions[index + 1]! = y;
      this.previousPositions[index + 2]! = z;

      this.sizes[i]! = 0.015 + Math.random() * 0.01;
    }
  }

  getCellKey(x: number, y: number, z: number) {
    return `${x},${y},${z}`;
  }

  buildSpatialHash() {
    this.spatialHash.clear();

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      const x = Math.floor(this.positions[index]! / GRID_CELL_SIZE);
      const y = Math.floor(this.positions[index + 1]! / GRID_CELL_SIZE);
      const z = Math.floor(this.positions[index + 2]! / GRID_CELL_SIZE);

      const key = this.getCellKey(x, y, z);

      if (!this.spatialHash.has(key)) {
        this.spatialHash.set(key, []);
      }

      this.spatialHash.get(key)?.push(i);
    }
  }

  update(delta: number) {
    this.buildSpatialHash();
    this.integrate(delta);

    for (let iteration = 0; iteration < 2; iteration++) {
      this.solveGlobeCollision();
      this.solveParticleCollisions();
      this.solveInnerObjectCollision();
    }
  }

  integrate(delta: number) {
    const { angularVelocityX, angularVelocityY, globeQuaternion } =
      useSimulationStore.getState();

    const gravityStrength = useSimulationConfig.getState().gravity;
    const inverseQuaternion = globeQuaternion.clone().invert();
    const gravityVector = new THREE.Vector3(0, -gravityStrength, 0);

    gravityVector.applyQuaternion(inverseQuaternion);

    const gx = gravityVector.x - angularVelocityX * 26;
    const gy = gravityVector.y;
    const gz = gravityVector.z + angularVelocityY * 26;

    for (let i = 0; i < this.count; i++) {
      const index = i * 3;

      const px = this.positions[index]!;
      const py = this.positions[index + 1]!;
      const pz = this.positions[index + 2]!;

      // Faster marble motion
      let vx = (px - this.previousPositions[index]!) * 0.992;
      const vy = (py - this.previousPositions[index + 1]!) * 0.992;
      let vz = (pz - this.previousPositions[index + 2]!) * 0.992;

      // Strong resting friction
      if (py < -2.1) {
        vx *= 0.88;
        vz *= 0.88;
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

  solveGlobeCollision() {
    const radius = GLOBE_RADIUS - PARTICLE_RADIUS;
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

        // Remove ALL normal bounce
        const normalVelocity = vx * nx + vy * ny + vz * nz;

        vx -= normalVelocity * nx;
        vy -= normalVelocity * ny;
        vz -= normalVelocity * nz;

        // Heavy damping
        vx *= 0.72;
        vy *= 0.72;
        vz *= 0.72;

        // Extra bottom damping
        if (ny < -0.7) {
          vx *= 0.45;
          vz *= 0.45;
        }

        this.previousPositions[index]! = x - vx;
        this.previousPositions[index + 1]! = y - vy;
        this.previousPositions[index + 2]! = z - vz;
      }
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

        for (let b = a + 1; b < length; b++) {
          const j = particles[b]!;
          const indexB = j * 3;

          const dx = this.positions[indexA]! - this.positions[indexB]!;
          const dy = this.positions[indexA + 1]! - this.positions[indexB + 1]!;
          const dz = this.positions[indexA + 2]! - this.positions[indexB + 2]!;

          const distanceSq = dx * dx + dy * dy + dz * dz;

          if (distanceSq > 0 && distanceSq < minDistanceSq) {
            const distance = Math.sqrt(distanceSq);

            const nx = dx / distance;
            const ny = dy / distance;
            const nz = dz / distance;

            const correction = (minDistance - distance) * 0.5;

            this.positions[indexA]! += nx * correction;
            this.positions[indexA + 1]! += ny * correction;
            this.positions[indexA + 2]! += nz * correction;

            this.positions[indexB]! -= nx * correction;
            this.positions[indexB + 1]! -= ny * correction;
            this.positions[indexB + 2]! -= nz * correction;

            const damping = 0.32;

            this.previousPositions[indexA]! +=
              (this.positions[indexA]! - this.previousPositions[indexA]!) *
              damping;

            this.previousPositions[indexA + 1]! +=
              (this.positions[indexA + 1]! -
                this.previousPositions[indexA + 1]!) *
              damping;

            this.previousPositions[indexA + 2]! +=
              (this.positions[indexA + 2]! -
                this.previousPositions[indexA + 2]!) *
              damping;

            this.previousPositions[indexB]! +=
              (this.positions[indexB]! - this.previousPositions[indexB]!) *
              damping;

            this.previousPositions[indexB + 1]! +=
              (this.positions[indexB + 1]! -
                this.previousPositions[indexB + 1]!) *
              damping;

            this.previousPositions[indexB + 2]! +=
              (this.positions[indexB + 2]! -
                this.previousPositions[indexB + 2]!) *
              damping;
          }
        }
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

      vx -= normalVelocity * nx;
      vy -= normalVelocity * ny;
      vz -= normalVelocity * nz;

      // Strong surface friction
      vx *= 0.82;
      vy *= 0.82;
      vz *= 0.82;

      this.previousPositions[index]! = x - vx;
      this.previousPositions[index + 1]! = y - vy;
      this.previousPositions[index + 2]! = z - vz;
    }
  }
}
