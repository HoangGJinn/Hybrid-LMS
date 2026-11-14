import { Controller, Get, Query } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { ExamGradingService } from '../services/exam-grading.service.js';
import type { LecturerExamQueueItemView } from '../types/exam-results-view.type.js';

/** Cross-class FILE exam grading queue for lecturers (`GET /api/lecturer/exam-submissions`). */
@Controller()
export class LecturerExamController {
  constructor(private readonly examGradingService: ExamGradingService) {}

  /** `classIds` is a comma-separated list; ids that are not UUIDs are ignored. */
  @Get('lecturer/exam-submissions')
  @Auth(Role.LECTURER)
  async lecturerQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query('classIds') classIds?: string,
  ): Promise<LecturerExamQueueItemView[]> {
    return this.examGradingService.getLecturerQueue(
      (classIds ?? '').split(',').filter((id) => isUUID(id)),
      user,
    );
  }
}

