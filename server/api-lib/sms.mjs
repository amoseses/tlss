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
