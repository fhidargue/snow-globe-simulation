import { Vector3 } from "three";

export const GRAVITY_VALUE = 5;
export const GRAVITY = new Vector3(0, -2.5, 0);
export const GLOBE_RADIUS = 2.35;
export const PARTICLE_RADIUS = 0.03;
export const DAMPING = 0.96;
export const SLEEP_THRESHOLD = 0.0005;
export const FLOOR_Y = -2.2;
export const MOUSE_FORCE = 0.015;
export const GRID_CELL_SIZE = 0.06;
export const NUM_PARTICLES = 2000;
export const PARTICLE_SIZE = 0.9;
export const STATIC_FRICTION_THRESHOLD = 0.00008;
export const DYNAMIC_FRICTION = 0.9985;
export const BOX_FRICTION = 0.92;

// SCENE MODELS
export const SCALE = 20;
export const CABIN = {
  model: "/assets/components/cabin.glb",
  textures: {
    map: "/assets/textures/cabin/cabin.jpg",
    normalMap: "/assets/textures/cabin/cabin_normal.jpg",
    roughnessMap: "/assets/textures/cabin/cabin_roughness.jpg",
    metalnessMap: "/assets/textures/cabin/cabin_metallic.jpg",
  },
  position: [0, -3.5, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};
export const BASE = {
  model: "/assets/components/base.glb",
  textures: {
    map: "/assets/textures/base/oak_base.jpg",
  },
  position: [0, -3.5, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};
export const GROUND = {
  model: "/assets/components/ground.glb",
  position: [0, -3.5, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};
export const PLAQUE = {
  model: "/assets/components/plaque.glb",
  textures: {
    map: "/assets/textures/plaque/gold.jpg",
    normalMap: "/assets/textures/plaque/gold_normal.jpg",
    metalnessMap: "/assets/textures/plaque/gold_metallic.jpg",
    roughnessMap: "/assets/textures/plaque/gold_roughness.jpg",
  },
  metalness: 1,
  position: [0, -3.52, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};
export const TREE_BASE = {
  model: "/assets/components/tree_base.glb",
  textures: {
    map: "/assets/textures/tree_base/red_wood.jpg",
  },
  position: [0, -3.5, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};
export const TREE_BRANCHES = {
  model: "/assets/components/tree_branches.glb",
  color: "#0d641a",
  position: [0, -3.5, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};
export const TREE_BALLS = {
  model: "/assets/components/tree_balls.glb",
  color: "#5494f4",
  position: [0, -3.5, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};
export const TREE_SNOW = {
  model: "/assets/components/tree_snow.glb",
  position: [0, -3.5, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
};
