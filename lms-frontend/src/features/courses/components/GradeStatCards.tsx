import type { GradebookSummary } from '../types/gradebook.types';
import { formatScore } from '../utils/grade-format';

interface StatProps {
  label: string;
  value: string;
  unit: string;
}

const Stat = ({ label, value, unit }: StatProps) => (
  <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 flex items-baseline gap-1.5">
      <span className="text-3xl font-bold text-foreground">{value}</span>
      <span className="text-sm text-muted-foreground">{unit}</span>
    </p>
  </div>
);

export const GradeStatCards = ({ summary }: { summary: GradebookSummary }) => (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <Stat label="Sĩ số lớp" value={String(summary.studentCount)} unit="sinh viên" />
    <Stat label="TB điểm quá trình" value={formatScore(summary.processAvg)} unit="/ 10" />
    <Stat label="TB điểm kiểm tra" value={formatScore(summary.testAvg)} unit="/ 10" />
    <Stat
      label={`Dưới ${summary.threshold.toFixed(1)}`}
      value={String(summary.belowThresholdCount)}
      unit="sinh viên cần chú ý"
    />
  </div>
);