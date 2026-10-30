import { beforeEach, describe, expect, it, vi } from 'vitest';
import { post } from '@core/api/http';
import { documentUploadService } from './document-upload.service';

vi.mock('@core/config/env', () => ({ USE_MOCK: false }));
vi.mock('@core/api/http', () => ({ post: vi.fn() }));

const mockPost = vi.mocked(post);
const mockFetch = vi.fn();

const file = new File(['content'], 'Chuong 1.pdf', { type: 'application/pdf' });
const uploadRequest = {
  fileId: 'file-1',
  upload: {
    url: 'https://bucket.s3.example/',
    fields: {
      key: 'documents/lec/file-1.pdf',
      Policy: 'p',
      'X-Amz-Signature': 's',
    },
  },
};

describe('documentUploadService.upload (real API)', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('should run the four steps in order and return the created document', async () => {
    const expectedDocument = { id: 'doc-1' };
    mockPost
      .mockResolvedValueOnce(uploadRequest)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(expectedDocument);
    mockFetch.mockResolvedValue({ ok: true });

    const actualDocument = await documentUploadService.upload('cls-1', file);

    expect(actualDocument).toBe(expectedDocument);
    expect(mockPost.mock.calls).toEqual([
      [
        '/api/files/upload-requests',
        {
          purpose: 'DOCUMENT',
          fileName: 'Chuong 1.pdf',
          contentType: 'application/pdf',
          size: 7,
        },
      ],
      ['/api/files/file-1/confirm'],
      ['/api/classes/cls-1/documents', { title: 'Chuong 1', fileId: 'file-1' }],
    ]);
  });

  it('should send the signed fields first and the file last, without app credentials', async () => {
    mockPost.mockResolvedValueOnce(uploadRequest).mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ ok: true });

    await documentUploadService.upload('cls-1', file);

    const [mockUrl, mockInit] = mockFetch.mock.calls[0];
    expect(mockUrl).toBe('https://bucket.s3.example/');
    expect(mockInit.method).toBe('POST');
    expect(mockInit.headers).toBeUndefined();
    const actualNames = [...(mockInit.body as FormData).keys()];
    expect(actualNames).toEqual(['key', 'Policy', 'X-Amz-Signature', 'file']);
  });

  it('should stop before confirming when S3 rejects the upload', async () => {
    mockPost.mockResolvedValueOnce(uploadRequest);
    mockFetch.mockResolvedValue({ ok: false });

    await expect(documentUploadService.upload('cls-1', file)).rejects.toThrow(
      'Uploading the file failed',
    );
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('should not contact S3 when the backend refuses the request', async () => {
    mockPost.mockRejectedValueOnce(
      new Error('This file format is not supported'),
    );

    await expect(documentUploadService.upload('cls-1', file)).rejects.toThrow(
      'not supported',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
