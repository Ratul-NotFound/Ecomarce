import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    const supabase = await createClient();

    // If query is empty, return popular trending recommendations
    if (!q) {
      const { data: popularCategories } = await supabase
        .from('categories')
        .select('id, name_en, slug')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(6);

      return NextResponse.json({
        products: [],
        categories: popularCategories || [],
        popular_searches: ['Smart Watch', 'Headphones', 'Fitness Tracker', 'Wireless', 'Minimalist'],
      });
    }

    // 1. Search matching products (across name_en, description_en, name_bn)
    const { data: products, count } = await supabase
      .from('products')
      .select('id, name_en, name_bn, slug, base_price, images, category:categories(name_en, slug)', { count: 'exact' })
      .eq('is_active', true)
      .or(`name_en.ilike.%${q}%,description_en.ilike.%${q}%,name_bn.ilike.%${q}%`)
      .limit(6);

    // 2. Search matching categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name_en, name_bn, slug')
      .eq('is_active', true)
      .or(`name_en.ilike.%${q}%,name_bn.ilike.%${q}%`)
      .limit(3);

    // 3. Generate keyword suggestions
    const suggestions: string[] = [];
    (products || []).forEach(p => {
      const words = p.name_en.split(' ');
      if (words.length > 0 && !suggestions.includes(p.name_en)) {
        suggestions.push(p.name_en);
      }
    });

    return NextResponse.json({
      products: products || [],
      categories: categories || [],
      suggestions: suggestions.slice(0, 4),
      total_matches: count || 0,
    });
  } catch (error: any) {
    console.error('Search suggest error:', error);
    return NextResponse.json({ products: [], categories: [], suggestions: [] }, { status: 500 });
  }
}
