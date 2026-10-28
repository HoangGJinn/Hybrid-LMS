import { Student } from '../../user/entities/student.entity.js'

/** A student who can still be added to a class. */
export class StudentCandidateView {
  id: string
  studentCode: string
  fullName: string
  email: string

  static fromEntity(student: Student): StudentCandidateView {
    return {
      id: student.user?.id ?? '',
      studentCode: student.studentCode,
      fullName: student.user?.fullName ?? '',
      email: student.user?.email ?? '',
    }
  }
}
