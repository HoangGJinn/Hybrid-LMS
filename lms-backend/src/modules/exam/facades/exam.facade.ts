import { Injectable } from '@nestjs/common'
import type { ItemSchedule } from '../../content/types/item-schedule.type.js'
import { ExamRepository } from '../repositories/exam.repository.js'

@Injectable()
export class ExamFacade {
  constructor(private readonly examRepository: ExamRepository) {}

  /** Start and end times of the given exams, keyed by exam id. */
  async findSchedules(ids: string[]): Promise<Map<string, ItemSchedule>> {
    const rows = await this.examRepository.findSchedulesByIds(ids)
    return new Map(
      rows.map((row) => [row.id, { openAt: row.startTime, closeAt: row.endTime }]),
    )
  }
}