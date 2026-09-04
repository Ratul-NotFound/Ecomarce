import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 review submissions per hour per IP
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const rate = checkRateLimit(`review_submit:${clientIp}`, 10, 60 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many review submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to submit your product review.' },
        { status: 401 }
      );
    }

    const { productId, rating, body, reviewId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const numRating = Math.round(Number(rating));
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5 stars.' }, { status: 400 });
    }

    if (!body || !body.trim() || body.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please provide at least 3 characters of feedback in your review.' },
        { status: 400 }
      );
    }

    let dbClient = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }

    // 1. Strict Server-Side Delivery Verification:
    // User must have at least one order containing this product where status is strictly 'delivered'
    const { data: orders } = await dbClient
      .from('orders')
      .select('id, status, items_snapshot')
      .eq('user_id', user.id)
      .eq('status', 'delivered');

    let hasDeliveredOrder = false;

    if (orders && orders.length > 0) {
      for (const order of orders) {
        if (Array.isArray(order.items_snapshot)) {
          const match = order.items_snapshot.find((it: any) => it.product_id === productId);
          if (match) {
            hasDeliveredOrder = true;
            break;
          }
        }
      }
    }

    // Also check order_items table as fallback
    if (!hasDeliveredOrder) {
      const { data: orderItem } = await dbClient
        .from('order_items')
        .select('id, orders!inner(status, user_id)')
        .eq('product_id', productId)
        .eq('orders.user_id', user.id)
        .eq('orders.status', 'delivered')
        .limit(1)
        .maybeSingle();

      if (orderItem) {
        hasDeliveredOrder = true;
      }
    }

    if (!hasDeliveredOrder) {
      return NextResponse.json(
        {
          error:
            'Review permission denied. To ensure 100% authentic buyer reviews, ratings can only be submitted after your order has been physically delivered.',
        },
        { status: 403 }
      );
    }

    // 2. Upsert Review in product_reviews (1 review per product per customer)
    const reviewData = {
      product_id: productId,
      user_id: user.id,
      rating: numRating,
      body: body.trim(),
      is_verified_purchase: true,
      status: 'published',
    };

    const { data: savedReview, error: saveErr } = await dbClient
      .from('product_reviews')
      .upsert(reviewData, { onConflict: 'product_id, user_id' })
      .select('*, profile:profiles(full_name, avatar_url)')
      .single();

    if (saveErr) throw saveErr;

    // 3. Recalculate real average rating and review count
    const { data: allReviews } = await dbClient
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('status', 'published');

    const ratingsList = (allReviews || []).map((r: any) => Number(r.rating)).filter((r: number) => !isNaN(r) && r > 0);
    const reviewCount = ratingsList.length;
    const avgRating = reviewCount > 0
      ? Number((ratingsList.reduce((sum: number, r: number) => sum + r, 0) / reviewCount).toFixed(1))
      : 0;

    // 4. Update products table metrics if applicable
    try {
      await dbClient
        .from('products')
        .update({ avg_rating: avgRating, review_count: reviewCount })
        .eq('id', productId);
    } catch (metricErr) {
      console.warn('Product metric update warning:', metricErr);
    }

    return NextResponse.json({
      success: true,
      review: savedReview,
      avgRating,
      reviewCount,
    });
  } catch (err: any) {
    console.error('Submit review error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}
