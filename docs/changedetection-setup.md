# Setting Up changedetection.io for GIVIT Dynamic Pricing

This document details how to configure `changedetection.io` to automatically monitor retailer product links and post live price updates back to GIVIT via webhooks.

---

## 1. Launching changedetection.io

Run the Docker Compose file provided in the repository root:

```bash
docker compose -f docker-compose.changedetection.yml up -d
```

Access the Web Dashboard at: **`http://localhost:5000`** (or your server domain).

---

## 2. Global Webhook Configuration

1. In `changedetection.io`, click **SETTINGS** at the top right.
2. Navigate to **Notifications** / **Webhooks**.
3. Set your Notification URL to your GIVIT webhook endpoint:
   - **Local / Dev**: `http://host.docker.internal:5000/api/webhooks/price-update` (or via ngrok: `https://your-domain.ngrok-free.app/api/webhooks/price-update`)
   - **Production**: `https://givit.site/api/webhooks/price-update`
4. Set the **Notification Body Format** to `JSON`:
   ```json
   {
     "url": "{watch_url}",
     "price": "{result}",
     "title": "{watch_title}"
   }
   ```
5. *(Optional)* If `PRICE_SYNC_SECRET` is enabled on your server, add custom HTTP Header:
   `Authorization: Bearer YOUR_PRICE_SYNC_SECRET`

---

## 3. Adding Product Links to Monitor

1. Click **+ Add a new watch**.
2. Paste the retailer affiliate URL (e.g. `https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b`).
3. Click **Edit > Filters & Triggers**:
   - **CSS / XPath Selector**: Target the element holding the price (e.g., `.a-price-whole` for Amazon, or `[data-price]` / `.price`).
   - Alternatively, under **Extract Text**, enable Schema.org JSON-LD extraction.
4. Under **Fetch Method**: Select **Chrome (Playwright)** so dynamic JavaScript prices render correctly.

---

## 4. Testing the Webhook Directly via Curl

You can also test the GIVIT price update webhook manually using `curl`:

```bash
curl -X POST "http://localhost:5000/api/webhooks/price-update" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b",
    "price": "$349.99"
  }'
```
