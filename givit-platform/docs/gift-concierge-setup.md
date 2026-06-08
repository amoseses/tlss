# Givit Gift Concierge Setup

This document describes the automated gifting system: login-first onboarding, recipient/date capture, safe checkout setup, five-week survey notifications, AI-generated gift boxes, approval, and fulfillment task routing.

## What is included

- A site-wide login prompt that routes customers to `/login?next=/concierge` or `/signup?next=/concierge` before setup.
- `/concierge` setup dashboard with a service on/off switch, safe payment-method token field, default address field, and recipient/date/address capture.
- No seeded concierge recipients or fake approval examples; the queue starts empty until the customer enters real setup data.
- Survey notification scheduling at 35 days before the occasion.
- Approval notification scheduling with a delivery buffer before the occasion.
- Givit survey fields that feed bundle generation.
- AI bundle generation that can include a main gift, handwritten card, flowers/add-ons, tickets/experiences, shipping, and service coordination.
- Approval handling that creates order tasks for marketplace, admin-task, affiliate-checkout, and digital-delivery routes.
- Supabase migration for persistent recipients, occasions, notifications, approvals, approval items, and fulfillment tasks.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.local.example .env.local
```

3. Fill in Supabase, Stripe, Shippo, notification, and order-adapter values in `.env.local`.

4. Apply migrations in order, including:

```text
supabase/migrations/20260608000000_gift_concierge_automation.sql
```

5. Run the app:

```bash
npm run dev
```

6. Open `http://localhost:3000/`. The first prompt points customers to login/signup and then `/concierge`.

## Required configuration

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SHIPPO_API_TOKEN=shippo_test_...
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
NOTIFICATION_EMAIL_FROM=Givit <notifications@example.com>
SMS_PROVIDER_API_KEY=
GIVIT_SURVEY_LEAD_DAYS=35
GIVIT_DELIVERY_BUFFER_DAYS=5
GIFT_AI_PROVIDER=local
GIFT_AI_API_KEY=
GIFT_ORDER_ADAPTERS=marketplace,admin_task,affiliate_checkout,digital_delivery
GIFT_EXTERNAL_ORDER_ALLOWLIST=https://api.stripe.com,https://api.goshippo.com
ADMIN_ORDER_EMAIL=orders@example.com
```

## Production workflow

### 1. Login-first setup

- Anonymous visitors see the Givit Autopilot prompt.
- Login and signup links include `next=/concierge` so the customer lands directly in setup.
- `/concierge` also shows a login-required banner if the customer opens setup while logged out.

### 2. Service switch

- The customer explicitly turns Givit service on.
- If service is off, recipient data can be saved, but no survey/approval notifications or order tasks should run.

### 3. Payment setup

- Use Stripe Elements with a SetupIntent.
- Store only `stripe_customer_id`, Stripe payment method IDs, and display labels such as `Visa ending in 4242`.
- Do not store full card numbers, CVC, or raw payment forms in Supabase, local storage, logs, or notification payloads.
- Create a PaymentIntent only after the customer approves the generated bundle.

### 4. Address and delivery setup

- Store default buyer address data on the account/profile.
- Store per-recipient shipping or digital delivery details with each recipient.
- Use delivery preference to choose shipped, digital, or mixed fulfillment.

### 5. Five-week Givit survey notifications

- When an occasion is created or updated, schedule a `survey` notification for `occasion_date - 35 days`.
- If the occasion is already inside 35 days, schedule the survey immediately.
- The survey asks what the recipient likes now, what the gift should feel like, what to avoid, and whether flowers/card/tickets/shipped present makes sense.

### 6. AI gift box generation

- The current implementation uses deterministic scoring and survey signals in the app.
- To attach a hosted LLM/agent, set `GIFT_AI_PROVIDER` and `GIFT_AI_API_KEY`, then keep the generated output constrained to a structured bundle:
  - `items[]` with title, type, price estimate, and fulfillment route.
  - `card_message`.
  - `rationale`.
  - `approval_required=true`.
- The agent should not receive raw card numbers. It can use approved provider adapters and saved Stripe tokens after approval.

### 7. Approval and ordering

- Before approval, Givit only prepares the bundle.
- After approval, charge through Stripe and create fulfillment tasks:
  - `marketplace`: create seller orders for Givit catalog items.
  - `admin_task`: send cards or unsupported purchases to the admin order account.
  - `affiliate_checkout`: call configured florist/gift partner APIs where available.
  - `digital_delivery`: create ticket/experience delivery tasks.
- Avoid unrestricted browser automation for checkout. Use allowlisted APIs/adapters so orders are auditable and payment details remain protected.

## Database persistence

The migration `supabase/migrations/20260608000000_gift_concierge_automation.sql` creates:

- `gift_recipients`
- `gift_occasions`
- `gift_notifications`
- `gift_approvals`
- `gift_approval_items`
- `gift_fulfillment_tasks`

Add worker jobs that:

1. Query due scheduled notifications.
2. Send push/email/SMS/in-app messages.
3. Mark notifications as sent.
4. Generate or refresh the bundle when survey answers arrive.
5. Create payment and fulfillment work only after approval.
