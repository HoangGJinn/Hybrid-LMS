import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import Login from '@/pages/Login'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
              <div className="rounded-2xl bg-white p-12 shadow-lg ring-1 ring-slate-100 text-center">
                <h1 className="text-3xl font-bold text-green-600">Đăng nhập thành công! 🎉</h1>
                <p className="mt-3 text-slate-500">Chào mừng bạn đến với Hybrid LMS</p>
                <button
                  type="button"
                  onClick={() => useAuthStore.getState().logout()}
                  className="mt-6 rounded-lg bg-red-500 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  </BrowserRouter>
)

export default App
