# Givit Gift Concierge Setup

This document describes the first-round automated gifting system: user onboarding, saved recipients and dates, notification scheduling, AI-generated bundles, approval, Stripe-safe charging, shipping/card/flower/ticket fulfillment, and homemade seller support.

## What shipped in this round

- `/concierge` interactive setup dashboard for the full autopilot flow.
- First-visit login prompt points users to `/login?next=/concierge` before notification setup.
- Browser push-style notification permission request plus an in-app notification schedule.
- Recipient/date setup form with required real names, dates, budget, delivery address, interests, avoid-list, and delivery preference; the empty default state contains no example people or demo bundles.
- Service on/off confirmation before automation can approve fulfillment.
- Givit survey notifications are scheduled 35 days (five weeks) before each occasion.
- Survey answers generate approval bundles: main gift, handwritten card, flowers/add-ons, shipping, or digital experience/tickets.
- Regenerate and approve states so the user remains in control before Givit charges or orders anything.
- Provider configuration in `.env.local.example` for survey lead time, approval lead time, shipping buffer, Shippo, florist provider, admin order queue, and external checkout agent gating.
- Supabase migration for persistent recipients, occasions, notifications, approvals, approval items, and fulfillment tasks.
- Account and site navigation entry points.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.local.example .env.local
```

3. Fill in Supabase, Stripe, and Shippo values in `.env.local`.

4. Apply migrations in order, including:

```text
supabase/migrations/20260608000000_gift_concierge_automation.sql
```

5. Run the app:

```bash
npm run dev
```

6. Open `http://localhost:3000/concierge`. The root layout also shows a first-visit login prompt that links to `/login?next=/concierge`.

## Production integration plan

### 1. Authentication and onboarding

- Prompt anonymous users to log in before saving concierge setup.
- Ask only skippable essentials first: recipient name, relationship, dates, budget, interests, avoid-list, delivery preference.
- Store durable data in `gift_recipients` and `gift_occasions`.
- Keep the UI short enough for notification deep links: the user should answer a few questions and return directly to approval.

### 2. Payment setup

- Use Stripe Elements with a SetupIntent.
- Store only `stripe_customer_id` and Stripe payment method IDs; never store raw card numbers.
- Create a PaymentIntent only after the user approves a bundle.
- Attach the resulting `stripe_payment_intent_id` to `gift_approvals`.

### 3. Address and delivery setup

- Store default shipping address fields on `profiles` for the buyer.
- Store per-recipient delivery details in `gift_recipients`.
- Use `delivery_preference` to decide between physical shipping, digital delivery, or either.

### 4. Concierge automation configuration

Set these environment variables before enabling production automation:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GIFT_SURVEY_LEAD_DAYS` | Defaults to `35`, scheduling the Givit survey five weeks before the occasion. |
| `NEXT_PUBLIC_GIFT_APPROVAL_LEAD_DAYS` | Defaults to `10`, controlling the final approval reminder before the gift deadline. |
| `NEXT_PUBLIC_GIFT_SHIPPING_BUFFER_DAYS` | Defaults to `5`, setting the target delivery buffer before the date. |
| `NEXT_PUBLIC_ENABLE_EXTERNAL_CHECKOUT_AGENT` | Enables an approved browser-agent checkout route only when provider credentials, retailer allow-listing, and legal review are complete. |
| `GIFT_EXTERNAL_CHECKOUT_ALLOWLIST` | Server-side allow-list for sites the external checkout worker may use. |
| `GIFT_ADMIN_ORDER_QUEUE_EMAIL` | Admin queue destination for card, flower, or outside-site purchases that cannot be safely automated. |

### 5. Notification system

- Schedule records in `gift_notifications` when an occasion is created or updated. The first notification is the Givit survey, scheduled exactly five weeks (`35` days by default) before the occasion date.
- A cron worker should query `gift_notifications` where `status = 'scheduled'` and `scheduled_for <= now()`.
- Send via the selected channel:
  - `push`: Web Push or native wrapper provider.
  - `email`: transactional email provider.
  - `sms`: SMS provider.
  - `in_app`: show the notification in the account/concierge UI.
- Deep link notification taps to `/concierge` or a future `/concierge/approvals/[id]` route.

### 6. AI bundle generation

- Use existing `/api/gift-recommend` output as the main product ranking source.
- Add bundle orchestration that expands a recommendation into:
  - product or homemade seller item,
  - card message,
  - flowers/add-on when appropriate,
  - tickets or digital experience when the questionnaire suggests it,
  - shipping and delivery buffer.
- Persist the proposed bundle in `gift_approvals` and `gift_approval_items` with `status = 'needs_approval'`.

### 7. Approval and regeneration

- The user can approve, regenerate, skip, or cancel.
- Approval should:
  1. Validate payment method and delivery address.
  2. Create Stripe PaymentIntent.
  3. Mark `gift_approvals.status = 'approved'`.
  4. Create `gift_fulfillment_tasks`.
- Regeneration should keep the occasion/recipient context and record the user’s rejection reason.

### 8. Fulfillment tasks

Use `gift_fulfillment_tasks.task_type` to fan out work:

| Task type | Purpose |
|---|---|
| `seller_order` | Internal marketplace/homemade seller purchase. |
| `affiliate_checkout` | External retailer checkout workflow. |
| `card_writer` | Handwritten card provider or internal operations queue. |
| `florist` | Flower provider ordering. |
| `ticket_transfer` | Email/mobile ticket delivery. |
| `shipment` | Shippo label/rate/tracking workflow. |

### 9. Homemade seller support

- Seller-created products remain normal marketplace products.
- AI should consider seller handling time, inventory, and shipping buffer before recommending handmade goods.
- If a handmade item cannot arrive in time, Givit should choose a digital/experience backup or ask for approval to send late.

## Safety rules

- Never charge until the user approves.
- Never store raw card data.
- Always preserve enough buffer for shipping and seller handling.
- Always show a full itemized bundle total before approval.
- Always support regeneration if the user dislikes a recommendation.

## Admin + Supabase checklist for this build

1. **Run all migrations** in `supabase/migrations`, especially:
   - `20260608000000_gift_concierge_automation.sql`
   - `20260610000000_gift_concierge_upgrade.sql`
2. **Create your admin account** in the app, then set your profile role in Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_ADMIN_EMAIL@example.com';
```

3. **Product admin** lives at `/admin/products`. Admins can see all products, create products, edit listings, publish/draft, and upload product images to the `product-images` storage bucket.
4. **Gift fulfillment admin** lives at `/admin/orders`. Approved concierge gifts appear after Stripe charges the saved card and the app creates `gift_fulfillment_tasks`.
5. **Storage bucket**: create a public bucket named `product-images` if it does not already exist. Product images uploaded in admin are stored there.
6. **Stripe env vars** required for card setup and approval charging:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET` if using webhooks
7. **Cron notification endpoint**: call `POST /api/cron/gift-notifications` on a schedule. If `CRON_SECRET` is set, send `Authorization: Bearer <CRON_SECRET>`.
8. **Concierge timing**: leave `NEXT_PUBLIC_GIFT_SURVEY_LEAD_DAYS=35` for five weeks, or set `42` for six weeks.
9. **Optional providers**: set `NEXT_PUBLIC_SHIPPO_ENABLED=true`, `NEXT_PUBLIC_FLORIST_PROVIDER_ENABLED=true`, or `NEXT_PUBLIC_ENABLE_EXTERNAL_CHECKOUT_AGENT=true` only after those provider credentials and allow-lists are ready. Otherwise the admin queue handles fulfillment manually.
