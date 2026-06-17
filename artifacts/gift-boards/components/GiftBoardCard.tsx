'use client';

import { Heart, Share2 } from 'lucide-react';
import { GiftBoard, GiftBoardItem, BoardImage } from '../schema';
import Image from 'next/image';

interface GiftBoardCardProps {
  board: GiftBoard & { items: GiftBoardItem[]; images: BoardImage[] };
  isHovered: boolean;
  isLiked: boolean;
  onLike: () => void;
  onShare: () => void;
}

export function GiftBoardCard({
  board,
  isHovered,
  isLiked,
  onLike,
  onShare,
}: GiftBoardCardProps) {
  const displayImage = board.coverImage || board.images?.[0]?.imageUrl;

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-100 shadow-md hover:shadow-lg transition group">
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-200">
        {displayImage && (
          <Image
            src={displayImage}
            alt={board.title}
            fill
            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
          />
        )}

        {/* Overlay on hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col items-center justify-center gap-3">
            <button
              onClick={onLike}
              className={`flex items-center gap-2 px-4 py-2 rounded text-white transition ${
                isLiked
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-700 hover:bg-gray-800'
              }`}
            >
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
              Like
            </button>
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-4 py-2 rounded bg-gray-700 hover:bg-gray-800 text-white transition"
            >
              <Share2 size={18} />
              Share
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 truncate">{board.title}</h3>
        <p className="text-xs text-gray-600 line-clamp-2">{board.description}</p>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>{board.items?.length || 0} items</span>
          <span>{board.likeCount} likes</span>
        </div>
      </div>
    </div>
  );
}
