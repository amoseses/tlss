import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({ region: process.env.AWS_REGION });

export async function sendSms(phoneNumber, message) {
  // phoneNumber must be E.164 format: +1XXXXXXXXXX
  return sns.send(
    new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        "AWS.SNS.SMS.SMSType": {
          DataType: "String",
          StringValue: "Transactional",
        },
      },
    }),
  );
}

// Standard CTIA/carrier keywords a US recipient can reply with. Matched as
// the whole trimmed message (case-insensitive) rather than a substring, so
// "stop by later" doesn't accidentally opt someone out.
const STOP_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
const START_KEYWORDS = new Set(["start", "unstop", "yes"]);
const HELP_KEYWORDS = new Set(["help", "info"]);

export function classifySmsKeyword(body) {
  const normalized = typeof body === "string" ? body.trim().toLowerCase() : "";
  if (STOP_KEYWORDS.has(normalized)) return "stop";
  if (START_KEYWORDS.has(normalized)) return "start";
  if (HELP_KEYWORDS.has(normalized)) return "help";
  return null;
}
