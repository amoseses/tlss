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
  created_at TIMESTAMPTZ DEFAULT now()
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

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CATEGORIES
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PRODUCTS
CREATE POLICY "Published products are viewable by everyone" ON products FOR SELECT USING (is_published = true OR is_approved = true);
CREATE POLICY "Admins can manage all products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Sellers can manage their own products" ON products FOR ALL USING (auth.uid() = seller_id);

-- ORDERS
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- GIFT RECIPIENTS
CREATE POLICY "Users can manage their own recipients" ON gift_recipients FOR ALL USING (auth.uid() = user_id);

-- GIFT OCCASIONS
CREATE POLICY "Users can manage their own occasions" ON gift_occasions FOR ALL USING (auth.uid() = user_id);

-- GIFT NOTIFICATIONS
CREATE POLICY "Users can view their own notifications" ON gift_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notifications" ON gift_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON gift_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all notifications" ON gift_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- GIFT APPROVALS
CREATE POLICY "Users can manage their own approvals" ON gift_approvals FOR ALL USING (auth.uid() = user_id);

-- FEEDBACK
CREATE POLICY "Anyone can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view feedback" ON feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- AI LEARNING
CREATE POLICY "Users can manage their own learning" ON ai_learning FOR ALL USING (auth.uid() = user_id);

-- PRODUCT SUBMISSIONS
CREATE POLICY "Anyone can submit products" ON product_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own submissions" ON product_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage submissions" ON product_submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ANALYTICS
CREATE POLICY "Admins can view analytics" ON analytics_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Anyone can insert analytics" ON analytics_events FOR INSERT WITH CHECK (true);

-- USER ADDRESSES
CREATE POLICY "Users can manage their own addresses" ON user_addresses FOR ALL USING (auth.uid() = user_id);

-- USER PAYMENT METHODS
CREATE POLICY "Users can manage their own payment methods" ON user_payment_methods FOR ALL USING (auth.uid() = user_id);

-- WISHLIST
CREATE POLICY "Users can manage their own wishlist" ON wishlist_items FOR ALL USING (auth.uid() = user_id);

-- GIFT BOARDS
CREATE POLICY "Public boards are viewable by everyone" ON gift_boards FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage their own boards" ON gift_boards FOR ALL USING (auth.uid() = user_id);

-- GIFT BOARD ITEMS
CREATE POLICY "Board items are viewable with board" ON gift_board_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM gift_boards WHERE id = board_id AND (is_public = true OR user_id = auth.uid()))
);
CREATE POLICY "Users can manage their own board items" ON gift_board_items FOR ALL USING (
  EXISTS (SELECT 1 FROM gift_boards WHERE id = board_id AND user_id = auth.uid())
);

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

-- Product submissions pending
CREATE OR REPLACE VIEW analytics_pending_submissions AS
SELECT COUNT(*) as pending_count
FROM product_submissions
WHERE status = 'pending';