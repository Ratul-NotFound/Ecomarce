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

      // Synchronize parent product stock with sum of all variants
      try {
        const { data: allVariants } = await this.supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('product_id', productId);
        if (allVariants) {
          const totalStock = allVariants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
          await this.supabase
            .from('products')
            .update({ stock_quantity: totalStock })
            .eq('id', productId);
        }
      } catch (err) {
        console.warn('Failed to sync parent product stock with variants:', err);
      }

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

  /**
   * Restores inventory and decrements total_sold when an order is cancelled or returned.
   */
  async restoreForOrder(
    orderId: string,
    items: Array<{ productId: string; variantId?: string; quantity: number }>,
    adminId?: string
  ): Promise<void> {
    for (const item of items) {
      await this.adjustStock({
        productId: item.productId,
        variantId: item.variantId,
        delta: item.quantity,
        changeType: 'return',
        referenceId: orderId,
        notes: `Restored for Cancelled/Returned Order #${orderId}`,
        adminId,
      });

      // Decrement product total_sold accurately
      try {
        const { data: p } = await this.supabase
          .from('products')
          .select('total_sold')
          .eq('id', item.productId)
          .single();
        const currentSold = Number(p?.total_sold) || 0;
        await this.supabase
          .from('products')
          .update({ total_sold: Math.max(0, currentSold - item.quantity) })
          .eq('id', item.productId);
      } catch (err) {
        console.warn('Failed to decrement total_sold for product on return:', item.productId, err);
      }
    }
  }

  async createVariant(params: {
    productId: string;
    sku: string;
    size?: string | null;
    color?: string | null;
    material?: string | null;
    stockQuantity: number;
    costPrice?: number | null;
    regularPrice?: number | null;
    sellingPrice?: number | null;
    adminId?: string;
  }) {
    const { productId, sku, size, color, material, stockQuantity, costPrice, regularPrice, sellingPrice, adminId } = params;

    const { data: product } = await this.supabase
      .from('products')
      .select('base_price, sale_price, tags, has_variants, stock_quantity')
      .eq('id', productId)
      .single();

    if (!product) throw new Error('Product not found');

    const baseEff = Number(product.sale_price ?? product.base_price ?? 0);
    const vSale = Number(sellingPrice ?? baseEff);
    const vReg = Number(regularPrice ?? product.base_price ?? 0);
    const vCost = Number(costPrice ?? 0);
    const priceModifier = vSale - baseEff;
    const cleanSku = sku.trim().toUpperCase();

    // Check SKU collision
    const { data: existingSku } = await this.supabase
      .from('product_variants')
      .select('id')
      .eq('sku', cleanSku)
      .maybeSingle();

    if (existingSku) {
      throw new Error(`SKU "${cleanSku}" already exists. Please choose a unique SKU.`);
    }

    const { data: newVariant, error: insertErr } = await this.supabase
      .from('product_variants')
      .insert({
        product_id: productId,
        sku: cleanSku,
        size: size ? size.trim() : null,
        color: color ? color.trim() : null,
        material: material ? material.trim() : null,
        price_modifier: priceModifier,
        stock_quantity: Math.max(0, stockQuantity),
        images: [],
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    // Sync tags
    const currentTags: string[] = Array.isArray(product.tags) ? [...product.tags] : [];
    const filteredTags = currentTags.filter(t => {
      const lower = t.toLowerCase();
      return (
        !lower.startsWith(`vcost:${cleanSku.toLowerCase()}:`) &&
        !lower.startsWith(`vreg:${cleanSku.toLowerCase()}:`) &&
        !lower.startsWith(`vsale:${cleanSku.toLowerCase()}:`)
      );
    });

    if (vCost > 0) filteredTags.push(`vcost:${cleanSku}:${vCost}`);
    if (vReg > 0) filteredTags.push(`vreg:${cleanSku}:${vReg}`);
    if (vSale > 0) filteredTags.push(`vsale:${cleanSku}:${vSale}`);

    // Update parent product
    const { data: allVariants } = await this.supabase
      .from('product_variants')
      .select('stock_quantity')
      .eq('product_id', productId);

    const totalStock = (allVariants || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

    await this.supabase
      .from('products')
      .update({
        tags: filteredTags,
        has_variants: true,
        stock_quantity: totalStock,
      })
      .eq('id', productId);

    // Audit log
    await this.supabase.from('inventory_logs').insert({
      product_id: productId,
      variant_id: newVariant.id,
      change_type: 'restock',
      quantity_before: 0,
      quantity_change: Math.max(0, stockQuantity),
      quantity_after: Math.max(0, stockQuantity),
      notes: `Variant created (${cleanSku})`,
      created_by: adminId || null,
    });

    return newVariant;
  }

  async updateVariant(params: {
    variantId: string;
    productId: string;
    sku?: string;
    size?: string | null;
    color?: string | null;
    material?: string | null;
    stockQuantity?: number;
    costPrice?: number | null;
    regularPrice?: number | null;
    sellingPrice?: number | null;
    adminId?: string;
  }) {
    const { variantId, productId, sku, size, color, material, stockQuantity, costPrice, regularPrice, sellingPrice, adminId } = params;

    const { data: existing } = await this.supabase
      .from('product_variants')
      .select('*')
      .eq('id', variantId)
      .single();

    if (!existing) throw new Error('Variant not found');

    const { data: product } = await this.supabase
      .from('products')
      .select('base_price, sale_price, tags')
      .eq('id', productId)
      .single();

    if (!product) throw new Error('Product not found');

    const baseEff = Number(product.sale_price ?? product.base_price ?? 0);
    const cleanSku = (sku || existing.sku).trim().toUpperCase();

    // Check SKU if changed
    if (cleanSku !== existing.sku) {
      const { data: dup } = await this.supabase
        .from('product_variants')
        .select('id')
        .eq('sku', cleanSku)
        .neq('id', variantId)
        .maybeSingle();

      if (dup) throw new Error(`SKU "${cleanSku}" already exists.`);
    }

    const updates: any = {};
    if (sku !== undefined) updates.sku = cleanSku;
    if (size !== undefined) updates.size = size ? size.trim() : null;
    if (color !== undefined) updates.color = color ? color.trim() : null;
    if (material !== undefined) updates.material = material ? material.trim() : null;

    if (sellingPrice !== undefined && sellingPrice !== null) {
      updates.price_modifier = Number(sellingPrice) - baseEff;
    }

    const qtyBefore = existing.stock_quantity;
    let qtyAfter = existing.stock_quantity;

    if (stockQuantity !== undefined && stockQuantity !== null) {
      qtyAfter = Math.max(0, stockQuantity);
      updates.stock_quantity = qtyAfter;
    }

    const { error: updateErr } = await this.supabase
      .from('product_variants')
      .update(updates)
      .eq('id', variantId);

    if (updateErr) throw updateErr;

    // Sync tags
    const currentTags: string[] = Array.isArray(product.tags) ? [...product.tags] : [];
    const oldSku = existing.sku.toLowerCase();
    const newSkuLower = cleanSku.toLowerCase();

    const filteredTags = currentTags.filter(t => {
      const lower = t.toLowerCase();
      return (
        !lower.startsWith(`vcost:${oldSku}:`) &&
        !lower.startsWith(`vreg:${oldSku}:`) &&
        !lower.startsWith(`vsale:${oldSku}:`) &&
        !lower.startsWith(`vcost:${newSkuLower}:`) &&
        !lower.startsWith(`vreg:${newSkuLower}:`) &&
        !lower.startsWith(`vsale:${newSkuLower}:`)
      );
    });

    const vCost = costPrice !== undefined && costPrice !== null ? Number(costPrice) : 0;
    const vReg = regularPrice !== undefined && regularPrice !== null ? Number(regularPrice) : 0;
    const vSale = sellingPrice !== undefined && sellingPrice !== null ? Number(sellingPrice) : 0;

    if (vCost > 0) filteredTags.push(`vcost:${cleanSku}:${vCost}`);
    if (vReg > 0) filteredTags.push(`vreg:${cleanSku}:${vReg}`);
    if (vSale > 0) filteredTags.push(`vsale:${cleanSku}:${vSale}`);

    // Recalculate parent product total stock
    const { data: allVariants } = await this.supabase
      .from('product_variants')
      .select('stock_quantity')
      .eq('product_id', productId);

    const totalStock = (allVariants || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

    await this.supabase
      .from('products')
      .update({
        tags: filteredTags,
        stock_quantity: totalStock,
      })
      .eq('id', productId);

    if (qtyBefore !== qtyAfter) {
      await this.supabase.from('inventory_logs').insert({
        product_id: productId,
        variant_id: variantId,
        change_type: qtyAfter > qtyBefore ? 'restock' : 'adjustment',
        quantity_before: qtyBefore,
        quantity_change: qtyAfter - qtyBefore,
        quantity_after: qtyAfter,
        notes: `Variant stock adjusted (${cleanSku})`,
        created_by: adminId || null,
      });
    }

    return { success: true };
  }

  async deleteVariant(params: {
    variantId: string;
    productId: string;
    adminId?: string;
  }) {
    const { variantId, productId, adminId } = params;

    const { data: variant } = await this.supabase
      .from('product_variants')
      .select('*')
      .eq('id', variantId)
      .single();

    if (!variant) throw new Error('Variant not found');

    const { data: product } = await this.supabase
      .from('products')
      .select('tags, stock_quantity')
      .eq('id', productId)
      .single();

    const { error: delErr } = await this.supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId);

    if (delErr) throw delErr;

    const cleanSkuLower = (variant.sku || '').toLowerCase();
    const currentTags: string[] = Array.isArray(product?.tags) ? [...product.tags] : [];
    const filteredTags = currentTags.filter(t => {
      const lower = t.toLowerCase();
      return (
        !lower.startsWith(`vcost:${cleanSkuLower}:`) &&
        !lower.startsWith(`vreg:${cleanSkuLower}:`) &&
        !lower.startsWith(`vsale:${cleanSkuLower}:`)
      );
    });

    const { data: remaining } = await this.supabase
      .from('product_variants')
      .select('stock_quantity')
      .eq('product_id', productId);

    const hasRemaining = (remaining || []).length > 0;
    const totalStock = (remaining || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);

    await this.supabase
      .from('products')
      .update({
        tags: filteredTags,
        has_variants: hasRemaining,
        stock_quantity: hasRemaining ? totalStock : (product?.stock_quantity || 0),
      })
      .eq('id', productId);

    await this.supabase.from('inventory_logs').insert({
      product_id: productId,
      variant_id: variantId,
      change_type: 'adjustment',
      quantity_before: variant.stock_quantity,
      quantity_change: -variant.stock_quantity,
      quantity_after: 0,
      notes: `Variant deleted (${variant.sku})`,
      created_by: adminId || null,
    });

    return { success: true };
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
