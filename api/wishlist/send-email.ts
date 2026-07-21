/// <reference path="../mjs-modules.d.ts" />
// The wishlist "Email instead" button used to be a mailto: link, which
// does nothing when the visitor has no default mail client configured —
// this actually sends the email server-side via Resend instead, reusing
// the same integration built for AutoGift reminders.
import { sendEmail } from "../_lib/email.mjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS_LENGTH = 4000;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { to, fromName, items } = req.body ?? {};
  if (typeof to !== "string" || !EMAIL_PATTERN.test(to)) {
    res.status(400).json({ error: "A valid recipient email is required." });
    return;
  }
  if (typeof items !== "string" || !items.trim() || items.length > MAX_ITEMS_LENGTH) {
    res.status(400).json({ error: "Wishlist content is required." });
    return;
  }

  const senderLabel = typeof fromName === "string" && fromName.trim() ? fromName.trim().slice(0, 80) : "A friend";
  const subject = `${senderLabel} shared a Givit wishlist with you`;
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#c2542a">Givit</p>
    <h1 style="font-size:20px;margin:8px 0">${senderLabel} shared a wishlist with you</h1>
    <pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;line-height:1.6;color:#444">${items.replace(/[<>&]/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</pre>
  </div>`;

  try {
    await sendEmail({ to, subject, html, text: `${senderLabel} shared a Givit wishlist with you:\n\n${items}` });
    res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("wishlist send-email failed:", error?.message);
    res.status(502).json({ error: "Couldn't send the email right now." });
  }
}
