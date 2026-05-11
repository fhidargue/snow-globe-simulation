import * as THREE from "three";

import {
  BOX_FRICTION,
  DYNAMIC_FRICTION,
  GLOBE_RADIUS,
  GRID_CELL_SIZE,
  PARTICLE_RADIUS,
  STATIC_FRICTION_THRESHOLD,
} from "../constants";

import { useSimulationStore } from "../simulationStore";
import { useSimulationConfig } from "../simulationConfig";

// ─── Tuning ────────────────────────────────────────────────────────────────
const SUBSTEPS = 3;
const SOLVER_ITERATIONS = 3;
const SLEEP_THRESHOLD_SQ = 1e-5;
const SLEEP_DELAY = 60; // Uint8Array-safe (< 255), ~1s at 60fps
const CELL_COUNT = 32768; // power-of-2

export class PBDSystem {
  count: number;
  positions: Float32Array;
  previousPositions: Float32Array;
  accelerations: Float32Array;
  sizes: Float32Array;
  sleeping: Uint8Array;

  // ── Sort-based spatial hash ───────────────────────────────────────────────
  // We keep two parallel arrays that store the sorted particle list:
  //   cellCount[c]  = how many particles are in cell c  (built in pass 1)
  //   cellStart[c]  = where cell c begins in cellOrder  (built in pass 2)
  //   cellOrder[k]  = particle index at sorted position k (built in pass 3)
  //
  // Generation stamps on cellCount avoid fill() on the full CELL_COUNT array.
  // cellStart[CELL_COUNT] is the sentinel used by the solver range query.

  private cellCount: Int32Array; // count per cell, lazily reset by generation
  private cellStart: Int32Array; // start index per cell in cellOrder (+1 sentinel)
  private cellOrder: Int32Array; // particles sorted by cell
  private cellIds: Int32Array; // cell hash per particle (-1 = asleep)
  private cellGen: Uint32Array; // generation stamp per cell for lazy reset
  private currentGen: number = 0;

  constructor(count: number) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.previousPositions = new Float32Array(count * 3);
    this.accelerations = new Float32Array(count * 3);
    this.sleeping = new Uint8Array(count);
    this.sizes = new Float32Array(count);

    this.cellCount = new Int32Array(CELL_COUNT);
    this.cellStart = new Int32Array(CELL_COUNT + 1);
    this.cellOrder = new Int32Array(count);
    this.cellIds = new Int32Array(count);
    this.cellGen = new Uint32Array(CELL_COUNT);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = (Math.random() - 0.5) * 1.5;
      const y = Math.random() * 1.5 + 0.5;
      const z = (Math.random() - 0.5) * 1.5;

      this.positions[idx]! = x;
      this.positions[idx + 1]! = y;
      this.positions[idx + 2]! = z;

      this.previousPositions[idx]! = x;
      this.previousPositions[idx + 1]! = y;
      this.previousPositions[idx + 2]! = z;

      this.sizes[i]! = 0.015 + Math.random() * 0.01;
    }
  }

  // ── Hash function ─────────────────────────────────────────────────────────

  private hashCell(cx: number, cy: number, cz: number): number {
    return (
      (((cx * 92837111) ^ (cy * 689287499) ^ (cz * 283923481)) >>> 0) &
      (CELL_COUNT - 1)
    );
  }

  // ── Spatial hash — three clean passes, no aliasing ───────────────────────

  private buildSpatialHash() {
    this.currentGen++;
    const gen = this.currentGen;

    // Pass 1 — assign cell id + count, lazily zeroing counts via generation
    for (let i = 0; i < this.count; i++) {
      if (this.sleeping[i]! >= SLEEP_DELAY) {
        this.cellIds[i]! = -1;
        continue;
      }
      const idx = i * 3;
      const cx = Math.floor(this.positions[idx]! / GRID_CELL_SIZE) | 0;
      const cy = Math.floor(this.positions[idx + 1]! / GRID_CELL_SIZE) | 0;
      const cz = Math.floor(this.positions[idx + 2]! / GRID_CELL_SIZE) | 0;
      const c = this.hashCell(cx, cy, cz);
      this.cellIds[i]! = c;

      if (this.cellGen[c]! !== gen) {
        this.cellGen[c]! = gen;
        this.cellCount[c]! = 0; // lazy reset
      }
      this.cellCount[c]!++;
    }

    // Pass 2 — prefix sum over active cells only to fill cellStart.
    // We iterate particles (not cells) so we only touch cells that have
    // particles — O(n) not O(CELL_COUNT).
    // Use a secondary generation stamp stored in cellStart itself:
    // we mark a cell as "prefix-summed" by setting cellStart[CELL_COUNT]
    // as a running total and using a visited flag in cellGen (reuse upper bits
    // is fiddly) — simpler: use a dedicated Uint8Array visited flag reset
    // via the same generation trick, but that's another array.
    //
    // Cleanest O(n) approach: collect the set of active cell ids first,
    // then prefix-sum only those. We reuse cellOrder as scratch here
    // (it gets overwritten in pass 3 anyway).

    let activeCellCount = 0;
    for (let i = 0; i < this.count; i++) {
      const c = this.cellIds[i]!;
      if (c < 0) continue;
      // cellGen[c] === gen means it was set in pass 1.
      // We flip it to gen+1 once we've recorded it, so we collect each cell once.
      if (this.cellGen[c]! === gen) {
        this.cellGen[c]! = gen + 1; // mark as recorded
        this.cellOrder[activeCellCount++]! = c; // store cell id (scratch)
      }
    }

    // Prefix sum over the active cell ids collected above
    let total = 0;
    for (let k = 0; k < activeCellCount; k++) {
      const c = this.cellOrder[k]!;
      this.cellStart[c]! = total;
      total += this.cellCount[c]!;
      this.cellCount[c]! = 0; // reset count — reuse as insertion offset in pass 3
    }
    this.cellStart[CELL_COUNT]! = total; // sentinel

    // Pass 3 — scatter particles into cellOrder using cellStart + offset
    for (let i = 0; i < this.count; i++) {
      const c = this.cellIds[i]!;
      if (c < 0) continue;
      this.cellOrder[this.cellStart[c]! + this.cellCount[c]!]! = i;
      this.cellCount[c]!++;
    }
    // After pass 3: cellStart[c] is the correct start, cellStart[c+1] is
    // the correct end ONLY for adjacent active cells. For the solver we use
    // cellStart[c] and cellStart[c] + cellCount[c] as the range.
    // Rebuild cellStart[c+1] properly as a sentinel array:
    for (let k = 0; k < activeCellCount; k++) {
      const c = this.cellOrder[k]!;
      this.cellStart[c + 1 < CELL_COUNT ? c + 1 : CELL_COUNT]! =
        this.cellStart[c]! + this.cellCount[c]!;
    }
  }

  // ── Solver range query helper ─────────────────────────────────────────────
  // Returns [start, end) for a given cell hash. end is stored in cellCount.

  private getCellRange(h: number): [number, number] {
    const start = this.cellStart[h]!;
    const end = start + this.cellCount[h]!;
    return [start, end];
  }

  // ── Main update ───────────────────────────────────────────────────────────

  update(delta: number) {
    const clampedDelta = Math.min(delta, 1 / 30);
    const subDelta = clampedDelta / SUBSTEPS;

    const { angularVelocityX, angularVelocityY, globeQuaternion } =
      useSimulationStore.getState();
    const gravityStrength = useSimulationConfig.getState().gravity;

    const invQ = globeQuaternion.clone().invert();
    const gVec = new THREE.Vector3(0, -gravityStrength, 0).applyQuaternion(
      invQ,
    );
    const gx = gVec.x - angularVelocityX * 26;
    const gy = gVec.y;
    const gz = gVec.z + angularVelocityY * 26;

    for (let step = 0; step < SUBSTEPS; step++) {
      this.integrate(subDelta, gx, gy, gz);
      this.updateSleeping();
      this.buildSpatialHash();

      for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
        this.solveParticleCollisions();
        this.solveInnerObjectCollision();
        this.solveGlobeCollision();
      }
    }
  }

  // ── Integrate ─────────────────────────────────────────────────────────────

  private integrate(delta: number, gx: number, gy: number, gz: number) {
    const dt2 = delta * delta;

    for (let i = 0; i < this.count; i++) {
      if (this.sleeping[i]! >= SLEEP_DELAY) continue;

      const idx = i * 3;
      const px = this.positions[idx]!;
      const py = this.positions[idx + 1]!;
      const pz = this.positions[idx + 2]!;

      let vx = (px - this.previousPositions[idx]!) * 0.992;
      let vy = (py - this.previousPositions[idx + 1]!) * 0.992;
      let vz = (pz - this.previousPositions[idx + 2]!) * 0.992;

      if (py < -2.1) {
        vx *= 0.88;
        vz *= 0.88;
      }

      this.previousPositions[idx]! = px;
      this.previousPositions[idx + 1]! = py;
      this.previousPositions[idx + 2]! = pz;

      this.positions[idx]! = px + vx + gx * dt2;
      this.positions[idx + 1]! = py + vy + gy * dt2;
      this.positions[idx + 2]! = pz + vz + gz * dt2;
    }
  }

  // ── Sleeping ──────────────────────────────────────────────────────────────

  private updateSleeping() {
    const glassR = GLOBE_RADIUS - PARTICLE_RADIUS * 2;
    const glassR2 = glassR * glassR;

    for (let i = 0; i < this.count; i++) {
      if (this.sleeping[i]! >= SLEEP_DELAY) continue;

      const idx = i * 3;
      const px = this.positions[idx]!;
      const py = this.positions[idx + 1]!;
      const pz = this.positions[idx + 2]!;
      const vx = px - this.previousPositions[idx]!;
      const vy = py - this.previousPositions[idx + 1]!;
      const vz = pz - this.previousPositions[idx + 2]!;

      // Particles near the glass must stay awake to respond to rotation
      const nearGlass = px * px + py * py + pz * pz > glassR2;

      if (!nearGlass && vx * vx + vy * vy + vz * vz < SLEEP_THRESHOLD_SQ) {
        this.sleeping[i]!++;
      } else {
        this.sleeping[i]! = 0;
      }
    }
  }

  wakeAll() {
    this.sleeping.fill(0);
  }

  wakeParticlesNear(x: number, y: number, z: number, radius: number) {
    const r2 = radius * radius;
    for (let i = 0; i < this.count; i++) {
      const idx = i * 3;
      const dx = this.positions[idx]! - x;
      const dy = this.positions[idx + 1]! - y;
      const dz = this.positions[idx + 2]! - z;
      if (dx * dx + dy * dy + dz * dz < r2) this.sleeping[i]! = 0;
    }
  }

  // ── Particle–particle collisions ──────────────────────────────────────────

  private solveParticleCollisions() {
    const minDist = PARTICLE_RADIUS * 2;
    const minDistSq = minDist * minDist;

    for (let i = 0; i < this.count; i++) {
      if (this.sleeping[i]! >= SLEEP_DELAY) continue;

      const indexA = i * 3;
      const px = this.positions[indexA]!;
      const py = this.positions[indexA + 1]!;
      const pz = this.positions[indexA + 2]!;

      const cx = Math.floor(px / GRID_CELL_SIZE) | 0;
      const cy = Math.floor(py / GRID_CELL_SIZE) | 0;
      const cz = Math.floor(pz / GRID_CELL_SIZE) | 0;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const h = this.hashCell(cx + dx, cy + dy, cz + dz);
            const [start, end] = this.getCellRange(h);

            for (let k = start; k < end; k++) {
              const j = this.cellOrder[k]!;
              if (j <= i) continue;

              const indexB = j * 3;
              const ddx = px - this.positions[indexB]!;
              const ddy = py - this.positions[indexB + 1]!;
              const ddz = pz - this.positions[indexB + 2]!;
              const distSq = ddx * ddx + ddy * ddy + ddz * ddz;

              if (distSq <= 0 || distSq >= minDistSq) continue;

              const invDist = 1.0 / Math.sqrt(distSq);
              const correction = (minDist - distSq * invDist) * 0.25;
              const cx2 = ddx * invDist * correction;
              const cy2 = ddy * invDist * correction;
              const cz2 = ddz * invDist * correction;

              this.positions[indexA]! += cx2;
              this.positions[indexA + 1]! += cy2;
              this.positions[indexA + 2]! += cz2;

              if (this.sleeping[j]! >= SLEEP_DELAY) {
                this.sleeping[j]! = 0; // wake it, don't push it this frame
              } else {
                this.positions[indexB]! -= cx2;
                this.positions[indexB + 1]! -= cy2;
                this.positions[indexB + 2]! -= cz2;
              }
            }
          }
        }
      }
    }
  }

  // ── Globe collision ───────────────────────────────────────────────────────

  private solveGlobeCollision() {
    const radius = GLOBE_RADIUS - PARTICLE_RADIUS;
    const radiusSq = radius * radius;

    for (let i = 0; i < this.count; i++) {
      if (this.sleeping[i]! >= SLEEP_DELAY) continue;

      const idx = i * 3;
      const x = this.positions[idx]!;
      const y = this.positions[idx + 1]!;
      const z = this.positions[idx + 2]!;

      const distSq = x * x + y * y + z * z;
      if (distSq <= radiusSq) continue;

      const invDist = 1.0 / Math.sqrt(distSq);
      const nx = x * invDist;
      const ny = y * invDist;
      const nz = z * invDist;

      // Velocity from uncorrected position
      let vx = x - this.previousPositions[idx]!;
      let vy = y - this.previousPositions[idx + 1]!;
      let vz = z - this.previousPositions[idx + 2]!;

      const sx = nx * radius;
      const sy = ny * radius;
      const sz = nz * radius;

      this.positions[idx]! = sx;
      this.positions[idx + 1]! = sy;
      this.positions[idx + 2]! = sz;

      const normalVel = vx * nx + vy * ny + vz * nz;
      if (normalVel > 0) {
        vx -= nx * normalVel;
        vy -= ny * normalVel;
        vz -= nz * normalVel;
      }

      vx *= DYNAMIC_FRICTION;
      vy *= DYNAMIC_FRICTION;
      vz *= DYNAMIC_FRICTION;

      const staticThreshold =
        STATIC_FRICTION_THRESHOLD * (1 + Math.abs(normalVel) * 20);
      if (vx * vx + vy * vy + vz * vz < staticThreshold * staticThreshold) {
        vx = 0;
        vy = 0;
        vz = 0;
        if (this.sleeping[i]! < SLEEP_DELAY) this.sleeping[i]!++;
      }

      this.previousPositions[idx]! = sx - vx;
      this.previousPositions[idx + 1]! = sy - vy;
      this.previousPositions[idx + 2]! = sz - vz;
    }
  }

  // ── Box collision ─────────────────────────────────────────────────────────

  private solveInnerObjectCollision() {
    const boxMinX = -0.6,
      boxMaxX = 0.6;
    const boxMinY = -2.3,
      boxMaxY = -1.2;
    const boxMinZ = -0.6,
      boxMaxZ = 0.6;

    for (let i = 0; i < this.count; i++) {
      if (this.sleeping[i]! >= SLEEP_DELAY) continue;

      const idx = i * 3;
      const x = this.positions[idx]!;
      const y = this.positions[idx + 1]!;
      const z = this.positions[idx + 2]!;

      if (
        x <= boxMinX ||
        x >= boxMaxX ||
        y <= boxMinY ||
        y >= boxMaxY ||
        z <= boxMinZ ||
        z >= boxMaxZ
      )
        continue;

      const left = x - boxMinX;
      const right = boxMaxX - x;
      const bottom = y - boxMinY;
      const top = boxMaxY - y;
      const back = z - boxMinZ;
      const front = boxMaxZ - z;
      const minD = Math.min(left, right, bottom, top, back, front);

      let nx = 0,
        ny = 0,
        nz = 0;
      let sx = x,
        sy = y,
        sz = z;

      if (minD === left) {
        sx = boxMinX - PARTICLE_RADIUS;
        nx = -1;
      } else if (minD === right) {
        sx = boxMaxX + PARTICLE_RADIUS;
        nx = 1;
      } else if (minD === bottom) {
        sy = boxMinY - PARTICLE_RADIUS;
        ny = -1;
      } else if (minD === top) {
        sy = boxMaxY + PARTICLE_RADIUS;
        ny = 1;
      } else if (minD === back) {
        sz = boxMinZ - PARTICLE_RADIUS;
        nz = -1;
      } else {
        sz = boxMaxZ + PARTICLE_RADIUS;
        nz = 1;
      }

      let vx = x - this.previousPositions[idx]!;
      let vy = y - this.previousPositions[idx + 1]!;
      let vz = z - this.previousPositions[idx + 2]!;

      this.positions[idx]! = sx;
      this.positions[idx + 1]! = sy;
      this.positions[idx + 2]! = sz;

      const normalVel = vx * nx + vy * ny + vz * nz;
      if (normalVel < 0) {
        vx -= nx * normalVel;
        vy -= ny * normalVel;
        vz -= nz * normalVel;
      }

      vx *= BOX_FRICTION;
      vy *= BOX_FRICTION;
      vz *= BOX_FRICTION;

      if (vx * vx + vy * vy + vz * vz < STATIC_FRICTION_THRESHOLD) {
        vx = 0;
        vy = 0;
        vz = 0;
      }

      this.previousPositions[idx]! = sx - vx;
      this.previousPositions[idx + 1]! = sy - vy;
      this.previousPositions[idx + 2]! = sz - vz;
    }
  }
}
