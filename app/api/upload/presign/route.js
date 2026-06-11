import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(req) {
  try {
    const { filename, filetype, folder } = await req.json();

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

    // Fallback to development mock if env is not fully set up
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.warn("Cloudflare R2 credentials not fully configured in env. Using dev mock fallback.");
      const randomId = Date.now();
      const mockKey = folder ? `${folder}/${randomId}_${filename}` : `${randomId}_${filename}`;
      const mockPublicUrl = `/mock-uploads/${mockKey}`;
      return Response.json({
        uploadUrl: null, // Signifies client should mock/simulate upload progress
        publicUrl: mockPublicUrl,
        key: mockKey,
        mock: true
      });
    }

    const s3 = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: "auto",
    });

    const key = folder ? `${folder}/${Date.now()}_${filename}` : `${Date.now()}_${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: filetype,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const baseUrl = r2PublicUrl ? (r2PublicUrl.endsWith('/') ? r2PublicUrl : r2PublicUrl + '/') : `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/`;
    const publicUrl = `${baseUrl}${key}`;

    return Response.json({
      uploadUrl,
      publicUrl,
      key
    });
  } catch (error) {
    console.error("R2 Presigned URL Generation Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
