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

    const invoiceService = new InvoiceService();
    const html = invoiceService.generateInvoiceHtml(order as Order);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (err: any) {
    return new NextResponse(`Error generating invoice: ${err.message}`, { status: 500 });
  }
}
