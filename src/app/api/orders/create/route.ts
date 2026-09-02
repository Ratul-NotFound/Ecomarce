import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OrderService } from '@/lib/services/OrderService';
import { CouponService } from '@/lib/services/CouponService';
import { TelegramService } from '@/lib/services/TelegramService';
import { InventoryService } from '@/lib/services/InventoryService';
import { getShippingFee } from '@/lib/utils/bangladesh-districts';
import { STORE_CONFIG } from '@/lib/store-config';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      cart,
      address,
      paymentMethod,
      couponCode,
      affiliateCode,
      paymentTransactionId,
      paymentScreenshotUrl,
    } = body;

    if (!cart || cart.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!address || !address.full_name || !address.phone || !address.district || !address.street_address) {
      return NextResponse.json({ error: 'Please provide full delivery address and phone number' }, { status: 400 });
    }

    // Determine user ID: auth user or anonymous guest account ID
    let userId = user?.id;

    // Use admin client for reliable transactional insertion and bypass RLS constraints during guest checkout
    let dbClient = supabase;
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        dbClient = createAdminClient();
      }
    } catch {
      // Use standard client
    }

    if (!userId) {
      // If guest, create a shadow profile or generate an anonymous UUID
      userId = crypto.randomUUID();
      try {
        await dbClient.from('profiles').insert({
          id: userId,
          full_name: address.full_name,
          phone: address.phone,
          role: 'customer',
        });
      } catch (err) {
        console.warn('Guest profile insert skipped:', err);
      }
    }

    const orderService = new OrderService(dbClient);
    const couponService = new CouponService(dbClient);
    const inventoryService = new InventoryService(dbClient);

    // Calculate subtotal
    const subtotal = cart.reduce((sum: number, item: any) => {
      const unitPrice = item.variant
        ? (item.product.sale_price ?? item.product.base_price) + item.variant.price_modifier
        : item.product.sale_price ?? item.product.base_price;
      return sum + unitPrice * item.quantity;
    }, 0);

    // Calculate shipping fee
    let shippingFee = getShippingFee(address.district);
    if (subtotal >= STORE_CONFIG.shipping.freeAbove) {
      shippingFee = 0;
    }

    // Calculate coupon discount
    let discountAmount = 0;
    if (couponCode) {
      const couponRes = await couponService.validate(couponCode, subtotal);
      if (couponRes.valid) {
        discountAmount = couponRes.discount;
        await couponService.markUsed(couponCode).catch(() => {});
      }
    }

    // Create the Order
    const order = await orderService.createOrder({
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
    });

    // Deduct stock for physical items
    try {
      const itemsToDeduct = cart.map((item: any) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      }));
      await inventoryService.deductForOrder(order.id, itemsToDeduct, userId);
    } catch (err) {
      console.warn('Inventory deduction warning:', err);
    }

    // Trigger Telegram Order Notification
    try {
      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('key, value')
        .in('key', ['telegram_bot_token', 'telegram_chat_id', 'telegram_orders_topic_id']);

      const settingsMap: Record<string, any> = {};
      settingsData?.forEach((item: any) => {
        try {
          settingsMap[item.key] = typeof item.value === 'string' && (item.value.startsWith('"') || item.value.startsWith('{'))
            ? JSON.parse(item.value)
            : item.value;
        } catch {
          settingsMap[item.key] = item.value;
        }
      });

      const token = settingsMap.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = settingsMap.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;
      const ordersTopicId = settingsMap.telegram_orders_topic_id ? parseInt(settingsMap.telegram_orders_topic_id, 10) : undefined;

      if (token && chatId) {
        const telegram = new TelegramService(token, chatId, ordersTopicId);
        telegram.notifyNewOrder({
          order_number: order.order_number,
          total: order.total,
          payment_method: order.payment_method,
          customer_name: address.full_name,
          district: address.district,
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    return NextResponse.json({ error: err.message || 'Failed to place order' }, { status: 500 });
  }
}
