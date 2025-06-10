import { Navigate, useLocation, Outlet } from 'react-router';
import { useAuthUser } from '../../hooks/useAuthUser';

export function ProtectedRoute() {
  const { user, loading } = useAuthUser();
  const location = useLocation();

  // 如果还在加载中，返回 null 或加载指示器
  if (loading) {
    return null;
  }

  // 加载完成后再判断登录状态
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
