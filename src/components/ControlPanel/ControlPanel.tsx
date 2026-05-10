import { useControls } from "leva";
import { useEffect } from "react";
import { useSimulationConfig } from "@/simulation/simulationConfig";

export default function ControlsPanel() {
  const gravity = useSimulationConfig((state) => state.gravity);
  const setGravity = useSimulationConfig((state) => state.setGravity);

  const snowCount = useSimulationConfig((state) => state.snowCount);
  const setSnowCount = useSimulationConfig((state) => state.setSnowCount);

  const particleSize = useSimulationConfig((state) => state.particleSize);
  const setParticleSize = useSimulationConfig((state) => state.setParticleSize);

  const materialType = useSimulationConfig((state) => state.materialType);
  const setMaterialType = useSimulationConfig((state) => state.setMaterialType);

  const controls = useControls({
    gravity: {
      value: gravity,
      min: 0,
      max: 20,
      step: 0.1,
    },

    snowCount: {
      value: snowCount,
      min: 100,
      max: 10000,
      step: 100,
    },

    particleSize: {
      value: particleSize,
      min: 0,
      max: 3,
      step: 0.01,
    },

    materialType: {
      value: materialType,
      options: ["snow", "marble"],
    },
  });

  useEffect(() => {
    setGravity(controls.gravity);
    setSnowCount(controls.snowCount);
    setParticleSize(controls.particleSize);
    setMaterialType(controls.materialType as "snow" | "marble");
  }, [
    controls.gravity,
    controls.snowCount,
    controls.particleSize,
    controls.materialType,
    setGravity,
    setSnowCount,
    setParticleSize,
    setMaterialType,
  ]);

  return null;
}
