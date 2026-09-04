'use client';

import React, { useState } from 'react';
import { Tag, Check, Copy } from 'lucide-react';
import { useToast } from '@/components/shared/ToastProvider';

interface DealCouponClaimProps {
  coupons?: Array<{
    code: string;
    discount: string;
    description: string;
    minOrder?: string;
  }>;
}

export default function DealCouponClaim({ coupons = [] }: DealCouponClaimProps) {
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!coupons || coupons.length === 0) {
    return null;
  }

  const handleCopy = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
    } catch {}
    try {
      localStorage.setItem('shopbd_claimed_coupon', code);
    } catch {}
    setCopiedCode(code);
    showToast(`Coupon "${code}" claimed! It will automatically apply at checkout.`, 'success');
    setTimeout(() => {
      setCopiedCode(null);
    }, 3000);
  };

  return (
    <div className="deal-coupons-container">
      <div className="deal-coupons-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Tag size={16} color="var(--color-primary)" />
          <span style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Available Store Vouchers
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
          Tap to copy & apply at checkout
        </span>
      </div>

      <div className="deal-coupons-scroll">
        {coupons.map(coupon => {
          const isCopied = copiedCode === coupon.code;
          return (
            <div key={coupon.code} className="deal-voucher-ticket">
              <div className="deal-voucher-left">
                <div className="deal-voucher-badge">{coupon.discount}</div>
                <div className="deal-voucher-desc">{coupon.description}</div>
                {coupon.minOrder && (
                  <div className="deal-voucher-min">{coupon.minOrder}</div>
                )}
              </div>

              <div className="deal-voucher-divider" />

              <div className="deal-voucher-right">
                <button
                  type="button"
                  onClick={() => handleCopy(coupon.code)}
                  className={`deal-voucher-btn ${isCopied ? 'deal-voucher-btn--copied' : ''}`}
                  title="Copy coupon code"
                >
                  {isCopied ? (
                    <>
                      <Check size={12} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>{coupon.code}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
