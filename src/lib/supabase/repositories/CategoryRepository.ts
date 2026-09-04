import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Category } from '@/types';

// ============================================================
// IN-MEMORY TTL CACHE (60 seconds)
// Categories are largely static; caching in memory prevents
// redundant SELECT * queries across StoreLayout, HomePage,
// CategoryPage, SearchPage, and API routes.
// ============================================================

let _topLevelCategoriesCache: Category[] | null = null;
let _topLevelCacheExpiry = 0;

let _allActiveCategoriesCache: Category[] | null = null;
let _allActiveCacheExpiry = 0;

const _categorySlugCache = new Map<string, { category: Category | null; expiry: number }>();

export function invalidateCategoryCache() {
  _topLevelCategoriesCache = null;
  _topLevelCacheExpiry = 0;
  _allActiveCategoriesCache = null;
  _allActiveCacheExpiry = 0;
  _categorySlugCache.clear();
}

export class CategoryRepository extends BaseRepository<Category> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'categories');
  }

  async findAllActive(): Promise<Category[]> {
    const now = Date.now();
    if (_allActiveCategoriesCache && now < _allActiveCacheExpiry) {
      return _allActiveCategoriesCache;
    }

    const { data } = await this.supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const result = (data as Category[]) ?? [];
    _allActiveCategoriesCache = result;
    _allActiveCacheExpiry = now + 60_000;
    return result;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const now = Date.now();
    const cached = _categorySlugCache.get(slug);
    if (cached && now < cached.expiry) {
      return cached.category;
    }

    const { data } = await this.supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    const result = (data as Category) || null;
    _categorySlugCache.set(slug, { category: result, expiry: now + 60_000 });
    return result;
  }

  async findTopLevel(): Promise<Category[]> {
    const now = Date.now();
    if (_topLevelCategoriesCache && now < _topLevelCacheExpiry) {
      return _topLevelCategoriesCache;
    }

    const { data } = await this.supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    const result = (data as Category[]) ?? [];
    _topLevelCategoriesCache = result;
    _topLevelCacheExpiry = now + 60_000;
    return result;
  }
}
