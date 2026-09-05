import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const body = await request.json();
    const { variants, ...productData } = body;

    // Calculate variant stock and flag
    const hasVariants = Boolean(variants && Array.isArray(variants) && variants.length > 0);
    productData.has_variants = hasVariants;
    if (hasVariants) {
      productData.stock_quantity = variants.reduce(
        (sum: number, v: any) => sum + Math.max(0, Number(v.stock_quantity) || 0),
        0
      );
    } else {
      productData.stock_quantity = Math.max(0, Number(productData.stock_quantity) || 0);
    }

    // Ensure cost_price is encoded in tags
    if (productData.cost_price != null && !isNaN(Number(productData.cost_price))) {
      const existingTags = Array.isArray(productData.tags) ? productData.tags.filter((t: string) => !t.startsWith('cost:')) : [];
      existingTags.push(`cost:${productData.cost_price}`);
      productData.tags = existingTags;
    }

    let productResult = await dbClient
      .from('products')
      .insert(productData)
      .select()
      .single();

    // If cost_price or video_url column doesn't exist yet on remote db, retry without them
    if (productResult.error && productResult.error.code === '42703') {
      const { cost_price, video_url, ...cleanData } = productData;
      productResult = await dbClient
        .from('products')
        .insert(cleanData)
        .select()
        .single();
    }

    if (productResult.error) throw productResult.error;
    const product = productResult.data;

    // Insert variants if defined
    if (hasVariants) {
      const variantsToInsert = variants.map((v: any) => ({
        product_id: product.id,
        sku: v.sku,
        size: v.size || null,
        color: v.color || null,
        material: v.material || null,
        price_modifier: Number(v.price_modifier) || 0,
        stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
        images: Array.isArray(v.images) ? v.images : [],
      }));
      await dbClient.from('product_variants').insert(variantsToInsert);
    }

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Error creating product:', err);
    return NextResponse.json({ error: err.message || 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const body = await request.json();
    const { id, variants, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Sync has_variants and stock_quantity if variants array is provided
    if (variants !== undefined && Array.isArray(variants)) {
      const hasVariants = variants.length > 0;
      updates.has_variants = hasVariants;
      if (hasVariants) {
        updates.stock_quantity = variants.reduce(
          (sum: number, v: any) => sum + Math.max(0, Number(v.stock_quantity) || 0),
          0
        );
      }
    }

    // Sync cost_price to tags if provided
    if (updates.cost_price !== undefined) {
      if (updates.tags) {
        const filtered = updates.tags.filter((t: string) => !t.startsWith('cost:'));
        if (updates.cost_price != null && updates.cost_price > 0) {
          filtered.push(`cost:${updates.cost_price}`);
        }
        updates.tags = filtered;
      }
    }

    let updateRes = await dbClient
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateRes.error && updateRes.error.code === '42703') {
      const { cost_price, video_url, ...cleanUpdates } = updates;
      updateRes = await dbClient
        .from('products')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();
    }

    if (updateRes.error) throw updateRes.error;
    return NextResponse.json({ success: true, product: updateRes.data });
  } catch (err: any) {
    console.error('Error updating product:', err);
    return NextResponse.json({ error: err.message || 'Failed to update product' }, { status: 500 });
  }
}

