import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Order, PaginatedResult, AdminOrderFilter } from '@/types';

export class OrderRepository extends BaseRepository<Order> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'orders');
  }

  async findByUser(userId: string, page = 1, pageSize = 10): Promise<PaginatedResult<Order>> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await this.supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching user orders:', error);
      return this.paginate([], 0, page, pageSize);
    }

    return this.paginate((data as Order[]) ?? [], count ?? 0, page, pageSize);
  }

  async findByNumber(orderNumber: string): Promise<Order | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('*, profile:profiles(full_name, phone)')
      .eq('order_number', orderNumber)
      .single();

    if (error) return null;
    return data as Order;
  }

  async findAdmin(filters: AdminOrderFilter = {}): Promise<PaginatedResult<Order>> {
    const page = filters.page ?? 1;
    const pageSize = filters.page_size ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from('orders')
      .select('*, profile:profiles(full_name, phone)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);
    if (filters.payment_method) query = query.eq('payment_method', filters.payment_method);
    if (filters.from_date) query = query.gte('created_at', filters.from_date);
    if (filters.to_date) query = query.lte('created_at', filters.to_date);
    if (filters.search) query = query.ilike('order_number', `%${filters.search}%`);

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching admin orders:', error);
      return this.paginate([], 0, page, pageSize);
    }

    return this.paginate((data as Order[]) ?? [], count ?? 0, page, pageSize);
  }
}
