import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InvoiceService } from '@/lib/services/InvoiceService';
import type { Order } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();

    let dbClient = supabase;
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        dbClient = createAdminClient();
      }
    } catch {}

    // Fetch order by ID or order_number
    let query = dbClient.from('orders').select('*');
    if (orderId.startsWith('EC-')) {
      query = query.eq('order_number', orderId);
    } else {
      query = query.eq('id', orderId);
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    // ────────────────────────────────────────────────────────────
    // IDOR / ACCESS CONTROL VERIFICATION
    // Allow if:
    // 1. Authenticated user is the owner (order.user_id === user.id)
    // 2. Authenticated user is an admin or moderator
    // 3. Guest verification matches order phone or verification token
    // ────────────────────────────────────────────────────────────
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isAuthorized = false;

    if (user) {
      if (order.user_id === user.id) {
        isAuthorized = true;
      } else {
        const { data: profile } = await dbClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'admin' || profile?.role === 'moderator') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      const { searchParams } = new URL(request.url);
      const phoneParam = searchParams.get('phone');
      const tokenParam = searchParams.get('token');

      const cleanPhone = (phoneParam || '').replace(/[^0-9]/g, '');
      const orderPhone = (order.shipping_address?.phone || '').replace(/[^0-9]/g, '');

      if (cleanPhone && orderPhone && cleanPhone === orderPhone) {
        isAuthorized = true;
      } else if (tokenParam && tokenParam === order.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new NextResponse(
        'Access Denied: Please sign in to your account or provide verification (phone or access token) to view this invoice.',
        { status: 403 }
      );
    }

    const { getStoreSettings } = await import('@/lib/store-settings');
    const settings = await getStoreSettings();

    const invoiceService = new InvoiceService();
    const html = invoiceService.generateInvoiceHtml(
      order as Order,
      settings.store_name,
      settings.contact_phone,
      settings.contact_email
    );

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error generating invoice: ${err.message}`, { status: 500 });
  }
}
