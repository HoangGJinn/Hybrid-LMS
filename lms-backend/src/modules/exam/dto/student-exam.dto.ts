import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { EXAM_MAX_QUESTIONS } from '../constants/exam-rules.constant.js';

export const EXAM_MAX_SUBMISSION_FILES = 10;

/** One question's answer in a batch save or final submission (`optionId: null` clears the selection). */
export class ExamAnswerInputDto {
  @IsUUID()
  readonly questionId: string;

  @IsOptional()
  @IsUUID()
  readonly optionId?: string | null;
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


