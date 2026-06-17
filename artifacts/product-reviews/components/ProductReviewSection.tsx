'use client';

import { useState } from 'react';
import { ProductReviewCard } from './ProductReviewCard';
import { ProductReviewForm } from './ProductReviewForm';
import { Review, ProductReviewStats } from '../schema';

interface ProductReviewSectionProps {
  productId: string;
  stats?: ProductReviewStats;
  reviews: Review[];
  currentUserId?: string;
  onSubmitReview?: (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onHelpful?: (reviewId: number) => void;
  onNotHelpful?: (reviewId: number) => void;
  onFlag?: (reviewId: number, reason: string) => void;
}

export function ProductReviewSection({
  productId,
  stats,
  reviews,
  currentUserId,
  onSubmitReview,
  onHelpful,
  onNotHelpful,
  onFlag,
}: ProductReviewSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'helpful') {
      return b.helpful - a.helpful;
    }
    return b.rating - a.rating;
  });

  const approvedReviews = sortedReviews.filter((r) => r.status === 'approved');

  return (
    <section className="my-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      {/* Rating Summary */}
      {stats && (
        <div className="mb-6 p-4 bg-white rounded border border-gray-200">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-4xl font-bold text-gray-900">
                {(stats.averageRating * 0.01).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">
                Based on {stats.totalReviews} reviews
              </div>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count =
                  stats.ratingDistribution &&
                  JSON.parse(stats.ratingDistribution)[rating];
                const percentage =
                  stats.totalReviews > 0 ? ((count || 0) / stats.totalReviews) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600 w-8">{rating}★</span>
                    <div className="flex-1 bg-gray-200 rounded h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {count || 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {currentUserId && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            >
              {showForm ? 'Cancel' : 'Write a Review'}
            </button>
          )}
        </div>
      )}

      {/* Review Form */}
      {showForm && currentUserId && (
        <ProductReviewForm
          productId={productId}
          userId={currentUserId}
          onSubmit={(review) => {
            onSubmitReview?.(review);
            setShowForm(false);
          }}
        />
      )}

      {/* Sort */}
      <div className="flex gap-2 mb-4">
        {(['recent', 'helpful', 'rating'] as const).map((sort) => (
          <button
            key={sort}
            onClick={() => setSortBy(sort)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              sortBy === sort
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {sort === 'recent' ? 'Most Recent' : sort === 'helpful' ? 'Most Helpful' : 'Highest Rated'}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div>
        {approvedReviews.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No reviews yet. Be the first!</p>
        ) : (
          approvedReviews.map((review) => (
            <ProductReviewCard
              key={review.id}
              review={review}
              onHelpful={onHelpful}
              onNotHelpful={onNotHelpful}
              onFlag={onFlag}
            />
          ))
        )}
      </div>
    </section>
  );
}
