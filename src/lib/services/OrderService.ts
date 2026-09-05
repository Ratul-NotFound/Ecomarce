import { SupabaseClient } from '@supabase/supabase-js';
import type { CartItem, Address, Order, OrderStatus, PaymentMethod } from '@/types';

// Lazy-loaded to avoid bundling web-push in client code
async function dispatchOrderPush(userId: string, orderId: string, status: string): Promise<void> {
  try {
    const { sendPushToUser } = await import('@/lib/push-notifications');
    const { broadcastRealtimeEvent } = await import('@/lib/supabase/realtime-broadcast');
    const shortId = orderId.slice(0, 8).toUpperCase();
    const map: Record<string, { title: string; body: string }> = {
      confirmed:        { title: '✅ Order Confirmed',   body: `Your order #${shortId} is confirmed and being prepared.` },
      processing:       { title: '⚙️ Order Processing', body: `We're preparing your #${shortId} items for shipment.` },
      shipped:          { title: '🚚 Order Shipped!',    body: `Your order #${shortId} is on its way. Tap to track.` },
      out_for_delivery: { title: '📦 Out for Delivery', body: `Your order #${shortId} arrives today!` },
      delivered:        { title: '🎉 Order Delivered!', body: `Your order #${shortId} has arrived. Enjoy!` },
      cancelled:        { title: '❌ Order Cancelled',  body: `Your order #${shortId} has been cancelled.` },
      returned:         { title: '↩️ Return Confirmed', body: `Your return for #${shortId} has been processed.` },
    };
    const entry = map[status];
    if (!entry) return;

    // 1. Send Web Push to registered mobile/desktop device
    await sendPushToUser(userId, {
      ...entry,
      url:     `/orders/${orderId}`,
      tag:     `order-${orderId}`,
      vibrate: [200, 100, 200, 100, 400],
      actions: [{ action: 'track', title: '📦 Track Order' }],
    });

    // 2. Realtime broadcast to active customer in-app notification bell
    await broadcastRealtimeEvent(`user_notifs_${userId}`, 'order_status_updated', {
      orderId,
      status,
      title: entry.title,
      message: entry.body,
    });
  } catch (err) {
    console.warn('[push] Order push failed (non-fatal):', err);
  }
}

export class OrderService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async createOrder(params: {
    userId: string;
    cart: CartItem[];
    address: Address;
    paymentMethod: PaymentMethod;
    couponCode?: string;
    affiliateCode?: string;
    shippingFee: number;
    discountAmount: number;
    paymentTransactionId?: string;
    paymentScreenshotUrl?: string;
    paymentSenderPhone?: string;
  }): Promise<Order> {
    const {
      userId,
      cart,
      address,
      paymentMethod,
      couponCode,
      affiliateCode,
      shippingFee,
      discountAmount,
      paymentTransactionId,
      paymentScreenshotUrl,
      paymentSenderPhone,
    } = params;

    const subtotal = cart.reduce((sum, item: any) => {
      const unitPrice = item._verifiedUnitPrice !== undefined
        ? Number(item._verifiedUnitPrice)
        : (item.variant
          ? (Number(item.product.sale_price ?? item.product.base_price) + Number(item.variant.price_modifier || 0))
          : Number(item.product.sale_price ?? item.product.base_price));
      return sum + unitPrice * item.quantity;
    }, 0);

    const total = Math.max(0, subtotal + shippingFee - discountAmount);

    const itemsSnapshot = cart.map((item: any) => {
      const unitPrice = item._verifiedUnitPrice !== undefined
        ? Number(item._verifiedUnitPrice)
        : (item.variant
          ? (Number(item.product.sale_price ?? item.product.base_price) + Number(item.variant.price_modifier || 0))
          : Number(item.product.sale_price ?? item.product.base_price));
      return {
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        name_snapshot: item.product.name_en,
        image_snapshot: item.product.images?.[0] || '',
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: unitPrice * item.quantity,
      };
    });

    const initialTracking = [
      {
        id: crypto.randomUUID(),
        order_id: '',
        status: 'pending' as OrderStatus,
        message: 'Order received and is pending confirmation.',
        location: address.district,
        updated_by: userId,
        created_at: new Date().toISOString(),
      },
    ];

    const effectiveSenderPhone = paymentSenderPhone || address.sender_phone || null;
    const finalAddress = {
      ...address,
      sender_phone: effectiveSenderPhone,
    };

    const paymentNote = effectiveSenderPhone
      ? `Payment Sender: ${effectiveSenderPhone}`
      : null;

    const { data: order, error } = await this.supabase
      .from('orders')
      .insert({
        user_id: userId,
        shipping_address: finalAddress,
        items_snapshot: itemsSnapshot,
        subtotal,
        shipping_fee: shippingFee,
        discount_amount: discountAmount,
        total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cod' ? 'pending' : (paymentTransactionId ? 'submitted' : 'pending'),
        payment_transaction_id: paymentTransactionId || null,
        payment_screenshot_url: paymentScreenshotUrl || null,
        status: 'pending',
        tracking_info: initialTracking,
        coupon_code: couponCode || null,
        affiliate_code: affiliateCode || null,
        notes: paymentNote,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    // Also insert individual order_items for normalized reporting
    if (order && itemsSnapshot.length > 0) {
      const itemsToInsert = itemsSnapshot.map(item => ({
        order_id: order.id,
        ...item,
      }));
      await this.supabase.from('order_items').insert(itemsToInsert);

      // Add order_tracking row
      await this.supabase.from('order_tracking').insert({
        order_id: order.id,
        status: 'pending',
        message: 'Order received successfully.',
        location: address.district,
        updated_by: userId,
      });

      // If manual payment method with transaction ID, record payment
      if (paymentTransactionId || paymentScreenshotUrl) {
        await this.supabase.from('payments').insert({
          order_id: order.id,
          user_id: userId,
          method: paymentMethod,
          transaction_id: paymentTransactionId || null,
          screenshot_url: paymentScreenshotUrl || null,
          amount: total,
          status: 'submitted',
          notes: effectiveSenderPhone ? `Sender Phone: ${effectiveSenderPhone}` : null,
        });
      }
    }

    return order as Order;
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    message: string,
    adminId: string,
    location?: string
  ): Promise<void> {
    const { data: currentOrder } = await this.supabase
      .from('orders')
      .select('user_id, status, items_snapshot, tracking_info')
      .eq('id', orderId)
      .single();

    // Guard: explicit check prevents silent failure on invalid orderId
    if (!currentOrder) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const previousStatus = currentOrder.status;
    const currentTracking = (currentOrder.tracking_info as any[]) || [];
    const newTrackingEvent = {
      id: crypto.randomUUID(),
      order_id: orderId,
      status,
      message,
      location: location || null,
      updated_by: adminId,
      created_at: new Date().toISOString(),
    };

    const updatePayload: Record<string, any> = {
      status,
      tracking_info: [...currentTracking, newTrackingEvent],
    };

    // Auto-confirm payment upon successful delivery (crucial for COD order reconciliation)
    if (status === 'delivered') {
      updatePayload.payment_status = 'confirmed';
    }

    await this.supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    await this.supabase.from('order_tracking').insert({
      order_id: orderId,
      status,
      message,
      location: location || null,
      updated_by: adminId,
    });

    // Non-blocking push notification to customer (fire-and-forget)
    const orderUserId = (currentOrder as any)?.user_id as string | null;
    if (orderUserId) {
      dispatchOrderPush(orderUserId, orderId, status);
    }

    // Automatically restore inventory when order is cancelled or returned (idempotency guarded)
    if (
      (status === 'cancelled' || status === 'returned') &&
      previousStatus &&
      previousStatus !== 'cancelled' &&
      previousStatus !== 'returned'
    ) {
      try {
        // Check if stock has already been restored for this order
        const { data: existingRestoral } = await this.supabase
          .from('inventory_logs')
          .select('id')
          .eq('reference_id', orderId)
          .eq('change_type', 'return')
          .limit(1)
          .maybeSingle();

        if (!existingRestoral) {
          const { InventoryService } = await import('@/lib/services/InventoryService');
          const inventoryService = new InventoryService(this.supabase);
          const itemsToRestore = (currentOrder?.items_snapshot || []).map((item: any) => ({
            productId: item.product_id,
            variantId: item.variant_id || undefined,
            quantity: item.quantity,
          }));
          if (itemsToRestore.length > 0) {
            await inventoryService.restoreForOrder(orderId, itemsToRestore, adminId);
          }
        }
      } catch (err) {
        console.error('Failed to restore inventory for cancelled order:', err);
      }
    }
  }

  async confirmPayment(orderId: string, adminId: string): Promise<void> {
    // Update payment record to confirmed
    await this.supabase
      .from('payments')
      .update({
        status: 'confirmed',
        verified_by: adminId,
        verified_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    // updateStatus handles the orders.status update + tracking event atomically
    await this.updateStatus(orderId, 'confirmed', 'Payment verified and confirmed by moderator.', adminId);

    // Also confirm payment_status field
    await this.supabase
      .from('orders')
      .update({ payment_status: 'confirmed' })
      .eq('id', orderId);
  }
}
