'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils/format';
import { TrendingUp, ShoppingBag, DollarSign, Award, BarChart3, LineChart } from 'lucide-react';
import type { Order } from '@/types';

interface SalesAnalyticsChartProps {
  orders: Order[];
  timeframe: 'today' | 'week' | 'month' | 'quarter' | 'all';
}

export default function SalesAnalyticsChart({ orders, timeframe }: SalesAnalyticsChartProps) {
  const [metricMode, setMetricMode] = useState<'revenue' | 'orders'>('revenue');
  const [chartType, setChartType] = useState<'curve' | 'bar'>('curve');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group orders into buckets based on timeframe
  const chartData = useMemo(() => {
    const buckets: { label: string; sublabel?: string; revenue: number; ordersCount: number }[] = [];
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (timeframe === 'today') {
      // 8 intervals across 24 hours (every 3 hours)
      for (let i = 0; i < 8; i++) {
        const hStart = i * 3;
        const ampm = hStart >= 12 ? 'PM' : 'AM';
        const displayH = hStart % 12 === 0 ? 12 : hStart % 12;
        buckets.push({
          label: `${displayH} ${ampm}`,
          sublabel: `${String(hStart).padStart(2, '0')}:00`,
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
        const dayLabel = `${days[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
        const shortLabel = `${days[d.getDay()]} ${d.getDate()}`;
        buckets.push({ label: shortLabel, sublabel: dayLabel, revenue: 0, ordersCount: 0 });
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
      // 4 weeks of the month with clear date ranges
      const currentMonth = monthNames[now.getMonth()];
      const weekRanges = [
        { label: `Week 1`, sublabel: `${currentMonth} 1 - 7` },
        { label: `Week 2`, sublabel: `${currentMonth} 8 - 14` },
        { label: `Week 3`, sublabel: `${currentMonth} 15 - 21` },
        { label: `Week 4`, sublabel: `${currentMonth} 22 - 31` },
      ];

      weekRanges.forEach(w => {
        buckets.push({ label: w.label, sublabel: w.sublabel, revenue: 0, ordersCount: 0 });
      });

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
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        buckets.push({
          label: monthNames[d.getMonth()],
          sublabel: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          revenue: 0,
          ordersCount: 0,
        });
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

  // Overall totals for quick summary chips
  const totalRevenue = useMemo(() => chartData.reduce((sum, b) => sum + b.revenue, 0), [chartData]);
  const totalOrders = useMemo(() => chartData.reduce((sum, b) => sum + b.ordersCount, 0), [chartData]);
  const averageOrderVal = useMemo(
    () => (totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0),
    [totalRevenue, totalOrders]
  );

  // Peak bucket
  const peakBucket = useMemo(() => {
    let peak = chartData[0] || { label: 'None', revenue: 0, ordersCount: 0 };
    chartData.forEach(b => {
      const currentVal = metricMode === 'revenue' ? b.revenue : b.ordersCount;
      const peakVal = metricMode === 'revenue' ? peak.revenue : peak.ordersCount;
      if (currentVal > peakVal) {
        peak = b;
      }
    });
    return peak;
  }, [chartData, metricMode]);

  // Max value for chart scaling
  const maxVal = useMemo(() => {
    const vals = chartData.map(b => (metricMode === 'revenue' ? b.revenue : b.ordersCount));
    const highest = Math.max(...vals, 1);
    return metricMode === 'revenue' ? Math.ceil(highest * 1.18) : Math.max(highest + 2, 5);
  }, [chartData, metricMode]);

  // SVG dimensions
  const svgWidth = 740;
  const svgHeight = 230;
  const paddingX = 55;
  const paddingY = 30;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  // Calculate coordinates
  const points = useMemo(() => {
    return chartData.map((d, i) => {
      const x = paddingX + (i / Math.max(chartData.length - 1, 1)) * graphWidth;
      const val = metricMode === 'revenue' ? d.revenue : d.ordersCount;
      const y = svgHeight - paddingY - (val / maxVal) * graphHeight;
      return { x, y, data: d, val };
    });
  }, [chartData, metricMode, maxVal, graphWidth, graphHeight]);

  // Smooth Cubic Bezier Spline Path Generator
  const smoothLinePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  }, [points]);

  // Smooth Area Path
  const smoothAreaPath = useMemo(() => {
    if (points.length === 0) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = svgHeight - paddingY;
    return `${smoothLinePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [smoothLinePath, points]);

  return (
    <div
      className="admin-card"
      style={{
        padding: '24px',
        background: '#ffffff',
        border: '1px solid var(--color-admin-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}
    >
      {/* Top Header & Interactive Toggles */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-admin-text)', margin: 0 }}>
              Sales & Order Trajectory
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(37,99,235,0.1)',
                color: 'var(--color-primary)',
              }}
            >
              {timeframe.toUpperCase()}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', margin: '4px 0 0 0' }}>
            Interactive timeline tracking total earnings and buyer demand.
          </p>
        </div>

        {/* Toggles Container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Chart Style Switcher (Curve vs Bars) */}
          <div
            style={{
              display: 'flex',
              gap: '2px',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <button
              type="button"
              onClick={() => setChartType('curve')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'calc(var(--radius-lg) - 2px)',
                border: 'none',
                cursor: 'pointer',
                background: chartType === 'curve' ? '#ffffff' : 'transparent',
                color: chartType === 'curve' ? 'var(--color-primary)' : 'var(--color-admin-muted)',
                boxShadow: chartType === 'curve' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <LineChart size={14} />
              <span>Smooth Line</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('bar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'calc(var(--radius-lg) - 2px)',
                border: 'none',
                cursor: 'pointer',
                background: chartType === 'bar' ? '#ffffff' : 'transparent',
                color: chartType === 'bar' ? 'var(--color-primary)' : 'var(--color-admin-muted)',
                boxShadow: chartType === 'bar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <BarChart3 size={14} />
              <span>Bars</span>
            </button>
          </div>

          {/* Metric Switcher (Revenue vs Orders) */}
          <div
            style={{
              display: 'flex',
              gap: '2px',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <button
              type="button"
              onClick={() => setMetricMode('revenue')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'calc(var(--radius-lg) - 2px)',
                border: 'none',
                cursor: 'pointer',
                background: metricMode === 'revenue' ? '#ffffff' : 'transparent',
                color: metricMode === 'revenue' ? 'var(--color-primary)' : 'var(--color-admin-muted)',
                boxShadow: metricMode === 'revenue' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <DollarSign size={13} />
              <span>Revenue (৳)</span>
            </button>

            <button
              type="button"
              onClick={() => setMetricMode('orders')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'calc(var(--radius-lg) - 2px)',
                border: 'none',
                cursor: 'pointer',
                background: metricMode === 'orders' ? '#ffffff' : 'transparent',
                color: metricMode === 'orders' ? 'var(--color-primary)' : 'var(--color-admin-muted)',
                boxShadow: metricMode === 'orders' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <ShoppingBag size={13} />
              <span>Orders</span>
            </button>
          </div>
        </div>
      </div>

      {/* User-Friendly Quick Metric Cards Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          padding: '14px 16px',
          background: '#f8fafc',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-admin-border)',
          marginBottom: '20px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>
            Period Gross Revenue
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '2px' }}>
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>
            Total Orders Placed
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-admin-text)', marginTop: '2px' }}>
            {totalOrders} Orders
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>
            Avg. Order Value (AOV)
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
            {formatCurrency(averageOrderVal)}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>
            Peak Demand Period
          </span>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
            {peakBucket.label}{' '}
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-admin-muted)' }}>
              ({metricMode === 'revenue' ? formatCurrency(peakBucket.revenue) : `${peakBucket.ordersCount} orders`})
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Chart Area */}
      <div style={{ width: '100%', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}
        >
          <defs>
            {/* Smooth Vibrant Gradient */}
            <linearGradient id="smoothSalesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>

            {/* Bar Fill Gradient */}
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.75" />
            </linearGradient>

            {/* Active Bar Gradient */}
            <linearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="1" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines with subtle dashed pattern */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + ratio * graphHeight;
            const labelVal = Math.round(maxVal * (1 - ratio));
            return (
              <g key={idx}>
                <line
                  x1={paddingX - 10}
                  y1={y}
                  x2={svgWidth - paddingX + 10}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 16}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {metricMode === 'revenue'
                    ? `৳${labelVal >= 1000 ? `${(labelVal / 1000).toFixed(0)}k` : labelVal}`
                    : labelVal}
                </text>
              </g>
            );
          })}

          {/* ───────────────────────────────────────────────
              MODE 1: SMOOTH CURVED AREA CHART
          ─────────────────────────────────────────────── */}
          {chartType === 'curve' && (
            <>
              {/* Gradient Area Fill */}
              <path d={smoothAreaPath} fill="url(#smoothSalesGrad)" />

              {/* Glowing Smooth Curve Line */}
              <path
                d={smoothLinePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Vertical Crosshair on Hover */}
              {hoveredIndex !== null && points[hoveredIndex] && (
                <line
                  x1={points[hoveredIndex].x}
                  y1={paddingY}
                  x2={points[hoveredIndex].x}
                  y2={svgHeight - paddingY}
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.8"
                />
              )}

              {/* Interactive Data Dots & Floating Badges */}
              {points.map((pt, i) => {
                const isHovered = hoveredIndex === i;
                const isPeak = pt.val > 0 && pt.data.label === peakBucket.label;

                return (
                  <g key={i}>
                    {/* Outer Glow Halo for active or peak point */}
                    {(isHovered || isPeak) && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 12 : 9}
                        fill={isHovered ? 'rgba(37,99,235,0.2)' : 'rgba(245,158,11,0.2)'}
                        style={{ transition: 'r 0.15s ease' }}
                      />
                    )}

                    {/* Data Point Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4.5}
                      fill="#ffffff"
                      stroke={isPeak && !isHovered ? '#f59e0b' : '#2563eb'}
                      strokeWidth={isHovered ? 3.5 : 2.5}
                      style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Peak Value Callout Badge (Always visible on peak when > 0) */}
                    {isPeak && !isHovered && pt.val > 0 && (
                      <g>
                        <rect
                          x={pt.x - 32}
                          y={pt.y - 28}
                          width="64"
                          height="20"
                          rx="10"
                          fill="#f59e0b"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 14}
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {metricMode === 'revenue' ? `৳${pt.val >= 1000 ? `${(pt.val / 1000).toFixed(1)}k` : pt.val}` : `${pt.val} orders`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* ───────────────────────────────────────────────
              MODE 2: MODERN ROUNDED COLUMNS / BARS
          ─────────────────────────────────────────────── */}
          {chartType === 'bar' && (
            <>
              {points.map((pt, i) => {
                const barWidth = Math.min(graphWidth / points.length * 0.55, 48);
                const barHeight = Math.max((pt.val / maxVal) * graphHeight, pt.val > 0 ? 6 : 2);
                const barX = pt.x - barWidth / 2;
                const barY = svgHeight - paddingY - barHeight;
                const isHovered = hoveredIndex === i;

                return (
                  <g key={i}>
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx="6"
                      fill={isHovered ? 'url(#barGradActive)' : 'url(#barGrad)'}
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Show Value above bar if > 0 */}
                    {pt.val > 0 && (
                      <text
                        x={pt.x}
                        y={barY - 6}
                        fill={isHovered ? '#1d4ed8' : '#64748b'}
                        fontSize="11"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {metricMode === 'revenue'
                          ? `৳${pt.val >= 1000 ? `${(pt.val / 1000).toFixed(1)}k` : pt.val}`
                          : pt.val}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* ───────────────────────────────────────────────
              X-AXIS LABELS (DATES / WEEKS)
          ─────────────────────────────────────────────── */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                <text
                  x={pt.x}
                  y={svgHeight - 10}
                  fill={isHovered ? '#0f172a' : '#64748b'}
                  fontSize="12"
                  fontWeight={isHovered ? '800' : '600'}
                  textAnchor="middle"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {pt.data.label}
                </text>

                {pt.data.sublabel && (
                  <text
                    x={pt.x}
                    y={svgHeight + 6}
                    fill="#94a3b8"
                    fontSize="10"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {pt.data.sublabel}
                  </text>
                )}
              </g>
            );
          })}

          {/* ───────────────────────────────────────────────
              INTERACTIVE FLOATING TOOLTIP
          ─────────────────────────────────────────────── */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <g>
              {(() => {
                const pt = points[hoveredIndex];
                const tooltipWidth = 148;
                const tooltipHeight = 62;
                // Keep tooltip inside SVG boundaries
                let tx = pt.x - tooltipWidth / 2;
                if (tx < 10) tx = 10;
                if (tx + tooltipWidth > svgWidth - 10) tx = svgWidth - tooltipWidth - 10;
                let ty = pt.y - tooltipHeight - 16;
                if (ty < 8) ty = pt.y + 18;

                return (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={tx}
                      y={ty}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="8"
                      fill="#0f172a"
                      filter="drop-shadow(0 8px 16px rgba(0,0,0,0.25))"
                    />

                    {/* Tooltip Header Label */}
                    <text
                      x={tx + 12}
                      y={ty + 18}
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="700"
                    >
                      {pt.data.sublabel || pt.data.label}
                    </text>

                    {/* Revenue Value */}
                    <text
                      x={tx + 12}
                      y={ty + 36}
                      fill="#38bdf8"
                      fontSize="13"
                      fontWeight="800"
                    >
                      ৳ {pt.data.revenue.toLocaleString()}
                    </text>

                    {/* Orders Count */}
                    <text
                      x={tx + 12}
                      y={ty + 52}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="600"
                    >
                      📦 {pt.data.ordersCount} Customer Orders
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
