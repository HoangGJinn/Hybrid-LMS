import {
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildAttachmentDisposition } from '../utils/content-disposition.util.js';

export interface DownloadUrlInput {
  readonly storageKey: string;
  readonly fileName: string;
  readonly contentType: string;
}

export interface UploadFormInput {
  readonly storageKey: string;
  readonly contentType: string;
  readonly maxSizeBytes: number;
}

export interface UploadForm {
  readonly url: string;
  readonly fields: Readonly<Record<string, string>>;
}

export interface StoredObjectInfo {
  readonly size: number;
  readonly contentType: string | undefined;
}

/** The only class that talks to AWS S3; the bucket stays private and is reached through presigned URLs. */
@Injectable()
export class FileStorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly downloadUrlTtlSeconds: number;
  private readonly uploadUrlTtlSeconds: number;

  constructor(configService: ConfigService) {
    this.bucketName = configService.getOrThrow<string>('S3_BUCKET_NAME');
    this.downloadUrlTtlSeconds = configService.getOrThrow<number>(
      'S3_DOWNLOAD_URL_TTL',
    );
    this.uploadUrlTtlSeconds =
      configService.getOrThrow<number>('S3_UPLOAD_URL_TTL');
    // Credentials come from the SDK default chain (IAM role in AWS, AWS_* variables locally).
    this.s3Client = new S3Client({
      region: configService.getOrThrow<string>('AWS_REGION'),
    });
  }

  /** Signs a short-lived GET URL, so the backend never streams file bytes itself. */
  async createDownloadUrl(input: DownloadUrlInput): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: input.storageKey,
      ResponseContentDisposition: buildAttachmentDisposition(input.fileName),
      ResponseContentType: input.contentType,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: this.downloadUrlTtlSeconds,
    });
  }

  /**
   * Signs a POST form that lets the browser upload exactly one object to exactly one key.
   * The policy pins the content type and caps the size, so S3 itself rejects anything else.
   */
  async createUploadForm(input: UploadFormInput): Promise<UploadForm> {
    return createPresignedPost(this.s3Client, {
      Bucket: this.bucketName,
      Key: input.storageKey,
      Expires: this.uploadUrlTtlSeconds,
      Fields: { 'Content-Type': input.contentType },
      Conditions: [
        ['content-length-range', 1, input.maxSizeBytes],
        ['eq', '$Content-Type', input.contentType],
      ],
    });
  }

  /** Reads the real size and type of a stored object, or null when it was never uploaded. */
  async findObjectInfo(storageKey: string): Promise<StoredObjectInfo | null> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: storageKey }),
      );
      return {
        size: response.ContentLength ?? 0,
        contentType: response.ContentType,
      };
    } catch (error) {
      if (error instanceof NotFound) return null;
      throw error;
    }
  }
}
