import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const body = await request.json();
    const { variants, ...productData } = body;

    const { data: product, error } = await dbClient
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) throw error;

    // Insert variants if defined
    if (variants && variants.length > 0) {
      const variantsToInsert = variants.map((v: any) => ({
        ...v,
        product_id: product.id,
      }));
      await dbClient.from('product_variants').insert(variantsToInsert);
    }

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Error creating product:', err);
    return NextResponse.json({ error: err.message || 'Failed to create product' }, { status: 500 });
  }
}
