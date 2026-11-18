import { Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { ItemSchedule } from '../../content/types/item-schedule.type.js'
import { ExamRepository } from '../repositories/exam.repository.js'
import { StudentExamService } from '../services/student-exam.service.js'
import type { StudentExamSummaryView } from '../types/student-exam-view.type.js'

/**
 * Public entry point of the exam module.
 * Other modules (such as Calendar or Content) MUST use this facade,
 * NOT the services or repositories behind it.
 */
@Injectable()
export class ExamFacade {
  constructor(
    private readonly examRepository: ExamRepository,
    private readonly studentExamService: StudentExamService,
  ) {}

  /** Start and end times of the given exams, keyed by exam id. */
  async findSchedules(ids: string[]): Promise<Map<string, ItemSchedule>> {
    const rows = await this.examRepository.findSchedulesByIds(ids)
    return new Map(
      rows.map((row) => [row.id, { openAt: row.startTime, closeAt: row.endTime }]),
    )
  }

  /** Exams of every class the student is enrolled in, each with the student's attempt summary. */
  async getExamsOfStudent(
    user: AuthenticatedUser,
  ): Promise<StudentExamSummaryView[]> {
    return this.studentExamService.myExams(user)
  }
}