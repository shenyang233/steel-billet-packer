import React, { useRef, useState, useEffect } from 'react';
import { Box, Edges, useCursor } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PackedItem } from '../../types';

// ── Easing helpers ──────────────────────────────────────────────

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ── Billet Mesh ─────────────────────────────────────────────────

interface BilletMeshProps {
  item: PackedItem;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
  animateIn: boolean;
  maxDim: number;
}

export const BilletMesh: React.FC<BilletMeshProps> = ({
  item,
  index,
  isSelected,
  isHovered,
  onClick,
  onHover,
  animateIn,
  maxDim,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const animProgress = useRef(0);
  const [hoveredLocal, setHoveredLocal] = useState(false);

  useCursor(hoveredLocal || isHovered);

  const { position, dimensions, color } = item;

  // py3dbp uses (x=width, y=height, z=depth/length)
  const geomWidth = dimensions.width;
  const geomHeight = dimensions.height;
  const geomDepth = dimensions.length;

  // Center the box on its position
  const cx = position.x + geomWidth / 2;
  const cy = position.y + geomHeight / 2;
  const cz = position.z + geomDepth / 2;

  // Drop-in start: float above, staggered by index
  const startY = animateIn ? cy + maxDim * 0.3 + index * 20 : cy;
  const staggerDelay = index * 0.04;

  useEffect(() => {
    if (animateIn) {
      animProgress.current = 0;
    }
  }, [animateIn]);

  useFrame((_, delta) => {
    if (!animateIn || !groupRef.current) return;
    if (animProgress.current < 1) {
      const staggerStart = staggerDelay;
      const adjustedProgress = Math.max(0, animProgress.current - staggerStart) / (1 - staggerStart);
      if (adjustedProgress > 0) {
        const eased = easeOutBack(Math.min(1, adjustedProgress));
        groupRef.current.position.y = startY + (cy - startY) * eased;
      }
      animProgress.current += delta * 2.5; // ~0.4s base duration
    } else if (groupRef.current.position.y !== cy) {
      groupRef.current.position.y = cy;
    }
  });

  const baseColor = new THREE.Color(color);
  const edgeColor = baseColor.clone().multiplyScalar(0.35);

  const emissiveIntensity = isSelected ? 0.5 : isHovered ? 0.25 : 0;
  const emissiveColor = isSelected
    ? new THREE.Color('#ffcc00')
    : isHovered
      ? new THREE.Color('#8899bb')
      : new THREE.Color('#000000');

  const materialOpacity = isHovered || isSelected ? 1 : 0.92;

  return (
    <group ref={groupRef} position={[cx, startY, cz]}>
      <Box
        args={[geomWidth, geomHeight, geomDepth]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredLocal(true);
          onHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredLocal(false);
          onHover(false);
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.65}
          roughness={0.35}
          transparent
          opacity={materialOpacity}
          depthWrite={!isHovered && !isSelected}
        />
      </Box>

      {/* Edge lines for visible seams between adjacent billets */}
      <Edges scale={1} threshold={15} color={edgeColor}>
        <boxGeometry args={[geomWidth, geomHeight, geomDepth]} />
      </Edges>
    </group>
  );
};
