# Givit Platform

Gift marketplace + AI-powered AutoGift concierge.

## Quick Start

See `.env.local` for all required environment variables.

```bash
pnpm install
pnpm run dev
```

Open http://localhost:3000

## Setup Checklist

- [ ] Create a Supabase project at https://supabase.com
- [ ] Copy `.env.local` and fill in your Supabase URL + anon key
- [ ] Run the SQL schema from `artifacts/givit-platform/src/lib/supabase/admin-schema.sql` in the Supabase SQL Editor
- [ ] (Optional) Add a Stripe secret key + webhook secret for AutoGift charging
- [ ] (Optional) Add a Shippo token for shipping labels
- [ ] Upload your logo to `artifacts/givit-platform/public/logo.png`

## Env Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SHIPPO_API_TOKEN` | Shippo API token for shipping |
| `NEXT_PUBLIC_APP_URL` | Base URL of your deployed app |

## Key Pages

- `/` — Home
- `/products` — Marketplace
- `/gift` — AI gift finder
- `/boards` — Gift boards
- `/concierge` — AutoGift setup
- `/submit-product` — Submit a product for review
- `/admin` — Admin dashboard (requires admin role)
- `/account` — User account

## Notes

- Admin orders show up in the `/admin` page directly in the Givit portal, not in Supabase.
- Email notifications are handled through Supabase (add trigger functions in Supabase for email notifications).
- Gift boards can have custom cover images uploaded at creation.
- Product submissions from customers require admin approval via the admin panel.