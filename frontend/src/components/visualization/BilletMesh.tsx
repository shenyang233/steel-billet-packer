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
  const w = dimensions.width;
  const h = dimensions.height;
  const d = dimensions.length;

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
    <group rotation={[0, 0, Math.PI / 2]}>
      {/* Main cylinder body */}
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
      {/* Top/bottom circle rings */}
      <lineLoop geometry={new THREE.RingGeometry(radius * 0.98, radius, 64)} position={[0, length / 2, 0]} />
      <lineLoop geometry={new THREE.RingGeometry(radius * 0.98, radius, 64)} position={[0, -length / 2, 0]} />
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
    <group rotation={[0, 0, Math.PI / 2]}>
      {/* Outer cylinder */}
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
      {/* Inner cylinder (hollow interior) */}
      <mesh>
        <cylinderGeometry args={[innerR, innerR, length, 48, 1, true]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.5}
          roughness={0.6}
          side={THREE.BackSide}
        />
      </mesh>
      {/* End faces (ring cross-sections) */}
      <mesh position={[0, length / 2, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[innerR, outerR, 64]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.7}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -length / 2, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[innerR, outerR, 64]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          metalness={0.7}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Edge lines */}
      <lineLoop geometry={new THREE.RingGeometry(outerR * 0.98, outerR, 64)} position={[0, length / 2 + 0.1, 0]}>
        <lineBasicMaterial color={baseColor.clone().multiplyScalar(0.35)} />
      </lineLoop>
      <lineLoop geometry={new THREE.RingGeometry(outerR * 0.98, outerR, 64)} position={[0, -length / 2 - 0.1, 0]}>
        <lineBasicMaterial color={baseColor.clone().multiplyScalar(0.35)} />
      </lineLoop>
      <Edges scale={1} threshold={15} color={baseColor.clone().multiplyScalar(0.25)}>
        <cylinderGeometry args={[outerR, outerR, length, 48, 1, true]} />
      </Edges>
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

  // Regular hexagon circumradius
  const circumRadius = s; // CylinderGeometry radiusRadial= segments; for 6 sides, radius is side length

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[circumRadius, circumRadius, length, 6]} />
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
        <cylinderGeometry args={[circumRadius, circumRadius, length, 6]} />
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

  // All shapes: compute center position from bounding box
  const geomWidth = dimensions.width;
  const geomHeight = dimensions.height;
  const geomDepth = dimensions.length;

  const cx = position.x + geomWidth / 2;
  const cy = position.y + geomHeight / 2;
  const cz = position.z + geomDepth / 2;

  // Drop-in animation
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
      const adjustedProgress = Math.max(0, animProgress.current - staggerDelay) / (1 - staggerDelay);
      if (adjustedProgress > 0) {
        const eased = easeOutBack(Math.min(1, adjustedProgress));
        groupRef.current.position.y = startY + (cy - startY) * eased;
      }
      animProgress.current += delta * 2.5;
    } else if (groupRef.current.position.y !== cy) {
      groupRef.current.position.y = cy;
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
