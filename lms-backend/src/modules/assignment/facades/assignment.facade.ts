import { Injectable } from '@nestjs/common'
import type { ItemSchedule } from '../../content/types/item-schedule.type.js'
import { AssignmentRepository } from '../repositories/assignment.repository.js'

/** What other modules may ask of the assignment module. */
@Injectable()
export class AssignmentFacade {
  constructor(private readonly assignmentRepository: AssignmentRepository) {}

  /** Open and due dates of the given assignments, keyed by assignment id. */
  async findSchedules(ids: string[]): Promise<Map<string, ItemSchedule>> {
    const rows = await this.assignmentRepository.findSchedulesByIds(ids)
    return new Map(
      rows.map((row) => [row.id, { openAt: row.openAt, closeAt: row.endAt }]),
    )
  }
}