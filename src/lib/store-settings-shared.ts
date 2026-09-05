// src/lib/store-settings-shared.ts
// Shared types and defaults for storefront customizations (safe for Client & Server components)

import { STORE_CONFIG } from '@/lib/store-config';

export interface StorefrontCustomSettings {
  // Brand & Identity
  store_name: string;
  store_tagline: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;

  // Delivery & Shipping Rates (BDT)
  shipping_inside_dhaka: number;
  shipping_outside_dhaka: number;
  free_shipping_above: number;

  // Theme & Styling
  primary_color?: string;

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
  coupon_deals_visibility?: string | Record<string, boolean>;
  deals_banner_ids?: string[];

  // Explore Hub
  explore_title: string;
  explore_departments_title: string;
  explore_trending_tags: string;

  // Social Media Links (Admin Configurable)
  social_facebook?: string;
  social_instagram?: string;
  social_youtube?: string;
  social_tiktok?: string;
  social_whatsapp?: string;
  social_telegram?: string;
  social_twitter?: string;
  social_linkedin?: string;
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
  store_name: STORE_CONFIG.name,
  store_tagline: STORE_CONFIG.tagline,
  contact_email: STORE_CONFIG.contact.email,
  contact_phone: STORE_CONFIG.contact.phone,
  contact_address: STORE_CONFIG.contact.address,

  shipping_inside_dhaka: STORE_CONFIG.shipping.insideDhaka,
  shipping_outside_dhaka: STORE_CONFIG.shipping.outsideDhaka,
  free_shipping_above: STORE_CONFIG.shipping.freeAbove,

  primary_color: '#2563eb',

  announcement_bar_enabled: true,
  announcement_bar_text: `⚡ Super Flash Offers: Cash on Delivery Nationwide & Free Delivery Over ৳${STORE_CONFIG.shipping.freeAbove}!`,
  announcement_bar_link: '/deals',

  store_phone: '+880 1700-000000',
  store_whatsapp: '+880 1700-000000',

  // Social Media Defaults
  social_facebook: '',
  social_instagram: '',
  social_youtube: '',
  social_tiktok: '',
  social_whatsapp: '',
  social_telegram: '',
  social_twitter: '',
  social_linkedin: '',

  homepage_flash_sale_enabled: true,
  homepage_flash_sale_title: '⚡ Flash Deals & Steals',
  homepage_flash_sale_end: null,
  homepage_featured_title: 'Handpicked For You',
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
  trust_badge_1_title: '100% Authentic',
  trust_badge_1_desc: 'Guaranteed genuine products',
  trust_badge_2_title: 'Fast Delivery',
  trust_badge_2_desc: '2–3 days nationwide',
  trust_badge_3_title: 'Quality Checked',
  trust_badge_3_desc: 'Inspected before dispatch',
  trust_badge_4_title: '24/7 Support',
  trust_badge_4_desc: 'Dedicated customer assistance',

  deals_hero_title: '🔥 Super Flash Deals & Discounts',
  deals_hero_subtitle: 'Limited stock, guaranteed authentic with fast delivery anywhere in Bangladesh.',
  deals_badge_text: 'EXCLUSIVE FLASH PROMOTIONS',
  deals_timer_hours: 6,

  explore_title: 'Explore Catalog',
  explore_departments_title: 'Explore Departments',
  explore_trending_tags: 'Wireless Earbuds, Smartwatch, Cotton T-Shirts, Sneakers, Backpack',
};
