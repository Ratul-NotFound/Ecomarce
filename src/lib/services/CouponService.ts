import { SupabaseClient } from '@supabase/supabase-js';
import type { Coupon, CouponValidationResult } from '@/types';

export class CouponService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async validate(code: string, orderTotal: number): Promise<CouponValidationResult> {
    if (!code || !code.trim()) {
      return { valid: false, discount: 0, error: 'Please enter a coupon code' };
    }

    const { data: coupon, error } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return { valid: false, discount: 0, error: 'Invalid or expired coupon code' };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, discount: 0, error: 'This coupon has expired' };
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { valid: false, discount: 0, error: 'This coupon has reached its usage limit' };
    }

    if (orderTotal < (coupon.min_order_amount || 0)) {
      return {
        valid: false,
        discount: 0,
        error: `Minimum order amount of ৳${coupon.min_order_amount} required to use this coupon`,
      };
    }

    let discount = 0;
    if (coupon.type === 'percent') {
      discount = Math.round((orderTotal * coupon.value) / 100);
    } else {
      discount = Math.min(coupon.value, orderTotal);
    }

    return {
      valid: true,
      discount,
      coupon: coupon as Coupon,
    };
  }

  async markUsed(code: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_coupon_usage', { coupon_code: code.trim().toUpperCase() });
    } catch {
      const { data: coupon } = await this.supabase
        .from('coupons')
        .select('used_count')
        .eq('code', code.trim().toUpperCase())
        .single();
      if (coupon) {
        await this.supabase
          .from('coupons')
          .update({ used_count: (coupon.used_count || 0) + 1 })
          .eq('code', code.trim().toUpperCase());
      }
    }
  }
}
