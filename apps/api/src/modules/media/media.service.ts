import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '../../infra/providers/storage.provider';

/** Strict allow-list — uploads outside these types are rejected at presign. */
const ALLOWED_MIME: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  video: ['video/mp4', 'video/quicktime'],
  audio: ['audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac'],
  document: ['application/pdf', 'image/jpeg', 'image/png'],
};

@Injectable()
export class MediaService {
  constructor(
    private readonly storage: StorageProvider,
    private readonly config: ConfigService,
  ) {}

  maxBytes(): number {
    return Number(this.config.get('MEDIA_MAX_BYTES', 25 * 1024 * 1024));
  }

  assertAllowed(category: keyof typeof ALLOWED_MIME, contentType: string): void {
    const allowed = ALLOWED_MIME[category] ?? [];
    if (!allowed.includes(contentType.toLowerCase())) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: `Content type ${contentType} is not allowed for ${category} uploads`,
      });
    }
  }

  async presign(userId: string, category: keyof typeof ALLOWED_MIME, contentType: string) {
    this.assertAllowed(category, contentType);
    return this.storage.presignUpload(`uploads/${userId}/${category}`, contentType, this.maxBytes());
  }

  /**
   * Verifies the object actually exists and respects the size limit.
   * scanStatus stays PENDING until the AV-scan integration
   * (REQUIRES-EXTERNAL) marks it CLEAN; evidence is accepted but flagged.
   */
  async verifyUploaded(storageKey: string): Promise<{ sizeBytes: number; contentType?: string }> {
    const head = await this.storage.headObject(storageKey);
    if (!head) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Upload not found — complete the upload before attaching it',
      });
    }
    if (head.sizeBytes > this.maxBytes()) {
      throw new BadRequestException({
        error: 'VALIDATION_FAILED',
        message: 'Uploaded file exceeds the size limit',
      });
    }
    return head;
  }
}
