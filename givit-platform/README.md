# GIVIT — AI Gift Intelligence Platform

> "Tell us who it's for. We'll find the perfect gift in seconds."

GIVIT is a unified platform combining:
- **AI Gift Finder** — conversational UI that recommends gifts based on relationship, interests, budget, and occasion
- **Commerce Engine** — full marketplace with cart, checkout, Stripe payments, Shippo shipping, and seller console
- **Merchant Platform** — sellers list products, tag them for AI discovery, and get visibility-ranked by subscription tier

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + Storage) · Stripe Connect · Shippo · Tailwind CSS 4

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, Stripe keys, Shippo key
```

### 3. Run Supabase migrations (in order, via SQL Editor)
```
supabase/migrations/20250509000000_init_hive_markets.sql
supabase/migrations/20250509000001_allow_dashboard_role_bootstrap.sql
supabase/migrations/20250509000002_seller_registration.sql
supabase/migrations/20250509000003_fix_register_as_seller_rpc.sql
supabase/migrations/20250509000004_fix_register_as_seller_variable.sql
supabase/migrations/20250509000005_product_seller_ownership.sql
supabase/migrations/20250509000006_fix_published_product_seller_visibility.sql
supabase/migrations/20250509000007_seller_only_product_access.sql
supabase/migrations/20250509000008_storefront_all_published_products.sql
supabase/migrations/20250509000009_manager_console.sql
supabase/migrations/20250509000010_product_sales_stats.sql
supabase/migrations/20250509000011_commerce_checkout.sql
supabase/migrations/20250601000000_givit_platform.sql   ← GIVIT additions
```

### 4. Configure Supabase Auth
In Supabase → **Authentication → URL Configuration**:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

### 5. Create Storage bucket
In Supabase → **Storage** → New bucket:
- Name: `product-images`
- Public: **Yes**

### 6. Promote yourself to admin
After signing up once:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```

### 7. Run the dev server
```bash
npm run dev
```

Open → http://localhost:3000

---

## Key Routes

| Route | What it is |
|---|---|
| `/` | Home — hero, featured gifts, best sellers |
| `/gift` | **AI Gift Finder** — the core product |
| `/products` | Full product catalog with search/filter |
| `/products/[slug]` | Product detail, reviews, add to cart |
| `/cart` | Cart |
| `/checkout` | Stripe checkout with shipping quotes |
| `/admin` | Seller console — products, orders, shipping |
| `/manager` | Admin console — users, all orders |
| `/account` | User settings, become-a-seller |

---

## AI Gift Finder

The `/api/gift-recommend` endpoint:
1. Parses natural language input for tags (relationship, interests, occasion) and budget
2. Queries Supabase `products` table filtered by `gift_tags`, `occasion_tags`, `relationship_tags`
3. Scores products using a weighted formula: tag overlap + budget proximity
4. Returns top 6 results with match reasons

**To make products discoverable by AI:**
In the Seller Console → Products → Edit a product → add Gift Tags, Occasion Tags, Relationship Tags.

---

## GIVIT Supabase Schema Additions

New columns on `products`:
- `gift_tags text[]` — e.g. `['cooking', 'kitchen', 'giftable']`
- `occasion_tags text[]` — e.g. `['birthday', 'holiday']`
- `relationship_tags text[]` — e.g. `['mom', 'friend']`
- `age_min / age_max int` — target age range
- `affiliate_url text` — for external product links
- `is_external boolean` — if true, redirects to affiliate_url instead of cart

New columns on `profiles`:
- `merchant_tier` — `free | basic | pro` (subscription-based ranking boost)
- `merchant_tier_expires_at`

New tables:
- `gift_recommendations` — logs every AI recommendation session
- `gift_feedback` — click/purchase signals that improve future rankings

New view:
- `product_gift_stats` — per-product AI performance analytics

---

## Roles

| Role | Access |
|---|---|
| `customer` | Browse, cart, orders, reviews |
| `staff` (seller) | + Manage own products, seller orders, shipping |
| `admin` | + Full platform access, manager console |

To promote yourself:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
```
