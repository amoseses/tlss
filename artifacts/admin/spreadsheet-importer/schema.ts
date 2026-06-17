import { pgTable, text, serial, timestamp, varchar, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

/**
 * Spreadsheet Import Jobs
 * Track admin uploads for product batch import
 */
export const importJobs = pgTable('import_jobs', {
  id: serial('id').primaryKey(),
  adminId: varchar('admin_id', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // pending, processing, completed, failed
  totalRows: integer('total_rows').default(0),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  errorLog: jsonb('error_log'), // Array of {row, error}
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

/**
 * Import Job Items
 * Individual product extraction results from URLs
 */
export const importJobItems = pgTable('import_job_items', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull(),
  rowIndex: integer('row_index').notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'), // pending, extracted, approved, rejected, failed
  extractedData: jsonb('extracted_data'), // {title, price, description, images[], ...}
  adminNotes: text('admin_notes'),
  createdProductId: varchar('created_product_id', { length: 255 }), // after approval
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at'),
});

export type ImportJob = typeof importJobs.$inferSelect;
export type NewImportJob = typeof importJobs.$inferInsert;
export type ImportJobItem = typeof importJobItems.$inferSelect;
export type NewImportJobItem = typeof importJobItems.$inferInsert;
