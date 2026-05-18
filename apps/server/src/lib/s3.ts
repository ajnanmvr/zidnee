import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";

const region = env.AWS_REGION ?? "us-east-1";
const bucket = env.AWS_S3_BUCKET;
const accessKeyId = env.AWS_ACCESS_KEY_ID;
const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

const client = new S3Client({
  region,
  credentials:
    accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey,
        }
      : undefined,
});

export const uploadBuffer = async (
  buffer: Buffer,
  key: string,
  contentType?: string,
): Promise<string> => {
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured");

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "public-read",
  });

  await client.send(cmd);

  // Construct public URL
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
  return url;
};

export default client;

export const deleteObjectByKey = async (key: string): Promise<void> => {
  if (!bucket) return;
  const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await client.send(cmd);
};

export const deleteObjectFromUrl = async (url: string): Promise<void> => {
  try {
    if (!bucket) return;
    const u = new URL(url);
    // URL path starts with /{key}
    const key = decodeURIComponent(u.pathname.replace(/^\//, ""));
    if (!key) return;
    await deleteObjectByKey(key);
  } catch (err) {
    // swallow errors to avoid breaking user flows
    console.warn("Failed to delete S3 object from url", url, err);
  }
};
