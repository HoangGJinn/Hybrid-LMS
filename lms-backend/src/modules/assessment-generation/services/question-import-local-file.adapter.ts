import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { QuestionImportFilePort } from '../types/question-import-file.port.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DEV ONLY. Reads `<QUESTION_IMPORT_DEV_DIR>/<fileId>.xlsx` from local disk so the import API can be
 * tested without S3. It does no ownership check and refuses to run when NODE_ENV=production.
 * Enable with QUESTION_IMPORT_USE_LOCAL_FILES=true.
 * A file_attachments row with the same id must still exist, because question_import_batches.file_id
 * is a foreign key (see dev/seed-file-attachment.sql).
 */
@Injectable()
export class QuestionImportLocalFileAdapter implements QuestionImportFilePort {
  async loadForImport(fileId: string): Promise<{ buffer: Buffer; fileName: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Local file adapter is disabled in production.');
    }
    if (!UUID_RE.test(fileId)) throw new NotFoundException('fileId không hợp lệ.');

    const dir = process.env.QUESTION_IMPORT_DEV_DIR ?? './dev-uploads';
    const fileName = `${fileId}.xlsx`;
    try {
      return { buffer: await readFile(join(dir, fileName)), fileName };
    } catch {
      throw new NotFoundException(`Không thấy file ${join(dir, fileName)}.`);
    }
  }
}