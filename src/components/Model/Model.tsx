import * as THREE from "three";

import { useEffect, useMemo } from "react";

import { useGLTF, useTexture } from "@react-three/drei";

const EMPTY_TEXTURE = "/assets/textures/empty.jpg";

export type ModelProps = {
  model: string;
  textures?: {
    map?: string;
    normalMap?: string;
    roughnessMap?: string;
    metalnessMap?: string;
  };
  color?: THREE.ColorRepresentation;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  metalness?: number;
  roughness?: number;
};

export default function Model({
  model,
  textures: texturePaths,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  color,
  metalness = 0.2,
  roughness = 1,
}: ModelProps) {
  const gltf = useGLTF(model);

  const loadedTextures = useTexture({
    map: texturePaths?.map || EMPTY_TEXTURE,
    normalMap: texturePaths?.normalMap || EMPTY_TEXTURE,
    roughnessMap: texturePaths?.roughnessMap || EMPTY_TEXTURE,
    metalnessMap: texturePaths?.metalnessMap || EMPTY_TEXTURE,
  });

  const textures = useMemo(() => {
    if (!texturePaths) return null;

    const cloned: Record<string, THREE.Texture> = {};

    Object.entries(loadedTextures).forEach(([key, texture]) => {
      const clonedTexture = texture.clone();

      clonedTexture.flipY = false;

      if (key === "map") {
        clonedTexture.colorSpace = THREE.SRGBColorSpace;
      }

      cloned[key] = clonedTexture;
    });

    return cloned;
  }, [loadedTextures, texturePaths]);

  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        child.material = new THREE.MeshStandardMaterial({
          ...(textures?.map && {
            map: textures.map,
          }),
          ...(textures?.normalMap && {
            normalMap: textures.normalMap,
          }),
          ...(textures?.roughnessMap && {
            roughnessMap: textures.roughnessMap,
          }),
          ...(textures?.metalnessMap && {
            metalnessMap: textures.metalnessMap,
          }),
          ...(color && {
            color: new THREE.Color(color),
          }),
          roughness,
          metalness,
        });
      }
    });
  }, [gltf, textures, color, metalness, roughness]);

  return (
    <primitive
      object={gltf.scene}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
