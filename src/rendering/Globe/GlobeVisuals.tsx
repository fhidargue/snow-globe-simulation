const Globe = () => {
  return (
    <>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshPhysicalMaterial
          transmission={1}
          roughness={0.02}
          thickness={0.25}
          ior={1.52}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={1.5}
        />
      </mesh>
    </>
  );
};

const Base = () => {
  return (
    <mesh position={[0, -3, 0]} receiveShadow>
      <cylinderGeometry args={[2, 2.5, 1, 32]} />
      <meshStandardMaterial color="#151515" />
    </mesh>
  );
};

const PlaceholderObject = () => {
  return (
    <mesh position={[0, -1.8, 0]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8b5a2b" />
    </mesh>
  );
};

export default function GlobeVisuals() {
  return (
    <group>
      <Globe />
      <Base />
      <PlaceholderObject />
    </group>
  );
}
