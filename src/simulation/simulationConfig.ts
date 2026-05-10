import { create } from "zustand";
import { GRAVITY_VALUE, NUM_PARTICLES, PARTICLE_SIZE } from "./constants";

interface SimulationConfigState {
  gravity: number;
  snowCount: number;
  particleSize: number;
  materialType: "snow" | "marble";
  setGravity: (gravity: number) => void;
  setSnowCount: (snowCount: number) => void;
  setParticleSize: (particleSize: number) => void;
  setMaterialType: (type: "snow" | "marble") => void;
}

export const useSimulationConfig = create<SimulationConfigState>((set) => ({
  gravity: GRAVITY_VALUE,
  snowCount: NUM_PARTICLES,
  particleSize: PARTICLE_SIZE,
  materialType: "marble",

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
}));
