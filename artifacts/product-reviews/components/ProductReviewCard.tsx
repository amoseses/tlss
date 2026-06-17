'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Flag } from 'lucide-react';
import { Review } from '../schema';

interface ProductReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: number) => void;
  onNotHelpful?: (reviewId: number) => void;
  onFlag?: (reviewId: number, reason: string) => void;
}

export function ProductReviewCard({
  review,
  onHelpful,
  onNotHelpful,
  onFlag,
}: ProductReviewCardProps) {
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${
              i < rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 fill-gray-300'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {renderStars(review.rating)}
            {review.isVerifiedPurchase && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Verified Purchase
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900">{review.title}</h4>
        </div>
        <button
          onClick={() => setShowFlagDialog(true)}
          className="text-gray-400 hover:text-red-500 transition"
          title="Report review"
        >
          <Flag size={16} />
        </button>
      </div>

      {/* Comment */}
      <p className="text-gray-700 text-sm mb-3">{review.comment}</p>

      {/* Footer: Date and Helpful votes */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
        <div className="flex gap-3">
          <button
            onClick={() => onHelpful?.(review.id)}
            className="flex items-center gap-1 hover:text-gray-700 transition"
          >
            <ThumbsUp size={14} /> {review.helpful}
          </button>
          <button
            onClick={() => onNotHelpful?.(review.id)}
            className="flex items-center gap-1 hover:text-gray-700 transition"
          >
            <ThumbsDown size={14} /> {review.notHelpful}
          </button>
        </div>
      </div>

      {/* Flag Dialog */}
      {showFlagDialog && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Why are you reporting this review?"
            className="w-full text-sm p-2 border border-red-300 rounded mb-2"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onFlag?.(review.id, flagReason);
                setShowFlagDialog(false);
                setFlagReason('');
              }}
              className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Report
            </button>
            <button
              onClick={() => setShowFlagDialog(false)}
              className="text-xs bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
