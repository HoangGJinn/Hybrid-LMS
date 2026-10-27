-- ============================================================
-- 001-sequences.sql
-- Creates the PostgreSQL sequences used to generate profile codes.
-- TypeORM (synchronize: true) handles all table creation automatically;
-- custom sequences are the only schema object it cannot manage.
--
-- Format: SV/GV + YY (2-digit current year) + NNNNNN (6-digit, zero-padded)
-- Example: SV26000001, GV26000042
--
-- Idempotent: safe to re-run (IF NOT EXISTS).
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS student_code_seq  START 1 INCREMENT 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS lecturer_code_seq START 1 INCREMENT 1 NO CYCLE;
