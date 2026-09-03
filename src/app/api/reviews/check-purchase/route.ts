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
      return NextResponse.json({
        canReview: false,
        hasPurchased: false,
        eligibilityStatus: 'unauthenticated',
        reason: 'not_logged_in',
      });
    }

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // 1. Check if user has already submitted a review for this product
    const { data: existingReview } = await dbClient
      .from('product_reviews')
      .select('id, rating, body, title, created_at, helpful_count, is_verified_purchase')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Fetch all orders by this user
    const { data: orders } = await dbClient
      .from('orders')
      .select('id, order_number, status, created_at, updated_at, items_snapshot')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Look for matching orders containing this product
    const matchingOrders: any[] = [];

    if (orders && orders.length > 0) {
      for (const order of orders) {
        if (Array.isArray(order.items_snapshot)) {
          const match = order.items_snapshot.find((it: any) => it.product_id === productId);
          if (match) {
            matchingOrders.push(order);
          }
        }
      }
    }

    // Also check normalized order_items as a fallback
    if (matchingOrders.length === 0) {
      const { data: orderItems } = await dbClient
        .from('order_items')
        .select('id, order_id, orders!inner(id, order_number, user_id, status, created_at, updated_at)')
        .eq('product_id', productId)
        .eq('orders.user_id', user.id);

      if (orderItems && orderItems.length > 0) {
        orderItems.forEach((it: any) => {
          if (it.orders) matchingOrders.push(it.orders);
        });
      }
    }

    // Evaluate delivered eligibility
    const deliveredOrder = matchingOrders.find(o => o.status === 'delivered');

    if (deliveredOrder) {
      return NextResponse.json({
        canReview: true,
        hasPurchased: true,
        eligibilityStatus: existingReview ? 'already_reviewed' : 'delivered_eligible',
        orderId: deliveredOrder.id,
        orderNumber: deliveredOrder.order_number || deliveredOrder.id.slice(0, 8),
        deliveredAt: deliveredOrder.updated_at || deliveredOrder.created_at,
        userReview: existingReview || null,
      });
    }

    // Check if order is currently in transit/fulfillment
    const inTransitOrder = matchingOrders.find(o =>
      ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'].includes(o.status)
    );

    if (inTransitOrder) {
      return NextResponse.json({
        canReview: false,
        hasPurchased: true,
        eligibilityStatus: 'in_transit',
        orderId: inTransitOrder.id,
        orderNumber: inTransitOrder.order_number || inTransitOrder.id.slice(0, 8),
        orderStatus: inTransitOrder.status,
        orderDate: inTransitOrder.created_at,
        userReview: existingReview || null,
        message: `Order #${inTransitOrder.order_number || inTransitOrder.id.slice(0, 8)} is currently ${inTransitOrder.status.replace('_', ' ')}. You can rate and review this item once it has been delivered.`,
      });
    }

    // Not purchased at all
    return NextResponse.json({
      canReview: false,
      hasPurchased: false,
      eligibilityStatus: 'not_purchased',
      reason: 'not_purchased',
      userReview: existingReview || null,
    });
  } catch (err: any) {
    console.error('Check purchase error:', err);
    return NextResponse.json({ error: err.message || 'Error checking purchase' }, { status: 500 });
  }
}
