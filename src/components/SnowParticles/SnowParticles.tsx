import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { useSimulationConfig } from "@/hooks/simulationConfig";
import { PBDSystem } from "@/simulation/PBDSystem/PBDSystem";
import { MARBLE_COLOR, MATERIAL_TYPE, SNOW_COLOR } from "@/utils/constants";

const tempObject = new THREE.Object3D();

export default function SnowParticles() {
  const PARTICLE_RADIUS = 2;
  const PARTICLE_SEGMENTS = 10;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const snowCount = useSimulationConfig((state) => state.snowCount);
  const particleSize = useSimulationConfig((state) => state.particleSize);
  const materialType = useSimulationConfig((state) => state.materialType);

  /**
   * Create the particle simulation system.
   * Recreated only when particle count changes.
   */
  const simulation = useMemo(() => {
    return new PBDSystem(snowCount);
  }, [snowCount]);

  const material =
    materialType === MATERIAL_TYPE.SNOW ? (
      <meshStandardMaterial
        color={SNOW_COLOR}
        roughness={0.92}
        metalness={0}
        envMapIntensity={0.15}
      />
    ) : (
      <meshPhysicalMaterial
        color={MARBLE_COLOR}
        roughness={0.02}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.02}
        envMapIntensity={4}
      />
    );

  /**
   * Update particle sizes when configuration changes.
   */  
  useEffect(() => {
    simulation.updateParticleSizes(particleSize);
  }, [particleSize, simulation]);

  useFrame((_, delta) => {
    simulation.update(delta);

    const positions = simulation.positions;
    const sizes = simulation.sizes;

    /**
     * Update position and scale transforms
     * for every particle instance before rendering.
     */
    for (let i = 0; i < simulation.count; i++) {
      const index = i * 3;

      tempObject.position.set(
        positions[index]!,
        positions[index + 1]!,
        positions[index + 2]!,
      );

      const size = sizes[i]!;

      tempObject.scale.setScalar(size);
      tempObject.updateMatrix();

      meshRef.current?.setMatrixAt(i, tempObject.matrix);
    }

    /**
     * Notify Three.js that instance matrices changed.
     */
    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, simulation.count]}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[PARTICLE_RADIUS, PARTICLE_SEGMENTS, PARTICLE_SEGMENTS]} />
      {material}
    </instancedMesh>
  );
}
