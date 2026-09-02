import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Product, ProductFilter, PaginatedResult } from '@/types';

export class ProductRepository extends BaseRepository<Product> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'products');
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const { data } = await this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug), variants:product_variants(*), reviews:product_reviews(*, profile:profiles(full_name, avatar_url))')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    return data as Product | null;
  }

  async findAll(filter: ProductFilter = {}): Promise<PaginatedResult<Product>> {
    const page = filter.page ?? 1;
    const pageSize = filter.page_size ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug)', { count: 'exact' })
      .eq('is_active', true)
      .range(from, to);

    if (filter.category_id) query = query.eq('category_id', filter.category_id);
    if (filter.min_price !== undefined) query = query.gte('base_price', filter.min_price);
    if (filter.max_price !== undefined) query = query.lte('base_price', filter.max_price);
    if (filter.is_flash_sale) query = query.eq('is_flash_sale', true);
    if (filter.is_featured) query = query.eq('is_featured', true);
    if (filter.search) {
      query = query.ilike('name_en', `%${filter.search}%`);
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
    return this.paginate((data as Product[]) ?? [], count ?? 0, page, pageSize);
  }

  async findFeatured(limit = 8): Promise<Product[]> {
    const { data } = await this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('display_order', { ascending: true })
      .limit(limit);
    return (data as Product[]) ?? [];
  }

  async findFlashSale(): Promise<Product[]> {
    const { data } = await this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug)')
      .eq('is_active', true)
      .eq('is_flash_sale', true)
      .order('display_order', { ascending: true });
    return (data as Product[]) ?? [];
  }

  async findRelated(productId: string, categoryId: string | null, limit = 6): Promise<Product[]> {
    let query = this.supabase
      .from('products')
      .select('*, category:categories(id, name_en, name_bn, slug)')
      .eq('is_active', true)
      .neq('id', productId)
      .order('total_sold', { ascending: false })
      .limit(limit);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data } = await query;
    return (data as Product[]) ?? [];
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
