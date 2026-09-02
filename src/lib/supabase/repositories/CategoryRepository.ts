import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Category } from '@/types';

export class CategoryRepository extends BaseRepository<Category> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'categories');
  }

  async findAllActive(): Promise<Category[]> {
    const { data } = await this.supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    return (data as Category[]) ?? [];
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const { data } = await this.supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();
    return data as Category | null;
  }

  async findTopLevel(): Promise<Category[]> {
    const { data } = await this.supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    return (data as Category[]) ?? [];
  }
}
