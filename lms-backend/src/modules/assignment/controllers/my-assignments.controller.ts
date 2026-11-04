import { Controller, Get, Query } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import {
  AssignmentSummary,
  QueueItem,
  SubmissionReviewService,
} from '../services/submission-review.service.js';
import { SubmissionListItemView } from '../types/submission-list-item-view.type.js';

/** Overview lists that span several classes: a student's assignments and grades, a lecturer's grading queue. */
@Controller()
export class MyAssignmentsController {
  constructor(private readonly reviewService: SubmissionReviewService) {}

  @Get('assignments/me')
  @Auth(Role.STUDENT)
  async myAssignments(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssignmentSummary[]> {
    return this.reviewService.myAssignments(user);
  }

  @Get('submissions/me')
  @Auth(Role.STUDENT)
  async mySubmissions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmissionListItemView[]> {
    return this.reviewService.mySubmissions(user);
  }

  /** `classIds` is a comma-separated list; ids that are not UUIDs are ignored. */
  @Get('lecturer/submissions')
  @Auth(Role.LECTURER)
  async lecturerQueue(
    @Query('classIds') classIds = '',
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QueueItem[]> {
    return this.reviewService.lecturerQueue(
      classIds.split(',').filter((id) => isUUID(id)),
      user,
    );
  }
}