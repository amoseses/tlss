export async function uploadFileToS3(file: File, prefix = "uploads") {
  const res = await fetch("/api/upload/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", prefix }),
  });

  if (!res.ok) {
    throw new Error("Could not create an upload URL.");
  }

  const { uploadUrl, key } = (await res.json()) as { uploadUrl: string; key: string };
  let uploadRes: Response;
  try {
    uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
  } catch (err) {
    // A network-level failure here (as opposed to an HTTP error status,
    // handled below) is almost always the S3 bucket's CORS config not
    // allowing this exact origin/method/header combo -- log the pieces
    // needed to check that against the bucket's CORS rules, since the
    // browser's own "Failed to fetch" gives none of this.
    console.error("[upload] Direct-to-S3 PUT failed at the network level.", {
      bucketHost: new URL(uploadUrl).host,
      pageOrigin: window.location.origin,
      contentType: file.type || "application/octet-stream",
      cause: err,
    });
    throw err;
  }

  if (!uploadRes.ok) {
    throw new Error("Could not upload the file.");
  }

  return { key, url: uploadUrl.split("?")[0] };
}
