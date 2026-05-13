import { create } from "zustand";
import {
  VELOCITY_VALUE,
  NUM_PARTICLES,
  PARTICLE_SIZE,
  MATERIAL_TYPE,
  MOUSE_SENSITIVITY,
} from "@/utils/constants";

interface SimulationConfigState {
  mouseSensitivity: number;
  velocity: number;
  snowCount: number;
  particleSize: number;
  materialType: "snow" | "marble";
  showBackground: boolean;
  backgroundScene: string;
  showEllipsoids: boolean;
  setMouseSensitivity: (mouseSensitivity: number) => void;
  setVelocity: (velocity: number) => void;
  setSnowCount: (snowCount: number) => void;
  setParticleSize: (particleSize: number) => void;
  setMaterialType: (type: "snow" | "marble") => void;
  setShowBackground: (background: boolean) => void;
  setBackgroundScene: (scene: string) => void;
  setShowEllipsoids: (showEllipsoids: boolean) => void;
}

export const useSimulationConfig = create<SimulationConfigState>((set) => ({
  mouseSensitivity: MOUSE_SENSITIVITY,
  velocity: VELOCITY_VALUE,
  snowCount: NUM_PARTICLES,
  particleSize: PARTICLE_SIZE,
  materialType: MATERIAL_TYPE.MARBLE as "marble",
  showBackground: true,
  backgroundScene: "/hdr/christmas_studio.hdr",
  showEllipsoids: false,

  setMouseSensitivity: (mouseSensitivity) => set({ mouseSensitivity }),
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
