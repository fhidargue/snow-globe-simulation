import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense } from "react";
import { Perf } from "r3f-perf";
import Scene from "@/rendering/Scene/Scene";
import ControlsPanel from "@/components/ControlPanel/ControlPanel";
import { useSimulationConfig } from "@/simulation/simulationConfig";

const PerformanceMonitor = () => <Perf position="top-left" />;
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

export default function App() {
  const background = useSimulationConfig((state) => state.background);
  const backgroundScene = useSimulationConfig((state) => state.backgroundScene);

  return (
    <>
      <ControlsPanel />
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
        <PerformanceMonitor />
        <ColorBackground />
        <Fog />
        <Lighting />
        <Suspense fallback={null}>
          <Environment
            files={backgroundScene}
            background={background}
            environmentIntensity={0.5}
            backgroundIntensity={0.05}
          />
          <Scene />
        </Suspense>
      </Canvas>
    </>
  );
}
