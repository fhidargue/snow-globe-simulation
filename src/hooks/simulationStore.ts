import * as THREE from "three";
import { create } from "zustand";

interface SimulationState {
  angularVelocityX: number;
  angularVelocityY: number;
  globeQuaternion: THREE.Quaternion;
  setAngularVelocity: (x: number, y: number) => void;
  setGlobeQuaternion: (quaternion: THREE.Quaternion) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  angularVelocityX: 0,
  angularVelocityY: 0,
  globeQuaternion: new THREE.Quaternion(),

  setAngularVelocity: (x, y) =>
    set({
      angularVelocityX: x,
      angularVelocityY: y,
    }),

  setGlobeQuaternion: (quaternion) =>
    set({
      globeQuaternion: quaternion.clone(),
    }),
}));
