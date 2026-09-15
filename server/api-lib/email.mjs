// Transactional email via Resend's REST API (plain fetch, no SDK -- same
// pattern as the rest of server/api-lib, e.g. google-calendar.mjs). Moved
// off AWS SES: SES needed the sending IAM user to have SES-specific
// permissions attached, which became a recurring blocker (a cofounder's
// IAM user lacked them with no easy self-service fix), and Resend's flow
// is domain-verify-then-go with no IAM layer at all.
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
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return res.json();
}
