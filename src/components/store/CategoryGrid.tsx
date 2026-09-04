import React from 'react';
import Link from 'next/link';
import type { Category } from '@/types';
import { ArrowRight } from 'lucide-react';

interface CategoryGridProps {
  categories: Category[];
}

/**
 * Maps category to identical emojis used in Explore Departments
 */
export function getCategoryEmoji(slug?: string, name?: string, index = 0): string {
  const key = `${slug || ''} ${name || ''}`.toLowerCase();

  if (key.includes('fashion') || key.includes('cloth') || key.includes('apparel') || key.includes('shirt')) {
    return '👕';
  }
  if (key.includes('electronic') || key.includes('audio') || key.includes('headphone') || key.includes('phone') || key.includes('gadget')) {
    return '🎧';
  }
  if (key.includes('lifestyle') || key.includes('sofa') || key.includes('decor')) {
    return '🛋️';
  }
  if (key.includes('sport') || key.includes('fitness') || key.includes('football')) {
    return '⚽';
  }
  if (key.includes('home') || key.includes('living') || key.includes('bag')) {
    return '🎒';
  }
  if (key.includes('beauty') || key.includes('cosmetic') || key.includes('makeup')) {
    return '💄';
  }
  if (key.includes('watch') || key.includes('accessor')) {
    return '⌚';
  }

  const defaultIcons = ['👕', '🎧', '🛋️', '⚽', '🎒', '💄', '⌚', '🏠'];
  return defaultIcons[index % defaultIcons.length];
}

export default function CategoryGrid({ categories = [] }: CategoryGridProps) {
  const displayList = categories.length > 0 ? categories : [
    { id: '1', name_en: 'Fashion', name_bn: 'ফ্যাশন', slug: 'fashion', parent_id: null, image_url: null, display_order: 1, is_active: true, meta_title: null, meta_description: null, created_at: '' },
    { id: '2', name_en: 'Electronics', name_bn: 'ইলেকট্রনিক্স', slug: 'electronics', parent_id: null, image_url: null, display_order: 2, is_active: true, meta_title: null, meta_description: null, created_at: '' },
    { id: '3', name_en: 'Lifestyle', name_bn: 'লাইফস্টাইল', slug: 'lifestyle', parent_id: null, image_url: null, display_order: 3, is_active: true, meta_title: null, meta_description: null, created_at: '' },
    { id: '4', name_en: 'Sports', name_bn: 'স্পোর্টস', slug: 'sports', parent_id: null, image_url: null, display_order: 4, is_active: true, meta_title: null, meta_description: null, created_at: '' },
    { id: '5', name_en: 'Home & Living', name_bn: 'হোম ও লিভিং', slug: 'home-living', parent_id: null, image_url: null, display_order: 5, is_active: true, meta_title: null, meta_description: null, created_at: '' },
  ];

  return (
    <section style={{ margin: '24px 0 32px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', margin: 0 }}>
          Explore Categories
        </h2>
        <Link
          href="/search"
          style={{
            fontSize: '12px',
            color: 'var(--color-primary, #2563eb)',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'gap 0.2s ease, opacity 0.2s ease',
          }}
          className="browse-collection-link"
        >
          <span>Browse by collection</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      <div className="landing-category-grid">
        {displayList.map((cat, idx) => {
          const emoji = getCategoryEmoji(cat.slug, cat.name_en, idx);
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              id={`cat-card-${cat.slug}`}
              className="landing-category-card"
            >
              <div className="landing-category-icon">
                {emoji}
              </div>

              <div className="landing-category-title">
                {cat.name_en}
              </div>

              {cat.name_bn && (
                <div className="landing-category-sub">
                  {cat.name_bn}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
