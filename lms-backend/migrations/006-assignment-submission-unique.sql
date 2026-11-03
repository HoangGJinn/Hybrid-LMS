CREATE UNIQUE INDEX IF NOT EXISTS uq_assignment_submissions_assignment_student
  ON assignment_submissions (assignment_id, submitted_by);

ALTER TABLE assignments
  ADD COLUMN submission_type varchar(10) NOT NULL DEFAULT 'FILE',
  ADD COLUMN accepted_extensions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN submission_note text;
ALTER TABLE assignment_submissions
  ADD COLUMN answer_text text, ADD COLUMN graded_at timestamptz;