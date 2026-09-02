import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const body = await request.json();
    const { variants, ...productData } = body;

    // Ensure cost_price is encoded in tags
    if (productData.cost_price !== undefined) {
      if (productData.tags) {
        const filtered = productData.tags.filter((t: string) => !t.startsWith('cost:'));
        if (productData.cost_price != null && productData.cost_price > 0) {
          filtered.push(`cost:${productData.cost_price}`);
        }
        productData.tags = filtered;
      }
    }

    let updateRes = await dbClient
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (updateRes.error && updateRes.error.code === '42703') {
      const { cost_price, ...cleanData } = productData;
      updateRes = await dbClient
        .from('products')
        .update(cleanData)
        .eq('id', id)
        .select()
        .single();
    }

    if (updateRes.error) throw updateRes.error;
    const product = updateRes.data;

    // Update variants: delete old and recreate
    if (variants) {
      await dbClient.from('product_variants').delete().eq('product_id', id);
      if (variants.length > 0) {
        const variantsToInsert = variants.map((v: any) => ({
          ...v,
          product_id: id,
        }));
        await dbClient.from('product_variants').insert(variantsToInsert);
      }
    }

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Error updating product:', err);
    return NextResponse.json({ error: err.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const { error } = await dbClient.from('products').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete product' }, { status: 500 });
  }
}
