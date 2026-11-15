import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import type { QuestionImportFilePort } from '../types/question-import-file.port.js';

/** Same cap as the QUESTION_IMPORT upload rule; checked again here so a bigger object can never fill memory. */
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

const readAll = async (stream: Readable, maxBytes: number): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of stream) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    received += part.length;
    if (received > maxBytes) {
      stream.destroy();
      throw new PayloadTooLargeException('File Excel vượt quá 5 MB.');
    }
    chunks.push(part);
  }
  return Buffer.concat(chunks);
};

/** Reads the uploaded Excel file through the file module's facade (S3 stays behind it). */
@Injectable()
export class QuestionImportFileAdapter implements QuestionImportFilePort {
  constructor(private readonly files: FileFacade) {}

  async loadForImport(
    fileId: string,
    requesterId: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    // 404 when the file is missing or belongs to someone else, 400 when its upload was never confirmed.
    await this.files.assertOwnedReadyFile(fileId, requesterId);
    const { fileName, stream } = await this.files.openReadStream(fileId);
    return { buffer: await readAll(stream, MAX_IMPORT_FILE_BYTES), fileName };
  }
}