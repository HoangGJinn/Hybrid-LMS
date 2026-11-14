import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import {
  CreateExamDto,
  UpdateExamDto,
  UpdateExamScheduleDto,
} from '../dto/create-exam.dto.js';
import { GradeExamSessionDto } from '../dto/grade-exam-session.dto.js';
import { ExamGradingService } from '../services/exam-grading.service.js';
import { ExamService } from '../services/exam.service.js';
import type {
  LecturerExamAttemptItemView,
  LecturerExamResultsView,
} from '../types/exam-results-view.type.js';
import { ExamView } from '../types/exam-view.type.js';
import type { ExamAttemptReviewView } from '../types/student-exam-view.type.js';

/**
 * Exams of one class: created, changed, graded, exported and removed by its lecturer.
 */
@Controller('classes/:classId/exams')
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly examGradingService: ExamGradingService,
  ) {}

  @Post()
  @Auth(Role.LECTURER)
  async create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamView> {
    return this.examService.create(classId, dto, user);
  }

  @Get(':examId/results')
  @Auth(Role.LECTURER, Role.ADMIN)
  async getResults(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LecturerExamResultsView> {
    return this.examGradingService.getResults(classId, examId, user);
  }

  @Get(':examId/submissions/download')
  @Auth(Role.LECTURER, Role.ADMIN)
  async downloadSubmissions(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Query('sessionId', new ParseUUIDPipe({ optional: true }))
    sessionId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ): Promise<void> {
    await this.examGradingService.streamSubmissionsZip(
      classId,
      examId,
      sessionId,
      user,
      response,
    );
  }

  @Get(':examId/sessions/:sessionId/review')
  @Auth(Role.LECTURER, Role.ADMIN)
  async reviewSession(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamAttemptReviewView> {
    return this.examGradingService.reviewSession(
      classId,
      examId,
      sessionId,
      user,
    );
  }

  @Put(':examId/sessions/:sessionId/grade')
  @Auth(Role.LECTURER, Role.ADMIN)
  async gradeSession(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: GradeExamSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LecturerExamAttemptItemView> {
    return this.examGradingService.gradeSession(
      classId,
      examId,
      sessionId,
      dto,
      user,
    );
  }

  @Get(':examId')
  @Auth(Role.LECTURER, Role.ADMIN)
  async findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamView> {
    return this.examService.findOne(classId, examId, user);
  }

  @Put(':examId')
  @Auth(Role.LECTURER)
  async update(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamView> {
    return this.examService.update(classId, examId, dto, user);
  }

  @Patch(':examId/schedule')
  @Auth(Role.LECTURER)
  async updateSchedule(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: UpdateExamScheduleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamView> {
    return this.examService.updateSchedule(classId, examId, dto, user);
  }

  @Delete(':examId')
  @Auth(Role.LECTURER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.examService.remove(classId, examId, user);
  }
}
