import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import { StudentExamService } from '../services/student-exam.service.js';
import type { StudentExamSummaryView } from '../types/student-exam-view.type.js';

/**
 * Public entry point of the exam module.
 * Other modules (such as Calendar) MUST use this facade, NOT the services or repositories behind it.
 */
@Injectable()
export class ExamFacade {
  constructor(private readonly studentExamService: StudentExamService) {}

  /** Exams of every class the student is enrolled in, each with the student's attempt summary. */
  async getExamsOfStudent(
    user: AuthenticatedUser,
  ): Promise<StudentExamSummaryView[]> {
    return this.studentExamService.myExams(user);
  }
}