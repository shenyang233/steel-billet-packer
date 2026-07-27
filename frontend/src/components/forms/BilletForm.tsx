import React from 'react';
import type { BilletSpec } from '../../types';

interface Props {
  billets: BilletSpec[];
  onUpdate: (index: number, billet: Partial<BilletSpec>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

export const BilletForm: React.FC<Props> = ({ billets, onUpdate, onRemove, onAdd }) => {
  return (
    <div className="form-section">
      <h3>🏗️ 钢坯列表</h3>
      <div className="billet-list">
        {billets.map((billet, index) => (
          <div key={index} className="billet-row">
            <div className="billet-row-header">
              <span className="billet-index">#{index + 1}</span>
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
              <div className="input-group">
                <label>宽 (mm)</label>
                <input
                  type="number"
                  value={billet.width}
                  onChange={(e) => onUpdate(index, { width: parseFloat(e.target.value) || 0 })}
                  min={1}
                  step={1}
                />
              </div>
              <div className="input-group">
                <label>高 (mm)</label>
                <input
                  type="number"
                  value={billet.height}
                  onChange={(e) => onUpdate(index, { height: parseFloat(e.target.value) || 0 })}
                  min={1}
                  step={1}
                />
              </div>
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
      <button className="btn-add" onClick={onAdd}>
        ＋ 添加钢坯类型
      </button>
    </div>
  );
};
