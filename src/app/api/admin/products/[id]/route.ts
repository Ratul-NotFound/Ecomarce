import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const { id } = await params;
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
      const { cost_price, video_url, ...cleanData } = productData;
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
          product_id: id,
          sku: v.sku,
          size: v.size || null,
          color: v.color || null,
          material: v.material || null,
          price_modifier: Number(v.price_modifier) || 0,
          stock_quantity: Number(v.stock_quantity) || 0,
          images: Array.isArray(v.images) ? v.images : [],
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
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const { id } = await params;
    const { error } = await dbClient.from('products').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete product' }, { status: 500 });
  }
}
