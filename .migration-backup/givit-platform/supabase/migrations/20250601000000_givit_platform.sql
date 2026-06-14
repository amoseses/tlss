-- ============================================================
-- GIVIT Platform Migration
-- Run this AFTER all 12 Hive Market migrations
-- Adds: gift tags, AI recommendation tracking, merchant tiers
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1. Gift-specific columns on products
-- ---------------------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gift_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS occasion_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS relationship_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS age_min int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS age_max int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS affiliate_url text,
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;

-- GIN indexes for fast array contains queries
CREATE INDEX IF NOT EXISTS products_gift_tags_gin
  ON public.products USING GIN(gift_tags);

CREATE INDEX IF NOT EXISTS products_occasion_tags_gin
  ON public.products USING GIN(occasion_tags);

CREATE INDEX IF NOT EXISTS products_relationship_tags_gin
  ON public.products USING GIN(relationship_tags);

-- ---------------------------------------------------------------------------
-- 2. Merchant subscription tier (GIVIT monetization model)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.merchant_tier AS ENUM ('free', 'basic', 'pro');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS merchant_tier public.merchant_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS merchant_tier_expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. AI gift recommendations log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gift_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id text,
  query_text text NOT NULL,
  relationship text,
  occasion text,
  interests text[] NOT NULL DEFAULT '{}',
  budget_cents int CHECK (budget_cents > 0),
  tags_matched text[] NOT NULL DEFAULT '{}',
  result_product_ids uuid[] NOT NULL DEFAULT '{}',
  result_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_recommendations_user_id_idx
  ON public.gift_recommendations(user_id);

CREATE INDEX IF NOT EXISTS gift_recommendations_created_at_idx
  ON public.gift_recommendations(created_at DESC);

ALTER TABLE public.gift_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon/user can insert recommendations"
  ON public.gift_recommendations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own recommendations"
  ON public.gift_recommendations FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ---------------------------------------------------------------------------
-- 4. Gift feedback (click/purchase tracking → feeds AI scorer)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gift_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid REFERENCES public.gift_recommendations(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('click', 'positive', 'negative', 'purchase')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_feedback_product_id_idx
  ON public.gift_feedback(product_id);

CREATE INDEX IF NOT EXISTS gift_feedback_action_idx
  ON public.gift_feedback(action);

ALTER TABLE public.gift_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit gift feedback"
  ON public.gift_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own gift feedback"
  ON public.gift_feedback FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ---------------------------------------------------------------------------
-- 5. Product gift performance view (for analytics + AI ranking)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.product_gift_stats AS
SELECT
  p.id AS product_id,
  p.name,
  p.price_cents,
  p.gift_tags,
  p.relationship_tags,
  p.occasion_tags,
  COUNT(CASE WHEN gf.action = 'click' THEN 1 END) AS clicks,
  COUNT(CASE WHEN gf.action = 'positive' THEN 1 END) AS positive_feedback,
  COUNT(CASE WHEN gf.action = 'negative' THEN 1 END) AS negative_feedback,
  COUNT(CASE WHEN gf.action = 'purchase' THEN 1 END) AS purchases,
  COUNT(gf.id) AS total_interactions,
  -- Click-through rate proxy
  CASE
    WHEN COUNT(gf.id) > 0
    THEN ROUND(COUNT(CASE WHEN gf.action IN ('click','purchase') THEN 1 END)::numeric / COUNT(gf.id), 4)
    ELSE 0
  END AS engagement_rate
FROM public.products p
LEFT JOIN public.gift_feedback gf ON gf.product_id = p.id
WHERE p.is_published = true
GROUP BY p.id, p.name, p.price_cents, p.gift_tags, p.relationship_tags, p.occasion_tags;

-- ---------------------------------------------------------------------------
-- 6. Seed default gift tags on existing products
--    (you'll refine these in the seller console later)
-- ---------------------------------------------------------------------------

-- Update any existing published products with sensible defaults
-- based on their category slug if available
UPDATE public.products p
SET gift_tags = ARRAY['giftable', 'general']
WHERE gift_tags = '{}' AND is_published = true;

-- ---------------------------------------------------------------------------
-- 7. Admin: allow staff to update gift_tags on their own products
-- ---------------------------------------------------------------------------

-- Staff/admin can update gift_tags on products they own
-- (existing RLS on products already covers this via seller_id check)
-- No extra policy needed — the existing product RLS grants sellers
-- UPDATE on their own products.

-- ---------------------------------------------------------------------------
-- 8. Supabase Storage — ensure product-images bucket exists
--    (run in Supabase dashboard Storage if not already created)
-- ---------------------------------------------------------------------------
-- Note: bucket creation cannot be done via SQL migration.
-- Go to: Supabase Dashboard → Storage → New bucket
-- Name: product-images, Public: YES

