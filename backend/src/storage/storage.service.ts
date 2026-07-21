import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

type Folder = 'videos' | 'pdfs' | 'resources' | 'receipts';

const FOLDER_RULES: Record<
  Folder,
  { maxBytes: number; allowedTypes: string[] }
> = {
  videos: {
    maxBytes: 2 * 1024 * 1024 * 1024, // 2GB
    allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'],
  },
  pdfs: {
    maxBytes: 20 * 1024 * 1024, // 20MB
    allowedTypes: ['application/pdf'],
  },
  receipts: {
    maxBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  resources: {
    maxBytes: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/zip',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
};

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

  private validateUpload(folder: Folder, contentType: string, fileSizeBytes: number) {
    const rule = FOLDER_RULES[folder];
    if (!rule) {
      throw new BadRequestException('Geçersiz klasör tipi.');
    }
    if (!rule.allowedTypes.includes(contentType)) {
      throw new BadRequestException(
        `Bu klasör için izin verilmeyen dosya tipi: ${contentType}`,
      );
    }
    if (!fileSizeBytes || fileSizeBytes <= 0) {
      throw new BadRequestException('Dosya boyutu belirtilmedi.');
    }
    if (fileSizeBytes > rule.maxBytes) {
      const maxMb = Math.round(rule.maxBytes / (1024 * 1024));
      throw new BadRequestException(
        `Dosya boyutu limiti aşıldı. Maksimum: ${maxMb}MB`,
      );
    }
  }

  async getUploadUrl(
    fileName: string,
    contentType: string,
    folder: Folder,
    fileSizeBytes: number,
  ) {
    this.validateUpload(folder, contentType, fileSizeBytes);

    const client = this.getClient();
    const bucket = this.getBucket();
    const key = `${folder}/${randomUUID()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
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
