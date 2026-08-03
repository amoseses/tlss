// Thin wrapper around AWS SES transactional email. Requires AWS_REGION and
// SES_FROM_EMAIL to be set; AWS credentials are read by the AWS SDK's default
// credential provider chain in the serverless/runtime environment.
import { sendSesEmail } from "./ses.mjs";

export async function sendEmail({ to, subject, html, text }) {
  return sendSesEmail(to, subject, html, text);
}
