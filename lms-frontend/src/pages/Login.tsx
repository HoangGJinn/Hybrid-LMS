import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import campusBg from '@/assets/campus-bg.jpg'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/useAuthStore'

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:9595'

const Login = () => {
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      })

      const data = await res.json()

      if (data.success) {
        login(data.user, data.token)
        navigate('/')
      } else {
        alert('Đăng nhập thất bại: ' + data.message)
      }
    } catch (err) {
      console.error('Lỗi khi gọi API đăng nhập', err)
      alert('Không thể kết nối tới máy chủ.')
    }
  }

  const handleGoogleError = () => {
    alert('Đăng nhập Google thất bại. Vui lòng thử lại.')
  }

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

      {/* Login Card - Shadcn login-04 style, light mode */}
      <div className="relative z-10 w-full max-w-md animate-fade-in rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm">
        {/* Card split: left form / right illustration mirroring login-04 */}
        <div className="p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
                <span className="text-lg font-bold text-white">L</span>
              </div>
              <span className="text-xl font-semibold text-slate-900">Hybrid LMS</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-500">
              Đăng nhập vào hệ thống học tập của bạn
            </p>
          </div>

          {/* Email / Password form (placeholder for future local auth) */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-400"
                disabled
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <button
                  type="button"
                  className="text-xs text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                className="bg-white border-slate-200 text-slate-900"
                disabled
              />
            </div>

            <Button
              type="button"
              className="w-full bg-slate-900 text-white hover:bg-slate-700"
              disabled
            >
              Login (Chưa khả dụng)
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400">Or continue with</span>
            </div>
          </div>

          {/* Google Login */}
          <div className="flex justify-center">
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
          <p className="mt-6 text-center text-sm text-slate-500">
            Chưa có tài khoản?{' '}
            <button
              type="button"
              className="font-medium text-slate-900 underline-offset-4 hover:underline transition-colors"
            >
              Đăng ký
            </button>
          </p>
        </div>
      </div>

      {/* Bottom credits */}
      <p className="absolute bottom-4 text-center text-xs text-white/70">
        Bằng cách tiếp tục, bạn đồng ý với{' '}
        <span className="underline cursor-pointer">Điều khoản dịch vụ</span> và{' '}
        <span className="underline cursor-pointer">Chính sách bảo mật</span>.
      </p>
    </div>
  )
}

export default Login
