import { SupabaseClient } from '@supabase/supabase-js';
import type { Coupon, CouponValidationResult } from '@/types';

export interface CartValidationItem {
  product_id: string;
  price: number;
  quantity: number;
}

export class CouponService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async validate(
    code: string,
    orderTotal: number,
    items?: CartValidationItem[]
  ): Promise<CouponValidationResult & { applicableProductIds?: string[] }> {
    if (!code || !code.trim()) {
      return { valid: false, discount: 0, error: 'Please enter a coupon code' };
    }

    const cleanCode = code.trim().toUpperCase();

    const { data: coupon, error } = await this.supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return { valid: false, discount: 0, error: 'Invalid or inactive coupon code' };
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

    // Check if coupon is restricted to specific products
    let eligibleProductIds: string[] | null = null;
    try {
      const { data: rulesRow } = await this.supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'coupon_product_rules')
        .single();

      if (rulesRow?.value) {
        const rules = typeof rulesRow.value === 'string' ? JSON.parse(rulesRow.value) : rulesRow.value;
        if (rules && Array.isArray(rules[cleanCode]) && rules[cleanCode].length > 0) {
          eligibleProductIds = rules[cleanCode];
        }
      }
    } catch {}

    let discount = 0;

    // Granular product-specific calculation
    if (eligibleProductIds && eligibleProductIds.length > 0) {
      if (!items || items.length === 0) {
        return {
          valid: false,
          discount: 0,
          error: 'This coupon applies to specific products only.',
        };
      }

      const matchingItems = items.filter(i => eligibleProductIds!.includes(i.product_id));
      if (matchingItems.length === 0) {
        return {
          valid: false,
          discount: 0,
          error: 'This coupon is only valid for specific products that are not currently in your cart.',
        };
      }

      const eligibleTotal = matchingItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      if (coupon.type === 'percent') {
        discount = Math.round((eligibleTotal * coupon.value) / 100);
      } else {
        discount = Math.min(coupon.value, eligibleTotal);
      }

      return {
        valid: true,
        discount,
        coupon: coupon as Coupon,
        applicableProductIds: eligibleProductIds,
      };
    }

    // General coupon applying to entire order
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
    const cleanCode = code.trim().toUpperCase();
    try {
      // Prefer atomic RPC for true database-level atomicity
      const { error: rpcError } = await this.supabase.rpc('increment_coupon_usage', { coupon_code: cleanCode });
      if (!rpcError) return;
    } catch {}

    // Fallback: atomic conditional UPDATE (WHERE used_count < max_uses OR max_uses IS NULL)
    // This prevents race-condition double-spending without a separate read
    const { data: coupon } = await this.supabase
      .from('coupons')
      .select('id, used_count, max_uses')
      .eq('code', cleanCode)
      .single();

    if (coupon) {
      // Conditional update: only increment if still under limit
      await this.supabase
        .from('coupons')
        .update({ used_count: (coupon.used_count || 0) + 1 })
        .eq('code', cleanCode)
        .or(`max_uses.is.null,used_count.lt.${coupon.max_uses ?? 999999}`);
    }
  }
}
