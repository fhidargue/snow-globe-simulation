import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import * as THREE from "three";

import SnowParticles from "../SnowParticles/SnowParticles";
import GlobeVisuals from "../Globe/GlobeVisuals";

import { useSimulationStore } from "@/hooks/simulationStore";

export default function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({
    x: 0,
    y: 0,
  });

  const angularVelocity = useRef(new THREE.Vector2());
  const targetVelocity = useRef(new THREE.Vector2());

  const setAngularVelocity = useSimulationStore(
    (state) => state.setAngularVelocity,
  );

  const setGlobeQuaternion = useSimulationStore(
    (state) => state.setGlobeQuaternion,
  );

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      dragging.current = true;

      lastMouse.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    const handlePointerUp = () => {
      dragging.current = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;

      const deltaX = e.clientX - lastMouse.current.x;
      const deltaY = e.clientY - lastMouse.current.y;

      // More responsive movement
      targetVelocity.current.x = deltaX * 0.003;
      targetVelocity.current.y = deltaY * 0.003;

      // Immediate response
      angularVelocity.current.copy(targetVelocity.current);

      lastMouse.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;

    // Smooth inertia
    angularVelocity.current.lerp(targetVelocity.current, 0.2);

    // Slow momentum decay
    targetVelocity.current.multiplyScalar(0.985);

    // Share with simulation
    setAngularVelocity(angularVelocity.current.x, angularVelocity.current.y);
    setGlobeQuaternion(groupRef.current.quaternion);

    // Local axes
    const localXAxis = new THREE.Vector3(1, 0, 0);
    const localYAxis = new THREE.Vector3(0, 1, 0);

    localXAxis.applyQuaternion(groupRef.current.quaternion);
    localYAxis.applyQuaternion(groupRef.current.quaternion);

    const qx = new THREE.Quaternion();
    const qy = new THREE.Quaternion();

    qx.setFromAxisAngle(localXAxis, angularVelocity.current.y);
    qy.setFromAxisAngle(localYAxis, angularVelocity.current.x);

    // Local rotation
    groupRef.current.quaternion.multiply(qx);
    groupRef.current.quaternion.multiply(qy);

    // Friction
    angularVelocity.current.multiplyScalar(0.985);
  });

  return (
    <>
      <group ref={groupRef}>
        <GlobeVisuals />
        <SnowParticles />
      </group>
    </>
  );
}
