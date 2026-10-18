import { Lock } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useAdminLogout } from '../hooks/useAdminLogout';

/** Shown to a signed-in user whose role is not ADMIN. */
const ForbiddenPage = () => {
  const { mutate: logout, isPending } = useAdminLogout();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border bg-card p-10 text-center shadow-sm">
        <Lock className="h-10 w-10 text-destructive" />
        <h1 className="m-0 text-xl font-bold">No access</h1>
        <p className="m-0 text-sm text-muted-foreground">
          This portal is for administrators only. Sign in with an administrator
          account to continue.
        </p>
        <Button className="mt-2" isLoading={isPending} onClick={() => logout()}>
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default ForbiddenPage;
