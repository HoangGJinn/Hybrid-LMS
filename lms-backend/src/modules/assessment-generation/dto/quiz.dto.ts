import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const QUIZ_SIZES = [5, 10, 15] as const;

export class CreateQuizDto {
  @IsUUID()
  subjectId: string;

  /** Limit the quiz to these knowledge components (e.g. the ones of one document). Omit for the whole subject. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  kcIds?: string[];

  @IsIn(QUIZ_SIZES)
  numQuestions: number;

  /** WEAK: more questions on topics the student knows less. EVEN: spread evenly. */
  @IsOptional()
  @IsIn(['WEAK', 'EVEN'])
  focus?: 'WEAK' | 'EVEN';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class SubmitAnswerDto {
  @IsUUID()
  quizInstanceQuestionId: string;

  /** Required for multiple-choice questions. */
  @ValidateIf((o: SubmitAnswerDto) => o.answerText === undefined)
  @IsUUID()
  selectedOptionId: string;

  /** Required for fill-in-the-blank questions: what the student typed. */
  @ValidateIf((o: SubmitAnswerDto) => o.selectedOptionId === undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  answerText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600)
  timeSpentSeconds?: number;
}