import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { InvoiceService } from '@/lib/services/InvoiceService';
import type { Order } from '@/types';

async function handleBatchRequest(
  orderIds: string[],
  docType: 'standard' | 'tags' | 'manifest' = 'standard',
  layout: '4-up' | '6-up' | '9-up' | 'thermal' = '6-up',
  timeframe: string = 'today',
  status?: string,
  userAuthRequired: boolean = true
) {
  const supabase = await createClient();

  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  // Verify Admin / Moderator Authorization
  if (userAuthRequired) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized: Admin login required', { status: 401 });
    }

    const { data: profile } = await dbClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
      return new NextResponse('Forbidden: Admin or Moderator role required', { status: 403 });
    }
  }

  // Build DB query
  let query = dbClient.from('orders').select('*');

  if (orderIds && orderIds.length > 0) {
    query = query.in('id', orderIds);
  } else if (timeframe) {
    const now = new Date().getTime();
    let diffMs = 24 * 60 * 60 * 1000; // Default today

    if (timeframe === '1h') diffMs = 1 * 60 * 60 * 1000;
    else if (timeframe === 'today' || timeframe === '24h') diffMs = 24 * 60 * 60 * 1000;
    else if (timeframe === '7d' || timeframe === 'week') diffMs = 7 * 24 * 60 * 60 * 1000;
    else if (timeframe === '30d' || timeframe === 'month') diffMs = 30 * 24 * 60 * 60 * 1000;
    else if (timeframe === 'quarter') diffMs = 90 * 24 * 60 * 60 * 1000;

    const fromIso = new Date(now - diffMs).toISOString();
    query = query.gte('created_at', fromIso);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  query = query.order('created_at', { ascending: false }).limit(200);

  const { data: orders, error } = await query;

  if (error || !orders || orders.length === 0) {
    return new NextResponse('No orders found for the specified selection or timeframe.', { status: 404 });
  }

  const { getStoreSettings } = await import('@/lib/store-settings');
  const settings = await getStoreSettings();

  const invoiceService = new InvoiceService();
  let html = '';

  const timeframeLabels: Record<string, string> = {
    '1h': 'Last 1 Hour',
    'today': 'Today (Last 24 Hours)',
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    'week': 'Last 7 Days',
    '30d': 'This Month (30 Days)',
    'month': 'This Month (30 Days)',
    'quarter': 'Last 90 Days',
    'custom': 'Custom Order Selection',
  };

  const timeframeLabel = orderIds && orderIds.length > 0 ? `Selected Orders (${orders.length})` : (timeframeLabels[timeframe] || timeframe);

  if (docType === 'tags') {
    html = invoiceService.generateShippingTagsHtml(
      orders as Order[],
      layout,
      settings.store_name,
      settings.contact_phone
    );
  } else if (docType === 'manifest') {
    html = invoiceService.generatePickingManifestHtml(
      orders as Order[],
      timeframeLabel,
      settings.store_name
    );
  } else {
    // Default: Standard Invoices
    html = invoiceService.generateBatchInvoicesHtml(
      orders as Order[],
      settings.store_name,
      settings.contact_phone,
      settings.contact_email
    );
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const orderIds = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [];
    const docType = (searchParams.get('type') || 'standard') as 'standard' | 'tags' | 'manifest';
    const layout = (searchParams.get('layout') || '6-up') as '4-up' | '6-up' | '9-up' | 'thermal';
    const timeframe = searchParams.get('timeframe') || (orderIds.length > 0 ? '' : 'today');
    const status = searchParams.get('status') || undefined;

    return await handleBatchRequest(orderIds, docType, layout, timeframe, status);
  } catch (err: any) {
    return new NextResponse(`Error generating batch invoice: ${err.message}`, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderIds: string[] = body.order_ids || [];
    const docType = (body.type || 'standard') as 'standard' | 'tags' | 'manifest';
    const layout = (body.layout || '6-up') as '4-up' | '6-up' | '9-up' | 'thermal';
    const timeframe = body.timeframe || (orderIds.length > 0 ? '' : 'today');
    const status = body.status || undefined;

    return await handleBatchRequest(orderIds, docType, layout, timeframe, status);
  } catch (err: any) {
    return new NextResponse(`Error generating batch invoice: ${err.message}`, { status: 500 });
  }
}
