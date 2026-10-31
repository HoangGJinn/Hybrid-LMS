import { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import campusBg from '@core/assets/campus-bg.jpg';
import { Input } from '@shared/components/ui/input';
import { Button } from '@shared/components/ui/button';
import { useLogin, useLoginWithGoogle } from '../hooks/useAuthMutations';

const Login = () => {
  const navigate = useNavigate();
  const { mutate: loginWithGoogle, isPending: isGooglePending } = useLoginWithGoogle();
  const { mutate: loginWithPassword, isPending: isPasswordPending } = useLogin();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isSubmitting = isGooglePending || isPasswordPending;

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
        onError: (err) =>
          toast.error(err.message || 'Invalid username or password. Please try again.'),
      },
    );
  };

  const handleGoogleSuccess = ({ credential }: CredentialResponse) => {
    if (!credential) return;
    loginWithGoogle(credential, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: () =>
        toast.error('Sign-in failed. Please check your connection and try again.'),
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
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to your learning workspace
            </p>
          </div>

          {/* Username / Password Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Username, Email, or Student/Teacher ID
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="username"
                  type="text"
                  placeholder="e.g. student1, teacher1, or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-9 h-11"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-9 pr-10 h-11"
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
              disabled={isSubmitting}
              className="w-full h-11 bg-slate-900 text-white hover:bg-slate-800 font-medium shadow-sm transition-all"
            >
              {isPasswordPending ? 'Signing in...' : 'Sign in'}
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

export default Login;
