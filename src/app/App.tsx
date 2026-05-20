import { Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Suspense } from "react";

import ControlsPanel from "@/components/ControlPanel/ControlPanel";
import FPSCounter from "@/components/FPSCounter/FPSCounter";
import Scene from "@/components/Scene/Scene";
import { useSimulationConfig } from "@/hooks/simulationConfig";

const CONTROLS = {
  ROOT_WIDTH: "400px",
  ROOT_STYLES: "16px",
  NUMBER_WIDTH: "60px",
  CONTROL_WIDTH: "180px",
  ROW_HEIGHT: "38px",
};
const BACKGROUND_COLOR = "#050816";

const ColorBackground = () => (
  <color attach="background" args={[BACKGROUND_COLOR]} />
);
const Fog = () => <fog attach="fog" args={[BACKGROUND_COLOR, 12, 35]} />;
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
            rootWidth: CONTROLS.ROOT_WIDTH,
            numberInputMinWidth: CONTROLS.NUMBER_WIDTH,
            controlWidth: CONTROLS.CONTROL_WIDTH,
            rowHeight: CONTROLS.ROW_HEIGHT,
          },
          fontSizes: {
            root: CONTROLS.ROOT_STYLES,
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
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
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
