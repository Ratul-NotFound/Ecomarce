import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function GET() {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const [couponsRes, rules] = await Promise.all([
      dbClient.from('coupons').select('*').order('created_at', { ascending: false }),
      getCouponProductRules(dbClient),
    ]);

    if (couponsRes.error) throw couponsRes.error;

    const coupons = (couponsRes.data || []).map((c: any) => ({
      ...c,
      applicable_product_ids: rules[c.code] || [],
    }));

    return NextResponse.json({ success: true, coupons });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const body = await request.json();
    const { code, type, value, min_order_amount, max_uses, expires_at, is_active, applicable_product_ids } = body;
    const cleanCode = code.trim().toUpperCase();

    const { data, error } = await dbClient
      .from('coupons')
      .insert({
        code: cleanCode,
        type,
        value: Number(value),
        min_order_amount: Number(min_order_amount) || 0,
        max_uses: max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single();

    if (error) throw error;

    // Save product rules if specified
    if (applicable_product_ids && Array.isArray(applicable_product_ids)) {
      const rules = await getCouponProductRules(dbClient);
      rules[cleanCode] = applicable_product_ids;
      await saveCouponProductRules(dbClient, rules);
    }

    return NextResponse.json({ success: true, coupon: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create coupon' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const body = await request.json();
    const { id, code, type, value, min_order_amount, max_uses, expires_at, is_active, applicable_product_ids } = body;

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

    const { data, error } = await dbClient
      .from('coupons')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update product restriction rules
    if (applicable_product_ids !== undefined && cleanCode) {
      const rules = await getCouponProductRules(dbClient);
      if (Array.isArray(applicable_product_ids) && applicable_product_ids.length > 0) {
        rules[cleanCode] = applicable_product_ids;
      } else {
        delete rules[cleanCode];
      }
      await saveCouponProductRules(dbClient, rules);
    }

    return NextResponse.json({ success: true, coupon: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const { error } = await dbClient.from('coupons').delete().eq('id', id);
    if (error) throw error;

    if (code) {
      const rules = await getCouponProductRules(dbClient);
      delete rules[code.toUpperCase()];
      await saveCouponProductRules(dbClient, rules);
    }

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete coupon' }, { status: 500 });
  }
}
