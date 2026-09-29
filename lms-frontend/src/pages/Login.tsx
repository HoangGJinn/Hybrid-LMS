import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import campusBg from '@/assets/campus-bg.jpg'
import { useAuthStore } from '@/store/useAuthStore'
import type { AuthUser } from '@/types'

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
        login(data.user as AuthUser, data.token as string)
        navigate('/')
      } else {
        alert('Đăng nhập thất bại: ' + (data.message as string))
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

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm">
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

          {/* Google SSO — Only auth method */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs text-slate-400">Sử dụng tài khoản trường để đăng nhập</p>
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
            Bằng cách tiếp tục, bạn đồng ý với{' '}
            <span className="cursor-pointer underline-offset-4 hover:underline">Điều khoản dịch vụ</span>{' '}
            và{' '}
            <span className="cursor-pointer underline-offset-4 hover:underline">Chính sách bảo mật</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
