export const QUESTION_IMPORT_FILE_PORT = Symbol('QUESTION_IMPORT_FILE_PORT');

/**
 * How the import reads the uploaded Excel file, so this module does not depend on the S3 code.
 * Implementations must throw (ForbiddenException / NotFoundException) when the file does not belong to
 * `requesterId`, is not confirmed yet, or does not exist.
 */
export interface QuestionImportFilePort {
  loadForImport(
    fileId: string,
    requesterId: string,
  ): Promise<{ buffer: Buffer; fileName: string }>;
}