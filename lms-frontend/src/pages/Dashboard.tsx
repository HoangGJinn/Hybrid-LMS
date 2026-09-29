import { useAuthStore } from '@/store/useAuthStore'

const Dashboard = () => {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-2xl bg-white p-12 shadow-lg ring-1 ring-slate-100 text-center max-w-md w-full">
        {/* Avatar */}
        {user?.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="mx-auto mb-4 h-16 w-16 rounded-full object-cover ring-2 ring-slate-200"
          />
        )}

        <h1 className="text-2xl font-bold text-slate-900">
          Xin chào, {user?.fullName ?? 'Người dùng'} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">{user?.email}</p>

        <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 uppercase tracking-wide">
          {user?.role}
        </span>

        <p className="mt-6 text-sm text-slate-400 italic">
          Dashboard đang được xây dựng...
        </p>

        <button
          type="button"
          onClick={logout}
          className="mt-6 rounded-lg bg-red-500 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  )
}

export default Dashboard
