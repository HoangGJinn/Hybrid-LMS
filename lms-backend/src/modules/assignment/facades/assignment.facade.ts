import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js';
import {
  SubmissionReviewService,
  type AssignmentSummary,
} from '../services/submission-review.service.js';

/**
 * Public entry point of the assignment module.
 * Other modules (such as Calendar) MUST use this facade, NOT the services or repositories behind it.
 */
@Injectable()
export class AssignmentFacade {
  constructor(private readonly reviewService: SubmissionReviewService) {}

  /** Assignments of every class the student is enrolled in, each with the student's own status. */
  async getAssignmentsOfStudent(
    user: AuthenticatedUser,
  ): Promise<AssignmentSummary[]> {
    return this.reviewService.myAssignments(user);
  }
}