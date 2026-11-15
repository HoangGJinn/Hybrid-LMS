import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import {
  ReviewQuestionDto,
  SetQuestionActiveDto,
} from '../dto/question-management.dto.js';
import { QuestionReviewStatus } from '../enums/question-review-status.enum.js';
import { QuestionManagementService } from '../services/question-management.service.js';

/** Lecturers only: these responses include which option is correct. */
@Controller('questions')
export class QuestionManagementController {
  constructor(private readonly service: QuestionManagementService) {}

  /** GET /questions?subjectId=...&reviewStatus=&isActive=&importBatchId=&page=1&limit=20 */
  @Get()
  @Auth(Role.LECTURER)
  list(
    @Query('subjectId', ParseUUIDPipe) subjectId: string,
    @Query('reviewStatus', new ParseEnumPipe(QuestionReviewStatus, { optional: true }))
    reviewStatus: QuestionReviewStatus | undefined,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive: boolean | undefined,
    @Query('importBatchId', new ParseUUIDPipe({ optional: true }))
    importBatchId: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.list({
      subjectId,
      reviewStatus,
      isActive,
      importBatchId,
      page,
      limit,
    });
  }

  /** Body: { reviewStatus: "APPROVED" | "REJECTED" } */
  @Patch(':id/review')
  @Auth(Role.LECTURER)
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.review(id, user.id, dto.reviewStatus);
  }

  /** Body: { isActive: true | false } */
  @Patch(':id/active')
  @Auth(Role.LECTURER)
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetQuestionActiveDto,
  ) {
    return this.service.setActive(id, dto.isActive);
  }
}