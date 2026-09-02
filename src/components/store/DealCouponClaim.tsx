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

const DEFAULT_COUPONS = [
  {
    code: 'FLASH15',
    discount: '15% OFF',
    description: 'On all flash sale deals today',
    minOrder: 'Min order ৳1,000',
  },
  {
    code: 'SAVE200',
    discount: '৳200 FLAT',
    description: 'Instant discount on checkout',
    minOrder: 'Min order ৳1,500',
  },
  {
    code: 'FREEBD',
    discount: 'FREE DELIVERY',
    description: 'Zero delivery charge anywhere in BD',
    minOrder: 'Min order ৳2,000',
  },
];

export default function DealCouponClaim({ coupons = DEFAULT_COUPONS }: DealCouponClaimProps) {
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Coupon "${code}" copied to clipboard! Paste it at checkout.`, 'success');
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
