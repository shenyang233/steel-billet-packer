import React, { useRef, useState, useEffect } from 'react';
import { Edges, useCursor } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PackedItem } from '../../types';

// ── Easing helpers ──────────────────────────────────────────────

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ── Coordinate mapping ──────────────────────────────────────────
// py3dbp: position=(x=width, y=height, z=depth/length)
// Three.js: X=right, Y=up, Z=forward
// Bounding box: (width, height, length) → Three.js (x, y, z)
// CylinderGeometry defaults along Y axis; billets run along Z (length).
// We rotate geometries by [π/2, 0, 0] to align the cylinder axis with Z.

// ── Shape-specific geometry components ──────────────────────────

interface ShapeGeometryProps {
  item: PackedItem;
  maxDim: number;
  baseColor: THREE.Color;
  emissiveColor: THREE.Color;
  emissiveIntensity: number;
  materialOpacity: number;
}

const RectangularGeometry: React.FC<ShapeGeometryProps> = ({
  item,
  baseColor,
  emissiveColor,
  emissiveIntensity,
  materialOpacity,
}) => {
  const { dimensions } = item;
  const w = dimensions.width;   // Three.js x
  const h = dimensions.height;  // Three.js y
  const d = dimensions.length;  // Three.js z

  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.65}
          roughness={0.35}
          transparent
          opacity={materialOpacity}
          depthWrite={emissiveIntensity === 0}
        />
      </mesh>
      <Edges scale={1} threshold={15} color={baseColor.clone().multiplyScalar(0.35)}>
        <boxGeometry args={[w, h, d]} />
      </Edges>
    </group>
  );
};

// Cylinder: length runs along Z axis. CylinderGeometry defaults along Y.
// Rotate +π/2 around X to map Y→Z.
const CYLINDER_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0];

const CylinderGeometryView: React.FC<ShapeGeometryProps> = ({
  item,
  baseColor,
  emissiveColor,
  emissiveIntensity,
  materialOpacity,
}) => {
  const { dimensions } = item;
  const d = item.diameter || Math.min(dimensions.width, dimensions.height);
  const length = dimensions.length;
  const radius = d / 2;

  return (
    <group rotation={CYLINDER_ROTATION}>
      <mesh>
        <cylinderGeometry args={[radius, radius, length, 48]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={materialOpacity}
          depthWrite={emissiveIntensity === 0}
        />
      </mesh>
      {/* End cap outlines */}
      <Edges scale={1} threshold={15} color={baseColor.clone().multiplyScalar(0.35)}>
        <cylinderGeometry args={[radius, radius, length, 48, 1, true]} />
      </Edges>
      {/* Circle rings at each end */}
      {[length / 2, -length / 2].map((yOff, i) => (
        <mesh key={i} position={[0, yOff, 0]}>
          <ringGeometry args={[radius * 0.96, radius, 64]} />
          <meshBasicMaterial
            color={baseColor.clone().multiplyScalar(0.4)}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  );
};

const PipeGeometryView: React.FC<ShapeGeometryProps> = ({
  item,
  baseColor,
  emissiveColor,
  emissiveIntensity,
  materialOpacity,
}) => {
  const { dimensions } = item;
  const od = item.diameter || Math.min(dimensions.width, dimensions.height);
  const id = item.inner_diameter || od * 0.6;
  const length = dimensions.length;
  const outerR = od / 2;
  const innerR = id / 2;

  return (
    <group rotation={CYLINDER_ROTATION}>
      {/* Outer wall */}
      <mesh>
        <cylinderGeometry args={[outerR, outerR, length, 48, 1, true]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={materialOpacity}
          depthWrite={emissiveIntensity === 0}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Inner wall */}
      <mesh>
        <cylinderGeometry args={[innerR, innerR, length, 48, 1, true]} />
        <meshStandardMaterial
          color={baseColor.clone().multiplyScalar(0.7)}
          metalness={0.5}
          roughness={0.6}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Ring faces at each end */}
      {[length / 2, -length / 2].map((yOff, i) => (
        <mesh key={i} position={[0, yOff, 0]}>
          <ringGeometry args={[innerR, outerR, 64]} />
          <meshStandardMaterial
            color={baseColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity * 0.5}
            metalness={0.7}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Outer edge rings */}
      {[length / 2, -length / 2].map((yOff, i) => (
        <mesh key={`oring-${i}`} position={[0, yOff, 0]}>
          <ringGeometry args={[outerR * 0.96, outerR, 64]} />
          <meshBasicMaterial
            color={baseColor.clone().multiplyScalar(0.35)}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  );
};

const HexagonalGeometry: React.FC<ShapeGeometryProps> = ({
  item,
  baseColor,
  emissiveColor,
  emissiveIntensity,
  materialOpacity,
}) => {
  const { dimensions } = item;
  const s = item.side_length || dimensions.width / 2;
  const length = dimensions.length;
  // Regular hexagon: circumradius = side_length
  const circumR = s;

  return (
    <group rotation={CYLINDER_ROTATION}>
      <mesh>
        {/* 6 radial segments = hexagonal prism */}
        <cylinderGeometry args={[circumR, circumR, length, 6]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.65}
          roughness={0.35}
          transparent
          opacity={materialOpacity}
          depthWrite={emissiveIntensity === 0}
        />
      </mesh>
      <Edges scale={1} threshold={15} color={baseColor.clone().multiplyScalar(0.35)}>
        <cylinderGeometry args={[circumR, circumR, length, 6]} />
      </Edges>
    </group>
  );
};

// ── Main BilletMesh component ────────────────────────────────────

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

  const { position, dimensions } = item;
  const shape = item.shape || 'rectangular';

  // Bounding box center in Three.js world space
  const cx = position.x + dimensions.width / 2;   // x center
  const cy = position.y + dimensions.height / 2;  // y center
  const cz = position.z + dimensions.length / 2;  // z center

  // Drop-in animation: reset position when not animating, animate when active
  const startY = animateIn ? cy + maxDim * 0.3 + index * 20 : cy;
  const staggerDelay = index * 0.04;

  useEffect(() => {
    animProgress.current = 0;
    // Reset position immediately when animation toggles off
    if (!animateIn && groupRef.current) {
      groupRef.current.position.y = cy;
    }
  }, [animateIn, cy]);

  useFrame((_, delta) => {
    if (!animateIn || !groupRef.current) return;
    if (animProgress.current < 1) {
      const adjustedProgress = Math.max(0, animProgress.current - staggerDelay) / (1 - staggerDelay);
      if (adjustedProgress > 0) {
        const eased = easeOutBack(Math.min(1, adjustedProgress));
        groupRef.current.position.y = startY + (cy - startY) * eased;
      }
      animProgress.current += delta * 2.5;
    } else {
      // Snap to final position once animation completes
      groupRef.current.position.set(groupRef.current.position.x, cy, groupRef.current.position.z);
    }
  });

  const baseColor = new THREE.Color(item.color);
  const emissiveIntensity = isSelected ? 0.5 : isHovered ? 0.25 : 0;
  const emissiveColor = isSelected
    ? new THREE.Color('#ffcc00')
    : isHovered
      ? new THREE.Color('#8899bb')
      : new THREE.Color('#000000');
  const materialOpacity = isHovered || isSelected ? 1 : 0.92;

  const geoProps: ShapeGeometryProps = {
    item,
    maxDim,
    baseColor,
    emissiveColor,
    emissiveIntensity,
    materialOpacity,
  };

  return (
    <group
      ref={groupRef}
      position={[cx, startY, cz]}
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
      {shape === 'cylinder' && <CylinderGeometryView {...geoProps} />}
      {shape === 'pipe' && <PipeGeometryView {...geoProps} />}
      {shape === 'hexagonal' && <HexagonalGeometry {...geoProps} />}
      {(!shape || shape === 'rectangular') && <RectangularGeometry {...geoProps} />}
    </group>
  );
};
