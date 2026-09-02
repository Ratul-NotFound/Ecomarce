import React from 'react';
import type { Product } from '@/types';
import ProductCard from './ProductCard';
import CountdownTimer from './CountdownTimer';
import { Zap } from 'lucide-react';

interface FlashSaleProps {
  products: Product[];
}

export default function FlashSale({ products = [] }: FlashSaleProps) {
  if (products.length === 0) return null;

  const firstFlashEnd = products[0]?.flash_sale_ends_at || null;

  return (
    <section className="flash-sale-box">
      <div className="flash-sale-header">
        <div className="flash-sale-title">
          <Zap size={28} color="var(--color-accent)" fill="currentColor" />
          <span>Flash Sale / ফ্ল্যাশ সেল</span>
        </div>
        <CountdownTimer targetDate={firstFlashEnd} />
      </div>

      <div className="product-grid">
        {products.slice(0, 4).map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
