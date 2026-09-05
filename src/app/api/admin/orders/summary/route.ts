import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Order } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    let dbClient = supabase;
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        dbClient = createAdminClient();
      }
    } catch {}

    // Verify Admin / Moderator Authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await dbClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'today';
    const status = searchParams.get('status') || 'all';
    const idsParam = searchParams.get('ids');
    const orderIds = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    let query = dbClient.from('orders').select('*');

    if (orderIds.length > 0) {
      query = query.in('id', orderIds);
    } else if (timeframe !== 'all') {
      const now = new Date().getTime();
      let diffMs = 24 * 60 * 60 * 1000;

      if (timeframe === '1h') diffMs = 1 * 60 * 60 * 1000;
      else if (timeframe === 'today' || timeframe === '24h') diffMs = 24 * 60 * 60 * 1000;
      else if (timeframe === '7d' || timeframe === 'week') diffMs = 7 * 24 * 60 * 60 * 1000;
      else if (timeframe === '30d' || timeframe === 'month') diffMs = 30 * 24 * 60 * 60 * 1000;
      else if (timeframe === 'quarter') diffMs = 90 * 24 * 60 * 60 * 1000;

      const fromIso = new Date(now - diffMs).toISOString();
      query = query.gte('created_at', fromIso);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false }).limit(300);

    const { data: orders, error } = await query;

    if (error) throw error;

    const orderList = (orders as Order[]) || [];

    // Aggregate products
    const productMap = new Map<
      string,
      {
        name: string;
        totalUnits: number;
        unitPrice: number;
        totalRevenue: number;
        ordersCount: number;
        orderNumbers: string[];
      }
    >();

    let totalRevenue = 0;
    let totalUnits = 0;
    let codCount = 0;
    let prepaidCount = 0;
    let codAmount = 0;

    orderList.forEach(order => {
      const isCod = order.payment_method?.toLowerCase() === 'cod' || order.payment_method?.toLowerCase() === 'cash on delivery';
      if (isCod) {
        codCount++;
        codAmount += Number(order.total) || 0;
      } else {
        prepaidCount++;
      }
      totalRevenue += Number(order.total) || 0;

      (order.items_snapshot || []).forEach(item => {
        totalUnits += item.quantity;
        const key = item.name_snapshot.trim();
        const existing = productMap.get(key);

        if (existing) {
          existing.totalUnits += item.quantity;
          existing.totalRevenue += item.total_price;
          if (!existing.orderNumbers.includes(order.order_number)) {
            existing.orderNumbers.push(order.order_number);
            existing.ordersCount++;
          }
        } else {
          productMap.set(key, {
            name: item.name_snapshot,
            totalUnits: item.quantity,
            unitPrice: item.unit_price,
            totalRevenue: item.total_price,
            ordersCount: 1,
            orderNumbers: [order.order_number],
          });
        }
      });
    });

    const products = Array.from(productMap.values()).sort((a, b) => b.totalUnits - a.totalUnits);

    return NextResponse.json({
      success: true,
      timeframe,
      totalOrders: orderList.length,
      totalUnits,
      totalRevenue,
      codCount,
      codAmount,
      prepaidCount,
      uniqueProductsCount: products.length,
      products,
      orders: orderList.map(o => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.shipping_address?.full_name,
        phone: o.shipping_address?.phone,
        district: o.shipping_address?.district,
        total: o.total,
        status: o.status,
        payment_method: o.payment_method,
        payment_status: o.payment_status,
        created_at: o.created_at,
        items_count: (o.items_snapshot || []).reduce((sum, i) => sum + i.quantity, 0),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
