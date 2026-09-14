import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth/admin-guard';
import { OrderService } from '@/lib/services/OrderService';
import { InventoryService } from '@/lib/services/InventoryService';
import { getShippingFee } from '@/lib/utils/bangladesh-districts';
import { STORE_CONFIG } from '@/lib/store-config';

/**
 * POST /api/admin/orders/create-manual
 *
 * Creates a manual order (from Facebook / WhatsApp / Instagram / phone) on behalf
 * of the admin. Fully synced with inventory and the shared orders table.
 *
 * Body:
 * {
 *   channel: 'facebook' | 'whatsapp' | 'instagram' | 'phone' | 'other'
 *   socialHandle?: string          – customer handle / phone / profile URL
 *   customerName: string
 *   customerPhone: string          – 11-digit BD mobile
 *   district: string
 *   upazila?: string
 *   streetAddress: string
 *   items: Array<{
 *     productId: string
 *     variantId?: string | null
 *     quantity: number
 *     unitPrice?: number           – optional override; server re-verifies anyway
 *   }>
 *   paymentMethod: 'cod' | 'bkash' | 'nagad'
 *   paymentTransactionId?: string
 *   notes?: string
 *   customShippingFee?: number     – if provided, bypasses the automatic calc
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ── Admin-only endpoint ──────────────────────────────────────────────────
    const auth = await requireAdminAuth(request);
    if (!auth.authorized) return auth.response!;
    const { user, dbClient } = auth;
    const adminId = user.id;

    const body = await request.json();
    const {
      channel,
      socialHandle,
      customerName,
      customerPhone,
      district,
      upazila,
      streetAddress,
      items,
      paymentMethod,
      paymentTransactionId,
      notes,
      customShippingFee,
    } = body;

    // ── Basic validation ─────────────────────────────────────────────────────
    if (!customerName?.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      return NextResponse.json(
        { error: 'Please provide a valid 11-digit Bangladesh mobile number (e.g. 01700000000)' },
        { status: 400 }
      );
    }

    if (!district?.trim()) {
      return NextResponse.json({ error: 'District is required' }, { status: 400 });
    }

    if (!streetAddress?.trim()) {
      return NextResponse.json({ error: 'Street address is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one product item is required' }, { status: 400 });
    }

    if (!['cod', 'bkash', 'nagad'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const validChannels = ['facebook', 'whatsapp', 'instagram', 'phone', 'other'];
    if (channel && !validChannels.includes(channel)) {
      return NextResponse.json({ error: 'Invalid source channel' }, { status: 400 });
    }

    // ── Server-authoritative price + stock verification ──────────────────────
    const productIds = [...new Set(items.map((i: any) => i.productId).filter(Boolean))];
    const variantIds = [...new Set(items.map((i: any) => i.variantId).filter(Boolean))];

    const { data: dbProducts, error: prodErr } = await dbClient
      .from('products')
      .select('id, name_en, name_bn, base_price, sale_price, stock_quantity, is_active, images')
      .in('id', productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ error: 'Could not load product data' }, { status: 400 });
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

    for (const item of items) {
      const dbProd = prodMap.get(item.productId);
      if (!dbProd) {
        return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }
      if (dbProd.is_active === false) {
        return NextResponse.json(
          { error: `Product "${dbProd.name_en}" is currently inactive` },
          { status: 400 }
        );
      }

      const dbVar = item.variantId ? varMap.get(item.variantId) : null;
      if (item.variantId && (!dbVar || dbVar.is_active === false)) {
        return NextResponse.json(
          { error: `Selected variant is unavailable for "${dbProd.name_en}"` },
          { status: 400 }
        );
      }

      const qty = Math.max(1, Math.min(999, parseInt(item.quantity, 10) || 1));
      const availableStock = dbVar
        ? Number(dbVar.stock_quantity || 0)
        : Number(dbProd.stock_quantity || 0);

      if (availableStock < qty) {
        return NextResponse.json(
          {
            error: `"${dbProd.name_en}${dbVar ? ` (${dbVar.name_en})` : ''}" only has ${availableStock} in stock`,
          },
          { status: 400 }
        );
      }

      // Admin may override unit price (e.g. negotiated deal); server verifies it's ≥ 0
      const canonicalBase = Number(dbProd.sale_price ?? dbProd.base_price);
      const modifier = dbVar ? Number(dbVar.price_modifier || 0) : 0;
      const serverPrice = Math.max(0, canonicalBase + modifier);
      // Use admin-supplied price if provided and non-negative, otherwise fall back to server price
      const unitPrice =
        typeof item.unitPrice === 'number' && item.unitPrice >= 0 ? item.unitPrice : serverPrice;

      subtotal += unitPrice * qty;

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
        variant: dbVar
          ? { id: dbVar.id, name_en: dbVar.name_en, price_modifier: modifier }
          : null,
        _verifiedUnitPrice: unitPrice,
      });
    }

    // ── Shipping fee ─────────────────────────────────────────────────────────
    let shippingFee: number;
    if (typeof customShippingFee === 'number' && customShippingFee >= 0) {
      shippingFee = customShippingFee;
    } else {
      const { data: shippingSettings } = await dbClient
        .from('store_settings')
        .select('key, value')
        .in('key', ['shipping_inside_dhaka', 'shipping_outside_dhaka', 'free_shipping_above']);
      const sm: Record<string, any> = {};
      (shippingSettings || []).forEach((r: any) => { sm[r.key] = r.value; });
      const insideFee = Number(sm['shipping_inside_dhaka']) || STORE_CONFIG.shipping.insideDhaka;
      const outsideFee = Number(sm['shipping_outside_dhaka']) || STORE_CONFIG.shipping.outsideDhaka;
      const freeAbove = Number(sm['free_shipping_above']) || STORE_CONFIG.shipping.freeAbove;
      shippingFee = getShippingFee(district, insideFee, outsideFee);
      if (subtotal >= freeAbove) shippingFee = 0;
    }

    // ── Build address ────────────────────────────────────────────────────────
    const address = {
      full_name: customerName.trim(),
      phone: cleanPhone,
      district: district.trim(),
      upazila: upazila?.trim() || '',
      area: null,
      street_address: streetAddress.trim(),
      label: 'Social Order',
    };

    // ── Build notes ──────────────────────────────────────────────────────────
    const channelLabel: Record<string, string> = {
      facebook: 'Facebook',
      whatsapp: 'WhatsApp',
      instagram: 'Instagram',
      phone: 'Phone',
      other: 'Other Channel',
    };
    const notesParts: string[] = [];
    if (channel) {
      notesParts.push(`📲 Social Order via ${channelLabel[channel] || channel}`);
    }
    if (socialHandle?.trim()) {
      notesParts.push(`Handle: ${socialHandle.trim()}`);
    }
    if (notes?.trim()) {
      notesParts.push(notes.trim());
    }
    notesParts.push(`Manually entered by admin (ID: ${adminId.slice(0, 8)})`);
    const combinedNotes = notesParts.join(' | ');

    // ── Create order via OrderService ────────────────────────────────────────
    const orderService = new OrderService(dbClient);
    const order = await orderService.createOrder({
      userId: adminId,
      cart: canonicalCart,
      address: address as any,
      paymentMethod,
      shippingFee,
      discountAmount: 0,
      paymentTransactionId: paymentTransactionId || undefined,
      sourceChannel: channel || null,
      socialHandle: socialHandle?.trim() || null,
    });

    // Patch combined notes separately (OrderService builds its own paymentNote)
    await dbClient
      .from('orders')
      .update({ notes: combinedNotes })
      .eq('id', order.id);

    // ── Deduct inventory ─────────────────────────────────────────────────────
    try {
      const inventoryService = new InventoryService(dbClient);
      const itemsToDeduct = canonicalCart.map((item: any) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      }));
      await inventoryService.deductForOrder(order.id, itemsToDeduct, adminId);
    } catch (invErr) {
      console.warn('[social-order] Inventory deduction warning:', invErr);
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
    });
  } catch (err: any) {
    console.error('[social-order] create-manual error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create manual order' },
      { status: 500 }
    );
  }
}
