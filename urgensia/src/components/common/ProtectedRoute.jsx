import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Protège une route :
 *  - Redirige vers /connexion si non authentifié
 *  - Redirige vers / si le rôle ne correspond pas
 *
 * @param {React.ReactNode} children
 * @param {string|string[]} role  - rôle(s) autorisé(s) : 'agent' | 'medecin' | 'admin'
 */
export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Pendant la vérification du token, ne pas rediriger
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-500 text-sm font-medium">Vérification de la session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  // Vérification du rôle
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (user && !allowedRoles.includes(user.role)) {
      // Rediriger vers le bon dashboard selon le rôle réel
      const redirectMap = {
        agent:   '/agent',
        medecin: '/medecin',
        admin:   '/admin',
      };
      return <Navigate to={redirectMap[user.role] ?? '/'} replace />;
    }
  }

  return children;
}
