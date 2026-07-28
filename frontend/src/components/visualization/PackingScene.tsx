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

  // ── Recording state ──────────────────────────────────────────

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return canvasContainerRef.current?.querySelector('canvas') ?? null;
  }, []);

  const handleToggleRecord = useCallback(() => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      return;
    }

    const canvas = getCanvas();
    if (!canvas) return;

    // Try VP9 first, fall back to VP8, then browser default
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const stream = canvas.captureStream(30); // 30 FPS
    chunksRef.current = [];

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `钢坯堆积录屏_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        chunksRef.current = [];
        mediaRecorderRef.current = null;
      };

      // Record in 1-second chunks so we can collect them on stop
      recorder.start(1000);
      setIsRecording(true);
    } catch {
      // MediaRecorder not supported
      console.warn('MediaRecorder not available');
    }
  }, [isRecording, getCanvas]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

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
      setAnimateIn(false);
      const timer = setTimeout(() => setAnimateIn(true), 50);
      prevItemsRef.current = packedItems;
      return () => clearTimeout(timer);
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
    const canvas = getCanvas();
    if (!canvas) return;
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `钢坯堆积方案_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = dataURL;
    link.click();
  }, [getCanvas]);

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

      {/* Toolbar: screenshot + record buttons */}
      <div className="scene-toolbar">
        <button className="scene-action-btn" onClick={handleScreenshot} title="保存截图">
          📷 截图
        </button>
        <button
          className={`scene-action-btn ${isRecording ? 'recording' : ''}`}
          onClick={handleToggleRecord}
          title={isRecording ? '停止录制' : '录制视频'}
        >
          {isRecording ? (
            <>
              <span className="record-dot" />
              停止
            </>
          ) : (
            '🎥 录制'
          )}
        </button>
        {isRecording && <span className="record-time">REC</span>}
      </div>

      <SceneOverlay hoveredItem={hoveredItem} packedItems={packedItems} />
    </div>
  );
};
