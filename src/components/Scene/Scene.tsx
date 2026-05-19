import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import GlobeVisuals from "@/components/Globe/GlobeVisuals";
import SnowParticles from "@/components/SnowParticles/SnowParticles";
import { useSimulationConfig } from "@/hooks/simulationConfig";
import { useSimulationStore } from "@/hooks/simulationStore";

const DRAG_SENSITIVITY = 0.0032;
const MAX_ANGULAR_VELOCITY = 0.11;

export default function Scene() {
  const groupRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({
    x: 0,
    y: 0,
  });

  const angularVelocity = useRef(new THREE.Vector2());
  const targetVelocity = useRef(new THREE.Vector2());

  const mouseSensitivity = useSimulationConfig(
    (state) => state.mouseSensitivity,
  );

  const dragSensitivity = DRAG_SENSITIVITY * mouseSensitivity;

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

      // Natural drag feel
      targetVelocity.current.x = deltaX * dragSensitivity;
      targetVelocity.current.y = -deltaY * dragSensitivity;

      // Prevent extreme spinning
      targetVelocity.current.clampLength(0, MAX_ANGULAR_VELOCITY);

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
  }, []); // eslint-disable-line

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Smooth inertia
    angularVelocity.current.lerp(targetVelocity.current, 0.12);

    // Framerate-independent damping
    const damping = Math.pow(0.92, delta * 60);

    targetVelocity.current.multiplyScalar(damping);

    setAngularVelocity(angularVelocity.current.x, angularVelocity.current.y);
    setGlobeQuaternion(groupRef.current.quaternion);

    // Local rotation axes
    const localXAxis = new THREE.Vector3(1, 0, 0);
    const localYAxis = new THREE.Vector3(0, 1, 0);

    localXAxis.applyQuaternion(groupRef.current.quaternion);
    localYAxis.applyQuaternion(groupRef.current.quaternion);

    const qx = new THREE.Quaternion();
    const qy = new THREE.Quaternion();

    qx.setFromAxisAngle(localXAxis, angularVelocity.current.y);
    qy.setFromAxisAngle(localYAxis, angularVelocity.current.x);

    // Apply local-space rotation
    groupRef.current.quaternion.multiply(qx);
    groupRef.current.quaternion.multiply(qy);

    angularVelocity.current.multiplyScalar(damping);

    // Remove micro jitter
    if (angularVelocity.current.lengthSq() < 0.000001) {
      angularVelocity.current.set(0, 0);
    }
  });

  return (
    <group ref={groupRef}>
      <GlobeVisuals />
      <SnowParticles />
    </group>
  );
}
