import React from 'react';
import type { TrackingEvent, OrderStatus } from '@/types';
import { formatDate } from '@/lib/utils/format';
import { CheckCircle2, Clock, Truck, Package, XCircle } from 'lucide-react';

interface OrderTimelineProps {
  status: OrderStatus;
  events?: TrackingEvent[];
}

export default function OrderTimeline({ status, events = [] }: OrderTimelineProps) {
  const steps: Array<{ status: OrderStatus; label: string; icon: any }> = [
    { status: 'pending', label: 'Order Placed', icon: Clock },
    { status: 'confirmed', label: 'Payment Confirmed', icon: CheckCircle2 },
    { status: 'processing', label: 'Packaging', icon: Package },
    { status: 'shipped', label: 'In Transit', icon: Truck },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  if (status === 'cancelled') {
    return (
      <div style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)', padding: '16px', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <XCircle size={20} />
        <span style={{ fontWeight: 700 }}>This order has been cancelled.</span>
      </div>
    );
  }

  const currentIdx = steps.findIndex(s => s.status === status);
  const activeStep = currentIdx > -1 ? currentIdx : 0;

  return (
    <div style={{ margin: '24px 0' }}>
      {/* Horizontal Step Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginBottom: '32px' }}>
        {/* Background connector line */}
        <div style={{ position: 'absolute', top: '18px', left: '10%', right: '10%', height: '3px', background: 'var(--color-border)', zIndex: 1 }} />

        {steps.map((step, idx) => {
          const isPassed = idx <= activeStep;
          const isCurrent = idx === activeStep;
          const IconComp = step.icon;

          return (
            <div key={step.status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 2, width: '18%' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9999px',
                  background: isPassed ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: isPassed ? '#ffffff' : 'var(--color-text-muted)',
                  border: `2px solid ${isPassed ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isCurrent ? '0 0 0 4px var(--color-primary-10)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                <IconComp size={16} />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isPassed ? 700 : 500,
                  color: isPassed ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  marginTop: '8px',
                  textAlign: 'center',
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tracking History Log */}
      {events && events.length > 0 && (
        <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            Tracking Updates
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {events.map((ev, i) => (
              <div key={ev.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: i < events.length - 1 ? '1px solid var(--color-border)' : 'none', paddingBottom: '8px' }}>
                <div>
                  <strong>{ev.message}</strong>
                  {ev.location && <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px' }}>({ev.location})</span>}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{formatDate(ev.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
