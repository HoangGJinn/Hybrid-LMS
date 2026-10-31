import { GetObjectCommand, NotFound, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileStorageService } from './file-storage.service.js';

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: vi.fn() }));
vi.mock('@aws-sdk/s3-presigned-post', () => ({ createPresignedPost: vi.fn() }));

const mockConfig: Record<string, string | number> = {
  S3_BUCKET_NAME: 'lms-test-files',
  S3_DOWNLOAD_URL_TTL: 900,
  S3_UPLOAD_URL_TTL: 600,
  AWS_REGION: 'ap-southeast-1',
};

describe('FileStorageService.createDownloadUrl', () => {
  let service: FileStorageService;
  const mockGetSignedUrl = vi.mocked(getSignedUrl);

  beforeEach(() => {
    mockGetSignedUrl.mockReset();
    const mockConfigService = {
      getOrThrow: vi.fn((key: string) => mockConfig[key]),
    } as unknown as ConfigService;
    service = new FileStorageService(mockConfigService);
  });

  it('should sign a GET command for the private bucket with the configured lifetime', async () => {
    mockGetSignedUrl.mockResolvedValue('https://signed.example/file');

    const actualUrl = await service.createDownloadUrl({
      storageKey: 'documents/lec-1/file-1.pdf',
      fileName: 'chuong1.pdf',
      contentType: 'application/pdf',
    });

    expect(actualUrl).toBe('https://signed.example/file');
    const [, mockCommand, mockOptions] = mockGetSignedUrl.mock.calls[0];
    expect(mockCommand).toBeInstanceOf(GetObjectCommand);
    expect((mockCommand as GetObjectCommand).input).toMatchObject({
      Bucket: 'lms-test-files',
      Key: 'documents/lec-1/file-1.pdf',
      ResponseContentType: 'application/pdf',
    });
    expect(mockOptions).toEqual({ expiresIn: 900 });
  });

  it('should force attachment disposition on the signed URL', async () => {
    mockGetSignedUrl.mockResolvedValue('https://signed.example/file');

    await service.createDownloadUrl({
      storageKey: 'documents/lec-1/file-1.html',
      fileName: 'evil.html',
      contentType: 'text/html',
    });

    const [, mockCommand] = mockGetSignedUrl.mock.calls[0];
    const actualDisposition = (mockCommand as GetObjectCommand).input
      .ResponseContentDisposition;
    expect(actualDisposition).toMatch(/^attachment;/);
  });

  it('should propagate signing errors', async () => {
    const expectedError = new Error('signing failed');
    mockGetSignedUrl.mockRejectedValue(expectedError);

    await expect(
      service.createDownloadUrl({
        storageKey: 'k',
        fileName: 'f.pdf',
        contentType: 'application/pdf',
      }),
    ).rejects.toBe(expectedError);
  });

  describe('createUploadForm', () => {
    it('should pin the key, content type and size range in the signed policy', async () => {
      const mockCreatePost = vi.mocked(createPresignedPost);
      mockCreatePost.mockResolvedValue({
        url: 'https://s3.example/',
        fields: { key: 'k' },
      });

      const actualForm = await service.createUploadForm({
        storageKey: 'documents/lec-1/file-1.pdf',
        contentType: 'application/pdf',
        maxSizeBytes: 1000,
      });

      expect(actualForm).toEqual({
        url: 'https://s3.example/',
        fields: { key: 'k' },
      });
      const [, mockOptions] = mockCreatePost.mock.calls[0];
      expect(mockOptions).toMatchObject({
        Bucket: 'lms-test-files',
        Key: 'documents/lec-1/file-1.pdf',
        Expires: 600,
        Fields: { 'Content-Type': 'application/pdf' },
        Conditions: [
          ['content-length-range', 1, 1000],
          ['eq', '$Content-Type', 'application/pdf'],
        ],
      });
    });
  });

  describe('findObjectInfo', () => {
    it('should return the real size and type of the stored object', async () => {
      const mockSend = vi
        .spyOn(S3Client.prototype, 'send')
        .mockResolvedValue({
          ContentLength: 42,
          ContentType: 'application/pdf',
        } as never);

      const actualInfo = await service.findObjectInfo(
        'documents/lec-1/file-1.pdf',
      );

      expect(actualInfo).toEqual({ size: 42, contentType: 'application/pdf' });
      mockSend.mockRestore();
    });

    it('should return null when the object does not exist', async () => {
      const mockSend = vi
        .spyOn(S3Client.prototype, 'send')
        .mockRejectedValue(new NotFound({ message: 'nope', $metadata: {} }));

      await expect(service.findObjectInfo('missing')).resolves.toBeNull();
      mockSend.mockRestore();
    });

    it('should rethrow other S3 errors', async () => {
      const expectedError = new Error('access denied');
      const mockSend = vi
        .spyOn(S3Client.prototype, 'send')
        .mockRejectedValue(expectedError);

      await expect(service.findObjectInfo('k')).rejects.toBe(expectedError);
      mockSend.mockRestore();
    });
  });
});
