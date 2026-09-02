import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Profile, Address, WishlistItem, PaginatedResult } from '@/types';

export class UserRepository extends BaseRepository<Profile> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'profiles');
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data as Profile | null;
  }

  async getAddresses(userId: string): Promise<Address[]> {
    const { data } = await this.supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    return (data as Address[]) ?? [];
  }

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    const { data } = await this.supabase
      .from('wishlists')
      .select('*, product:products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return (data as WishlistItem[]) ?? [];
  }

  async toggleWishlist(userId: string, productId: string): Promise<boolean> {
    const { data: existing } = await this.supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existing) {
      await this.supabase.from('wishlists').delete().eq('id', existing.id);
      return false; // removed
    } else {
      await this.supabase.from('wishlists').insert({ user_id: userId, product_id: productId });
      return true; // added
    }
  }

  async findAllCustomers(page = 1, pageSize = 20, search?: string): Promise<PaginatedResult<Profile>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.ilike('full_name', `%${search}%`);
    }

    const { data, count } = await query;
    return this.paginate((data as Profile[]) ?? [], count ?? 0, page, pageSize);
  }
}
