'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils/format';
import type { Order } from '@/types';

interface SalesAnalyticsChartProps {
  orders: Order[];
  timeframe: 'today' | 'week' | 'month' | 'quarter' | 'all';
}

export default function SalesAnalyticsChart({ orders, timeframe }: SalesAnalyticsChartProps) {
  const [metricMode, setMetricMode] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group orders into buckets based on timeframe
  const chartData = useMemo(() => {
    const buckets: { label: string; revenue: number; ordersCount: number }[] = [];
    const now = new Date();

    if (timeframe === 'today') {
      // 8 time intervals across 24h (every 3 hours)
      for (let i = 0; i < 8; i++) {
        const hStart = i * 3;
        const hEnd = hStart + 3;
        buckets.push({
          label: `${String(hStart).padStart(2, '0')}:00`,
          revenue: 0,
          ordersCount: 0,
        });
      }

      orders.forEach(o => {
        const d = new Date(o.created_at);
        const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
        if (diffHours <= 24) {
          const hour = d.getHours();
          const bIdx = Math.min(Math.floor(hour / 3), 7);
          buckets[bIdx].ordersCount += 1;
          if (o.status !== 'cancelled') {
            buckets[bIdx].revenue += Number(o.total) || 0;
          }
        }
      });
    } else if (timeframe === 'week') {
      // Last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = `${days[d.getDay()]} ${d.getDate()}`;
        buckets.push({ label: dayLabel, revenue: 0, ordersCount: 0 });
      }

      orders.forEach(o => {
        const d = new Date(o.created_at);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          const idx = 6 - diffDays;
          if (buckets[idx]) {
            buckets[idx].ordersCount += 1;
            if (o.status !== 'cancelled') {
              buckets[idx].revenue += Number(o.total) || 0;
            }
          }
        }
      });
    } else if (timeframe === 'month') {
      // 4 weeks of the month
      for (let i = 4; i >= 1; i--) {
        buckets.push({ label: `Week ${5 - i}`, revenue: 0, ordersCount: 0 });
      }

      orders.forEach(o => {
        const d = new Date(o.created_at);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 30) {
          const weekIdx = Math.min(Math.floor(diffDays / 7), 3);
          const targetIdx = 3 - weekIdx;
          if (buckets[targetIdx]) {
            buckets[targetIdx].ordersCount += 1;
            if (o.status !== 'cancelled') {
              buckets[targetIdx].revenue += Number(o.total) || 0;
            }
          }
        }
      });
    } else {
      // Last 6 months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        buckets.push({ label: monthNames[d.getMonth()], revenue: 0, ordersCount: 0 });
      }

      orders.forEach(o => {
        const d = new Date(o.created_at);
        const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (diffMonths >= 0 && diffMonths < 6) {
          const idx = 5 - diffMonths;
          if (buckets[idx]) {
            buckets[idx].ordersCount += 1;
            if (o.status !== 'cancelled') {
              buckets[idx].revenue += Number(o.total) || 0;
            }
          }
        }
      });
    }

    return buckets;
  }, [orders, timeframe]);

  // Max value for chart scaling
  const maxVal = useMemo(() => {
    const vals = chartData.map(b => (metricMode === 'revenue' ? b.revenue : b.ordersCount));
    const highest = Math.max(...vals, 1);
    return metricMode === 'revenue' ? Math.ceil(highest * 1.15) : Math.max(highest + 2, 5);
  }, [chartData, metricMode]);

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 25;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  // Calculate coordinates
  const points = chartData.map((d, i) => {
    const x = paddingX + (i / Math.max(chartData.length - 1, 1)) * graphWidth;
    const val = metricMode === 'revenue' ? d.revenue : d.ordersCount;
    const y = svgHeight - paddingY - (val / maxVal) * graphHeight;
    return { x, y, data: d };
  });

  // SVG Line path
  const linePath = points.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`;
  }, '');

  // SVG Gradient Area path
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0},${svgHeight - paddingY} L ${points[0]?.x || 0},${svgHeight - paddingY} Z`;

  return (
    <div className="admin-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
            Sales & Demand Trajectory
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
            Visual progression of revenue & customer orders
          </p>
        </div>

        {/* Toggle Mode */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--color-admin-surface-2)', padding: '3px', borderRadius: 'var(--radius-lg)' }}>
          <button
            type="button"
            onClick={() => setMetricMode('revenue')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              background: metricMode === 'revenue' ? '#ffffff' : 'transparent',
              color: metricMode === 'revenue' ? 'var(--color-primary)' : 'var(--color-admin-muted)',
              boxShadow: metricMode === 'revenue' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Revenue (৳)
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('orders')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              background: metricMode === 'orders' ? '#ffffff' : 'transparent',
              color: metricMode === 'orders' ? 'var(--color-primary)' : 'var(--color-admin-muted)',
              boxShadow: metricMode === 'orders' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            Order Count
          </button>
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ width: '100%', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + ratio * graphHeight;
            const labelVal = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="var(--color-admin-border)"
                  strokeDasharray="4 4"
                  strokeOpacity="0.6"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  fill="var(--color-admin-muted)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {metricMode === 'revenue' ? `৳${labelVal >= 1000 ? `${(labelVal / 1000).toFixed(0)}k` : labelVal}` : labelVal}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#salesGrad)" />

          {/* Stroke line */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Interactive Tooltips */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="var(--color-primary)"
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                {/* X Axis Label */}
                <text
                  x={pt.x}
                  y={svgHeight - 6}
                  fill={isHovered ? 'var(--color-admin-text)' : 'var(--color-admin-muted)'}
                  fontSize="11"
                  fontWeight={isHovered ? '800' : '600'}
                  textAnchor="middle"
                >
                  {pt.data.label}
                </text>

                {/* Tooltip on hover */}
                {isHovered && (
                  <g>
                    <rect
                      x={pt.x - 55}
                      y={pt.y - 46}
                      width="110"
                      height="38"
                      rx="6"
                      fill="#0f172a"
                      filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 30}
                      fill="#94a3b8"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {pt.data.label}
                    </text>
                    <text
                      x={pt.x}
                      y={pt.y - 15}
                      fill="#ffffff"
                      fontSize="12"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {metricMode === 'revenue' ? formatCurrency(pt.data.revenue) : `${pt.data.ordersCount} Orders`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
