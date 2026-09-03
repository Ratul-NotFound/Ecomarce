import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InventoryService } from '@/lib/services/InventoryService';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

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
