import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  EXAM_MAX_QUESTIONS,
  EXAM_NAME_MAX_LENGTH,
  MAX_DURATION_MINUTES,
  MIN_DURATION_MINUTES,
  OPTION_MAX_LENGTH,
  MAX_OPTIONS,
  MIN_OPTIONS,
  QUESTION_MAX_LENGTH,
} from '../constants/exam-rules.constant.js';
import { ExamFormat } from '../enums/exam-format.enum.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** One answer of a multiple-choice question. */
export class CreateExamOptionDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(OPTION_MAX_LENGTH)
  readonly content: string;

  @IsBoolean()
  readonly isCorrect: boolean;
}

/** One multiple-choice question: its text and 2 to 6 answers, exactly one of them correct. */
export class CreateExamQuestionDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(QUESTION_MAX_LENGTH)
  readonly content: string;

  @IsArray()
  @ArrayMinSize(MIN_OPTIONS)
  @ArrayMaxSize(MAX_OPTIONS)
  @ValidateNested({ each: true })
  @Type(() => CreateExamOptionDto)
  readonly options: CreateExamOptionDto[];
}

/**
 * UC-31: what a lecturer fills in to create an exam. An exam is either typed multiple-choice questions
 * (`questions`) or an uploaded question file (`fileId`), never both; the service checks which one `format` allows.
 */
export class CreateExamDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(EXAM_NAME_MAX_LENGTH)
  readonly examName: string;

  /** When students may start the exam. */
  @IsDateString()
  readonly startTime: string;

  /** After this moment nobody can start, and an attempt in progress is cut off. */
  @IsDateString()
  readonly endTime: string;

  /** How long one attempt lasts, in minutes. */
  @IsInt()
  @Min(MIN_DURATION_MINUTES)
  @Max(MAX_DURATION_MINUTES)
  readonly durationMinutes: number;

  @IsEnum(ExamFormat)
  readonly format: ExamFormat;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(EXAM_MAX_QUESTIONS)
  @ValidateNested({ each: true })
  @Type(() => CreateExamQuestionDto)
  readonly questions?: CreateExamQuestionDto[];

  /** Confirmed (READY) question file that belongs to the lecturer. */
  @IsOptional()
  @IsUUID()
  readonly fileId?: string;
}

/**
 * Replaces everything of an exam that nobody has seen yet. It carries the same fields as a new exam;
 * once the exam has opened or a student has started it, use `UpdateExamScheduleDto` instead.
 */
export class UpdateExamDto extends CreateExamDto {}

/**
 * What can still change after the exam is locked: its name and, only to make it longer, the closing time
 * and the duration. A field that is left out stays as it is.
 */
export class UpdateExamScheduleDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(EXAM_NAME_MAX_LENGTH)
  readonly examName?: string;

  @IsOptional()
  @IsDateString()
  readonly endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(MIN_DURATION_MINUTES)
  @Max(MAX_DURATION_MINUTES)
  readonly durationMinutes?: number;
}
