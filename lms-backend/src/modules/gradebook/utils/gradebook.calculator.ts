import type {
  GradeColumnView,
  GradeRowView,
  GradeScoreRow,
  GradeStudent,
  GradebookSummaryView,
} from '../types/gradebook.types.js';

export const WARNING_THRESHOLD = 5;

export function average(values: Array<number | null | undefined>): number | null {
  const present = values.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

export function buildRows(
  students: GradeStudent[],
  columns: GradeColumnView[],
  scores: GradeScoreRow[],
): GradeRowView[] {
  const byStudent = new Map<string, Map<string, number | null>>();
  for (const s of scores) {
    let m = byStudent.get(s.studentId);
    if (!m) {
      m = new Map();
      byStudent.set(s.studentId, m);
    }
    m.set(s.columnId, s.score);
  }
  const processCols = columns.filter((c) => c.kind === 'assignment');
  const testCols = columns.filter((c) => c.kind !== 'assignment');

  return students.map((st) => {
    const m = byStudent.get(st.id) ?? new Map<string, number | null>();
    const rowScores: Record<string, number | null> = {};
    for (const c of columns) rowScores[c.id] = m.get(c.id) ?? null;
    return {
      studentId: st.id,
      studentCode: st.studentCode,
      fullName: st.fullName,
      scores: rowScores,
      processAvg: average(processCols.map((c) => rowScores[c.id])),
      testAvg: average(testCols.map((c) => rowScores[c.id])),
    };
  });
}

export function buildSummary(
  rows: GradeRowView[],
  threshold = WARNING_THRESHOLD,
): GradebookSummaryView {
  const below = rows.filter(
    (r) =>
      (r.processAvg !== null && r.processAvg < threshold) ||
      (r.testAvg !== null && r.testAvg < threshold),
  ).length;
  return {
    studentCount: rows.length,
    processAvg: average(rows.map((r) => r.processAvg)),
    testAvg: average(rows.map((r) => r.testAvg)),
    belowThresholdCount: below,
    threshold,
  };
}

export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function matchesSearch(row: GradeRowView, search: string): boolean {
  const q = normalizeText(search);
  if (!q) return true;
  return (
    normalizeText(row.fullName).includes(q) ||
    row.studentCode.toLowerCase().includes(q)
  );
}