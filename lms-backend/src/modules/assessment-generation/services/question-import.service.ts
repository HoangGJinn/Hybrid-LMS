import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { Subject } from '../../academic/entities/subject.entity.js';
import { KnowledgeComponent } from '../../document/entities/knowledge-component.entity.js';
import { QuestionImportBatch } from '../entities/question-import-batch.entity.js';
import { QuestionKnowledgeComponent } from '../entities/question-knowledge-component.entity.js';
import { QuestionOption } from '../entities/question-option.entity.js';
import { Question } from '../entities/question.entity.js';
import { ImportBatchStatus } from '../enums/import-batch-status.enum.js';
import { KcAssignedBy } from '../enums/kc-assigned-by.enum.js';
import { QuestionReviewStatus } from '../enums/question-review-status.enum.js';
import { QuestionSource } from '../enums/question-source.enum.js';
import type { RowError } from '../types/import-row-error.type.js';
import {
  QUESTION_IMPORT_FILE_PORT,
  type QuestionImportFilePort,
} from '../types/question-import-file.port.js';
import { computeContentHash } from '../utils/content-hash.js';
import {
  parseQuestionWorkbook,
  type ParsedQuestionRow,
} from '../utils/question-excel-parser.js';
import { normalizeKey } from '../utils/text-normalize.js';
import { XesMappingService } from './xes-mapping.service.js';
import type { ImportBatchView } from '../types/import-batch-view.type.js';
import { QuestionType } from '../enums/question-type.enum.js';

interface Draft {
  question: Question;
  row: ParsedQuestionRow;
  kcIds: string[];
}

/** A batch still PROCESSING this long after it started means the process died mid-import. */
const STALE_BATCH_MS = 15 * 60 * 1000;

@Injectable()
export class QuestionImportService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QuestionImportService.name);

  constructor(
    @InjectRepository(QuestionImportBatch)
    private readonly batches: Repository<QuestionImportBatch>,
    @InjectRepository(Question)
    private readonly questions: Repository<Question>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(KnowledgeComponent)
    private readonly kcs: Repository<KnowledgeComponent>,
    @Inject(QUESTION_IMPORT_FILE_PORT)
    private readonly files: QuestionImportFilePort,
    private readonly dataSource: DataSource,
    private readonly xesMapping: XesMappingService,
  ) {}

  /**
   * Imports run synchronously, so a batch left in PROCESSING for a long time was killed mid-way.
   * The threshold avoids touching a batch that is still running on another instance.
   */
  async onApplicationBootstrap(): Promise<void> {
    const stale = await this.batches.find({
      where: {
        status: ImportBatchStatus.PROCESSING,
        createdAt: LessThan(new Date(Date.now() - STALE_BATCH_MS)),
      },
    });
    if (stale.length === 0) return;

    for (const batch of stale) {
      batch.status = ImportBatchStatus.FAILED;
      batch.errorReport = [{ row: 0, message: 'Lượt import bị gián đoạn. Vui lòng thử lại.' }];
    }
    await this.batches.save(stale);
    this.logger.warn(`Marked ${stale.length} stale import batch(es) as FAILED`);
  }

  /**
   * Reads the Excel file, saves every valid row as an approved question and reports the rest.
   * Runs synchronously (the file is capped at MAX_IMPORT_ROWS rows).
   * `uploaderId` is the lecturer's user id (lecturers.user_id).
   */
  async importFromFile(
    subjectId: string,
    fileId: string,
    uploaderId: string,
  ): Promise<QuestionImportBatch> {
    if (!(await this.subjects.exists({ where: { id: subjectId } }))) {
      throw new NotFoundException('Không tìm thấy môn học.');
    }

    // Throws if the file is missing, not confirmed, or not owned by the uploader.
    const file = await this.files.loadForImport(fileId, uploaderId);

    const batch = await this.batches.save(
      this.batches.create({
        subjectId,
        uploadedBy: uploaderId,
        fileId,
        status: ImportBatchStatus.PROCESSING,
        errorReport: [],
      }),
    );

    try {
      const parsed = await parseQuestionWorkbook(file.buffer);
      if (parsed.fatalError) {
        // row 0 = the whole file (see RowError).
        return await this.finish(batch, ImportBatchStatus.FAILED, 0, 0, 0, [
          { row: 0, message: parsed.fatalError },
        ]);
      }

      const errors: RowError[] = [...parsed.errors];

      // Resolve KC names against this subject (NFC, case- and whitespace-insensitive).
      // null = two KCs in this subject share the same normalised name (ambiguous).
      const subjectKcs = await this.kcs.find({ where: { subjectId } });
      const kcByName = new Map<string, string | null>();
      for (const kc of subjectKcs) {
        const key = normalizeKey(kc.name);
        kcByName.set(key, kcByName.has(key) ? null : kc.id);
      }

      // Duplicates: already in the bank for this subject, or repeated inside this file.
      const hashes = parsed.rows.map((r) => computeContentHash(r.questionText));
      const existing = hashes.length
        ? await this.questions.find({
            select: { contentHash: true },
            where: { subjectId, contentHash: In(hashes) },
          })
        : [];
      const taken = new Set(existing.map((q) => q.contentHash));

      const drafts: Draft[] = [];
      parsed.rows.forEach((row, i) => {
        const keys = row.kcNames.map(normalizeKey);
        const unknownKcs = row.kcNames.filter((_, j) => !kcByName.has(keys[j]));
        const ambiguousKcs = row.kcNames.filter((_, j) => kcByName.get(keys[j]) === null);
        if (unknownKcs.length > 0 || ambiguousKcs.length > 0) {
          if (unknownKcs.length > 0) {
            errors.push({
              row: row.rowNumber,
              field: 'kc_name',
              message: `KC không tồn tại trong môn học: ${unknownKcs.join(', ')}.`,
            });
          }
          if (ambiguousKcs.length > 0) {
            errors.push({
              row: row.rowNumber,
              field: 'kc_name',
              message: `Có nhiều KC trùng tên trong môn học: ${ambiguousKcs.join(', ')}.`,
            });
          }
          return;
        }

        const hash = hashes[i];
        if (taken.has(hash)) {
          errors.push({
            row: row.rowNumber,
            field: 'question_text',
            message: 'Câu hỏi trùng với câu đã có (trong ngân hàng hoặc trong file này).',
          });
          return;
        }
        taken.add(hash);

        drafts.push({
          row,
          kcIds: keys.map((k) => kcByName.get(k)!),
          // kt_question_idx is generated by the database (@Generated('increment')), so it is not set here.
          question: this.questions.create({
            subjectId,
            source: QuestionSource.LECTURER_UPLOAD,
            importBatchId: batch.id,
            questionText: row.questionText,
            questionType: row.questionType,
            difficulty: row.difficulty,
            explanation: row.explanation,
            // Questions typed in by the lecturer are trusted, so they skip the review queue.
            reviewStatus: QuestionReviewStatus.APPROVED,
            reviewedBy: uploaderId,
            contentHash: hash,
            isActive: true,
          }),
        });
      });

      errors.sort((a, b) => a.row - b.row);
      const failedRows = new Set(errors.map((e) => e.row)).size;
      const status =
        drafts.length === 0
          ? ImportBatchStatus.FAILED
          : failedRows > 0
            ? ImportBatchStatus.PARTIAL
            : ImportBatchStatus.COMPLETED;

      // Nothing to save: just record the result.
      if (drafts.length === 0) {
        return await this.finish(batch, status, parsed.totalRows, 0, failedRows, errors);
      }

      Object.assign(batch, {
        status,
        totalRows: parsed.totalRows,
        successRows: drafts.length,
        failedRows,
        errorReport: errors,
      });

      // Map each new question to a XES3G5M question through its confirmed KC mappings.
      // Never blocks the import: questions stay unmapped (null) and can be backfilled later.
      await this.xesMapping.assign(drafts.map((d) => ({ question: d.question, kcIds: d.kcIds })));

      // All-or-nothing: the questions and the batch result commit (or roll back) together,
      // so a failure never leaves a FAILED batch whose questions are already in the bank.
      await this.dataSource.transaction(async (manager) => {
        const saved = await manager.save(
          Question,
          drafts.map((d) => d.question),
          { chunk: 100 },
        );

        const options: QuestionOption[] = [];
        const links: QuestionKnowledgeComponent[] = [];
        saved.forEach((q, i) => {
          const { row, kcIds } = drafts[i];
          // for (const o of row.options) {
          //   options.push(
          //     manager.create(QuestionOption, {
          //       questionId: q.id,
          //       optionLabel: o.label,
          //       optionText: o.text,
          //       isCorrect: o.label === row.correctLabel,
          //       generationMethod: null, // typed by the lecturer, not generated
          //     }),
          //   );
          // }
          const optionRows =
            row.questionType === QuestionType.FILL_BLANK
              ? row.acceptedAnswers.map((text, idx) => ({
                label: String(idx + 1),
                text,
                correct: true,
              }))
              : row.options.map((o) => ({
                label: o.label,
                text: o.text,
                correct: o.label === row.correctLabel,
              }));
          for (const o of optionRows) {
            options.push(
              manager.create(QuestionOption, {
                questionId: q.id,
                optionLabel: o.label,
                optionText: o.text,
                isCorrect: o.correct,
                generationMethod: null, // typed by the lecturer, not generated
              }),
            );
          }
          for (const kcId of kcIds) {
            links.push(
              manager.create(QuestionKnowledgeComponent, {
                questionId: q.id,
                kcId,
                assignedBy: KcAssignedBy.LECTURER,
              }),
            );
          }
        });
        await manager.save(QuestionOption, options, { chunk: 200 });
        await manager.save(QuestionKnowledgeComponent, links, { chunk: 200 });
        await manager.save(QuestionImportBatch, batch);
      });

      return batch;
    } catch (err) {
      this.logger.error(`Import batch ${batch.id} failed`, err instanceof Error ? err.stack : err);
      // 23505 = unique violation: someone imported the same question at the same time.
      const duplicate =
        (err as { driverError?: { code?: string } })?.driverError?.code === '23505';
      const message = duplicate
        ? 'Có câu hỏi bị trùng do import đồng thời. Vui lòng thử lại.'
        : 'Lỗi hệ thống khi xử lý file. Vui lòng thử lại.';

      await this.markFailed(batch, message);
      if (duplicate) throw new ConflictException(message);
      throw err;
    }
  }

  async getBatch(batchId: string, requesterId: string): Promise<QuestionImportBatch> {
    const batch = await this.batches.findOne({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Không tìm thấy lượt import.');
    if (batch.uploadedBy !== requesterId) {
      throw new ForbiddenException('Bạn không có quyền xem lượt import này.');
    }
    return batch;
  }

  /** The requester's own import batches, newest first (optionally for one subject), with the file's name. */
  async listBatches(
    requesterId: string,
    subjectId?: string,
  ): Promise<ImportBatchView[]> {
    const rows = await this.batches.find({
      where: { uploadedBy: requesterId, ...(subjectId ? { subjectId } : {}) },
      relations: { file: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    // Mapped explicitly so the joined file record (storage key and all) never reaches the response.
    return rows.map((b) => ({
      id: b.id,
      subjectId: b.subjectId,
      uploadedBy: b.uploadedBy,
      fileId: b.fileId,
      fileName: b.file?.fileName ?? null,
      status: b.status,
      totalRows: b.totalRows,
      successRows: b.successRows,
      failedRows: b.failedRows,
      errorReport: b.errorReport,
      createdAt: b.createdAt,
    }));
  }

  /** Marks the batch FAILED without letting a secondary DB error hide the original one. */
  private async markFailed(batch: QuestionImportBatch, message: string): Promise<void> {
    try {
      await this.finish(batch, ImportBatchStatus.FAILED, 0, 0, 0, [{ row: 0, message }]);
    } catch (e) {
      this.logger.error(
        `Could not mark batch ${batch.id} as FAILED`,
        e instanceof Error ? e.stack : e,
      );
    }
  }

  private finish(
    batch: QuestionImportBatch,
    status: ImportBatchStatus,
    totalRows: number,
    successRows: number,
    failedRows: number,
    errorReport: RowError[],
  ): Promise<QuestionImportBatch> {
    Object.assign(batch, { status, totalRows, successRows, failedRows, errorReport });
    return this.batches.save(batch);
  }
}