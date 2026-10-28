// Public API of the "auth" feature. Import from "@features/auth" outside this folder.
export { setupAuthInterceptors } from './api/auth-interceptors';
export { ProtectedRoute } from './components/ProtectedRoute';
export { RoleRedirect } from './components/RoleRedirect';
export { useLoginWithGoogle, useLogout } from './hooks/useAuthMutations';
export { useCurrentUser } from './hooks/useCurrentUser';
export { authKeys } from './api/queryKeys';
