// src/lib/store-settings-shared.ts
// Shared types and defaults for storefront customizations (safe for Client & Server components)

export interface StorefrontCustomSettings {
  // Global Header Announcement Bar
  announcement_bar_enabled: boolean;
  announcement_bar_text: string;
  announcement_bar_link: string;

  // Store Support Contacts
  store_phone: string;
  store_whatsapp: string;

  // Homepage
  homepage_flash_sale_enabled: boolean;
  homepage_flash_sale_title: string;
  homepage_flash_sale_end: string | null;
  homepage_featured_title: string;
  homepage_new_arrivals_title: string;
  homepage_sections_order: string[]; // ['hero', 'trust_badges', 'categories', 'flash_sale', 'featured', 'new_arrivals']
  homepage_section_visibility: Record<string, boolean>;

  // Trust Badges
  trust_badge_1_title: string;
  trust_badge_1_desc: string;
  trust_badge_2_title: string;
  trust_badge_2_desc: string;
  trust_badge_3_title: string;
  trust_badge_3_desc: string;
  trust_badge_4_title: string;
  trust_badge_4_desc: string;

  // Deals Hub
  deals_hero_title: string;
  deals_hero_subtitle: string;
  deals_badge_text: string;
  deals_timer_hours: number;

  // Explore Hub
  explore_title: string;
  explore_departments_title: string;
  explore_trending_tags: string;
}

export const DEFAULT_HOMEPAGE_SECTIONS = [
  'hero',
  'trust_badges',
  'categories',
  'flash_sale',
  'featured',
  'new_arrivals',
];

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontCustomSettings = {
  announcement_bar_enabled: true,
  announcement_bar_text: '⚡ Super Flash Offers: Cash on Delivery Nationwide & Free Delivery Over ৳1,500!',
  announcement_bar_link: '/deals',

  store_phone: '+880 1700-000000',
  store_whatsapp: '+880 1700-000000',

  homepage_flash_sale_enabled: true,
  homepage_flash_sale_title: '⚡ Flash Deals & Steals',
  homepage_flash_sale_end: null,
  homepage_featured_title: '✨ Handpicked For You',
  homepage_new_arrivals_title: '🚀 New Arrivals / নতুন কালেকশন',
  homepage_sections_order: DEFAULT_HOMEPAGE_SECTIONS,
  homepage_section_visibility: {
    hero: true,
    trust_badges: true,
    categories: true,
    flash_sale: true,
    featured: true,
    new_arrivals: true,
  },
  trust_badge_1_title: 'Cash on Delivery',
  trust_badge_1_desc: 'Pay at your doorstep',
  trust_badge_2_title: 'Fast Delivery',
  trust_badge_2_desc: '2-3 days nationwide',
  trust_badge_3_title: 'Easy Returns',
  trust_badge_3_desc: '7-day replacement guarantee',
  trust_badge_4_title: '24/7 Support',
  trust_badge_4_desc: 'Friendly customer assistance',

  deals_hero_title: '🔥 Super Flash Deals & Discounts',
  deals_hero_subtitle: 'Limited stock, guaranteed authentic with cash on delivery anywhere in Bangladesh.',
  deals_badge_text: 'EXCLUSIVE FLASH PROMOTIONS',
  deals_timer_hours: 6,

  explore_title: 'Explore Catalog',
  explore_departments_title: 'Explore Departments',
  explore_trending_tags: 'Wireless Earbuds, Smartwatch, Cotton T-Shirts, Sneakers, Backpack',
};
