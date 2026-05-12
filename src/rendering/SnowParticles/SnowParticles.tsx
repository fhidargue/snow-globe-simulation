import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

import * as THREE from "three";

import { PBDSystem } from "@/simulation/PBDSystem/PBDSystem";

const tempObject = new THREE.Object3D();

export default function SnowParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const simulation = useMemo(() => {
    return new PBDSystem(2000);
  }, []);

  useFrame((_, delta) => {
    simulation.update(delta);

    const positions = simulation.positions;
    const sizes = simulation.sizes;

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
      <sphereGeometry args={[2, 10, 10]} />
      <meshStandardMaterial color="white" roughness={0.35} metalness={0.05} />
    </instancedMesh>
  );
}
