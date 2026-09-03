'use client';

import React from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import ProductCard from './ProductCard';
import CountdownTimer from './CountdownTimer';
import { Zap, ArrowRight } from 'lucide-react';

import { resolveFlashSaleEndTime } from '@/lib/flash-sale-utils';

interface FlashSaleProps {
  products: Product[];
  targetDate?: string | null;
}

export default function FlashSale({ products = [], targetDate = null }: FlashSaleProps) {
  if (products.length === 0) return null;

  const resolvedEnd = targetDate || resolveFlashSaleEndTime(undefined, products);

  return (
    <section className="flash-sale-box" aria-label="Flash Sale Deals">
      <div className="flash-sale-header">
        <div className="flash-sale-title-group">
          <div className="flash-sale-title">
            <span className="flash-sale-icon-badge">
              <Zap size={18} className="flash-icon-zap" fill="currentColor" />
            </span>
            <div className="flash-sale-heading-text">
              <span className="flash-sale-heading-primary">
                Flash Sale
                <span className="flash-sale-badge-bn">ফ্ল্যাশ সেল</span>
              </span>
            </div>
          </div>

          <div className="flash-sale-timer-block">
            <CountdownTimer targetDate={resolvedEnd} />
          </div>
        </div>

        <Link href="/deals" className="flash-sale-see-all">
          <span className="flash-sale-see-all-full">See All Deals</span>
          <span className="flash-sale-see-all-short">See All</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="flash-sale-products-track">
        {products.slice(0, 8).map(product => (
          <div key={product.id} className="flash-sale-card-wrapper">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
