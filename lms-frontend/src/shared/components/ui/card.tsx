import type { ReactNode } from 'react'
import { cn } from '@shared/utils/cn'

export const Card = ({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) => (
  <section className={cn('rounded-xl border bg-card p-5 shadow-sm', className)}>
    {(title || actions) && (
      <div className="mb-4 flex items-center justify-between gap-2">
        {title && <h2 className="m-0 text-base font-semibold">{title}</h2>}
        {actions}
      </div>
    )}
    {children}
  </section>
)
