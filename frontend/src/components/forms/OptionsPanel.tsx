import React from 'react';
import type { PackingOptions } from '../../types';

interface Props {
  options: PackingOptions;
  onChange: (options: Partial<PackingOptions>) => void;
  onOptimize: () => void;
  loading: boolean;
  canOptimize: boolean;
}

export const OptionsPanel: React.FC<Props> = ({
  options,
  onChange,
  onOptimize,
  loading,
  canOptimize,
}) => {
  return (
    <div className="form-section">
      <h3>⚙️ 打包选项</h3>

      <div className="option-row">
        <label>间隙 (mm)</label>
        <input
          type="number"
          value={options.clearance_mm}
          onChange={(e) => onChange({ clearance_mm: parseFloat(e.target.value) || 0 })}
          min={0}
          max={200}
          step={1}
        />
      </div>

      <div className="option-row">
        <label>允许旋转</label>
        <input
          type="checkbox"
          checked={options.allow_rotation}
          onChange={(e) => onChange({ allow_rotation: e.target.checked })}
        />
      </div>

      {options.allow_rotation && (
        <div className="option-row">
          <label>旋转轴限制</label>
          <select
            value={options.rotation_axes}
            onChange={(e) => onChange({ rotation_axes: e.target.value as 'all' | 'vertical_only' | 'none' })}
          >
            <option value="all">全部 6 个方向</option>
            <option value="vertical_only">仅绕垂直轴</option>
          </select>
        </div>
      )}

      <div className="option-row">
        <label>优化目标</label>
        <select
          value={options.optimize_for}
          onChange={(e) => onChange({ optimize_for: e.target.value as 'utilization' | 'count' })}
        >
          <option value="utilization">最大体积利用率</option>
          <option value="count">最大装载数量</option>
        </select>
      </div>

      <div className="option-row">
        <label>重力稳定</label>
        <input
          type="checkbox"
          checked={options.gravity_stable}
          onChange={(e) => onChange({ gravity_stable: e.target.checked })}
        />
      </div>

      <div className="option-row">
        <label>超时 (ms)</label>
        <input
          type="number"
          value={options.solver_timeout_ms}
          onChange={(e) => onChange({ solver_timeout_ms: parseInt(e.target.value) || 30000 })}
          min={1000}
          max={120000}
          step={1000}
        />
      </div>

      <button
        className="btn-optimize"
        onClick={onOptimize}
        disabled={loading || !canOptimize}
      >
        {loading ? (
          <>
            <span className="spinner" /> 计算中...
          </>
        ) : (
          '🚀 开始优化计算'
        )}
      </button>
    </div>
  );
};
