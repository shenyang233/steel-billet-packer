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
// CylinderGeometry defaults along Y axis; billets run along Z (length).
// Rotate by [π/2, 0, 0] to align the cylinder axis with Z.

const CYLINDER_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0];

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
  return (
    <group>
      <mesh>
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
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
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
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
  const radius = d / 2;
  const length = dimensions.length;

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
      <Edges scale={1} threshold={15} color={baseColor.clone().multiplyScalar(0.35)}>
        <cylinderGeometry args={[radius, radius, length, 48, 1, true]} />
      </Edges>
      {[length / 2, -length / 2].map((yOff, i) => (
        <mesh key={i} position={[0, yOff, 0]}>
          <ringGeometry args={[radius * 0.96, radius, 64]} />
          <meshBasicMaterial color={baseColor.clone().multiplyScalar(0.4)} side={THREE.DoubleSide} depthTest={false} />
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
  const outerR = od / 2;
  const innerR = id / 2;
  const length = dimensions.length;

  return (
    <group rotation={CYLINDER_ROTATION}>
      <mesh>
        <cylinderGeometry args={[outerR, outerR, length, 48, 1, true]} />
        <meshStandardMaterial color={baseColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} metalness={0.7} roughness={0.3} transparent opacity={materialOpacity} depthWrite={emissiveIntensity === 0} side={THREE.FrontSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[innerR, innerR, length, 48, 1, true]} />
        <meshStandardMaterial color={baseColor.clone().multiplyScalar(0.7)} metalness={0.5} roughness={0.6} side={THREE.BackSide} />
      </mesh>
      {[length / 2, -length / 2].map((yOff, i) => (
        <mesh key={i} position={[0, yOff, 0]}>
          <ringGeometry args={[innerR, outerR, 64]} />
          <meshStandardMaterial color={baseColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity * 0.5} metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[length / 2, -length / 2].map((yOff, i) => (
        <mesh key={`o-${i}`} position={[0, yOff, 0]}>
          <ringGeometry args={[outerR * 0.96, outerR, 64]} />
          <meshBasicMaterial color={baseColor.clone().multiplyScalar(0.35)} side={THREE.DoubleSide} depthTest={false} />
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
  const circumR = s;

  return (
    <group rotation={CYLINDER_ROTATION}>
      <mesh>
        <cylinderGeometry args={[circumR, circumR, dimensions.length, 6]} />
        <meshStandardMaterial color={baseColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} metalness={0.65} roughness={0.35} transparent opacity={materialOpacity} depthWrite={emissiveIntensity === 0} />
      </mesh>
      <Edges scale={1} threshold={15} color={baseColor.clone().multiplyScalar(0.35)}>
        <cylinderGeometry args={[circumR, circumR, dimensions.length, 6]} />
      </Edges>
    </group>
  );
};

// ── Animated Billet Wrapper ─────────────────────────────────────

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
  const [hoveredLocal, setHoveredLocal] = useState(false);
  const animStartTime = useRef<number | null>(null);
  const initialOffsetY = useRef(0);

  useCursor(hoveredLocal || isHovered);

  const { position, dimensions } = item;
  const shape = item.shape || 'rectangular';

  // Target center position in world space
  const targetX = position.x + dimensions.width / 2;
  const targetY = position.y + dimensions.height / 2;
  const targetZ = position.z + dimensions.length / 2;

  // On first mount or re-optimize, record the initial animation offset
  const staggerDelay = index * 0.04;

  useEffect(() => {
    animStartTime.current = null;
    if (animateIn) {
      initialOffsetY.current = maxDim * 0.3 + index * 20;
    } else {
      initialOffsetY.current = 0;
    }
  }, [animateIn, maxDim, index]);

  useFrame((state) => {
    if (!groupRef.current) return;

    if (!animateIn) {
      groupRef.current.position.set(targetX, targetY, targetZ);
      return;
    }

    // Animation timing
    if (animStartTime.current === null) {
      animStartTime.current = state.clock.getElapsedTime();
    }

    const elapsed = state.clock.getElapsedTime() - animStartTime.current;
    const adjustedTime = Math.max(0, elapsed - staggerDelay);
    const duration = 0.5; // seconds base duration

    if (adjustedTime >= duration) {
      // Animation complete — snap to target
      groupRef.current.position.set(targetX, targetY, targetZ);
    } else {
      const t = adjustedTime / duration;
      const eased = easeOutBack(t);
      const offsetY = initialOffsetY.current * (1 - eased);
      groupRef.current.position.set(targetX, targetY + offsetY, targetZ);
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
      position={[targetX, animateIn ? targetY + initialOffsetY.current : targetY, targetZ]}
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
