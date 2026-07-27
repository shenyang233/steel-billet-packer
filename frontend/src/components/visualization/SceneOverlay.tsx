import React from 'react';
import type { PackedItem } from '../../types';

interface SceneOverlayProps {
  hoveredItem: PackedItem | null;
  packedItems: PackedItem[];
}

const SHAPE_LABELS: Record<string, string> = {
  rectangular: '方形',
  cylinder: '圆柱',
  pipe: '管材',
  hexagonal: '六角',
};

export const SceneOverlay: React.FC<SceneOverlayProps> = ({
  hoveredItem,
  packedItems,
}) => {
  // Build legend entries: deduplicate by billet_id, with count
  const legendEntries = (() => {
    const map = new Map<string, { color: string; count: number }>();
    packedItems.forEach((p) => {
      const entry = map.get(p.billet_id);
      if (entry) {
        entry.count++;
      } else {
        map.set(p.billet_id, { color: p.color, count: 1 });
      }
    });
    return Array.from(map.entries());
  })();

  const formatDimensions = (item: PackedItem): string => {
    const shape = item.shape || 'rectangular';
    switch (shape) {
      case 'cylinder':
        return `∅${item.diameter?.toFixed(1) || '?'} × ${item.dimensions.length.toFixed(0)} mm`;
      case 'pipe':
        return `∅${item.diameter?.toFixed(1) || '?'} / ∅${item.inner_diameter?.toFixed(1) || '?'} × ${item.dimensions.length.toFixed(0)} mm`;
      case 'hexagonal':
        return `S=${item.side_length?.toFixed(1) || '?'} × ${item.dimensions.length.toFixed(0)} mm`;
      case 'rectangular':
      default:
        return `${item.dimensions.length.toFixed(0)} × ${item.dimensions.width.toFixed(0)} × ${item.dimensions.height.toFixed(0)} mm`;
    }
  };

  return (
    <>
      {/* Tooltip */}
      {hoveredItem && (
        <div className="scene-tooltip">
          <div className="tooltip-header">
            <span
              className="tooltip-swatch"
              style={{ background: hoveredItem.color }}
            />
            <strong>{hoveredItem.billet_id}</strong>
            <span className="tooltip-shape">{SHAPE_LABELS[hoveredItem.shape || 'rectangular'] || hoveredItem.shape}</span>
            <span className="tooltip-instance">#{hoveredItem.instance_id}</span>
          </div>
          <div className="tooltip-body">
            <div className="tooltip-row">
              <span className="tooltip-label">
                {hoveredItem.shape === 'cylinder' || hoveredItem.shape === 'pipe' ? '规格' : '尺寸'}
              </span>
              <span className="tooltip-value">{formatDimensions(hoveredItem)}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">位置</span>
              <span className="tooltip-value">
                ({hoveredItem.position.x.toFixed(0)}, {hoveredItem.position.y.toFixed(0)}, {hoveredItem.position.z.toFixed(0)})
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">旋转</span>
              <span className="tooltip-value">{hoveredItem.rotation}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="scene-legend">
        <div className="legend-title">图例</div>
        {legendEntries.map(([id, { color, count }]) => (
          <div key={id} className="legend-item">
            <span className="legend-swatch" style={{ background: color }} />
            <span className="legend-id">{id}</span>
            <span className="legend-count">{count}</span>
          </div>
        ))}
      </div>
    </>
  );
};
