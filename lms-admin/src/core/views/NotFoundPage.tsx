import { Link } from 'react-router';
import { buttonClasses } from '@/shared/components/ui/button-classes';

const NotFoundPage = () => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
    <p className="m-0 text-5xl font-bold text-brand">404</p>
    <h1 className="m-0 text-xl font-semibold">Page not found</h1>
    <p className="m-0 text-sm text-muted-foreground">
      The page you are looking for does not exist or has moved.
    </p>
    <Link to="/" className={buttonClasses('primary')}>
      Back to dashboard
    </Link>
  </div>
);

export default NotFoundPage;
