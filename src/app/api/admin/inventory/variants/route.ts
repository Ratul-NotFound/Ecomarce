import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InventoryService } from '@/lib/services/InventoryService';

/**
 * Handles Variant CRUD operations in Inventory Management
 */

// POST: Create a new variant for a product
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
    const {
      productId,
      sku,
      size,
      color,
      material,
      stockQuantity,
      costPrice,
      regularPrice,
      sellingPrice,
    } = body;

    if (!productId || !sku) {
      return NextResponse.json({ error: 'Product ID and SKU are required' }, { status: 400 });
    }

    const inventoryService = new InventoryService(dbClient);
    const newVariant = await inventoryService.createVariant({
      productId,
      sku,
      size,
      color,
      material,
      stockQuantity: Number(stockQuantity) || 0,
      costPrice: costPrice != null ? Number(costPrice) : null,
      regularPrice: regularPrice != null ? Number(regularPrice) : null,
      sellingPrice: sellingPrice != null ? Number(sellingPrice) : null,
      adminId: user?.id,
    });

    return NextResponse.json({ success: true, variant: newVariant });
  } catch (err: any) {
    console.error('Create variant error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create variant' }, { status: 500 });
  }
}

// PUT: Update an existing variant's stock, SKU, attributes, or pricing
export async function PUT(request: NextRequest) {
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
    const {
      variantId,
      productId,
      sku,
      size,
      color,
      material,
      stockQuantity,
      costPrice,
      regularPrice,
      sellingPrice,
    } = body;

    if (!variantId || !productId) {
      return NextResponse.json({ error: 'Variant ID and Product ID are required' }, { status: 400 });
    }

    const inventoryService = new InventoryService(dbClient);
    await inventoryService.updateVariant({
      variantId,
      productId,
      sku,
      size,
      color,
      material,
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : undefined,
      costPrice: costPrice !== undefined ? (costPrice != null ? Number(costPrice) : null) : undefined,
      regularPrice: regularPrice !== undefined ? (regularPrice != null ? Number(regularPrice) : null) : undefined,
      sellingPrice: sellingPrice !== undefined ? (sellingPrice != null ? Number(sellingPrice) : null) : undefined,
      adminId: user?.id,
    });

    return NextResponse.json({ success: true, message: 'Variant updated successfully' });
  } catch (err: any) {
    console.error('Update variant error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update variant' }, { status: 500 });
  }
}

// DELETE: Delete a variant
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('id');
    const productId = searchParams.get('productId');

    if (!variantId || !productId) {
      return NextResponse.json({ error: 'Variant ID and Product ID are required' }, { status: 400 });
    }

    const inventoryService = new InventoryService(dbClient);
    await inventoryService.deleteVariant({
      variantId,
      productId,
      adminId: user?.id,
    });

    return NextResponse.json({ success: true, message: 'Variant deleted successfully' });
  } catch (err: any) {
    console.error('Delete variant error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete variant' }, { status: 500 });
  }
}
