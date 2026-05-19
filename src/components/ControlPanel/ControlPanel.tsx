import { useControls } from "leva";
import { useEffect } from "react";

import { useSimulationConfig } from "@/hooks/simulationConfig";
import { MATERIAL_TYPE } from "@/utils/constants";

export default function ControlsPanel() {
  const mouseSensitivity = useSimulationConfig(
    (state) => state.mouseSensitivity,
  );
  const setMouseSensitivity = useSimulationConfig(
    (state) => state.setMouseSensitivity,
  );

  const velocity = useSimulationConfig((state) => state.velocity);
  const setVelocity = useSimulationConfig((state) => state.setVelocity);

  const snowCount = useSimulationConfig((state) => state.snowCount);
  const setSnowCount = useSimulationConfig((state) => state.setSnowCount);

  const particleSize = useSimulationConfig((state) => state.particleSize);
  const setParticleSize = useSimulationConfig((state) => state.setParticleSize);

  const materialType = useSimulationConfig((state) => state.materialType);
  const setMaterialType = useSimulationConfig((state) => state.setMaterialType);

  const showBackground = useSimulationConfig((state) => state.showBackground);
  const setShowBackground = useSimulationConfig(
    (state) => state.setShowBackground,
  );

  const backgroundScene = useSimulationConfig((state) => state.backgroundScene);
  const setBackgroundScene = useSimulationConfig(
    (state) => state.setBackgroundScene,
  );

  const showEllipsoids = useSimulationConfig((state) => state.showEllipsoids);
  const setShowEllipsoids = useSimulationConfig(
    (state) => state.setShowEllipsoids,
  );

  const controls = useControls({
    Info: {
      value: "Refresh page to reset the settings",
      editable: false,
    },
    mouseSensitivity: {
      label: "Mouse Sensitivity",
      value: mouseSensitivity,
      min: 1,
      max: 20,
      step: 1,
    },

    velocity: {
      label: "Velocity",
      value: velocity,
      min: 0,
      max: 20,
      step: 1,
    },

    snowCount: {
      label: "Snow Count",
      value: snowCount,
      min: 100,
      max: 20000,
      step: 100,
    },

    particleSize: {
      label: "Particle Size",
      value: particleSize,
      min: 0,
      max: 3,
      step: 0.1,
    },

    materialType: {
      label: "Material Type",
      value: materialType,
      options: {
        Marbles: MATERIAL_TYPE.MARBLE,
        Snow: MATERIAL_TYPE.SNOW,
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
      label: "Show Background",
      value: showBackground,
    },

    showEllipsoids: {
      label: "Show Ellipsoids",
      value: showEllipsoids,
    },
  });

  useEffect(() => {
    setMouseSensitivity(controls.mouseSensitivity);
    setVelocity(controls.velocity);
    setSnowCount(controls.snowCount);
    setParticleSize(controls.particleSize);
    setMaterialType(controls.materialType as "snow" | "marble");
    setShowBackground(controls.background);
    setBackgroundScene(controls.backgroundScene);
    setShowEllipsoids(controls.showEllipsoids);
  }, [
    controls.mouseSensitivity,
    controls.velocity,
    controls.snowCount,
    controls.particleSize,
    controls.materialType,
    controls.background,
    controls.backgroundScene,
    controls.showEllipsoids,
    setMouseSensitivity,
    setVelocity,
    setSnowCount,
    setParticleSize,
    setMaterialType,
    setShowBackground,
    setBackgroundScene,
    setShowEllipsoids,
  ]);

  return null;
}
