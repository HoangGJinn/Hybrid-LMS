import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

const MAX_FILES = 10;
const MAX_ANSWER_LENGTH = 50000;

/**
 * UC-16 / UC-17: a student's submission. Either confirmed (READY) uploads (file assignments)
 * or the answer typed online (TEXT assignments); which one is required depends on the assignment.
 */
export class SubmitAssignmentDto {
  @IsArray()
  @ArrayMaxSize(MAX_FILES)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly fileIds: string[];

  @IsOptional()
  @IsString()
  @MaxLength(MAX_ANSWER_LENGTH)
  readonly answerText?: string;
}