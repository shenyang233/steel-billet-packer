import React from 'react';

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  highlight?: boolean;
}

export const StatsCard: React.FC<Props> = ({ label, value, subtitle, highlight }) => {
  return (
    <div className={`stats-card${highlight ? ' highlight' : ''}`}>
      <div className="stats-value">{value}</div>
      <div className="stats-label">{label}</div>
      {subtitle && <div className="stats-subtitle">{subtitle}</div>}
    </div>
  );
};
