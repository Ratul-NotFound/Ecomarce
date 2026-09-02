'use client';

import React, { useState } from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import type { ProductReview } from '@/types';
import { formatDate } from '@/lib/utils/format';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';

interface ReviewSectionProps {
  productId: string;
  reviews?: ProductReview[];
}

export default function ReviewSection({ productId, reviews = [] }: ReviewSectionProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewList, setReviewList] = useState<ProductReview[]>(reviews);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please sign in to write a review', 'info');
      return;
    }
    if (!reviewBody.trim()) {
      showToast('Please write some feedback for your review', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = createClient();
      const newReview = {
        product_id: productId,
        user_id: user.id,
        rating,
        title: null,
        body: reviewBody.trim(),
        images: [],
        status: 'published' as const,
      };

      const { data, error } = await supabase
        .from('product_reviews')
        .insert(newReview)
        .select('*, profile:profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;

      showToast('Thank you! Your review has been published.', 'success');
      setReviewList([data as ProductReview, ...reviewList]);
      setReviewBody('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating =
    reviewList.length > 0
      ? (reviewList.reduce((acc, r) => acc + r.rating, 0) / reviewList.length).toFixed(1)
      : '5.0';

  return (
    <div style={{ marginTop: '32px', borderTop: '1px solid var(--color-border)', paddingTop: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2>Customer Reviews</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <div className="stars" style={{ display: 'flex' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={18} fill="currentColor" />
              ))}
            </div>
            <span style={{ fontWeight: 800, fontSize: '16px' }}>{avgRating}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
              ({reviewList.length} verified reviews)
            </span>
          </div>
        </div>
      </div>

      {/* Review Submission Form */}
      <div style={{ background: 'var(--color-surface-2)', padding: '24px', borderRadius: 'var(--radius-xl)', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Share your experience</h3>
        <form onSubmit={handleSubmitReview}>
          {/* Star Rating Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rating:</span>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                style={{ color: star <= rating ? 'var(--color-star)' : 'var(--color-border-strong)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Star size={22} fill={star <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>

          <textarea
            className="form-input"
            rows={3}
            placeholder="How was the product quality, fit, or delivery speed?"
            value={reviewBody}
            onChange={e => setReviewBody(e.target.value)}
            style={{ marginBottom: '12px', resize: 'vertical' }}
            id="review-textarea"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-sm"
            id="submit-review-btn"
          >
            {isSubmitting ? 'Publishing...' : 'Submit Review'}
          </button>
        </form>
      </div>

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reviewList.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          reviewList.map(review => (
            <div
              key={review.id}
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9999px', background: 'var(--color-primary-10)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                    {review.profile?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {review.profile?.full_name || 'Verified Customer'}
                      {review.is_verified_purchase && (
                        <ShieldCheck size={14} color="var(--color-success)" />
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {formatDate(review.created_at)}
                    </div>
                  </div>
                </div>

                <div className="stars" style={{ display: 'flex' }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      size={14}
                      fill={s <= review.rating ? 'currentColor' : 'none'}
                      color={s <= review.rating ? 'var(--color-star)' : 'var(--color-border)'}
                    />
                  ))}
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {review.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
