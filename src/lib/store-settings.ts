// src/lib/store-settings.ts
// ============================================================
// Server-side settings layer connecting all frontend pages
// to Supabase store_settings. (Server Components & API routes only)
// ============================================================

import { createClient } from '@/lib/supabase/server';
import {
  type StorefrontCustomSettings,
  DEFAULT_STOREFRONT_SETTINGS,
  DEFAULT_HOMEPAGE_SECTIONS,
} from '@/lib/store-settings-shared';

export * from '@/lib/store-settings-shared';

export async function getStoreSettings(): Promise<StorefrontCustomSettings> {
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

    return {
      announcement_bar_enabled: settingsMap['announcement_bar_enabled'] !== undefined
        ? String(settingsMap['announcement_bar_enabled']) === 'true' || settingsMap['announcement_bar_enabled'] === true
        : DEFAULT_STOREFRONT_SETTINGS.announcement_bar_enabled,
      announcement_bar_text: settingsMap['announcement_bar_text'] || DEFAULT_STOREFRONT_SETTINGS.announcement_bar_text,
      announcement_bar_link: settingsMap['announcement_bar_link'] || DEFAULT_STOREFRONT_SETTINGS.announcement_bar_link,

      store_phone: settingsMap['store_phone'] || DEFAULT_STOREFRONT_SETTINGS.store_phone,
      store_whatsapp: settingsMap['store_whatsapp'] || DEFAULT_STOREFRONT_SETTINGS.store_whatsapp,

      homepage_flash_sale_enabled: settingsMap['homepage_flash_sale_enabled'] !== undefined
        ? String(settingsMap['homepage_flash_sale_enabled']) === 'true' || settingsMap['homepage_flash_sale_enabled'] === true
        : DEFAULT_STOREFRONT_SETTINGS.homepage_flash_sale_enabled,
      homepage_flash_sale_title: settingsMap['homepage_flash_sale_title'] || DEFAULT_STOREFRONT_SETTINGS.homepage_flash_sale_title,
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

      explore_title: settingsMap['explore_title'] || DEFAULT_STOREFRONT_SETTINGS.explore_title,
      explore_departments_title: settingsMap['explore_departments_title'] || DEFAULT_STOREFRONT_SETTINGS.explore_departments_title,
      explore_trending_tags: settingsMap['explore_trending_tags'] || DEFAULT_STOREFRONT_SETTINGS.explore_trending_tags,
    };
  } catch {
    return DEFAULT_STOREFRONT_SETTINGS;
  }
}
