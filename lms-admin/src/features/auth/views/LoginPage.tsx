import { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Navigate, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import campusBg from '@/core/assets/campus-bg.jpg';
import { useAdminAuthStore } from '@/core/store/useAdminAuthStore';
import { Button } from '@/shared/components/ui/Button';
import { NotAdminError } from '../api/auth.service';
import { useAdminLogin, useAdminPasswordLogin } from '../hooks/useAdminLogin';

const LoginPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);
  const { mutate: loginWithGoogle, isPending: isGooglePending } = useAdminLogin();
  const { mutate: loginWithPassword, isPending: isPasswordPending } = useAdminPasswordLogin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isSubmitting = isGooglePending || isPasswordPending;

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || !password) {
      toast.error('Please enter both username/email and password.');
      return;
    }
    loginWithPassword(
      { username: trimmed, password },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (error) =>
          toast.error(
            error instanceof NotAdminError
              ? 'This account does not have administrator access.'
              : 'Invalid username or password. Please try again.',
          ),
      },
    );
  };

  const handleGoogleSuccess = ({ credential }: CredentialResponse) => {
    if (!credential) return;
    loginWithGoogle(credential, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (error) =>
        toast.error(
          error instanceof NotAdminError
            ? 'This Google account does not have administrator access.'
            : 'Sign-in failed. Please check your connection and try again.',
        ),
    });
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in failed. Please try again.');
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center p-4"
      style={{
        backgroundImage: `url(${campusBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm">
        <div className="p-8 sm:p-10">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 shadow">
                <span className="text-lg font-bold text-white">L</span>
              </div>
              <span className="text-xl font-semibold text-slate-900">
                Hybrid LMS
              </span>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Admin
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to the administration portal
            </p>
          </div>

          {/* Username / Password Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Administrator Username or Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="admin-username"
                  type="text"
                  placeholder="admin@lms.edu.vn or admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-50 h-11"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-50 h-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isPasswordPending}
              disabled={isSubmitting}
              className="w-full h-11 bg-slate-900 text-white hover:bg-slate-800 font-medium shadow-sm transition-all"
            >
              Sign in as Admin
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google SSO */}
          <div className="flex flex-col items-center gap-2">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              shape="pill"
              size="large"
              text="signin_with"
            />
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400">
            By continuing, you agree to the{' '}
            <span className="cursor-pointer underline-offset-4 hover:underline">
              Terms of Service
            </span>{' '}
            and{' '}
            <span className="cursor-pointer underline-offset-4 hover:underline">
              Privacy Policy
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
