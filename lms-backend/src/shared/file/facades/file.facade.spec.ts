import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FilePurpose } from '../enums/file-purpose.enum.js';
import type { FileService } from '../services/file.service.js';
import { FileFacade } from './file.facade.js';

type Mock = ReturnType<typeof vi.fn>;

describe('FileFacade', () => {
  let facade: FileFacade;
  let fileService: Record<
    | 'getDownloadLink'
    | 'assertOwnedReadyFile'
    | 'assertOwnedReadyFileOfPurpose'
    | 'deleteFile'
    | 'assertOwnedReadyFiles'
    | 'getDownloadLinks'
    | 'deleteFiles'
    | 'openReadStream',
    Mock
  >;

  beforeEach(() => {
    fileService = {
      getDownloadLink: vi.fn().mockResolvedValue({ fileId: 'f-1' }),
      assertOwnedReadyFile: vi.fn().mockResolvedValue(undefined),
      assertOwnedReadyFileOfPurpose: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      assertOwnedReadyFiles: vi.fn().mockResolvedValue(undefined),
      getDownloadLinks: vi.fn().mockResolvedValue([{ fileId: 'f-1' }]),
      deleteFiles: vi.fn().mockResolvedValue(undefined),
      openReadStream: vi
        .fn()
        .mockResolvedValue({ fileName: 'a.pdf', stream: Readable.from(['x']) }),
    };

    facade = new FileFacade(fileService as unknown as FileService);
  });

  it('delegates all file operations to FileService', async () => {
    expect(await facade.getDownloadLink('f-1')).toEqual({ fileId: 'f-1' });
    await facade.assertOwnedReadyFile('f-1', 'u-1');
    await facade.assertOwnedReadyFileOfPurpose('f-1', 'u-1', FilePurpose.EXAM);
    await facade.deleteFile('f-1');
    await facade.assertOwnedReadyFiles(['f-1'], 'u-1');
    expect(await facade.getDownloadLinks(['f-1'])).toEqual([{ fileId: 'f-1' }]);
    await facade.deleteFiles(['f-1']);
    const opened = await facade.openReadStream('f-1');
    expect(opened.fileName).toBe('a.pdf');

    expect(fileService.assertOwnedReadyFileOfPurpose).toHaveBeenCalledWith(
      'f-1',
      'u-1',
      FilePurpose.EXAM,
    );
    expect(fileService.deleteFiles).toHaveBeenCalledWith(['f-1']);
  });
});

