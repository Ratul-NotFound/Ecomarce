import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ hasPurchased: false, reason: 'not_logged_in' });
    }

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // 1. Check orders by items_snapshot (JSON array of purchased items)
    const { data: orders, error: ordersErr } = await dbClient
      .from('orders')
      .select('id, status, created_at, items_snapshot')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'processing', 'shipped', 'delivered']);

    if (orders && orders.length > 0) {
      for (const order of orders) {
        if (Array.isArray(order.items_snapshot)) {
          const match = order.items_snapshot.find((it: any) => it.product_id === productId);
          if (match) {
            return NextResponse.json({
              hasPurchased: true,
              purchaseDate: order.created_at,
              orderId: order.id,
            });
          }
        }
      }
    }

    // 2. Also check normalized order_items table as secondary check
    const { data: orderItems } = await dbClient
      .from('order_items')
      .select('id, order_id, orders!inner(user_id, status, created_at)')
      .eq('product_id', productId)
      .eq('orders.user_id', user.id);

    if (orderItems && orderItems.length > 0) {
      const validItem = orderItems.find(
        (it: any) =>
          it.orders && ['confirmed', 'processing', 'shipped', 'delivered'].includes(it.orders.status)
      );

      if (validItem) {
        return NextResponse.json({
          hasPurchased: true,
          purchaseDate: (validItem as any).orders?.created_at,
          orderId: validItem.order_id,
        });
      }
    }

    return NextResponse.json({ hasPurchased: false, reason: 'not_purchased' });
  } catch (err: any) {
    console.error('Check purchase error:', err);
    return NextResponse.json({ error: err.message || 'Error checking purchase' }, { status: 500 });
  }
}
