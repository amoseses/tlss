/// <reference path="../mjs-modules.d.ts" />
import { randomUUID } from "node:crypto";
import { uploadFileDirect } from "../../server/api-lib/s3.mjs";

const MAX_FILE_NAME_LENGTH = 160;
// Vercel serverless functions cap request bodies around 4.5MB; the client
// resizes images before base64-encoding them, but this is the server-side
// backstop against anything unexpectedly large getting through.
const MAX_BASE64_LENGTH = 6_000_000;

function safeFileName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "upload";
  return value
    .trim()
    .slice(0, MAX_FILE_NAME_LENGTH)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "upload";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { fileName, contentType, prefix = "uploads", dataBase64 } = req.body ?? {};
  if (typeof contentType !== "string" || !contentType.trim()) {
    res.status(400).json({ error: "contentType is required." });
    return;
  }
  if (typeof dataBase64 !== "string" || !dataBase64) {
    res.status(400).json({ error: "dataBase64 is required." });
    return;
  }
  if (dataBase64.length > MAX_BASE64_LENGTH) {
    res.status(413).json({ error: "That file is too large." });
    return;
  }

  const normalizedPrefix = typeof prefix === "string" && prefix.trim() ? safeFileName(prefix) : "uploads";
  const key = `${normalizedPrefix}/${randomUUID()}-${safeFileName(fileName)}`;

  try {
    const buffer = Buffer.from(dataBase64, "base64");
    const url = await uploadFileDirect(key, contentType.trim(), buffer);
    res.status(200).json({ url, key });
  } catch (error: any) {
    // Surfaced verbatim (not a generic message) -- AWS SDK errors here are
    // descriptive ("Access Denied", "The specified bucket does not
    // exist", a missing-credentials message) and not secret-leaking, and
    // there's no way to check Vercel's function logs directly, so a vague
    // "couldn't upload" here would just be another dead end to debug.
    console.error("S3 upload failed:", error?.message);
    res.status(502).json({ error: error?.message ? `Upload failed: ${error.message}` : "Couldn't upload the file right now." });
  }
}
