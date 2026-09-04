import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { InventoryService } from '@/lib/services/InventoryService';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const { user, dbClient } = auth;

    const body = await request.json();
    const { productId, variantId, delta, changeType, notes } = body;

    const inventoryService = new InventoryService(dbClient);
    await inventoryService.adjustStock({
      productId,
      variantId,
      delta: Number(delta),
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
