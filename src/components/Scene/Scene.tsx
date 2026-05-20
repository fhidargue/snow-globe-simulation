import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import GlobeVisuals from "@/components/Globe/GlobeVisuals";
import SnowParticles from "@/components/SnowParticles/SnowParticles";
import { useSimulationConfig } from "@/hooks/simulationConfig";
import { useSimulationStore } from "@/hooks/simulationStore";


export default function Scene() {
  const DRAG_SENSITIVITY = 0.0032;
  const MAX_ANGULAR_VELOCITY = 0.11;
  const INERTIA_LERP_FACTOR = 0.12;
  const ROTATION_DAMPING = 0.92;
  const MIN_ANGULAR_VELOCITY = 0.000001;

  const groupRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const lastMousePosition = useRef({
    x: 0,
    y: 0,
  });

  /**
   * Current angular velocity applied to the globe.
   */
  const angularVelocity = useRef(new THREE.Vector2());

  /**
   * Target angular velocity generated from mouse movement.
   * Used to create smoother rotational inertia.
   */
  const targetVelocity = useRef(new THREE.Vector2());

  const mouseSensitivity = useSimulationConfig(
    (state) => state.mouseSensitivity,
  );

  /**
   * Final drag sensitivity applied during interaction.
   */
  const dragSensitivity = DRAG_SENSITIVITY * mouseSensitivity;

  /**
   * Store current angular velocity and globe rotation
   * globally so other systems can access globe motion data.
   */
  const setAngularVelocity = useSimulationStore(
    (state) => state.setAngularVelocity,
  );
  const setGlobeQuaternion = useSimulationStore(
    (state) => state.setGlobeQuaternion,
  );

  useEffect(() => {
    const handleMouseDown = (e: PointerEvent) => {
      dragging.current = true;

      lastMousePosition.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    const handleMouseUp = () => {
      dragging.current = false;
    };

    /**
     * Converts mouse movement into target angular velocity.
     */
    const handleMouseMove = (e: PointerEvent) => {
      if (!dragging.current) return;

      const deltaX = e.clientX - lastMousePosition.current.x;
      const deltaY = e.clientY - lastMousePosition.current.y;

      // Apply drag sensitivity
      targetVelocity.current.x = deltaX * dragSensitivity;
      targetVelocity.current.y = -deltaY * dragSensitivity;

      // Prevent excessive spinning speeds by setting a max velocity
      targetVelocity.current.clampLength(0, MAX_ANGULAR_VELOCITY);

      lastMousePosition.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    /**
     * Global pointer listeners allow dragging even when the cursor 
     * leaves the canvas area.
     */
    window.addEventListener("pointerdown", handleMouseDown);
    window.addEventListener("pointerup", handleMouseUp);
    window.addEventListener("pointermove", handleMouseMove);

    return () => {
      window.removeEventListener("pointerdown", handleMouseDown);
      window.removeEventListener("pointerup", handleMouseUp);
      window.removeEventListener("pointermove", handleMouseMove);
    };
  }, []); // eslint-disable-line

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    /**
     * Smoothly interpolate toward target velocity to create 
     * inertia-based movement.
     */
    angularVelocity.current.lerp(targetVelocity.current, INERTIA_LERP_FACTOR);

    /**
     * Framerate-independent damping keeps motion
     * consistent across different framerates.
     */
    const damping = Math.pow(ROTATION_DAMPING, delta * 60);

    targetVelocity.current.multiplyScalar(damping);

    // Store current simulation rotation state
    setAngularVelocity(angularVelocity.current.x, angularVelocity.current.y);
    setGlobeQuaternion(groupRef.current.quaternion);

    /**
     * Local rotation axes are updated using
     * the globe's current quaternion rotation.
     */

    const localXAxis = new THREE.Vector3(1, 0, 0);
    const localYAxis = new THREE.Vector3(0, 1, 0);

    localXAxis.applyQuaternion(groupRef.current.quaternion);
    localYAxis.applyQuaternion(groupRef.current.quaternion);

    const qx = new THREE.Quaternion();
    const qy = new THREE.Quaternion();

    qx.setFromAxisAngle(localXAxis, angularVelocity.current.y);
    qy.setFromAxisAngle(localYAxis, angularVelocity.current.x);

    // Apply local-space quaternion rotation.
    groupRef.current.quaternion.multiply(qx);
    groupRef.current.quaternion.multiply(qy);

    angularVelocity.current.multiplyScalar(damping);

    /**
     * Remove extremely small rotational movement
     * to prevent visible micro jittering.
     */
    if (angularVelocity.current.lengthSq() < MIN_ANGULAR_VELOCITY) {
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
