/** Where an exam is in time, from the students' point of view. */
export enum ExamStatus {
  /** Before `startTime`: nobody can start yet. */
  UPCOMING = 'UPCOMING',
  /** Between `startTime` and `endTime`: students may start. */
  OPEN = 'OPEN',
  /** From `endTime` on: nobody can start and attempts in progress are cut off. */
  CLOSED = 'CLOSED',
}

