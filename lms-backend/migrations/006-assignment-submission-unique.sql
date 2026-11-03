CREATE UNIQUE INDEX IF NOT EXISTS uq_assignment_submissions_assignment_student
  ON assignment_submissions (assignment_id, submitted_by);