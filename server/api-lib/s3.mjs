import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_EXPIRES_SECONDS = 300;

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function getUploadUrl(key, contentType) {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!process.env.AWS_REGION || !bucket) {
    throw new Error("AWS_REGION / AWS_S3_BUCKET are not configured on the server.");
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, { expiresIn: UPLOAD_URL_EXPIRES_SECONDS });
}
