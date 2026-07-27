import React from 'react';
import type { ContainerSpec } from '../../types';

interface Props {
  container: ContainerSpec;
  onChange: (container: Partial<ContainerSpec>) => void;
  onPreset: (preset: ContainerSpec) => void;
}

const PRESETS: { label: string; spec: ContainerSpec }[] = [
  { label: '20ft 集装箱', spec: { length: 5898, width: 2352, height: 2393 } },
  { label: '40ft 集装箱', spec: { length: 12032, width: 2352, height: 2393 } },
  { label: '40ft 高柜', spec: { length: 12032, width: 2352, height: 2698 } },
  { label: '9.6m 货车', spec: { length: 9600, width: 2400, height: 2500 } },
  { label: '13m 货车', spec: { length: 13000, width: 2400, height: 2500 } },
];

export const ContainerForm: React.FC<Props> = ({ container, onChange, onPreset }) => {
  return (
    <div className="form-section">
      <h3>📦 容器尺寸</h3>
      <div className="preset-row">
        <label>预设容器：</label>
        <select
          onChange={(e) => {
            const idx = parseInt(e.target.value);
            if (idx >= 0) onPreset(PRESETS[idx].spec);
          }}
          defaultValue="-1"
        >
          <option value="-1">自定义</option>
          {PRESETS.map((p, i) => (
            <option key={i} value={i}>{p.label} ({p.spec.length}×{p.spec.width}×{p.spec.height}mm)</option>
          ))}
        </select>
      </div>
      <div className="dim-row">
        <div className="input-group">
          <label>长 (mm)</label>
          <input
            type="number"
            value={container.length}
            onChange={(e) => onChange({ length: parseFloat(e.target.value) || 0 })}
            min={1}
            step={1}
          />
        </div>
        <div className="input-group">
          <label>宽 (mm)</label>
          <input
            type="number"
            value={container.width}
            onChange={(e) => onChange({ width: parseFloat(e.target.value) || 0 })}
            min={1}
            step={1}
          />
        </div>
        <div className="input-group">
          <label>高 (mm)</label>
          <input
            type="number"
            value={container.height}
            onChange={(e) => onChange({ height: parseFloat(e.target.value) || 0 })}
            min={1}
            step={1}
          />
        </div>
      </div>
    </div>
  );
};
