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
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import {
  CreateExamDto,
  UpdateExamDto,
  UpdateExamScheduleDto,
} from '../dto/create-exam.dto.js';
import { ExamService } from '../services/exam.service.js';
import { ExamView } from '../types/exam-view.type.js';

/**
 * Exams of one class: created, changed and removed by its lecturer. The view carries the correct answers,
 * so students get no route here; taking an exam is a separate, later feature.
 */
@Controller('classes/:classId/exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  @Auth(Role.LECTURER)
  async create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExamView> {
    return this.examService.create(classId, dto, user);
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
