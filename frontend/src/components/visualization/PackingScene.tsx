import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import type { PackedItem, ContainerSpec } from '../../types';
import { ContainerMesh } from './ContainerMesh';
import { BilletMesh } from './BilletMesh';
import { SceneLighting } from './SceneLighting';
import { SceneOverlay } from './SceneOverlay';

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
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Animation trigger ────────────────────────────────────────

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
      // Reset: first set animateIn=false so BilletMesh resets to final positions
      setAnimateIn(false);

      // Save new items immediately
      prevItemsRef.current = packedItems;

      // Wait 2 frames then start animation — ensures old meshes are gone
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    }
  }, [packedItems]);

  const maxDim = Math.max(container.length, container.width, container.height);

  const camPos: [number, number, number] = useMemo(
    () => [maxDim * 0.55, maxDim * 0.45, maxDim * 0.75],
    [maxDim],
  );

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

  const handleScreenshot = useCallback(() => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `钢坯堆积方案_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = dataURL;
    link.click();
  }, []);

  const centerX = container.width / 2;
  const centerZ = container.length / 2;
  const centerY = container.height / 2;

  return (
    <div className="scene-container" ref={canvasContainerRef}>
      <Canvas
        camera={{ position: camPos, fov: 45, near: 1, far: maxDim * 8 }}
        style={{ background: 'var(--bg-secondary, #1a1a2e)' }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        <SceneLighting maxDim={maxDim} centerX={centerX} centerZ={centerZ} />

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

        <ContainerMesh container={container} />

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
      </Canvas>

      {/* Toolbar: screenshot button for 3D scene */}
      <div className="scene-toolbar">
        <button className="scene-action-btn" onClick={handleScreenshot} title="保存截图">
          📷 截图
        </button>
      </div>

      <SceneOverlay hoveredItem={hoveredItem} packedItems={packedItems} />
    </div>
  );
};
