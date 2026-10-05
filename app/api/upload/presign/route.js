import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getToken } from "next-auth/jwt";
import { getR2, canUpload } from "@/lib/r2";

// Returns the upload URL and the object KEY. Callers persist the key; reads go through /api/files.
export async function POST(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { filename, filetype, folder } = await req.json();
    const key = folder ? `${folder}/${Date.now()}_${filename}` : `${Date.now()}_${filename}`;
    if (!canUpload(token, key)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const r2 = getR2();
    // Fallback to development mock if env is not fully set up
    if (!r2) {
      console.warn("Cloudflare R2 credentials not fully configured in env. Using dev mock fallback.");
      return Response.json({
        uploadUrl: null, // Signifies client should mock/simulate upload progress
        key,
        mock: true
      });
    }

    const command = new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      ContentType: filetype,
    });

    const uploadUrl = await getSignedUrl(r2.s3, command, { expiresIn: 3600 });

    return Response.json({ uploadUrl, key });
  } catch (error) {
    console.error("R2 Presigned URL Generation Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
