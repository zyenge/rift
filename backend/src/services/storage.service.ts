import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { env } from '../config/env';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<string> {
  const ext = path.extname(originalName);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${env.R2_PUBLIC_URL}/${filename}`;
}
