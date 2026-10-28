import { ClassStudent } from '../entities/class-student.entity.js'

/** Public shape of an enrolled student returned by the participants endpoints. */
export class ParticipantView {
  /** Student id (same as the user id). */
  id: string
  studentCode: string
  fullName: string
  email: string
  joinedAt: Date

  static fromEntity(enrollment: ClassStudent): ParticipantView {
    return {
      id: enrollment.studentId,
      studentCode: enrollment.student?.studentCode ?? '',
      fullName: enrollment.student?.user?.fullName ?? '',
      email: enrollment.student?.user?.email ?? '',
      joinedAt: enrollment.joinedAt,
    }
  }
}
