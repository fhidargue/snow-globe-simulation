import { create } from "zustand";
import {
  VELOCITY_VALUE,
  NUM_PARTICLES,
  PARTICLE_SIZE,
  MATERIAL_TYPE,
} from "../utils/constants";

interface SimulationConfigState {
  velocity: number;
  snowCount: number;
  particleSize: number;
  materialType: "snow" | "marble";
  showBackground: boolean;
  backgroundScene: string;
  showEllipsoids: boolean;
  setVelocity: (velocity: number) => void;
  setSnowCount: (snowCount: number) => void;
  setParticleSize: (particleSize: number) => void;
  setMaterialType: (type: "snow" | "marble") => void;
  setShowBackground: (background: boolean) => void;
  setBackgroundScene: (scene: string) => void;
  setShowEllipsoids: (showEllipsoids: boolean) => void;
}

export const useSimulationConfig = create<SimulationConfigState>((set) => ({
  velocity: VELOCITY_VALUE,
  snowCount: NUM_PARTICLES,
  particleSize: PARTICLE_SIZE,
  materialType: MATERIAL_TYPE.MARBLE as "marble",
  showBackground: true,
  backgroundScene: "/hdr/christmas_studio.hdr",
  showEllipsoids: false,

  setVelocity: (velocity) => set({ velocity }),
  setSnowCount: (snowCount) =>
    set({
      snowCount,
    }),
  setParticleSize: (particleSize) =>
    set({
      particleSize,
    }),
  setMaterialType: (materialType) =>
    set({
      materialType,
    }),
  setShowBackground: (showBackground) => {
    set({ showBackground });
  },
  setBackgroundScene: (backgroundScene) => {
    set({ backgroundScene });
  },
  setShowEllipsoids(showEllipsoids) {
    set({ showEllipsoids });
  },
}));
