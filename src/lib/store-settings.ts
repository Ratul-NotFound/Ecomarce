// src/lib/store-settings.ts
// ============================================================
// Server-side settings layer connecting all frontend pages
// to Supabase store_settings. (Server Components & API routes only)
// ============================================================

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import {
  type StorefrontCustomSettings,
  DEFAULT_STOREFRONT_SETTINGS,
  DEFAULT_HOMEPAGE_SECTIONS,
} from '@/lib/store-settings-shared';

export * from '@/lib/store-settings-shared';

// ── Module-level TTL cache (60 seconds) ──────────────────────
// Prevents a full DB round-trip on every ISR revalidation cycle.
// Shared across all concurrent RSC renders on the same server instance.
let _settingsCache: StorefrontCustomSettings | null = null;
let _settingsCacheExpiry = 0;

async function _fetchStoreSettings(): Promise<StorefrontCustomSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('store_settings').select('*');
    if (!data || data.length === 0) {
      return DEFAULT_STOREFRONT_SETTINGS;
    }

    const settingsMap: Record<string, any> = {};
    data.forEach(row => {
      settingsMap[row.key] = row.value;
    });

    let sectionsOrder = DEFAULT_HOMEPAGE_SECTIONS;
    if (settingsMap['homepage_sections_order']) {
      try {
        const parsed = typeof settingsMap['homepage_sections_order'] === 'string'
          ? JSON.parse(settingsMap['homepage_sections_order'])
          : settingsMap['homepage_sections_order'];
        if (Array.isArray(parsed) && parsed.length > 0) {
          sectionsOrder = parsed;
        }
      } catch {}
    }

    let sectionVisibility = DEFAULT_STOREFRONT_SETTINGS.homepage_section_visibility;
    if (settingsMap['homepage_section_visibility']) {
      try {
        const parsed = typeof settingsMap['homepage_section_visibility'] === 'string'
          ? JSON.parse(settingsMap['homepage_section_visibility'])
          : settingsMap['homepage_section_visibility'];
        if (parsed && typeof parsed === 'object') {
          sectionVisibility = { ...sectionVisibility, ...parsed };
        }
      } catch {}
    }

    const freeAbove = Number(settingsMap['free_shipping_above']) || DEFAULT_STOREFRONT_SETTINGS.free_shipping_above;
    let announcementText = settingsMap['announcement_bar_text'] || `⚡ Super Flash Offers: Cash on Delivery Nationwide & Free Delivery Over ৳${freeAbove}!`;
    // If text references legacy ৳1,500 and free shipping threshold is different, dynamically update it
    if (announcementText.includes('৳1,500') && freeAbove !== 1500) {
      announcementText = announcementText.replace('৳1,500', `৳${freeAbove.toLocaleString()}`);
    }

    return {
      store_name: settingsMap['store_name'] || DEFAULT_STOREFRONT_SETTINGS.store_name,
      store_tagline: settingsMap['store_tagline'] || DEFAULT_STOREFRONT_SETTINGS.store_tagline,
      contact_email: settingsMap['contact_email'] || DEFAULT_STOREFRONT_SETTINGS.contact_email,
      contact_phone: settingsMap['contact_phone'] || settingsMap['store_phone'] || DEFAULT_STOREFRONT_SETTINGS.contact_phone,
      contact_address: settingsMap['contact_address'] || DEFAULT_STOREFRONT_SETTINGS.contact_address,

      shipping_inside_dhaka: Number(settingsMap['shipping_inside_dhaka']) || DEFAULT_STOREFRONT_SETTINGS.shipping_inside_dhaka,
      shipping_outside_dhaka: Number(settingsMap['shipping_outside_dhaka']) || DEFAULT_STOREFRONT_SETTINGS.shipping_outside_dhaka,
      free_shipping_above: freeAbove,

      primary_color: settingsMap['primary_color'] || DEFAULT_STOREFRONT_SETTINGS.primary_color,

      announcement_bar_enabled: settingsMap['announcement_bar_enabled'] !== undefined
        ? String(settingsMap['announcement_bar_enabled']) === 'true' || settingsMap['announcement_bar_enabled'] === true
        : DEFAULT_STOREFRONT_SETTINGS.announcement_bar_enabled,
      announcement_bar_text: announcementText,
      announcement_bar_link: settingsMap['announcement_bar_link'] || DEFAULT_STOREFRONT_SETTINGS.announcement_bar_link,

      store_phone: settingsMap['store_phone'] || settingsMap['contact_phone'] || DEFAULT_STOREFRONT_SETTINGS.store_phone,
      store_whatsapp: settingsMap['store_whatsapp'] || DEFAULT_STOREFRONT_SETTINGS.store_whatsapp,

      homepage_flash_sale_enabled: settingsMap['homepage_flash_sale_enabled'] !== undefined
        ? String(settingsMap['homepage_flash_sale_enabled']) === 'true' || settingsMap['homepage_flash_sale_enabled'] === true
        : DEFAULT_STOREFRONT_SETTINGS.homepage_flash_sale_enabled,
      homepage_flash_sale_title: settingsMap['homepage_flash_sale_title'] || DEFAULT_STOREFRONT_SETTINGS.homepage_flash_sale_title,
      homepage_flash_sale_end: settingsMap['homepage_flash_sale_end'] || settingsMap['flash_sale_end_time'] || DEFAULT_STOREFRONT_SETTINGS.homepage_flash_sale_end,
      homepage_featured_title: settingsMap['homepage_featured_title'] || DEFAULT_STOREFRONT_SETTINGS.homepage_featured_title,
      homepage_new_arrivals_title: settingsMap['homepage_new_arrivals_title'] || DEFAULT_STOREFRONT_SETTINGS.homepage_new_arrivals_title,
      homepage_sections_order: sectionsOrder,
      homepage_section_visibility: sectionVisibility,

      trust_badge_1_title: settingsMap['trust_badge_1_title'] || DEFAULT_STOREFRONT_SETTINGS.trust_badge_1_title,
      trust_badge_1_desc: settingsMap['trust_badge_1_desc'] || DEFAULT_STOREFRONT_SETTINGS.trust_badge_1_desc,
      trust_badge_2_title: settingsMap['trust_badge_2_title'] || DEFAULT_STOREFRONT_SETTINGS.trust_badge_2_title,
      trust_badge_2_desc: settingsMap['trust_badge_2_desc'] || DEFAULT_STOREFRONT_SETTINGS.trust_badge_2_desc,
      trust_badge_3_title: settingsMap['trust_badge_3_title'] || DEFAULT_STOREFRONT_SETTINGS.trust_badge_3_title,
      trust_badge_3_desc: settingsMap['trust_badge_3_desc'] || DEFAULT_STOREFRONT_SETTINGS.trust_badge_3_desc,
      trust_badge_4_title: settingsMap['trust_badge_4_title'] || DEFAULT_STOREFRONT_SETTINGS.trust_badge_4_title,
      trust_badge_4_desc: settingsMap['trust_badge_4_desc'] || DEFAULT_STOREFRONT_SETTINGS.trust_badge_4_desc,

      deals_hero_title: settingsMap['deals_hero_title'] || DEFAULT_STOREFRONT_SETTINGS.deals_hero_title,
      deals_hero_subtitle: settingsMap['deals_hero_subtitle'] || DEFAULT_STOREFRONT_SETTINGS.deals_hero_subtitle,
      deals_badge_text: settingsMap['deals_badge_text'] || DEFAULT_STOREFRONT_SETTINGS.deals_badge_text,
      deals_timer_hours: Number(settingsMap['deals_timer_hours']) || DEFAULT_STOREFRONT_SETTINGS.deals_timer_hours,
      coupon_deals_visibility: settingsMap['coupon_deals_visibility'],
      deals_banner_ids: settingsMap['deals_banner_ids'],

      explore_title: settingsMap['explore_title'] || DEFAULT_STOREFRONT_SETTINGS.explore_title,
      explore_departments_title: settingsMap['explore_departments_title'] || DEFAULT_STOREFRONT_SETTINGS.explore_departments_title,
      explore_trending_tags: settingsMap['explore_trending_tags'] || DEFAULT_STOREFRONT_SETTINGS.explore_trending_tags,

      social_facebook: settingsMap['social_facebook'] ?? DEFAULT_STOREFRONT_SETTINGS.social_facebook,
      social_instagram: settingsMap['social_instagram'] ?? DEFAULT_STOREFRONT_SETTINGS.social_instagram,
      social_youtube: settingsMap['social_youtube'] ?? DEFAULT_STOREFRONT_SETTINGS.social_youtube,
      social_tiktok: settingsMap['social_tiktok'] ?? DEFAULT_STOREFRONT_SETTINGS.social_tiktok,
      social_whatsapp: settingsMap['social_whatsapp'] ?? DEFAULT_STOREFRONT_SETTINGS.social_whatsapp,
      social_telegram: settingsMap['social_telegram'] ?? DEFAULT_STOREFRONT_SETTINGS.social_telegram,
      social_twitter: settingsMap['social_twitter'] ?? DEFAULT_STOREFRONT_SETTINGS.social_twitter,
      social_linkedin: settingsMap['social_linkedin'] ?? DEFAULT_STOREFRONT_SETTINGS.social_linkedin,
    };
  } catch {
    return DEFAULT_STOREFRONT_SETTINGS;
  }
}

// ── React cache() wrapper ────────────────────────────────────
// Deduplicates concurrent RSC calls within the SAME request.
// e.g. StoreLayout + page.tsx both call getStoreSettings() but
// only ONE DB round-trip fires per request thanks to cache().
export const getStoreSettings = cache(async (): Promise<StorefrontCustomSettings> => {
  const now = Date.now();
  if (_settingsCache && now < _settingsCacheExpiry) {
    return _settingsCache;
  }
  const fresh = await _fetchStoreSettings();
  _settingsCache = fresh;
  _settingsCacheExpiry = now + 60_000; // 60-second TTL
  return fresh;
});
