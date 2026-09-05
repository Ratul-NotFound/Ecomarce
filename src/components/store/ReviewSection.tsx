'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  ShieldCheck,
  ThumbsUp,
  Heart,
  Lock,
  AlertCircle,
  CheckCircle2,
  User,
  Truck,
  Edit3,
  Clock,
} from 'lucide-react';
import type { ProductReview } from '@/types';
import { formatDate } from '@/lib/utils/format';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/shared/ToastProvider';

interface ReviewSectionProps {
  productId: string;
  reviews?: ProductReview[];
}

interface EligibilityData {
  isLoading: boolean;
  canReview: boolean;
  eligibilityStatus:
    | 'delivered_eligible'
    | 'in_transit'
    | 'not_purchased'
    | 'already_reviewed'
    | 'unauthenticated';
  orderNumber?: string;
  orderStatus?: string;
  deliveredAt?: string;
  userReview?: ProductReview | null;
}

const RATING_LABELS: Record<number, string> = {
  1: '1 Star - Poor',
  2: '2 Stars - Fair',
  3: '3 Stars - Average',
  4: '4 Stars - Good',
  5: '5 Stars - Excellent!',
};

export default function ReviewSection({ productId, reviews = [] }: ReviewSectionProps) {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [reviewList, setReviewList] = useState<ProductReview[]>(reviews);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewBody, setReviewBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Eligibility state
  const [eligibility, setEligibility] = useState<EligibilityData>({
    isLoading: true,
    canReview: false,
    eligibilityStatus: 'unauthenticated',
  });

  // User Reaction tracking (stored locally so buttons reflect state)
  const [userReactions, setUserReactions] = useState<{ [reviewId: string]: 'helpful' | 'heart' }>({});

  // Check buyer delivery eligibility
  const checkEligibility = () => {
    if (!user) {
      setEligibility({
        isLoading: false,
        canReview: false,
        eligibilityStatus: 'unauthenticated',
      });
      return;
    }

    setEligibility(prev => ({ ...prev, isLoading: true }));

    fetch(`/api/reviews/check-purchase?productId=${productId}`)
      .then(r => r.json())
      .then(res => {
        setEligibility({
          isLoading: false,
          canReview: Boolean(res.canReview),
          eligibilityStatus: res.eligibilityStatus || (res.hasPurchased ? 'delivered_eligible' : 'not_purchased'),
          orderNumber: res.orderNumber,
          orderStatus: res.orderStatus,
          deliveredAt: res.deliveredAt,
          userReview: res.userReview || null,
        });

        if (res.userReview) {
          setRating(res.userReview.rating || 5);
          setReviewBody(res.userReview.body || '');
        }
      })
      .catch(() => {
        setEligibility({
          isLoading: false,
          canReview: false,
          eligibilityStatus: 'not_purchased',
        });
      });
  };

  useEffect(() => {
    checkEligibility();
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

    if (!eligibility.canReview && !eligibility.userReview) {
      showToast('Only verified buyers with a delivered order can submit a review', 'error');
      return;
    }

    if (!reviewBody.trim() || reviewBody.trim().length < 3) {
      showToast('Please provide at least 3 characters of feedback in your review', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          body: reviewBody.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      showToast('Thank you! Your verified review has been published.', 'success');

      // Update review in list
      setReviewList(prev => {
        const withoutOld = prev.filter(r => r.user_id !== user.id);
        return [data.review as ProductReview, ...withoutOld];
      });

      // Update eligibility state
      setEligibility(prev => ({
        ...prev,
        canReview: true,
        eligibilityStatus: 'already_reviewed',
        userReview: data.review as ProductReview,
      }));

      setIsEditMode(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating =
    reviewList.length > 0
      ? (reviewList.reduce((acc, r) => acc + r.rating, 0) / reviewList.length).toFixed(1)
      : '0.0';

  return (
    <div
      id="reviews"
      style={{ marginTop: '36px', borderTop: '1px solid var(--color-border)', paddingTop: '32px' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Customer Reviews & Ratings</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <div
              className="stars"
              style={{
                display: 'flex',
                color: reviewList.length > 0 ? '#f59e0b' : 'var(--color-text-muted)',
              }}
            >
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={18}
                  fill={
                    reviewList.length > 0 && Math.round(Number(avgRating)) >= star
                      ? 'currentColor'
                      : 'none'
                  }
                  stroke="currentColor"
                />
              ))}
            </div>
            <span style={{ fontWeight: 800, fontSize: '16px' }}>{avgRating}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
              ({reviewList.length} verified {reviewList.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#16a34a',
            background: 'rgba(22, 163, 74, 0.08)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={16} />
          <span>Delivered Buyer Verification Enforced</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
         PROFESSIONAL E-COMMERCE REVIEW ELIGIBILITY & SUBMISSION
         ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--color-surface-2)',
          padding: '24px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: '32px',
          border: '1px solid var(--color-border)',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>
          Rate & Review This Product
        </h3>

        {/* 1. Unauthenticated Visitor */}
        {!user ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '16px 20px',
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Lock size={22} color="var(--color-text-muted)" />
              <div>
                <strong style={{ fontSize: '14px', display: 'block' }}>
                  Delivered Buyers Only
                </strong>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Sign in with your buyer account to rate and review items you have received.
                </p>
              </div>
            </div>

            <Link href="/auth" className="btn btn-sm btn-primary">
              Sign In to Review
            </Link>
          </div>
        ) : eligibility.isLoading ? (
          /* 2. Loading State */
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Checking order and delivery records...
          </div>
        ) : eligibility.eligibilityStatus === 'in_transit' ? (
          /* 3. Order is In Transit / Processing / Shipped (Not Delivered Yet) */
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '18px 20px',
              background: 'rgba(37, 99, 235, 0.06)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <Truck size={24} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '14px', color: 'var(--color-primary)' }}>
                  Order #{eligibility.orderNumber} is on the way!
                </strong>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {eligibility.orderStatus?.replace('_', ' ')}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                To ensure authentic reviews based on actual product use, ratings unlock once your package has been physically delivered by our courier team. Thank you for your patience!
              </p>
            </div>
          </div>
        ) : eligibility.eligibilityStatus === 'not_purchased' ? (
          /* 4. Never Purchased */
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '16px 20px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '14px', color: '#b45309' }}>
                Verified Delivered Purchase Required
              </strong>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                To protect our community against artificial ratings, reviews can only be submitted by customers who have purchased and received this product. If you bought this under a different account or phone number, please sign in with that account.
              </p>
            </div>
          </div>
        ) : eligibility.eligibilityStatus === 'already_reviewed' && !isEditMode ? (
          /* 5. Already Reviewed (Show User Review Card with Edit Option) */
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(22, 163, 74, 0.1)',
                    color: '#15803d',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  <CheckCircle2 size={13} />
                  Your Verified Review
                </span>
                {eligibility.userReview?.created_at && (
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Posted on {formatDate(eligibility.userReview.created_at)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsEditMode(true)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                id="edit-review-btn"
              >
                <Edit3 size={13} />
                <span>Edit Review</span>
              </button>
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', color: '#f59e0b', marginBottom: '10px' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  size={16}
                  fill={s <= (eligibility.userReview?.rating || 5) ? 'currentColor' : 'none'}
                />
              ))}
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {eligibility.userReview?.body}
            </p>
          </div>
        ) : (
          /* 6. Delivered & Eligible to Submit or Edit Review */
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(22, 163, 74, 0.1)',
                color: '#15803d',
                marginBottom: '18px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>
                  ✓ Verified Delivery: Order #{eligibility.orderNumber} delivered on{' '}
                  {eligibility.deliveredAt ? formatDate(eligibility.deliveredAt) : 'recently'}.
                </span>
              </div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#15803d',
                    textDecoration: 'underline',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitReview}>
              {/* Interactive Star Rating Selector with descriptive tooltips */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '6px' }}>
                  Overall Rating *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map(star => {
                      const isFilled = (hoverRating || rating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          style={{
                            color: isFilled ? '#f59e0b' : 'var(--color-border-strong)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            transition: 'transform 0.1s ease',
                          }}
                          aria-label={`Rate ${star} star`}
                        >
                          <Star size={26} fill={isFilled ? 'currentColor' : 'none'} />
                        </button>
                      );
                    })}
                  </div>

                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: (hoverRating || rating) >= 4 ? 'var(--color-success)' : 'var(--color-primary)',
                      marginLeft: '6px',
                    }}
                  >
                    {RATING_LABELS[hoverRating || rating]}
                  </span>
                </div>
              </div>

              {/* Review Textarea */}
              <div style={{ marginBottom: '14px' }}>
                <label
                  htmlFor="review-textarea"
                  style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: '6px' }}
                >
                  Your Review & Feedback *
                </label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="How was the product quality, materials, durability, and packaging after delivery?"
                  value={reviewBody}
                  onChange={e => setReviewBody(e.target.value)}
                  style={{ resize: 'vertical', fontSize: '13px', lineHeight: 1.5 }}
                  id="review-textarea"
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  id="submit-review-btn"
                  style={{ padding: '10px 22px', fontWeight: 700 }}
                >
                  {isSubmitting
                    ? 'Publishing Review...'
                    : isEditMode
                    ? 'Update Verified Review'
                    : 'Submit Verified Review'}
                </button>

                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
         CUSTOMER REVIEWS LIST WITH REAL HELPFUL REACTIONS
         ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reviewList.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px 20px',
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--color-border)',
            }}
          >
            <Star size={28} color="var(--color-text-muted)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 }}>
              No reviews yet for this product. Customers who have received their delivery will have their genuine reviews displayed here!
            </p>
          </div>
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
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--color-primary-10)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '14px',
                      }}
                    >
                      {review.profile?.full_name?.charAt(0).toUpperCase() || <User size={16} />}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
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
                            title="Verified Purchase: Customer received and accepted delivery"
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
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    margin: '10px 0 14px',
                  }}
                >
                  {review.body}
                </p>

                {/* Review Section Actions & Reactions Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '10px',
                    marginTop: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Was this review helpful?
                    </span>

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
                        border:
                          reactionType === 'helpful'
                            ? '1px solid var(--color-primary)'
                            : '1px solid var(--color-border)',
                        background:
                          reactionType === 'helpful' ? 'var(--color-primary-10)' : '#ffffff',
                        color:
                          reactionType === 'helpful'
                            ? 'var(--color-primary)'
                            : 'var(--color-text-secondary)',
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
                        border:
                          reactionType === 'heart'
                            ? '1px solid #ef4444'
                            : '1px solid var(--color-border)',
                        background:
                          reactionType === 'heart' ? 'rgba(239, 68, 68, 0.08)' : '#ffffff',
                        color:
                          reactionType === 'heart' ? '#ef4444' : 'var(--color-text-secondary)',
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
