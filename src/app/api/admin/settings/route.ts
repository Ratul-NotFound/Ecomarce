import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { invalidateStoreSettingsCache } from '@/lib/store-settings';

/**
 * Strictly whitelisted settings keys.
 * Only keys in this set can be written via the admin settings API.
 * Internal system keys (coupon_product_rules, coupon_deals_visibility, etc.)
 * are NOT in this list and must be managed by their own dedicated endpoints.
 */
const ALLOWED_SETTING_KEYS = new Set([
  'store_name', 'store_tagline', 'contact_email', 'contact_phone', 'contact_address',
  'store_phone', 'store_whatsapp',
  'shipping_inside_dhaka', 'shipping_outside_dhaka', 'free_shipping_above',
  'primary_color',
  'announcement_bar_enabled', 'announcement_bar_text', 'announcement_bar_link',
  'homepage_flash_sale_enabled', 'homepage_flash_sale_title', 'homepage_flash_sale_end',
  'flash_sale_end_time',
  'homepage_featured_title', 'homepage_new_arrivals_title',
  'homepage_sections_order', 'homepage_section_visibility',
  'trust_badge_1_title', 'trust_badge_1_desc',
  'trust_badge_2_title', 'trust_badge_2_desc',
  'trust_badge_3_title', 'trust_badge_3_desc',
  'trust_badge_4_title', 'trust_badge_4_desc',
  'deals_hero_title', 'deals_hero_subtitle', 'deals_badge_text', 'deals_timer_hours',
  'deals_banner_ids',
  'explore_title', 'explore_departments_title', 'explore_trending_tags',
  'social_facebook', 'social_instagram', 'social_youtube', 'social_tiktok',
  'social_whatsapp', 'social_telegram', 'social_twitter', 'social_linkedin',
  'payment_methods', 'bkash_number', 'nagad_number',
  'telegram_bot_token', 'telegram_chat_id', 'telegram_orders_topic_id', 'telegram_messages_topic_id',
]);

const SENSITIVE_SUPER_ADMIN_KEYS = new Set([
  'payment_methods', 'bkash_number', 'nagad_number',
  'telegram_bot_token', 'telegram_chat_id', 'telegram_orders_topic_id', 'telegram_messages_topic_id',
]);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }

    // Moderators cannot access settings
    if (auth.effectiveRole === 'moderator') {
      return NextResponse.json({ error: 'Forbidden: Moderators cannot access store settings' }, { status: 403 });
    }

    const dbClient = auth.dbClient;

    const { data, error } = await dbClient.from('store_settings').select('*');
    if (error) throw error;

    const settingsMap: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      // Hide sensitive bot token from non-super admins
      if (auth.effectiveRole !== 'super_admin' && SENSITIVE_SUPER_ADMIN_KEYS.has(row.key)) {
        if (row.key === 'telegram_bot_token') {
          settingsMap[row.key] = row.value ? '••••••••••••••••' : '';
          return;
        }
      }
      settingsMap[row.key] = row.value;
    });

    return NextResponse.json({ success: true, settings: settingsMap, role: auth.effectiveRole });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }

    // Moderators cannot modify settings
    if (auth.effectiveRole === 'moderator') {
      return NextResponse.json({ error: 'Forbidden: Moderators cannot modify store settings' }, { status: 403 });
    }

    const dbClient = auth.dbClient;

    const body = await request.json();
    const entries = Object.entries(body);

    // Security: Only allow known, whitelisted setting keys
    const rejectedKeys: string[] = [];
    const sensitiveKeysAttempted: string[] = [];

    for (const [key] of entries) {
      if (!ALLOWED_SETTING_KEYS.has(key)) {
        rejectedKeys.push(key);
      }
      if (SENSITIVE_SUPER_ADMIN_KEYS.has(key) && auth.effectiveRole !== 'super_admin') {
        sensitiveKeysAttempted.push(key);
      }
    }

    if (rejectedKeys.length > 0) {
      return NextResponse.json(
        { error: `Unrecognized setting key(s): ${rejectedKeys.join(', ')}. Only known settings can be modified.` },
        { status: 400 }
      );
    }

    // Non-super-admins cannot touch payment gateway numbers or Telegram bot configurations
    if (sensitiveKeysAttempted.length > 0) {
      return NextResponse.json(
        { error: `Forbidden: Modifying sensitive configurations (${sensitiveKeysAttempted.join(', ')}) requires Super Admin privileges` },
        { status: 403 }
      );
    }

    for (const [key, value] of entries) {
      await dbClient.from('store_settings').upsert({
        key,
        value,
      });
    }

    // If flash sale end time is updated, ensure both keys stay synced
    const flashEnd = body.flash_sale_end_time || body.homepage_flash_sale_end;
    if (flashEnd !== undefined) {
      await dbClient.from('store_settings').upsert({
        key: 'flash_sale_end_time',
        value: flashEnd,
      });
      await dbClient.from('store_settings').upsert({
        key: 'homepage_flash_sale_end',
        value: flashEnd,
      });

      // Synchronize all active flash sale products to the same target date
      if (flashEnd) {
        await dbClient
          .from('products')
          .update({ flash_sale_ends_at: flashEnd })
          .eq('is_flash_sale', true);
      }
    }

    // Immediately bust the module-level TTL cache so storefront picks up new values right away
    try {
      invalidateStoreSettingsCache();
    } catch {}

    // Invalidate Next.js page cache so Homepage and Deals page rerender instantly
    try {
      revalidatePath('/', 'page');
      revalidatePath('/deals', 'page');
      revalidatePath('/products', 'page');
    } catch {}

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save settings' }, { status: 500 });
  }
}
