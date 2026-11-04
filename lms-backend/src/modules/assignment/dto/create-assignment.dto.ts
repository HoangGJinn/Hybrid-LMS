import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SUBMISSION_FORMATS } from '../../../shared/file/constants/upload-rules.constant.js';
import { SubmissionType } from '../enums/submission-type.enum.js';

const MAX_ATTACHMENTS = 10;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** UC-33: what a lecturer fills in to create an assignment. */
export class CreateAssignmentDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title: string;

  /** The brief / note shown to students. */
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  readonly instruction: string;

  @IsDateString()
  readonly openAt: string;

  @IsDateString()
  readonly endAt: string;

  /** FILE: students upload files; TEXT: students write the answer online. */
  @IsEnum(SubmissionType)
  readonly submissionType: SubmissionType;

  /** Accepted file formats such as `py`, `cpp`, `zip`; empty means any supported format. */
  @IsArray()
  @ArrayMaxSize(SUBMISSION_FORMATS.length)
  @ArrayUnique()
  @IsIn([...SUBMISSION_FORMATS], { each: true })
  readonly acceptedExtensions: string[];

  /** Free note on what to submit and how, e.g. "One .zip with main.cpp and README.txt". */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  readonly submissionNote?: string;

  /** Confirmed (READY) uploads that belong to the lecturer. */
  @IsArray()
  @ArrayMaxSize(MAX_ATTACHMENTS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  readonly fileIds: string[];
}