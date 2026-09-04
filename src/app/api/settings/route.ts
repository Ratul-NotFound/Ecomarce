import { NextResponse } from 'next/server';
import { getStoreSettings } from '@/lib/store-settings';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMergedPaymentSettings } from '@/lib/utils/payment-config';

export async function GET() {
  try {
    const storefrontSettings = await getStoreSettings();

    // Fetch payment methods securely
    let dbClient = await createClient();
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        dbClient = createAdminClient();
      } catch {}
    }

    const { data: rawPaymentData } = await dbClient
      .from('store_settings')
      .select('key, value')
      .in('key', ['payment_methods', 'bkash_number', 'nagad_number']);

    const settingsMap: Record<string, any> = {};
    (rawPaymentData || []).forEach(r => {
      settingsMap[r.key] = r.value;
    });

    let paymentSettings = getMergedPaymentSettings(settingsMap['payment_methods']);
    if (!settingsMap['payment_methods']) {
      if (settingsMap['bkash_number']) paymentSettings.bkash.number = settingsMap['bkash_number'];
      if (settingsMap['nagad_number']) paymentSettings.nagad.number = settingsMap['nagad_number'];
    }

    return NextResponse.json({
      success: true,
      settings: {
        store_name: storefrontSettings.store_name,
        store_tagline: storefrontSettings.store_tagline,
        contact_email: storefrontSettings.contact_email,
        contact_phone: storefrontSettings.contact_phone,
        contact_address: storefrontSettings.contact_address,
        shipping_inside_dhaka: storefrontSettings.shipping_inside_dhaka,
        shipping_outside_dhaka: storefrontSettings.shipping_outside_dhaka,
        free_shipping_above: storefrontSettings.free_shipping_above,
        announcement_bar_enabled: storefrontSettings.announcement_bar_enabled,
        announcement_bar_text: storefrontSettings.announcement_bar_text,
        announcement_bar_link: storefrontSettings.announcement_bar_link,
        primary_color: storefrontSettings.primary_color,
        deals_timer_hours: storefrontSettings.deals_timer_hours,
        payment_methods: paymentSettings,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retrieve store settings' }, { status: 500 });
  }
}
