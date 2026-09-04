import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdminAuth } from '@/lib/auth/admin-guard';

// Helper to get or update coupon product rules from store_settings
async function getCouponProductRules(dbClient: any): Promise<Record<string, string[]>> {
  try {
    const { data } = await dbClient.from('store_settings').select('value').eq('key', 'coupon_product_rules').single();
    if (data && data.value) {
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }
  } catch {}
  return {};
}

async function saveCouponProductRules(dbClient: any, rules: Record<string, string[]>): Promise<void> {
  await dbClient.from('store_settings').upsert({
    key: 'coupon_product_rules',
    value: rules,
  });
}

// Helper to get or update deals page visibility rules from store_settings
async function getCouponDealsVisibility(dbClient: any): Promise<Record<string, boolean>> {
  try {
    const { data } = await dbClient.from('store_settings').select('value').eq('key', 'coupon_deals_visibility').single();
    if (data && data.value) {
      return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    }
  } catch {}
  return {};
}

async function saveCouponDealsVisibility(dbClient: any, visMap: Record<string, boolean>): Promise<void> {
  await dbClient.from('store_settings').upsert({
    key: 'coupon_deals_visibility',
    value: visMap,
  });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const [couponsRes, rules, visMap] = await Promise.all([
      dbClient.from('coupons').select('*').order('created_at', { ascending: false }),
      getCouponProductRules(dbClient),
      getCouponDealsVisibility(dbClient),
    ]);

    if (couponsRes.error) throw couponsRes.error;

    const coupons = (couponsRes.data || []).map((c: any) => ({
      ...c,
      show_on_deals_page: c.show_on_deals_page !== undefined ? Boolean(c.show_on_deals_page) : (visMap[c.code] !== false),
      applicable_product_ids: rules[c.code] || [],
    }));

    return NextResponse.json({ success: true, coupons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const body = await request.json();
    const { code, type, value, min_order_amount, max_uses, expires_at, is_active, applicable_product_ids, show_on_deals_page = true } = body;
    const cleanCode = code.trim().toUpperCase();

    // Insert payload
    const insertPayload: any = {
      code: cleanCode,
      type,
      value: Number(value),
      min_order_amount: Number(min_order_amount) || 0,
      max_uses: max_uses ? Number(max_uses) : null,
      expires_at: expires_at || null,
      is_active: is_active !== undefined ? is_active : true,
    };

    // Attempt to include show_on_deals_page column if table has it
    try {
      insertPayload.show_on_deals_page = Boolean(show_on_deals_page);
    } catch {}

    let { data, error } = await dbClient
      .from('coupons')
      .insert(insertPayload)
      .select()
      .single();

    // Fallback if show_on_deals_page column does not exist in DB yet
    if (error && error.message.includes('show_on_deals_page')) {
      delete insertPayload.show_on_deals_page;
      const retry = await dbClient.from('coupons').insert(insertPayload).select().single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }

    // Save deals shelf visibility map in store_settings
    const visMap = await getCouponDealsVisibility(dbClient);
    visMap[cleanCode] = Boolean(show_on_deals_page);
    await saveCouponDealsVisibility(dbClient, visMap);

    // Save product rules if specified
    if (applicable_product_ids && Array.isArray(applicable_product_ids)) {
      const rules = await getCouponProductRules(dbClient);
      rules[cleanCode] = applicable_product_ids;
      await saveCouponProductRules(dbClient, rules);
    }

    try {
      revalidatePath('/deals', 'page');
      revalidatePath('/checkout', 'page');
    } catch {}

    return NextResponse.json({
      success: true,
      coupon: {
        ...data,
        show_on_deals_page: Boolean(show_on_deals_page),
        applicable_product_ids: applicable_product_ids || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create coupon' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const body = await request.json();
    const { id, code, type, value, min_order_amount, max_uses, expires_at, is_active, applicable_product_ids, show_on_deals_page } = body;

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const cleanCode = code ? code.trim().toUpperCase() : undefined;
    const updatePayload: any = {};
    if (cleanCode !== undefined) updatePayload.code = cleanCode;
    if (type !== undefined) updatePayload.type = type;
    if (value !== undefined) updatePayload.value = Number(value);
    if (min_order_amount !== undefined) updatePayload.min_order_amount = Number(min_order_amount) || 0;
    if (max_uses !== undefined) updatePayload.max_uses = max_uses ? Number(max_uses) : null;
    if (expires_at !== undefined) updatePayload.expires_at = expires_at || null;
    if (is_active !== undefined) updatePayload.is_active = is_active;
    if (show_on_deals_page !== undefined) updatePayload.show_on_deals_page = Boolean(show_on_deals_page);

    let { data, error } = await dbClient
      .from('coupons')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    // Fallback if column does not exist yet
    if (error && error.message.includes('show_on_deals_page')) {
      delete updatePayload.show_on_deals_page;
      const retry = await dbClient.from('coupons').update(updatePayload).eq('id', id).select().single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }

    // Always keep store_settings visibility mapping updated
    const couponCode = cleanCode || data?.code;
    if (couponCode && show_on_deals_page !== undefined) {
      const visMap = await getCouponDealsVisibility(dbClient);
      visMap[couponCode] = Boolean(show_on_deals_page);
      await saveCouponDealsVisibility(dbClient, visMap);
    }

    // Update product restriction rules
    if (applicable_product_ids !== undefined && couponCode) {
      const rules = await getCouponProductRules(dbClient);
      if (Array.isArray(applicable_product_ids) && applicable_product_ids.length > 0) {
        rules[couponCode] = applicable_product_ids;
      } else {
        delete rules[couponCode];
      }
      await saveCouponProductRules(dbClient, rules);
    }

    try {
      revalidatePath('/deals', 'page');
      revalidatePath('/checkout', 'page');
    } catch {}

    return NextResponse.json({
      success: true,
      coupon: {
        ...data,
        show_on_deals_page: show_on_deals_page !== undefined ? Boolean(show_on_deals_page) : true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const { error } = await dbClient.from('coupons').delete().eq('id', id);
    if (error) throw error;

    if (code) {
      const clean = code.toUpperCase();
      const [rules, visMap] = await Promise.all([
        getCouponProductRules(dbClient),
        getCouponDealsVisibility(dbClient),
      ]);
      delete rules[clean];
      delete visMap[clean];
      await Promise.all([
        saveCouponProductRules(dbClient, rules),
        saveCouponDealsVisibility(dbClient, visMap),
      ]);
    }

    try {
      revalidatePath('/deals', 'page');
      revalidatePath('/checkout', 'page');
    } catch {}

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete coupon' }, { status: 500 });
  }
}
