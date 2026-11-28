import { IsBoolean, IsIn } from 'class-validator';
import { QuestionReviewStatus } from '../enums/question-review-status.enum.js';

export class ReviewQuestionDto {
  @IsIn([QuestionReviewStatus.APPROVED, QuestionReviewStatus.REJECTED])
  reviewStatus: QuestionReviewStatus.APPROVED | QuestionReviewStatus.REJECTED;
}

export class SetQuestionActiveDto {
  @IsBoolean()
  isActive: boolean;
}