import * as THREE from "three";

import { PARTICLE_RADIUS } from "@/utils/constants";

export const applyVelocityFriction = (
  previousPositions: Float32Array,
  index: number,
  px: number,
  py: number,
  pz: number,
  friction = 0.985,
) => {
  let vx = px - previousPositions[index]!;
  let vy = py - previousPositions[index + 1]!;
  let vz = pz - previousPositions[index + 2]!;

  vx *= friction;
  vy *= friction;
  vz *= friction;

  previousPositions[index] = px - vx;
  previousPositions[index + 1] = py - vy;
  previousPositions[index + 2] = pz - vz;
};

export const solveVerticalCylinderCollision = (
  px: number,
  py: number,
  pz: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  radius: number,
  height: number,
  softness = 0.15,
) => {
  const minY = centerY - height * 0.5;
  const maxY = centerY + height * 0.5;

  if (py < minY || py > maxY) {
    return {
      collided: false,
      px,
      py,
      pz,
    };
  }

  const dx = px - centerX;
  const dz = pz - centerZ;

  const distSq = dx * dx + dz * dz;

  const expandedRadius = radius + PARTICLE_RADIUS;

  if (distSq >= expandedRadius * expandedRadius) {
    return {
      collided: false,
      px,
      py,
      pz,
    };
  }

  const dist = Math.sqrt(distSq);

  if (dist <= 0.00001) {
    return {
      collided: false,
      px,
      py,
      pz,
    };
  }

  const penetration = expandedRadius - dist;
  const invDist = 1 / dist;

  const nx = dx * invDist;
  const nz = dz * invDist;

  px += nx * penetration * softness;
  pz += nz * penetration * softness;

  return {
    collided: true,
    px,
    py,
    pz,
  };
};

export const solveBoxCollision = (
  px: number,
  py: number,
  pz: number,
  center: THREE.Vector3,
  halfSize: THREE.Vector3,
  rotation = 0,
  softness = 0.12,
) => {
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);

  const localX = (px - center.x) * cos - (py - center.y) * sin;
  const localY = (px - center.x) * sin + (py - center.y) * cos;
  const localZ = pz - center.z;

  const expandedX = halfSize.x + PARTICLE_RADIUS;
  const expandedY = halfSize.y + PARTICLE_RADIUS;
  const expandedZ = halfSize.z + PARTICLE_RADIUS;

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

  const dx = expandedX - Math.abs(localX);
  const dy = expandedY - Math.abs(localY);
  const dz = expandedZ - Math.abs(localZ);

  let nx = 0;
  let ny = 0;
  let nz = 0;

  let correction;

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

  const worldNX = nx * cos + ny * sin;
  const worldNY = -nx * sin + ny * cos;
  const worldNZ = nz;

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
