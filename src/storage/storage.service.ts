import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private getClient(): S3Client {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException(
        'Dosya depolama henüz yapılandırılmadı (R2 bilgileri eksik).',
      );
    }

    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private getBucket(): string {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      throw new ServiceUnavailableException('R2_BUCKET_NAME tanımlı değil.');
    }
    return bucket;
  }

  async getUploadUrl(fileName: string, contentType: string, folder: 'videos' | 'pdfs' | 'resources') {
    const client = this.getClient();
    const bucket = this.getBucket();

    const key = `${folder}/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

    return { uploadUrl, key };
  }

  async getPlayUrl(key: string) {
    const client = this.getClient();
    const bucket = this.getBucket();

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });

    return { url, expiresAt: new Date(Date.now() + 3600 * 1000) };
  }
}
