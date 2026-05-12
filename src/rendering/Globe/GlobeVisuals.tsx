import CabinEllipsoid from "@/components/Ellipsoids/CabinEllipsoid";
import GroundEllipsoid from "@/components/Ellipsoids/GroundEllipsoid";
import TreeEllipsoid from "@/components/Ellipsoids/TreeEllipsoid";
import Model, { type ModelProps } from "@/components/Model/Model";
import { useSimulationConfig } from "@/simulation/simulationConfig";
import {
  BASE,
  CABIN,
  GROUND,
  PLAQUE,
  TREE_BALLS,
  TREE_BASE,
  TREE_BRANCHES,
  TREE_SNOW,
} from "@/utils/constants";

const MODELS: ModelProps[] = [
  CABIN,
  BASE,
  GROUND,
  PLAQUE,
  TREE_BASE,
  TREE_BRANCHES,
  TREE_BALLS,
  TREE_SNOW,
];

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

export default function GlobeVisuals() {
  const showEllipsoids = useSimulationConfig((state) => state.showEllipsoids);

  return (
    <group>
      <Globe />
      {showEllipsoids && (
        <>
          <TreeEllipsoid />
          <CabinEllipsoid />
          <GroundEllipsoid />
        </>
      )}

      {MODELS.map((item) => (
        <Model
          key={item.model}
          model={item.model}
          textures={item.textures}
          color={item.color}
          metalness={item.metalness}
          position={item.position}
          rotation={item.rotation}
          scale={item.scale}
        />
      ))}
    </group>
  );
}
