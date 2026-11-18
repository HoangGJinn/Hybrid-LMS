import { Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import type { ItemSchedule } from '../../content/types/item-schedule.type.js'
import { AssignmentRepository } from '../repositories/assignment.repository.js'
import {
  SubmissionReviewService,
  type AssignmentSummary,
} from '../services/submission-review.service.js'

/**
 * Public entry point of the assignment module.
 * Other modules (such as Calendar or Content) MUST use this facade,
 * NOT the services or repositories behind it.
 */
@Injectable()
export class AssignmentFacade {
  constructor(
    private readonly assignmentRepository: AssignmentRepository,
    private readonly reviewService: SubmissionReviewService,
  ) {}

  /** Open and due dates of the given assignments, keyed by assignment id. */
  async findSchedules(ids: string[]): Promise<Map<string, ItemSchedule>> {
    const rows = await this.assignmentRepository.findSchedulesByIds(ids)
    return new Map(
      rows.map((row) => [row.id, { openAt: row.openAt, closeAt: row.endAt }]),
    )
  }

  /** Assignments of every class the student is enrolled in, each with the student's own status. */
  async getAssignmentsOfStudent(
    user: AuthenticatedUser,
  ): Promise<AssignmentSummary[]> {
    return this.reviewService.myAssignments(user)
  }
}