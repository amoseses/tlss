// Thin wrapper around Resend's REST API (no SDK dependency, matches the
// rest of api/_lib). Requires RESEND_API_KEY and RESEND_FROM_EMAIL to be
// set — RESEND_FROM_EMAIL must be an address on a domain verified in the
// Resend dashboard, or sends will fail.

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY / RESEND_FROM_EMAIL are not configured on the server.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${errorText || res.statusText}`);
  }
  return res.json();
}
