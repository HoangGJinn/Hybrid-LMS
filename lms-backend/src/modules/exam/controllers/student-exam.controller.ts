import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import {
  SaveExamAnswersDto,
  SubmitExamSessionDto,
  SubmitFileExamDto,
} from '../dto/student-exam.dto.js';
import { StudentExamService } from '../services/student-exam.service.js';
import type {
  ExamAttemptReviewView,
  ExamAttemptView,
  SaveExamAnswersResultView,
  SaveFileSubmissionResultView,
  StudentExamLobbyView,
  StudentExamSummaryView,
  SubmitExamResultView,
} from '../types/student-exam-view.type.js';

/** Student endpoints for listing exams, viewing an exam lobby, taking an attempt, auto-saving, submitting and reviewing. */
@Controller()
export class StudentExamController {
  constructor(private readonly studentExamService: StudentExamService) {}

  @Get('exams/me')
  @Auth(Role.STUDENT)
  async myExams(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentExamSummaryView[]> {
    return this.studentExamService.myExams(user);
  }

  @Get('classes/:classId/exams/:examId/student')
  @Auth(Role.STUDENT)
  async getLobby(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentExamLobbyView> {
    return this.studentExamService.getLobby(classId, examId, user);
  }

  @Post('classes/:classId/exams/:examId/sessions')
  @Auth(Role.STUDENT)
  async startOrResume(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('examId', ParseUUIDPipe) examId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamAttemptView> {
    return this.studentExamService.startOrResume(classId, examId, user);
  }

  @Put('exam-sessions/:sessionId/answers')
  @Auth(Role.STUDENT)
  async saveAnswers(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SaveExamAnswersDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaveExamAnswersResultView> {
    return this.studentExamService.saveAnswers(sessionId, dto, user);
  }

  @Put('exam-sessions/:sessionId/file-submission')
  @Auth(Role.STUDENT)
  async saveFileSubmission(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SubmitFileExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaveFileSubmissionResultView> {
    return this.studentExamService.saveFileSubmission(sessionId, dto, user);
  }

  @Post('exam-sessions/:sessionId/submit')
  @Auth(Role.STUDENT)
  async submit(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SubmitExamSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmitExamResultView> {
    return this.studentExamService.submit(sessionId, dto, user);
  }

  @Get('exam-sessions/:sessionId/review')
  @Auth(Role.STUDENT)
  async review(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamAttemptReviewView> {
    return this.studentExamService.review(sessionId, user);
  }
}

