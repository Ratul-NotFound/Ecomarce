import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { InventoryService } from '@/lib/services/InventoryService';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const dbClient = auth.dbClient;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') || undefined;

    const inventoryService = new InventoryService(dbClient);
    const logs = await inventoryService.getLogs(productId, 60);

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error('Fetch inventory logs error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch inventory logs' }, { status: 500 });
  }
}
