import { pgTable, text, serial, timestamp, varchar, boolean, index, integer } from 'drizzle-orm/pg-core';

/**
 * Gift Boards Schema
 * Enables users to create, share, and like Pinterest-style gift collections
 */

export const giftBoards = pgTable(
  'gift_boards',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    coverImage: varchar('cover_image', { length: 500 }), // URL to main board image
    isPublic: boolean('is_public').default(true),
    isPin: boolean('is_pin').default(false), // for Pinterest-like "pinned" boards
    likeCount: integer('like_count').default(0),
    shareCount: integer('share_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    userIdIdx: index('gift_boards_user_id_idx').on(table.userId),
    isPublicIdx: index('gift_boards_is_public_idx').on(table.isPublic),
    createdAtIdx: index('gift_boards_created_at_idx').on(table.createdAt),
  })
);

/**
 * Gift Board Items
 * Products or gifts added to a board
 */
export const giftBoardItems = pgTable(
  'gift_board_items',
  {
    id: serial('id').primaryKey(),
    boardId: integer('board_id').notNull(),
    productId: varchar('product_id', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }),
    imageUrl: varchar('image_url', { length: 500 }),
    price: integer('price'), // in cents
    note: text('note'), // user's personal note about why this gift
    position: integer('position'), // for ordering in grid
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    boardIdIdx: index('gift_board_items_board_id_idx').on(table.boardId),
    productIdIdx: index('gift_board_items_product_id_idx').on(table.productId),
  })
);

/**
 * Board Likes/Favorites
 * Track which users like which boards (Pinterest-style)
 */
export const boardLikes = pgTable(
  'board_likes',
  {
    id: serial('id').primaryKey(),
    boardId: integer('board_id').notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    boardIdIdx: index('board_likes_board_id_idx').on(table.boardId),
    userIdIdx: index('board_likes_user_id_idx').on(table.userId),
  })
);

/**
 * Board Images
 * Multiple images per board for gallery/masonry layout
 */
export const boardImages = pgTable(
  'board_images',
  {
    id: serial('id').primaryKey(),
    boardId: integer('board_id').notNull(),
    imageUrl: varchar('image_url', { length: 500 }).notNull(),
    altText: varchar('alt_text', { length: 255 }),
    uploadedBy: varchar('uploaded_by', { length: 255 }).notNull(),
    position: integer('position'), // for ordering in gallery
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    boardIdIdx: index('board_images_board_id_idx').on(table.boardId),
  })
);

export type GiftBoard = typeof giftBoards.$inferSelect;
export type NewGiftBoard = typeof giftBoards.$inferInsert;
export type GiftBoardItem = typeof giftBoardItems.$inferSelect;
export type NewGiftBoardItem = typeof giftBoardItems.$inferInsert;
export type BoardLike = typeof boardLikes.$inferSelect;
export type BoardImage = typeof boardImages.$inferSelect;
