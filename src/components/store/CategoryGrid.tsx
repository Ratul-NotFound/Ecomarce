import React from 'react';
import Link from 'next/link';
import type { Category } from '@/types';
import { Tag, Smartphone, Shirt, Watch, Home, Sparkles } from 'lucide-react';

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories = [] }: CategoryGridProps) {
  const iconMap: Record<string, any> = {
    fashion: Shirt,
    electronics: Smartphone,
    lifestyle: Watch,
    'home-garden': Home,
    sports: Sparkles,
  };

  const displayList = categories.length > 0 ? categories : [
    { id: '1', name_en: 'Fashion', name_bn: 'ফ্যাশন', slug: 'fashion', parent_id: null, image_url: null, display_order: 1, is_active: true, meta_title: null, meta_description: null, created_at: '' },
    { id: '2', name_en: 'Electronics', name_bn: 'ইলেকট্রনিক্স', slug: 'electronics', parent_id: null, image_url: null, display_order: 2, is_active: true, meta_title: null, meta_description: null, created_at: '' },
    { id: '3', name_en: 'Lifestyle', name_bn: 'লাইফস্টাইল', slug: 'lifestyle', parent_id: null, image_url: null, display_order: 3, is_active: true, meta_title: null, meta_description: null, created_at: '' },
    { id: '4', name_en: 'Home & Living', name_bn: 'হোম ও গার্ডেন', slug: 'home-garden', parent_id: null, image_url: null, display_order: 4, is_active: true, meta_title: null, meta_description: null, created_at: '' },
    { id: '5', name_en: 'Sports & Fitness', name_bn: 'স্পোর্টস', slug: 'sports', parent_id: null, image_url: null, display_order: 5, is_active: true, meta_title: null, meta_description: null, created_at: '' },
  ];

  return (
    <section style={{ margin: '32px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <h2>Explore Categories</h2>
        <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600 }}>Browse by collection</span>
      </div>

      <div className="category-grid">
        {displayList.map(cat => {
          const IconComponent = iconMap[cat.slug] || Tag;
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="category-card"
              id={`cat-card-${cat.slug}`}
            >
              <div className="category-card__icon">
                <IconComponent size={24} />
              </div>
              <div className="category-card__name">{cat.name_en}</div>
              {cat.name_bn && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
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
