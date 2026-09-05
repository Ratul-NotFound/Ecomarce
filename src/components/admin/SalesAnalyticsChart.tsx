'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils/format';
import { BarChart3, LineChart, DollarSign, ShoppingBag } from 'lucide-react';
import type { Order } from '@/types';

interface SalesAnalyticsChartProps {
  orders: Order[];
  timeframe: 'today' | 'week' | 'month' | 'quarter' | 'all';
}

export default function SalesAnalyticsChart({ orders, timeframe }: SalesAnalyticsChartProps) {
  const [metricMode, setMetricMode] = useState<'revenue' | 'orders'>('revenue');
  const [chartType, setChartType] = useState<'bar' | 'curve'>('bar'); // Default to modern bar chart
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // ────────────────────────────────────────────────────────────
  // 1. Group Orders by Real Calendar Dates / Hours
  // ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: {
      key: string;
      label: string;
      fullDateLabel: string;
      isToday: boolean;
      revenue: number;
      ordersCount: number;
    }[] = [];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (timeframe === 'today') {
      // 8 intervals across today's 24 hours (every 3 hours)
      for (let i = 0; i < 8; i++) {
        const hStart = i * 3;
        const ampm = hStart >= 12 ? 'PM' : 'AM';
        const displayH = hStart % 12 === 0 ? 12 : hStart % 12;
        const label = `${displayH} ${ampm}`;
        const key = `H-${i}`;

        buckets.push({
          key,
          label,
          fullDateLabel: `Today at ${label}`,
          isToday: true,
          revenue: 0,
          ordersCount: 0,
        });
      }

      orders.forEach(o => {
        const d = new Date(o.created_at);
        // Check if placed on same calendar day
        const isSameDay =
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate();

        if (isSameDay) {
          const hour = d.getHours();
          const bIdx = Math.min(Math.floor(hour / 3), 7);
          if (buckets[bIdx]) {
            buckets[bIdx].ordersCount += 1;
            if (o.status !== 'cancelled') {
              buckets[bIdx].revenue += Number(o.total) || 0;
            }
          }
        }
      });
    } else if (timeframe === 'week') {
      // Last 7 calendar days ending on TODAY
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        const isToday = i === 0;

        const dayName = dayNames[d.getDay()];
        const label = isToday ? 'Today' : `${dayName} ${d.getDate()}`;
        const fullDateLabel = `${dayName}, ${monthNames[d.getMonth()]} ${d.getDate()}, ${yyyy}${isToday ? ' (Today)' : ''}`;

        buckets.push({
          key,
          label,
          fullDateLabel,
          isToday,
          revenue: 0,
          ordersCount: 0,
        });
      }

      orders.forEach(o => {
        const d = new Date(o.created_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const orderKey = `${yyyy}-${mm}-${dd}`;

        const match = buckets.find(b => b.key === orderKey);
        if (match) {
          match.ordersCount += 1;
          if (o.status !== 'cancelled') {
            match.revenue += Number(o.total) || 0;
          }
        }
      });
    } else if (timeframe === 'month') {
      // Last 15 calendar days ending on TODAY (perfect granularity: readable and fully detailed)
      const dayCount = 15;
      for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        const isToday = i === 0;

        const label = isToday ? 'Today' : `${monthNames[d.getMonth()]} ${d.getDate()}`;
        const fullDateLabel = `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}, ${yyyy}${isToday ? ' (Today)' : ''}`;

        buckets.push({
          key,
          label,
          fullDateLabel,
          isToday,
          revenue: 0,
          ordersCount: 0,
        });
      }

      orders.forEach(o => {
        const d = new Date(o.created_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const orderKey = `${yyyy}-${mm}-${dd}`;

        const match = buckets.find(b => b.key === orderKey);
        if (match) {
          match.ordersCount += 1;
          if (o.status !== 'cancelled') {
            match.revenue += Number(o.total) || 0;
          }
        }
      });
    } else {
      // All Time: Last 6 calendar months ending on CURRENT MONTH
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        const isCurrentMonth = i === 0;

        const label = `${monthNames[d.getMonth()]}`;
        const fullDateLabel = `${monthNames[d.getMonth()]} ${yyyy}${isCurrentMonth ? ' (Current)' : ''}`;

        buckets.push({
          key,
          label,
          fullDateLabel,
          isToday: isCurrentMonth,
          revenue: 0,
          ordersCount: 0,
        });
      }

      orders.forEach(o => {
        const d = new Date(o.created_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const orderKey = `${yyyy}-${mm}`;

        const match = buckets.find(b => b.key === orderKey);
        if (match) {
          match.ordersCount += 1;
          if (o.status !== 'cancelled') {
            match.revenue += Number(o.total) || 0;
          }
        }
      });
    }

    return buckets;
  }, [orders, timeframe]);

  // Overall totals for quick summary
  const totalRevenue = useMemo(() => chartData.reduce((sum, b) => sum + b.revenue, 0), [chartData]);
  const totalOrders = useMemo(() => chartData.reduce((sum, b) => sum + b.ordersCount, 0), [chartData]);
  const averageOrderVal = useMemo(
    () => (totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0),
    [totalRevenue, totalOrders]
  );

  // Peak sales period
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

  // Maximum value for scaling
  const maxVal = useMemo(() => {
    const vals = chartData.map(b => (metricMode === 'revenue' ? b.revenue : b.ordersCount));
    const highest = Math.max(...vals, 1);
    return metricMode === 'revenue' ? Math.ceil(highest * 1.2) : Math.max(highest + 1, 4);
  }, [chartData, metricMode]);

  // SVG dimensions
  const svgWidth = 760;
  const svgHeight = 220;
  const paddingX = 60;
  const paddingY = 28;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  // Calculate points
  const points = useMemo(() => {
    return chartData.map((d, i) => {
      const x = paddingX + (i / Math.max(chartData.length - 1, 1)) * graphWidth;
      const val = metricMode === 'revenue' ? d.revenue : d.ordersCount;
      const y = svgHeight - paddingY - (val / maxVal) * graphHeight;
      return { x, y, data: d, val };
    });
  }, [chartData, metricMode, maxVal, graphWidth, graphHeight]);

  // Smooth Cubic Bezier Spline
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
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header Bar */}
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
              Sales & Order Analytics
            </h3>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              Live Calendar Synced
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', margin: '4px 0 0 0' }}>
            Accurate revenue and order trajectory across actual dates.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Chart Style Switcher */}
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
              onClick={() => setChartType('bar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
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
              <span>Modern Bars</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('curve')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
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
              <span>Smooth Curve</span>
            </button>
          </div>

          {/* Metric Mode Switcher */}
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
                padding: '6px 12px',
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
                padding: '6px 12px',
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

      {/* Modern KPI Summary Chips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          padding: '16px 20px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-admin-border)',
          marginBottom: '24px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-admin-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Period Revenue
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-primary)', marginTop: '2px' }}>
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-admin-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Orders
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-admin-text)', marginTop: '2px' }}>
            {totalOrders} Orders
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-admin-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Avg. Order Value
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
            {formatCurrency(averageOrderVal)}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-admin-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Peak Demand Date
          </span>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
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
            <linearGradient id="areaCurveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="barColumnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
            </linearGradient>

            <linearGradient id="barColumnActiveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="1" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
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
              MODE 1: MODERN ROUNDED BARS (PRIMARY DEFAULT)
          ─────────────────────────────────────────────── */}
          {chartType === 'bar' && (
            <>
              {points.map((pt, i) => {
                const totalBuckets = points.length;
                const barWidth = Math.min((graphWidth / totalBuckets) * 0.62, 36);
                const hasSales = pt.val > 0;
                const barHeight = hasSales ? Math.max((pt.val / maxVal) * graphHeight, 8) : 3;
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
                      rx={hasSales ? 5 : 1.5}
                      fill={
                        hasSales
                          ? isHovered
                            ? 'url(#barColumnActiveGrad)'
                            : 'url(#barColumnGrad)'
                          : '#cbd5e1'
                      }
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Floating Value Pill for bars with sales */}
                    {hasSales && (
                      <g>
                        <rect
                          x={pt.x - 24}
                          y={barY - 22}
                          width="48"
                          height="18"
                          rx="9"
                          fill={isHovered ? '#1d4ed8' : '#2563eb'}
                          filter="drop-shadow(0 2px 4px rgba(37,99,235,0.2))"
                        />
                        <text
                          x={pt.x}
                          y={barY - 9}
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {metricMode === 'revenue'
                            ? `৳${pt.val >= 1000 ? `${(pt.val / 1000).toFixed(1)}k` : pt.val}`
                            : `${pt.val} ord`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* ───────────────────────────────────────────────
              MODE 2: SMOOTH CURVED AREA CHART
          ─────────────────────────────────────────────── */}
          {chartType === 'curve' && (
            <>
              {/* Gradient Area Fill */}
              <path d={smoothAreaPath} fill="url(#areaCurveGrad)" />

              {/* Smooth Spline Stroke */}
              <path
                d={smoothLinePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Vertical Crosshair Guide */}
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

              {/* Data Points */}
              {points.map((pt, i) => {
                const isHovered = hoveredIndex === i;
                const hasSales = pt.val > 0;

                return (
                  <g key={i}>
                    {hasSales && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 11 : 7}
                        fill="rgba(37,99,235,0.2)"
                      />
                    )}

                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : hasSales ? 4.5 : 3}
                      fill={hasSales ? '#ffffff' : '#cbd5e1'}
                      stroke="#2563eb"
                      strokeWidth={hasSales ? 3 : 1.5}
                      style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />

                    {/* Value Badge for Points with sales */}
                    {hasSales && (
                      <g>
                        <rect
                          x={pt.x - 24}
                          y={pt.y - 24}
                          width="48"
                          height="18"
                          rx="9"
                          fill="#2563eb"
                          filter="drop-shadow(0 2px 4px rgba(37,99,235,0.2))"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 11}
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="800"
                          textAnchor="middle"
                        >
                          {metricMode === 'revenue'
                            ? `৳${pt.val >= 1000 ? `${(pt.val / 1000).toFixed(1)}k` : pt.val}`
                            : `${pt.val} ord`}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* ───────────────────────────────────────────────
              X-AXIS LABELS (EXACT DATES)
          ─────────────────────────────────────────────── */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            const isToday = pt.data.isToday;

            return (
              <g key={i}>
                {isToday ? (
                  // Highlighted "Today" Badge
                  <g>
                    <rect
                      x={pt.x - 22}
                      y={svgHeight - 20}
                      width="44"
                      height="18"
                      rx="9"
                      fill="#2563eb"
                    />
                    <text
                      x={pt.x}
                      y={svgHeight - 7}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      Today
                    </text>
                  </g>
                ) : (
                  <text
                    x={pt.x}
                    y={svgHeight - 7}
                    fill={isHovered ? '#0f172a' : '#64748b'}
                    fontSize="10.5"
                    fontWeight={isHovered ? '800' : '600'}
                    textAnchor="middle"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {pt.data.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* ───────────────────────────────────────────────
              INTERACTIVE FLOATING GLASS TOOLTIP
          ─────────────────────────────────────────────── */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <g>
              {(() => {
                const pt = points[hoveredIndex];
                const tooltipWidth = 170;
                const tooltipHeight = 66;
                let tx = pt.x - tooltipWidth / 2;
                if (tx < 10) tx = 10;
                if (tx + tooltipWidth > svgWidth - 10) tx = svgWidth - tooltipWidth - 10;
                let ty = pt.y - tooltipHeight - 16;
                if (ty < 6) ty = pt.y + 20;

                return (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={tx}
                      y={ty}
                      width={tooltipWidth}
                      height={tooltipHeight}
                      rx="10"
                      fill="#0f172a"
                      filter="drop-shadow(0 8px 20px rgba(0,0,0,0.3))"
                    />

                    {/* Tooltip Header Date */}
                    <text
                      x={tx + 14}
                      y={ty + 20}
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="700"
                    >
                      {pt.data.fullDateLabel}
                    </text>

                    {/* Revenue Value */}
                    <text
                      x={tx + 14}
                      y={ty + 39}
                      fill="#38bdf8"
                      fontSize="14"
                      fontWeight="900"
                    >
                      ৳ {pt.data.revenue.toLocaleString()}
                    </text>

                    {/* Orders Count */}
                    <text
                      x={tx + 14}
                      y={ty + 55}
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="600"
                    >
                      📦 {pt.data.ordersCount} Customer Order{pt.data.ordersCount === 1 ? '' : 's'}
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
