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
  MAX_ATTEMPTS,
  MAX_DURATION_MINUTES,
  MIN_ATTEMPTS,
  MIN_BLANKS,
  MIN_DURATION_MINUTES,
  OPTION_MAX_LENGTH,
  MAX_OPTIONS,
  QUESTION_MAX_LENGTH,
} from '../constants/exam-rules.constant.js';
import { ExamFormat } from '../enums/exam-format.enum.js';
import { ExamQuestionType } from '../enums/exam-question-type.enum.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** One answer option of an MCQ question, or one numbered blank's acceptable answers (`a | b`). */
export class CreateExamOptionDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(OPTION_MAX_LENGTH)
  readonly content: string;

  @IsBoolean()
  readonly isCorrect: boolean;
}

/** One interactive question: either multiple-choice (2..6 options, 1+ correct) or cloze fill-in-the-blank (1..6 blanks). */
export class CreateExamQuestionDto {
  @IsOptional()
  @IsEnum(ExamQuestionType)
  readonly type?: ExamQuestionType;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(QUESTION_MAX_LENGTH)
  readonly content: string;

  /** Required correct option count for MCQ (defaults to 1), or number of blanks for FILL_IN_THE_BLANK. */
  @IsOptional()
  @IsInt()
  @Min(MIN_BLANKS)
  @Max(MAX_OPTIONS)
  readonly correctCount?: number;

  @IsArray()
  @ArrayMinSize(MIN_BLANKS)
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

  /** Allowed attempts per student; null means unlimited attempts, omitted defaults to 1. */
  @IsOptional()
  @IsInt()
  @Min(MIN_ATTEMPTS)
  @Max(MAX_ATTEMPTS)
  readonly maxAttempts?: number | null;

  /** Whether students can see their score and review correct answers after completing an attempt. */
  @IsOptional()
  @IsBoolean()
  readonly showResults?: boolean;

  /** Whether question order is shuffled per attempt. */
  @IsOptional()
  @IsBoolean()
  readonly shuffleQuestions?: boolean;

  /** Whether option order within each question is shuffled per attempt. */
  @IsOptional()
  @IsBoolean()
  readonly shuffleOptions?: boolean;
}

/**
 * Replaces everything of an exam that nobody has seen yet. It carries the same fields as a new exam;
 * once the exam has opened or a student has started it, use `UpdateExamScheduleDto` instead.
 */
export class UpdateExamDto extends CreateExamDto {}

/**
 * What can still change after the exam is locked: its name, `showResults` and, while not closed, a later closing
 * time, a longer duration or more allowed attempts (`maxAttempts`, or `null` for unlimited).
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

  @IsOptional()
  @IsInt()
  @Min(MIN_ATTEMPTS)
  @Max(MAX_ATTEMPTS)
  readonly maxAttempts?: number | null;

  @IsOptional()
  @IsBoolean()
  readonly showResults?: boolean;
}
