import { create } from "zustand";
import {
  GRAVITY_VALUE,
  NUM_PARTICLES,
  PARTICLE_SIZE,
} from "../utils/constants";

interface SimulationConfigState {
  gravity: number;
  snowCount: number;
  particleSize: number;
  materialType: "snow" | "marble";
  showBackground: boolean;
  backgroundScene: string;
  showEllipsoids: boolean;
  setGravity: (gravity: number) => void;
  setSnowCount: (snowCount: number) => void;
  setParticleSize: (particleSize: number) => void;
  setMaterialType: (type: "snow" | "marble") => void;
  setShowBackground: (background: boolean) => void;
  setBackgroundScene: (scene: string) => void;
  setShowEllipsoids: (showEllipsoids: boolean) => void;
}

export const useSimulationConfig = create<SimulationConfigState>((set) => ({
  gravity: GRAVITY_VALUE,
  snowCount: NUM_PARTICLES,
  particleSize: PARTICLE_SIZE,
  materialType: "marble",
  showBackground: true,
  backgroundScene: "/hdr/christmas_studio.hdr",
  showEllipsoids: false,

  setGravity: (gravity) => set({ gravity }),
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
