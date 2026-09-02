import { SupabaseClient } from '@supabase/supabase-js';
import type { PaginatedResult } from '@/types';

export abstract class BaseRepository<T extends { id: string }> {
  protected tableName: string;
  protected supabase: SupabaseClient;

  constructor(supabase: SupabaseClient, tableName: string) {
    this.supabase = supabase;
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as T;
  }

  async create(data: Partial<T>): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(`Create failed on ${this.tableName}: ${error.message}`);
    return created as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Update failed on ${this.tableName}: ${error.message}`);
    return updated as T;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw new Error(`Delete failed on ${this.tableName}: ${error.message}`);
  }

  protected paginate<R>(data: R[], count: number, page: number, pageSize: number): PaginatedResult<R> {
    return {
      data,
      count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize) || 1,
    };
  }
}
