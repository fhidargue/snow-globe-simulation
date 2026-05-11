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

  const background = useSimulationConfig((state) => state.background);
  const setBackground = useSimulationConfig((state) => state.setBackground);

  const backgroundScene = useSimulationConfig((state) => state.backgroundScene);
  const setBackgroundScene = useSimulationConfig(
    (state) => state.setBackgroundScene,
  );

  const controls = useControls({
    gravity: {
      label: "Gravity",
      value: gravity,
      min: 0,
      max: 20,
      step: 0.1,
    },

    snowCount: {
      label: "Snow Count",
      value: snowCount,
      min: 100,
      max: 10000,
      step: 100,
    },

    particleSize: {
      label: "Particle Size",
      value: particleSize,
      min: 0,
      max: 3,
      step: 0.01,
    },

    materialType: {
      label: "Material Type",
      value: materialType,
      options: {
        Snow: "snow",
        Marble: "marble",
      },
    },

    backgroundScene: {
      label: "Scene",
      value: backgroundScene,
      options: {
        "Christmas Studio": "/hdr/christmas_studio.hdr",
        "Snowy Forest": "/hdr/snowy_forest.hdr",
      },
    },

    background: {
      label: "Background",
      value: background,
    },
  });

  useEffect(() => {
    setGravity(controls.gravity);
    setSnowCount(controls.snowCount);
    setParticleSize(controls.particleSize);
    setMaterialType(controls.materialType as "snow" | "marble");
    setBackground(controls.background);
    setBackgroundScene(controls.backgroundScene);
  }, [
    controls.gravity,
    controls.snowCount,
    controls.particleSize,
    controls.materialType,
    controls.background,
    controls.backgroundScene,
    setGravity,
    setSnowCount,
    setParticleSize,
    setMaterialType,
    setBackground,
    setBackgroundScene,
  ]);

  return null;
}
