'use client';

import React, { useState } from 'react';
import type { TrackingEvent, OrderStatus } from '@/types';
import { formatDate } from '@/lib/utils/format';
import { CheckCircle2, Clock, Truck, Package, XCircle, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

interface OrderTimelineProps {
  status: OrderStatus;
  events?: TrackingEvent[];
}

export default function OrderTimeline({ status, events = [] }: OrderTimelineProps) {
  const [showAllMobileEvents, setShowAllMobileEvents] = useState(false);

  const steps: Array<{
    status: OrderStatus;
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  }> = [
    { status: 'pending', label: 'Order Placed', description: 'We received your order', icon: Clock },
    { status: 'confirmed', label: 'Confirmed', description: 'Order verified & approved', icon: CheckCircle2 },
    { status: 'processing', label: 'Processing', description: 'Items being carefully packed', icon: Package },
    { status: 'shipped', label: 'Shipped', description: 'Dispatched to courier partner', icon: Truck },
    { status: 'out_for_delivery', label: 'Out for Delivery', description: 'Rider is on the way', icon: Truck },
    { status: 'delivered', label: 'Delivered', description: 'Package safely delivered', icon: CheckCircle2 },
  ];

  if (status === 'cancelled') {
    return (
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#dc2626',
          padding: '16px 20px',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0',
        }}
      >
        <XCircle size={24} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px' }}>Order Cancelled</div>
          <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '2px' }}>
            This order was cancelled. If you have any inquiries or need a refund, please contact customer support.
          </div>
        </div>
      </div>
    );
  }

  // Calculate active step index safely
  let activeStep = 0;
  if (status === 'delivered') activeStep = 5;
  else if (status === 'out_for_delivery') activeStep = 4;
  else if (status === 'shipped') activeStep = 3;
  else if (status === 'processing') activeStep = 2;
  else if (status === 'confirmed') activeStep = 1;
  else if (status === 'pending') activeStep = 0;

  const currentStepObj = steps[activeStep] || steps[0];
  const progressPercent = Math.min(Math.max((activeStep / (steps.length - 1)) * 100, 0), 100);

  return (
    <div style={{ margin: '24px 0' }}>
      {/* ────────────────────────────────────────────────────────────
          1. DESKTOP & TABLET PIPELINE (Horizontal with Active Fill)
      ──────────────────────────────────────────────────────────── */}
      <div className="order-timeline-desktop" style={{ marginBottom: '32px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* Background Track Line */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '5%',
              right: '5%',
              height: '4px',
              background: '#e2e8f0',
              borderRadius: '2px',
              zIndex: 1,
            }}
          >
            {/* Active Filled Progress Line */}
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                borderRadius: '2px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>

          {steps.map((step, idx) => {
            const isPassed = idx <= activeStep;
            const isCurrent = idx === activeStep;
            const IconComp = step.icon;

            return (
              <div
                key={step.status}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  zIndex: 2,
                  width: `${100 / steps.length}%`,
                  textAlign: 'center',
                }}
              >
                {/* Milestone Circle */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '9999px',
                    background: isPassed ? '#2563eb' : '#ffffff',
                    color: isPassed ? '#ffffff' : '#94a3b8',
                    border: `2.5px solid ${isPassed ? '#2563eb' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isCurrent
                      ? '0 0 0 5px rgba(37, 99, 235, 0.2)'
                      : isPassed
                      ? '0 2px 6px rgba(37, 99, 235, 0.25)'
                      : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <IconComp size={18} />
                </div>

                {/* Milestone Title */}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isPassed ? 800 : 500,
                    color: isPassed ? '#0f172a' : '#64748b',
                    marginTop: '8px',
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </span>

                {/* Milestone Subtext */}
                <span
                  style={{
                    fontSize: '10.5px',
                    color: isCurrent ? '#2563eb' : '#94a3b8',
                    fontWeight: isCurrent ? 700 : 400,
                    marginTop: '2px',
                    maxWidth: '100px',
                  }}
                >
                  {step.description}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          2. MOBILE PIPELINE (Card Summary + Step Progress Meter)
      ──────────────────────────────────────────────────────────── */}
      <div className="order-timeline-mobile" style={{ marginBottom: '24px' }}>
        {/* Current Status Highlight Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(59,130,246,0.03) 100%)',
            border: '1.5px solid rgba(37,99,235,0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.5px' }}>
              Current Status • Step {activeStep + 1} of {steps.length}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: '#2563eb',
                color: '#ffffff',
              }}
            >
              {Math.round(progressPercent)}%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(37,99,235,0.3)',
              }}
            >
              {React.createElement(currentStepObj.icon, { size: 20 })}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {currentStepObj.label}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                {currentStepObj.description}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '14px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                borderRadius: '3px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Expandable Step-by-Step Milestones */}
        <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-xl)', padding: '14px 16px', border: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setShowAllMobileEvents(!showAllMobileEvents)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 0',
              color: 'var(--color-text-primary)',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            <span>View All Delivery Milestones ({steps.length})</span>
            {showAllMobileEvents ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAllMobileEvents && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
              {steps.map((step, idx) => {
                const isPassed = idx <= activeStep;
                const isCurrent = idx === activeStep;
                const IconComp = step.icon;

                return (
                  <div key={step.status} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: isPassed ? '#2563eb' : '#f1f5f9',
                        color: isPassed ? '#ffffff' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: `1.5px solid ${isPassed ? '#2563eb' : '#cbd5e1'}`,
                      }}
                    >
                      <IconComp size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: isPassed ? 700 : 500, color: isPassed ? '#0f172a' : '#94a3b8' }}>
                        {step.label} {isCurrent && <span style={{ color: '#2563eb', fontWeight: 800 }}>• In Progress</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          3. LIVE DISPATCH & TRACKING UPDATES LOG
      ──────────────────────────────────────────────────────────── */}
      {events && events.length > 0 && (
        <div
          style={{
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-xl)',
            padding: '18px 20px',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '14px', letterSpacing: '0.5px' }}>
            <MapPin size={14} color="var(--color-primary)" />
            <span>Courier Dispatch & Live Tracking Updates</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map((ev, i) => (
              <div
                key={ev.id || i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  fontSize: '13px',
                  borderBottom: i < events.length - 1 ? '1px solid var(--color-border)' : 'none',
                  paddingBottom: '10px',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{ev.message}</strong>
                  {ev.location && (
                    <span style={{ color: 'var(--color-primary)', fontWeight: 600, marginLeft: '6px' }}>
                      📍 {ev.location}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', flexShrink: 0 }}>
                  {formatDate(ev.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
