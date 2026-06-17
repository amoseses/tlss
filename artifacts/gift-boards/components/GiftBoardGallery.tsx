'use client';

import { useState } from 'react';
import { Heart, Share2, Upload } from 'lucide-react';
import { GiftBoard, GiftBoardItem, BoardImage } from '../schema';
import { GiftBoardCard } from './GiftBoardCard';

interface GiftBoardGalleryProps {
  boards: (GiftBoard & { items: GiftBoardItem[]; images: BoardImage[] })[];
  currentUserId?: string;
  onLike?: (boardId: number) => void;
  onShare?: (boardId: number) => void;
  onAddImage?: (boardId: number, imageUrl: string) => void;
}

export function GiftBoardGallery({
  boards,
  currentUserId,
  onLike,
  onShare,
  onAddImage,
}: GiftBoardGalleryProps) {
  const [hoveredBoardId, setHoveredBoardId] = useState<number | null>(null);
  const [likedBoards, setLikedBoards] = useState<Set<number>>(new Set());

  const handleLike = (boardId: number) => {
    setLikedBoards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(boardId)) {
        newSet.delete(boardId);
      } else {
        newSet.add(boardId);
      }
      return newSet;
    });
    onLike?.(boardId);
  };

  return (
    <div className="w-full py-8">
      {/* Masonry Grid (Pinterest-style) */}
      <div
        className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
        style={{
          columnGap: '1rem',
        }}
      >
        {boards.map((board) => (
          <div
            key={board.id}
            className="mb-4 break-inside-avoid"
            onMouseEnter={() => setHoveredBoardId(board.id)}
            onMouseLeave={() => setHoveredBoardId(null)}
          >
            <GiftBoardCard
              board={board}
              isHovered={hoveredBoardId === board.id}
              isLiked={likedBoards.has(board.id)}
              onLike={() => handleLike(board.id)}
              onShare={() => onShare?.(board.id)}
            />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {boards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No gift boards yet</p>
          {currentUserId && (
            <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">
              Create Your First Board
            </button>
          )}
        </div>
      )}
    </div>
  );
}
