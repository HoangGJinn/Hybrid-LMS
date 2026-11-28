import { uploadFileToS3 } from '@core/api/s3-upload';

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Uploads the Excel file through the shared S3 flow and resolves with the confirmed file's id.
 * The content type is fixed because browsers often report an empty `file.type` for .xlsx files,
 * and the dialog has already checked the extension.
 */
export const uploadImportFile = (file: File): Promise<string> =>
  uploadFileToS3(file, {
    purpose: 'QUESTION_IMPORT',
    contentType: XLSX_CONTENT_TYPE,
  });