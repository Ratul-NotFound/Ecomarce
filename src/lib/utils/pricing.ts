import type { Product } from '@/types';

/**
 * Extracts the cost price (buying price) of a product.
 * Checks product.cost_price first, then tags like "cost:850", or returns null/0.
 */
export function getProductCostPrice(product: Partial<Product>): number {
  if (product.cost_price != null && !isNaN(Number(product.cost_price))) {
    return Number(product.cost_price);
  }

  if (Array.isArray(product.tags)) {
    const costTag = product.tags.find(t => t.startsWith('cost:'));
    if (costTag) {
      const parsed = parseFloat(costTag.replace('cost:', ''));
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  }

  return 0;
}

/**
 * Updates a product's tags array to include "cost:<amount>", removing any prior cost tag.
 */
export function syncCostToTags(existingTags: string[] = [], costPrice: number | null | undefined): string[] {
  const filtered = existingTags.filter(t => !t.startsWith('cost:'));
  if (costPrice != null && !isNaN(costPrice) && costPrice > 0) {
    filtered.push(`cost:${costPrice}`);
  }
  return filtered;
}

/**
 * Computes unit profit, margin %, and markup %
 */
export function calculateProfitMetrics(sellingPrice: number, costPrice: number) {
  const sell = Number(sellingPrice) || 0;
  const cost = Number(costPrice) || 0;
  const netProfit = sell - cost;
  const marginPercent = sell > 0 ? Math.round((netProfit / sell) * 1000) / 10 : 0;
  const markupPercent = cost > 0 ? Math.round((netProfit / cost) * 1000) / 10 : 0;

  return {
    netProfit,
    marginPercent,
    markupPercent,
    isProfitable: netProfit > 0,
  };
}

/**
 * Calculates sale price given base price and discount percent (e.g. 1500 with 20% -> 1200)
 */
export function calculateDiscountPrice(basePrice: number, discountPercent: number): number {
  const base = Number(basePrice) || 0;
  const disc = Number(discountPercent) || 0;
  if (base <= 0 || disc <= 0) return base;
  if (disc >= 100) return 0;
  return Math.round(base * (1 - disc / 100));
}

/**
 * Calculates discount percentage given base price and sale price (e.g. 1500 and 1200 -> 20%)
 */
export function calculateDiscountPercent(basePrice: number, salePrice: number): number {
  const base = Number(basePrice) || 0;
  const sale = Number(salePrice) || 0;
  if (base <= 0 || sale <= 0 || sale >= base) return 0;
  const pct = ((base - sale) / base) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Extracts a variant's cost price from product tags (e.g. "vcost:SKU-M:450").
 */
export function getVariantCostPrice(tags: string[] = [], sku: string, fallbackCost = 0): number {
  if (!Array.isArray(tags) || !sku) return fallbackCost;
  const cleanSku = sku.trim().toLowerCase();
  const tag = tags.find(t => t.toLowerCase().startsWith(`vcost:${cleanSku}:`));
  if (tag) {
    const parts = tag.split(':');
    const cost = parseFloat(parts[2]);
    if (!isNaN(cost) && cost >= 0) return cost;
  }
  return fallbackCost;
}

/**
 * Universal option definition schema for dynamic attributes (e.g. Diameter, Stand, Dial Size, Strap)
 */
export interface ProductOptionSchema {
  name: string;
  values: string[];
}

/**
 * Parses dynamic option definitions from product tags (e.g. "opts:[{"name":"Diameter","values":["6\"","8\""]}]").
 */
export function extractOptionSchema(tags: string[] = []): ProductOptionSchema[] {
  if (!Array.isArray(tags)) return [];
  const tag = tags.find(t => t.startsWith('opts:'));
  if (!tag) return [];
  try {
    const jsonStr = tag.replace('opts:', '');
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Encodes dynamic option schema into product tags safely.
 */
export function syncOptionSchemaToTags(
  existingTags: string[] = [],
  schema: ProductOptionSchema[] = []
): string[] {
  let tags = existingTags.filter(t => !t.startsWith('opts:'));
  if (Array.isArray(schema) && schema.length > 0) {
    const cleanSchema = schema
      .filter(o => o.name && o.name.trim() && Array.isArray(o.values) && o.values.length > 0)
      .map(o => ({
        name: o.name.trim(),
        values: o.values.map(v => v.trim()).filter(Boolean),
      }));
    if (cleanSchema.length > 0) {
      tags.push(`opts:${JSON.stringify(cleanSchema)}`);
    }
  }
  return tags;
}

/**
 * Extracts complete financial metrics for a variant from product tags.
 */
export function getVariantPricing(
  tags: string[] = [],
  sku: string,
  fallback: { cost?: number; regular?: number; sale?: number; priceModifier?: number } = {}
) {
  const cleanSku = (sku || '').trim().toLowerCase();
  let cost = fallback.cost || 0;
  let regular = fallback.regular || 0;
  let sale = fallback.sale || fallback.regular || 0;

  if (Array.isArray(tags) && cleanSku) {
    // vcost:<sku>:<amount>
    const costTag = tags.find(t => t.toLowerCase().startsWith(`vcost:${cleanSku}:`));
    if (costTag) {
      const c = parseFloat(costTag.split(':')[2]);
      if (!isNaN(c)) cost = c;
    }

    // vreg:<sku>:<amount>
    const regTag = tags.find(t => t.toLowerCase().startsWith(`vreg:${cleanSku}:`));
    if (regTag) {
      const r = parseFloat(regTag.split(':')[2]);
      if (!isNaN(r)) regular = r;
    }

    // vsale:<sku>:<amount>
    const saleTag = tags.find(t => t.toLowerCase().startsWith(`vsale:${cleanSku}:`));
    if (saleTag) {
      const s = parseFloat(saleTag.split(':')[2]);
      if (!isNaN(s)) sale = s;
    }
  }

  // If price modifier was provided and sale wasn't explicitly tagged
  if (sale === (fallback.sale || 0) && fallback.priceModifier != null && fallback.priceModifier !== 0) {
    sale = Math.max(0, (fallback.sale ?? fallback.regular ?? 0) + fallback.priceModifier);
    if (regular <= 0 || regular < sale) {
      regular = sale;
    }
  }

  const effectiveSelling = sale > 0 ? sale : regular;
  const hasDiscount = regular > effectiveSelling && effectiveSelling > 0;
  const discountPercent = hasDiscount ? calculateDiscountPercent(regular, effectiveSelling) : 0;
  const profitMetrics = calculateProfitMetrics(effectiveSelling, cost);

  return {
    costPrice: cost,
    regularPrice: regular,
    salePrice: effectiveSelling,
    hasDiscount,
    discountPercent,
    netProfit: profitMetrics.netProfit,
    marginPercent: profitMetrics.marginPercent,
    isProfitable: profitMetrics.isProfitable,
  };
}

/**
 * Updates product tags with complete variant financial entries (vcost, vreg, vsale).
 */
export function syncVariantFinancialsToTags(
  existingTags: string[] = [],
  variantFinancials: Array<{
    sku: string;
    costPrice?: number | string | null;
    regularPrice?: number | string | null;
    salePrice?: number | string | null;
  }>
): string[] {
  let tags = existingTags.filter(
    t => !t.startsWith('vcost:') && !t.startsWith('vreg:') && !t.startsWith('vsale:')
  );

  variantFinancials.forEach(v => {
    if (!v.sku || !v.sku.trim()) return;
    const cleanSku = v.sku.trim().toLowerCase();

    const cost = Number(v.costPrice);
    if (!isNaN(cost) && cost > 0) {
      tags.push(`vcost:${cleanSku}:${cost}`);
    }

    const reg = Number(v.regularPrice);
    if (!isNaN(reg) && reg > 0) {
      tags.push(`vreg:${cleanSku}:${reg}`);
    }

    const sale = Number(v.salePrice);
    if (!isNaN(sale) && sale > 0) {
      tags.push(`vsale:${cleanSku}:${sale}`);
    }
  });

  return tags;
}

/**
 * Backwards compatible alias
 */
export const syncVariantCostsToTags = syncVariantFinancialsToTags;

