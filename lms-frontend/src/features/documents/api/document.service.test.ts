import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get, patch } from '@core/api/http';
import { documentService } from './document.service';

vi.mock('@core/config/env', () => ({ USE_MOCK: false }));
vi.mock('@core/api/http', () => ({ get: vi.fn(), patch: vi.fn() }));

const mockGet = vi.mocked(get);
const mockPatch = vi.mocked(patch);

describe('documentService (real API)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPatch.mockReset();
  });

  it('should list the documents of a class', async () => {
    const expectedDocuments = [{ id: 'doc-1' }];
    mockGet.mockResolvedValue(expectedDocuments);

    const actualDocuments = await documentService.getDocuments('cls-1');

    expect(actualDocuments).toBe(expectedDocuments);
    expect(mockGet).toHaveBeenCalledWith('/api/classes/cls-1/documents');
  });

  it('should load one document through its class so the backend can check access', async () => {
    const expectedDocument = {
      id: 'doc-1',
      fileUrl: 'https://signed.example/f',
    };
    mockGet.mockResolvedValue(expectedDocument);

    const actualDocument = await documentService.getDocument('cls-1', 'doc-1');

    expect(actualDocument).toBe(expectedDocument);
    expect(mockGet).toHaveBeenCalledWith('/api/classes/cls-1/documents/doc-1');
  });

  it('should record that a document was opened', async () => {
    mockPatch.mockResolvedValue(undefined);

    await documentService.markSeen('cls-1', 'doc-1');

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/classes/cls-1/documents/doc-1/seen',
    );
  });
});
