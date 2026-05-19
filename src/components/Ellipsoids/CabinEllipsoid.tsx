import type { CollisionBox } from "@/utils/constants";
import { CABIN_COLLIDERS } from "@/utils/constants";

const CABIN_BOX = [0.72, 0.72, 0.72] as [number, number, number];

const CabinBox = ({ position, scale, rotation = [0, 0, 0] }: CollisionBox) => {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <boxGeometry args={CABIN_BOX} />
      <meshBasicMaterial color="red" wireframe />
    </mesh>
  );
};

export default function CabinEllipsoid() {
  return (
    <>
      {CABIN_COLLIDERS.map((collider, index) => (
        <CabinBox key={index} {...collider} />
      ))}
    </>
  );
}
