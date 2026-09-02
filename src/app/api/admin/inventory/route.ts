import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InventoryService } from '@/lib/services/InventoryService';

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
    const { productId, variantId, delta, changeType, notes } = body;

    const inventoryService = new InventoryService(dbClient);
    await inventoryService.adjustStock({
      productId,
      variantId,
      delta: Number(delta),
      changeType: changeType || 'adjustment',
      notes,
      adminId: user?.id,
    });

    return NextResponse.json({ success: true, message: 'Stock updated successfully' });
  } catch (err: any) {
    console.error('Inventory adjustment error:', err);
    return NextResponse.json({ error: err.message || 'Failed to adjust stock' }, { status: 500 });
  }
}
