import { Vector3 } from "three";

export interface Particle {
  position: Vector3;
  previousPosition: Vector3;
  acceleration: Vector3;
  radius: number;
  sleeping: boolean;
  size: number;
}
