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

Copy `.env.local` and ensure **no leading spaces** in any value (especially `VITE_SUPABASE_URL`). `.env.local` is git-ignored — it is **not** committed, so set the same values in Vercel too (see §3).

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGci...` |
| `STRIPE_SECRET_KEY` | Stripe secret key (for server) | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `SHIPPO_API_TOKEN` | Shippo API token (shipping) | `shippo_...` |
| `NEXT_PUBLIC_APP_URL` | Base URL of your deployed app | `https://your-app.vercel.app` |
| `GEMINI_API_KEY` | Powers Givit AI (gift finder, AutoGift suggestions, admin bulk-import extraction). Server-side only — never add a `VITE_`/`NEXT_PUBLIC_` prefix or it'll ship to every visitor's browser. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). | `AIza...` |
| `GEMINI_MODEL` | Optional, defaults to `gemini-2.5-flash` | `gemini-2.5-flash` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push keys (phone/desktop notifications). Generate your own pair with `node -e "console.log(require('web-push').generateVAPIDKeys())"` — the private key must stay server-only. `VAPID_SUBJECT` is a `mailto:` address the push service can contact if there's abuse. | see below |
| `VITE_VAPID_PUBLIC_KEY` | Same value as `VAPID_PUBLIC_KEY`, but `VITE_`-prefixed so the browser can subscribe. This one is meant to be public. | same as above |

> ⚠️ **Note:** as of July 2026 the Gemini API free tier is generous enough for testing without billing, but very high traffic may need billing enabled on the Google AI Studio / Cloud project behind the key. The app is designed to fail soft either way — every AI feature falls back to non-AI rule-based matching if the Gemini call errors or the key is missing, so this won't crash anything, but AI features won't actually run until a working key is set.

### 2. Supabase Setup

1. Create a project at https://supabase.com
2. Run all SQL from `artifacts/givit-platform/src/lib/supabase/admin-schema.sql` in the Supabase SQL Editor. **If you already ran this once**, re-run the whole file anyway — every block added since is idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` + recreate), so it's safe to run repeatedly. This file now also creates:
   - `gift_board_likes` / `gift_board_comments` — real per-account board likes and comments
   - `autogift_orders` — AutoGift orders now sync here so admin sees every customer's order, not just ones placed in admin's own browser
   - `push_subscriptions` — phone/desktop push notification subscriptions
   - Until you run the updated file, those three features degrade gracefully (empty likes/comments, admin only sees local-browser orders, no push) rather than erroring.
3. Enable **Email Auth** in Authentication → Providers (disable "Confirm email" for testing)
4. Upload your logo to `artifacts/givit-platform/public/` (the header currently points at `Screenshot 2026-06-23 095149.png` — replace that file or update the `src` in `site-header.tsx`/`auth-shell.tsx`/`site-footer.tsx`)

### 3. Vercel Deployment (Important!)

**Fix for login not persisting after page refresh or re-login:**

The `.env.local` **must not have leading spaces** in any variable value. When Vercel builds, it uses the environment variables set in the Vercel dashboard.

**Set these in Vercel → Project Settings → Environment Variables:**
```
VITE_SUPABASE_URL=https://zbhumepxaywxnluapcbs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiaHVtZXB4YXl3eG5sdWFwY2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNTQ1MTYsImV4cCI6MjA5NzgzMDUxNn0.-P60mPwXUC8tQ7CXWh89em7HAvktEMQpj9sjSo1PowE
```

**Critical:** `VITE_SUPABASE_URL` must be exactly `https://zbhumepxaywxnluapcbs.supabase.co` with **no trailing slash** and **no leading space**. A leading space will cause session cookies to fail and users won't be able to log in.

**Also add these (new since AI/push were wired in), or the `/api` functions will 500 in production even though they work locally:**
```
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
VITE_VAPID_PUBLIC_KEY=...          (same value as VAPID_PUBLIC_KEY)
```

> 🔴 **Security reminder:** an earlier commit in this repo's history accidentally included live `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SHIPPO_API_TOKEN` values before `.env.local` was git-ignored. If you haven't already, **rotate all three in the Stripe and Shippo dashboards** — removing the file from the latest commit doesn't invalidate keys still readable in git history/GitHub.

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


### Testing the AutoGift notification system

Use this checklist to test the local demo flow end-to-end:

1. Start the app with `pnpm run dev` and open `/concierge`.
2. Sign in, complete AutoGift onboarding, and save at least one payment method plus one shipping address. Add two addresses if you want to verify that the survey asks the user to choose a shipping address.
3. Add a recipient with an occasion date within the next 42 days. AutoGift creates a local reminder when the occasion is inside the 35-day lead window plus the testing buffer.
4. Use **Test AutoGift** on `/concierge` to open the recipient survey immediately without waiting for the scheduled email job.
5. Choose **Full package** or **Recommendations only**, pick interests, generate suggestions, page through the image/link cards, edit or remove bundle items, choose the saved shipping address, and approve the order.
6. Open `/admin` and check the **AutoGift admin fulfillment queue** for the order that was just created in local storage.
7. In Supabase, verify `gift_notifications` rows for the user. Scheduled email notifications should use `channel = 'email'`, `status = 'scheduled'`, and `metadata.automation = 'autogift'`.

For production email testing, point your scheduler/email worker at rows in `gift_notifications` where `scheduled_for <= now()`, `status = 'scheduled'`, and `channel = 'email'`, then mark successful sends as `sent`.

### 5. Givit AI (serverless functions)

The app is a static Vite SPA with no built-in backend, so AI calls (which need a secret Gemini key) live in a small `/api` directory at the repo root, deployed as Vercel serverless functions:

- `api/ai/gift-chat.ts` — powers the `/gift` chat finder
- `api/ai/autogift-suggestions.ts` — powers AutoGift's survey-to-suggestions step
- `api/ai/extract-product.ts` — powers admin's "paste a link/spreadsheet of links, get products" bulk import
- `api/photo.ts` — resolves a real product photo from a page URL (via Microlink) and redirects the browser to it, used so marketplace/submitted-product images are actual scraped photos instead of stock/AI-looking placeholders
- `api/push/send.ts` — sends a Web Push notification to a saved subscription

Locally, `pnpm run dev` mirrors all of these through a Vite dev-server middleware (see `aiApiDevMiddleware` in `vite.config.ts`) so you get identical behavior without running `vercel dev`. In production, Vercel just picks the files up automatically — no extra config needed beyond the env vars in §1/§3.

Every AI call is constrained to **only pick from a list of real candidate products/ids you already have** — it's never allowed to invent a product, price, or link, so a bad AI response can only mean "picked a worse gift," never a broken checkout link. If `GEMINI_API_KEY` is missing or the Gemini call fails for any reason, each feature falls back to the pre-existing rule-based matching instead of erroring out.

### 6. Push Notifications

Users opt in from `/account` (Notifications card). Test it end-to-end:

1. Run the SQL migration in §2 (creates `push_subscriptions`) if you haven't already.
2. Add the VAPID env vars from §1 to `.env.local` and restart `pnpm run dev`.
3. On `/account`, click "Enable notifications" and accept the browser permission prompt.
4. Use the "Send test notification" button — you should get a real OS-level notification (works even if the browser tab is closed, since it's delivered via the service worker at `public/sw.js`).

Note: nothing in the app currently *triggers* AutoGift reminder pushes/emails on a schedule — sending scheduled reminders (35 days before an occasion) needs an external cron job or scheduler hitting the app on a timer, same limitation that already existed for email reminders before push was added.

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

- **Frontend:** React + Vite + TypeScript + Tailwind CSS, with `next-themes` for the light/dark toggle
- **Routing:** wouter (lightweight)
- **Auth:** Supabase Auth (email/password)
- **Data:** LocalStorage (boards, recipients, surveys, some orders) + Supabase DB (user profiles, products, orders, board likes/comments, AutoGift orders, push subscriptions)
- **AI:** Google Gemini (`gemini-2.5-flash` by default) via serverless functions under `/api` — see §5 above
- **Photos:** Microlink (scrapes real og:image metadata from product URLs) via `/api/photo`
- **Push notifications:** Web Push (VAPID) + a service worker at `public/sw.js` — see §6 above
- **Payments:** Stripe (API keys configured, UI ready) — checkout itself is not wired up; the business model redirects to the retailer (Amazon, etc.) for affiliate commission rather than taking payment in-app, except for AutoGift concierge orders
- **Shipping:** Shippo (API key configured)
- **Deployment:** Vercel (SPA with client-side routing + `/api` serverless functions)