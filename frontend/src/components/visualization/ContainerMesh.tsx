import React from 'react';
import { Box, Edges } from '@react-three/drei';
import * as THREE from 'three';
import type { ContainerSpec } from '../../types';

// ── Container Mesh (wireframe + transparent faces) ──────────────

interface ContainerMeshProps {
  container: ContainerSpec;
}

export const ContainerMesh: React.FC<ContainerMeshProps> = ({ container }) => {
  const { length: l, width: w, height: h } = container;

  return (
    <group>
      {/* Semi-transparent faces */}
      <Box args={[w, h, l]} position={[w / 2, h / 2, l / 2]}>
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </Box>

      {/* Crisp edges via EdgesGeometry */}
      <Edges
        scale={1}
        threshold={15}
        color="#5b9eff"
        position={[w / 2, h / 2, l / 2]}
      >
        <boxGeometry args={[w, h, l]} />
      </Edges>

      {/* Corner accent dots for better spatial perception */}
      {[
        [0, 0, 0], [w, 0, 0], [0, h, 0], [w, h, 0],
        [0, 0, l], [w, 0, l], [0, h, l], [w, h, l],
      ].map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], pos[2]]}>
          <sphereGeometry args={[Math.max(w, h, l) * 0.005, 8, 8]} />
          <meshBasicMaterial color="#5b9eff" />
        </mesh>
      ))}
    </group>
  );
};
