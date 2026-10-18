import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import campusBg from '@core/assets/campus-bg.jpg';
import { useLoginWithGoogle } from '../hooks/useAuthMutations';

const Login = () => {
  const navigate = useNavigate();
  const { mutate: loginWithGoogle } = useLoginWithGoogle();

  const handleGoogleSuccess = ({ credential }: CredentialResponse) => {
    if (!credential) return;
    loginWithGoogle(credential, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: () =>
        toast.error(
          'Sign-in failed. Please check your connection and try again.',
        ),
    });
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in failed. Please try again.');
  };

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center"
      style={{
        backgroundImage: `url(${campusBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm">
        <div className="p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
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

          {/* Google SSO — Only auth method */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs text-slate-400">
              Use your university account to sign in
            </p>
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
          <p className="mt-8 text-center text-xs text-slate-400">
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
