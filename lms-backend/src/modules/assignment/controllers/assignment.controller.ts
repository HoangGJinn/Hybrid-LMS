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
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { CreateAssignmentDto } from '../dto/create-assignment.dto.js';
import { SubmitAssignmentDto } from '../dto/submit-assignment.dto.js';
import { AssignmentService } from '../services/assignment.service.js';
import { SubmissionService } from '../services/submission.service.js';
import { AssignmentView } from '../types/assignment-view.type.js';
import { SubmissionView } from '../types/submission-view.type.js';

/** Assignments of one class: created and removed by its lecturer, viewed and submitted by its members. */
@Controller('classes/:classId/assignments')
export class AssignmentController {
  constructor(
    private readonly assignmentService: AssignmentService,
    private readonly submissionService: SubmissionService,
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
}