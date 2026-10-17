import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@shared/components/ui/button'

const describeError = (error: unknown): { title: string; detail: string } => {
  if (isRouteErrorResponse(error)) return { title: `${error.status} ${error.statusText}`.trim(), detail: typeof error.data === 'string' ? error.data : 'The page could not be loaded.' }
  if (error instanceof Error) return { title: 'Something went wrong', detail: error.message }
  return { title: 'Something went wrong', detail: 'An unexpected error occurred.' }
}

/** Route-level error boundary: render errors and failed lazy chunk loads end up here. */
const RouteErrorPage = () => {
  const error = useRouteError()
  const { title, detail } = describeError(error)

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-card p-10 text-center shadow-sm">
      <TriangleAlert className="h-10 w-10 text-destructive" />
      <h1 className="m-0 text-xl font-bold">{title}</h1>
      <p className="m-0 text-sm text-muted-foreground">{detail}</p>
      {import.meta.env.DEV && error instanceof Error && error.stack && (
        <pre className="max-h-48 w-full overflow-auto rounded-md bg-muted p-3 text-left text-xs">{error.stack}</pre>
      )}
      <div className="mt-2 flex gap-2">
        <Button onClick={() => window.location.reload()}>Reload page</Button>
        <Button asChild variant="outline"><Link to="/">Go to home</Link></Button>
      </div>
    </div>
  )
}

export default RouteErrorPage
