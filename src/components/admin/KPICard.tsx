import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: any;
}

export default function KPICard({ label, value, change, icon: Icon }: KPICardProps) {
  return (
    <div className="admin-kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="admin-kpi-label">{label}</span>
        {Icon && (
          <div style={{ color: 'var(--color-primary-light)', opacity: 0.8 }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="admin-kpi-value">{value}</div>

      {change && <div className="admin-kpi-desc">{change}</div>}
    </div>
  );
}
