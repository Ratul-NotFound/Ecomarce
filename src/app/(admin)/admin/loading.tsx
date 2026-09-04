import React from 'react';

export default function AdminLoading() {
  return (
    <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
      {/* Page Header Shimmer */}
      <div className="admin-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <div
            style={{
              width: '220px',
              height: '28px',
              background: 'var(--color-admin-surface-2, #f1f5f9)',
              borderRadius: '6px',
              marginBottom: '8px',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <div
            style={{
              width: '340px',
              height: '14px',
              background: 'var(--color-admin-surface-2, #f1f5f9)',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite',
            }}
          />
        </div>
      </div>

      {/* KPI Cards Shimmer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="admin-card"
            style={{
              padding: '20px',
              minHeight: '110px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: '90px',
                  height: '12px',
                  background: 'var(--color-admin-surface-2, #f1f5f9)',
                  borderRadius: '4px',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'var(--color-admin-surface-2, #f1f5f9)',
                  borderRadius: '8px',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            </div>
            <div
              style={{
                width: '120px',
                height: '24px',
                background: 'var(--color-admin-surface-2, #f1f5f9)',
                borderRadius: '4px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          </div>
        ))}
      </div>

      {/* Main Table / Content Shimmer */}
      <div className="admin-card" style={{ padding: '24px' }}>
        <div
          style={{
            width: '180px',
            height: '20px',
            background: 'var(--color-admin-surface-2, #f1f5f9)',
            borderRadius: '4px',
            marginBottom: '20px',
            animation: 'pulse 1.5s infinite',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3, 4, 5].map(row => (
            <div
              key={row}
              style={{
                height: '42px',
                background: 'var(--color-admin-surface-2, #f8fafc)',
                borderRadius: '6px',
                border: '1px solid var(--color-admin-border, #e2e8f0)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
