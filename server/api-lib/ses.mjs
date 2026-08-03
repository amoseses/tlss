import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION });

export async function sendSesEmail(to, subject, html, text) {
  const from = process.env.SES_FROM_EMAIL;
  if (!process.env.AWS_REGION || !from) {
    throw new Error("AWS_REGION / SES_FROM_EMAIL are not configured on the server.");
  }

  const command = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
        ...(text ? { Text: { Data: text } } : {}),
      },
    },
  });

  return ses.send(command);
}
