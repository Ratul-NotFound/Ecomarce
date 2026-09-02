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

