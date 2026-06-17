import { pgTable, text, serial, timestamp, integer, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Product Reviews Schema
 * Enables users to rate and review products with text feedback
 */

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    productId: varchar('product_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    rating: integer('rating').notNull(), // 1-5 stars
    title: varchar('title', { length: 255 }),
    comment: text('comment'),
    isVerifiedPurchase: boolean('is_verified_purchase').default(false),
    helpful: integer('helpful').default(0), // count of helpful votes
    notHelpful: integer('not_helpful').default(0),
    status: varchar('status', { length: 50 }).default('pending'), // pending, approved, rejected, flagged
    flaggedReason: text('flagged_reason'), // moderation reason if flagged
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    productIdIdx: index('reviews_product_id_idx').on(table.productId),
    userIdIdx: index('reviews_user_id_idx').on(table.userId),
    statusIdx: index('reviews_status_idx').on(table.status),
    ratingIdx: index('reviews_rating_idx').on(table.rating),
  })
);

/**
 * Aggregated product review stats
 * Denormalized for fast queries on product cards
 */
export const productReviewStats = pgTable(
  'product_review_stats',
  {
    productId: varchar('product_id', { length: 255 }).primaryKey(),
    averageRating: integer('average_rating'), // stored as 0-500 (multiply by 0.01 for display)
    totalReviews: integer('total_reviews').default(0),
    ratingDistribution: varchar('rating_distribution', { length: 255 }), // JSON: {"1": 10, "2": 5, ...}
    verifiedPurchaseCount: integer('verified_purchase_count').default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
  }
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type ProductReviewStats = typeof productReviewStats.$inferSelect;
