import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limiter';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 helpful reactions per minute per IP
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const rate = checkRateLimit(`review_react:${clientIp}`, 5, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reviewId } = body;

    if (!reviewId || !UUID_REGEX.test(String(reviewId))) {
      return NextResponse.json({ error: 'Valid Review ID is required' }, { status: 400 });
    }

    // Require authentication to vote (prevents bots)
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to mark a review as helpful.' },
        { status: 401 }
      );
    }

    let dbClient: any = supabaseAuth;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // Fetch existing review
    const { data: review, error: fetchErr } = await dbClient
      .from('product_reviews')
      .select('helpful_count')
      .eq('id', reviewId)
      .single();

    if (fetchErr || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const newCount = (review.helpful_count || 0) + 1;

    const { error: updateErr } = await dbClient
      .from('product_reviews')
      .update({ helpful_count: newCount })
      .eq('id', reviewId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, helpful_count: newCount });
  } catch (err: any) {
    console.error('Review reaction error:', err);
    return NextResponse.json({ error: err.message || 'Failed to react to review' }, { status: 500 });
  }
}
