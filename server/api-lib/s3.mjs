import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION?.trim();
const s3 = new S3Client({ region });

// Env vars pasted into Vercel routinely carry stray whitespace, or the
// bucket's URL/ARN instead of its bare name -- any of which S3 reports as
// "The specified bucket does not exist". Normalizing here means those
// paste mistakes just work instead of needing a redeploy to fix.
function bucketName() {
  const raw = process.env.AWS_S3_BUCKET?.trim();
  if (!region || !raw) {
    throw new Error("AWS_REGION / AWS_S3_BUCKET are not configured on the server.");
  }
  return raw
    .replace(/^arn:aws:s3:::/i, "")
    .replace(/^s3:\/\//i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/\.s3([.-][a-z0-9-]+)?\.amazonaws\.com.*$/i, "")
    .replace(/\/.*$/, "");
}

// Uploads the file server-side and hands back its public URL, rather than
// a presigned URL for the browser to PUT to directly -- a direct-from-
// browser PUT is a cross-origin request the S3 bucket's own CORS config
// has to explicitly allow, which was a recurring point of failure. A
// server-to-server PutObjectCommand has no CORS layer to misconfigure.
export async function uploadFileDirect(key, contentType, buffer) {
  const bucket = bucketName();
  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
  } catch (error) {
    // Bucket names aren't secret, and naming the exact value the server
    // tried is what makes this diagnosable without Vercel log access.
    if (error?.name === "NoSuchBucket") {
      throw new Error(`Bucket "${bucket}" doesn't exist in region "${region}". Check AWS_S3_BUCKET and AWS_REGION in Vercel match a real bucket.`);
    }
    throw error;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
