import { AlertTriangle } from 'lucide-react'
import { Button } from '@shared/components/ui/button'

export const ErrorState = ({ message, onRetry }: { message?: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-card p-8 text-center">
    <AlertTriangle className="h-8 w-8 text-destructive" />
    <p className="m-0 font-medium">Failed to load data</p>
    <p className="m-0 text-sm text-muted-foreground">{message ?? 'Please try again.'}</p>
    {onRetry && <Button variant="outline" onClick={onRetry}>Retry</Button>}
  </div>
)
