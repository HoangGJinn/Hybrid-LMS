import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role } from '../../../common/enums/role.enum.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { FileFacade } from '../../../shared/file/facades/file.facade.js';
import { AcademicFacade } from '../../academic/facades/academic.facade.js';
import { ContentFacade } from '../../content/facades/content.facade.js';
import type { CreateDocumentDto } from '../dto/create-document.dto.js';
import { DocumentRepository } from '../repositories/document.repository.js';
import { DocumentSummaryView } from '../types/document-summary-view.type.js';
import { DocumentView } from '../types/document-view.type.js';
import { QueryFailedError } from 'typeorm';
const FOREIGN_KEY_VIOLATION = '23503';

const isForeignKeyViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError &&
  'code' in error.driverError &&
  error.driverError.code === FOREIGN_KEY_VIOLATION;
/**
 * Business rules for viewing course documents: a user may open a document only through a class they
 * can view, and only if that class shows the document. File bytes always travel straight from S3.
 */
@Injectable()
export class DocumentService {
    private readonly logger = new Logger(DocumentService.name);
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly academicFacade: AcademicFacade,
    private readonly contentFacade: ContentFacade,
    private readonly fileFacade: FileFacade,
  ) {}

  /**
   * Adds a document uploaded by the lecturer. The file must be READY and owned by the lecturer, so nobody
   * can attach someone else's file or one whose upload never finished. The lecturer then places the
   * document in a section and saves the section editor (that link is what makes it visible to students).
   */
  async create(
    classId: string,
    dto: CreateDocumentDto,
    user: AuthenticatedUser,
  ): Promise<DocumentSummaryView> {
    await this.academicFacade.assertCanManageClass(classId, user);
    await this.fileFacade.assertOwnedReadyFile(dto.fileId, user.id);
    const document = await this.documentRepository.create({
      uploadedBy: user.id,
      title: dto.title,
      fileId: dto.fileId,
    });
    return DocumentSummaryView.fromEntity(document, false);
  }

  /** Lists the documents of a class in display order, without download links. */
  async findByClass(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<DocumentSummaryView[]> {
    await this.academicFacade.assertCanViewClass(classId, user);
    const documentIds = await this.contentFacade.getDocumentIdsInClass(classId);
    const documents = await this.documentRepository.findByIds(documentIds);
    const documentsById = new Map(
      documents.map((document) => [document.id, document]),
    );
    const seenIds = await this.findSeenIds(classId, user);
    return documentIds.flatMap((documentId) => {
      const document = documentsById.get(documentId);
      return document
        ? [DocumentSummaryView.fromEntity(document, seenIds.has(documentId))]
        : [];
    });
  }

  /** Returns one document of a class with a freshly signed, short-lived download link. */
  async findOne(
    classId: string,
    documentId: string,
    user: AuthenticatedUser,
  ): Promise<DocumentView> {
    await this.academicFacade.assertCanViewClass(classId, user);
    await this.assertDocumentInClass(classId, documentId);
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    const link = await this.fileFacade.getDownloadLink(document.fileId);
    const seenIds = await this.findSeenIds(classId, user);
    return DocumentView.from(document, link, seenIds.has(documentId));
  }

  /** Records that a student opened the document. Staff have no completion state, so for them it is a no-op. */
  async markSeen(
    classId: string,
    documentId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.academicFacade.assertCanViewClass(classId, user);
    if (user.role !== Role.STUDENT) return;
    await this.contentFacade.markDocumentSeen(classId, documentId, user.id);
  }

  private async assertDocumentInClass(
    classId: string,
    documentId: string,
  ): Promise<void> {
    const isInClass = await this.contentFacade.isDocumentInClass(
      classId,
      documentId,
    );
    if (!isInClass) {
      throw new NotFoundException('Document not found in this class');
    }
  }

  private async findSeenIds(
    classId: string,
    user: AuthenticatedUser,
  ): Promise<ReadonlySet<string>> {
    if (user.role !== Role.STUDENT) return new Set();
    return this.contentFacade.getSeenDocumentIds(classId, user.id);
  }
    /**
   * UC-30: removes the document from the class and, when nothing else needs it, deletes the file for good
   * (S3 object included). The file is KEPT when another class still shows the document, when it belongs
   * to another lecturer, or when generated quizzes still depend on it. An upload that was never saved
   * into a section (nothing to unlink) is cleaned up too.
   * If S3 fails after the record is deleted, the request fails and the object stays orphaned in the bucket.
   */
  async remove(classId: string, documentId: string, user: AuthenticatedUser): Promise<void> {
    await this.academicFacade.assertCanManageClass(classId, user);
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    const removedItems = await this.contentFacade.removeDocumentFromClass(classId, documentId);
    const isStillShown = await this.contentFacade.isDocumentReferenced(documentId);
    if (removedItems === 0 && isStillShown) {
      throw new NotFoundException('Document not found in this class');
    }
    if (isStillShown || document.uploadedBy !== user.id) return;
    try {
      await this.documentRepository.deleteById(documentId);
    } catch (error) {
      if (!isForeignKeyViolation(error)) throw error;
      this.logger.warn(`Document ${documentId} kept: generated content still uses it`);
      return;
    }
    await this.fileFacade.deleteFile(document.fileId);
  }
}
