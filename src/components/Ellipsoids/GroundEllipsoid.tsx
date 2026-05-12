export default function GroundEllipsoid() {
  return (
    <>
      <mesh
        position={[0, -1.58, 0]}
        rotation={[Math.PI, 0, 0]}
        scale={[1, 0.35, 1]}
      >
        <sphereGeometry
          args={[1.82, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.5]}
        />
        <meshBasicMaterial color="red" wireframe />
      </mesh>
      <mesh position={[0, -1.58, 0]} scale={[1, 0.08, 1]}>
        <sphereGeometry
          args={[1.82, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.5]}
        />
        <meshBasicMaterial color="red" wireframe />
      </mesh>
    </>
  );
}
