import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileModule } from '../../shared/file/file.module.js';
import { AcademicModule } from '../academic/academic.module.js';
import { ContentModule } from '../content/content.module.js';
import { ExamController } from './controllers/exam.controller.js';
import { LecturerExamController } from './controllers/lecturer-exam.controller.js';
import { StudentExamController } from './controllers/student-exam.controller.js';
import { Complaint } from './entities/complaint.entity.js';
import { ExamMode } from './entities/exam-mode.entity.js';
import { ExamQuestionOption } from './entities/exam-question-option.entity.js';
import { ExamQuestion } from './entities/exam-question.entity.js';
import { ExamScheduleMode } from './entities/exam-schedule-mode.entity.js';
import { ExamSchedule } from './entities/exam-schedule.entity.js';
import { ExamSection } from './entities/exam-section.entity.js';
import { ExamSessionAnswer } from './entities/exam-session-answer.entity.js';
import { ExamSessionFile } from './entities/exam-session-file.entity.js';
import { ExamSession } from './entities/exam-session.entity.js';
import { ExamViolation } from './entities/exam-violation.entity.js';
import { ProctoringLog } from './entities/proctoring-log.entity.js';
import { ExamRepository } from './repositories/exam.repository.js';
import { ExamSessionRepository } from './repositories/exam-session.repository.js';
import { ExamGradingService } from './services/exam-grading.service.js';
import { ExamService } from './services/exam.service.js';
import { StudentExamService } from './services/student-exam.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Complaint,
      ExamMode,
      ExamQuestion,
      ExamQuestionOption,
      ExamScheduleMode,
      ExamSchedule,
      ExamSection,
      ExamSession,
      ExamSessionAnswer,
      ExamSessionFile,
      ExamViolation,
      ProctoringLog,
    ]),
    AcademicModule,
    ContentModule,
    FileModule,
  ],
  controllers: [ExamController, StudentExamController, LecturerExamController],
  providers: [
    ExamRepository,
    ExamSessionRepository,
    ExamService,
    StudentExamService,
    ExamGradingService,
  ],
  exports: [],
})
export class ExamModule {}
