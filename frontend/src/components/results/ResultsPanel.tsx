import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { UnplacedItem, PackingMetrics } from '../../types';

interface Props {
  metrics: PackingMetrics;
  unplacedItems: UnplacedItem[];
  selectedBilletKey: string | null;
  hoveredBilletKey: string | null;
  onHoverBilletId: (billetId: string | null) => void;
  onSelectBilletId: (billetId: string | null) => void;
}

export const ResultsPanel: React.FC<Props> = ({
  metrics,
  unplacedItems,
  selectedBilletKey,
  hoveredBilletKey,
  onHoverBilletId,
  onSelectBilletId,
}) => {
  const chartData = [
    { name: '已装载体积', value: metrics.placed_volume_m3 },
    { name: '剩余空间', value: metrics.remaining_volume_m3 },
  ];

  const COLORS = ['#4CAF50', '#E0E0E0'];

  // Extract billet_id from selection/hover keys (format: "billetId_instanceNum")
  const selectedBilletId = selectedBilletKey
    ? (() => {
        const parts = selectedBilletKey.split('_');
        parts.pop();
        return parts.join('_');
      })()
    : null;

  const hoveredBilletId = hoveredBilletKey
    ? (() => {
        const parts = hoveredBilletKey.split('_');
        parts.pop();
        return parts.join('_');
      })()
    : null;

  return (
    <div className="results-panel">
      {/* Stats cards */}
      <div className="stats-grid">
        <StatsCardInline
          label="体积利用率"
          value={`${metrics.utilization_pct.toFixed(1)}%`}
          highlight={metrics.utilization_pct >= 80}
        />
        <StatsCardInline
          label="已装载"
          value={`${metrics.placed_count} / ${metrics.total_billets}`}
          subtitle="个钢坯"
        />
        <StatsCardInline
          label="剩余空间"
          value={`${metrics.remaining_volume_m3.toFixed(3)}`}
          subtitle="m³"
        />
        <StatsCardInline
          label="计算耗时"
          value={`${metrics.compute_time_ms.toFixed(0)}`}
          subtitle="ms"
        />
      </div>

      {/* Utilization donut */}
      <div className="chart-row">
        <div className="donut-container">
          <h4>体积利用率</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown) => [`${(value as number).toFixed(3)} m³`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Per-type breakdown */}
        <div className="type-table-container">
          <h4>按类型统计</h4>
          <table className="type-table">
            <thead>
              <tr>
                <th>型号</th>
                <th>已装</th>
                <th>未装</th>
                <th>体积 (m³)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics.by_type).map(([id, tm]) => {
                const isSelected = selectedBilletId === id;
                const isHovered = hoveredBilletId === id;
                const rowClass = [
                  isSelected ? 'row-selected' : '',
                  isHovered && !isSelected ? 'row-highlighted' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr
                    key={id}
                    className={rowClass}
                    onMouseEnter={() => onHoverBilletId(id)}
                    onMouseLeave={() => onHoverBilletId(null)}
                    onClick={() =>
                      onSelectBilletId(selectedBilletId === id ? null : id)
                    }
                  >
                    <td>
                      <span
                        className="type-color-dot"
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          marginRight: 6,
                          background: 'var(--accent)',
                          verticalAlign: 'middle',
                        }}
                      />
                      {id}
                    </td>
                    <td className="num">{tm.placed}</td>
                    <td className={`num ${tm.unplaced > 0 ? 'text-warn' : ''}`}>
                      {tm.unplaced}
                    </td>
                    <td className="num">{tm.placed_volume_m3.toFixed(4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unplaced items */}
      {unplacedItems.length > 0 && (
        <div className="unplaced-section">
          <h4>⚠️ 未装载钢坯 ({unplacedItems.length})</h4>
          <div className="unplaced-list">
            {(() => {
              const grouped: Record<string, number> = {};
              unplacedItems.forEach((u) => {
                grouped[u.billet_id] = (grouped[u.billet_id] || 0) + 1;
              });
              return Object.entries(grouped).map(([id, count]) => (
                <span key={id} className="unplaced-tag">
                  {id}: {count} 个
                </span>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// Inline stats card (used inside results panel)
const StatsCardInline: React.FC<{
  label: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}> = ({ label, value, subtitle, highlight }) => (
  <div className={`stats-card${highlight ? ' highlight' : ''}`}>
    <div className="stats-value">{value}</div>
    <div className="stats-label">{label}</div>
    {subtitle && <div className="stats-subtitle">{subtitle}</div>}
  </div>
);
