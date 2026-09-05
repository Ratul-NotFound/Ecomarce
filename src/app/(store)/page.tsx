import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import { getStoreSettings, type StorefrontCustomSettings, DEFAULT_STOREFRONT_SETTINGS } from '@/lib/store-settings';
import HeroBanner from '@/components/store/HeroBanner';
import CategoryGrid from '@/components/store/CategoryGrid';
import FlashSale from '@/components/store/FlashSale';
import ProductGrid from '@/components/store/ProductGrid';
import { CashOnDelivery3DIcon, FastDelivery3DIcon, EasyReturns3DIcon, Support2473DIcon } from '@/components/store/TrustBadgeIcons';
import type { SpecialOffer, Product } from '@/types';
import { resolveFlashSaleEndTime } from '@/lib/flash-sale-utils';

export const revalidate = 60; // Incremental Static Regeneration every 60s

export default async function HomePage() {
  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);
  const categoryRepo = new CategoryRepository(supabase);

  let banners: SpecialOffer[] = [];
  let categories: any[] = [];
  let flashSaleProducts: Product[] = [];
  let featuredProducts: Product[] = [];
  let newArrivals: Product[] = [];
  let settings: StorefrontCustomSettings = DEFAULT_STOREFRONT_SETTINGS;

  try {
    const [bannersRes, cats, flash, feat, newest, storeSettings] = await Promise.all([
      supabase
        .from('special_offers')
        .select('*')
        .eq('type', 'hero_banner')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      categoryRepo.findTopLevel(),
      productRepo.findFlashSale(),
      productRepo.findFeatured(8),
      productRepo.findAll({ sort: 'newest', page_size: 8 }),
      getStoreSettings(),
    ]);

    banners = (bannersRes.data as SpecialOffer[]) || [];
    categories = cats;
    flashSaleProducts = flash;
    featuredProducts = feat;
    newArrivals = newest.data;
    settings = storeSettings;
  } catch (err) {
    console.error('Error fetching homepage data:', err);
  }

  // Fallback demo products if Supabase tables are initially empty
  if (featuredProducts.length === 0 && newArrivals.length === 0) {
    const STATIC_DEMO_DATE = '2026-01-01T00:00:00.000Z';
    const STATIC_FLASH_DATE = '2026-12-31T23:59:59.000Z';
    const demoSampleProducts: Product[] = [
      {
        id: 'p1',
        name_en: 'Premium Cotton Oxford Shirt',
        name_bn: 'প্রিমিয়াম কটন অক্সফোর্ড শার্ট',
        slug: 'premium-cotton-oxford-shirt',
        description_en: 'Classic tailored fit, breathable 100% combed cotton.',
        description_bn: null,
        category_id: null,
        brand: 'Fabrilife',
        sku: 'SHIRT-001',
        base_price: 1850,
        sale_price: 1450,
        discount_percent: 21,
        stock_quantity: 45,
        low_stock_threshold: 5,
        images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'],
        tags: ['fashion', 'men', 'shirts'],
        has_variants: true,
        weight_grams: 250,
        is_active: true,
        is_featured: true,
        is_flash_sale: true,
        flash_sale_ends_at: STATIC_FLASH_DATE,
        display_order: 1,
        total_sold: 142,
        total_views: 1200,
        meta_title: null,
        meta_description: null,
        created_at: STATIC_DEMO_DATE,
        updated_at: STATIC_DEMO_DATE,
      },
      {
        id: 'p2',
        name_en: 'Wireless ANC Noise-Cancelling Headphones',
        name_bn: 'ওয়্যারলেস নয়েজ ক্যানসেলিং হেডফোন',
        slug: 'wireless-anc-headphones',
        description_en: '40-hour battery life, high-res audio drivers.',
        description_bn: null,
        category_id: null,
        brand: 'SoundPulse',
        sku: 'AUDIO-002',
        base_price: 4200,
        sale_price: 3500,
        discount_percent: 16,
        stock_quantity: 20,
        low_stock_threshold: 3,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'],
        tags: ['electronics', 'gadgets', 'audio'],
        has_variants: false,
        weight_grams: 300,
        is_active: true,
        is_featured: true,
        is_flash_sale: false,
        flash_sale_ends_at: null,
        display_order: 2,
        total_sold: 89,
        total_views: 950,
        meta_title: null,
        meta_description: null,
        created_at: STATIC_DEMO_DATE,
        updated_at: STATIC_DEMO_DATE,
      },
      {
        id: 'p3',
        name_en: 'Minimalist Chronograph Quartz Watch',
        name_bn: 'মিনিমালিস্ট ক্রনোগ্রাফ কোয়ার্টজ ঘড়ি',
        slug: 'minimalist-chronograph-watch',
        description_en: 'Genuine leather strap, Japanese quartz movement, 3ATM water resistant.',
        description_bn: null,
        category_id: null,
        brand: 'Chronos',
        sku: 'WATCH-003',
        base_price: 3200,
        sale_price: 2490,
        discount_percent: 22,
        stock_quantity: 15,
        low_stock_threshold: 4,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'],
        tags: ['watches', 'accessories'],
        has_variants: false,
        weight_grams: 180,
        is_active: true,
        is_featured: true,
        is_flash_sale: true,
        flash_sale_ends_at: STATIC_FLASH_DATE,
        display_order: 3,
        total_sold: 67,
        total_views: 810,
        meta_title: null,
        meta_description: null,
        created_at: STATIC_DEMO_DATE,
        updated_at: STATIC_DEMO_DATE,
      },
      {
        id: 'p4',
        name_en: 'Ergonomic Mechanical Gaming Keyboard',
        name_bn: 'মেকানিক্যাল গেমিং কীবোর্ড',
        slug: 'ergonomic-mechanical-keyboard',
        description_en: 'RGB backlit, hot-swappable switches, PBT double-shot keycaps.',
        description_bn: null,
        category_id: null,
        brand: 'KeyCraft',
        sku: 'KEY-004',
        base_price: 5500,
        sale_price: 4600,
        discount_percent: 16,
        stock_quantity: 30,
        low_stock_threshold: 5,
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'],
        tags: ['gaming', 'computers', 'accessories'],
        has_variants: true,
        weight_grams: 850,
        is_active: true,
        is_featured: true,
        is_flash_sale: false,
        flash_sale_ends_at: null,
        display_order: 4,
        total_sold: 210,
        total_views: 1890,
        meta_title: null,
        meta_description: null,
        created_at: STATIC_DEMO_DATE,
        updated_at: STATIC_DEMO_DATE,
      },
    ];
    featuredProducts = demoSampleProducts;
    newArrivals = demoSampleProducts;
    flashSaleProducts = demoSampleProducts.filter(p => p.is_flash_sale);
  }

  // Dynamic midnight target calculation
  const flashSaleEndTime = resolveFlashSaleEndTime(settings);

  // Dynamic Section Map for Sequence Customization
  const sectionMap: Record<string, React.ReactNode> = {
    hero: banners.length > 0 ? <HeroBanner key="hero" banners={banners} /> : null,
    trust_badges: (
      <div
        key="trust_badges"
        className="trust-badges-grid"
      >
        {/* 1. Cash on Delivery */}
        <div className="trust-badge-item">
          <div
            className="trust-badge-icon-box"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.22)',
            }}
          >
            <CashOnDelivery3DIcon size={30} />
          </div>
          <div>
            <div className="trust-badge-title">
              {settings.trust_badge_1_title}
            </div>
            <div className="trust-badge-desc">
              {settings.trust_badge_1_desc}
            </div>
          </div>
        </div>

        {/* 2. Fast Delivery */}
        <div className="trust-badge-item">
          <div
            className="trust-badge-icon-box"
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(37, 99, 235, 0.04) 100%)',
              border: '1px solid rgba(37, 99, 235, 0.22)',
            }}
          >
            <FastDelivery3DIcon size={30} />
          </div>
          <div>
            <div className="trust-badge-title">
              {settings.trust_badge_2_title}
            </div>
            <div className="trust-badge-desc">
              {settings.trust_badge_2_desc}
            </div>
          </div>
        </div>

        {/* 3. Easy Returns */}
        <div className="trust-badge-item">
          <div
            className="trust-badge-icon-box"
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.22)',
            }}
          >
            <EasyReturns3DIcon size={30} />
          </div>
          <div>
            <div className="trust-badge-title">
              {settings.trust_badge_3_title}
            </div>
            <div className="trust-badge-desc">
              {settings.trust_badge_3_desc}
            </div>
          </div>
        </div>

        {/* 4. 24/7 Support */}
        <div className="trust-badge-item">
          <div
            className="trust-badge-icon-box"
            style={{
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12) 0%, rgba(147, 51, 234, 0.04) 100%)',
              border: '1px solid rgba(147, 51, 234, 0.22)',
            }}
          >
            <Support2473DIcon size={30} />
          </div>
          <div>
            <div className="trust-badge-title">
              {settings.trust_badge_4_title}
            </div>
            <div className="trust-badge-desc">
              {settings.trust_badge_4_desc}
            </div>
          </div>
        </div>
      </div>
    ),
    categories: <CategoryGrid key="categories" categories={categories} />,
    flash_sale: settings.homepage_flash_sale_enabled && flashSaleProducts.length > 0 ? (
      <FlashSale key="flash_sale" products={flashSaleProducts} targetDate={flashSaleEndTime} />
    ) : null,
    featured: (
      <section key="featured" style={{ margin: '40px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{(settings.homepage_featured_title || 'Handpicked For You').replace(/^[^\w\s\u0980-\u09FF]+/, '').trim()}</h2>
          <span style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600 }}>Curated Top Picks</span>
        </div>
        <ProductGrid products={featuredProducts} />
      </section>
    ),
    new_arrivals: (
      <section key="new_arrivals" style={{ margin: '40px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{(settings.homepage_new_arrivals_title || 'New Arrivals / নতুন কালেকশন').replace(/^[^\w\s\u0980-\u09FF]+/, '').trim()}</h2>
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Fresh in stock</span>
        </div>
        <ProductGrid products={newArrivals} />
      </section>
    ),
  };

  return (
    <div className="container" style={{ paddingBottom: '40px' }} suppressHydrationWarning>
      {settings.homepage_sections_order.map(secKey => {
        const isVisible = settings.homepage_section_visibility?.[secKey] !== false;
        if (!isVisible) return null;
        return sectionMap[secKey] || null;
      })}
    </div>
  );
}
