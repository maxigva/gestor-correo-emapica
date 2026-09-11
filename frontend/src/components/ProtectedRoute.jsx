import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return <div className="page-loading">Cargando…</div>;
  if (!usuario) return <Navigate to="/login" replace />;

  return children;
}
