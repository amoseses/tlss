import { pgTable, text, serial, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Admin Users & Roles
 * Support multiple admins with role-based access control
 */

export const adminRoles = {
  OWNER: 'owner', // Full access, can manage other admins
  ADMIN: 'admin', // Can edit products, view orders, manage AutoGift
  EDITOR: 'editor', // Can only edit products, no orders/admin access
} as const;

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).default(adminRoles.EDITOR), // owner, admin, editor
  isActive: boolean('is_active').default(true),
  invitedBy: varchar('invited_by', { length: 255 }), // user_id of who invited them
  invitedAt: timestamp('invited_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Admin Audit Log
 * Track all admin actions for transparency and compliance
 */
export const adminAuditLog = pgTable('admin_audit_log', {
  id: serial('id').primaryKey(),
  adminId: varchar('admin_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 255 }).notNull(), // e.g., "create_product", "edit_order", "invite_admin"
  entityType: varchar('entity_type', { length: 100 }), // e.g., "product", "order", "admin_user"
  entityId: varchar('entity_id', { length: 255 }),
  changes: text('changes'), // JSON: {field: {old, new}}
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type AuditLogEntry = typeof adminAuditLog.$inferSelect;
export type NewAuditLogEntry = typeof adminAuditLog.$inferInsert;
