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

Copy `artifacts/givit-platform/.env.example` to `artifacts/givit-platform/.env.local` and fill in real values — ensure **no leading spaces** in any value (especially `VITE_SUPABASE_URL`). `.env.local` is git-ignored on purpose (it holds live secrets: Stripe key, Shippo token, VAPID private key) — it is **not** committed, so set the same values in Vercel too (see §3).

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJhbGci...` |
| `STRIPE_SECRET_KEY` | Stripe secret key (for server) | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `SHIPPO_API_TOKEN` | Shippo API token (shipping) | `shippo_...` |
| `NEXT_PUBLIC_APP_URL` | Base URL of your deployed app | `https://your-app.vercel.app` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push keys (phone/desktop notifications). Generate your own pair with `node -e "console.log(require('web-push').generateVAPIDKeys())"` — the private key must stay server-only. `VAPID_SUBJECT` is a `mailto:` address the push service can contact if there's abuse. | see below |
| `VITE_VAPID_PUBLIC_KEY` | Same value as `VAPID_PUBLIC_KEY`, but `VITE_`-prefixed so the browser can subscribe. This one is meant to be public. | same as above |
| `SUPABASE_URL` | Same project URL as `VITE_SUPABASE_URL`, without the `VITE_` prefix (used server-side by the notification cron). | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (Project Settings → API). Bypasses RLS — server-only, never expose to the client. | `eyJhbGci...` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Resend (resend.com) API key and a from-address on a domain verified in the Resend dashboard. Used to actually send AutoGift reminder emails. | see §4 |
| `CRON_SECRET` | Shared secret the notification-dispatch cron checks on its `Authorization: Bearer` header. | any long random string |

Givit AI needs `VITE_GEMINI_API_KEY` — see §5.

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

**Also add these (new since push was wired in), or the `/api` functions will 500 in production even though they work locally:**
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
VITE_VAPID_PUBLIC_KEY=...          (same value as VAPID_PUBLIC_KEY)
```

**Also add these, or AutoGift reminders stay stuck as `status='scheduled'` and never actually send** (see §4):
```
SUPABASE_URL=https://zbhumepxaywxnluapcbs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Givit <notifications@yourdomain.com>
CRON_SECRET=...
```

Givit AI needs `VITE_GEMINI_API_KEY` added here — see §5. **Remember Vite env vars are baked in at build time**: adding or changing any `VITE_`-prefixed variable in Vercel requires a new deployment (redeploy) to actually take effect, not just a restart.

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

**Actually sending the reminders:** adding a recipient/occasion writes rows into `gift_notifications` with `status='scheduled'`, but writing the row was never the same as sending it — nothing dispatched those until `api/cron/dispatch-notifications.ts` was added. Vercel Cron (see `vercel.json`) hits that endpoint daily; it finds every notification whose `scheduled_for` has passed, emails the `email`-channel ones via Resend and pushes the `push`-channel ones via the existing Web Push setup, then marks each `sent` or `failed`. It needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` set in Vercel (see §1/§3) — without them it 500s harmlessly (nothing gets marked sent, so it'll retry next run) rather than silently doing nothing. You can trigger it manually to test: `curl -X POST https://your-app.vercel.app/api/cron/dispatch-notifications -H "Authorization: Bearer $CRON_SECRET"`.
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

### 5. Givit AI (Gemini generateContent API)

Givit AI runs client-side through Google's Gemini `generateContent` REST API using `VITE_GEMINI_API_KEY`. Set this in `.env.local` for local development and in Vercel → Project Settings → Environment Variables for production. The thin wrapper lives at `src/lib/ai/gemini-client.ts`.

Because `VITE_` variables are bundled into the browser, use a browser-restricted Gemini API key. The app still falls back to the existing deterministic rule-based matching if the AI call fails, so nothing crashes and results just get less personalized.

Current AI entry points:

- `src/lib/ai/gift-ai.ts` — builds the prompts and calls Gemini for the `/gift` chat finder and AutoGift's survey-to-suggestions step
- `src/lib/admin/imported-products.ts` (`extractProductWithAI`) — powers admin's "paste a link/spreadsheet of links, get products" bulk import
- `api/photo.ts` + `api/metadata.ts` — small serverless functions that stay server-side on purpose: they proxy Microlink (for real product photos and page metadata) to avoid CORS/rate-limit issues calling it directly from the browser. Neither needs a secret key. `pnpm run dev` mirrors both locally via `aiApiDevMiddleware` in `vite.config.ts`.
- `api/push/send.ts` — sends a Web Push notification to a saved subscription (unrelated to AI, still server-side since it needs the VAPID private key)
Every AI call is constrained to **only pick from a list of real candidate products/ids you already have** — it's never allowed to invent a product, price, or link, so a bad AI response can only mean "picked a worse gift," never a broken checkout link.

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
| `/` | Landing splash — sign in, sign up, or continue as a guest | Public |
| `/home` | Home (marketplace-rich homepage) | Public (browsing only) |
| `/products` | Marketplace | Public (browsing only) |
| `/gift` | Givit AI gift finder | Public (browsing only) |
| `/boards` | Gift boards | Public view, login for create/like/comment |
| `/concierge` | AutoGift setup | Public (60-second tour only), login required to actually set up or order |
| `/submit-product` | Submit a product | Login required to submit (browsing/preview is public) |
| `/admin` | Admin dashboard | Admin role only |
| `/account` | User account | Login required |
| `/feedback` | Contact & Feedback | Public |

`/` shows the splash on every visit, not just the first — the only auto-skip is for visitors who are already signed in (redirected straight to `/home`, since a sign-in/sign-up screen doesn't make sense for them). Anonymous visitors always get the choice of signing in, signing up, or "Continue browsing without an account." Browsing (marketplace, product pages, Givit AI, public boards) never requires an account; every write action (submit a product, save/wishlist, write a review, create/like/comment on a board, place an AutoGift order) does.

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
- **AI:** Gemini generateContent API (client-side, via `VITE_GEMINI_API_KEY`) — see §5 above
- **Photos:** Microlink (scrapes real og:image metadata from product URLs) via `/api/photo` and `/api/metadata`
- **Push notifications:** Web Push (VAPID) + a service worker at `public/sw.js` — see §6 above
- **Payments:** Stripe (API keys configured, UI ready) — checkout itself is not wired up; the business model redirects to the retailer (Amazon, etc.) for affiliate commission rather than taking payment in-app, except for AutoGift concierge orders
- **Shipping:** Shippo (API key configured)
- **Deployment:** Vercel (SPA with client-side routing + `/api` serverless functions)