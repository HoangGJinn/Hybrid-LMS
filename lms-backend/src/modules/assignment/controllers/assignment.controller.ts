import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { CreateAssignmentDto } from '../dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto.js';
import { GradeSubmissionDto } from '../dto/grade-submission.dto.js';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto.js';
import { AssignmentService } from '../services/assignment.service.js';
import { SubmissionReviewService } from '../services/submission-review.service.js';
import { SubmissionService } from '../services/submission.service.js';
import { AssignmentView } from '../types/assignment-view.type.js';
import { SubmissionListItemView } from '../types/submission-list-item-view.type.js';
import { SubmissionView } from '../types/submission-view.type.js';

/** Assignments of one class: created, edited and removed by its lecturer, viewed and submitted by its members. */
@Controller('classes/:classId/assignments')
export class AssignmentController {
  constructor(
    private readonly assignmentService: AssignmentService,
    private readonly submissionService: SubmissionService,
    private readonly reviewService: SubmissionReviewService,
  ) {}

  /** Smoke test: confirms the assignment module is wired up. */
  @Get('test')
  getTest(): string {
    return 'Assignment module is working';
  }

  @Post()
  @Auth(Role.LECTURER)
  async create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssignmentView> {
    return this.assignmentService.create(classId, dto, user);
  }

  @Get(':assignmentId')
  @Auth(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  async findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssignmentView> {
    return this.assignmentService.findOne(classId, assignmentId, user);
  }

  /** Replaces the brief, schedule, submission rules and attachments of an assignment. */
  @Put(':assignmentId')
  @Auth(Role.LECTURER)
  async update(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssignmentView> {
    return this.assignmentService.update(classId, assignmentId, dto, user);
  }

  @Delete(':assignmentId')
  @Auth(Role.LECTURER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.assignmentService.remove(classId, assignmentId, user);
  }

  /** Hands in the student's work, or replaces it while the assignment is still open. */
  @Put(':assignmentId/submission')
  @Auth(Role.STUDENT)
  async submit(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmissionView> {
    return this.submissionService.submit(classId, assignmentId, dto, user);
  }

  /** Every submission of the assignment, for the class lecturer. */
  @Get(':assignmentId/submissions')
  @Auth(Role.LECTURER, Role.ADMIN)
  async listSubmissions(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmissionListItemView[]> {
    return this.reviewService.list(classId, assignmentId, user);
  }

  /**
   * Zip of all submissions, or of one when `submissionId` is given. The response is streamed,
   * so the handler writes to `response` itself instead of returning a value.
   * Declared before the `:submissionId` routes so "download" is never read as an id.
   */
  @Get(':assignmentId/submissions/download')
  @Auth(Role.LECTURER, Role.ADMIN)
  async downloadSubmissions(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Query('submissionId', new ParseUUIDPipe({ optional: true }))
    submissionId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    await this.reviewService.streamZip(
      classId,
      assignmentId,
      submissionId,
      user,
      response,
    );
  }

  /** Scores a submission and leaves feedback; grading again overwrites the previous grade. */
  @Put(':assignmentId/submissions/:submissionId/grade')
  @Auth(Role.LECTURER, Role.ADMIN)
  async gradeSubmission(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmissionListItemView> {
    return this.reviewService.grade(
      classId,
      assignmentId,
      submissionId,
      dto,
      user,
    );
  }
}