import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { OrderService } from '@/lib/services/OrderService';
import type { OrderStatus } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) {
      return auth.response!;
    }
    const { user, dbClient } = auth;

    const { id } = await params;
    const body = await request.json();
    const { action, status, message, location } = body;
    const orderService = new OrderService(dbClient);

    const adminId = user.id;

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
