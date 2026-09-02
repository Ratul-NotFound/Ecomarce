'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, ThumbsUp, Heart, Lock, AlertCircle, CheckCircle2, User } from 'lucide-react';
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

  // Verified Buyer Verification State
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);

  // User Reaction tracking (stored locally so buttons reflect state)
  const [userReactions, setUserReactions] = useState<{ [reviewId: string]: 'helpful' | 'heart' }>({});

  // Check if current user has bought the product
  useEffect(() => {
    if (!user) {
      setHasPurchased(false);
      return;
    }

    setIsCheckingPurchase(true);
    fetch(`/api/reviews/check-purchase?productId=${productId}`)
      .then(r => r.json())
      .then(res => {
        if (res.hasPurchased) {
          setHasPurchased(true);
          setPurchaseDate(res.purchaseDate || null);
        } else {
          setHasPurchased(false);
        }
      })
      .catch(() => {
        setHasPurchased(false);
      })
      .finally(() => {
        setIsCheckingPurchase(false);
      });
  }, [user, productId]);

  // Load user review reactions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`review_reactions_${productId}`);
      if (saved) {
        setUserReactions(JSON.parse(saved));
      }
    } catch {}
  }, [productId]);

  const handleReactToReview = async (reviewId: string, type: 'helpful' | 'heart') => {
    if (userReactions[reviewId]) {
      showToast('You have already reacted to this review', 'info');
      return;
    }

    // Optimistic UI update
    setReviewList(prev =>
      prev.map(r => (r.id === reviewId ? { ...r, helpful_count: (r.helpful_count || 0) + 1 } : r))
    );

    const nextReactions = { ...userReactions, [reviewId]: type };
    setUserReactions(nextReactions);
    try {
      localStorage.setItem(`review_reactions_${productId}`, JSON.stringify(nextReactions));
    } catch {}

    showToast(type === 'helpful' ? 'Marked as helpful 👍' : 'Loved this review ❤️', 'success');

    try {
      await fetch('/api/reviews/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, reactionType: type }),
      });
    } catch (err) {
      console.error('Failed to sync reaction:', err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showToast('Please sign in to write a review', 'info');
      return;
    }

    if (!hasPurchased) {
      showToast('Only verified buyers who have purchased this product can leave a review', 'error');
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
        is_verified_purchase: true,
        status: 'published' as const,
      };

      const { data, error } = await supabase
        .from('product_reviews')
        .insert(newReview)
        .select('*, profile:profiles(full_name, avatar_url)')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already submitted a review for this product.');
        }
        throw error;
      }

      showToast('Thank you! Your verified review has been published.', 'success');
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Customer Reviews</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <div className="stars" style={{ display: 'flex', color: '#f59e0b' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={18} fill="currentColor" />
              ))}
            </div>
            <span style={{ fontWeight: 800, fontSize: '16px' }}>{avgRating}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
              ({reviewList.length} reviews)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#16a34a', background: 'rgba(22, 163, 74, 0.08)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
          <ShieldCheck size={16} />
          <span>Verified Buyer Policy Enforced</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
         VERIFIED BUYER REVIEW SUBMISSION FORM / LOCK GUARD
         ──────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--color-surface-2)', padding: '24px', borderRadius: 'var(--radius-xl)', marginBottom: '32px', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Write a Customer Review</h3>

        {!user ? (
          /* User Not Logged In */
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '16px', background: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Lock size={20} color="var(--color-text-muted)" />
              <div>
                <strong style={{ fontSize: '14px', display: 'block' }}>Verified Buyers Only</strong>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Please sign in to write a review. Only customers who have purchased this product can leave a verified review.
                </p>
              </div>
            </div>

            <Link href="/auth" className="btn btn-sm btn-primary">
              Sign In to Review
            </Link>
          </div>
        ) : isCheckingPurchase ? (
          /* Checking Order History */
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Verifying purchase history...
          </div>
        ) : !hasPurchased ? (
          /* User is logged in but hasn't bought this item */
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-lg)' }}>
            <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '14px', color: '#b45309' }}>Verified Purchase Required</strong>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                To maintain authentic and trustworthy reviews, only customers who have purchased this product can submit feedback. If you have already ordered this item, please make sure you are logged in with the same account used during checkout.
              </p>
            </div>
          </div>
        ) : (
          /* User IS a Verified Buyer - Show Submission Form */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(22, 163, 74, 0.1)', color: '#15803d', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>
                Verified Buyer: You ordered this product {purchaseDate ? `on ${formatDate(purchaseDate)}` : ''}. Share your genuine experience!
              </span>
            </div>

            <form onSubmit={handleSubmitReview}>
              {/* Star Rating Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Rating:</span>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{ color: star <= rating ? '#f59e0b' : 'var(--color-border-strong)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    title={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star size={22} fill={star <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>

              <textarea
                className="form-input"
                rows={3}
                placeholder="How was the product quality, fit, material, or delivery speed?"
                value={reviewBody}
                onChange={e => setReviewBody(e.target.value)}
                style={{ marginBottom: '12px', resize: 'vertical' }}
                id="review-textarea"
                required
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-sm"
                id="submit-review-btn"
              >
                {isSubmitting ? 'Publishing...' : 'Submit Verified Review'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
         REVIEWS LIST WITH INTERACTIVE ACTIONS & REACTIONS
         ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reviewList.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '24px' }}>
            No reviews yet. Verified buyers will see their feedback appear here!
          </p>
        ) : (
          reviewList.map(review => {
            const hasReacted = Boolean(userReactions[review.id]);
            const reactionType = userReactions[review.id];

            return (
              <div
                key={review.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary-10)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
                      {review.profile?.full_name?.charAt(0).toUpperCase() || <User size={16} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{review.profile?.full_name || 'Customer'}</span>
                        {review.is_verified_purchase && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'rgba(22, 163, 74, 0.1)',
                              color: '#15803d',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                            }}
                            title="Verified Purchase: Customer bought this item"
                          >
                            <ShieldCheck size={12} />
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {formatDate(review.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="stars" style={{ display: 'flex', color: '#f59e0b' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        size={14}
                        fill={s <= review.rating ? 'currentColor' : 'none'}
                        color={s <= review.rating ? 'currentColor' : 'var(--color-border)'}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Body */}
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '10px 0 14px' }}>
                  {review.body}
                </p>

                {/* Review Section Actions & Reactions Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '10px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Was this review helpful?</span>

                    {/* Helpful Button */}
                    <button
                      type="button"
                      onClick={() => handleReactToReview(review.id, 'helpful')}
                      disabled={hasReacted}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: reactionType === 'helpful' ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: reactionType === 'helpful' ? 'var(--color-primary-10)' : '#ffffff',
                        color: reactionType === 'helpful' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        cursor: hasReacted ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Vote helpful"
                    >
                      <ThumbsUp size={13} fill={reactionType === 'helpful' ? 'currentColor' : 'none'} />
                      <span>Helpful ({review.helpful_count || 0})</span>
                    </button>

                    {/* Love / Heart Button */}
                    <button
                      type="button"
                      onClick={() => handleReactToReview(review.id, 'heart')}
                      disabled={hasReacted}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: reactionType === 'heart' ? '1px solid #ef4444' : '1px solid var(--color-border)',
                        background: reactionType === 'heart' ? 'rgba(239, 68, 68, 0.08)' : '#ffffff',
                        color: reactionType === 'heart' ? '#ef4444' : 'var(--color-text-secondary)',
                        cursor: hasReacted ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Love this review"
                    >
                      <Heart size={13} fill={reactionType === 'heart' ? 'currentColor' : 'none'} />
                      <span>Love</span>
                    </button>
                  </div>

                  {hasReacted && (
                    <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>
                      ✓ Feedback recorded
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
