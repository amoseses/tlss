# Givit Platform

Gift marketplace + AI-powered AutoGift concierge.

## Quick Start

```bash
pnpm install
pnpm run dev
```

Open http://localhost:3000

## Setup Checklist

### 1. Environment Variables

Copy `.env.local` and ensure **no leading spaces** in any value (especially `VITE_SUPABASE_URL`):

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGci...` |
| `STRIPE_SECRET_KEY` | Stripe secret key (for server) | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `SHIPPO_API_TOKEN` | Shippo API token (shipping) | `shippo_...` |
| `NEXT_PUBLIC_APP_URL` | Base URL of your deployed app | `https://your-app.vercel.app` |

### 2. Supabase Setup

1. Create a project at https://supabase.com
2. Run all SQL from `artifacts/givit-platform/src/lib/supabase/admin-schema.sql` in the Supabase SQL Editor
3. Enable **Email Auth** in Authentication → Providers (disable "Confirm email" for testing)
4. Upload your logo to `artifacts/givit-platform/public/logo.png`

### 3. Vercel Deployment (Important!)

**Fix for login not persisting after page refresh or re-login:**

The `.env.local` **must not have leading spaces** in any variable value. When Vercel builds, it uses the environment variables set in the Vercel dashboard.

**Set these in Vercel → Project Settings → Environment Variables:**
```
VITE_SUPABASE_URL=https://zbhumepxaywxnluapcbs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHVtZXB4YXl3eG5sdWFwY2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNTQ1MTYsImV4cCI6MjA5NzgzMDUxNn0.-P60mPwXUC8tQ7CXWh89em7HAvktEMQpj9sjSo1PowE
```

**Critical:** `VITE_SUPABASE_URL` must be exactly `https://zbhumepxaywxnluapcbs.supabase.co` with **no trailing slash** and **no leading space**. A leading space will cause session cookies to fail and users won't be able to log in.

### 4. AutoGift System

The AutoGift system works in 4 stages:

1. **Recipients & Occasions** — Add people and their dates on `/concierge`
2. **35-Day Survey** — When an occasion is 35 days away, a gift survey is triggered (email prompt for recipient preferences)
3. **AI Suggestions** — Based on survey responses, the AI generates gift suggestions including:
   - Handwritten card ($5)
   - Fresh flowers ($25)  
   - Physical gifts from marketplace (priced at items + 10% service fee)
   - Activity/experience options (movie night box, cooking class credit, etc.)
4. **Order & Fulfillment** — User approves the order, card is charged, order goes to admin for fulfillment

**Pricing breakdown:**
- Card: $5.00
- Flowers: $25.00  
- Gift items: marketplace price
- Service fee: 10% of subtotal
- Gift wrap & expedited shipping available as add-ons

**Flow:**
1. User adds recipients and occasions → 35 days before, survey is sent
2. Recipient fills out interests, budget, gift style
3. AI generates 4-6 suggestions with match scores
4. User selects items, writes card message, enters shipping address
5. Total calculated (items + card + flowers + 10% service fee)
6. Order created with status `pending_approval`
7. Admin reviews and charges card on file (Stripe integration needed)
8. Admin sources items, writes card, arranges shipping
9. Status updates: `approved` → `charged` → `ordered` → `shipped` → `delivered`

## Key Pages

| Route | Page | Access |
|-------|------|--------|
| `/` | Home | Public |
| `/products` | Marketplace | Public |
| `/gift` | AI gift finder | Public |
| `/boards` | Gift boards | Public view, login to create |
| `/concierge` | AutoGift setup | Public (limited), full with login |
| `/submit-product` | Submit a product | Public |
| `/admin` | Admin dashboard | Admin role only |
| `/account` | User account | Login required |
| `/feedback` | Contact & Feedback | Public |

## Login Troubleshooting

If users can't log in or sessions don't persist:

1. **Check `VITE_SUPABASE_URL` has no leading space** — This is the most common issue. The `.env.local` file had ` VITE_SUPABASE_URL= https://...` (space after `=` and before `https`). The `env.ts` file strips whitespace, but `@supabase/ssr` may not handle the cookie domain correctly if the URL is malformed.

2. **Clear Supabase users** — In Supabase Dashboard → Authentication → Users, delete existing users and create new ones. Old sessions may be invalid due to schema changes.

3. **Confirm email setting** — In Supabase → Authentication → Settings, ensure "Confirm email" is OFF for testing, or users must click the confirmation link.

4. **`use-auth.tsx` session fix** — On initial page load, `getSession()` is called first (reads from localStorage cookie) before `getUser()` (makes network request). This fixes the "can't log back in after refresh" issue.

5. **Password strength** — Ensure passwords are at least 6 characters. Supabase requires this by default.

## Architecture

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Routing:** wouter (lightweight)
- **Auth:** Supabase Auth (email/password)
- **Data:** LocalStorage (boards, recipients, surveys, orders) + Supabase DB (user profiles, products, orders)
- **Payments:** Stripe (API keys configured, UI ready)
- **Shipping:** Shippo (API key configured)
- **Deployment:** Vercel (SPA with client-side routing)
## Backend requirements for Stripe, email, URL imports, and AutoGift automation

### Stripe saved cards
- Use Stripe **SetupIntents + Elements** for AutoGift onboarding and account payment editing. The UI asks for the full card fields, but production must exchange them for a Stripe PaymentMethod and store only `stripe_payment_method_id`, `card_brand`, and `card_last4` in `user_payment_methods`.
- Required backend variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a publishable key exposed to the Vite app as `VITE_STRIPE_PUBLISHABLE_KEY` (or keep the existing publishable variable if your deployment maps it).
- Required webhook events: `setup_intent.succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`, and dispute/refund events if admins will fulfill externally.

### Supabase email and reminder automation
- Supabase Auth can send auth emails, but AutoGift reminder/survey emails should be sent from a Supabase Edge Function or server job using a transactional provider such as Resend, SendGrid, Postmark, or Supabase SMTP configuration.
- Create a scheduled job (Supabase Cron/pg_cron, Vercel Cron, or a worker) that runs daily, finds `gift_occasions` entering the 35-day lead window, inserts `gift_notifications`, and sends email survey links.
- Recommended environment variables: `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_URL`/app URL for approval and survey links.
- Do not send production AutoGift emails from the browser; use the service role key only in server/Edge Function code.

### AI product URL import
- Customers and admins can submit/paste product URLs. The frontend drafts basic details from the URL immediately; production should call a server-side scraper/AI function to fetch metadata, images, price, brand, and gift tags.
- Keep submitted products in `product_submissions` with `status='pending'` until an admin approves. Approval creates a published `products` row with `metadata.ai_url_import=true`.

### Current AutoGift flow
1. A first-time user must complete the AutoGift onboarding tour before managing recipients.
2. Onboarding collects shipping address, card fields for Stripe tokenization, and the first recipient/occasion.
3. Occasions generate in-app notifications locally today and should be mirrored by the scheduled backend email job for production.
4. The recipient survey feeds gift suggestions; the customer approves before any saved card is charged.
5. Admin fulfillment receives approved AutoGift orders, charges through Stripe, buys/ships items, and updates status.
