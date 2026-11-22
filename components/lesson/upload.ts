/** Uploads a file to storage through a presigned URL and returns its storage key. */
export async function uploadToStorage(file: File, folder: string, uploadError = "Failed to upload file to Cloudflare R2"): Promise<string> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, filetype: file.type, folder }),
  })
  if (!presignRes.ok) throw new Error("Failed to get upload signature")

  const { uploadUrl, key } = (await presignRes.json()) as { uploadUrl?: string; key: string }
  if (uploadUrl) {
    const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
    if (!uploadRes.ok) throw new Error(uploadError)
  }
  return key
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
}
