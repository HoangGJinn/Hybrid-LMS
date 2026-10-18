import type { ClassRoom } from '../types/courses.types';

export const ClassSelect = ({
  classes,
  value,
  onChange,
}: {
  classes: ClassRoom[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <select
    aria-label="Select class"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="h-9 rounded-md border bg-card px-3 text-sm"
  >
    {classes.map((c) => (
      <option key={c.id} value={c.id}>
        {c.classCode} — {c.name}
      </option>
    ))}
  </select>
);
