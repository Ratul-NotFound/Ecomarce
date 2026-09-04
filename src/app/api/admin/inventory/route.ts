import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { InventoryService } from '@/lib/services/InventoryService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DELTA = 100_000; // Sanity cap: no single adjustment > 100,000 units

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const { user, dbClient } = auth;

    const body = await request.json();
    const { productId, variantId, delta, changeType, notes } = body;

    // Validate productId is a real UUID
    if (!productId || !UUID_REGEX.test(String(productId))) {
      return NextResponse.json({ error: 'Valid product ID is required' }, { status: 400 });
    }

    // Sanity check delta
    const parsedDelta = Number(delta);
    if (isNaN(parsedDelta) || Math.abs(parsedDelta) > MAX_DELTA) {
      return NextResponse.json(
        { error: `Delta must be a number between -${MAX_DELTA} and ${MAX_DELTA}` },
        { status: 400 }
      );
    }

    const inventoryService = new InventoryService(dbClient);
    await inventoryService.adjustStock({
      productId,
      variantId,
      delta: parsedDelta,
      changeType: changeType || 'adjustment',
      notes,
      adminId: user.id,
    });

    return NextResponse.json({ success: true, message: 'Stock updated successfully' });
  } catch (err: any) {
    console.error('Inventory adjustment error:', err);
    return NextResponse.json({ error: err.message || 'Failed to adjust stock' }, { status: 500 });
  }
}
