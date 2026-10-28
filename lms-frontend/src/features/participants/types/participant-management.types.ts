// /** A student enrolled in a class, as managed by the lecturer. */
// export interface Participant {
//   id: string
//   studentCode: string
//   fullName: string
//   email: string
//   /** ISO date string. */
//   joinedAt: string
// }

// /** A student who can still be added to a class. */
// export interface StudentCandidate {
//   id: string
//   studentCode: string
//   fullName: string
//   email: string
// }

/** A student who can be picked in the "Add participants" dialog. */
export interface StudentCandidate {
  /** `user.id` of the student (UUID). */
  studentId: string
  studentCode: string
  fullName: string
  email: string
  /** true = already in the class; shown but not selectable. */
  alreadyInClass: boolean
}

export interface AddParticipantsResult {
  added: number
  skipped: number
}