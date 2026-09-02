import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CouponService } from '@/lib/services/CouponService';

export async function POST(request: NextRequest) {
  try {
    const { code, total } = await request.json();
    const supabase = await createClient();
    const couponService = new CouponService(supabase);

    const result = await couponService.validate(code, total || 0);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ valid: false, discount: 0, error: err.message }, { status: 400 });
  }
}
