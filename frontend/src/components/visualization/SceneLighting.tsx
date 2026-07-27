import React from 'react';
import { Environment, ContactShadows } from '@react-three/drei';

interface SceneLightingProps {
  maxDim: number;
  /** Center X (container width / 2) */
  centerX: number;
  /** Center Z (container length / 2) */
  centerZ: number;
}

export const SceneLighting: React.FC<SceneLightingProps> = ({
  maxDim,
  centerX,
  centerZ,
}) => {
  return (
    <>
      {/* HDR environment for metallic reflections on steel billets */}
      <Environment preset="warehouse" background={false} />

      {/* Key light — warm white from upper right */}
      <directionalLight
        position={[maxDim, maxDim * 1.5, maxDim * 0.5]}
        intensity={0.6}
        color="#fff8f0"
      />

      {/* Fill light — cool blue from lower left */}
      <directionalLight
        position={[-maxDim * 0.5, maxDim * 0.3, -maxDim * 0.5]}
        intensity={0.25}
        color="#b0c8e8"
      />

      {/* Rim light — subtle backlight for depth separation */}
      <directionalLight
        position={[0, maxDim * 0.6, -maxDim]}
        intensity={0.15}
        color="#e0e8ff"
      />

      {/* Ambient — very low, environment does most of the work */}
      <ambientLight intensity={0.15} color="#8899bb" />

      {/* Contact shadow for spatial grounding */}
      <ContactShadows
        position={[centerX, -0.01, centerZ]}
        scale={maxDim * 0.8}
        blur={2.5}
        far={maxDim * 0.4}
        opacity={0.35}
        color="#1a1a3e"
      />
    </>
  );
};
