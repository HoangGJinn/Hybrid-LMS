import { cn } from '@shared/utils/cn'

export const Bar = ({ value, className }: { value: number; className?: string }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
    <div className={cn('h-full rounded-full', className ?? 'bg-primary')} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
)
