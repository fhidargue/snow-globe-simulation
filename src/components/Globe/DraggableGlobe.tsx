import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import GlobeScene from "./GlobeScene";

export default function DraggableGlobe() {
  const groupRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({
    x: 0,
    y: 0,
  });

  // Angular velocity
  const angularVelocity = useRef(new THREE.Vector2());

  useFrame(() => {
    if (!groupRef.current) return;

    // Apply damping
    angularVelocity.current.multiplyScalar(0.95);

    const qx = new THREE.Quaternion();
    const qy = new THREE.Quaternion();

    qx.setFromAxisAngle(new THREE.Vector3(1, 0, 0), angularVelocity.current.y);
    qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angularVelocity.current.x);

    groupRef.current.quaternion.premultiply(qx).premultiply(qy);
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    dragging.current = true;

    lastMouse.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;

    const deltaX = e.clientX - lastMouse.current.x;
    const deltaY = e.clientY - lastMouse.current.y;

    angularVelocity.current.x += deltaX * 0.00025;
    angularVelocity.current.y += deltaY * 0.00025;

    lastMouse.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <GlobeScene />
    </group>
  );
}
