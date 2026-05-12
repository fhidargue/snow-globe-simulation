import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { Leva } from "leva";
import { useSimulationConfig } from "@/hooks/simulationConfig";
import Scene from "@/rendering/Scene/Scene";
import ControlsPanel from "@/components/ControlPanel/ControlPanel";
import FPSCounter from "@/components/FPSCounter/FPSCounter";

const ColorBackground = () => <color attach="background" args={["#050816"]} />;
const Fog = () => <fog attach="fog" args={["#050816", 12, 35]} />;
const Lighting = () => {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight castShadow position={[5, 10, 5]} intensity={2.5} />
    </>
  );
};
const LevaControls = () => {
  return (
    <>
      <Leva
        collapsed={false}
        theme={{
          sizes: {
            rootWidth: "400px",
            numberInputMinWidth: "60px",
            controlWidth: "180px",
            rowHeight: "38px",
          },
          fontSizes: {
            root: "16px",
          },
        }}
      />
      <ControlsPanel />
    </>
  );
};

export default function App() {
  const showBackground = useSimulationConfig((state) => state.showBackground);
  const backgroundScene = useSimulationConfig((state) => state.backgroundScene);

  return (
    <>
      <LevaControls />
      <Canvas
        shadows
        camera={{
          position: [0, 0, 12],
          fov: 45,
        }}
        gl={{
          antialias: true,
        }}
      >
        <FPSCounter />
        <ColorBackground />
        <Fog />
        <Lighting />
        <Suspense fallback={null}>
          <Environment
            files={backgroundScene}
            background={showBackground}
            environmentIntensity={0.5}
            backgroundIntensity={0.05}
          />
          <Scene />
        </Suspense>
      </Canvas>
    </>
  );
}
