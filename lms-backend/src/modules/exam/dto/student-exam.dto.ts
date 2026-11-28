import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  EXAM_MAX_QUESTIONS,
  MAX_BLANKS,
  MAX_OPTIONS,
  OPTION_MAX_LENGTH,
} from '../constants/exam-rules.constant.js';

export const EXAM_MAX_SUBMISSION_FILES = 10;

/**
 * One question's answer in a batch save or final submission:
 * - `optionId` (legacy single choice) or `optionIds` (multi-select MCQ)
 * - `textAnswers` (fill-in-the-blank answers indexed 0..k-1)
 */
export class ExamAnswerInputDto {
  @IsUUID()
  readonly questionId: string;

  @IsOptional()
  @IsUUID()
  readonly optionId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_OPTIONS)
  @IsUUID('4', { each: true })
  readonly optionIds?: string[] | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_BLANKS)
  @IsString({ each: true })
  @MaxLength(OPTION_MAX_LENGTH, { each: true })
  readonly textAnswers?: string[] | null;
}

/** Batch auto-save payload sent on page transition, 60-second interval, or tab hide. */
export class SaveExamAnswersDto {
  @IsArray()
  @ArrayMaxSize(EXAM_MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerInputDto)
  readonly answers: ExamAnswerInputDto[];
}

/** Final submission payload: carries any remaining unsynced answers so nothing is lost. */
export class SubmitExamSessionDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(EXAM_MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerInputDto)
  readonly answers?: ExamAnswerInputDto[];
}

/** File submission payload for a FILE-format exam attempt (can be updated while time remains). */
export class SubmitFileExamDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(EXAM_MAX_SUBMISSION_FILES)
  @IsUUID('4', { each: true })
  readonly fileIds: string[];
}


