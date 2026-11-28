import { IsUUID } from 'class-validator';

export class ImportQuestionsDto {
  @IsUUID()
  subjectId: string;

  /** FileAttachment id: the Excel file must already be uploaded and confirmed by the same lecturer. */
  @IsUUID()
  fileId: string;
}