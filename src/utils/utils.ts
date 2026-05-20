import * as THREE from "three";

import { PARTICLE_RADIUS } from "@/utils/constants";

/**
 * Apply velocity damping after collisions
 * to reduce excessive particle sliding.
 */
export const applyVelocityFriction = (
  previousPositions: Float32Array,
  index: number,
  px: number,
  py: number,
  pz: number,

  /**
   * Friction multiplier applied
   * to reconstructed particle velocity.
   */
  friction = 0.985,
) => {
  /**
   * Reconstruct velocity using
   * Verlet position differences.
   */
  let vx = px - previousPositions[index]!;
  let vy = py - previousPositions[index + 1]!;
  let vz = pz - previousPositions[index + 2]!;

  vx *= friction;
  vy *= friction;
  vz *= friction;

  /**
   * Store updated previous positions
   * with damped velocity.
   */
  previousPositions[index] = px - vx;
  previousPositions[index + 1] = py - vy;
  previousPositions[index + 2] = pz - vz;
};

/**
 * Resolve collisions between particles
 * and a vertical cylinder collider.
 */
export const solveVerticalCylinderCollision = (
  px: number,
  py: number,
  pz: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  radius: number,
  height: number,

  /**
   * Controls how strongly particles
   * are pushed out of the collider.
   */
  softness = 0.15,
) => {
  const MIN_COLLISION_DISTANCE = 0.00001;

  /**
   * Cylinder vertical bounds.
   */
  const minY = centerY - height * 0.5;
  const maxY = centerY + height * 0.5;

  /**
   * Skip particles outside
   * the cylinder height range.
   */
  if (py < minY || py > maxY) {
    return {
      collided: false,
      px,
      py,
      pz,
    };
  }

  /**
   * Horizontal distance from
   * the cylinder center.
   */
  const dx = px - centerX;
  const dz = pz - centerZ;

  const distSq = dx * dx + dz * dz;

  /**
   * Expand collider radius using
   * the particle collision radius.
   */
  const expandedRadius = radius + PARTICLE_RADIUS;

  /**
   * Skip particles outside
   * the cylinder radius.
   */
  if (distSq >= expandedRadius * expandedRadius) {
    return {
      collided: false,
      px,
      py,
      pz,
    };
  }

  const dist = Math.sqrt(distSq);

  /**
   * Prevent invalid normalization
   * when particles are extremely close
   * to the cylinder center.
   */
  if (dist <= MIN_COLLISION_DISTANCE) {
    return {
      collided: false,
      px,
      py,
      pz,
    };
  }

  /**
   * Amount of particle penetration
   * inside the collider.
   */
  const penetration = expandedRadius - dist;
  const invDist = 1 / dist;

  const nx = dx * invDist;
  const nz = dz * invDist;

  /**
   * Push particle outward
   * away from the cylinder surface.
   */
  px += nx * penetration * softness;
  pz += nz * penetration * softness;

  return {
    collided: true,
    px,
    py,
    pz,
  };
};

/**
 * Resolve collisions between particles
 * and an oriented box collider.
 */
export const solveBoxCollision = (
  px: number,
  py: number,
  pz: number,
  center: THREE.Vector3,
  halfSize: THREE.Vector3,

  /**
   * Box rotation around the Z axis.
   */
  rotation = 0,

  /**
   * Controls how strongly particles
   * are pushed out of the collider.
   */
  softness = 0.12,
) => {
  /**
   * Precompute rotation values.
   */
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);

  /**
   * Transform particle position
   * into local box space.
   */
  const localX = (px - center.x) * cos - (py - center.y) * sin;
  const localY = (px - center.x) * sin + (py - center.y) * cos;
  const localZ = pz - center.z;

  /**
   * Expand collider bounds using
   * the particle collision radius.
   */
  const expandedX = halfSize.x + PARTICLE_RADIUS;
  const expandedY = halfSize.y + PARTICLE_RADIUS;
  const expandedZ = halfSize.z + PARTICLE_RADIUS;

  /**
   * Check whether the particle
   * is inside the box bounds.
   */
  const inside =
    Math.abs(localX) < expandedX &&
    Math.abs(localY) < expandedY &&
    Math.abs(localZ) < expandedZ;

  if (!inside) {
    return {
      collided: false,
      px,
      py,
      pz,
    };
  }

  /**
   * Distance to each box face.
   */
  const dx = expandedX - Math.abs(localX);
  const dy = expandedY - Math.abs(localY);
  const dz = expandedZ - Math.abs(localZ);

  let nx = 0;
  let ny = 0;
  let nz = 0;

  let correction;

  /**
   * Resolve collision along
   * the closest box axis.
   */
  if (dx < dy && dx < dz) {
    nx = localX < 0 ? -1 : 1;
    correction = dx;
  } else if (dy < dz) {
    ny = localY < 0 ? -1 : 1;
    correction = dy;
  } else {
    nz = localZ < 0 ? -1 : 1;
    correction = dz;
  }

  /**
   * Convert local collision normal
   * back into world space.
   */
  const worldNX = nx * cos + ny * sin;
  const worldNY = -nx * sin + ny * cos;
  const worldNZ = nz;

  /**
   * Push particle outward
   * away from the collider surface.
   */
  px += worldNX * correction * softness;
  py += worldNY * correction * softness;
  pz += worldNZ * correction * softness;

  return {
    collided: true,
    px,
    py,
    pz,
  };
};

// COLLISION NEIGHBOR OFFSETS

export const NEIGHBOR_OFFSETS: number[][] = [];

for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      NEIGHBOR_OFFSETS.push([x, y, z]);
    }
  }
}
