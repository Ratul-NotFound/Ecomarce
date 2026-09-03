import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Product, ProductFilter, PaginatedResult } from '@/types';

/**
 * Attaches real, computed review metrics, clean sold count, and variant price ranges from the database
 */
export function attachProductMetrics(p: any): Product {
  if (!p) return p;

  const rawReviews = Array.isArray(p.reviews) ? p.reviews : [];
  const validRatings = rawReviews
    .map((r: any) => (typeof r === 'number' ? r : Number(r?.rating)))
    .filter((r: number) => !isNaN(r) && r > 0);

  const reviewCount = validRatings.length;
  const avgRating = reviewCount > 0
    ? Number((validRatings.reduce((sum: number, r: number) => sum + r, 0) / reviewCount).toFixed(1))
    : 0;

  // Variant pricing matrix calculations
  const rawVariants = Array.isArray(p.variants) ? p.variants : [];
  const baseEff = Number(p.sale_price ?? p.base_price ?? 0);
  const baseReg = Number(p.base_price ?? 0);

  let minPrice = baseEff;
  let maxPrice = baseEff;
  let minRegularPrice = baseReg;
  let maxRegularPrice = baseReg;
  let maxDiscountPercent = p.sale_price && p.sale_price < p.base_price && baseReg > 0
    ? Math.round(((baseReg - p.sale_price) / baseReg) * 100)
    : 0;

  const enrichedVariants = rawVariants.map((v: any) => {
    const cleanSku = (v.sku || '').trim().toLowerCase();
    let vSale = baseEff + (Number(v.price_modifier) || 0);
    let vReg = baseReg + (Number(v.price_modifier) || 0);
    let vCost = 0;

    if (Array.isArray(p.tags) && cleanSku) {
      const costTag = p.tags.find((t: string) => t.toLowerCase().startsWith(`vcost:${cleanSku}:`));
      if (costTag) {
        const c = parseFloat(costTag.split(':')[2]);
        if (!isNaN(c) && c > 0) vCost = c;
      }

      const saleTag = p.tags.find((t: string) => t.toLowerCase().startsWith(`vsale:${cleanSku}:`));
      if (saleTag) {
        const s = parseFloat(saleTag.split(':')[2]);
        if (!isNaN(s) && s > 0) vSale = s;
      }

      const regTag = p.tags.find((t: string) => t.toLowerCase().startsWith(`vreg:${cleanSku}:`));
      if (regTag) {
        const r = parseFloat(regTag.split(':')[2]);
        if (!isNaN(r) && r > 0) vReg = r;
      }
    }

    const hasDiscount = vReg > vSale && vSale > 0;
    const discPct = hasDiscount ? Math.round(((vReg - vSale) / vReg) * 100) : 0;

    return {
      ...v,
      cost_price: vCost > 0 ? vCost : null,
      regular_price: vReg > 0 ? vReg : null,
      selling_price: vSale > 0 ? vSale : null,
      discount_percent: discPct > 0 ? discPct : null,
    };
  });

  if (enrichedVariants.length > 0) {
    const prices = enrichedVariants
      .map((v: any) => Number(v.selling_price || v.regular_price || 0))
      .filter((price: number) => price > 0);
    const regularPrices = enrichedVariants
      .map((v: any) => Number(v.regular_price || v.selling_price || 0))
      .filter((price: number) => price > 0);

    if (prices.length > 0) {
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }
    if (regularPrices.length > 0) {
      minRegularPrice = Math.min(...regularPrices);
      maxRegularPrice = Math.max(...regularPrices);
    }

    enrichedVariants.forEach((v: any) => {
      if (v.discount_percent && v.discount_percent > maxDiscountPercent) {
        maxDiscountPercent = v.discount_percent;
      }
    });
  }

  const hasPriceRange = minPrice !== maxPrice && enrichedVariants.length > 0;

  return {
    ...p,
    total_sold: typeof p.total_sold === 'number' ? p.total_sold : Number(p.total_sold) || 0,
    avg_rating: avgRating,
    review_count: reviewCount,
    reviews: rawReviews,
    variants: enrichedVariants,
    min_price: minPrice,
    max_price: maxPrice,
    min_regular_price: minRegularPrice,
    max_regular_price: maxRegularPrice,
    has_price_range: hasPriceRange,
    max_discount_percent: maxDiscountPercent,
    variant_count: enrichedVariants.length,
  };
}

export class ProductRepository extends BaseRepository<Product> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'products');
  }

  async findBySlug(slugOrId: string): Promise<Product | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    let query = this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug), variants:product_variants(*), reviews:product_reviews(*, profile:profiles(full_name, avatar_url))')
      .eq('is_active', true);

    if (isUuid) {
      query = query.or(`slug.eq.${slugOrId},id.eq.${slugOrId}`);
    } else {
      query = query.eq('slug', slugOrId);
    }

    const { data } = await query.maybeSingle();
    return data ? attachProductMetrics(data) : null;
  }

  async findAll(filter: ProductFilter = {}): Promise<PaginatedResult<Product>> {
    const page = filter.page ?? 1;
    const pageSize = filter.page_size ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug), variants:product_variants(*), reviews:product_reviews(rating)', { count: 'exact' })
      .eq('is_active', true)
      .range(from, to);

    if (filter.category_id) query = query.eq('category_id', filter.category_id);
    if (filter.min_price !== undefined) query = query.gte('base_price', filter.min_price);
    if (filter.max_price !== undefined) query = query.lte('base_price', filter.max_price);
    if (filter.is_flash_sale) query = query.eq('is_flash_sale', true);
    if (filter.search) {
      const tokens = filter.search.trim().split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        query = query.or(`name_en.ilike.%${token}%,description_en.ilike.%${token}%,name_bn.ilike.%${token}%`);
      }
    }

    const sortMap: Record<string, [string, { ascending: boolean }]> = {
      newest: ['created_at', { ascending: false }],
      price_asc: ['base_price', { ascending: true }],
      price_desc: ['base_price', { ascending: false }],
      best_selling: ['total_sold', { ascending: false }],
      rating: ['created_at', { ascending: false }],
    };
    const [col, opts] = sortMap[filter.sort ?? 'newest'] ?? sortMap.newest;
    query = query.order(col, opts);

    const { data, count, error } = await query;
    if (error) {
      return this.paginate([], 0, page, pageSize);
    }
    const mapped = (data || []).map(attachProductMetrics);
    return this.paginate(mapped, count ?? 0, page, pageSize);
  }

  async findFeatured(limit = 8): Promise<Product[]> {
    const { data } = await this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug), variants:product_variants(*), reviews:product_reviews(rating)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('display_order', { ascending: true })
      .limit(limit);

    return (data || []).map(attachProductMetrics);
  }

  async findFlashSale(): Promise<Product[]> {
    const { data } = await this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug), variants:product_variants(*), reviews:product_reviews(rating)')
      .eq('is_active', true)
      .eq('is_flash_sale', true)
      .order('display_order', { ascending: true });

    return (data || []).map(attachProductMetrics);
  }

  async findRelated(productId: string, categoryId: string | null, limit = 6): Promise<Product[]> {
    let query = this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug), variants:product_variants(*), reviews:product_reviews(rating)')
      .eq('is_active', true)
      .neq('id', productId)
      .order('total_sold', { ascending: false })
      .limit(limit);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data } = await query;
    return (data || []).map(attachProductMetrics);
  }

  async incrementViews(productId: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_product_views', { product_id: productId });
    } catch {
      // Graceful fallback if RPC is not deployed yet
      const { data } = await this.supabase
        .from('products')
        .select('total_views')
        .eq('id', productId)
        .single();
      if (data) {
        await this.supabase
          .from('products')
          .update({ total_views: (data.total_views || 0) + 1 })
          .eq('id', productId);
      }
    }
  }

  async findLowStock(threshold = 5): Promise<Product[]> {
    const { data } = await this.supabase
      .from('products')
      .select('*')
      .lte('stock_quantity', threshold)
      .order('stock_quantity', { ascending: true });

    return (data as Product[]) ?? [];
  }
}
