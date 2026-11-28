-- Ánh xạ KC / câu hỏi của hệ thống sang XES3G5M (dùng cho mô hình knowledge tracing).
-- Môi trường local dùng synchronize nên không cần chạy; chạy tay trên môi trường khác.
CREATE TABLE IF NOT EXISTS kc_xes_mappings (
  kc_id     uuid             NOT NULL REFERENCES knowledge_components (id) ON DELETE CASCADE,
  xes_route text             NOT NULL,
  score     double precision NOT NULL,
  status    varchar(20)      NOT NULL DEFAULT 'SUGGESTED',
  PRIMARY KEY (kc_id, xes_route)
);

ALTER TABLE questions ADD COLUMN IF NOT EXISTS xes_question_id integer;
CREATE INDEX IF NOT EXISTS idx_questions_xes_question_id ON questions (xes_question_id);

SELECT kc.name, m.status, COUNT(DISTINCT q.id) AS so_cau
FROM questions q
JOIN question_knowledge_components l ON l.question_id = q.id
JOIN knowledge_components kc ON kc.id = l.kc_id
LEFT JOIN kc_xes_mappings m ON m.kc_id = kc.id
WHERE q.subject_id = '53816856-b1d6-4fcd-aec4-55528e6b8344' AND q.xes_question_id IS NULL
GROUP BY kc.name, m.status
ORDER BY so_cau DESC;