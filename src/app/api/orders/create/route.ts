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

    // Validate Bangladesh mobile number format (11 digits, starts with 01)
    const cleanPhone = (address.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      return NextResponse.json({
        error: 'Please provide a valid 11-digit Bangladesh mobile number (e.g. 01700000000)',
      }, { status: 400 });
    }

    // Determine user ID: auth user or anonymous guest account ID
    let userId = user?.id;

    // Use admin client for reliable transactional insertion and bypass RLS constraints during guest checkout
    let dbClient = supabase;
    let adminClient: any = null;
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        adminClient = createAdminClient();
        dbClient = adminClient;
      }
    } catch {
      // Use standard client
    }

    if (!userId) {
      if (adminClient) {
        try {
          const cleanPhone = address.phone.replace(/[^0-9]/g, '');
          const guestEmail = `guest_${cleanPhone || Date.now()}@shopbd.local`;
          const { data: guestUser, error: guestErr } = await adminClient.auth.admin.createUser({
            email: guestEmail,
            password: crypto.randomUUID(),
            email_confirm: true,
            user_metadata: {
              full_name: address.full_name,
              phone: address.phone,
            },
          });

          if (guestUser?.user?.id) {
            userId = guestUser.user.id;
          } else if (guestErr?.message?.toLowerCase().includes('already')) {
            // If already exists from earlier guest order, lookup profile by phone
            const { data: existingProfile } = await dbClient
              .from('profiles')
              .select('id')
              .eq('phone', address.phone)
              .limit(1)
              .maybeSingle();

            if (existingProfile?.id) {
              userId = existingProfile.id;
            }
          }
        } catch (guestErr) {
          console.error('Guest account generation error:', guestErr);
        }
      }

      // Fallback: if user creation wasn't possible, link to any customer profile
      if (!userId) {
        const { data: fallbackProfiles } = await dbClient
          .from('profiles')
          .select('id')
          .limit(1);
        if (fallbackProfiles && fallbackProfiles.length > 0) {
          userId = fallbackProfiles[0].id;
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Failed to initialize user session for order' }, { status: 500 });
    }

    const orderService = new OrderService(dbClient);
    const couponService = new CouponService(dbClient);
    const inventoryService = new InventoryService(dbClient);

    // ────────────────────────────────────────────────────────────
    // SERVER-AUTHORITATIVE PRICE & STOCK VERIFICATION
    // Fetch canonical products & variants directly from database.
    // Client-submitted prices in the cart are strictly ignored.
    // ────────────────────────────────────────────────────────────
    const productIds = Array.from(new Set(cart.map((i: any) => i.product_id).filter(Boolean)));
    const variantIds = Array.from(new Set(cart.map((i: any) => i.variant_id).filter(Boolean)));

    const { data: dbProducts, error: prodErr } = await dbClient
      .from('products')
      .select('id, name_en, name_bn, base_price, sale_price, stock_quantity, is_active, images')
      .in('id', productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ error: 'Could not load products for order' }, { status: 400 });
    }

    const prodMap = new Map<string, any>(dbProducts.map((p: any) => [p.id, p]));

    let varMap = new Map<string, any>();
    if (variantIds.length > 0) {
      const { data: dbVariants } = await dbClient
        .from('product_variants')
        .select('id, product_id, name_en, price_modifier, stock_quantity, is_active')
        .in('id', variantIds);
      if (dbVariants) {
        varMap = new Map(dbVariants.map((v: any) => [v.id, v]));
      }
    }

    const canonicalCart: any[] = [];
    let subtotal = 0;

    for (const item of cart) {
      const dbProd = prodMap.get(item.product_id);
      if (!dbProd) {
        return NextResponse.json({ error: `Product not found: ${item.product_id}` }, { status: 400 });
      }
      if (dbProd.is_active === false) {
        return NextResponse.json({ error: `Sorry, "${dbProd.name_en}" is currently unavailable.` }, { status: 400 });
      }

      const dbVar = item.variant_id ? varMap.get(item.variant_id) : null;
      if (item.variant_id && (!dbVar || dbVar.is_active === false)) {
        return NextResponse.json({ error: `Selected variant is unavailable for "${dbProd.name_en}".` }, { status: 400 });
      }

      const qty = Math.max(1, Math.min(999, parseInt(item.quantity, 10) || 1));

      // Stock check
      const availableStock = dbVar ? Number(dbVar.stock_quantity || 0) : Number(dbProd.stock_quantity || 0);
      if (availableStock < qty) {
        return NextResponse.json({
          error: `Sorry, "${dbProd.name_en}${dbVar ? ` (${dbVar.name_en})` : ''}" has only ${availableStock} remaining in stock.`,
        }, { status: 400 });
      }

      // Canonical price calculation: DB sale_price ?? DB base_price + DB price_modifier
      const canonicalBase = Number(dbProd.sale_price ?? dbProd.base_price);
      const modifier = dbVar ? Number(dbVar.price_modifier || 0) : 0;
      const canonicalUnitPrice = Math.max(0, canonicalBase + modifier);

      subtotal += canonicalUnitPrice * qty;

      canonicalCart.push({
        product_id: dbProd.id,
        variant_id: dbVar ? dbVar.id : null,
        quantity: qty,
        product: {
          id: dbProd.id,
          name_en: dbProd.name_en,
          name_bn: dbProd.name_bn,
          base_price: Number(dbProd.base_price),
          sale_price: dbProd.sale_price != null ? Number(dbProd.sale_price) : null,
          images: Array.isArray(dbProd.images) ? dbProd.images : [],
        },
        variant: dbVar ? {
          id: dbVar.id,
          name_en: dbVar.name_en,
          price_modifier: modifier,
        } : null,
        _verifiedUnitPrice: canonicalUnitPrice,
      });
    }

    // Calculate shipping fee dynamically from database store_settings
    const { data: shippingSettingsData } = await dbClient
      .from('store_settings')
      .select('key, value')
      .in('key', ['shipping_inside_dhaka', 'shipping_outside_dhaka', 'free_shipping_above']);

    const shippingMap: Record<string, any> = {};
    (shippingSettingsData || []).forEach((r: any) => { shippingMap[r.key] = r.value; });

    const insideFee = Number(shippingMap['shipping_inside_dhaka']) || STORE_CONFIG.shipping.insideDhaka;
    const outsideFee = Number(shippingMap['shipping_outside_dhaka']) || STORE_CONFIG.shipping.outsideDhaka;
    const freeAbove = Number(shippingMap['free_shipping_above']) || STORE_CONFIG.shipping.freeAbove;

    let shippingFee = getShippingFee(address.district, insideFee, outsideFee);
    if (subtotal >= freeAbove) {
      shippingFee = 0;
    }

    // Calculate coupon discount using verified subtotal and canonical items
    let discountAmount = 0;
    if (couponCode) {
      const cartItemsPayload = canonicalCart.map((i: any) => ({
        product_id: i.product_id,
        price: i._verifiedUnitPrice,
        quantity: i.quantity,
      }));
      const couponRes = await couponService.validate(couponCode, subtotal, cartItemsPayload);
      if (couponRes.valid) {
        discountAmount = couponRes.discount;
        await couponService.markUsed(couponCode).catch(() => {});
      }
    }

    // Create the Order with verified canonical cart
    const order = await orderService.createOrder({
      userId,
      cart: canonicalCart,
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
      const itemsToDeduct = canonicalCart.map((item: any) => ({
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
      const { data: settingsData } = await dbClient
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
        await telegram.notifyNewOrder({
          order_number: order.order_number,
          total: order.total,
          payment_method: order.payment_method,
          customer_name: address.full_name,
          district: address.district,
        });

        // If manual bKash/Nagad TrxID was provided at checkout, notify in topic as well
        if (paymentTransactionId) {
          await telegram.notifyPaymentSubmitted({
            order_number: order.order_number,
            total: order.total,
            transaction_id: paymentTransactionId,
            method: paymentMethod || 'bKash/Nagad',
          });
        }
      }
    } catch (telegramErr) {
      console.warn('Telegram order notification error:', telegramErr);
    }

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
