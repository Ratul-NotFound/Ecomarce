import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import { getStoreSettings } from '@/lib/store-settings';
import DealCouponClaim from '@/components/store/DealCouponClaim';
import DealProductCard from '@/components/store/DealProductCard';
import DealsHeroBanner from '@/components/store/DealsHeroBanner';
import { Zap, Flame, Sparkles } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import { resolveFlashSaleEndTime } from '@/lib/flash-sale-utils';
import type { SpecialOffer } from '@/types';
import type { Metadata } from 'next';

interface DealsPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export const metadata: Metadata = {
  title: `Flash Deals & Daily Discounts | ${STORE_CONFIG.name}`,
  description: 'Shop limited-time flash deals, exclusive discounts, and claimable store coupons on ShopBD.',
};

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const sParams = await searchParams;
  const tier = sParams.tier || 'all'; // 'all' | 'under1k' | 'big_discount' | 'best_selling'

  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);

  // Fetch settings and live coupons from database in parallel
  const [settings, couponsRes] = await Promise.all([
    getStoreSettings(),
    supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  const dealsIds = settings.deals_banner_ids
    ? (typeof settings.deals_banner_ids === 'string' ? JSON.parse(settings.deals_banner_ids) : settings.deals_banner_ids)
    : [];

  let bannersQuery = supabase
    .from('special_offers')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (Array.isArray(dealsIds) && dealsIds.length > 0) {
    bannersQuery = bannersQuery.or(`type.eq.deals_banner,id.in.(${dealsIds.join(',')})`);
  } else {
    bannersQuery = bannersQuery.eq('type', 'deals_banner');
  }

  const { data: rawBanners } = await bannersQuery;
  const dealsBanners = (rawBanners as SpecialOffer[]) || [];

  // Parse coupon deals visibility fallback from store_settings
  let dealsVisMap: Record<string, boolean> = {};
  if (settings.coupon_deals_visibility) {
    try {
      dealsVisMap = typeof settings.coupon_deals_visibility === 'string'
        ? JSON.parse(settings.coupon_deals_visibility)
        : settings.coupon_deals_visibility;
    } catch {}
  }

  // Filter coupons visible on deals page
  const visibleCoupons = (couponsRes.data || []).filter(c => {
    if (dealsVisMap[c.code] !== undefined) return dealsVisMap[c.code] !== false;
    if (dealsVisMap[c.id] !== undefined) return dealsVisMap[c.id] !== false;
    if (c.show_on_deals_page !== undefined) return c.show_on_deals_page !== false;
    return true;
  });

  const claimedVouchers = visibleCoupons.length > 0
    ? visibleCoupons.map(c => {
        const isPercent = c.type === 'percent' || c.type === 'percentage';
        return {
          code: c.code,
          discount: isPercent ? `${c.value}% OFF` : `৳${c.value} FLAT`,
          description: c.description || (isPercent ? `${c.value}% discount on orders` : `Flat ৳${c.value} discount`),
          minOrder: c.min_order_amount ? `Min order ৳${c.min_order_amount}` : undefined,
        };
      })
    : [];

  // Fetch all flash sale or discounted items
  let maxPrice: number | undefined = undefined;
  let sort: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' = 'newest';

  if (tier === 'under1k') {
    maxPrice = 1000;
    sort = 'price_asc';
  } else if (tier === 'best_selling') {
    sort = 'best_selling';
  }

  const { data: allProducts } = await productRepo.findAll({
    is_flash_sale: true,
    max_price: maxPrice,
    sort,
    page_size: 40,
  });

  // Fallback: if fewer than 4 flash sale products exist, include products with real discounts
  let products = allProducts || [];
  if (products.length < 8) {
    const { data: fallback } = await productRepo.findAll({
      page_size: 30,
      max_price: maxPrice,
      sort,
    });
    const discountedFallback = (fallback || []).filter(
      p => p.is_flash_sale || (p.sale_price && p.sale_price < p.base_price) || (p.has_price_range && (p.max_discount_percent ?? 0) > 0)
    );
    // Merge without duplicates
    const existingIds = new Set(products.map(p => p.id));
    discountedFallback.forEach(p => {
      if (!existingIds.has(p.id)) {
        products.push(p);
        existingIds.add(p.id);
      }
    });
  }

  // Filter for big discounts if tier selected
  if (tier === 'big_discount') {
    products = products.filter(
      p => (p.discount_percent && p.discount_percent >= 25) || (p.sale_price && (p.base_price - p.sale_price) / p.base_price >= 0.25) || ((p.max_discount_percent ?? 0) >= 25)
    );
  }

  const flashSaleEndTime = resolveFlashSaleEndTime(settings);

  return (
    <div className="deals-page-container">
      {/* 1. Deals Hero Banner with Promotional Carousel and Synchronized Countdown */}
      <DealsHeroBanner
        banners={dealsBanners}
        settings={settings}
        flashSaleEndTime={flashSaleEndTime}
      />

      <div className="container" style={{ padding: '0 16px 60px' }}>
        {/* 2. Collectible Discount Coupons Section */}
        <DealCouponClaim coupons={claimedVouchers} />

        {/* 3. Deal Price & Discount Filter Tabs */}
        <div className="deal-tabs-row">
          <Link
            href="/deals"
            className={`deal-tab-btn ${tier === 'all' ? 'deal-tab-btn--active' : ''}`}
          >
            <Flame size={14} />
            <span>All Deals</span>
          </Link>

          <Link
            href="/deals?tier=under1k"
            className={`deal-tab-btn ${tier === 'under1k' ? 'deal-tab-btn--active' : ''}`}
          >
            <Zap size={14} />
            <span>Under ৳1,000</span>
          </Link>

          <Link
            href="/deals?tier=big_discount"
            className={`deal-tab-btn ${tier === 'big_discount' ? 'deal-tab-btn--active' : ''}`}
          >
            <Sparkles size={14} />
            <span>25%+ Mega Off</span>
          </Link>

          <Link
            href="/deals?tier=best_selling"
            className={`deal-tab-btn ${tier === 'best_selling' ? 'deal-tab-btn--active' : ''}`}
          >
            <span>⭐ Best Sellers</span>
          </Link>
        </div>

        {/* 4. Deals Product Grid */}
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 800 }}>
            {tier === 'under1k'
              ? '⚡ Budget Steals Under ৳1,000'
              : tier === 'big_discount'
              ? '💎 Mega Discount Deals (25%+ Off)'
              : tier === 'best_selling'
              ? '⭐ Top Selling Flash Deals'
              : '🔥 Live Flash Sale Items'}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
            {products.length} live offers
          </span>
        </div>

        {products.length > 0 ? (
          <div className="product-grid">
            {products.map(product => (
              <DealProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-2xl)', border: '1px solid var(--color-border)' }}>
            <Zap size={40} color="var(--color-primary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>No deals currently in this tier</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Check out all available flash sale products or check back soon!
            </p>
            <Link href="/deals" className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>
              View All Flash Deals
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
