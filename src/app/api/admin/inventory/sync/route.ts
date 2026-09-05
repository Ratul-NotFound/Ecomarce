import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { InventoryService } from '@/lib/services/InventoryService';

/**
 * POST /api/admin/inventory/sync
 * Admin endpoint to run a full database inventory sync & reconciliation.
 * Recalculates all parent product stocks to match the SUM(product_variants.stock_quantity)
 * and updates has_variants flags accurately.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const { dbClient } = auth;

    const inventoryService = new InventoryService(dbClient);
    const result = await inventoryService.syncAllProductStocks();

    return NextResponse.json({
      success: true,
      message: `Inventory synced successfully. Checked ${result.totalProductsChecked} products, reconciled ${result.syncedCount} item(s).`,
      ...result,
    });
  } catch (err: any) {
    console.error('Inventory reconciliation error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to sync inventory' },
      { status: 500 }
    );
  }
}
