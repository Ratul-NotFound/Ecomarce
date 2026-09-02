import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { reviewId, reactionType = 'helpful' } = await request.json();

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
    }

    let supabase = await createClient();
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createAdminClient();
    }

    // Fetch existing review
    const { data: review, error: fetchErr } = await supabase
      .from('product_reviews')
      .select('helpful_count')
      .eq('id', reviewId)
      .single();

    if (fetchErr || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const newCount = (review.helpful_count || 0) + 1;

    const { error: updateErr } = await supabase
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
