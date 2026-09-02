import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OrderService } from '@/lib/services/OrderService';
import type { OrderStatus } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const body = await request.json();
    const { action, status, message, location } = body;
    const orderService = new OrderService(dbClient);

    const adminId = user?.id || 'admin';

    if (action === 'confirm_payment') {
      await orderService.confirmPayment(id, adminId);
      return NextResponse.json({ success: true, message: 'Payment confirmed successfully' });
    }

    if (action === 'update_status' && status) {
      await orderService.updateStatus(
        id,
        status as OrderStatus,
        message || `Order status updated to ${status}.`,
        adminId,
        location
      );
      return NextResponse.json({ success: true, message: 'Order status updated' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: err.message || 'Failed to update order' }, { status: 500 });
  }
}
