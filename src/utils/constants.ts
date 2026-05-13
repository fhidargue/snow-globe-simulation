import { Vector3 } from "three";

export const VELOCITY_VALUE = 5;
export const GRAVITY = new Vector3(0, -2.5, 0);
export const GLOBE_RADIUS = 2.35;
export const PARTICLE_RADIUS = 0.03;
export const DAMPING = 0.96;
export const SLEEP_THRESHOLD = 0.0005;
export const FLOOR_Y = -2.2;
export const MOUSE_FORCE = 0.015;
export const GRID_CELL_SIZE = 0.06;
export const NUM_PARTICLES = 2000;
export const PARTICLE_SIZE = 1;
export const STATIC_FRICTION_THRESHOLD = 0.00008;
export const DYNAMIC_FRICTION = 0.9985;
export const BOX_FRICTION = 0.92;
export const BASE_PARTICLE_SIZE = 0.018;

// ENUMS
export const MATERIAL_TYPE = {
  SNOW: "snow",
  MARBLE: "marble",
};

// SCENE MODELS
const TREE_BRANCH_COLOR = "#0d641a";
const TREE_BALL_COLOR = "#5494f4";
const TREE_SNOW_COLOR = "#D6E4F0";
const GROUND_COLOR = "#B8C7D6";

export const SNOW_COLOR = "#F4F8FC";
export const MARBLE_COLOR = "#EEF4FA";

export const CABIN = {
  model: "/assets/components/cabin.glb",
  textures: {
    map: "/assets/textures/cabin/cabin.jpg",
    normalMap: "/assets/textures/cabin/cabin_normal.jpg",
    roughnessMap: "/assets/textures/cabin/cabin_roughness.jpg",
    metalnessMap: "/assets/textures/cabin/cabin_metallic.jpg",
  },
  position: [0, -3.9, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
  scale: 24,
};
export const BASE = {
  model: "/assets/components/base.glb",
  textures: {
    map: "/assets/textures/base/oak_base.jpg",
  },
  position: [0, -3.5, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
  scale: 20,
};
export const GROUND = {
  model: "/assets/components/ground.glb",
  color: GROUND_COLOR,
  position: [0, -3.45, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
  scale: 20,
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
  scale: 20,
};
export const TREE_BASE = {
  model: "/assets/components/tree_base.glb",
  textures: {
    map: "/assets/textures/tree_base/red_wood.jpg",
  },
  position: [0, -4, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
  scale: 25,
};
export const TREE_BRANCHES = {
  model: "/assets/components/tree_branches.glb",
  color: TREE_BRANCH_COLOR,
  position: [0, -4, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
  scale: 25,
};
export const TREE_BALLS = {
  model: "/assets/components/tree_balls.glb",
  color: TREE_BALL_COLOR,
  position: [0, -4, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
  scale: 25,
};
export const TREE_SNOW = {
  model: "/assets/components/tree_snow.glb",
  color: TREE_SNOW_COLOR,
  position: [0, -4, 0] as [number, number, number],
  rotation: [0, Math.PI, 0] as [number, number, number],
  scale: 25,
};

// TREE ELLIPSOIDS

export type Layer = {
  position: [number, number, number];
  scale: [number, number, number];
};

export type TreeData = {
  trunkPosition: [number, number, number];
  layers: Layer[];
};

export const LEFT_TREE_LAYERS: Layer[] = [
  {
    position: [-1.21, -1.05, -0.41],
    scale: [1.4, 0.35, 1.2],
  },
  {
    position: [-1.21, -0.78, -0.41],
    scale: [1.1, 0.45, 0.9],
  },
  {
    position: [-1.23, -0.51, -0.41],
    scale: [0.65, 0.3, 0.55],
  },
  {
    position: [-1.23, -0.3, -0.41],
    scale: [0.37, 0.3, 0.3],
  },
];

export const RIGHT_TREE_LAYERS: Layer[] = [
  {
    position: [1.15, -1.15, 0.47],
    scale: [1.1, 0.27, 1.1],
  },
  {
    position: [1.17, -0.95, 0.5],
    scale: [0.9, 0.3, 0.72],
  },
  {
    position: [1.19, -0.74, 0.5],
    scale: [0.5, 0.24, 0.5],
  },
  {
    position: [1.19, -0.58, 0.5],
    scale: [0.35, 0.2, 0.35],
  },
];

export const LEFT_TREE: TreeData = {
  trunkPosition: [-1.21, -1.42, -0.41],
  layers: LEFT_TREE_LAYERS,
};

export const RIGHT_TREE: TreeData = {
  trunkPosition: [1.19, -1.42, 0.5],
  layers: RIGHT_TREE_LAYERS,
};

// CABIN ELLIPSOIDS

export type CollisionBox = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
};

export const CABIN_BODY: CollisionBox = {
  position: [0.03, -1.2, -0.12],
  scale: [0.9, 1, 1.6],
};

export const CABIN_ROOF: CollisionBox[] = [
  {
    position: [-0.15, -0.7, -0.15],
    rotation: [0, 0, Math.PI * 0.22],
    scale: [1.1, 0.55, 1.5],
  },
  {
    position: [0.18, -0.7, -0.15],
    rotation: [0, 0, Math.PI * -0.2],
    scale: [1.1, 0.55, 1.5],
  },
];

export const CABIN_COLLIDERS: CollisionBox[] = [CABIN_BODY, ...CABIN_ROOF];
