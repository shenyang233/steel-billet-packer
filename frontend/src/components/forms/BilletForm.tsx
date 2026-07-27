import React from 'react';
import type { BilletSpec, BilletShape } from '../../types';

interface Props {
  billets: BilletSpec[];
  onUpdate: (index: number, billet: Partial<BilletSpec>) => void;
  onRemove: (index: number) => void;
  onAdd: (shape?: BilletShape) => void;
}

const SHAPE_OPTIONS: { value: BilletShape; label: string }[] = [
  { value: 'rectangular', label: '方形' },
  { value: 'cylinder', label: '圆柱' },
  { value: 'pipe', label: '管材' },
  { value: 'hexagonal', label: '六角' },
];

export const BilletForm: React.FC<Props> = ({ billets, onUpdate, onRemove, onAdd }) => {
  const handleShapeChange = (index: number, shape: BilletShape) => {
    // Reset irrelevant dimensions when shape changes
    onUpdate(index, {
      shape,
      width: shape === 'rectangular' ? 150 : undefined,
      height: shape === 'rectangular' ? 150 : undefined,
      diameter: shape === 'cylinder' || shape === 'pipe' ? 150 : undefined,
      innerDiameter: shape === 'pipe' ? 100 : undefined,
      sideLength: shape === 'hexagonal' ? 80 : undefined,
    });
  };

  return (
    <div className="form-section">
      <h3>钢坯列表</h3>
      <div className="billet-list">
        {billets.map((billet, index) => (
          <div key={index} className="billet-row">
            <div className="billet-row-header">
              <span className="billet-index">#{index + 1}</span>

              {/* Shape selector */}
              <select
                value={billet.shape || 'rectangular'}
                onChange={(e) => handleShapeChange(index, e.target.value as BilletShape)}
                className="input-shape"
                style={{ width: 80 }}
                title="截面形状"
              >
                {SHAPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={billet.id}
                onChange={(e) => onUpdate(index, { id: e.target.value })}
                placeholder="型号"
                className="input-id"
              />
              <input
                type="color"
                value={billet.color}
                onChange={(e) => onUpdate(index, { color: e.target.value })}
                className="input-color"
                title="显示颜色"
              />
              {billets.length > 1 && (
                <button
                  className="btn-remove"
                  onClick={() => onRemove(index)}
                  title="删除此钢坯"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="dim-row">
              {/* Length — common to all shapes */}
              <div className="input-group">
                <label>长 (mm)</label>
                <input
                  type="number"
                  value={billet.length}
                  onChange={(e) => onUpdate(index, { length: parseFloat(e.target.value) || 0 })}
                  min={1}
                  step={1}
                />
              </div>

              {/* Shape-specific dimensions */}
              {billet.shape === 'rectangular' && (
                <>
                  <div className="input-group">
                    <label>宽 (mm)</label>
                    <input
                      type="number"
                      value={billet.width ?? 0}
                      onChange={(e) => onUpdate(index, { width: parseFloat(e.target.value) || 0 })}
                      min={1}
                      step={1}
                    />
                  </div>
                  <div className="input-group">
                    <label>高 (mm)</label>
                    <input
                      type="number"
                      value={billet.height ?? 0}
                      onChange={(e) => onUpdate(index, { height: parseFloat(e.target.value) || 0 })}
                      min={1}
                      step={1}
                    />
                  </div>
                </>
              )}

              {(billet.shape === 'cylinder' || billet.shape === 'pipe') && (
                <div className="input-group">
                  <label>直径 (mm)</label>
                  <input
                    type="number"
                    value={billet.diameter ?? 0}
                    onChange={(e) => onUpdate(index, { diameter: parseFloat(e.target.value) || 0 })}
                    min={1}
                    step={1}
                  />
                </div>
              )}

              {billet.shape === 'pipe' && (
                <div className="input-group">
                  <label>内径 (mm)</label>
                  <input
                    type="number"
                    value={billet.innerDiameter ?? 0}
                    onChange={(e) => onUpdate(index, { innerDiameter: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step={1}
                  />
                </div>
              )}

              {billet.shape === 'hexagonal' && (
                <div className="input-group">
                  <label>边长 (mm)</label>
                  <input
                    type="number"
                    value={billet.sideLength ?? 0}
                    onChange={(e) => onUpdate(index, { sideLength: parseFloat(e.target.value) || 0 })}
                    min={1}
                    step={1}
                  />
                </div>
              )}

              <div className="input-group">
                <label>数量</label>
                <input
                  type="number"
                  value={billet.quantity}
                  onChange={(e) => onUpdate(index, { quantity: parseInt(e.target.value) || 0 })}
                  min={1}
                  step={1}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add billet buttons */}
      <div className="add-buttons">
        {SHAPE_OPTIONS.map((opt) => (
          <button key={opt.value} className="btn-add" onClick={() => onAdd(opt.value)}>
            ＋ 添加{opt.label}钢坯
          </button>
        ))}
      </div>
    </div>
  );
};
