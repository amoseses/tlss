import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION });

function bucketName() {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!process.env.AWS_REGION || !bucket) {
    throw new Error("AWS_REGION / AWS_S3_BUCKET are not configured on the server.");
  }
  return bucket;
}

// Uploads the file server-side and hands back its public URL, rather than
// a presigned URL for the browser to PUT to directly -- a direct-from-
// browser PUT is a cross-origin request the S3 bucket's own CORS config
// has to explicitly allow, which was a recurring point of failure. A
// server-to-server PutObjectCommand has no CORS layer to misconfigure.
export async function uploadFileDirect(key, contentType, buffer) {
  const bucket = bucketName();
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
