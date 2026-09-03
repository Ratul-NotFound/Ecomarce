'use client';

import React, { useState, useEffect } from 'react';
import {
  Eye,
  Users,
  Activity,
  Zap,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Compass,
} from 'lucide-react';
import KPICard from '@/components/admin/KPICard';

interface TrafficSummary {
  totalVisits: number;
  totalUniqueVisitors: number;
  avgViewsPerVisitor: string;
  peakPeriod: { label: string; visits: number };
}

interface ChartDataPoint {
  label: string;
  visits: number;
  uniqueVisitors: number;
}

interface DeviceItem {
  name: string;
  count: number;
  percent: number;
}

interface PageItem {
  path: string;
  count: number;
  percent: number;
}

interface VisitorItem {
  id: string;
  ip: string;
  country: string;
  device: string;
  pageUrl: string;
  createdAt: string;
}

export default function TrafficAnalyticsView() {
  const [granularity, setGranularity] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<TrafficSummary>({
    totalVisits: 0,
    totalUniqueVisitors: 0,
    avgViewsPerVisitor: '0.0',
    peakPeriod: { label: 'None', visits: 0 },
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceItem[]>([]);
  const [browserBreakdown, setBrowserBreakdown] = useState<DeviceItem[]>([]);
  const [topPages, setTopPages] = useState<PageItem[]>([]);
  const [recentVisitors, setRecentVisitors] = useState<VisitorItem[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchTrafficData = async (selectedGranularity: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/analytics/traffic?granularity=${selectedGranularity}`);
      const data = await res.json();

      if (data.summary) {
        setSummary(data.summary);
        setChartData(data.chartData || []);
        setDeviceBreakdown(data.deviceBreakdown || []);
        setBrowserBreakdown(data.browserBreakdown || []);
        setTopPages(data.topPages || []);
        setRecentVisitors(data.recentVisitors || []);
      }
    } catch (err) {
      console.error('Failed to load traffic analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrafficData(granularity);
  }, [granularity]);

  // Calculate max scale for chart
  const maxVisits = Math.max(...chartData.map(d => d.visits), 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Granularity Switcher & Refresh Bar */}
      <div
        className="admin-card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
            Traffic Timeframe:
          </span>
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              gap: '2px',
            }}
          >
            {(
              [
                { id: 'hourly', label: '⏱️ Hourly (24H)' },
                { id: 'daily', label: '📅 Daily (30D)' },
                { id: 'weekly', label: '📆 Weekly (12W)' },
                { id: 'monthly', label: '🗓️ Monthly (12M)' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGranularity(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  fontSize: '12px',
                  fontWeight: granularity === tab.id ? 700 : 500,
                  background: granularity === tab.id ? '#ffffff' : 'transparent',
                  color: granularity === tab.id ? 'var(--color-primary)' : 'var(--color-admin-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: granularity === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchTrafficData(granularity)}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
          <span>Refresh Traffic</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        <KPICard
          label="Total Pageviews"
          value={summary.totalVisits.toLocaleString()}
          icon={Eye}
          change={`Across ${granularity} timeframe`}
        />
        <KPICard
          label="Unique Visitor IPs"
          value={summary.totalUniqueVisitors.toLocaleString()}
          icon={Users}
          change="Distinct devices & IP addresses"
        />
        <KPICard
          label="Avg. Views / Visitor"
          value={`${summary.avgViewsPerVisitor} views`}
          icon={Activity}
          change="Browsing depth per user"
        />
        <KPICard
          label="Peak Traffic Period"
          value={summary.peakPeriod.label}
          icon={Zap}
          change={`${summary.peakPeriod.visits} visits at peak`}
        />
      </div>

      {/* Main Interactive Time-Series Traffic Chart */}
      <div className="admin-card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', margin: 0 }}>
              Visitor Traffic & IP Trajectory
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', margin: '4px 0 0 0' }}>
              Compare total pageviews vs distinct unique IP sessions ({granularity} view).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-primary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-admin-text)' }}>
                Total Pageviews
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-admin-text)' }}>
                Unique Visitors / IPs
              </span>
            </div>
          </div>
        </div>

        {/* Responsive Bar Chart Canvas */}
        <div
          style={{
            height: '240px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: chartData.length > 20 ? '4px' : '10px',
            borderBottom: '1px solid var(--color-admin-border)',
            paddingBottom: '8px',
            position: 'relative',
          }}
        >
          {chartData.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--color-admin-muted)', fontSize: '13px' }}>
              No traffic data recorded in this period yet. Visits will populate here automatically.
            </div>
          ) : (
            chartData.map((d, idx) => {
              const visitHeight = Math.max(Math.round((d.visits / maxVisits) * 190), 4);
              const uniqueHeight = Math.max(Math.round((d.uniqueVisitors / maxVisits) * 190), 2);
              const isHovered = hoveredIndex === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                >
                  {/* Tooltip on Hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: `${visitHeight + 20}px`,
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        pointerEvents: 'none',
                        lineHeight: 1.4,
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{d.label}</div>
                      <div>👀 Visits: {d.visits}</div>
                      <div>👤 Unique IPs: {d.uniqueVisitors}</div>
                    </div>
                  )}

                  {/* Dual Bar (Visits & Unique IPs side-by-side or layered) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '2px',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '45%',
                        height: `${visitHeight}px`,
                        background: isHovered ? '#1d4ed8' : 'var(--color-primary)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.2s ease, background 0.15s ease',
                      }}
                    />
                    <div
                      style={{
                        width: '45%',
                        height: `${uniqueHeight}px`,
                        background: isHovered ? '#059669' : '#10b981',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.2s ease, background 0.15s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* X-Axis Labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '8px',
            fontSize: '11px',
            color: 'var(--color-admin-muted)',
            overflow: 'hidden',
          }}
        >
          {chartData.filter((_, i) => i % Math.ceil(chartData.length / 8) === 0).map((d, i) => (
            <span key={i}>{d.label}</span>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Devices & Top Visited Pages */}
      <div className="admin-grid-2">
        {/* Device & Platform Breakdown */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px' }}>
            📱 Devices & Browsers
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {deviceBreakdown.map(d => {
              const Icon = d.name.includes('Mobile')
                ? Smartphone
                : d.name.includes('Tablet')
                ? Tablet
                : Monitor;

              return (
                <div key={d.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-admin-text)' }}>
                      <Icon size={16} color="var(--color-primary)" />
                      {d.name}
                    </span>
                    <span style={{ color: 'var(--color-admin-muted)', fontWeight: 700 }}>
                      {d.count} ({d.percent}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: '#f1f5f9',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${d.percent}%`,
                        background: 'var(--color-primary)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Browser Distribution */}
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Top Browsers
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {browserBreakdown.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>No data yet</span>
              ) : (
                browserBreakdown.map(b => (
                  <div
                    key={b.name}
                    style={{
                      padding: '4px 10px',
                      background: '#f8fafc',
                      border: '1px solid var(--color-admin-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      color: 'var(--color-admin-text)',
                      fontWeight: 600,
                    }}
                  >
                    {b.name}: <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}>{b.percent}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Top Visited Store Pages */}
        <div className="admin-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px' }}>
            🧭 Most Visited Pages & Products
          </h3>

          {topPages.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-admin-muted)', fontSize: '13px' }}>
              No page visits tracked yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topPages.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid var(--color-admin-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--color-primary-10)',
                        color: 'var(--color-primary)',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--color-admin-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.path === '/' ? 'Home Page (/)' : p.path}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                      {p.count}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      {p.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Recent Visitors Stream Table */}
      <div className="admin-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)', margin: 0 }}>
              ⚡ Real-Time Visitor Live Stream
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', margin: '2px 0 0 0' }}>
              Latest customer visits with masked IP addresses and devices.
            </p>
          </div>
        </div>

        {recentVisitors.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-admin-muted)', fontSize: '13px' }}>
            No recent visitors recorded yet. Visits will stream in live.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Client IP (Masked)</th>
                  <th>Location</th>
                  <th>Device / Browser</th>
                  <th>Visited Route</th>
                  <th style={{ textAlign: 'right' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.map(v => (
                  <tr key={v.id}>
                    <td>
                      <code
                        style={{
                          background: '#f1f5f9',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {v.ip}
                      </code>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                        <Globe size={13} color="var(--color-primary)" />
                        {v.country}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--color-admin-text)' }}>
                        {v.device}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {v.pageUrl}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                      {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
