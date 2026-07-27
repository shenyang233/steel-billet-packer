import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { PackedItem, ContainerSpec } from '../../types';
import { ContainerMesh } from './ContainerMesh';
import { BilletMesh } from './BilletMesh';
import { SceneLighting } from './SceneLighting';
import { SceneOverlay } from './SceneOverlay';

// ── Screenshot button (inside Canvas context to access gl) ───────

function ScreenshotButton() {
  const { gl, scene, camera } = useThree();

  const handleScreenshot = useCallback(() => {
    // Render one frame to ensure everything is drawn
    gl.render(scene, camera);
    const dataURL = gl.domElement.toDataURL('image/png');
    // Trigger download
    const link = document.createElement('a');
    link.download = `钢坯堆积方案_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = dataURL;
    link.click();
  }, [gl, scene, camera]);

  return (
    <button
      className="screenshot-btn"
      onClick={handleScreenshot}
      title="保存截图"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 20,
        background: 'rgba(10,10,26,0.85)',
        border: '1px solid var(--border-color)',
        borderRadius: 6,
        color: 'var(--text-primary)',
        padding: '6px 12px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      📷 截图
    </button>
  );
}

// ── Main Scene Component ────────────────────────────────────────

interface PackingSceneProps {
  container: ContainerSpec;
  packedItems: PackedItem[];
  selectedKey: string | null;
  hoveredKey: string | null;
  onSelectKey: (key: string | null) => void;
  onHoverKey: (key: string | null) => void;
}

export const PackingScene: React.FC<PackingSceneProps> = ({
  container,
  packedItems,
  selectedKey,
  hoveredKey,
  onSelectKey,
  onHoverKey,
}) => {
  const [animateIn, setAnimateIn] = useState(false);
  const prevItemsRef = useRef<PackedItem[]>([]);

  // Trigger animation whenever packedItems change (new packing result)
  useEffect(() => {
    const prevKeys = prevItemsRef.current
      .map((p) => `${p.billet_id}_${p.instance_id}`)
      .sort()
      .join(',');
    const newKeys = packedItems
      .map((p) => `${p.billet_id}_${p.instance_id}`)
      .sort()
      .join(',');

    if (prevKeys !== newKeys) {
      setAnimateIn(false);
      const timer = setTimeout(() => setAnimateIn(true), 50);
      prevItemsRef.current = packedItems;
      return () => clearTimeout(timer);
    }
  }, [packedItems]);

  const maxDim = Math.max(container.length, container.width, container.height);

  // Camera position: ISO-style offset from the container center
  const camPos: [number, number, number] = useMemo(
    () => [maxDim * 0.55, maxDim * 0.45, maxDim * 0.75],
    [maxDim],
  );

  // Find the currently hovered item for the tooltip overlay
  const hoveredItem = useMemo(() => {
    if (!hoveredKey) return null;
    const parts = hoveredKey.split('_');
    const idx = parts.pop()!;
    return (
      packedItems.find(
        (p) => p.billet_id === parts.join('_') && p.instance_id === parseInt(idx),
      ) ?? null
    );
  }, [hoveredKey, packedItems]);

  const centerX = container.width / 2;
  const centerZ = container.length / 2;
  const centerY = container.height / 2;

  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: camPos, fov: 45, near: 1, far: maxDim * 8 }}
        style={{ background: 'var(--bg-secondary, #1a1a2e)' }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        {/* Lighting & Environment */}
        <SceneLighting maxDim={maxDim} centerX={centerX} centerZ={centerZ} />

        {/* Grid */}
        <Grid
          position={[centerX, -0.5, centerZ]}
          args={[maxDim * 1.5, maxDim * 1.5]}
          cellSize={Math.max(container.width, container.length) / 18}
          cellThickness={0.5}
          cellColor="#4a5568"
          sectionSize={5}
          sectionThickness={1.2}
          sectionColor="#6b7d98"
          fadeDistance={maxDim * 2.5}
          infiniteGrid
        />

        {/* Container wireframe */}
        <ContainerMesh container={container} />

        {/* Billets */}
        {packedItems.map((item, index) => {
          const key = `${item.billet_id}_${item.instance_id}`;
          return (
            <BilletMesh
              key={key}
              item={item}
              index={index}
              isSelected={selectedKey === key}
              isHovered={hoveredKey === key}
              onClick={() => onSelectKey(selectedKey === key ? null : key)}
              onHover={(hovered) => onHoverKey(hovered ? key : null)}
              animateIn={animateIn}
              maxDim={maxDim}
            />
          );
        })}

        {/* Orbit Controls */}
        <OrbitControls
          target={[centerX, centerY, centerZ]}
          enableDamping
          dampingFactor={0.1}
          minDistance={maxDim * 0.2}
          maxDistance={maxDim * 4}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
          mouseButtons={{
            LEFT: 0 as const,
            MIDDLE: 1 as const,
            RIGHT: 2 as const,
          }}
        />

        {/* Screenshot button (must be inside Canvas) */}
        <ScreenshotButton />
      </Canvas>

      {/* HTML overlay: tooltip + legend */}
      <SceneOverlay hoveredItem={hoveredItem} packedItems={packedItems} />
    </div>
  );
};
