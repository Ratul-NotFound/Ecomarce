'use client';

import React from 'react';

interface PaymentLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Official Nagad Logo Vector Component
 */
export function NagadLogo({ size = 36, className = '', style }: PaymentLogoProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        background: '#ffffff',
        padding: '3px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid rgba(249, 115, 22, 0.25)',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src="/images/payments/nagad.svg"
        alt="Nagad"
        width={size - 6}
        height={size - 6}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        loading="eager"
      />
    </div>
  );
}

/**
 * Official bKash Logo Vector Component
 */
export function BkashLogo({ size = 36, className = '', style }: PaymentLogoProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        background: '#ffffff',
        padding: '3px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid rgba(226, 19, 110, 0.25)',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      <img
        src="/images/payments/bkash.svg"
        alt="bKash"
        width={size - 6}
        height={size - 6}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        loading="eager"
      />
    </div>
  );
}
