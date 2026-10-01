import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '@/components/ui/spinner';

/**
 * Route guard for /admin/* (docs/backlog/21). Replaces the scattered
 * useEffect-navigate guards with one declarative wrapper.
 */
export default function ProtectedRoute({ children }) {
  const { session, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container-x py-20 text-center">
        <Spinner className="mx-auto size-10 text-brand" />
        <p className="mt-3 text-sm text-soft">جارٍ التحقق من الصلاحيات…</p>
      </div>
    );
  }
  if (!session || !isAdmin) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />;
  }
  return children;
}
