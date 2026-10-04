-- ============================================================
-- GIVIT COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  gifting_cohort TEXT,
  default_reminder_lead_days INTEGER DEFAULT 35,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'seller')),
  is_banned BOOLEAN DEFAULT false,
  stripe_connect_account_id TEXT,
  stripe_connect_charges_enabled BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_default_payment_method_id TEXT,
  gift_automation_enabled BOOLEAN DEFAULT false,
  concierge_onboarding_completed BOOLEAN DEFAULT false,
  ship_from_line1 TEXT,
  ship_from_line2 TEXT,
  ship_from_city TEXT,
  ship_from_state TEXT,
  ship_from_zip TEXT,
  ship_from_country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cents INTEGER NOT NULL,
  min_order_qty INTEGER DEFAULT 1,
  stock INTEGER DEFAULT 0,
  weight_oz NUMERIC(8,2),
  is_published BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  images JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  affiliate_url TEXT,
  retailer TEXT,
  brand TEXT,
  gift_match_score INTEGER DEFAULT 0,
  interests TEXT[] DEFAULT '{}',
  occasions TEXT[] DEFAULT '{}',
  recipients TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  why_we_picked_it TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PRODUCT RATING STATS
CREATE TABLE IF NOT EXISTS product_rating_stats (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  average_rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PRODUCT SALES STATS
CREATE TABLE IF NOT EXISTS product_sales_stats (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  total_sold INTEGER DEFAULT 0,
  revenue_cents BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CARTS
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CART ITEMS
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid_pending_fulfillment', 'ordered', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0,
  stripe_payment_intent_id TEXT,
  ship_to_name TEXT,
  ship_to_line1 TEXT,
  ship_to_line2 TEXT,
  ship_to_city TEXT,
  ship_to_state TEXT,
  ship_to_zip TEXT,
  ship_to_country TEXT DEFAULT 'US',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  product_name TEXT,
  external_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. GIFT RECIPIENTS (user's saved people)
CREATE TABLE IF NOT EXISTS gift_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  email TEXT,
  phone TEXT,
  default_budget_cents INTEGER DEFAULT 5000,
  interests TEXT[] DEFAULT '{}',
  avoid_terms TEXT[] DEFAULT '{}',
  notes TEXT,
  ship_to_name TEXT,
  ship_to_line1 TEXT,
  ship_to_line2 TEXT,
  ship_to_city TEXT,
  ship_to_state TEXT,
  ship_to_zip TEXT,
  ship_to_country TEXT DEFAULT 'US',
  delivery_preference TEXT DEFAULT 'ship' CHECK (delivery_preference IN ('ship', 'email', 'either')),
  automation_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. GIFT OCCASIONS
CREATE TABLE IF NOT EXISTS gift_occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES gift_recipients(id) ON DELETE CASCADE,
  occasion TEXT NOT NULL,
  occasion_date DATE NOT NULL,
  repeats_yearly BOOLEAN DEFAULT true,
  approval_lead_days INTEGER DEFAULT 10,
  shipping_buffer_days INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. GIFT NOTIFICATIONS
CREATE TABLE IF NOT EXISTS gift_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES gift_recipients(id) ON DELETE SET NULL,
  occasion_id UUID REFERENCES gift_occasions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('push', 'email', 'sms', 'in_app')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'approved', 'skipped', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. GIFT APPROVALS
CREATE TABLE IF NOT EXISTS gift_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES gift_recipients(id) ON DELETE SET NULL,
  occasion_id UUID REFERENCES gift_occasions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'needs_approval', 'approved', 'paid_pending_fulfillment', 'ordered', 'shipped', 'delivered', 'regenerating', 'skipped', 'cancelled', 'payment_failed')),
  headline TEXT,
  rationale TEXT,
  card_message TEXT,
  approval_token TEXT,
  approved_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  total_cents INTEGER DEFAULT 0,
  estimated_delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. GIFT APPROVAL ITEMS
CREATE TABLE IF NOT EXISTS gift_approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES gift_approvals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL DEFAULT 'gift' CHECK (item_type IN ('gift', 'card', 'flowers', 'experience', 'shipping', 'service')),
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER DEFAULT 0,
  external_url TEXT,
  fulfillment_status TEXT DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'ordered', 'fulfilled', 'failed', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. GIFT FULFILLMENT TASKS
CREATE TABLE IF NOT EXISTS gift_fulfillment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES gift_approvals(id) ON DELETE CASCADE,
  item_id UUID REFERENCES gift_approval_items(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('seller_order', 'affiliate_checkout', 'card_writer', 'florist', 'ticket_transfer', 'shipment')),
  provider TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'blocked', 'complete', 'failed')),
  run_after TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. FEEDBACK
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. AI LEARNING (user preferences for gift AI)
CREATE TABLE IF NOT EXISTS ai_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  weight NUMERIC(4,2) DEFAULT 0,
  feedback TEXT CHECK (feedback IN ('positive', 'negative')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_slug)
);

-- 19. PRODUCT SUBMISSIONS (customer submitted)
CREATE TABLE IF NOT EXISTS product_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  name TEXT,
  brand TEXT,
  price_cents INTEGER,
  description TEXT,
  category TEXT,
  image_url TEXT,
  ai_summary TEXT,
  scraped_metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 20. ANALYTICS EVENTS
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. USER ADDRESSES
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT DEFAULT 'US',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 22. USER PAYMENT METHODS
CREATE TABLE IF NOT EXISTS user_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT,
  card_last4 TEXT,
  card_brand TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, stripe_payment_method_id)
);

-- 23. WISHLIST
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_slug TEXT,
  product_name TEXT,
  product_price_cents INTEGER,
  product_image TEXT,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 24. GIFT BOARDS
CREATE TABLE IF NOT EXISTS gift_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_public BOOLEAN DEFAULT true,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25. GIFT BOARD ITEMS
CREATE TABLE IF NOT EXISTS gift_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES gift_boards(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  image_url TEXT,
  caption TEXT,
  external_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 26. SECRET SANTA GROUPS
CREATE TABLE IF NOT EXISTS secret_santa_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occasion TEXT,
  budget_cents INTEGER,
  event_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'shuffled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 27. SECRET SANTA PARTICIPANTS
-- One row per person in a group -- name/email/wishlist_notes/interests are
-- all readable by the organizer (they invited these people, no secrecy
-- there). Deliberately does NOT hold who gives to whom -- see
-- secret_santa_assignments below for why that lives in its own table.
CREATE TABLE IF NOT EXISTS secret_santa_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES secret_santa_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  wishlist_notes TEXT,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (group_id, email)
);

-- 28. SECRET SANTA ASSIGNMENTS
-- The actual "who gives to whom" mapping -- kept in its own table, RLS
-- enabled with NO policies at all (see below), so it's reachable only
-- through shuffle_secret_santa_group() / get_my_secret_santa_recipient()
-- -- not even the organizer can read it via a direct query. That's
-- deliberate: real Secret Santa staying a secret from the organizer too is
-- the actual point, and column-level hiding isn't something RLS can do on
-- a shared table, so the mapping needed a table of its own to lock down.
CREATE TABLE IF NOT EXISTS secret_santa_assignments (
  group_id UUID NOT NULL REFERENCES secret_santa_groups(id) ON DELETE CASCADE,
  giver_id UUID NOT NULL REFERENCES secret_santa_participants(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES secret_santa_participants(id) ON DELETE CASCADE,
  PRIMARY KEY (giver_id)
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_rating_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_approval_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_fulfillment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_santa_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_santa_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_santa_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CATEGORIES
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PRODUCTS
DROP POLICY IF EXISTS "Published products are viewable by everyone" ON products;
CREATE POLICY "Published products are viewable by everyone" ON products FOR SELECT USING (is_published = true OR is_approved = true);
DROP POLICY IF EXISTS "Admins can manage all products" ON products;
CREATE POLICY "Admins can manage all products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Sellers can manage their own products" ON products;
CREATE POLICY "Sellers can manage their own products" ON products FOR ALL USING (auth.uid() = seller_id);

-- ORDERS
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- GIFT RECIPIENTS
DROP POLICY IF EXISTS "Users can manage their own recipients" ON gift_recipients;
CREATE POLICY "Users can manage their own recipients" ON gift_recipients FOR ALL USING (auth.uid() = user_id);

-- GIFT OCCASIONS
DROP POLICY IF EXISTS "Users can manage their own occasions" ON gift_occasions;
CREATE POLICY "Users can manage their own occasions" ON gift_occasions FOR ALL USING (auth.uid() = user_id);

-- GIFT NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON gift_notifications;
CREATE POLICY "Users can view their own notifications" ON gift_notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own notifications" ON gift_notifications;
CREATE POLICY "Users can create their own notifications" ON gift_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notifications" ON gift_notifications;
CREATE POLICY "Users can update their own notifications" ON gift_notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage all notifications" ON gift_notifications;
CREATE POLICY "Admins can manage all notifications" ON gift_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- GIFT APPROVALS
DROP POLICY IF EXISTS "Users can manage their own approvals" ON gift_approvals;
CREATE POLICY "Users can manage their own approvals" ON gift_approvals FOR ALL USING (auth.uid() = user_id);

-- FEEDBACK
DROP POLICY IF EXISTS "Anyone can insert feedback" ON feedback;
CREATE POLICY "Anyone can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view feedback" ON feedback;
CREATE POLICY "Admins can view feedback" ON feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- AI LEARNING
DROP POLICY IF EXISTS "Users can manage their own learning" ON ai_learning;
CREATE POLICY "Users can manage their own learning" ON ai_learning FOR ALL USING (auth.uid() = user_id);

-- PRODUCT SUBMISSIONS
DROP POLICY IF EXISTS "Anyone can submit products" ON product_submissions;
CREATE POLICY "Anyone can submit products" ON product_submissions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users can view their own submissions" ON product_submissions;
CREATE POLICY "Users can view their own submissions" ON product_submissions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage submissions" ON product_submissions;
CREATE POLICY "Admins can manage submissions" ON product_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ANALYTICS
DROP POLICY IF EXISTS "Admins can view analytics" ON analytics_events;
CREATE POLICY "Admins can view analytics" ON analytics_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Anyone can insert analytics" ON analytics_events;
CREATE POLICY "Anyone can insert analytics" ON analytics_events FOR INSERT WITH CHECK (true);

-- USER ADDRESSES
DROP POLICY IF EXISTS "Users can manage their own addresses" ON user_addresses;
CREATE POLICY "Users can manage their own addresses" ON user_addresses FOR ALL USING (auth.uid() = user_id);

-- USER PAYMENT METHODS
DROP POLICY IF EXISTS "Users can manage their own payment methods" ON user_payment_methods;
CREATE POLICY "Users can manage their own payment methods" ON user_payment_methods FOR ALL USING (auth.uid() = user_id);

-- WISHLIST
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON wishlist_items;
CREATE POLICY "Users can manage their own wishlist" ON wishlist_items FOR ALL USING (auth.uid() = user_id);

-- GIFT BOARDS (tables/policies kept for existing rows -- the app no longer
-- links to /boards, see the PR that removed the page, but these were never
-- dropped from the live database)
DROP POLICY IF EXISTS "Public boards are viewable by everyone" ON gift_boards;
CREATE POLICY "Public boards are viewable by everyone" ON gift_boards FOR SELECT USING (is_public = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their own boards" ON gift_boards;
CREATE POLICY "Users can manage their own boards" ON gift_boards FOR ALL USING (auth.uid() = user_id);

-- GIFT BOARD ITEMS
DROP POLICY IF EXISTS "Board items are viewable with board" ON gift_board_items;
CREATE POLICY "Board items are viewable with board" ON gift_board_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM gift_boards WHERE id = board_id AND (is_public = true OR user_id = auth.uid()))
);
DROP POLICY IF EXISTS "Users can manage their own board items" ON gift_board_items;
CREATE POLICY "Users can manage their own board items" ON gift_board_items FOR ALL USING (
  EXISTS (SELECT 1 FROM gift_boards WHERE id = board_id AND user_id = auth.uid())
);

-- SECRET SANTA GROUPS / PARTICIPANTS -- these two tables' policies each
-- need to check the OTHER table (a group is visible to its participants;
-- a participant row is visible to its group's organizer), and a plain
-- inline EXISTS subquery on the other table re-triggers ITS row-level
-- security too. That's a genuine cycle, not just a performance concern --
-- selecting from secret_santa_groups evaluates its policy, which queries
-- secret_santa_participants, which evaluates ITS policy, which queries
-- secret_santa_groups again, forever, until Postgres gives up with
-- "infinite recursion detected in policy" (42P17) instead of any rows.
-- SECURITY DEFINER functions break the cycle: the query inside a
-- SECURITY DEFINER function's body runs as the function owner, bypassing
-- RLS on the table it touches, so calling one from a policy checks the
-- other table WITHOUT re-entering that table's own policy.
CREATE OR REPLACE FUNCTION is_secret_santa_participant(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM secret_santa_participants sp WHERE sp.group_id = p_group_id AND sp.user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION is_secret_santa_organizer(p_group_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM secret_santa_groups g WHERE g.id = p_group_id AND g.organizer_id = p_user_id);
$$;

-- SECRET SANTA GROUPS -- visible to the organizer and to anyone who is a
-- participant (so a giver can see the group's name/occasion/budget/status),
-- but only the organizer can create/edit/delete it.
DROP POLICY IF EXISTS "Members can view their group" ON secret_santa_groups;
CREATE POLICY "Members can view their group" ON secret_santa_groups FOR SELECT USING (
  organizer_id = auth.uid() OR is_secret_santa_participant(id, auth.uid())
);
DROP POLICY IF EXISTS "Organizer can create groups" ON secret_santa_groups;
CREATE POLICY "Organizer can create groups" ON secret_santa_groups FOR INSERT WITH CHECK (organizer_id = auth.uid());
DROP POLICY IF EXISTS "Organizer can update their group" ON secret_santa_groups;
CREATE POLICY "Organizer can update their group" ON secret_santa_groups FOR UPDATE USING (organizer_id = auth.uid());
DROP POLICY IF EXISTS "Organizer can delete their group" ON secret_santa_groups;
CREATE POLICY "Organizer can delete their group" ON secret_santa_groups FOR DELETE USING (organizer_id = auth.uid());

-- SECRET SANTA PARTICIPANTS -- a participant sees their own row (so they
-- can edit their own wishlist); the organizer sees every participant row
-- in groups they organize (name/email/wishlist/interests -- they invited
-- these people). Neither of those grants access to who's assigned to
-- whom, because that isn't stored on this table at all.
DROP POLICY IF EXISTS "See your own participant row" ON secret_santa_participants;
CREATE POLICY "See your own participant row" ON secret_santa_participants FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Organizer can view participants in their group" ON secret_santa_participants;
CREATE POLICY "Organizer can view participants in their group" ON secret_santa_participants FOR SELECT USING (
  is_secret_santa_organizer(group_id, auth.uid())
);
DROP POLICY IF EXISTS "Organizer can add participants" ON secret_santa_participants;
CREATE POLICY "Organizer can add participants" ON secret_santa_participants FOR INSERT WITH CHECK (
  is_secret_santa_organizer(group_id, auth.uid())
);
DROP POLICY IF EXISTS "Organizer can remove participants" ON secret_santa_participants;
CREATE POLICY "Organizer can remove participants" ON secret_santa_participants FOR DELETE USING (
  is_secret_santa_organizer(group_id, auth.uid())
);
DROP POLICY IF EXISTS "Participants can update their own wishlist" ON secret_santa_participants;
CREATE POLICY "Participants can update their own wishlist" ON secret_santa_participants FOR UPDATE USING (user_id = auth.uid());

-- SECRET SANTA ASSIGNMENTS -- deliberately zero policies below. RLS is
-- enabled with no CREATE POLICY at all for this table, which means every
-- role (including the organizer, including an admin using their own
-- anon/authenticated session) gets zero rows back from a direct query,
-- full stop. shuffle_secret_santa_group() and get_my_secret_santa_recipient()
-- are SECURITY DEFINER, so they run with elevated privileges that bypass
-- RLS entirely -- they are the only way in, and each does its own
-- authorization check (organizer-only to write; caller-can-only-read-their-
-- own-assignment to read) before touching anything.

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'customer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ADMIN HELPER: Make first user admin
-- ============================================================
-- Run this after your first signup:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- ============================================================
-- ANALYTICS VIEWS
-- ============================================================

-- Daily active users
CREATE OR REPLACE VIEW analytics_dau AS
SELECT DATE(created_at) as day, COUNT(DISTINCT user_id) as dau
FROM analytics_events
WHERE user_id IS NOT NULL
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Top products by views
CREATE OR REPLACE VIEW analytics_top_products AS
SELECT p.id, p.name, p.slug, COUNT(*) as views
FROM analytics_events ae
JOIN products p ON p.id = ae.product_id
WHERE ae.event_type = 'product_view'
GROUP BY p.id, p.name, p.slug
ORDER BY views DESC;

-- Revenue by day
CREATE OR REPLACE VIEW analytics_revenue AS
SELECT DATE(created_at) as day, COUNT(*) as orders, SUM(total_cents) as revenue_cents
FROM orders
WHERE status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(created_at)
ORDER BY day DESC;

-- Product submissions migration helpers for existing installs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE product_submissions ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE product_submissions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE product_submissions ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE product_submissions ADD COLUMN IF NOT EXISTS scraped_metadata JSONB DEFAULT '{}'::jsonb;
-- Optional YouTube link shown as a "Watch video" redirect on the product card.
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
-- Manual override for marketplace display order, editable from the admin
-- Rankings tab. Without these columns, saving a rank edit there fails
-- (PostgREST rejects unknown columns), so the admin UI and the live
-- catalog silently drift apart.
ALTER TABLE products ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_rank INTEGER;

-- Product submissions pending
CREATE OR REPLACE VIEW analytics_pending_submissions AS
SELECT COUNT(*) as pending_count
FROM product_submissions
WHERE status = 'pending';

-- ============================================================
-- GIFT BOARD LIKES + COMMENTS (run this block to add board
-- likes/comments support; safe to re-run, all statements are
-- idempotent via IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS gift_board_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES gift_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS gift_board_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES gift_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gift_board_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_board_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view board likes" ON gift_board_likes;
CREATE POLICY "Anyone can view board likes" ON gift_board_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can like boards" ON gift_board_likes;
CREATE POLICY "Users can like boards" ON gift_board_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove their own like" ON gift_board_likes;
CREATE POLICY "Users can remove their own like" ON gift_board_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view board comments" ON gift_board_comments;
CREATE POLICY "Anyone can view board comments" ON gift_board_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can comment on boards" ON gift_board_comments;
CREATE POLICY "Users can comment on boards" ON gift_board_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own comments" ON gift_board_comments;
CREATE POLICY "Users can delete their own comments" ON gift_board_comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- AUTOGIFT ORDERS (run this block so AutoGift orders reach the
-- admin fulfillment queue for every customer, not just orders
-- placed in the admin's own browser. Idempotent / safe to re-run.
-- Items are stored as JSONB since each item already carries its
-- own name/price/productUrl/image from the AI suggestion step.
-- ============================================================
CREATE TABLE IF NOT EXISTS autogift_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  occasion TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents INTEGER NOT NULL,
  service_fee_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'charged', 'admin_fulfillment', 'ordered', 'shipped', 'delivered', 'cancelled')),
  charge_note TEXT,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  card_message TEXT,
  customer_notes TEXT,
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE autogift_orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE autogift_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own autogift orders" ON autogift_orders;
CREATE POLICY "Users can view their own autogift orders" ON autogift_orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own autogift orders" ON autogift_orders;
CREATE POLICY "Users can create their own autogift orders" ON autogift_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all autogift orders" ON autogift_orders;
CREATE POLICY "Admins can view all autogift orders" ON autogift_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Admins can update all autogift orders" ON autogift_orders;
CREATE POLICY "Admins can update all autogift orders" ON autogift_orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PUSH NOTIFICATION SUBSCRIPTIONS (run this block to enable real
-- phone/desktop push notifications via api/push/send.ts. Idempotent.)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can create their own push subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- SMS CONSENT (CTIA-style opt-in tracking for AutoGift reminders sent via
-- AWS SNS). sms_opt_in gates every SMS send in dispatch-notifications.ts;
-- sms_consent_text freezes exactly what the user agreed to at opt-in time,
-- since the consent language can change later and disputes need to point
-- at what was actually shown, not the current copy. sms_opted_out_at is
-- set the moment someone replies STOP, independent of sms_opt_in, so a
-- STOP-driven opt-out is distinguishable from one that came from a UI
-- toggle later.
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_consent_text TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_opted_out_at TIMESTAMPTZ;

-- ============================================================
-- WEEKLY DIGEST EMAIL
-- Opt-out (default true), not opt-in -- this is a low-frequency,
-- low-risk summary email (upcoming occasions, AutoGift status), not a
-- marketing blast, and defaulting it off would mean nobody ever sees it.
-- Every digest email includes a one-click unsubscribe link that flips
-- this without requiring login (see dispatch-notifications.ts's
-- unsubscribe-digest webhook branch).
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_digest_opt_in BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- PROFILE PHOTO
-- Uploaded via the existing S3 presigned-upload flow (api/upload/url.ts,
-- lib/upload.ts) -- same one gift boards already use -- so no new
-- storage plumbing, just a place on the profile row to keep the result.
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- GIFTING PERSONALITY COHORT
-- Self-reported via a short quiz (src/lib/data/gifting-cohorts.ts holds the
-- 6 cohorts + questions), stored as the cohort id (e.g. "poet", "anchor").
-- Used as a light tie-breaking nudge in gift-recommend.ts, not a hard
-- filter -- see that file's cohortBoost for how it's weighted.
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gifting_cohort TEXT;

-- ============================================================
-- MISSING COLUMNS THE APP CODE ALREADY DEPENDED ON
-- Both were being read/written by the app with no matching column ever
-- added to the schema. Neither failure was loud: use-auth.tsx's profile
-- fetch does an EXPLICIT column list (not select *), so a nonexistent
-- column there doesn't just come back null -- PostgREST rejects the
-- whole query, and the app silently falls back to a bare-bones profile
-- (full_name/email/role only) for EVERY signed-in user, every session.
-- That in turn means profile?.role is never really "admin" even for a
-- real admin, since the fallback hardcodes role: "customer" -- so this
-- single missing column was also the reason /admin (and the AutoGift
-- fulfillment queue that lives there) silently redirected every admin
-- back to the homepage. gift_occasions.metadata's failure is quieter
-- still: the onboarding wizard's occasion save just silently fails
-- (error never checked), so a brand-new recipient added during
-- onboarding gets zero rows in gift_occasions -- no date, no reminder,
-- no error shown to the user who just "finished" onboarding.
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_reminder_lead_days INTEGER DEFAULT 35;
ALTER TABLE gift_occasions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================
-- USER_PAYMENT_METHODS: DEDUPE + UNIQUE CONSTRAINT
-- Without a unique constraint, saveUserPaymentMethod() upserted with no
-- onConflict target, so retrying a save (e.g. after a failed onboarding
-- step) inserted a duplicate row rather than updating in place -- and
-- multiple rows could end up with is_default = true, leaving "the" card
-- to charge ambiguous. Deletes older duplicate rows first (keeping the
-- most recent per user_id + stripe_payment_method_id) since a table
-- that already has duplicates will reject a UNIQUE constraint outright.
-- ============================================================
DELETE FROM user_payment_methods a USING user_payment_methods b
  WHERE a.user_id = b.user_id
    AND a.stripe_payment_method_id = b.stripe_payment_method_id
    AND a.stripe_payment_method_id IS NOT NULL
    AND a.created_at < b.created_at;
ALTER TABLE user_payment_methods DROP CONSTRAINT IF EXISTS user_payment_methods_user_id_stripe_payment_method_id_key;
ALTER TABLE user_payment_methods ADD CONSTRAINT user_payment_methods_user_id_stripe_payment_method_id_key UNIQUE (user_id, stripe_payment_method_id);

-- ============================================================
-- SECRET SANTA: SHUFFLE + PRIVATE ASSIGNMENT LOOKUP
-- Both SECURITY DEFINER, both do their own authorization check (RLS is
-- bypassed for the duration of the function body, so the check has to be
-- explicit rather than left to a policy). See the secret_santa_assignments
-- table comment above for why the mapping lives in its own, policy-less
-- table instead of a column on secret_santa_participants.
-- ============================================================

-- A single random cyclic permutation of the participant ids: shuffle them,
-- then assign each person to the next one in the shuffled order (wrapping
-- around). For any group of 3+, this guarantees zero self-assignments
-- (person i never equals person i+1 in a cycle of length >= 2) and that
-- everyone gives exactly once and receives exactly once, without the
-- retry-until-it-works awkwardness of rejection-sampling a general
-- derangement.
CREATE OR REPLACE FUNCTION shuffle_secret_santa_group(p_group_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_organizer UUID;
  v_ids UUID[];
  v_count INT;
  i INT;
BEGIN
  SELECT organizer_id INTO v_organizer FROM secret_santa_groups WHERE id = p_group_id;
  IF v_organizer IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  IF v_organizer != auth.uid() THEN
    RAISE EXCEPTION 'Only the organizer can shuffle this group';
  END IF;

  SELECT array_agg(id ORDER BY random()) INTO v_ids
  FROM secret_santa_participants WHERE group_id = p_group_id;

  v_count := COALESCE(array_length(v_ids, 1), 0);
  IF v_count < 3 THEN
    RAISE EXCEPTION 'Need at least 3 participants to shuffle';
  END IF;

  DELETE FROM secret_santa_assignments WHERE group_id = p_group_id;
  FOR i IN 1..v_count LOOP
    INSERT INTO secret_santa_assignments (group_id, giver_id, recipient_id)
    VALUES (p_group_id, v_ids[i], v_ids[(i % v_count) + 1]);
  END LOOP;

  UPDATE secret_santa_groups SET status = 'shuffled' WHERE id = p_group_id;
END;
$$;

-- Returns exactly one row: the recipient the CALLING user was assigned to
-- give to in the given group. Nothing else -- there's no way to pass in
-- someone else's participant id and get their assignment back instead,
-- because the join is anchored on `me.user_id = auth.uid()`, not on any
-- caller-supplied id.
CREATE OR REPLACE FUNCTION get_my_secret_santa_recipient(p_group_id UUID)
RETURNS TABLE(name TEXT, wishlist_notes TEXT, interests TEXT[])
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT r.name, r.wishlist_notes, r.interests
  FROM secret_santa_participants me
  JOIN secret_santa_assignments a ON a.giver_id = me.id AND a.group_id = p_group_id
  JOIN secret_santa_participants r ON r.id = a.recipient_id
  WHERE me.group_id = p_group_id AND me.user_id = auth.uid();
$$;

-- ============================================================
-- CREDITS (Your Gift AI / Secret Santa matching / AutoGift metering)
-- server/api-lib/credits.mjs calls the three functions below over
-- PostgREST's /rpc/ with the service-role key. Until this block existed
-- those calls 404'd, which made every signed-in user's first Gift AI
-- message come back "you're out of free uses" (the client fails closed).
--
-- Every user gets a free allowance per calendar year (UTC) before paid
-- credits are touched: FREE_AI covers gift_ai_chat + secret_santa_match,
-- FREE_AUTOGIFT covers autogift_purchase. Change the limits in
-- credit_free_limits() only -- get_credit_status() reports them to the
-- client, so the UI never hardcodes them.
--
-- All three functions are SECURITY DEFINER and EXECUTE is revoked from
-- anon/authenticated: otherwise any signed-in user could POST
-- /rest/v1/rpc/grant_credits with their own id and mint credits. Only the
-- service role (the API routes) may call them. Idempotent.
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  free_period INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM (now() AT TIME ZONE 'utc'))::INTEGER,
  free_ai_used INTEGER NOT NULL DEFAULT 0,
  free_autogift_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  used_free BOOLEAN NOT NULL DEFAULT false,
  reference_id TEXT,
  -- UNIQUE is what makes pack grants idempotent even when two confirm
  -- requests for the same Checkout Session race each other.
  stripe_payment_intent_id TEXT UNIQUE,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_transactions_user_created_idx ON credit_transactions (user_id, created_at DESC);

ALTER TABLE credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner; every write goes through the functions below.
DROP POLICY IF EXISTS "Users can view their own credit account" ON credit_accounts;
CREATE POLICY "Users can view their own credit account" ON credit_accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own credit transactions" ON credit_transactions;
CREATE POLICY "Users can view their own credit transactions" ON credit_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION credit_free_limits()
RETURNS TABLE(free_ai INTEGER, free_autogift INTEGER)
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 10, 3 $$;

-- Creates the account row on first touch, rolls the free allowance over
-- when the calendar year changes, and returns the row locked FOR UPDATE so
-- concurrent spends for the same user serialize instead of both passing
-- the balance check.
CREATE OR REPLACE FUNCTION credit_lock_account(p_user_id UUID)
RETURNS credit_accounts
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM (now() AT TIME ZONE 'utc'))::INTEGER;
  v_account credit_accounts;
BEGIN
  INSERT INTO credit_accounts (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_account FROM credit_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF v_account.free_period <> v_year THEN
    UPDATE credit_accounts
      SET free_period = v_year, free_ai_used = 0, free_autogift_used = 0, updated_at = now()
      WHERE user_id = p_user_id
      RETURNING * INTO v_account;
  END IF;
  RETURN v_account;
END;
$$;

CREATE OR REPLACE FUNCTION get_credit_status(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_account credit_accounts;
  v_limits RECORD;
BEGIN
  v_account := credit_lock_account(p_user_id);
  SELECT * INTO v_limits FROM credit_free_limits();
  RETURN jsonb_build_object(
    'balance', v_account.balance,
    'freeAiRemaining', GREATEST(v_limits.free_ai - v_account.free_ai_used, 0),
    'freeAiLimit', v_limits.free_ai,
    'freeAutogiftRemaining', GREATEST(v_limits.free_autogift - v_account.free_autogift_used, 0),
    'freeAutogiftLimit', v_limits.free_autogift
  );
END;
$$;

-- One free use covers one metered action regardless of p_amount; paid
-- credits are only drawn once that pool's free allowance is used up.
CREATE OR REPLACE FUNCTION spend_credits(p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_reference_id TEXT DEFAULT NULL)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_account credit_accounts;
  v_limits RECORD;
  v_is_autogift BOOLEAN := p_reason = 'autogift_purchase';
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be positive';
  END IF;

  v_account := credit_lock_account(p_user_id);
  SELECT * INTO v_limits FROM credit_free_limits();

  IF (v_is_autogift AND v_account.free_autogift_used < v_limits.free_autogift)
     OR (NOT v_is_autogift AND v_account.free_ai_used < v_limits.free_ai) THEN
    UPDATE credit_accounts SET
      free_ai_used = free_ai_used + CASE WHEN v_is_autogift THEN 0 ELSE 1 END,
      free_autogift_used = free_autogift_used + CASE WHEN v_is_autogift THEN 1 ELSE 0 END,
      updated_at = now()
      WHERE user_id = p_user_id;
    INSERT INTO credit_transactions (user_id, delta, reason, used_free, reference_id, balance_after)
      VALUES (p_user_id, 0, p_reason, true, p_reference_id, v_account.balance);
    RETURN jsonb_build_object('ok', true, 'usedFree', true, 'balance', v_account.balance);
  END IF;

  IF v_account.balance < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'usedFree', false, 'balance', v_account.balance, 'error', 'insufficient_credits');
  END IF;

  UPDATE credit_accounts SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_account;
  INSERT INTO credit_transactions (user_id, delta, reason, used_free, reference_id, balance_after)
    VALUES (p_user_id, -p_amount, p_reason, false, p_reference_id, v_account.balance);
  RETURN jsonb_build_object('ok', true, 'usedFree', false, 'balance', v_account.balance);
END;
$$;

-- Idempotent per Stripe payment intent: a repeat call (refreshed success
-- page, two tabs, a retried request) returns alreadyGranted instead of
-- granting twice. The ledger insert runs before the balance update inside
-- the same exception block, so a unique-violation race rolls back both.
CREATE OR REPLACE FUNCTION grant_credits(p_user_id UUID, p_amount INTEGER, p_reason TEXT, p_stripe_payment_intent_id TEXT DEFAULT NULL)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_account credit_accounts;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be positive';
  END IF;

  v_account := credit_lock_account(p_user_id);
  BEGIN
    INSERT INTO credit_transactions (user_id, delta, reason, stripe_payment_intent_id, balance_after)
      VALUES (p_user_id, p_amount, p_reason, p_stripe_payment_intent_id, v_account.balance + p_amount);
    UPDATE credit_accounts SET balance = balance + p_amount, updated_at = now()
      WHERE user_id = p_user_id
      RETURNING * INTO v_account;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'alreadyGranted', true, 'balance', v_account.balance);
  END;
  RETURN jsonb_build_object('ok', true, 'alreadyGranted', false, 'balance', v_account.balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION credit_lock_account(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_credit_status(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION spend_credits(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION grant_credits(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION credit_lock_account(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_credit_status(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION spend_credits(UUID, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION grant_credits(UUID, INTEGER, TEXT, TEXT) TO service_role;

-- ============================================================
-- PRIVILEGE GUARDS (column-level protection RLS can't express)
-- RLS policies decide WHICH rows a user may write, not WHICH COLUMNS --
-- so "Users can update own profile" let anyone run
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', myId)
-- from devtools and become an admin, "Sellers can manage their own
-- products" let any user insert an already-approved, published product,
-- and a Secret Santa participant could move their row into another group.
-- These triggers quietly keep protected columns at their old values for
-- ordinary users (rather than raising) so existing client writes that
-- happen to include them -- e.g. signup.tsx's profile upsert with
-- role: 'customer' -- keep working. Admins, and server-side code using
-- the service-role key (auth.uid() IS NULL), are unaffected. Idempotent.
-- ============================================================
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'admin') $$;

CREATE OR REPLACE FUNCTION guard_profile_privileged_columns()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.role := 'customer';
    NEW.is_banned := false;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_default_payment_method_id := NULL;
    NEW.stripe_connect_account_id := NULL;
    NEW.stripe_connect_charges_enabled := false;
  ELSE
    NEW.role := OLD.role;
    NEW.is_banned := OLD.is_banned;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_default_payment_method_id := OLD.stripe_default_payment_method_id;
    NEW.stripe_connect_account_id := OLD.stripe_connect_account_id;
    NEW.stripe_connect_charges_enabled := OLD.stripe_connect_charges_enabled;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON profiles;
CREATE TRIGGER guard_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION guard_profile_privileged_columns();

-- Non-admin product writes can never self-approve or self-publish; an
-- admin approves them from /admin like any other submission.
CREATE OR REPLACE FUNCTION guard_product_moderation_columns()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_approved := false;
    NEW.is_published := false;
  ELSE
    NEW.is_approved := OLD.is_approved;
    NEW.is_published := OLD.is_published;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_product_moderation_columns ON products;
CREATE TRIGGER guard_product_moderation_columns
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION guard_product_moderation_columns();

-- Participants may edit their own wishlist notes/interests, nothing that
-- changes group membership or identity.
CREATE OR REPLACE FUNCTION guard_secret_santa_participant_identity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR is_secret_santa_organizer(OLD.group_id, auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.group_id := OLD.group_id;
  NEW.user_id := OLD.user_id;
  NEW.email := OLD.email;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_secret_santa_participant_identity ON secret_santa_participants;
CREATE TRIGGER guard_secret_santa_participant_identity
  BEFORE UPDATE ON secret_santa_participants
  FOR EACH ROW EXECUTE FUNCTION guard_secret_santa_participant_identity();

-- A customer-created AutoGift order can only start life awaiting a charge
-- -- inserting status 'charged' used to skip payment entirely and drop
-- straight into the fulfillment queue. (Totals are re-checked against the
-- line items at charge time in api/stripe/setup-intent.ts.)
CREATE OR REPLACE FUNCTION guard_autogift_order_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('pending_approval', 'approved') THEN
    NEW.status := 'approved';
  END IF;
  NEW.stripe_payment_intent_id := NULL;
  NEW.admin_notes := NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_autogift_order_insert ON autogift_orders;
CREATE TRIGGER guard_autogift_order_insert
  BEFORE INSERT ON autogift_orders
  FOR EACH ROW EXECUTE FUNCTION guard_autogift_order_insert();
