# Givit Platform

AI-powered gift recommendation platform. Built with React, Vite, and Supabase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript |
| UI | Tailwind CSS 4, Radix UI, Framer Motion |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Payments | Stripe |
| Package Manager | pnpm (workspace monorepo) |

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run the complete SQL schema in Supabase SQL Editor
#    (see the SQL file at artifacts/givit-platform/src/lib/supabase/admin-schema.sql)
#    This creates ALL tables, RLS policies, triggers, and analytics views

# 3. Set your environment variables
#    Copy .env.local and fill in your Supabase URL + anon key

# 4. Start the dev server
pnpm dev
```

## 🚀 New Features (Latest Update)

### Admin Dashboard (`/admin`)
- **Product Management**: Search, edit, add, and delete products
- **AI Import**: Upload CSV or paste product URLs — AI extracts product details automatically
- **Analytics**: DAU, top products by views, revenue tracking, pending submissions
- **Submissions Management**: Approve/reject customer-submitted products
- **Orders & Users**: View all orders and user profiles

### Givit AI (`/gift`)
- **More Occasions**: Father's Day, Mother's Day, Valentine's Day, Easter, Halloween, New Baby, Retirement, Get Well, Just Because, Engagement, Baby Shower
- **Learning System**: AI learns from your feedback (thumbs up/down) — persists across sessions
- **Quick Prompts**: One-click gift finders for common scenarios

### AutoGift Concierge (`/concierge`)
- **Recipient Management**: Add people with their relationships and important dates
- **Upcoming Calendar**: Shows next 5 upcoming events with countdown
- **Auto-Pricing**: Total = items price + 10% service fee
- **Notification Scheduling**: Reminds you 5-6 weeks before each date

### Pinterest-Style Boards (`/boards`)
- **Public Boards**: No sidebar — clean Pinterest-style grid layout
- **Visual Cards**: Photo cover for each board, product card layout
- **Like System**: Public boards are likeable
- **Drag & Drop Images**: Upload or paste image URLs

### Enhanced Account Page (`/account`)
- **Orders**: Recent order history with status badges
- **Wishlist**: Saved products from Givit AI recommendations
- **Saved Addresses**: AutoGift shipping addresses
- **Payment Methods**: Saved cards from checkout
- **Quick Links**: AutoGift, Givit AI, Gift Boards

### Customer Product Submissions (`/submit-product`)
- Anyone can submit a product URL for admin review
- Admin approves/rejects in the admin dashboard
- Approved products appear in the marketplace

### Special Dates Auto-Fill
When a special date is near (Valentine's Day, Mother's Day, Father's Day, Christmas, etc.), the system auto-fills the occasion in forms.

### Homepage Updates
- New tagline: "Automating your gift giving so you never forget."
- Sign-in prompt for non-logged-in users
- "Sign in" link in the footer CTA

### Notification System
- Auto-sends notifications for upcoming gift occasions
- In-app notifications via the bell icon
- Scheduled notifications appear in the concierge

### Admin Database Setup
Complete SQL schema at `artifacts/givit-platform/src/lib/supabase/admin-schema.sql`:
- 25+ tables with full RLS policies
- Auto-profile creation on signup
- Analytics views (DAU, top products, revenue)
- Product submissions table
- AI learning table
- Wishlist, addresses, payment methods tables

## Setting Up Supabase Admin

1. Go to your Supabase Dashboard → SQL Editor
2. Open `artifacts/givit-platform/src/lib/supabase/admin-schema.sql`
3. Copy and paste the entire SQL file into the SQL Editor
4. Run it — this creates ALL tables, policies, triggers, and views
5. After your first user signs up, make them admin:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

## Project Structure

```
├── artifacts/givit-platform/   # Main frontend application
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   │   ├── gift/           # Givit AI chat component
│   │   │   ├── personalization/ # Login prompt, gift calendar
│   │   │   ├── layout/         # Site header, footer, profile button
│   │   │   ├── product/        # Product card, wishlist button
│   │   │   └── ui/             # Base UI components (button, card, etc.)
│   │   ├── lib/
│   │   │   ├── supabase/       # Supabase client, db helpers, schema SQL
│   │   │   ├── data/           # Marketplace data, special dates
│   │   │   ├── admin/          # Imported products helper
│   │   │   └── commerce/       # Stripe checkout
│   │   ├── pages/              # All route pages
│   │   └── types/              # TypeScript type definitions
│   └── vite.config.ts
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (install: `npm install -g pnpm`)
- **Supabase** project (free tier at [supabase.com](https://supabase.com))
- **Stripe** account (for payments)
- **Shippo** account (for shipping)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in `artifacts/givit-platform/`:

```bash
# === Supabase ===
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# === Stripe ===
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# === Shipping ===
SHIPPO_API_TOKEN=shippo_test_...

# === App ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
BASE_PATH=/

# === AutoGift / Concierge Automation ===
NEXT_PUBLIC_GIFT_SURVEY_LEAD_DAYS=35
NEXT_PUBLIC_GIFT_APPROVAL_LEAD_DAYS=10
NEXT_PUBLIC_GIFT_SHIPPING_BUFFER_DAYS=5
NEXT_PUBLIC_ENABLE_EXTERNAL_CHECKOUT_AGENT=false

# === Database (for Drizzle ORM) ===
DATABASE_URL=postgresql://postgres:password@host:6543/postgres
```

> **Supabase values** are found in your Supabase project dashboard under **Settings > API**.
>
> **Stripe values** are in your Stripe Dashboard under **Developers > API keys**.
>
> **Shippo token** is in your Shippo Dashboard under **Settings > API**.
>
> **DATABASE_URL** is in your Supabase project under **Settings > Database > Connection string** (use the "Session pooler" or "Direct" connection with password).

### 3. Database Setup

This project uses **two approaches** for database access:

#### A. Supabase SQL Editor (Required — Run These SQL Statements)

The frontend queries Supabase tables directly using the Supabase JS client. You must create these tables in your Supabase project via the **SQL Editor** in the Supabase Dashboard.

Open the **SQL Editor** in your Supabase Dashboard and run the following SQL statements to create all required tables:

<details>
<summary><b>Click to expand — Full SQL schema for Supabase SQL Editor</b></summary>

```sql
-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'seller')),
  is_banned BOOLEAN DEFAULT false,
  stripe_connect_account_id TEXT,
  stripe_connect_charges_enabled BOOLEAN DEFAULT false,
  ship_from_line1 TEXT,
  ship_from_line2 TEXT,
  ship_from_city TEXT,
  ship_from_state TEXT,
  ship_from_zip TEXT,
  ship_from_country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE products (
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
  images JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product Rating Stats
CREATE TABLE product_rating_stats (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  average_rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Product Sales Stats
CREATE TABLE product_sales_stats (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  total_sold INTEGER DEFAULT 0,
  revenue_cents BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Carts
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cart Items
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Checkout Quotes
CREATE TABLE checkout_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quote_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid_pending_fulfillment', 'ordered', 'shipped', 'delivered', 'cancelled', 'refunded')),
  headline TEXT,
  card_message TEXT,
  total_cents INTEGER NOT NULL,
  estimated_delivery_date DATE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seller Orders
CREATE TABLE seller_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'shipped', 'delivered', 'cancelled')),
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gift Recipients
CREATE TABLE gift_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ship_to_name TEXT,
  ship_to_line1 TEXT,
  ship_to_line2 TEXT,
  ship_to_city TEXT,
  ship_to_state TEXT,
  ship_to_zip TEXT,
  ship_to_country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gift Approvals
CREATE TABLE gift_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gift Approval Items
CREATE TABLE gift_approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_approval_id UUID NOT NULL REFERENCES gift_approvals(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'suggestion', 'external')),
  title TEXT NOT NULL,
  description TEXT,
  external_url TEXT,
  fulfillment_status TEXT DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'fulfilled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gift Fulfillment Tasks
CREATE TABLE gift_fulfillment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('purchase', 'ship', 'wrap', 'custom')),
  provider TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_rating_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_approval_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_fulfillment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (customize as needed)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

CREATE POLICY "Published products are viewable by everyone" ON products FOR SELECT USING (is_published = true);
CREATE POLICY "Sellers can manage their own products" ON products FOR ALL USING (auth.uid() = seller_id);

CREATE POLICY "Users can manage their own cart" ON carts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own cart items" ON cart_items FOR ALL USING (
  cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own order items" ON order_items FOR ALL USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

</details>

#### B. Drizzle ORM (For Schema-Managed Tables)

The `lib/db/` package uses Drizzle ORM to define and manage PostgreSQL schemas that you want to control via code. This is useful for tables that need to stay in sync with your TypeScript types.

**Define your schema** in `lib/db/src/schema/index.ts`:

```typescript
import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
```

**Push schema to Supabase:**

```bash
# Set your Supabase database connection string
export DATABASE_URL=postgresql://postgres:password@host:6543/postgres

# Push schema directly (creates/updates tables)
pnpm --filter @workspace/db push

# Or generate migration files first (safer for production)
pnpm --filter @workspace/db push-force
```

> **Note:** The Drizzle schema is separate from the Supabase SQL Editor tables. Drizzle manages only the tables you define in `lib/db/src/schema/`. The Supabase SQL Editor tables (listed in section A) are queried directly by the frontend via `supabase.from("table_name")` and are not managed by Drizzle.

### 4. Run Development Server

```bash
pnpm dev
```

This starts the Vite dev server at `http://localhost:5173`.

### 5. Build for Production

```bash
pnpm build
```

The build output goes to `artifacts/givit-platform/dist/`.

## Supabase Setup (Required)

This application uses Supabase for:

### Authentication
- Email/password signup and login
- Session management via `@supabase/ssr`
- Configurable in `src/lib/supabase/`

### Database
- **Supabase SQL Editor tables** — Created via the SQL statements above. These are queried directly by the frontend using the Supabase JS client (`supabase.from("table_name").select(...)`).
- **Drizzle ORM tables** — Defined in `lib/db/src/schema/` and pushed via `drizzle-kit`. Use this for tables you want to manage with code-first migrations.

### Storage (Optional)
- Product images, gift board assets
- Configured via `src/lib/storage.ts`

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm --filter @workspace/db push` | Push Drizzle schema to database |
| `pnpm --filter @workspace/db push-force` | Force-push Drizzle schema (resets data) |

## Deployment

The project is configured for Vercel deployment via `vercel.json`:

```json
{
  "buildCommand": "pnpm --filter @workspace/givit-platform run build",
  "outputDirectory": "artifacts/givit-platform/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Required Environment Variables in Vercel:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SHIPPO_API_TOKEN`
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL` (if using Drizzle ORM server-side)