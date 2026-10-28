import { ClassStudent } from '../entities/class-student.entity.js';
import { ClassmateView } from './classmate-view.type.js';

/**
 * Lecturer view of a student. Score, mastery and submission figures are
 * placeholders (null/0) until the mastery and assignment modules exist.
 */
export class RosterStudentView extends ClassmateView {
  avgScore: number | null;
  avgMastery: number;
  submissionsDone: number;
  submissionsTotal: number;
  atRisk: boolean;

  static fromEnrollmentWithStats(enrollment: ClassStudent): RosterStudentView {
    return {
      ...ClassmateView.fromEnrollment(enrollment),
      avgScore: null,
      avgMastery: 0,
      submissionsDone: 0,
      submissionsTotal: 0,
      atRisk: false,
    };
  }
}