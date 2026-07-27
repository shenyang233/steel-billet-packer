import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { PackedItem, ContainerSpec } from '../../types';

// ── Container Mesh (wireframe) ─────────────────────────────────

interface ContainerMeshProps {
  container: ContainerSpec;
}

const ContainerMesh: React.FC<ContainerMeshProps> = ({ container }) => {
  const l = container.length;
  const w = container.width;
  const h = container.height;

  return (
    <group>
      {/* Semi-transparent faces */}
      <Box args={[w, h, l]} position={[w / 2, h / 2, l / 2]}>
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </Box>
      {/* Wireframe edges */}
      <Line
        points={[
          [0, 0, 0], [w, 0, 0], [w, 0, l], [0, 0, l], [0, 0, 0], // bottom
          [0, h, 0], [w, h, 0], [w, h, l], [0, h, l], [0, h, 0], // top
          [0, 0, 0], [0, h, 0], // verticals
          [w, 0, 0], [w, h, 0],
          [w, 0, l], [w, h, l],
          [0, 0, l], [0, h, l],
        ]}
        color="#4a9eff"
        lineWidth={1}
      />
    </group>
  );
};

// ── Billet Mesh ────────────────────────────────────────────────

interface BilletMeshProps {
  item: PackedItem;
  isSelected: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
}

const BilletMesh: React.FC<BilletMeshProps> = ({ item, isSelected, onClick, onHover }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { position, dimensions, color } = item;

  // py3dbp uses (x=width, y=height, z=depth)
  // dimensions: length (depth), width, height
  const geomWidth = dimensions.width;
  const geomHeight = dimensions.height;
  const geomDepth = dimensions.length;

  // Center the box on its position
  const cx = position.x + geomWidth / 2;
  const cy = position.y + geomHeight / 2;
  const cz = position.z + geomDepth / 2;

  const baseColor = new THREE.Color(color);
  const emissiveColor = isSelected
    ? new THREE.Color('#ffff00')
    : new THREE.Color('#000000');

  return (
    <Box
      ref={meshRef}
      args={[geomWidth, geomHeight, geomDepth]}
      position={[cx, cy, cz]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(false);
      }}
    >
      <meshStandardMaterial
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={isSelected ? 0.5 : 0}
        metalness={0.6}
        roughness={0.4}
        transparent
        opacity={0.85}
      />
    </Box>
  );
};

// ── Main Scene ─────────────────────────────────────────────────

interface PackingSceneProps {
  container: ContainerSpec;
  packedItems: PackedItem[];
}

export const PackingScene: React.FC<PackingSceneProps> = ({ container, packedItems }) => {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const maxDim = Math.max(container.length, container.width, container.height);
  const camPos: [number, number, number] = [maxDim * 0.6, maxDim * 0.5, maxDim * 0.8];

  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: camPos, fov: 45, near: 10, far: 200000 }}
        style={{ background: '#1a1a2e' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[maxDim, maxDim * 2, maxDim]} intensity={0.8} />
        <directionalLight position={[-maxDim, maxDim, -maxDim]} intensity={0.3} />

        {/* Grid */}
        <Grid
          position={[container.width / 2, -0.5, container.length / 2]}
          args={[maxDim * 1.2, maxDim * 1.2]}
          cellSize={Math.max(container.width, container.length) / 20}
          cellThickness={0.5}
          cellColor="#333355"
          sectionSize={5}
          fadeDistance={maxDim * 2}
          infiniteGrid
        />

        {/* Container */}
        <ContainerMesh container={container} />

        {/* Billets */}
        {packedItems.map((item) => {
          const key = `${item.billet_id}_${item.instance_id}`;
          return (
            <BilletMesh
              key={key}
              item={item}
              isSelected={selectedId === key}
              onClick={() => setSelectedId(selectedId === key ? null : key)}
              onHover={(hovered) => setHoveredId(hovered ? key : null)}
            />
          );
        })}

        {/* Controls */}
        <OrbitControls
          target={[container.width / 2, container.height / 2, container.length / 2]}
          enableDamping
          dampingFactor={0.1}
        />
      </Canvas>

      {/* Tooltip */}
      {hoveredId && (() => {
        const parts = hoveredId.split('_');
        const billetId = parts.slice(0, -1).join('_');
        const instanceId = parts[parts.length - 1];
        const item = packedItems.find(
          (p) => p.billet_id === billetId && p.instance_id === parseInt(instanceId)
        );
        if (!item) return null;
        return (
          <div className="tooltip">
            <strong>{item.billet_id}</strong> #{item.instance_id}
            <br />
            尺寸: {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height} mm
            <br />
            位置: ({item.position.x.toFixed(0)}, {item.position.y.toFixed(0)}, {item.position.z.toFixed(0)})
          </div>
        );
      })()}

      {/* Legend */}
      <div className="legend">
        {Array.from(new Map(packedItems.map(p => [p.billet_id, p.color])).entries()).map(([id, color]) => (
          <div key={id} className="legend-item">
            <span className="legend-color" style={{ background: color }} />
            <span>{id}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
