import { Module } from '@nestjs/common';
import { AcademicModule } from '../academic/academic.module.js';
import { AssignmentModule } from '../assignment/assignment.module.js';
import { ExamModule } from '../exam/exam.module.js';
import { CalendarController } from './controllers/calendar.controller.js';
import { CalendarService } from './services/calendar.service.js';

@Module({
  imports: [AcademicModule, AssignmentModule, ExamModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}