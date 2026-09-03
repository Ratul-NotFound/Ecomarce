import { SupabaseClient } from '@supabase/supabase-js';
import type { InventoryChangeType } from '@/types';

export class InventoryService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async adjustStock(params: {
    productId: string;
    variantId?: string;
    delta: number;
    changeType: InventoryChangeType;
    referenceId?: string;
    notes?: string;
    adminId?: string;
  }): Promise<void> {
    const { productId, variantId, delta, changeType, referenceId, notes, adminId } = params;

    if (variantId) {
      const { data: variant } = await this.supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', variantId)
        .single();

      if (!variant) throw new Error('Variant not found');
      const before = variant.stock_quantity;
      const after = Math.max(0, before + delta);

      await this.supabase
        .from('product_variants')
        .update({ stock_quantity: after })
        .eq('id', variantId);

      await this.supabase.from('inventory_logs').insert({
        product_id: productId,
        variant_id: variantId,
        change_type: changeType,
        quantity_before: before,
        quantity_change: delta,
        quantity_after: after,
        reference_id: referenceId || null,
        notes: notes || null,
        created_by: adminId || null,
      });
    } else {
      const { data: product } = await this.supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();

      if (!product) throw new Error('Product not found');
      const before = product.stock_quantity;
      const after = Math.max(0, before + delta);

      await this.supabase
        .from('products')
        .update({ stock_quantity: after })
        .eq('id', productId);

      await this.supabase.from('inventory_logs').insert({
        product_id: productId,
        variant_id: null,
        change_type: changeType,
        quantity_before: before,
        quantity_change: delta,
        quantity_after: after,
        reference_id: referenceId || null,
        notes: notes || null,
        created_by: adminId || null,
      });
    }
  }

  async deductForOrder(
    orderId: string,
    items: Array<{ productId: string; variantId?: string; quantity: number }>,
    adminId?: string
  ): Promise<void> {
    for (const item of items) {
      await this.adjustStock({
        productId: item.productId,
        variantId: item.variantId,
        delta: -item.quantity,
        changeType: 'sale',
        referenceId: orderId,
        notes: `Deducted for Order #${orderId}`,
        adminId,
      });

      // Increment product total_sold accurately
      try {
        const { data: p } = await this.supabase
          .from('products')
          .select('total_sold')
          .eq('id', item.productId)
          .single();
        const currentSold = Number(p?.total_sold) || 0;
        await this.supabase
          .from('products')
          .update({ total_sold: currentSold + item.quantity })
          .eq('id', item.productId);
      } catch (err) {
        console.warn('Failed to increment total_sold for product:', item.productId, err);
      }
    }
  }

  async getLogs(productId?: string, limit = 50) {
    let query = this.supabase
      .from('inventory_logs')
      .select('*, product:products(name_en, sku)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data } = await query;
    return data || [];
  }
}
