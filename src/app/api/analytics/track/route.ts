import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      event_type = 'page_view',
      page_url = '/',
      product_id = null,
      session_id = null,
    } = body;

    // Filter out internal admin routes and assets from customer traffic stats
    if (
      typeof page_url === 'string' &&
      (page_url.startsWith('/admin') ||
        page_url.startsWith('/api') ||
        page_url.startsWith('/_next') ||
        page_url.includes('.'))
    ) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // 1. Extract Client IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');
    let clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || cfIp || '127.0.0.1'));
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    // 2. Parse User-Agent (Device & Browser)
    const userAgent = request.headers.get('user-agent') || '';
    let device = 'Desktop';
    if (/mobile|iphone|ipod|android.*mobile/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/tablet|ipad|android(?!.*mobile)/i.test(userAgent)) {
      device = 'Tablet';
    }

    let browser = 'Browser';
    if (/edg/i.test(userAgent)) browser = 'Edge';
    else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
    else if (/safari/i.test(userAgent)) browser = 'Safari';
    else if (/opr|opera/i.test(userAgent)) browser = 'Opera';

    const deviceType = `${device} (${browser})`;

    // 3. Geolocation Headers
    const country = request.headers.get('x-vercel-ip-country') || 'BD';
    const city = request.headers.get('x-vercel-ip-city') || '';
    const locationStr = city ? `${country} - ${city}` : country;

    // 4. Authenticated user if available
    const supabase = await createClient();
    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    const {
      data: { user },
    } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

    // Encode IP in session_id: "${clientIp}::${sessionId}"
    const cleanSession = session_id ? String(session_id).slice(-10) : 'anon';
    const combinedSessionId = `${clientIp}::${cleanSession}`;

    // 5. Insert traffic record into analytics_events
    await dbClient.from('analytics_events').insert({
      event_type: ['page_view', 'product_view', 'add_to_cart', 'purchase'].includes(event_type)
        ? event_type
        : 'page_view',
      page_url: String(page_url).slice(0, 500),
      product_id: product_id || null,
      user_id: user?.id || null,
      session_id: combinedSessionId,
      country: locationStr.slice(0, 100),
      device_type: deviceType,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Non-blocking, return 200 so customer page performance is never degraded
    return NextResponse.json({ ok: false });
  }
}
