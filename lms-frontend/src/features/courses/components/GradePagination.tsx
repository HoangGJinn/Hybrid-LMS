import { cn } from '@shared/utils/cn';

interface GradePaginationProps {
  page: number;
  limit: number;
  total: number;
  shown: number;
  onChange: (page: number) => void;
}

const btn = 'h-9 min-w-9 rounded-lg border border-border px-3 text-sm disabled:opacity-50';

export const GradePagination = ({ page, limit, total, shown, onChange }: GradePaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = (page - 1) * limit + shown;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Hiển thị {from}-{to} trên {total} sinh viên
      </p>
      <div className="flex gap-1.5">
        <button type="button" className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Trước
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            className={cn(btn, p === page && 'border-primary bg-primary text-primary-foreground')}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
        <button type="button" className={btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Sau
        </button>
      </div>
    </div>
  );
};