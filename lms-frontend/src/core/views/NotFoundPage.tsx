import { Link } from 'react-router'
import { Button } from '@shared/components/ui/button'

const NotFoundPage = () => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
    <p className="m-0 text-5xl font-bold text-brand">404</p>
    <h1 className="m-0 text-xl font-semibold">Page not found</h1>
    <p className="m-0 text-sm text-muted-foreground">The page you are looking for does not exist or has moved.</p>
    <Button asChild><Link to="/">Back to home</Link></Button>
  </div>
)

export default NotFoundPage
