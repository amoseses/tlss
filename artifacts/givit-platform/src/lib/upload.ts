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
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Could not upload the file.");
  }

  return { key, url: uploadUrl.split("?")[0] };
}
