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

/** A student who can still be added to a class. */
export interface StudentCandidate {
  id: string
  studentCode: string
  fullName: string
  email: string
}

export interface AddParticipantsResult {
  added: number
  skipped: number
}