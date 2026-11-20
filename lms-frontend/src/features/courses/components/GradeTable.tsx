import { cn } from '@shared/utils/cn';
import type { GradeColumn, GradeRow } from '../types/gradebook.types';
import { formatScore, groupColumnsBySection, isLowScore } from '../utils/grade-format';

interface GradeTableProps {
  columns: GradeColumn[];
  rows: GradeRow[];
}

const th = 'border-b border-l border-border px-3 py-2 text-center text-xs font-medium text-muted-foreground';
const scoreCell = (value: number | null, bold = false) =>
  cn(
    'border-l border-border px-3 py-3 text-center text-sm tabular-nums',
    bold && 'bg-muted/30 font-semibold',
    value === null ? 'text-muted-foreground/60' : isLowScore(value) ? 'font-semibold text-destructive' : 'text-foreground',
  );

export const GradeTable = ({ columns, rows }: GradeTableProps) => {
  const groups = groupColumnsBySection(columns);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/40">
            <th rowSpan={2} className="min-w-52 border-b border-border px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              Sinh viên
            </th>
            {groups.map((g) => (
              <th key={g.sectionId} colSpan={g.columns.length} className={cn(th, 'uppercase tracking-wide')}>
                {g.sectionName}
              </th>
            ))}
            <th colSpan={2} className={cn(th, 'bg-muted/60 uppercase tracking-wide')}>
              Tổng hợp
            </th>
          </tr>
          <tr className="bg-muted/40">
            {columns.map((c) => (
              <th key={c.id} className={th}>
                {c.label}
              </th>
            ))}
            <th className={cn(th, 'bg-muted/60')}>Quá trình</th>
            <th className={cn(th, 'bg-muted/60')}>Kiểm tra</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{row.fullName}</p>
                <p className="text-xs text-muted-foreground">{row.studentCode}</p>
              </td>
              {columns.map((c) => {
                const value = row.scores[c.id] ?? null;
                return (
                  <td key={c.id} className={scoreCell(value)}>
                    {formatScore(value)}
                  </td>
                );
              })}
              <td className={scoreCell(row.processAvg, true)}>{formatScore(row.processAvg)}</td>
              <td className={scoreCell(row.testAvg, true)}>{formatScore(row.testAvg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};