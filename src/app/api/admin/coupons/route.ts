import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const body = await request.json();
    const { code, type, value, min_order_amount, max_uses, expires_at } = body;

    const { data, error } = await dbClient
      .from('coupons')
      .insert({
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        min_order_amount: Number(min_order_amount) || 0,
        max_uses: max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, coupon: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create coupon' }, { status: 500 });
  }
}
