import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Complaint } from './entities/complaint.entity.js'
import { ExamMode } from './entities/exam-mode.entity.js'
import { ExamScheduleMode } from './entities/exam-schedule-mode.entity.js'
import { ExamSchedule } from './entities/exam-schedule.entity.js'
import { ExamSection } from './entities/exam-section.entity.js'
import { ExamSession } from './entities/exam-session.entity.js'
import { ExamViolation } from './entities/exam-violation.entity.js'
import { ProctoringLog } from './entities/proctoring-log.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([Complaint, ExamMode, ExamScheduleMode, ExamSchedule, ExamSection, ExamSession, ExamViolation, ProctoringLog])],
  providers: [],
  exports: [],
})
export class ExamModule {}
