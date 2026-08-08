/// <reference path="../mjs-modules.d.ts" />
import { randomUUID } from "node:crypto";
import { getUploadUrl } from "../../server/api-lib/s3.mjs";

const MAX_FILE_NAME_LENGTH = 160;

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

  const { fileName, contentType, prefix = "uploads" } = req.body ?? {};
  if (typeof contentType !== "string" || !contentType.trim()) {
    res.status(400).json({ error: "contentType is required." });
    return;
  }

  const normalizedPrefix = typeof prefix === "string" && prefix.trim() ? safeFileName(prefix) : "uploads";
  const key = `${normalizedPrefix}/${randomUUID()}-${safeFileName(fileName)}`;

  try {
    const uploadUrl = await getUploadUrl(key, contentType.trim());
    res.status(200).json({ uploadUrl, key });
  } catch (error: any) {
    console.error("S3 upload URL creation failed:", error?.message);
    res.status(502).json({ error: "Couldn't create an upload URL right now." });
  }
}
