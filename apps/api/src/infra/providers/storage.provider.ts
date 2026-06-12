import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface PresignedUpload {
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

/**
 * S3-compatible object storage (MinIO in dev). Clients upload directly via
 * presigned PUT; the API never proxies file bytes. Content type and size are
 * constrained at presign time and re-checked on completion.
 */
@Injectable()
export class StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', 'sanad-media');
    this.client = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT'),
      region: config.get<string>('S3_REGION', 'me-central-1'),
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  async presignUpload(prefix: string, contentType: string, maxBytes: number): Promise<PresignedUpload> {
    const storageKey = `${prefix}/${randomUUID()}`;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: contentType,
      ContentLength: maxBytes, // upper bound hint; size re-verified on complete
    });
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: 600 });
    return { storageKey, uploadUrl, expiresInSeconds: 600 };
  }

  /** Returns actual object size, or null if the object was never uploaded. */
  async headObject(storageKey: string): Promise<{ sizeBytes: number; contentType?: string } | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
      return { sizeBytes: res.ContentLength ?? 0, contentType: res.ContentType };
    } catch {
      return null;
    }
  }
}
