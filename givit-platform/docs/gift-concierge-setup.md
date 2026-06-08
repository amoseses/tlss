# Givit Gift Concierge Setup

This document describes the first-round automated gifting system: user onboarding, saved recipients and dates, notification scheduling, AI-generated bundles, approval, Stripe-safe charging, shipping/card/flower/ticket fulfillment, and homemade seller support.

## What shipped in this round

- `/concierge` interactive setup dashboard for the full autopilot flow.
- Browser push-style notification permission request plus an in-app notification schedule.
- Recipient/date setup form with budget, interests, avoid-list, address/delivery preference, and instant approval bundle generation.
- Approval queue with complete bundles: main gift, handwritten card, flowers/add-ons, shipping, or digital experience/tickets.
- Regenerate and approve states so the user remains in control before Givit charges or orders anything.
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

6. Open `http://localhost:3000/concierge`.

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

### 4. Notification system

- Schedule records in `gift_notifications` when an occasion is created or updated.
- A cron worker should query `gift_notifications` where `status = 'scheduled'` and `scheduled_for <= now()`.
- Send via the selected channel:
  - `push`: Web Push or native wrapper provider.
  - `email`: transactional email provider.
  - `sms`: SMS provider.
  - `in_app`: show the notification in the account/concierge UI.
- Deep link notification taps to `/concierge` or a future `/concierge/approvals/[id]` route.

### 5. AI bundle generation

- Use existing `/api/gift-recommend` output as the main product ranking source.
- Add bundle orchestration that expands a recommendation into:
  - product or homemade seller item,
  - card message,
  - flowers/add-on when appropriate,
  - tickets or digital experience when the questionnaire suggests it,
  - shipping and delivery buffer.
- Persist the proposed bundle in `gift_approvals` and `gift_approval_items` with `status = 'needs_approval'`.

### 6. Approval and regeneration

- The user can approve, regenerate, skip, or cancel.
- Approval should:
  1. Validate payment method and delivery address.
  2. Create Stripe PaymentIntent.
  3. Mark `gift_approvals.status = 'approved'`.
  4. Create `gift_fulfillment_tasks`.
- Regeneration should keep the occasion/recipient context and record the user’s rejection reason.

### 7. Fulfillment tasks

Use `gift_fulfillment_tasks.task_type` to fan out work:

| Task type | Purpose |
|---|---|
| `seller_order` | Internal marketplace/homemade seller purchase. |
| `affiliate_checkout` | External retailer checkout workflow. |
| `card_writer` | Handwritten card provider or internal operations queue. |
| `florist` | Flower provider ordering. |
| `ticket_transfer` | Email/mobile ticket delivery. |
| `shipment` | Shippo label/rate/tracking workflow. |

### 8. Homemade seller support

- Seller-created products remain normal marketplace products.
- AI should consider seller handling time, inventory, and shipping buffer before recommending handmade goods.
- If a handmade item cannot arrive in time, Givit should choose a digital/experience backup or ask for approval to send late.

## Safety rules

- Never charge until the user approves.
- Never store raw card data.
- Always preserve enough buffer for shipping and seller handling.
- Always show a full itemized bundle total before approval.
- Always support regeneration if the user dislikes a recommendation.
