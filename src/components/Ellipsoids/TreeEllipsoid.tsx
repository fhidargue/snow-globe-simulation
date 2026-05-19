import type { TreeData } from "@/utils/constants";
import { LEFT_TREE, RIGHT_TREE } from "@/utils/constants";

const TREE_BOX = [0.7, 0.7, 0.7] as [number, number, number];

const Tree = ({ trunkPosition, layers }: TreeData) => {
  return (
    <>
      <mesh position={trunkPosition}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 16]} />
        <meshBasicMaterial color="red" wireframe />
      </mesh>
      {layers.map((layer, index) => (
        <mesh
          key={index}
          position={layer.position}
          rotation={[0, 0, 0]}
          scale={layer.scale}
        >
          <boxGeometry args={TREE_BOX} />
          <meshBasicMaterial color="red" wireframe />
        </mesh>
      ))}
    </>
  );
};

export default function TreeEllipsoid() {
  return (
    <>
      <Tree {...LEFT_TREE} />
      <Tree {...RIGHT_TREE} />
    </>
  );
}
